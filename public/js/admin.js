/* ==========================================
   Shortlink — Admin dashboard logic (Worker API)
   READ-ONLY analytics — admin does NOT create links.
   GET  /api/admin/stats   → aggregate numbers
   GET  /api/admin/links   → full link list
   DELETE /api/admin/link/:code → delete a link
   ========================================== */

(function () {
  const totalLinksEl = document.getElementById("stat-total-links");
  const totalClicksEl = document.getElementById("stat-total-clicks");
  const topLinkEl = document.getElementById("stat-top-link");
  const tableBody = document.getElementById("links-table-body");
  const emptyEl = document.getElementById("admin-empty");
  const refreshBtn = document.getElementById("refresh-btn");

  if (!totalLinksEl) return;

  // Show a toast notification
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

  // Escape HTML for safe display
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Format date for display
  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  // Load stats + links (read-only)
  async function load() {
    try {
      const res = await fetch("/api/admin/stats");
      const stats = await res.json();

      // Update stat cards
      totalLinksEl.textContent = stats.totalLinks || 0;
      totalClicksEl.textContent = stats.totalClicks || 0;

      // Top link by clicks
      if (stats.links && stats.links.length > 0) {
        const top = stats.links.reduce(
          (a, b) => (b.clicks || 0) > (a.clicks || 0) ? b : a
        );
        topLinkEl.textContent = top.code || "—";
      } else {
        topLinkEl.textContent = "—";
      }

      // Render table
      tableBody.innerHTML = "";

      if (!stats.links || stats.links.length === 0) {
        emptyEl.style.display = "block";
        tableBody.parentElement.parentElement.style.display = "none";
        return;
      }

      emptyEl.style.display = "none";
      tableBody.parentElement.parentElement.style.display = "";

      for (const link of stats.links) {
        const row = document.createElement("tr");

        const shortUrl = window.location.origin + "/r/" + escapeHtml(link.code);
        const created = formatDate(link.createdAt);
        const clicks = link.clicks || 0;

        row.innerHTML = `
          <td>
            <span class="code-cell">${escapeHtml(link.code)}</span>
          </td>
          <td>
            <span class="long-url" title="${escapeHtml(link.longUrl)}">${escapeHtml(link.longUrl)}</span>
          </td>
          <td class="clicks-cell">${clicks}</td>
          <td>${created}</td>
          <td>
            <a href="${shortUrl}" target="_blank" class="btn btn-outline btn-sm" style="padding:0.4rem 0.75rem; font-size:0.75rem;">Open</a>
            <button type="button" class="btn btn-danger btn-sm" data-code="${escapeHtml(link.code)}" style="padding:0.4rem 0.75rem; font-size:0.75rem;">Delete</button>
          </td>
        `;

        tableBody.appendChild(row);
      }

      // Wire up delete buttons (admin-only action)
      tableBody.querySelectorAll("button[data-code]").forEach((btn) => {
        btn.addEventListener("click", async function () {
          const code = this.getAttribute("data-code");
          if (!confirm("Delete short link " + code + "?")) return;

          try {
            const delRes = await fetch("/api/admin/link/" + encodeURIComponent(code), {
              method: "DELETE",
            });
            if (delRes.ok) {
              showToast("Link deleted");
              load(); // reload
            } else {
              showToast("Failed to delete link", "error");
            }
          } catch (err) {
            showToast("Error deleting link", "error");
          }
        });
      });
    } catch (err) {
      showToast("Failed to load admin data", "error");
    }
  }

  refreshBtn.addEventListener("click", load);

  // Initial load
  load();
})();
