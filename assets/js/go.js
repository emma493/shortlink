/* ==========================================
   Shortlink — Intermediate (go) page logic (static)
   Reads destination from localStorage via the code,
   runs a 5-second countdown, then redirects.
   ========================================== */

(function () {
  const timerEl = document.getElementById("timer");
  const progressEl = document.getElementById("progress-bar");
  const continueBtn = document.getElementById("continue-btn");

  if (!timerEl) return;

  // Read code from query param
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  // Look up destination in localStorage
  let destination = null;
  if (code) {
    destination = localStorage.getItem("sl:" + code);
  }

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

  // Continue button -> go to destination
  if (continueBtn && destination) {
    continueBtn.addEventListener("click", function () {
      clearInterval(timer);
      window.location.href = destination;
    });
  }

  // Auto-redirect after countdown (optional — requires click first for UX)
  // If no code/destination found, send home
  if (!destination) {
    setTimeout(() => {
      window.location.href = "index.html";
    }, 3000);
  }
})();
