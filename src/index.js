/* ==========================================
   Shortlink — Cloudflare Worker
   Routes:
     GET/POST /api/shorten   — create a short link
     GET    /api/link/:code  — get link info + click count
     GET    /api/admin/stats — aggregate admin stats
     GET    /api/admin/links — list all links (admin)
     GET    /r/:code         — increment click, serve go.html
     GET    /Admin           — admin dashboard HTML
     *                         — serve static assets from public/
   ========================================== */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // --- CORS preflight ---
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // --- API: Create short link ---
    if (path === "/api/shorten" && method === "POST") {
      return handleShorten(request, env);
    }

    // --- API: Get single link info ---
    if (path.startsWith("/api/link/") && method === "GET") {
      const code = path.slice("/api/link/".length);
      return handleLinkInfo(code, env);
    }

    // --- API: Admin aggregate stats ---
    if (path === "/api/admin/stats" && method === "GET") {
      return handleAdminStats(env);
    }

    // --- API: Admin list all links ---
    if (path === "/api/admin/links" && method === "GET") {
      return handleAdminLinks(env);
    }

    // --- API: Admin delete a link ---
    if (path.startsWith("/api/admin/link/") && method === "DELETE") {
      const code = path.slice("/api/admin/link/".length);
      return handleAdminDelete(code, env);
    }

    // --- Redirect route: /r/:code ---
    // Increments click in background, then serves go.html with the code
    if (path.startsWith("/r/") && method === "GET") {
      const code = path.slice(3);
      if (!code) {
        return redirectTo("/", env);
      }
      // Increment click asynchronously (don't block the page)
      ctx.waitUntil(incrementClick(env, code));
      // Serve go.html with ?code=ABC so the frontend can look up the destination
      return serveAsset(env, "/go.html?code=" + encodeURIComponent(code));
    }

    // --- Admin page ---
    if ((path === "/Admin" || path === "/Admin/") && method === "GET") {
      return serveAsset(env, "/admin.html");
    }

    // --- Static assets (HTML, CSS, JS) ---
    return env.ASSETS.fetch(request);
  },
};

/* ==========================================
   Helpers
   ========================================== */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
      ...extra,
    },
  });
}

function redirectTo(to, env) {
  return Response.redirect(to, 302);
}

/* --- KV helpers --- */

async function getLink(env, code) {
  const raw = await env.LINKS.get(`LINK:${code}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

async function setLink(env, code, link) {
  await env.LINKS.put(`LINK:${code}`, JSON.stringify(link));
}

async function incrementClick(env, code) {
  const link = await getLink(env, code);
  if (!link) return;
  link.clicks = (link.clicks || 0) + 1;
  await setLink(env, code, link);
}

async function listAllLinks(env) {
  const links = [];
  let cursor = undefined;
  do {
    const list = await env.LINKS.list({
      prefix: "LINK:",
      limit: 1000,
      cursor,
    });
    for (const key of list.keys) {
      const raw = await env.LINKS.get(key.name);
      if (raw) {
        try {
          links.push(JSON.parse(raw));
        } catch (e) {
          // skip corrupt entries
        }
      }
    }
    cursor = list.cursor;
  } while (cursor);
  return links;
}

/* --- Route handlers --- */

async function handleShorten(request, env) {
  try {
    const body = await request.json();
    const { url: rawUrl } = body;

    if (!rawUrl || typeof rawUrl !== "string") {
      return json({ error: "URL is required" }, 400);
    }

    // Normalize URL
    let longUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(longUrl)) {
      longUrl = "https://" + longUrl;
    }

    try {
      new URL(longUrl);
    } catch (e) {
      return json({ error: "Invalid URL" }, 400);
    }

    // Generate unique 6-char code
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code;
    do {
      code = Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");
    } while (await getLink(env, code));

    const now = new Date().toISOString();
    const origin = `${url.protocol}//${url.host}`;
    const shortUrl = `${origin}/r/${code}`;

    const link = {
      code,
      longUrl,
      shortUrl,
      clicks: 0,
      createdAt: now,
    };

    await setLink(env, code, link);

    return json({
      code,
      shortUrl,
      longUrl,
      clicks: 0,
    });
  } catch (err) {
    return json({ error: "Failed to shorten link" }, 500);
  }
}

async function handleLinkInfo(code, env) {
  const link = await getLink(env, code);
  if (!link) {
    return json({ error: "Link not found" }, 404);
  }
  return json({
    code: link.code,
    longUrl: link.longUrl,
    shortUrl: link.shortUrl,
    clicks: link.clicks || 0,
    createdAt: link.createdAt,
  });
}

async function handleAdminStats(env) {
  const links = await listAllLinks(env);
  const totalLinks = links.length;
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
  return json({ totalLinks, totalClicks, links });
}

async function handleAdminLinks(env) {
  const links = await listAllLinks(env);
  // Sort newest first
  links.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return json(links);
}

async function handleAdminDelete(code, env) {
  const link = await getLink(env, code);
  if (!link) {
    return json({ error: "Link not found" }, 404);
  }
  await env.LINKS.delete(`LINK:${code}`);
  return json({ success: true, code });
}

/* --- Serve static assets --- */

async function serveAsset(env, path) {
  // Build a synthetic request so ASSETS.fetch can find the file
  const assetUrl = new URL(path, "https://shortlink.lisascott.workers.dev");
  const assetRequest = new Request(assetUrl.toString(), {
    headers: { "accept": "text/html" },
  });
  const response = await env.ASSETS.fetch(assetRequest);
  if (response.status === 404) {
    return new Response("Not found", { status: 404 });
  }
  return response;
}
