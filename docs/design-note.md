# Design Note — Architectural Decisions & Reliability Engineering

**Project:** INE Product Price Tracker  
**Target:** INE Mock Store ([demo.inelabteamdev.com](https://demo.inelabteamdev.com/))  
**Engineering Domain:** Full-Stack Web Scraping & Distributed Automation  

---

## 1. How Did You Make Scraping Reliable?

Web scraping reliability fails most often due to:
1. Brittle CSS selectors that break on layout changes.
2. Unhandled asynchronous and client-side rendering barriers.
3. Silent acceptance of empty or corrupt data.
4. Memory leaks and unmanaged browser zombie processes.

To engineer a system that runs unattended every 2 hours without failure, we applied the following architectural controls:

- **Isolated Browser Context Lifecycle**: Every scrape execution launches Chromium with explicit sandboxing and closes contexts, pages, and browser instances inside a mandatory `finally` block via `closeSafe()`. This guarantees zero zombie processes even if navigation crashes.
- **Natural Interaction Orchestration**: Rather than attempting fragile protocol-level spoofing of WebAssembly bytecode or GPU hardware metrics, Playwright drives a real Chromium graphics context. It executes natural mouse movement (at least 12 coordinate steps spaced by 60ms) and dwells for 750ms over the `.price-block` widget, satisfying the store’s internal telemetry constraints (`minMoves: 8`, `minDwellMs: 600`) and enabling the "Reveal price" action organically.
- **Multi-Phase Selector Fallbacks**: Selector resolution does not depend on dynamic CSS classes (e.g. `pw-q9` or `st-q9` returned by `/api/layout`). Instead, it targets semantic elements combined with strict regular expression filters (`₹|Rs\.`, stock phrases), validating extracted text before accepting it.
- **Fail-Fast Data Validation Gate**: Even if an HTTP response code is 200 and elements exist in the DOM, data is never marked valid until it passes numeric parsing, bounds checking, and stock state verification.

---

## 2. Why Did You Choose HTTP Scraping or Playwright?

The assignment explicitly instructed: *"Prefer lightweight HTTP requests + HTML parsing if they work reliably. Use Playwright only if the website genuinely requires JavaScript/browser rendering."*

During Phase 1, we thoroughly investigated both approaches:

1. **Lightweight HTTP Analysis**:
   - Inspection of `https://demo.inelabteamdev.com/` and individual product URLs revealed an empty SPA skeleton (`<div id="root"></div>`).
   - The product API (`/api/product/:id`) returns static specs and reviews, but intentionally excludes price and stock.
   - Price and stock delivery are locked behind:
     - Mouse movement telemetry.
     - A WebAssembly proof-of-work challenge issued by `/api/challenge`.
     - Hardware environment attestation (Canvas 2D render hash, WebGL renderer GPU metrics, and `requestAnimationFrame` timing deltas) submitted to `/api/session`.
     - XOR payload decryption of `/api/products/:id/price`.
   - Simulating this in pure Node.js HTTP requests would require embedding a WebAssembly compiler, a mock Canvas 2D engine, a mock WebGL context, and an artificial RAF timer. Such spoofing is extremely brittle and frequently results in HTTP 401/403 blocks.

2. **Playwright Decision**:
   - Running Playwright Chromium provides a genuine browser context where WebAssembly runs natively and Canvas/WebGL hardware fingerprints are authentically generated.
   - Playwright was selected because **JavaScript execution, browser canvas attestation, and pointer telemetry are strictly required by the target mock store.**

---

## 3. How Do Retries Work?

Retries are managed by a bounded retry engine (`retry.js` with `withRetry`):

```
Attempt 1 (Immediate) ──► Fails (e.g. transient challenge delay)
       │
       ▼ Wait 1500ms (Linear/Exponential Backoff)
Attempt 2 ───────────────► Fails (e.g. network stall)
       │
       ▼ Wait 2250ms (Backoff multiplier: 1.5)
Attempt 3 ───────────────► Succeeded OR Exhausted
       │
       ▼ If all attempts exhausted:
Report Structured Failure & Log Final Outcome
```

Key principles:
- **Bounded Limit (`MAX_RETRIES=3`)**: The scraper never loops indefinitely.
- **Exponential Backoff**: Delays increase between attempts (`RETRY_DELAY_MS * (1.5 ^ (attempt - 1))`), allowing transient server hiccups to resolve.
- **Granular Classification**: Retryable errors (page load timeouts, transient 401 challenge barriers, 5xx server errors) trigger subsequent attempts. Non-retryable errors (e.g. permanent HTTP 404 Product Not Found) fail immediately to conserve resources.
- **Full Observability**: Each retry logs an intermediate entry (`status: 'retrying'`) in `scrape_logs` before sleeping and attempting again.

---

## 4. How Do You Detect Incorrect / Empty Data?

We implement a strict multi-layer validation gate (`validator.js`):

1. **Price Validation (`validatePrice`)**:
   - Must not be `null`, `undefined`, or empty string.
   - Strips currency markers (`₹`, `Rs`, `Rs.`, `INR`), commas, and trailing `/ -` labels.
   - Rejects non-numeric strings (`parseFloat` check + `isFinite`).
   - Rejects negative prices (`parsed < 0`).
   - Sanity bounds check (`parsed <= 100,000,000`).
   - Returns a verified, 2-decimal floating-point number.

2. **Stock Validation (`validateStock`)**:
   - Rejects `null`, `undefined`, or empty strings.
   - Explicitly recognizes out-of-stock states (`"Out of stock"`, `"Sold out"`, `"Unavailable"`), normalizing to `{ inStock: false, quantity: 0 }`.
   - Recognizes all dynamic phrases generated by the mock store: `"In stock · X left"`, `"Only X left"`, `"X in stock"`, `"Selling fast — X left"`, `"Hurry, just X left"`.
   - Extracts numeric quantities when present (`"Only 46 left"` -> `quantity: 46`).
   - **Critical Rule**: Unknown or ambiguous stock text throws a `ValidationError`. **Unknown stock is NEVER silently converted to zero.**

3. **Data Integrity Guarantee**:
   - Only when **both** price and stock pass validation does `trackerService` call `db.addPriceHistory()`.
   - If either check fails, the scrape is marked `failed` in `scrape_logs`, and **`price_history` is untouched.**

---

## 5. How Do You Handle Slow Responses?

The INE mock store introduces simulated latency (`setTimeout(e, 900)` at 35% probability):
- **Configurable Timeouts**:
  - `NAVIGATION_TIMEOUT_MS`: 15,000ms for initial page load.
  - `CONTENT_TIMEOUT_MS`: 10,000ms for product container mounting.
  - `SCRAPE_TIMEOUT_MS`: 30,000ms global budget per product attempt.
- **Targeted State Waits**: Instead of blind `sleep` statements, the scraper waits for specific DOM conditions (`page.waitForSelector('h1, .product-title, article')` and `page.waitForSelector('.price-value, .pv-*, [class*="priceWrap"]')`).
- **Fail-Safe Abort**: If an attempt exceeds the budget, Playwright throws a `TimeoutError`, cleanly caught and passed to the retry engine.

---

## 6. How Do You Handle Failed Responses?

When an error occurs (network drop, timeout, or challenge denial):
1. The error is classified into a structured domain error class (`ChallengeFailedError`, `NavigationTimeoutError`, `StructureChangeError`, `PriceExtractionError`, `StockExtractionError`).
2. The current browser context is guaranteed closed.
3. If attempts remain, backoff sleep is executed, and a new clean browser context is created.
4. If attempts are exhausted, the failure is returned to the service layer without throwing uncaught exceptions.

---

## 7. How Do You Ensure Failures are Honestly Recorded?

The assignment strictly prohibits hiding failures or generating placeholder data:
- **Comprehensive Audit Trail (`scrape_logs`)**: Every attempt records:
  - `started_at` and `completed_at` timestamps.
  - `status`: `'started'`, `'retrying'`, `'success'`, or `'failed'`.
  - `attempt_number` (1, 2, 3).
  - `http_status` and `error_type` (e.g. `ChallengeFailedError`, `NavigationTimeoutError`).
  - `duration_ms`.
  - `extracted_price` and `extracted_stock` (recorded as `null` on failure).
- **Clean History Table (`price_history`)**: Contains **zero** failed records. A user inspecting price history charts sees only authentic, validated price points.
- **Visible Dashboard Indicators**: The frontend displays a dedicated `StatusBadge` (`success`, `failed`, `retrying`) and an audit modal rendering all attempts with exact error messages.

---

## 8. How Does Scheduled Scraping Work with Free-Tier Hosting?

Free-tier cloud platforms like **Render** sleep after 15 minutes of inactivity, terminating any in-process `setInterval` or `setTimeout` timers.

To guarantee dependable 2-hour execution without requiring paid instances:
1. **Protected Batch Scrape Endpoint**: The Express backend exposes `POST /api/scrape/all` (and alias `POST /api/scrape/run`), protected by a secret token (`CRON_SECRET`).
2. **External Scheduling via cron-job.org**: An external cron service makes an HTTP `POST` request to `https://<render-backend-url>/api/scrape/all` every 120 minutes with header:
   ```http
   Authorization: Bearer <CRON_SECRET>
   ```
3. **Automatic Cold-Start Wakeup**: The incoming HTTP request from cron-job.org automatically wakes Render from sleep, executes the batch scraping pipeline across all tracking-enabled products, persists results to Supabase, and responds with a JSON summary:
   ```json
   {
     "success": true,
     "data": {
       "total": 5,
       "successful": 5,
       "failed": 0,
       "durationMs": 42150
     }
   }
   ```
4. **Controlled Concurrency (`SCRAPE_CONCURRENCY=2`)**: To prevent memory spikes on Render's 512MB free tier, products are processed via a worker queue with at most 2 concurrent browser contexts, preventing out-of-memory crashes.

---

## 9. What Trade-offs Did You Make?

| Trade-off | Chosen Approach | Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Scraping Engine** | Playwright Chromium | Cheerio / Axios HTTP | The store's WebAssembly PoW and Canvas/WebGL attestation require a real browser. |
| **Catalog Search** | Backend in-memory cache (`catalog.service.js`) | Live scraping per search keystroke | Searching 1,000 products over network on every keystroke would overwhelm the mock store and create huge latency. |
| **Batch Concurrency** | Worker pool (concurrency = 2) | Unbounded `Promise.all` | Unbounded browser launches exceed RAM on free-tier hosting (Render 512MB limit). |
| **Database Support** | Supabase PostgreSQL + Local JSON fallback | Supabase-only | Local file fallback allows full offline development and automated CI testing without cloud dependencies. |

---

## 10. AI Coding Tools Audit & Mistake Recovery

During development, the AI pair programming system made two notable mistakes, which were empirically caught, analyzed, and corrected (fully documented in `docs/ai-development-log.md`):

1. **Defect: Rigid Stock Phrasing Filter**
   - **What AI generated:** A simplistic regex matching only `in stock`, `out of stock`, or `units left`.
   - **How detected:** Running the diagnostic tool on Product `#614` (`node src/scraper/cli/diagnose.js 614`) caused repeated stock extraction errors despite HTTP 200 challenge success.
   - **Root cause:** Reverse engineering of the store bundle showed dynamic phrasing (`"Only X left"`, `"Selling fast — X left"`, `"Hurry, just X left"`).
   - **Correction:** Expanded `validateStock` and locator candidates to recognize all store templates. Rerunning against `#614` passed immediately on Attempt 1 (`Only 46 left`, 9.54s).

2. **Defect: Assumption of Lightweight HTTP Scraping**
   - **What AI generated:** Initial assumption that Cheerio / HTTP scraping could parse HTML responses.
   - **How detected:** Direct HTTP GET to `https://demo.inelabteamdev.com/product/960` returned only `<div id="root"></div>`.
   - **Correction:** Switched decisively to Playwright Chromium with pointer trajectory emulation.
