/* ==========================================
   Shortlink — Result page logic (Worker API)
   Shows short link + copy button.
   Tracks page view on load.
   ========================================== */

(function () {
  const linkInput = document.getElementById("short-link");
  const copyBtn = document.getElementById("copy-btn");
  const newBtn = document.getElementById("new-shorten-btn");
  const clicksEl = document.getElementById("stat-clicks");

  if (!linkInput) return;

  // Show a toast notification
  function showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  }

  // Send a tracking event (fire-and-forget)
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

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const shortUrl = params.get("url");

  linkInput.value = shortUrl || window.location.origin + "/r/" + code;

  // Track page view on load
  track("page_view", { code });

  // Fetch real stats from the Worker API
  if (code) {
    fetch("/api/link/" + encodeURIComponent(code))
      .then((r) => r.json())
      .then((data) => {
        if (data.clicks !== undefined && clicksEl) {
          clicksEl.textContent = data.clicks;
        }
      })
      .catch(() => {
        // Silently fail — stats are optional
      });
  }

  copyBtn.addEventListener("click", function () {
    const text = linkInput.value;
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);

    try {
      navigator.clipboard.writeText(text).then(function () {
        const original = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("btn-outline");
        copyBtn.classList.remove("btn-primary");

        showToast("Short link copied to clipboard");

        setTimeout(() => {
          copyBtn.textContent = original;
          copyBtn.classList.remove("btn-outline");
          copyBtn.classList.add("btn-primary");
        }, 1500);
      });
    } catch (err) {
      document.execCommand("copy");
      showToast("Short link copied to clipboard");
    }
  });

  newBtn.addEventListener("click", function () {
    window.location.href = "index.html";
  });
})();
