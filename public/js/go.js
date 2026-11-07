/* ==========================================
   Shortlink — Intermediate (go) page logic (Worker API)
   GET /api/link/:code → destination URL
   Countdown → redirect to destination
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

  // Fetch destination from Worker API
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
    continueBtn.addEventListener("click", function () {
      clearInterval(timer);
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
