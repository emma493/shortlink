// ==========================================
// Shortlink Admin — Data layer
// Reads page_view events from Firestore collection
// and aggregates them into Views vs CPA stats.
// Falls back to /api/admin/stats API if Firestore fails.
// ==========================================

import {
  app, db, PAGE_VIEWS_COLLECTION, collection, query, orderBy, limit, getDocs, onSnapshot,
} from "./firebase.js";

const REFRESH_MS = 30000;
let autoRefreshTimer = null;
let isRefreshing = false;
let firebaseReady = false;
let unsubscribeFirestore = null;

let els = {};

export function setElements(e) {
  els = e;
}

export function setRefreshing(state) {
  isRefreshing = state;
  if (els.refreshBanner) {
    els.refreshBanner.classList.toggle("show", state);
    els.refreshText.textContent = state ? "Refreshing stats&hellip;" : "Refresh";
  }
}

export function showBanner(msg, kind, ms) {
  if (!els.refreshBanner) return;
  els.refreshText.textContent = msg;
  els.refreshBanner.className = "refresh-banner show";
  if (kind === "success") {
    els.refreshBanner.style.color = "var(--gold)";
    els.refreshBanner.querySelector(".dot").style.background = "var(--gold)";
  } else if (kind === "error") {
    els.refreshBanner.style.color = "#ef4444";
    els.refreshBanner.querySelector(".dot").style.background = "#ef4444";
  } else {
    els.refreshBanner.style.color = "var(--gold)";
    els.refreshBanner.querySelector(".dot").style.background = "var(--gold)";
  }
  setTimeout(() => { els.refreshBanner.classList.remove("show"); }, ms || 2000);
}

export function setValue(el, newVal) {
  if (el && el.textContent !== newVal) {
    el.style.opacity = "0";
    requestAnimationFrame(() => {
      el.textContent = newVal;
      el.style.opacity = "1";
    });
  }
}

// Page classification
const FINAL_PAGE = "/page-5.html";
const NON_FINAL_PAGES = ["/", "/page-2.html", "/page-3.html", "/page-4.html"];

function classifyPage(page) {
  if (page === FINAL_PAGE) return "cpa";
  if (NON_FINAL_PAGES.includes(page)) return "view";
  return "other";
}

// Aggregate raw page view docs into dashboard stats
function aggregate(docs) {
  let totalViews = 0;
  let views = 0;
  let cpa = 0;
  const pageViews = {};
  const recentEvents = [];

  for (const docSnap of docs) {
    const data = docSnap.data();
    const page = data.page || "/";
    const ts = data.timestamp || data.createdAt || new Date();

    totalViews++;

    const type = classifyPage(page);
    if (type === "cpa") cpa++;
    else if (type === "view") views++;

    pageViews[page] = (pageViews[page] || 0) + 1;

    recentEvents.push({
      page,
      referrer: data.referrer || null,
      timestamp: ts,
    });
  }

  // Sort recent events by timestamp desc, take latest 200
  recentEvents.sort((a, b) => {
    const ta = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
    const tb = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
    return tb - ta;
  });
  if (recentEvents.length > 200) recentEvents.length = 200;

  // Sort pages by views desc
  const sortedPages = Object.entries(pageViews)
    .map(([page, v]) => ({ page, views: v }))
    .sort((a, b) => b.views - a.views);

  const completionRate = totalViews > 0 ? Math.round((cpa / totalViews) * 100) : 0;

  return {
    totalViews,
    views,
    cpa,
    completionRate,
    pageViews,
    sortedPages,
    recentEvents,
  };
}

export async function tryFirestore(renderCallback) {
  if (!db) return false;
  try {
    const q = query(PAGE_VIEWS_COLLECTION, orderBy("createdAt", "desc"), limit(500));
    const snap = await getDocs(q);

    if (!snap.empty) {
      firebaseReady = true;
      const stats = aggregate(snap.docs);
      renderCallback(stats, "firebase");

      // Real-time listener
      if (unsubscribeFirestore) unsubscribeFirestore();
      unsubscribeFirestore = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const stats = aggregate(snap.docs);
          renderCallback(stats, "firebase");
          showBanner("Stats updated (Firestore)", "success", 1500);
        }
      });
      return true;
    }

    // Collection exists but empty
    firebaseReady = true;
    renderCallback({
      totalViews: 0, views: 0, cpa: 0, completionRate: 0,
      pageViews: {}, sortedPages: [], recentEvents: [],
    }, "firebase");
    return true;
  } catch (e) {
    console.warn("Firestore not available:", e.message);
  }
  return false;
}

export async function fetchApiStats(renderCallback) {
  try {
    const res = await fetch("/api/admin/stats", { cache: "no-cache" });
    if (!res.ok) throw new Error("Stats request failed");
    const data = await res.json();
    renderCallback(data, "api");
    return true;
  } catch (err) {
    console.error("Failed to load stats:", err);
    return false;
  }
}

export async function fetchStats(renderCallback) {
  setRefreshing(true);
  let ok = false;
  if (!firebaseReady) {
    ok = await tryFirestore(renderCallback);
  }
  if (!ok) {
    ok = await fetchApiStats(renderCallback);
  }
  if (ok) showBanner("Stats updated", "success", 1500);
  else showBanner("Failed to load stats", "error", 2500);
  setRefreshing(false);
}

export function startAutoRefresh(renderCallback) {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(() => {
    if (!isRefreshing && document.visibilityState === "visible") {
      fetchStats(renderCallback);
    }
  }, REFRESH_MS);
}

export function stopAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
}
