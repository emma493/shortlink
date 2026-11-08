// ==========================================
// Shortlink Admin — App controller
// Cloned from Shortxx Admin UI pattern
// Handles rendering of Dashboard with stat cards,
// views-by-page table, and recent activity list.
// ==========================================

import { renderDashboard } from "./ui.js";
import {
  setElements, setRefreshing, showBanner, setValue,
  startAutoRefresh, stopAutoRefresh, fetchStats,
} from "./data.js";
import { fmt, escapeHtml, PAGE_LABELS } from "./utils.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "pages", label: "Pages", icon: "pages" },
  { id: "activity", label: "Activity", icon: "activity" },
];

let currentPage = "dashboard";

const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
  pages: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 6 1 22 8 22 8 6 15 6 15 22 23 22 23 6"></polyline><path d="M9 22H15a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"></path></svg>`,
  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
};

function buildSidebarNav() {
  const nav = document.getElementById("sidebarNav");
  if (!nav) return;
  nav.innerHTML = NAV_ITEMS.map(item => `
    <a href="#${item.id}" class="nav-link ${item.id === currentPage ? "active" : ""}" data-page="${item.id}">
      ${ICONS[item.icon]}
      <span>${item.label}</span>
    </a>
  `).join("");
}

function buildTopbar() {
  const topbar = document.getElementById("topbar");
  if (!topbar) return;
  topbar.innerHTML = `
    <div class="page-header">
      <h1>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
        Dashboard
        <span id="sourceBadge" class="source-badge firebase"><span class="dot"></span>Firestore</span>
      </h1>
      <p class="page-sub" id="pageSub">Views = visitors who entered the funnel but did not reach the last page · CPA = visitors who completed the journey to the final page.</p>
    </div>
    <div class="live-pill" id="livePill">
      <div class="live-dot"></div>
      <span id="liveText">Live · <span id="rangeLabel">All time</span></span>
    </div>
  `;
}

function buildPageContent() {
  const container = document.getElementById("pageContainer");
  if (!container) return;

  container.innerHTML = `
    <!-- Stat cards -->
    <div class="stats-grid" id="statsGrid"></div>

    <!-- Views by page table -->
    <div class="section" id="pages">
      <div class="section-head">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 6 1 22 8 22 8 6 15 6 15 22 23 22 23 6"></polyline><path d="M9 22H15a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"></path></svg>
          Views by page
        </h2>
        <p class="section-note">Each page load POSTs a view event to <code class="font-mono">/api/track</code>.</p>
      </div>
      <div class="table-wrap">
        <table id="pagesTable">
          <thead>
            <tr>
              <th>Page</th>
              <th>Views</th>
              <th>Share</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <!-- Recent activity -->
    <div class="section" id="activity">
      <div class="section-head">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Recent activity
        </h2>
        <p class="section-note">Latest page-view events captured by the tracker.</p>
      </div>
      <div id="eventsList"></div>
    </div>

    <div class="footer">
      Shortlink Admin &mdash; read-only statistics · Firebase Firestore + Cloudflare KV · No sign-in required &copy; 2026
    </div>
  `;
}

function setActiveNav(pageId) {
  document.querySelectorAll(".nav-link[data-page]").forEach(link => {
    const isActive = link.getAttribute("data-page") === pageId;
    link.classList.toggle("active", isActive);
  });
}

function navigate(pageId) {
  currentPage = pageId;
  buildSidebarNav();
  setActiveNav(pageId);
  buildPageContent();
  renderCurrentData();
}

let latestData = null;
let latestSource = null;

