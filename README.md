# Shortlink

A clean, modern URL shortener with a multi-page redirect flow — fully runnable on your PC.

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Home — paste a long URL, get a short link |
| `result.html` | Shows the shortened link with copy button + stats |
| `go.html` | Intermediate redirect page with countdown |
| `destination.html` | Final destination page |

## Flow

1. **index.html** — User submits a URL → backend creates a short code
2. **result.html** — Displays the short link (`/r/<code>`) with copy button
3. Visitor clicks the short link → backend redirects to **go.html**
4. **go.html** — 5-second countdown, then redirects to the destination
5. **destination.html** — Final destination page

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open in your browser:
   ```
   http://localhost:3000
   ```

## Tech

- Vanilla HTML/CSS/JS (no framework)
- Node.js + Express backend
- Links persisted to `data/links.json`

## Deploy

Connect this repo to Cloudflare Pages — it auto-deploys on push to `main`.  
(The backend routes would need to be migrated to Cloudflare Functions for production.)
