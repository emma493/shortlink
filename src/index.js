/* ==========================================
   Shortlink — Cloudflare Worker
   
   Architecture:
     - 5 static user pages (page-1 → page-5) that visitors navigate through
     - POST /api/track is a no-op (no KV namespace configured; tracking
       events are written to Firestore directly from the browser via track.js)
     - GET /api/admin/stats returns empty stats (data lives in Firestore)
     - GET /Admin → admin dashboard HTML (reads from Firestore client-side)
     - * → serve static assets from public/
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
       No-op: no KV namespace. Returns success so the
       browser tracker never breaks.
       ========================================== */
    if (path === "/api/track" && method === "POST") {
      return json({ ok: true });
    }

    /* ==========================================
       Admin stats (read-only)
       Returns empty stats — data lives in Firestore,
       read client-side by the Admin dashboard.
       ========================================== */
    if (path === "/api/admin/stats" && method === "GET") {
      return json({
        totalViews: 0,
        views: 0,
        cpa: 0,
        completionRate: 0,
        pageViews: {},
        sortedPages: [],
        recentEvents: [],
      });
    }

    /* ==========================================
       Admin dashboard page
       ========================================== */
    if ((path === "/Admin" || path === "/Admin/") && method === "GET") {
      return serveAsset(env, request.url, "/Admin/index.html");
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

function urlPath(request) {
  try {
    return new URL(request.url).pathname;
  } catch (e) {
    return "/";
  }
}

async function serveAsset(env, requestUrl, path) {
  const assetUrl = new URL(path, requestUrl);
  const assetRequest = new Request(assetUrl.toString(), {
    headers: { accept: "text/html" },
  });
  const response = await env.ASSETS.fetch(assetRequest);
  if (response.status === 404) {
    return new Response("Not found", { status: 404 });
  }
  return response;
}
