<<<<<<< HEAD
# Shortlink — User Pages Bundle (Romance theme)

Static, no build step: open `index.html` in a browser (or serve the folder).

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page 1 — landing, 5s countdown, then "Click here to continue" |
| `page-2.html` | Why Dating Makes Life Feel Bigger (benefits of dating) |
| `page-3.html` | One Evening in Lisbon (romantic story) |
| `page-4.html` | Small Rituals That Keep Romance Alive |
| `page-5.html` | The Letter at Midnight (final page → destination) |
| `css/style.css` | Shared romance theme for all 5 pages |
| `js/index.js` | Page 1: countdown + button → `page-2.html` (navigation logic unchanged) |
| `js/flow.js` | Pages 2–5: countdown, progress bar, petals, Continue button |
| `js/task-tracker.js` | Pages 2–5: ad-task engine (random ads, click verification, saved progress, guided tutorial) |
| `css/tutorial.css` | Tutorial UI: toast, glowing spotlight, emoji finger, Pro Tip card |
| `js/track.js` | Posts page-view events to `/api/track` (now loaded on all 5 pages) |

## How each blog page works

1. A countdown starts on load (paused while the tab is hidden). The visitor just reads: **no tooltip, no glow**.
2. The Continue button is always tappable. If the ad tasks are not done, tapping it starts the tutorial:
   toast *"Complete one task to proceed — Click on Show me to begin"* -> **Show me** -> page scrolls to the ad,
   which gets a glowing yellow border and a 👆/👇 finger -> Pro Tip *"Click on the Ad above/below, Spend a few seconds and come back"*.
3. After the visitor returns from the advertiser, the ad is counted and the finger moves to the next ad.
   When both are done the page scrolls to Continue and points at it.
4. Continue only goes on when the tasks are done AND the countdown has finished.

## Ad tasks: how they work

* Each page has 8 ad units tagged with `data-ad="..."` on their `.ad-slot`. The **Social Bar** is tagged
  `data-floating="true"` because it floats over the page (nothing to scroll to or highlight), so it is not used for tasks.
* When the tutorial starts, **2 loaded ads are picked at random** (per page, per visitor). The picks are saved, so a refresh does not re-roll them.
* Each ad needs exactly **1 click**. Only the currently glowing ad counts, and it must be on screen.
* A click counts only after the visitor really leaves the page (tab hidden or window unfocused) for at least
  `data-ad-away` seconds (default 5) **and comes back**. Coming back too early shows "too quick" and does not count.
* There is no overlay and no fake button. Clicks inside cross-origin ad iframes are detected by the iframe taking focus;
  ads rendered in the page itself (native banner) need a trusted click.
* Progress lives in `localStorage` (`sl2:tasks:<page>`), signed, and expires after 45 minutes. Hand-edited values are discarded.
  It is cleared on page 1 and after the final page.
* `window.shortlinkTasks` exposes only `start()`, `isComplete()`, `remaining()`. Nothing can mark an ad as clicked.

## Settings (on the `<body>` tag of each page)

| Attribute | Meaning |
|-----------|---------|
| `data-wait="10"` | Countdown seconds for that page |
| `data-next="page-3.html"` | Where Continue goes |
| `data-final="true"` | Marks the last page |
| `data-ad-tasks="2"` | Ads to click on this page (default 2) |
| `data-ad-away="5"` | Seconds the visitor must spend away after clicking an ad (default 5) |
| `data-ad-fail="strict"` | If no ads load (ad blocker): `strict` = block with a "turn off ad blocker" message, `waive` = let the visitor through |
| `data-destination="/"` | Where the last page's button sends the visitor. **Set this to the real shortlink destination** (or let your Worker inject it). |

Page 1's countdown is the `WAIT` constant at the top of `js/index.js`.

## Ad slots

To add an ad unit that can be used for tasks, paste its code in a `<div class="ad-slot on" data-ad="unique-id" data-ad-label="Name">`.

## Tracking

Every page loads `js/track.js`, which POSTs `{ page, referrer, timestamp }` to `/api/track` (unchanged).

## Notes

- Fonts (Fraunces, Nunito Sans) load from Google Fonts. No images or other assets are needed.
- Respects `prefers-reduced-motion`.
=======
# Shortlink

A URL shortener service (coming soon).

## Tech

- Cloudflare Pages + Workers
- GitHub
>>>>>>> 1a5e01492bc056fa3309785432b2d612d3ebd43a
