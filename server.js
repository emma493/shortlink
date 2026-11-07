/* ==========================================
   Shortlink — Local backend (Express)
   Run:  node server.js
   Then open: http://localhost:3000
   ========================================== */

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { nanoid } = require("nanoid");
const validUrl = require("valid-url");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Serve static files (HTML, CSS, JS, assets)
app.use(express.static(path.join(__dirname)));

// --- Data store (persisted to data/links.json) ---
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "links.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let links = {};
if (fs.existsSync(DATA_FILE)) {
  try {
    links = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    console.warn("Could not parse links.json, starting fresh.");
    links = {};
  }
}

function saveLinks() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2));
}

// --- API: Create a short link ---
app.post("/api/shorten", (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  // Normalize URL
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = "https://" + normalized;
  }

  if (!validUrl.isUri(normalized)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  // Generate short code
  let code;
  do {
    code = nanoid(6);
  } while (links[code]);

  const now = new Date().toISOString();
  links[code] = {
    code,
    longUrl: normalized,
    shortUrl: `${req.protocol}://${req.get("host")}/r/${code}`,
    clicks: 0,
    createdAt: now,
  };
  saveLinks();

  return res.json({
    code,
    shortUrl: links[code].shortUrl,
    longUrl: normalized,
    clicks: 0,
  });
});

// --- API: Get link info (for stats display) ---
app.get("/api/link/:code", (req, res) => {
  const { code } = req.params;
  const link = links[code];
  if (!link) {
    return res.status(404).json({ error: "Link not found" });
  }
  return res.json({
    code: link.code,
    longUrl: link.longUrl,
    shortUrl: link.shortUrl,
    clicks: link.clicks,
    createdAt: link.createdAt,
  });
});

// --- Redirect route: /r/:code -> go.html (intermediate page) ---
app.get("/r/:code", (req, res) => {
  const { code } = req.params;
  const link = links[code];

  if (!link) {
    // Unknown short code — send to home with an error
    return res.redirect("/?error=not_found");
  }

  // Increment click count
  link.clicks += 1;
  saveLinks();

  // Send to the intermediate (go) page with the destination
  const dest = encodeURIComponent(link.longUrl);
  const c = encodeURIComponent(code);
  return res.redirect(`/go.html?dest=${dest}&code=${c}`);
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Shortlink server running at http://localhost:${PORT}`);
});

module.exports = app;
