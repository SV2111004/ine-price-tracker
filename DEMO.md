# Product Price Tracker — Demonstration Script (2–4 Minutes)

This step-by-step walkthrough is designed to demonstrate all key features of the application for recording or presentation.

---

## Prerequisites

Ensure all dependencies are installed:
```bash
# In the repository root
npm install --prefix backend
npx --prefix backend playwright install chromium
npm install --prefix frontend
```

---

## Step 1: Start the Backend Server (Terminal 1)

```bash
cd backend
npm run dev
```

**What to point out:**
- Server starts on port `4000`.
- Terminal confirms database status (Supabase PostgreSQL or local atomic dev fallback).
- Shows health endpoint at `http://localhost:4000/api/health`.

---

## Step 2: Start the Frontend Dashboard (Terminal 2)

```bash
cd frontend
npm run dev
```

**What to point out:**
- Vite dev server starts on `http://localhost:5173`.
- Open `http://localhost:5173` in your browser.
- Point out the clean dark-mode UI, system health pill, and live connection to the backend.

---

## Step 3: Run the Headed Scraper Demonstration (Terminal 3)

```bash
# From project root:
npm run scrape:headed
```

**What to observe and highlight:**
- A visible Chromium browser window launches on the screen.
- Navigates to the real INE mock store product: `https://demo.inelabteamdev.com/product/614`.
- Shows the real page DOM: title ("Basecamp Motion Sensor Three"), category ("Smart Home"), and SKU.
- The scraper moves the mouse smoothly over the "Reveal price" widget to satisfy hover/dwell telemetry.
- Clicks or observes the reveal interaction and handles dynamic content.
- Terminal outputs clear progress logs:
  `[SCRAPER] Attempt 1/3 (Headed Mode)`
  `[SCRAPER] Scheduling retry 2 with backoff...`
- Demonstrates honest handling of the site challenge failure without faking prices or fabricating success.

---

## Step 4: Run the Scraper Diagnostic CLI

```bash
# From project root:
npm run scraper:diagnose
```

**What to observe:**
- Clean diagnostic output reporting Product ID, Product URL, Target Store, and bounded retries.
- Demonstrates exponential backoff between attempts.
- Shows final error classification (`CHALLENGE_FAILED`).
- Confirms zero fake values are created.

---

## Step 5: Dashboard Search & Product Tracking

In the browser at `http://localhost:5173`:
1. In the search box, type `Basecamp` or `Amperage`.
2. Notice real-time debounced search results querying the INE mock store catalog.
3. Click **"Track Product"** next to a product.
4. Notice:
   - Button instantly turns to **"Tracked"** (disabled to prevent duplicate tracking).
   - Product immediately appears in the **Tracked Products** table below.

---

## Step 6: Trigger On-Demand Scraping from Dashboard

1. In the **Tracked Products** table, find your tracked product.
2. Click the **"Scrape Now"** button.
3. Observe:
   - The status badge updates to **"IN PROGRESS"** with a spinner.
   - The backend executes the scraper pipeline with bounded retries.
   - Upon completion, the status badge reflects the honest outcome (`FAILED` with root cause reason or `SUCCESS` if price was revealed).
   - Notice that if the scrape failed, no invalid price snapshot is created in the history.

---

## Step 7: Inspect Product Detail Modal (History & Scrape Logs)

1. Click the **"Eye"** (View Details) button next to the product.
2. The modal opens showing:
   - Full product metadata (Name, SKU, Store Link).
   - Latest verified price and stock status.
   - **Tab 1: Price History Chart**: Visualizes historical price points using Recharts.
   - **Tab 2: Scrape Logs Table**: Displays the full audit trail with columns:
     `Timestamp | Attempt | Status | Price | Stock | Duration | Error`
   - Point out that every single attempt is observable and documented.

---

## Step 8: Verify Scheduled Endpoint & Security

Open another terminal or Postman/curl:

### Test 1: Unauthorized Call (Expect 401 Unauthorized)
```bash
curl -X POST http://localhost:4000/api/scrape/run
```
*Output*:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing CRON_SECRET authorization token"
  }
}
```

### Test 2: Authenticated Cron Call (Expect 200 OK)
```bash
curl -X POST http://localhost:4000/api/scrape/run \
  -H "Authorization: Bearer dev_cron_secret_ine_2026"
```
*Output*:
```json
{
  "success": true,
  "data": {
    "total": 1,
    "successful": 0,
    "failed": 1,
    "durationMs": 8450
  }
}
```
*Point out*:
- The batch processes all tracking-enabled products.
- One failed product does not crash or abort the batch.
- Ideal for external invocation by cron-job.org every 2 hours.
