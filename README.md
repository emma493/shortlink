# Shortlink

A clean, modern URL shortener with a multi-page redirect flow.

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Home — shorten a URL (creator side) |
| `result.html` | Shows the generated short link with copy button |
| `go.html` | Intermediate redirect page with countdown (visitor side) |
| `destination.html` | Final destination page |

## Flow

1. User visits `index.html`, pastes a long URL → gets a short link
2. User visits the short link → `go.html` (countdown + continue)
3. After countdown → `destination.html` (final destination)

## Tech

- Vanilla HTML/CSS/JS (no framework)
- Cloudflare Pages ready
- LocalStorage for demo persistence

## Deploy

Connect this repo to Cloudflare Pages — it auto-deploys on push to `main`.
