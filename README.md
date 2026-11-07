# Shortlink

Cloudflare Workers URL shortener with admin dashboard.

Deployed at:
- User pages: https://shortlink.lisascott.workers.dev/
- Admin:      https://shortlink.lisascott.workers.dev/Admin

## Routes (handled by the Worker)

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Home — shorten a URL |
| `/result.html` | GET | Shows shortened link + copy button |
| `/go.html?code=ABC` | GET | Countdown redirect page (visitor side) |
| `/destination.html` | GET | Final destination page |
| `/Admin` | GET | Admin dashboard (stats + link list) |
| `/api/shorten` | POST | Create a short link |
| `/api/link/:code` | GET | Get link info + click count |
| `/api/admin/stats` | GET | Aggregate admin stats |
| `/api/admin/links` | GET | List all links |
| `/api/admin/link/:code` | DELETE | Delete a link |
| `/r/:code` | GET | Increment click → serve go.html |

## Pages (client-side flow)

1. **index.html** — User submits a URL → Worker creates short code in KV → redirects to `result.html`
2. **result.html** — Shows `shortlink.lisascott.workers.dev/r/ABC123` with copy button + live click count
3. Visitor opens the short link → Worker increments click → serves `go.html?code=ABC`
4. **go.html** — Looks up destination via `/api/link/:code` → 5-second countdown → redirects
5. **destination.html** — Final destination

## Local development

```bash
# Install dependencies
npm install

# Start local dev server (http://localhost:8787)
npm run dev

# Create a KV namespace in Cloudflare dashboard, then copy its ID into wrangler.toml
wrangler kv namespace create LINKS
```

## Production deploy

```bash
# Link your Cloudflare account
wrangler login

# Create KV namespace binding in dashboard (Workers & Pages → shortlink → Settings → KV)
# Paste the KV namespace ID into wrangler.toml under [kv_namespaces] → id

# Deploy
npm run deploy
```

## Tech

- Cloudflare Workers (entry: `src/index.js`)
- Cloudflare KV (link storage + click counts)
- Vanilla HTML/CSS/JS (no build step for frontend)
- Wrangler for dev/deploy
