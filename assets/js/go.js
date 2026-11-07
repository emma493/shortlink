/* ==========================================
   Shortlink — Intermediate (go) page logic
   ========================================== */

(function () {
  const timerEl = document.getElementById("timer");
  const progressEl = document.getElementById("progress-bar");
  const continueBtn = document.getElementById("continue-btn");

  if (!timerEl) return;

  // Destination URL — read from query param (passed by the redirect service)
  const params = new URLSearchParams(window.location.search);
  const destination = params.get("dest");

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

  // Continue button
  if (continueBtn && destination) {
    continueBtn.addEventListener("click", function () {
      window.location.href = destination;
    });
  }

  // Fallback: if someone arrives directly without a dest, go home
  if (!destination) {
    setTimeout(() => {
      window.location.href = "index.html";
    }, 3000);
  }
})();
