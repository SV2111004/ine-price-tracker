# Technical Design & Engineering Decisions

## 1. Architecture Decisions

The system is structured as a decoupled monorepo containing three core subsystems:
- **Backend API & Scraper Engine** (`/backend`): Express application providing REST endpoints, data access layers, catalog indexing, and Playwright-driven scraping.
- **Frontend Dashboard** (`/frontend`): Responsive React single-page application using Tailwind CSS for UI and Recharts for data visualization.
- **Database & Persistence Layer**: Supabase PostgreSQL with schema migrations and a local development fallback.

Separating the scraper from the frontend ensures scheduled jobs run server-side without depending on an open client browser, while keeping business logic, data validation, and security credentials strictly on the backend.

---

## 2. Scraping Strategy: HTTP/API vs. Playwright

- **Catalog and Metadata**: We use direct HTTP `fetch` against `https://demo.inelabteamdev.com/api/catalog` and `/api/product/:id`. This is lightweight, fast, and does not consume browser memory.
- **Price & Stock Extraction**: The mock store shields price and stock behind dynamic client-side interactions and an encrypted session challenge flow on the product page. Because this state does not exist in the initial raw HTML or the public product JSON response, **Playwright (Chromium)** is required to load the product page, simulate natural cursor movement over the price widget, and observe DOM mutations and network requests.

---

## 3. Retry Strategy & Timeout Handling

Scraping dynamic web applications introduces transient failure modes: slow navigation, network latency, and delayed asynchronous content.

- **Bounded Retries**: Rather than retrying indefinitely or failing instantly on the first error, the scraper executes bounded retries (default `MAX_ATTEMPTS=3`).
- **Progressive Backoff**: Attempt 1 executes immediately. If an error or challenge failure occurs, Attempt 2 waits 1,500ms, and Attempt 3 waits 2,250ms (`initialDelayMs * Math.pow(1.5, attempt - 1)`).
- **Explicit Timeout Hierarchy**:
  - `NAVIGATION_TIMEOUT_MS`: 15,000ms for initial page load.
  - `CONTENT_TIMEOUT_MS`: 10,000ms for locating the product DOM container and price widget.
  - Overall `SCRAPE_TIMEOUT_MS`: 30,000ms to guarantee no background worker hangs or exhausts system resources.

---

## 4. Data Validation & Integrity Rules

Data integrity is the central pillar of this application:
- **Price Validation (`validatePrice`)**:
  - Strips currency markers (`₹`, `Rs.`, `INR`, commas, trailing `/-`).
  - Ensures parsed float is finite, non-negative, and within a realistic boundary (`0 <= price <= 100,000,000`).
  - Rejects empty strings, `NaN`, negative numbers, or unrelated page text.
- **Stock Validation (`validateStock`)**:
  - Verifies presence of recognized stock states (`"In stock"`, `"Out of stock"`, `"Only X left in stock"`).
  - Extracts numeric quantity if present while preserving textual state.
- **Integrity Rule**: If price or stock fails validation, **no entry is inserted into `price_history`**. A failed scrape must never insert fake zeroes or placeholder values.

---

## 5. Failure Logging & Observability

Every scrape attempt—whether started, retrying, succeeded, or failed—is recorded in `scrape_logs`:
- Product ID and URL
- Exact attempt number (1, 2, or 3)
- Status (`started`, `retrying`, `success`, `failed`)
- Duration in milliseconds
- Exact error message and error code (e.g., `CHALLENGE_FAILED`, `NAVIGATION_TIMEOUT`, `POSSIBLE_PAGE_STRUCTURE_CHANGE`)

This creates an honest, transparent audit trail visible both in the backend terminal logs and the frontend UI.

---

## 6. Scheduled Execution & Free-Tier Constraints

- **The Problem**: Render's free tier spins down (sleeps) when inactive. In-process timers (`setInterval`) or cron daemons inside the Node process will stop executing when the dyno sleeps.
- **The Solution**: An authenticated REST endpoint (`POST /api/scrape/run`) protected by `CRON_SECRET` (`Authorization: Bearer <CRON_SECRET>`).
- **External Cron Trigger**: An external scheduler (such as **cron-job.org**) calls this endpoint every 2 hours. This wakes up the service, executes the batch scraping routine, and returns a JSON summary.
- **Concurrency Locking**: A mutual exclusion flag prevents overlapping runs if a job is triggered while a previous scrape is still processing.

---

## 7. Trade-offs

| Decision | Pros | Cons / Trade-offs |
| :--- | :--- | :--- |
| **Playwright for Price Extraction** | Full browser execution, supports headed visual demonstration, handles DOM events | Higher memory footprint than pure HTTP parsing |
| **Direct HTTP for Catalog Search** | Extremely fast search and indexing, zero browser overhead | Must handle catalog pagination and caching |
| **Bearer Token for Cron Endpoint** | Secure, stateless, compatible with external schedulers | Requires configuring secret in both Render and cron-job.org |
| **Dual DB Adapter (Supabase + Local Dev)** | Zero-config local development and testing before user supplies remote credentials | Requires maintaining consistent repository abstraction |

---

## 8. Actual Problems Discovered & Debugging History

During implementation and testing, two real technical issues were encountered and resolved:

1. **Currency Stripping Regex Issue in `validatePrice`**:
   - *Symptom*: In initial unit tests, input string `"Rs. 500/-"` was parsed as `0.5` instead of `500`.
   - *Investigation*: The initial regex used `\bRs\.?\b`. Because the period `.` is a non-word character, the word boundary `\b` immediately following it failed to match `Rs.`. Consequently, only `Rs` was stripped, leaving `. 500/-`, which after whitespace stripping became `.500`, evaluating to `0.5`.
   - *Fix*: Updated the regex in `backend/src/scraper/validator.js` to `replace(/(?:Rs\.?|INR|[₹\u20B9])/gi, '')`, which cleanly removes `Rs.` regardless of trailing characters. All 17 unit and integration tests passed.

2. **Catalog Page Size Limit on Mock Store**:
   - *Symptom*: Requesting `https://demo.inelabteamdev.com/api/catalog?pageSize=100` only returned 60 items.
   - *Investigation*: Direct HTTP testing revealed the mock store API caps `pageSize` at 60.
   - *Fix*: In `catalog.service.js`, catalog caching was configured to paginate using `pageSize=60` across multiple pages to build a rich search index of unique products.

---

## 9. Remaining External Blocker: Mock Store Anti-Automation Challenge

During both manual browser testing in Google Chrome and automated Playwright execution:
- Navigating to `https://demo.inelabteamdev.com/product/614` shows the "Reveal price" button disabled until hover requirements are met.
- When the price widget interaction triggers `/api/challenge` and `POST /api/session`, the mock store's server responds with:
  `HTTP 401 Unauthorized` (`{"error": "unauthorized"}`)
- The frontend UI displays: `"Couldn't load the price after 1 attempts: challenge_failed"`.

### Application Handling:
In accordance with ethical engineering and assignment boundaries:
- We do not reverse-engineer cryptographic routines or forge authentication tokens.
- Our scraper cleanly catches this challenge state, logs it as `CHALLENGE_FAILED`, executes bounded retries, logs the attempts in `scrape_logs`, and preserves data integrity by never writing invalid price history records.
