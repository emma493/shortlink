/* ==========================================
   Shortlink — Cloudflare Worker
   Architecture:
     USER PAGES (https://shortlink.lisascott.workers.dev/)
       - All link creation happens here
       - Users browse: index → result → go → destination
       - Every action is tracked

     ADMIN PAGE (/Admin) — READ-ONLY analytics
       - Does NOT create links
       - Shows tracking stats collected from user activity

   Routes:
     GET  /                    → serve index.html (home)
     GET  /result.html         → serve result.html
     GET  /go.html             → serve go.html
     GET  /destination.html    → serve destination.html
     GET  /Admin               → serve admin.html (read-only dashboard)
     POST /api/shorten         → create short link + track creation
     GET  /api/link/:code      → get link info + click count
     POST /api/track           → record user tracking event
     GET  /api/admin/stats     → aggregate tracking stats
     GET  /api/admin/links     → list all links (read-only)
     DELETE /api/admin/link/:code → delete a link (admin only)
     GET  /r/:code             → increment click, track redirect, serve go.html
     *                         → serve static assets from public/
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

    /* ==========================================
       USER API: Create short link
       ========================================== */
    if (path === "/api/shorten" && method === "POST") {
      return handleShorten(request, env, ctx);
    }

    /* ==========================================
       USER API: Get link info
       ========================================== */
    if (path.startsWith("/api/link/") && method === "GET") {
      const code = path.slice("/api/link/".length);
      return handleLinkInfo(code, env);
    }

    /* ==========================================
       USER API: Track user activity
       Frontend POSTs page views / actions here
       ========================================== */
    if (path === "/api/track" && method === "POST") {
      return handleTrack(request, env, ctx);
    }

    /* ==========================================
       ADMIN API: Read-only stats (admin does NOT create links)
       ========================================== */
    if (path === "/api/admin/stats" && method === "GET") {
      return handleAdminStats(env);
    }

    if (path === "/api/admin/links" && method === "GET") {
      return handleAdminLinks(env);
    }

    if (path.startsWith("/api/admin/link/") && method === "DELETE") {
      const code = path.slice("/api/admin/link/".length);
      return handleAdminDelete(code, env);
    }

    /* ==========================================
       Redirect: /r/:code
       Increments click, tracks the redirect, serves go.html
       ========================================== */
    if (path.startsWith("/r/") && method === "GET") {
      const code = path.slice(3);
      if (!code) {
        return redirectTo("/", env);
      }
      // Increment click + track redirect in background
      ctx.waitUntil(trackClick(env, code));
      return serveAsset(env, "/go.html?code=" + encodeURIComponent(code));
    }

    /* ==========================================
       Admin page (read-only dashboard)
       ========================================== */
    if ((path === "/Admin" || path === "/Admin/") && method === "GET") {
      return serveAsset(env, "/admin.html");
    }

    /* ==========================================
       Static assets (HTML, CSS, JS)
       ========================================== */
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

function redirectTo(to) {
  return Response.redirect(to, 302);
}

/* --- KV helpers --- */

async function getLink(env, code) {
  const raw = await env.LINKS.get(`LINK:${code}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function setLink(env, code, link) {
  await env.LINKS.put(`LINK:${code}`, JSON.stringify(link));
}

async function getCounter(env, key, def = 0) {
  const raw = await env.LINKS.get(key);
  if (!raw) return def;
  try {
    return parseInt(raw, 10) || def;
  } catch (e) {
    return def;
  }
}

async function setCounter(env, key, value) {
  await env.LINKS.put(key, String(value));
}

async function incrementCounter(env, key, by = 1) {
  const current = await getCounter(env, key, 0);
  await setCounter(env, key, current + by);
}

async function getPageViews(env) {
  const raw = await env.LINKS.get(`STATS:page_views`);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

async function setPageViews(env, views) {
  await env.LINKS.put(`STATS:page_views`, JSON.stringify(views));
}

async function getRecentEvents(env) {
  const raw = await env.LINKS.get(`EVENT:recent`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

async function addRecentEvent(env, event) {
  const events = await getRecentEvents(env);
  events.unshift(event);
  if (events.length > 100) events.length = 100;
  await env.LINKS.put(`EVENT:recent`, JSON.stringify(events));
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
          // skip corrupt
        }
      }
    }
    cursor = list.cursor;
  } while (cursor);
  return links;
}

/* --- Route handlers --- */

async function handleShorten(request, env, ctx) {
  try {
    const body = await request.json();
    const { url: rawUrl } = body;

    if (!rawUrl || typeof rawUrl !== "string") {
      return json({ error: "URL is required" }, 400);
    }

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

    // Track link creation (admin read-only stat)
    ctx.waitUntil(incrementCounter(env, `STATS:links_created`));
    ctx.waitUntil(
      addRecentEvent(env, {
        type: "link_created",
        code,
        longUrl,
        shortUrl,
        timestamp: now,
      })
    );

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

async function handleTrack(request, env, ctx) {
  try {
    const body = await request.json();
    const { type, path: p, code, timestamp } = body;

    const event = {
      type: type || "page_view",
      path: p || "",
      code: code || null,
      timestamp: timestamp || new Date().toISOString(),
    };

    // Count page views per path
    if (event.type === "page_view" && event.path) {
      const views = await getPageViews(env);
      views[event.path] = (views[event.path] || 0) + 1;
      await setPageViews(env, views);
    }

    // Track total clicks from redirect events
    if (event.type === "link_clicked") {
      ctx.waitUntil(incrementCounter(env, `STATS:clicks_total`));
    }

    ctx.waitUntil(addRecentEvent(env, event));

    return json({ ok: true });
  } catch (err) {
    return json({ error: "Tracking failed" }, 500);
  }
}

async function trackClick(env, code) {
  const link = await getLink(env, code);
  if (!link) return;
  link.clicks = (link.clicks || 0) + 1;
  await setLink(env, code, link);
  await incrementCounter(env, `STATS:clicks_total`);
  await addRecentEvent(env, {
    type: "link_clicked",
    code,
    longUrl: link.longUrl,
    timestamp: new Date().toISOString(),
  });
}

async function handleAdminStats(env) {
  const links = await listAllLinks(env);
  const totalLinks = links.length;
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const linksCreated = await getCounter(env, `STATS:links_created`, totalLinks);
  const clicksTotal = await getCounter(env, `STATS:clicks_total`, totalClicks);
  const pageViews = await getPageViews(env);

  return json({
    totalLinks: linksCreated,
    totalLinksStored: totalLinks,
    totalClicks: clicksTotal,
    totalClicksStored: totalClicks,
    pageViews,
    links,
  });
}

async function handleAdminLinks(env) {
  const links = await listAllLinks(env);
  links.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return json(links);
}

async function handleAdminDelete(code, env) {
  const link = await getLink(env, code);
  if (!link) {
    return json({ error: "Link not found" }, 404);
  }
  await env.LINKS.delete(`LINK:${code}`);
  await addRecentEvent(env, {
    type: "link_deleted",
    code,
    timestamp: new Date().toISOString(),
  });
  return json({ success: true, code });
}

/* --- Serve static assets --- */

async function serveAsset(env, path) {
  const assetUrl = new URL(path, "https://shortlink.lisascott.workers.dev");
  const assetRequest = new Request(assetUrl.toString(), {
    headers: { accept: "text/html" },
  });
  const response = await env.ASSETS.fetch(assetRequest);
  if (response.status === 404) {
    return new Response("Not found", { status: 404 });
  }
  return response;
}
