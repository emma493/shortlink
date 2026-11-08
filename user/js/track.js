/* ==========================================
   Shortlink — Visitor tracking (shared)
   Every page POSTs a page-view event to /api/track
   ========================================== */

(function () {
  async function trackPage() {
    try {
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: window.location.pathname,
          referrer: document.referrer || null,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      // Tracking failures should never break the UI
    }
  }

  // Track on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackPage);
  } else {
    trackPage();
  }
})();
