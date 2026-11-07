# Shortlink

5-page static site with visitor tracking and a read-only admin dashboard.

Deployed at:
- User pages: https://shortlink.lisascott.workers.dev/
  - `index.html`  → Page 1
  - `page-2.html` → Page 2
  - `page-3.html` → Page 3
  - `page-4.html` → Page 4
  - `page-5.html` → Page 5 (final)
- Admin: https://shortlink.lisascott.workers.dev/Admin

## Architecture

- **5 static user pages** — visitors navigate page 1 → page 5 using Next/Previous buttons
- **Every page visit is tracked** — each page POSTs to `/api/track` on load, recording the page path, referrer, and timestamp
- **Admin page is read-only** — displays visitor statistics collected from user page visits. Admin does NOT create or modify anything.

## Worker API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/` through `/page-5.html` | GET | Static user pages |
| `/Admin` | GET | Admin dashboard (read-only) |
| `POST /api/track` | POST | Record a page-view event (visitor analytics) |
| `GET /api/admin/stats` | GET | Aggregate visitor statistics (admin read-only) |

## Tracking data

- Total page views across all pages
- Views per individual page
- Most visited page
- Recent visitor activity (page + timestamp)

## Local development

```bash
npm install
npm run dev          # http://localhost:8787
```

Create a KV namespace in Cloudflare dashboard and add its ID to `wrangler.toml`:

```bash
wrangler kv namespace create STATS
```

Then edit `wrangler.toml`:
```toml
[kv_namespaces]
binding = "STATS"
id = "your-kv-namespace-id"
```

## Production deploy

```bash
wrangler login
npm run deploy
```

## Tech

- Cloudflare Workers (`src/index.js`) — tracking + admin stats API
- Cloudflare KV — visitor statistics storage
- Vanilla HTML/CSS/JS — no build step
- Wrangler — dev/deploy
