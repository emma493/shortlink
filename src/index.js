/* ==========================================
   Shortlink — Cloudflare Worker
   
   Architecture:
     - 5 static user pages (page-1 → page-5) that visitors navigate through
     - Every page visit POSTs to /api/track (visitor statistics)
     - Admin page (/Admin) is read-only: shows visitor stats, no link creation
   
   Routes:
     POST /api/track       → record a page view event
     GET  /api/admin/stats → aggregate visitor statistics (read-only)
     GET  /Admin           → admin dashboard HTML
     *                     → serve static assets from public/
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
       Track a page view (visitor analytics)
       ========================================== */
    if (path === "/api/track" && method === "POST") {
      return handleTrack(request, env, ctx);
    }

    /* ==========================================
       Admin stats (read-only)
       ========================================== */
    if (path === "/api/admin/stats" && method === "GET") {
      return handleAdminStats(env);
    }

    /* ==========================================
       Admin dashboard page
       ========================================== */
    if ((path === "/Admin" || path === "/Admin/") && method === "GET") {
      return serveAsset(env, "/admin.html");
    }

    /* ==========================================
       Static assets
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

/* --- KV helpers --- */

async function getCounter(env, key, def = 0) {
  const raw = await env.STATS.get(key);
  if (!raw) return def;
  try {
    return parseInt(raw, 10) || def;
  } catch (e) {
    return def;
  }
}

async function setCounter(env, key, value) {
  await env.STATS.put(key, String(value));
}

async function incrementCounter(env, key, by = 1) {
  const current = await getCounter(env, key, 0);
  await setCounter(env, key, current + by);
}

async function getPageViews(env) {
  const raw = await env.STATS.get("PAGE_VIEWS");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

async function setPageViews(env, views) {
  await env.STATS.put("PAGE_VIEWS", JSON.stringify(views));
}

async function getRecentEvents(env) {
  const raw = await env.STATS.get("EVENTS_RECENT");
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
  if (events.length > 200) events.length = 200;
  await env.STATS.put("EVENTS_RECENT", JSON.stringify(events));
}

/* --- Route handlers --- */

async function handleTrack(request, env, ctx) {
  try {
    const body = await request.json();
    const { page, referrer, timestamp } = body;

    const event = {
      page: page || urlPath(request),
      referrer: referrer || null,
      timestamp: timestamp || new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || null,
    };

    // Increment total page views
    await incrementCounter(env, "TOTAL_VIEWS");

    // Increment per-page views
    const views = await getPageViews(env);
    const p = event.page;
    views[p] = (views[p] || 0) + 1;
    await setPageViews(env, views);

    // Store recent event
    ctx.waitUntil(addRecentEvent(env, event));

    return json({ ok: true });
  } catch (err) {
    return json({ error: "Tracking failed" }, 500);
  }
}

function urlPath(request) {
  try {
    return new URL(request.url).pathname;
  } catch (e) {
    return "/";
  }
}

async function handleAdminStats(env) {
  const totalViews = await getCounter(env, "TOTAL_VIEWS", 0);
  const pageViews = await getPageViews(env);
  const recentEvents = await getRecentEvents(env);

  // Sort pages by views descending
  const sortedPages = Object.entries(pageViews)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views);

  return json({
    totalViews,
    pageViews,
    sortedPages,
    recentEvents,
  });
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