function renderCurrentData() {
  if (!latestData) return;
  const container = document.getElementById("pageContainer");
  if (!container) return;

  if (currentPage === "dashboard") {
    renderDashboard(container, latestData);
  } else if (currentPage === "pages") {
    const tbody = container.querySelector("#pagesTable tbody");
    if (tbody) {
      const pages = latestData.sortedPages || [];
      const total = latestData.totalViews || 0;
      if (pages.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:24px"><h3 style="margin:0 0 6px;font-size:13px">No page views recorded yet.</h3><p style="margin:0;font-size:11px">Start sending traffic to the funnel and stats will appear here.</p></div></td></tr>`;
      } else {
        tbody.innerHTML = pages.map(({ page, views: v }) => {
          const isCpa = page === "/page-5.html";
          const type = isCpa ? "CPA" : "View";
          const typeClass = isCpa ? "cpa" : "view";
          const share = total > 0 ? Math.round((v / total) * 100) : 0;
          const label = PAGE_LABELS[page] || page;
          return `
            <tr>
              <td><span class="page-cell">${escapeHtml(label)}<span class="mono">${escapeHtml(page)}</span></span></td>
              <td class="${typeClass}-cell">${fmt(v)}</td>
              <td class="pct-cell">${share}%</td>
              <td><span class="tag ${typeClass}">${type}</span></td>
            </tr>
          `;
        }).join("");
      }
    }
  } else if (currentPage === "activity") {
    const eventsContainer = container.querySelector("#eventsList");
    if (eventsContainer) {
      const events = latestData.recentEvents || [];
      if (events.length === 0) {
        eventsContainer.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><h3>No recent activity yet</h3><p>Events will appear here as visitors move through the funnel.</p></div>`;
      } else {
        eventsContainer.innerHTML = events.map(ev => {
          const isCpa = ev.page === "/page-5.html";
          const when = ev.timestamp ? new Date(ev.timestamp).toLocaleString([], { hour: "2-digit", minute: "2-digit" }) : "&mdash;";
          const ref = ev.referrer ? escapeHtml(ev.referrer) : "direct";
          return `
            <div class="event ${isCpa ? "page-5" : ""}">
              <div class="event-info">
                <div class="event-page">${isCpa ? "Page 5 (final)" : escapeHtml(ev.page || "/")}</div>
                <span class="event-time">${when}</span>
              </div>
              <div class="event-meta${ref.length > 40 ? "" : " empty"}" title="${ref}">${ref.length > 40 ? ref.slice(0, 40) + "&hellip;" : ref}</div>
              <span class="tag small ${isCpa ? "cpa" : "view"}">${isCpa ? "CPA" : "View"}</span>
            </div>
          `;
        }).join("");
      }
    }
  }
}

function renderCallback(data, source) {
  latestData = data;
  latestSource = source;

  const badge = document.getElementById("sourceBadge");
  const dot = badge ? badge.querySelector(".dot") : null;
  const label = badge ? badge.querySelector("span:last-child") : null;
  if (badge && dot && label) {
    dot.style.background = source === "firebase" ? "#ffca28" : "var(--success)";
    dot.style.boxShadow = source === "firebase" ? "0 0 10px #ffca28" : "0 0 10px var(--success)";
    label.textContent = source === "firebase" ? "Firestore" : "API";
    badge.className = `source-badge ${source === "firebase" ? "firebase" : ""}`;
  }

  const total = data.totalViews || 0;
  const views = data.views != null ? data.views : 0;
  const cpa = data.cpa != null ? data.cpa : 0;
  const rate = total > 0 ? Math.round((cpa / total) * 100) : 0;

  setValue(document.getElementById("statTotal"), fmt(total));
  setValue(document.getElementById("statViews"), fmt(views));
  setValue(document.getElementById("statCpa"), fmt(cpa));
  setValue(document.getElementById("statRate"), rate + "%");

  document.getElementById("statTotalDelta").textContent = (views + cpa === total) ? "" : "(views + CPA)";
  document.getElementById("statViewsDelta").textContent = "pages 1–4";
  document.getElementById("statCpaDelta").textContent = "page 5 → final";
  document.getElementById("statRateDelta").textContent = cpa + " of " + total + " completed";

  renderCurrentData();
  showBanner("Stats updated", "success", 1500);
}

function initApp() {
  buildSidebarNav();
  setActiveNav("dashboard");
  buildTopbar();
  buildPageContent();

  const els = {
    total: document.getElementById("statTotal"),
    totalDelta: document.getElementById("statTotalDelta"),
    views: document.getElementById("statViews"),
    viewsDelta: document.getElementById("statViewsDelta"),
    cpa: document.getElementById("statCpa"),
    cpaDelta: document.getElementById("statCpaDelta"),
    rate: document.getElementById("statRate"),
    rateDelta: document.getElementById("statRateDelta"),
    pagesBody: document.querySelector("#pagesTable tbody"),
    eventsContainer: document.getElementById("eventsList"),
    rangeLabel: document.getElementById("rangeLabel"),
    sourceBadge: document.getElementById("sourceBadge"),
    refreshBanner: document.getElementById("refreshBanner"),
    refreshText: document.getElementById("refreshText"),
    liveText: document.getElementById("liveText"),
    pageSub: document.getElementById("pageSub"),
  };
  setElements(els);

  document.getElementById("sidebarNav").addEventListener("click", (e) => {
    const link = e.target.closest(".nav-link[data-page]");
    if (link) {
      e.preventDefault();
      navigate(link.getAttribute("data-page"));
    }
  });

  document.getElementById("btnToggleSidebar").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("collapsed");
  });

  fetchStats(renderCallback);
  startAutoRefresh(renderCallback);

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") startAutoRefresh(renderCallback);
    else stopAutoRefresh();
  });
}

initApp();
