# Mock Store Scraping Investigation Report

**Target URL:** [https://demo.inelabteamdev.com/](https://demo.inelabteamdev.com/)  
**Date of Investigation:** September 2026  
**Auditor:** Full-Stack & Web Scraping Engineering Team  

---

## 1. Executive Summary

Before implementing the scraper and data ingestion pipeline, a thorough inspection of the INE Mock Store's HTML markup, network waterfall, JavaScript execution flow, and API endpoints was conducted. 

Our findings demonstrate that **the target website is a client-rendered Single-Page Application (SPA)** protected by a sophisticated, multi-layered anti-scraping and interaction-verification system designed specifically for this assignment. Crucially, **product prices and stock levels are never rendered in the raw HTML response and are completely absent from standard product metadata APIs.** Instead, prices are dynamically retrieved via a proof-of-work WebAssembly challenge and encrypted network delivery tied to human-like mouse telemetry.

Consequently, **native HTTP-only fetching of product pages is fundamentally incapable of retrieving prices or stock.** Playwright browser automation with real layout and pointer emulation is strictly necessary for automated data extraction.

---

## 2. Product Discovery & Architecture

### 2.1 DOM & Initial HTML Structure
A raw `GET` request to `https://demo.inelabteamdev.com/` or any individual product URL (e.g., `https://demo.inelabteamdev.com/product/960`) returns a static HTML skeleton:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>INE Store</title>
    <script type="module" crossorigin src="/assets/index-B9UiQq4X.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-DrctpSuy.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

- **Zero Pre-Rendered Content**: The DOM contains only `<div id="root"></div>`.
- **Client-Side Hydration**: The entire catalog, product detail pages, and search navigation are rendered dynamically in the browser via React Router.

### 2.2 Catalog Listing & Pagination
The mock store frontend interacts with a backend API:
- **Endpoint**: `GET /api/catalog?page={page}&pageSize={pageSize}`
- **Total Catalog Size**: Exactly 1,000 items partitioned into pages (default `pageSize=20`, `pages=50`).
- **Data Payload**: Each catalog item provides basic metadata:
  ```json
  {
    "id": 960,
    "slug": "auralite-cross-trainer-studio",
    "name": "Auralite Cross Trainer Studio",
    "brand": "Auralite",
    "category": "Footwear",
    "sku": "AUR-10960",
    "description": "The Auralite Cross Trainer Studio..."
  }
  ```
- **Price & Stock in Catalog**: **Neither price nor stock is present in catalog responses.** As explicitly noted in the UI copy: *"browse the shelves. Prices are shown on each product’s page."*

### 2.3 Product Page URLs & Identifiers
- **URL Pattern**: `https://demo.inelabteamdev.com/product/:id`
- **Identifier**: A positive integer ID (`id`), accompanied by a semantic slug and alphanumeric SKU.
- **Product Metadata API**: `GET /api/product/:id` returns product specifications (materials, country of origin, warranty) and user reviews. **Price and stock are omitted from `/api/product/:id`.**

### 2.4 Search Behavior
- The mock store storefront performs client-side filtering over the paginated catalog. There is no dedicated `/api/search?q=` endpoint on the remote server.
- **Architecture Decision for Our System**: To avoid repeatedly bombarding the mock store with requests every time a user types a character, our backend implements an in-memory cached catalog service (`catalog.service.js`) that indexes all products by name, category, brand, and SKU, providing debounced sub-millisecond search to the React dashboard.

---

## 3. Price & Stock Delivery Mechanism (The Anti-Scraping Barrier)

Reverse engineering of `/assets/index-B9UiQq4X.js` revealed the cryptographic and behavioral mechanisms guarding price and stock data:

```
┌────────────────────────────────────────────────────────┐
│             User Navigates to Product Page             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│     Pointer Enters .price-block Widget Container       │
│     - Requires minMoves: 8 pointer coordinates         │
│     - Requires minDwellMs: 600ms hover duration        │
│     - Tracks pointer speed & timing intervals          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│      "Reveal price" Action Button Becomes Enabled      │
└───────────────────────────┬────────────────────────────┘
                            │ (User / Playwright clicks)
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 1: Fetch Challenge from /api/challenge          │
│  - Returns: salt, difficulty, WebAssembly bytecode     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 2: Solve Proof-of-Work & Environment Attestation│
│  - Executes WebAssembly instance with salt             │
│  - Computes SHA256 difficulty-bounded nonce            │
│  - Gathers Canvas 2D fingerprint hash                  │
│  - Gathers WebGL vendor/renderer GPU fingerprint       │
│  - Gathers requestAnimationFrame timing delta samples  │
│  - Submits solved PoW + attestation to /api/session    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 3: Server Validates Session -> Returns Token    │
│  - /api/session returns { token }                      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 4: Fetch Encrypted Price Payload                │
│  - GET /api/products/:productId/price                  │
│    Headers: Authorization: Bearer {token}              │
│  - Decrypts XOR payload: { shown, mrp, sale, stock }   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│        Price & Stock Rendered in Browser DOM           │
└────────────────────────────────────────────────────────┘
```

### 3.1 Dynamic Layout Rotation (`/api/layout`)
The mock store calls `/api/layout`, which dynamically re-assigns CSS class names across revisions:
```json
{
  "revision": 626004,
  "variant": 2,
  "classes": {
    "priceWrap": "pw-q9",
    "priceValue": "pv-q9",
    "mrp": "mr-q9",
    "sale": "sl-q9",
    "badge": "bd-q9",
    "rating": "rt-q9",
    "seller": "sr-q9",
    "delivery": "dl-q9",
    "stock": "st-q9"
  }
}
```
Scrapers relying on brittle class selectors like `.pv-q9` break when the layout rotates. Our scraper must look for semantic containers, currency symbols (`₹`, `Rs.`), and layout-agnostic locator filters.

### 3.2 Stock Phrasing Variations
Once decrypted, stock status is formatted into the DOM using a randomized function array:
1. `"In stock · ${e} left"`
2. `"Only ${e} left"`
3. `"${e} in stock"`
4. `"Selling fast — ${e} left"`
5. `"Hurry, just ${e} left"`
6. `"Out of stock"` (when inventory is 0)

**Critical Gotcha Identified**: Scrapers with narrow regexes (e.g. searching only for `"in stock"` or `"out of stock"`) will fail when the store randomly selects `"Only 4 left"` or `"Selling fast — 3 left"`. The stock extraction engine must support all variation templates.

---

## 4. Difficult Behavior & Edge Cases

| Scenario | Store Behavior | Scraper Handling Strategy |
| :--- | :--- | :--- |
| **No Pointer Hover** | Price remains unrevealed; button disabled | Playwright performs multi-point mouse trajectory and 750ms dwell before clicking. |
| **Headless / Automation Check** | Canvas/WebGL/RAF checks run in browser | Chromium instance launched with full context; natural window dimensions and GPU rendering enabled. |
| **Random Delays (`Xn`)** | Mock store injects `setTimeout(e, 900)` at 35% probability | Generous content timeouts (`CONTENT_TIMEOUT_MS=10000`) and explicit element waits (`waitForSelector`). |
| **Temporary 401/403 or 429** | Session rejected if telemetry fails or rate-limited | Bounded retries (`MAX_RETRIES=3`) with exponential backoff (`RETRY_DELAY_MS=1500`). |
| **Out of Stock** | Explicit `"Out of stock"` rendered; price still present | `validateStock` parses status as valid zero-quantity in-stock boolean `false`. Never omitted or converted to null. |
| **Non-existent Product (404)** | Store displays error page | Permanent failure detected immediately; logged honestly without retrying fruitlessly. |

---

## 5. Conclusion & Architecture Decision

1. **HTTP Scraping Feasibility**: Infeasible for price/stock. A lightweight HTTP request receives empty skeleton HTML. Attempting to reverse and execute the WebAssembly PoW and spoof Canvas/WebGL/RAF hardware timing over HTTP is fragile and against legitimate scraping boundaries.
2. **Playwright Feasibility**: Highly reliable when properly automating the natural human interaction curve (hover -> dwell -> click reveal -> wait for DOM update).
3. **Data Integrity Mandate**: Scrapes that fail the telemetry barrier must be honestly marked `failed` in `scrape_logs`, and **zero/null price records must never be inserted into `price_history`.**
