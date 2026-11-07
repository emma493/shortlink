/* ==========================================
   Shortlink — Home page logic (Worker API)
   User pastes URL → POST /api/shorten → track → result.html
   Also tracks page views via POST /api/track
   ========================================== */

(function () {
  const form = document.getElementById("shorten-form");
  const input = document.getElementById("url-input");
  const btn = document.getElementById("shorten-btn");

  if (!form) return;

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

  // Send a tracking event to the Worker (fire-and-forget)
  async function track(type, extra = {}) {
    try {
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          path: window.location.pathname,
          ...extra,
        }),
      });
    } catch (e) {
      // Tracking failures should never break the UI
    }
  }

  // Validate URL
  function isValidUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  // Track page view on load
  track("page_view");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const raw = input.value.trim();

    if (!raw) {
      input.focus();
      return;
    }

    if (!isValidUrl(raw)) {
      showToast("Please enter a valid URL (http:// or https://)", "error");
      input.focus();
      return;
    }

    // Loading state
    const originalText = btn.textContent;
    btn.textContent = "Shortening…";
    btn.disabled = true;

    try {
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to shorten link", "error");
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      // Track the shorten action
      await track("link_created", { code: data.code, shortUrl: data.shortUrl });

      // Navigate to result page with the real short link from the Worker
      const resultUrl =
        "result.html?code=" +
        encodeURIComponent(data.code) +
        "&url=" +
        encodeURIComponent(data.shortUrl);
      window.location.href = resultUrl;
    } catch (err) {
      showToast("Could not reach the server. Is the Worker deployed?", "error");
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  // Auto-prepend https:// if missing on blur
  input.addEventListener("blur", function () {
    const val = this.value.trim();
    if (val && !/^https?:\/\//i.test(val)) {
      this.value = "https://" + val;
    }
  });
})();
