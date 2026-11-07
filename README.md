# Shortlink

Cloudflare Workers URL shortener with **read-only admin analytics**.

Deployed at:
- User pages: https://shortlink.lisascott.workers.dev/
- Admin:      https://shortlink.lisascott.workers.dev/Admin

## Architecture

**User page** (`/`) — the only shortlink page. Users paste a URL, get a short link,
and navigate through the flow. Every action is tracked.

**Admin page** (`/Admin`) — **read-only dashboard**. The admin does NOT create
links here. It only displays tracking statistics collected from user activity on
the user page.

## User flow (tracked)

1. **index.html** — User submits a URL → Worker creates short link in KV → tracks creation → `result.html`
2. **result.html** — Shows `shortlink.lisascott.workers.dev/r/ABC123` with copy button + live click count → tracks page view
3. Visitor opens the short link → `/r/:code` → Worker increments click server-side + tracks redirect → serves `go.html?code=ABC`
4. **go.html** — Looks up destination via `/api/link/:code` → 5-second countdown → "Continue to destination" → redirects → tracks the click
5. **destination.html** — Final destination → tracks arrival

## Worker API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Home — shorten a URL (user page) |
| `/result.html` | GET | Shortened link + copy button |
| `/go.html?code=ABC` | GET | Countdown redirect page |
| `/destination.html` | GET | Final destination |
| `/Admin` | GET | Admin dashboard (read-only analytics) |
| `POST /api/shorten` | POST | Create short link + track creation |
| `GET /api/link/:code` | GET | Get link info + click count |
| `POST /api/track` | POST | Record user tracking event (page views, actions) |
| `GET /api/admin/stats` | GET | Aggregate tracking stats (admin read-only) |
| `GET /api/admin/links` | GET | List all links with click counts |
| `DELETE /api/admin/link/:code` | DELETE | Delete a link (admin only) |
| `GET /r/:code` | GET | Increment click + track → serve go.html |

## Tracking (what the admin sees)

- Total links created
- Total clicks across all links
- Click count per link
- Page views per path (home, result, go, destination)
- Recent events (link created, link clicked, link deleted, page views)

## Local development

```bash
npm install
npm run dev          # http://localhost:8787
```

Create a KV namespace in Cloudflare dashboard and add its ID to `wrangler.toml`:

```bash
wrangler kv namespace create LINKS
```

Then edit `wrangler.toml`:
```toml
[kv_namespaces]
binding = "LINKS"
id = "your-kv-namespace-id"
```

## Production deploy

```bash
wrangler login
npm run deploy
```

## Tech

- Cloudflare Workers (`src/index.js`) — all routing + API + tracking
- Cloudflare KV — link storage, click counters, tracking events
- Vanilla HTML/CSS/JS — no build step for frontend
- Wrangler — dev/deploy
