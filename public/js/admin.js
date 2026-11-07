/* ==========================================
   Shortlink — Admin dashboard (read-only)
   Fetches visitor statistics from /api/admin/stats
   ========================================== */

(function () {
  const totalViewsEl = document.getElementById("stat-total-views");
  const totalPagesEl = document.getElementById("stat-total-pages");
  const topPageEl = document.getElementById("stat-top-page");
  const pagesTableBody = document.getElementById("pages-table-body");
  const eventsTableBody = document.getElementById("events-table-body");
  const emptyEl = document.getElementById("admin-empty");
  const refreshBtn = document.getElementById("refresh-btn");

  if (!totalViewsEl) return;

  function showToast(message, type = "info") {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = "toast show";
    if (type === "error") toast.style.background = "#dc2626";
    else toast.style.background = "#0f172a";
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  async function load() {
    try {
      const res = await fetch("/api/admin/stats");
      const stats = await res.json();

      // Stat cards
      totalViewsEl.textContent = stats.totalViews || 0;
      totalPagesEl.textContent = stats.sortedPages
        ? stats.sortedPages.length
        : 0;

      if (stats.sortedPages && stats.sortedPages.length > 0) {
        topPageEl.textContent = stats.sortedPages[0].page;
      } else {
        topPageEl.textContent = "—";
      }

      // Pages table
      pagesTableBody.innerHTML = "";

      if (!stats.sortedPages || stats.sortedPages.length === 0) {
        emptyEl.style.display = "block";
        pagesTableBody.parentElement.parentElement.style.display = "none";
      } else {
        emptyEl.style.display = "none";
        pagesTableBody.parentElement.parentElement.style.display = "";

        for (const entry of stats.sortedPages) {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td class="page-cell">${escapeHtml(entry.page)}</td>
            <td class="views-cell">${entry.views}</td>
            <td>—</td>
          `;
          pagesTableBody.appendChild(row);
        }
      }

      // Recent events table
      eventsTableBody.innerHTML = "";
      const recent = stats.recentEvents || [];

      if (!recent || recent.length === 0) {
        eventsTableBody.innerHTML = `
          <tr><td colspan="2" style="text-align:center; color:#94a3b8; padding:2rem;">No activity yet</td></tr>
        `;
      } else {
        for (const event of recent) {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td class="page-cell">${escapeHtml(event.page)}</td>
            <td class="time-cell">${formatTime(event.timestamp)}</td>
          `;
          eventsTableBody.appendChild(row);
        }
      }
    } catch (err) {
      showToast("Failed to load visitor statistics", "error");
    }
  }

  refreshBtn.addEventListener("click", load);

  // Initial load
  load();
})();
