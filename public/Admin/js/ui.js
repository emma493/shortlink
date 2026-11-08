// ==========================================
// Shortlink Admin — UI helpers
// Cloned from Shortxx Admin UI pattern
// ==========================================

import { fmt, escapeHtml, PAGE_LABELS } from "./utils.js";

const ICONS = {
  total: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
  cpa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/><polyline points="1 14 1 18 7 18"/><polyline points="16 14 16 18 23 18"/></svg>`,
  rate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><polyline points="12 2 12 22"/><polyline points="2 12 22 12"/></svg>`,
};

// Render stat cards
export function renderStatCards(container, data) {
  const total = data.totalViews || 0;
  const views = data.views != null ? data.views : 0;
  const cpa = data.cpa != null ? data.cpa : 0;
  const rate = total > 0 ? Math.round((cpa / total) * 100) : 0;

  const cards = [
    {
      id: "statTotal",
      kind: "total",
      label: "Total page views",
      value: fmt(total),
      delta: (views + cpa === total) ? "" : "(views + CPA)",
    },
    {
      id: "statViews",
      kind: "",
      label: "Views (pages 1–4)",
      value: fmt(views),
      delta: "pages 1–4",
    },
    {
      id: "statCpa",
      kind: "cpa",
      label: "CPA (page 5 → final)",
      value: fmt(cpa),
      delta: "page 5 → final",
    },
    {
      id: "statRate",
      kind: "rate",
      label: "Completion rate",
      value: rate + "%",
      delta: cpa + " of " + total + " completed",
    },
  ];

  container.innerHTML = cards.map(card => `
    <div class="stat-card ${card.kind}">
      <div class="stat-head">
        <div class="stat-icon ${card.kind}">
          ${ICONS[card.kind] || ICONS.default}
        </div>
        <span class="stat-label">${card.label}</span>
      </div>
      <div class="stat-value" id="${card.id}">${card.value}</div>
      <div class="stat-row"><div class="dot"></div><span class="label">${card.delta}</span></div>
    </div>
  `).join("");
}

// Render views-by-page table
export function renderPagesTable(tableEl, data) {
  const pages = data.sortedPages || [];
  const total = data.totalViews || 0;
  const tbody = tableEl.querySelector("tbody");

  if (pages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:24px"><h3 style="margin:0 0 6px;font-size:13px">No page views recorded yet.</h3><p style="margin:0;font-size:11px">Start sending traffic to the funnel and stats will appear here.</p></div></td></tr>`;
    return;
  }

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

// Render recent events list
export function renderEvents(container, data) {
  const events = data.recentEvents || [];
  if (events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <h3>No recent activity yet</h3>
        <p>Events will appear here as visitors move through the funnel.</p>
      </div>`;
    return;
  }

  container.innerHTML = events.map(ev => {
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

// Render full dashboard
export function renderDashboard(container, data) {
  const statsGrid = container.querySelector("#statsGrid");
  if (statsGrid) renderStatCards(statsGrid, data);

  const pagesTable = container.querySelector("#pagesTable");
  if (pagesTable) renderPagesTable(pagesTable, data);

  const eventsContainer = container.querySelector("#eventsList");
  if (eventsContainer) renderEvents(eventsContainer, data);
}
