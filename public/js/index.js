/* ==========================================
   Shortlink — Page 1 (index.html)
   "Click here to continue" → navigate to page-2.html
   (navigation logic unchanged; a short countdown
    now gates the button so the page can be enjoyed)
   ========================================== */

(function () {
  // new visit: forget any ad-task progress from a previous run
  try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("sl2:") === 0) localStorage.removeItem(k); }); } catch (e) {}

  const btn = document.getElementById("continue-btn");

  if (!btn) return;

  const WAIT = 5; // seconds before the button unlocks
  const label = btn.textContent.trim();
  const ring = document.getElementById("ring");
  const fill = ring ? ring.querySelector(".fill") : null;
  const num = ring ? ring.querySelector(".num") : null;
  let left = WAIT;
  let ready = false;

  function paint() {
    if (fill) fill.style.strokeDashoffset = String(264 - 264 * ((WAIT - left) / WAIT));
    if (num) num.textContent = ready ? "\u2665" : String(left);
    if (ring) ring.classList.toggle("done", ready);
  }

  btn.setAttribute("disabled", "disabled");
  btn.classList.add("locked");
  btn.textContent = "Preparing your journey\u2026";
  paint();

  const timer = setInterval(function () {
    if (document.hidden) return;
    left -= 1;
    if (left <= 0) {
      left = 0;
      ready = true;
      clearInterval(timer);
      btn.removeAttribute("disabled");
      btn.classList.remove("locked");
      btn.classList.add("ready");
      btn.textContent = label;
    }
    paint();
  }, 1000);

  btn.addEventListener("click", function () {
    if (!ready) return;
    window.location.href = "page-2.html";
  });

  // petals
  const host = document.getElementById("petals");
  if (host && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const count = window.innerWidth < 600 ? 9 : 16;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "petal";
      p.style.left = Math.random() * 100 + "%";
      p.style.setProperty("--drift", Math.random() * 160 - 80 + "px");
      p.style.animationDuration = 9 + Math.random() * 9 + "s";
      p.style.animationDelay = -Math.random() * 14 + "s";
      host.appendChild(p);
    }
  }
})();
