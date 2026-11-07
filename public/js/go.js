/* ==========================================
   Shortlink — Intermediate (go) page logic (Worker API)
   Reads destination via /api/link/:code,
   runs 5-second countdown, then redirects.
   Tracks page view and the final click.
   ========================================== */

(function () {
  const timerEl = document.getElementById("timer");
  const progressEl = document.getElementById("progress-bar");
  const continueBtn = document.getElementById("continue-btn");
  const destTextEl = document.getElementById("dest-text");

  if (!timerEl) return;

  // Read code from query param
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  let destination = null;

  // Countdown duration in seconds
  const TOTAL = 5;
  let remaining = TOTAL;

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

  function updateTimer() {
    timerEl.textContent = remaining;
    const pct = (remaining / TOTAL) * 100;
    if (progressEl) progressEl.style.width = pct + "%";

    if (remaining <= 0) {
      clearInterval(timer);
      timerEl.textContent = "0";
      if (continueBtn) {
        continueBtn.disabled = false;
        continueBtn.textContent = "Continue to destination";
        continueBtn.classList.add("btn-primary");
        continueBtn.classList.remove("btn-outline");
      }
      return;
    }
    remaining--;
  }

  const timer = setInterval(updateTimer, 1000);
  updateTimer(); // immediate first call

  // Track page view on load
  track("page_view", { code });

  // Fetch destination from Worker API (click is already tracked server-side on /r/:code)
  if (code) {
    fetch("/api/link/" + encodeURIComponent(code))
      .then((r) => r.json())
      .then((data) => {
        destination = data.longUrl;
        if (destTextEl && data.longUrl) {
          const display = data.longUrl.length > 60
            ? data.longUrl.slice(0, 60) + "&hellip;"
            : data.longUrl;
          destTextEl.textContent = "Redirecting to " + display + " in a few seconds.";
        }
      })
      .catch(() => {
        // Silent fail
      });
  }

  // Continue button -> go to destination
  if (continueBtn && destination) {
    continueBtn.addEventListener("click", async function () {
      clearInterval(timer);
      // Track the explicit continue click
      await track("link_clicked", { code });
      window.location.href = destination;
    });
  }

  // Fallback: if someone arrives directly without a valid code, go home
  if (!code) {
    setTimeout(() => {
      window.location.href = "index.html";
    }, 3000);
  }
})();
