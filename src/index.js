/* ==========================================
   Shortlink — Cloudflare Worker
   
   Architecture:
     - 5 static user pages (page-1 → page-5) that visitors navigate through
     - POST /api/track → records page-view event (no-op, writes to Firestore from browser)
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
       No-op: returns success so the browser tracker
       never breaks.
       ========================================== */
    if (path === "/api/track" && method === "POST") {
      return json({ ok: true });
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
