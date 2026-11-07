# Shortlink

A clean, modern URL shortener with a multi-page redirect flow — 100% static, no backend required.

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Home — paste a long URL, get a short link |
| `result.html` | Shows the shortened link with copy button |
| `go.html` | Intermediate redirect page with countdown |
| `destination.html` | Final destination page |

## Flow (all client-side)

1. **index.html** — User submits a URL → a short code is generated and saved to `localStorage` → redirects to `result.html`
2. **result.html** — Displays the short link (`go.html?code=ABC`) with a copy button
3. Visitor opens the short link → **go.html** reads the code, looks up the destination from `localStorage`, runs a 5-second countdown
4. **destination.html** — Final destination page

## Run locally

No install, no server. Just open `index.html` in your browser:

```
index.html  →  result.html  →  go.html  →  destination.html
```

## Tech

- Vanilla HTML/CSS/JS (no framework, no build step)
- `localStorage` for client-side link storage
- Cloudflare Pages ready

## Deploy

Connect this repo to Cloudflare Pages — it auto-deploys on push to `main`. No functions needed.
