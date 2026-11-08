/* ==========================================
   Shortlink — Visitor tracking (shared)
   Every page POSTs a page-view event to /api/track
   AND writes to Firestore so the Admin dashboard
   can read real-time stats.
   ========================================== */

import {
  app, db, doc, setDoc, collection,
} from "/Admin/js/firebase.js";

(function () {
  async function trackPage() {
    try {
      // POST to worker (no-op, keeps the endpoint alive)
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: window.location.pathname,
          referrer: document.referrer || null,
          timestamp: new Date().toISOString(),
        }),
      });

      // Also write to Firestore so Admin dashboard has data
      const eventDoc = doc(collection(db, "page_views"));
      await setDoc(eventDoc, {
        page: window.location.pathname,
        referrer: document.referrer || null,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent || null,
        createdAt: new Date(),
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
