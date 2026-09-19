# INE Product Price Tracker — Full-Stack Production System

A production-grade, full-stack automated price and stock tracking system engineered specifically for the INE Mock Store ([demo.inelabteamdev.com](https://demo.inelabteamdev.com/)).

Built with **React, Vite, and Tailwind CSS** on the frontend, **Node.js, Express, and Playwright** on the backend, and **Supabase PostgreSQL** for data persistence.

---

## Table of Contents

- [Overview](#overview)
- [Architecture & Monorepo Structure](#architecture--monorepo-structure)
- [Tech Stack](#tech-stack)
- [Mock Store Investigation & Reverse Engineering](#mock-store-investigation--reverse-engineering)
- [Scraping Strategy & Reliability Engine](#scraping-strategy--reliability-engine)
- [Database Schema & Migrations](#database-schema--migrations)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Local Setup & Running Locally](#local-setup--running-locally)
- [Running Scrapers (Headed & Diagnostic Modes)](#running-scrapers-headed--diagnostic-modes)
- [Scheduled Scraping (External Cron Architecture)](#scheduled-scraping-external-cron-architecture)
- [Production Deployment (Vercel + Render + Supabase)](#production-deployment-vercel--render--supabase)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Design Note & AI Development Audit](#design-note--ai-development-audit)

---

## Overview

The INE Product Price Tracker allows users to search the INE Mock Store catalog, track products, execute automated 2-hour and on-demand scraping routines, visualize historical price progression charts, and inspect complete audit logs of every scrape attempt.

### Core Data Integrity Principles:
1. **Zero Data Fabrication**: We never invent, guess, or placeholder prices, stock levels, or scrape statuses.
2. **Audit Trail Integrity**: Failed scrapes are recorded honestly with exact error codes, attempt numbers, and response durations.
3. **Clean History**: A failed scrape **never** inserts a zero, null, or fabricated record into `price_history`.
4. **Legitimate Browser Automation**: Operates within genuine browser graphics and pointer automation boundaries without attempting brittle protocol spoofing.

---

## Architecture & Monorepo Structure

The project is organized as a clean monorepo:

```
ine-price-tracker/
├── frontend/                     # React + Vite + Tailwind CSS (Deploy to Vercel)
│   ├── src/
│   │   ├── api/client.js        # Centralized fetch API client
│   │   ├── components/
│   │   │   ├── Header.jsx       # Branding, stats, and manual controls
│   │   │   ├── ProductSearch.jsx# Debounced catalog search with instant tracking
│   │   │   ├── TrackedProductsList.jsx # Tracked cards with status and actions
│   │   │   ├── ProductDetailModal.jsx  # History chart and scrape logs modal
│   │   │   ├── PriceChart.jsx   # Interactive Recharts price progression
│   │   │   ├── ScrapeLogsTable.jsx     # Detailed scrape attempt audit trail
│   │   │   └── StatusBadge.jsx  # Scrape status indicator pills
│   │   ├── App.jsx              # Main dashboard application root
│   │   └── index.css            # Tailwind directives and custom tokens
│   ├── vercel.json              # SPA rewrite configuration for Vercel
│   └── package.json
│
├── backend/                      # Node.js + Express + Playwright (Deploy to Render)
│   ├── src/
│   │   ├── config/              # env.js, database.js (Supabase + local fallback)
│   │   ├── controllers/         # products.controller.js, scrape.controller.js
│   │   ├── middleware/          # auth.middleware.js, error.middleware.js
│   │   ├── routes/              # products.routes.js, scrape.routes.js, health.routes.js
│   │   ├── scraper/
│   │   │   ├── browser.js       # Chromium launch, sandboxing, and safe cleanup
│   │   │   ├── errors.js        # Structured domain error hierarchy
│   │   │   ├── productScraper.js# Natural hover telemetry & DOM extraction
│   │   │   ├── retry.js         # Bounded retries with exponential backoff
│   │   │   ├── validator.js     # validatePrice and validateStock gates
│   │   │   └── cli/
│   │   │       ├── diagnose.js  # Headless diagnostic runner
│   │   │       └── headed.js    # Visible browser demonstration runner
│   │   ├── services/
│   │   │   ├── catalog.service.js # Cached catalog search
│   │   │   └── tracker.service.js # Scrape orchestrator & worker queue
│   │   ├── utils/logger.js      # Structured logger
│   │   └── server.js            # Express server entrypoint
│   ├── supabase/
│   │   └── schema.sql           # Idempotent PostgreSQL DDL migrations
│   ├── tests/                   # Vitest unit and integration suite
│   ├── render.yaml              # Render web service blueprint
│   └── package.json
│
├── docs/
│   ├── scraping-investigation.md # In-depth reverse engineering report
│   ├── design-note.md           # Answers to all architecture questions
│   └── ai-development-log.md    # Transparent record of initial mistakes & fixes
│
├── README.md
├── .gitignore
└── package.json                 # Monorepo orchestration scripts
```

---

## Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Recharts | Fast SPA, lightweight bundle (<570kB), responsive dark UI. |
| **Backend** | Node.js (ESM), Express 4 | Lightweight REST API with centralized middleware error handling. |
| **Database** | Supabase PostgreSQL (+ Local Atomic JSON Fallback) | Relational integrity with Foreign Keys and UUIDs; zero-config local fallback. |
| **Automation Engine** | Playwright Chromium | Full graphics context satisfying store's Canvas/WebGL attestation & WASM PoW. |
| **Scheduler** | External cron-job.org | Render sleep-safe: invokes protected HTTP endpoint every 2 hours. |
| **Testing** | Vitest, Supertest | Blazing-fast unit and integration testing. |

---

## Mock Store Investigation & Reverse Engineering

Before writing the scraper, we reverse-engineered `https://demo.inelabteamdev.com/`:
1. **Pure SPA Client Rendering**: Standard HTTP GET returns only `<div id="root"></div>`. No HTML product pages or server-side rendered prices exist.
2. **Catalog vs Price Separation**: The paginated catalog (`GET /api/catalog?page=1&pageSize=20`) and product metadata (`GET /api/product/:id`) intentionally omit price and stock.
3. **Anti-Scraping Challenge Flow**:
   - Price widget requires mouse movement (`minMoves: 8`, `minDwellMs: 600`) over `.price-block`.
   - Clicking "Reveal price" fetches a WebAssembly proof-of-work challenge from `/api/challenge`.
   - Browser computes Canvas 2D render hash, WebGL GPU info, and `requestAnimationFrame` timing deltas, posting them to `POST /api/session`.
   - On success, `/api/session` issues a session token used to fetch `GET /api/products/:id/price`.
   - The encrypted payload is decrypted in the browser using XOR and rendered in the DOM.
4. **Dynamic Phrasing & Rotating CSS**: Stock status uses randomized templates (`"In stock · X left"`, `"Only X left"`, `"Selling fast — X left"`, `"Hurry, just X left"`, `"Out of stock"`), and class names rotate per revision via `/api/layout`.

Full investigation details are documented in [docs/scraping-investigation.md](docs/scraping-investigation.md).

---

## Scraping Strategy & Reliability Engine

### Why Playwright Was Chosen Over HTTP Fetching
Because the store enforces Canvas/WebGL graphics fingerprinting, RAF timing deltas, WebAssembly bytecode execution, and mouse trajectory verification, raw HTTP requests are rejected (HTTP 401/403). Playwright drives a real Chromium instance that satisfies these requirements natively.

### Reliability Features
1. **Request & Content Timeouts**:
   - `NAVIGATION_TIMEOUT_MS`: 15,000ms.
   - `CONTENT_TIMEOUT_MS`: 10,000ms.
   - `SCRAPE_TIMEOUT_MS`: 30,000ms global budget.
2. **Bounded Retries with Exponential Backoff**:
   - `MAX_RETRIES=3` with exponential multiplier (`RETRY_DELAY_MS * (1.5 ^ (attempt - 1))`).
   - Permanent errors (e.g. 404) fail immediately; transient glitches retry automatically.
3. **Strict Validation Gates**:
   - `validatePrice`: Strips currency symbols (`₹`, `Rs.`), enforces non-negative bounds, rejects non-numeric or empty values.
   - `validateStock`: Parses all mock store templates, differentiates between `stock = 0` (out of stock) and unparseable stock (throws `ValidationError`).
4. **Controlled Concurrency (`SCRAPE_CONCURRENCY=2`)**:
   - Worker pool queue limits concurrent Chromium browser contexts during batch runs, preventing memory crashes on Render's 512MB free tier.

---

## Database Schema & Migrations

The database is built on Supabase PostgreSQL. The full schema is located at `backend/supabase/schema.sql`.

### 1. `tracked_products`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique product tracker record identifier. |
| `external_product_id` | VARCHAR(64) (UNIQUE) | Stable INE store product ID (e.g. "614"). |
| `product_name` | VARCHAR(255) | Product name. |
| `product_url` | TEXT | Storefront URL (`https://demo.inelabteamdev.com/product/:id`). |
| `image_url` | TEXT | Optional image thumbnail URL. |
| `category` | VARCHAR(100) | Product category. |
| `sku` | VARCHAR(100) | Stock keeping unit. |
| `tracking_enabled` | BOOLEAN | Monitoring toggle (default `TRUE`). |
| `created_at` | TIMESTAMPTZ | Creation timestamp. |
| `updated_at` | TIMESTAMPTZ | Automatic timestamp updated via PostgreSQL trigger. |
| `last_scraped_at` | TIMESTAMPTZ | Timestamp of the most recent scrape attempt. |
| `last_scrape_status` | VARCHAR(32) | Status of most recent scrape (`success`, `failed`, `never_scraped`). |

### 2. `price_history`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique history point identifier. |
| `tracked_product_id` | UUID (FK) | References `tracked_products(id)` ON DELETE CASCADE. |
| `scraped_at` | TIMESTAMPTZ | Timestamp of verified extraction. |
| `price` | NUMERIC(12, 2) | Validated price (CHECK `price >= 0`). |
| `currency` | VARCHAR(10) | Currency code (default `'INR'`). |
| `stock` | VARCHAR(100) | Verified stock text (e.g. "In stock · 14 left", "Out of stock"). |
| `scrape_log_id` | UUID (FK) | References `scrape_logs(id)` audit record. |
| `created_at` | TIMESTAMPTZ | Record creation timestamp. |

> **Critical Rule:** Only successful, fully validated scrapes insert into `price_history`. Failed scrapes never write null or fake prices.

### 3. `scrape_logs`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique log entry identifier. |
| `tracked_product_id` | UUID (FK) | References `tracked_products(id)` ON DELETE CASCADE. |
| `started_at` | TIMESTAMPTZ | When the scrape pipeline began. |
| `completed_at` | TIMESTAMPTZ | When the attempt concluded. |
| `status` | VARCHAR(32) | `'started'`, `'retrying'`, `'success'`, or `'failed'`. |
| `attempt_number` | INTEGER | Attempt index (1, 2, or 3). |
| `http_status` | INTEGER | HTTP response code (200, 401, 500, etc.). |
| `error_type` | VARCHAR(64) | Error domain class (e.g. `ChallengeFailedError`). |
| `error_message` | TEXT | Specific failure diagnosis or null on success. |
| `duration_ms` | INTEGER | Total execution duration in milliseconds. |
| `extracted_price` | NUMERIC(12, 2) | Verified price or null on failure. |
| `extracted_stock` | VARCHAR(100) | Verified stock or null on failure. |
| `metadata` | JSONB | Additional debugging metadata (URL, code, etc.). |

---

## API Endpoints

All endpoints return JSON with consistent error formatting (`{ success: false, error: { code, message } }`).

### Health & Discovery
- `GET /api/health`: System health and database connection status.
- `GET /api/products/search?q=:query`: Debounced catalog search querying live INE store products.

### Tracked Products Management
- `GET /api/tracked-products`: List all tracked products with latest price, stock, and scrape status.
- `POST /api/tracked-products`: Add a product to tracking (`{ external_product_id, product_name, ... }`). Returns 409 Conflict if already tracked.
- `GET /api/tracked-products/:id`: Fetch individual product details.
- `DELETE /api/tracked-products/:id`: Untrack and delete a product (cascades to history and logs).
- `PATCH /api/tracked-products/:id`: Toggle tracking status (`{ tracking_enabled: boolean }`).

### History & Scrape Audit
- `GET /api/tracked-products/:id/history`: List price and stock progression records.
- `GET /api/tracked-products/:id/logs`: List complete audit log of all scrape attempts.

### Scraping Operations
- `POST /api/tracked-products/:id/scrape` (or `POST /api/scrape/product/:id`): Trigger an on-demand manual scrape for a single product. Query param `?headed=true` launches visible browser.
- `POST /api/scrape/all` (or `POST /api/scrape/run`): Protected batch endpoint for external cron scheduling. Requires `Authorization: Bearer <CRON_SECRET>`. Scrapes all active products with controlled concurrency.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `4000` | HTTP port for the Express server. |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`). |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed CORS origin. |
| `SUPABASE_URL` | Recommended | `""` | Supabase project URL (falls back to local JSON DB if empty). |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | `""` | Supabase service-role secret key. |
| `CRON_SECRET` | Yes | `dev_cron_secret_ine_2026` | Authorization token for `POST /api/scrape/all`. |
| `MOCK_STORE_URL` | No | `https://demo.inelabteamdev.com` | Target INE store URL. |
| `SCRAPE_CONCURRENCY` | No | `2` | Max concurrent Chromium contexts during batch scrape. |
| `SCRAPE_TIMEOUT_MS` | No | `30000` | Global scrape timeout per product (ms). |
| `NAVIGATION_TIMEOUT_MS` | No | `15000` | Page navigation timeout (ms). |
| `CONTENT_TIMEOUT_MS` | No | `10000` | Element locator timeout (ms). |
| `MAX_RETRIES` | No | `3` | Maximum retry attempts per scrape. |
| `RETRY_DELAY_MS` | No | `1500` | Initial retry backoff delay (ms). |
| `HEADLESS` | No | `true` | Set to `false` to force all scrapes to open visible browser. |

### Frontend (`frontend/.env`)
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Yes (in prod) | `http://localhost:4000/api` | Base URL of the deployed Express backend. |

---

## Local Setup & Running Locally

### Prerequisites
- Node.js 18+ or 20+ installed.
- Git.

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ine-price-tracker
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install
npx playwright install chromium

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### 3. Setup Environment Variables
```bash
# Backend
cp backend/.env.example backend/.env
# Frontend
cp frontend/.env.example frontend/.env
```
*(Optionally populate `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`. If omitted, the backend uses its atomic local JSON database automatically).*

### 4. Run the Backend & Frontend
In separate terminal windows:
```bash
# Terminal 1: Start Backend (Port 4000)
npm run dev:backend

# Terminal 2: Start Frontend (Port 5173)
npm run dev:frontend
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running Scrapers (Headed & Diagnostic Modes)

### Headed Demonstration Runner (Suitable for Screen Recording)
The assignment requires an observable headed run demonstrating browser interaction, telemetry, and retry handling.

```bash
# Run visible headed scrape for default product (614)
npm run scrape:headed

# Run visible headed scrape for specific product ID (e.g. 960)
npm --prefix backend run scrape:headed 960

# Run with simulated retry to visibly demonstrate the retry flow
npm --prefix backend run scrape:headed 960 --simulate-retry
```

**Terminal Output Example:**
```
================================================================
       INE PRICE TRACKER — VISIBLE HEADED DEMONSTRATION         
================================================================
[INFO] Starting headed scrape
[INFO] Product ID: 960
[INFO] Product URL: https://demo.inelabteamdev.com/product/960
[INFO] Browser Engine: Chromium (Visible Headed Mode)
[INFO] Max Bounded Retries: 3
----------------------------------------------------------------
[INFO] Attempt 1/3
[INFO] Opening browser and navigating to https://demo.inelabteamdev.com/product/960...
[INFO] Waiting for product page content and container...
[SUCCESS] Price: ₹7065 (raw: "₹7,065")
[SUCCESS] Stock: Out of stock
----------------------------------------------------------------
[SUCCESS] Headed scrape completed in 9.82s
[INFO] Validated Price: ₹7065
[INFO] Validated Stock: Out of stock
[INFO] Scrape result ready for persistence in Supabase PostgreSQL
```

### Headless Diagnostic Runner
```bash
npm run scraper:diagnose
# Or specify product ID:
npm --prefix backend run scraper:diagnose 82
```

---

## Scheduled Scraping (External Cron Architecture)

Free-tier hosting platforms (such as Render) spin down after 15 minutes of inactivity. Relying on an internal `setInterval` or Node.js process timer fails because the server sleeps.

### The Solution: External Cron via cron-job.org
1. Sign up for a free account at [cron-job.org](https://cron-job.org/).
2. Click **Create Cronjob**.
3. Configure the job:
   - **Title**: `INE Price Tracker 2-Hour Batch Scrape`
   - **URL**: `https://<your-render-backend-url>/api/scrape/all`
   - **Request Method**: `POST`
   - **Schedule**: Every 2 hours (`0 */2 * * *`)
   - **Request Headers**:
     - Key: `Authorization`
     - Value: `Bearer <YOUR_CRON_SECRET>`
4. Save the cron job.

**How it behaves:**
Every 2 hours, cron-job.org sends an authorized HTTP POST request to Render. This automatically wakes the backend, loads all tracking-enabled products from Supabase, runs the bounded scraper with controlled concurrency (`SCRAPE_CONCURRENCY=2`), records every attempt into `scrape_logs`, inserts valid data into `price_history`, and returns a summary JSON response.

---

## Production Deployment (Vercel + Render + Supabase)

### 1. Database: Supabase PostgreSQL
1. Create a free project at [supabase.com](https://supabase.com/).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and run the entire contents of [backend/supabase/schema.sql](backend/supabase/schema.sql).
4. Copy your **Project URL** and **service_role key** (from Settings -> API).

### 2. Backend: Render
1. Create a new **Web Service** on [render.com](https://render.com/) pointing to your repository.
2. Settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx playwright install chromium --with-deps`
   - **Start Command**: `npm start`
3. Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `SUPABASE_URL`: `<your-supabase-url>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-supabase-service-role-key>`
   - `CRON_SECRET`: `<choose-a-strong-secret-token>`
   - `FRONTEND_URL`: `https://<your-vercel-frontend-url>`
   - `MOCK_STORE_URL`: `https://demo.inelabteamdev.com`
   - `SCRAPE_CONCURRENCY`: `2`
   - `HEADLESS`: `true`

### 3. Frontend: Vercel
1. Import the repository into [vercel.com](https://vercel.com/).
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Environment Variables:
   - `VITE_API_BASE_URL`: `https://<your-render-backend-url>/api`
4. Deploy. The included `vercel.json` ensures all SPA routes resolve correctly.

---

## Testing & Quality Assurance

Run the automated test suite:
```bash
npm test
# Or from backend directory:
cd backend && npm test
```

### Test Coverage:
- **`tests/validator.test.js`**: Validates price currency normalization, decimals, and negative number rejection; validates all mock store stock copy templates (`"In stock · X left"`, `"Only X left"`, `"Selling fast — X left"`, `"Hurry, just X left"`, `"Out of stock"`).
- **`tests/retry.test.js`**: Verifies bounded retries, exponential backoff pacing, and error propagation.
- **`tests/api.test.js`**: Tests catalog search, tracked product CRUD, duplicate 409 conflict rejection, individual product lookup, unauthorized 401 cron rejection, and delete cascades.

---

## Design Note & AI Development Audit

For detailed technical evaluation and interview preparation, refer to the documentation:
- **[docs/scraping-investigation.md](docs/scraping-investigation.md)**: Reverse engineering report on the mock store's WebAssembly PoW, Canvas/WebGL attestation, and pointer telemetry requirements.
- **[docs/design-note.md](docs/design-note.md)**: Comprehensive answers to all reliability, retry, validation, hosting, and trade-off questions.
- **[docs/ai-development-log.md](docs/ai-development-log.md)**: Transparent record of initial AI defects (stock regex omissions, HTTP assumptions), detection evidence, and verified code fixes.
