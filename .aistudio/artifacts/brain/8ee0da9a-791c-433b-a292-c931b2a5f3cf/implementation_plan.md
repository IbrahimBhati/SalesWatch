# SaleWatch: Fashion Sale Tracker & Automated Deal Monitor

SaleWatch is an Apple-inspired web application that monitors clothing and fashion e-commerce websites, detects products with verified discounts meeting or exceeding a user threshold (default 50%), and dispatches instant Telegram alerts.

> [!IMPORTANT]
> **Confirmed Decisions from Clarification**:
> - **Website Scraping**: Live web scraper with custom URL validation, JSON-LD / Schema.org / OpenGraph / Shopify product extraction, and helpful diagnostic reporting.
> - **Telegram Notifications**: Managed through an intuitive in-app Settings UI with credentials storage (Bot Token & Chat ID) and an interactive "Send Test Notification" action.
> - **Default Currency**: Pre-configured to PKR (Rs.) with instant switching available in Settings (USD, EUR, GBP, PKR).

---

### 1. Overview & Core Concept

- **What It Does**: Users provide a clothing store's web address (e.g. fashion stores, Shopify boutiques, WooCommerce shops). SaleWatch checks site accessibility, discovers products and extractable pricing, calculates genuine discount percentages (`((Original - Sale) / Original) * 100`), maintains price histories, and notifies the user via Telegram whenever a verified discount reaches their threshold.
- **Target Audience**: Fashion shoppers and deal hunters who want hands-off tracking of their favorite fashion brands without checking websites manually.
- **Key Value**: 100% verified discounts (eliminating fake promo banners and unverified original prices), zero clutter, automated scheduled scans, and direct Telegram notifications.

---

### 2. User Experience & Visual Design

