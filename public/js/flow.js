/* ==========================================
   Shortlink — Blog step flow (page-2 … page-5)
   - reading progress bar + falling petals
   - countdown that starts when the page loads
   - Continue is ALWAYS tappable. If the ad tasks are not done,
     tapping it starts the guided ad tutorial (task-tracker.js).
   - Once the tasks are done AND the countdown is over, Continue
     takes the reader on.
   - navigation target comes from <body data-next="page-3.html">
   - last page: <body data-final="true" data-destination="/final/">
   ========================================== */

(function () {
  "use strict";

  var body = document.body;
  var next = body.getAttribute("data-next");
  var isFinal = body.getAttribute("data-final") === "true";
  var destination = body.getAttribute("data-destination") || "/final/";
  var wait = parseInt(body.getAttribute("data-wait"), 10);
  if (isNaN(wait)) wait = 10;

  var btn = document.getElementById("continue-btn");
  var card = document.getElementById("continue-card");
  var ring = document.getElementById("ring");
  var ringFill = ring ? ring.querySelector(".fill") : null;
  var ringNum = ring ? ring.querySelector(".num") : null;
  var status = document.getElementById("status");
  var dock = document.getElementById("dock");
  var dockTick = document.getElementById("dock-tick");
  var dockText = document.getElementById("dock-text");
  var jump = document.getElementById("dock-jump");
  var progress = document.getElementById("read-progress");

  var remaining = wait;
  var timerDone = wait === 0;
  var reachedCard = false;
  var CIRC = 264;
  var SMARTLINK = "https://apiguinee.org/4/cdc7ccdb7e07b0602f45710eddb87837";

  function tasks() { return window.shortlinkTasks; }
  function tasksDone() { var t = tasks(); return !t || t.isComplete(); }

  /* ---- petals ---- */
  (function petals() {
    var host = document.getElementById("petals");
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var count = window.innerWidth < 600 ? 9 : 16;
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      p.className = "petal";
      p.style.left = Math.random() * 100 + "%";
      p.style.setProperty("--drift", (Math.random() * 160 - 80) + "px");
      p.style.animationDuration = 9 + Math.random() * 9 + "s";
      p.style.animationDelay = -Math.random() * 14 + "s";
      p.style.transform = "scale(" + (0.7 + Math.random() * 0.8) + ")";
      host.appendChild(p);
    }
  })();

  /* ---- reading progress ---- */
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (progress && max > 0) progress.style.width = Math.min(100, (h.scrollTop / max) * 100) + "%";
    if (card && !reachedCard) {
      var r = card.getBoundingClientRect();
      if (r.top < window.innerHeight - 80) {
        reachedCard = true;
        refresh();
      }
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ---- countdown ---- */
  function paintRing() {
    if (!ringFill) return;
    var done = wait === 0 ? 1 : (wait - remaining) / wait;
    ringFill.style.strokeDashoffset = String(CIRC - CIRC * done);
    if (ringNum) ringNum.textContent = timerDone ? "♥" : String(remaining);
    if (ring) ring.classList.toggle("done", timerDone);
  }

  function refresh() {
    paintRing();
    var ready = timerDone && tasksDone();

    if (dock) {
      dock.classList.toggle("hide", reachedCard);
      if (dockTick) dockTick.textContent = timerDone ? "♥" : remaining + "s";
      if (dockText) {
        dockText.textContent = timerDone
          ? "Ready — scroll down and tap Continue"
          : "Keep reading — " + (isFinal ? "your link" : "next page") + " unlocks in " + remaining + "s";
      }
    }

    if (btn) {
      btn.classList.toggle("ready", ready);
      btn.textContent = isFinal ? "Take me to my link" : "Continue to the next page";
    }

    if (status) {
      if (ready) status.textContent = "";
      else if (tasksDone() && !timerDone) status.textContent = "Tasks done — Continue unlocks in " + remaining + " second" + (remaining === 1 ? "" : "s") + ".";
      else if (!timerDone && reachedCard) status.textContent = "Almost there — " + remaining + " second" + (remaining === 1 ? "" : "s") + " to go.";
      else status.textContent = "";
    }

    window.dispatchEvent(new CustomEvent("shortlink:state", { detail: { remaining: remaining, timerDone: timerDone } }));
  }

  if (wait > 0) {
    var t = setInterval(function () {
      if (document.hidden) return;
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        timerDone = true;
        clearInterval(t);
      }
      refresh();
    }, 1000);
  }

  /* ---- Continue button ---- */
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      // 1) ad tasks first: this is when the tutorial appears
      if (!tasksDone()) {
        if (tasks()) tasks().start();
        return;
      }

      // 2) tasks done, countdown still running
      if (!timerDone) {
        if (status) status.textContent = "Almost there — " + remaining + " second" + (remaining === 1 ? "" : "s") + " to go.";
        btn.classList.remove("nudge"); void btn.offsetWidth; btn.classList.add("nudge");
        return;
      }

      // 3) all good: move on (behaviour unchanged)
      window.dispatchEvent(new CustomEvent("shortlink:proceed"));
      if (isFinal) {
        try {
          Object.keys(localStorage).forEach(function (k) { if (k.indexOf("sl2:") === 0) localStorage.removeItem(k); });
        } catch (err) {}
      }
      window.open(isFinal ? destination : next, "_blank");
      window.location.href = SMARTLINK;
    });
  }

  if (jump && card) {
    jump.addEventListener("click", function () {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  window.addEventListener("shortlink:task-done", refresh);

  refresh();
  onScroll();
})();