#### A. Aesthetic Direction & Apple-Inspired Philosophy
- **Atmosphere**: Pure, serene, and intentional. Quiet white canvas (`#FAFAFA` / `#FFFFFF`), soft warm-grey structural surfaces (`#F5F5F7`), hairline border dividers (`rgba(0, 0, 0, 0.08)`), and an Apple-inspired subtle blue accent (`#0071E3`).
- **Typography**: System font stack mirroring SF Pro (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif`) with crisp weights (Regular 400, Medium 500, Semibold 600) and tabular numerals (`tabular-nums`) for currency figures and percentages.
- **Anti-Slop Discipline**: Zero pill enclosures for static metadata (unboxed text separated by `·`), no mechanical code prefixes or comment headers, no fake scoreboard metrics, and no neon gradients.
- **Spatial Presence**: Generous whitespace, 14–16px rounded corners, single-elevation depth, and responsive ergonomics (minimal sidebar on desktop, clean bottom tab bar on mobile).

#### B. Primary Views
1. **Overview**:
   - Greeting ("Good morning / afternoon / evening") & subtitle ("Your favorite stores, watched automatically.").
   - Prominent primary action: `+ Add Website`.
   - Four clean statistic cards: *Monitored Websites*, *Products Discovered*, *Active Sale Alerts*, and *Last Scan*.
   - Recent Sale Alerts feed with verified discount tags, original/sale prices, store name, discovery time, and outbound product links.
   - Elegant empty state when no qualifying discounts exist yet.
2. **Websites**:
   - Store list displaying store favicon/logo, name, URL, monitoring status, discovered product count, last scan time, and next scan schedule.
   - Interactive actions: `Scan Now` (with real-time feedback), `Pause/Resume Monitoring`, `Edit Threshold/Frequency`, and `Remove Website` (with confirmation modal).
   - `+ Add Website` modal: URL input, store name auto-detection, discount threshold (default 50%), scan frequency, and live validation check.
3. **Sale Alerts**:
   - Filter bar: *All*, *50%+*, *60%+*, *70%+*, *Recently Detected*, and Store selector.
   - Sort dropdown: *Highest Discount*, *Newest Detected*, *Lowest Sale Price*.
   - Product cards/rows with product photo, title, store, original price with strikethrough, bold sale price, discount percentage, and outbound store link.
   - Mark as viewed action and clean empty state.
4. **Settings**:
   - **General**: Default discount threshold, scan interval, and currency preference (PKR Rs., USD $, EUR €, GBP £).
   - **Telegram Integration**: Step-by-step setup guide (@BotFather bot creation, obtaining token, fetching chat ID), bot token & chat ID fields, status indicator, and `Send Test Notification` button.
   - **Monitoring & Automation**: Global scan toggle, scan failure alerts, and instant manual scan trigger.

---

### 3. Key Product Decisions & Trade-Offs

- **Backend Architecture (Express + Scraper Engine in Node.js)**:
  - *Chosen Approach*: Implement an Express full-stack backend running alongside the Vite frontend in the unified Node environment, featuring a robust HTML/JSON-LD/Schema.org/Shopify scraper engine with rate-limit courtesy and diagnostic error reporting.
  - *Why*: Provides low-latency API proxy routes (`/api/websites`, `/api/products`, `/api/alerts`, `/api/scan`, `/api/telegram/test`), avoids cross-origin browser blocking (CORS), and guarantees automated background scanning without depending on active browser tabs.
- **Persistent Data Store**:
  - *Chosen Approach*: Server-side file-backed transactional database (`/data/db.json` with atomic writes and schema models matching the database specification).
  - *Why*: Highly reliable, zero-configuration persistence across app restarts, with clean indexing for websites, products, price histories, alerts, and user settings.
- **Discount Verification Rules**:
  - *Chosen Approach*: Strictly compute discount from verified `original_price` and `sale_price`. If a website displays a generic banner ("Up to 50% Off") but individual items do not show an original strikethrough price, mark as unverified and suppress alerts.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SaleWatch UI (React + Tailwind)                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│   │   Overview   │  │   Websites   │  │ Sale Alerts  │  │  Settings  │ │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
└──────────┼─────────────────┼─────────────────┼────────────────┼────────┘
           │                 │                 │                │
           ▼                 ▼                 ▼                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Express API Server (/api/*)                        │
│  - POST /api/websites/validate     - GET /api/alerts                   │
│  - GET/POST/DELETE /api/websites   - POST /api/scan/:id (or all)       │
│  - GET /api/products               - POST /api/telegram/test           │
│  - GET/POST /api/settings          - Scheduled Cron Worker             │
└──────────┬─────────────────────────┬──────────────────────────┬────────┘
           │                         │                          │
           ▼                         ▼                          ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌────────────────────┐
│   Scraping Engine   │   │  Persistent Store   │   │  Telegram Bot API  │
│ - JSON-LD/Schema.org│   │ - websites          │   │ - Send message     │
│ - OpenGraph/Meta    │   │ - products          │   │ - Send photo       │
│ - Shopify endpoints │   │ - price_history     │   │ - Deduplication    │
│ - HTML fallback     │   │ - alerts & settings │   │   guard            │
└─────────────────────┘   └─────────────────────┘   └────────────────────┘
```

#### Data Entities
- **Websites**: `id`, `name`, `url`, `status` (active/paused/error), `discount_threshold`, `scan_frequency`, `last_scanned_at`, `next_scan_at`, `created_at`, `error_message`.
- **Products**: `id`, `website_id`, `name`, `product_url`, `image_url`, `currency`, `original_price`, `current_price`, `discount_percentage`, `availability`, `last_seen_at`, `created_at`.
- **Price History**: `id`, `product_id`, `original_price`, `current_price`, `discount_percentage`, `recorded_at`.
- **Alerts**: `id`, `product_id`, `website_id`, `discount_percentage`, `original_price`, `sale_price`, `status` (new/viewed), `detected_at`, `notification_sent_at`.
- **Settings**: `default_discount_threshold`, `default_scan_frequency`, `telegram_bot_token`, `telegram_chat_id`, `notification_enabled`, `currency`.
