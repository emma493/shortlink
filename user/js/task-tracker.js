/* ==========================================================
   Shortlink — Ad Task Engine v2
   ----------------------------------------------------------
   Pages 2-5: the visitor must really click 2 randomly chosen
   ads (1 click each) before Continue works.

   Nothing is shown while the visitor is reading. The guided
   tutorial only starts when they tap "Continue":
     toast -> "Show me" -> scroll + glowing ad + emoji finger
     -> Pro Tip -> click ad -> come back -> next ad -> done.

   How a click is verified (no overlays, no fake buttons):
     1. the click must land on a real ad (iframe focus / trusted
        click inside the ad), on the CURRENTLY highlighted ad,
        while that ad is on screen;
     2. the visitor must then actually leave the page (tab hidden
        or window unfocused) for at least data-ad-away seconds;
     3. only when they come back is the ad counted - once.
   Progress is saved in localStorage, signed, and expires.
   ========================================================== */

(function () {
  "use strict";

  var body = document.body;
  var PAGE = body.getAttribute("data-page") || (location.pathname.split("/").pop() || "x").replace(/\.html$/, "");

  function intAttr(name, def) {
    var v = parseInt(body.getAttribute(name), 10);
    return isNaN(v) ? def : v;
  }

  /* ---------------- settings (override on <body>) ---------------- */
  var CFG = {
    tasks: intAttr("data-ad-tasks", 2),                 // ads to click per page
    minAwayMs: intAttr("data-ad-away", 5) * 1000,       // seconds to stay away after clicking
    graceMs: 4500,                                      // click must open something within this time
    ttlMs: 45 * 60 * 1000,                              // saved progress expires
    waitAdsMs: 7000,                                    // how long to wait for ads to load
    onNoAds: body.getAttribute("data-ad-fail") || "strict" // "strict" = block, "waive" = let through
  };
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COARSE = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  /* ---------------- tiny helpers ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function all(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }
  function now() { return Date.now(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function randInt(n) {
    try {
      var a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] % n;
    } catch (e) { return Math.floor(Math.random() * n); }
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = randInt(i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function cyrb53(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  /* ---------------- saved state (signed, expiring) ---------------- */
  var KEY = "sl2:tasks:" + PAGE;
  var SALT = "sl2|romance|" + PAGE + "|k7q";
  var memoryStore = null;

  function sign(s) { return cyrb53(JSON.stringify([s.v, s.page, s.t, s.picks, s.done, s.waived, s.pend]) + SALT); }
  function fresh() { return { v: 2, page: PAGE, t: now(), picks: [], done: [], waived: false, pend: null, s: "" }; }
  function readRaw() {
    try { return localStorage.getItem(KEY); } catch (e) { return memoryStore; }
  }
  function writeRaw(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { memoryStore = v; }
  }
  function load() {
    var raw = readRaw();
    if (!raw) return fresh();
    try {
      var s = JSON.parse(raw);
      if (!s || s.v !== 2 || s.page !== PAGE) return fresh();
      if (s.s !== sign(s)) return fresh();          // edited by hand -> reset
      if (now() - s.t > CFG.ttlMs) return fresh();  // too old -> reset
      return s;
    } catch (e) { return fresh(); }
  }
  var state = load();
  function save() { state.s = sign(state); writeRaw(JSON.stringify(state)); }

  /* ---------------- ads already clicked on ANY page (shared, signed) ----------------
     Every ad may be clicked only once for the whole journey (pages 2-5).
     index.html / the final page wipe every "sl2:" key, so a new visit starts clean. */
  var USED_KEY = "sl2:used";
  var USED_SALT = "sl2|used|romance|k7q";
  var USED_TTL = 3 * 60 * 60 * 1000;
  var memoryUsed = null;
  function usedSig(u) { return cyrb53(JSON.stringify([u.t, u.ids]) + USED_SALT); }
  function freshUsed() { return { t: now(), ids: [], s: "" }; }
  function loadUsed() {
    var raw;
    try { raw = localStorage.getItem(USED_KEY); } catch (e) { raw = memoryUsed; }
    if (!raw) return freshUsed();
    try {
      var u = JSON.parse(raw);
      if (!u || !Array.isArray(u.ids) || u.s !== usedSig(u)) return freshUsed();
      if (now() - u.t > USED_TTL) return freshUsed();
      return u;
    } catch (e) { return freshUsed(); }
  }
  function usedIds() { return loadUsed().ids; }
  function markUsed(id) {
    var u = loadUsed();
    if (u.ids.indexOf(id) < 0) u.ids.push(id);
    u.s = usedSig(u);
    var raw = JSON.stringify(u);
    try { localStorage.setItem(USED_KEY, raw); } catch (e) { memoryUsed = raw; }
  }

  /* ---------------- ad units ---------------- */
  var SOCIAL_ID = "social-bar";
  function units() { return all('.ad-slot[data-ad]'); }
  function unitById(id) { return $('.ad-slot[data-ad="' + id + '"]'); }
  function unitLabel(id) { var u = unitById(id); return u ? (u.getAttribute("data-ad-label") || id) : id; }
  function unitOf(node) { return node && node.closest ? node.closest('.ad-slot[data-ad]') : null; }
  function isSocial(unit) { return !!unit && unit.getAttribute("data-ad") === SOCIAL_ID; }
  function bigEnough(n) {
    var r = n.getBoundingClientRect();
    return r.width >= 30 && r.height >= 20;
  }

  /* The Social Bar script draws its bar OUTSIDE the page layout (a fixed element
     added to <body>), so it is located by looking for it:
       1. data-social-selector on <body> (optional manual override)
       2. anything visible inside the Social Bar slot
       3. a visible position:fixed element on <body> that is not ours / the site's */
  var SKIP_TAGS = /^(SCRIPT|STYLE|LINK|NOSCRIPT|META|HEADER|MAIN|FOOTER)$/;
  var SKIP_NAMES = /slt-|dock|read-progress|petal|site-header|journey|toast/i;
  var socialCache = { at: 0, node: null };
  function socialNode() {            // cached + fail-safe: can never throw or slow the page down
    var t = now();
    if (t - socialCache.at < 400 && (!socialCache.node || document.contains(socialCache.node))) return socialCache.node;
    var n = null;
    try { n = findSocialNode(); } catch (e) { n = null; }
    socialCache.at = t; socialCache.node = n;
    return n;
  }
  function looksLikeOverlay(n) {     // full-screen click layers from other scripts are NOT the social bar
    var r = n.getBoundingClientRect();
    return r.width * r.height > 0.35 * window.innerWidth * window.innerHeight;
  }
  function findSocialNode() {
    var sel = body.getAttribute("data-social-selector");
    if (sel) { try { var s = $(sel); if (s && bigEnough(s)) return s; } catch (e) {} }
    var slot = unitById(SOCIAL_ID);
    if (slot) {
      var inner = all("iframe, div, a, img, ins", slot);
      for (var i = 0; i < inner.length; i++) if (bigEnough(inner[i]) && !looksLikeOverlay(inner[i])) return inner[i];
    }
    var kids = all("body > *").concat([].slice.call(document.documentElement.children));
    for (var k = 0; k < kids.length; k++) {
      var n = kids[k];
      if (n.nodeType !== 1 || n === document.body || SKIP_TAGS.test(n.tagName)) continue;
      if (n.closest && n.closest(".ad-slot")) continue;
      if (SKIP_NAMES.test((n.className && n.className.baseVal != null ? n.className.baseVal : n.className) + " " + (n.id || ""))) continue;
      var cs = getComputedStyle(n);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden" || cs.pointerEvents === "none" || cs.opacity === "0") continue;
      if (bigEnough(n) && !looksLikeOverlay(n)) return n;
    }
    return null;
  }
  function isFixedNode(n) {
    for (; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
      if (getComputedStyle(n).position === "fixed") return true;
    }
    return false;
  }

  function adNode(unit) {
    if (isSocial(unit)) return socialNode() || unit;
    return unit.querySelector("iframe") || unit.querySelector('[id^="container-"]') || unit;
  }
  function isLoaded(unit) {
    if (isSocial(unit)) return !!socialNode();
    var n = unit.querySelector('iframe, ins, [id^="container-"] > *, a, img');
    if (!n) return false;
    return bigEnough(n);
  }
  function loadedIds() { return units().filter(isLoaded).map(function (u) { return u.getAttribute("data-ad"); }); }

  function remaining() { return state.picks.filter(function (id) { return state.done.indexOf(id) < 0; }); }
  function isComplete() { return state.waived || (state.picks.length > 0 && remaining().length === 0); }
  function need() { return state.picks.length || CFG.tasks; }

  /* wait for ads, then pick (or repair) the random set */
  function resolvePicks() {
    return new Promise(function (resolve) {
      var t0 = now();
      (function poll() {
        var ids = loadedIds();
        var used = usedIds();
        var fresh = ids.filter(function (id) { return used.indexOf(id) < 0 || state.picks.indexOf(id) > -1; });
        if (fresh.length >= CFG.tasks || now() - t0 > CFG.waitAdsMs) return finish(ids, used);
        setTimeout(poll, 300);
      })();
      function finish(ids, used) {
        var keep = state.picks.filter(function (id) { return state.done.indexOf(id) > -1 || ids.indexOf(id) > -1; });
        /* only ads that were never clicked on an earlier page */
        var pool = shuffle(ids.filter(function (id) { return keep.indexOf(id) < 0 && used.indexOf(id) < 0; }));
        while (keep.length < CFG.tasks && pool.length) keep.push(pool.pop());
        /* last resort (some ads did not load): reuse an ad so the visitor is never stuck */
        if (keep.length < CFG.tasks) {
          var spare = shuffle(ids.filter(function (id) { return keep.indexOf(id) < 0; }));
          while (keep.length < CFG.tasks && spare.length) keep.push(spare.pop());
        }
        state.picks = keep;
        if (!keep.length && CFG.onNoAds === "waive") state.waived = true;
        save();
        resolve(keep.length > 0 || state.waived);
      }
    });
  }

  /* ==========================================================
     UI
     ========================================================== */
  var ui = null;
  function buildUI() {
    if (ui) return ui;
    ui = {};
    ui.toast = el("div", "slt-toast");
    ui.toast.setAttribute("role", "status");
    ui.spot = el("div", "slt-spot", '<span class="slt-tag">Your ad</span>');
    ui.finger = el("div", "slt-finger", '<span class="slt-ripple"></span><span class="slt-hand">👆</span>');
    ui.hand = ui.finger.querySelector(".slt-hand");
    ui.tip = el("div", "slt-tip");
    ui.tip.setAttribute("role", "status");
    ui.tip.setAttribute("aria-live", "polite");
    ui.tip.innerHTML =
      '<div class="slt-tip-head">' +
        '<span class="slt-badge">💡 Pro Tip</span>' +
        '<span class="slt-dots" id="slt-tip-dots"></span>' +
        '<button type="button" class="slt-x" aria-label="Close tip">×</button>' +
      '</div>' +
      '<p class="slt-tip-text" id="slt-tip-text"></p>' +
      '<div class="slt-bar"><i id="slt-bar"></i></div>' +
      '<div class="slt-status" id="slt-status"></div>' +
      '<div class="slt-acts" id="slt-acts"></div>';
    document.body.appendChild(ui.spot);
    document.body.appendChild(ui.finger);
    document.body.appendChild(ui.toast);
    document.body.appendChild(ui.tip);
    ui.text = $("#slt-tip-text", ui.tip);
    ui.status = $("#slt-status", ui.tip);
    ui.acts = $("#slt-acts", ui.tip);
    ui.bar = $("#slt-bar", ui.tip);
    ui.tipDots = $("#slt-tip-dots", ui.tip);
    $(".slt-x", ui.tip).addEventListener("click", dismiss);
    return ui;
  }

  function dotsHTML() {
    var n = need(), d = state.done.length, h = "";
    for (var i = 0; i < n; i++) h += '<i class="' + (i < d ? "on" : "") + '"></i>';
    return h + "<em>" + Math.min(d, n) + "/" + n + "</em>";
  }
  function refreshProgress() {
    if (!ui) return;
    ui.tipDots.innerHTML = dotsHTML();
    ui.bar.style.width = (need() ? Math.round((Math.min(state.done.length, need()) / need()) * 100) : 0) + "%";
    var td = $(".slt-dots", ui.toast);
    if (td) td.innerHTML = dotsHTML();
  }
  function setStatus(kind, html) {
    ui.status.className = "slt-status " + (kind || "");
    ui.status.innerHTML = '<span class="pulse"></span><span>' + html + "</span>";
  }
  function show(node) { requestAnimationFrame(function () { requestAnimationFrame(function () { node.classList.add("on"); }); }); }
  function hide(node) { node.classList.remove("on"); }
  function shake(node) { node.classList.remove("shake"); void node.offsetWidth; node.classList.add("shake"); }

  /* ---- 1. toast: "Complete one task to proceed" ---- */
  function showToast() {
    buildUI();
    hide(ui.tip);
    ui.toast.innerHTML =
      '<div class="slt-ico" aria-hidden="true">🎯</div>' +
      '<div class="slt-copy"><strong>Complete one task to proceed</strong>' +
      '<span>Click on <b>Show me</b> to begin</span></div>' +
      '<div class="slt-row"><span class="slt-dots"></span>' +
      '<button type="button" class="slt-btn" id="slt-show">Show me</button></div>';
    refreshProgress();
    $("#slt-show", ui.toast).addEventListener("click", onShowMe);
    ui.toast.classList.remove("on");
    show(ui.toast);
  }
  function showNoAds() {
    buildUI();
    ui.toast.innerHTML =
      '<div class="slt-ico" aria-hidden="true">🔌</div>' +
      '<div class="slt-copy"><strong>The ads didn’t load</strong>' +
      '<span>Turn off your ad blocker, then reload the page to continue.</span></div>' +
      '<div class="slt-row"><button type="button" class="slt-btn ghost" id="slt-retry">Try again</button>' +
      '<button type="button" class="slt-btn" id="slt-reload">Reload page</button></div>';
    $("#slt-reload", ui.toast).addEventListener("click", function () { location.reload(); });
    $("#slt-retry", ui.toast).addEventListener("click", onShowMe);
    show(ui.toast);
  }

  /* ---- spotlight / finger / tip layout ---- */
  var focus = null;   // { node, radius, tag }
  var rafId = 0;

  function headerH() {
    var h = $(".site-header");
    if (!h) return 0;
    var pos = getComputedStyle(h).position;
    return pos === "sticky" || pos === "fixed" ? h.getBoundingClientRect().height : 0;
  }
  function tipH() { return (ui && ui.tip.offsetHeight) || 190; }
  function region() {
    var top = headerH() + 44;
    var bottom = window.innerHeight - tipH() - 30;
    if (ui && ui.tip.classList.contains("top")) {   // tip parked at the top (Social Bar step)
      top = ui.tip.offsetTop + tipH() + 14;
      bottom = window.innerHeight - 30;
    }
    if (bottom - top < 140) bottom = top + 140;
    return { top: top, bottom: bottom };
  }

  function layout() {
    if (!focus) return;
    var r = focus.node.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight, pad = 8;
    var reg = region();
    var inView = r.bottom > headerH() && r.top < vh && r.right > 0 && r.left < vw && r.width > 0;

    /* spotlight */
    var s = ui.spot.style;
    s.left = (r.left - pad) + "px"; s.top = (r.top - pad) + "px";
    s.width = (r.width + pad * 2) + "px"; s.height = (r.height + pad * 2) + "px";
    s.borderRadius = focus.radius + "px";
    ui.spot.classList.toggle("off", !inView);

    /* finger */
    var cx = clamp(r.left + r.width / 2 - 32, 6, vw - 70);
    var dir, top;
    var below = reg.bottom - r.bottom, above = r.top - reg.top;
    if (!inView) {
      if (r.bottom <= headerH()) { dir = "up"; top = headerH() + 10; }
      else { dir = "down"; top = vh - tipH() - 96; }
    } else if (below >= 74 && (focus.prefer !== "above" || above < 74)) { dir = "up"; top = r.bottom + pad - 12; }
    else if (above >= 74) { dir = "down"; top = r.top - pad - 52; }
    else {
      dir = "up";
      top = clamp(r.top + r.height * 0.55, reg.top + 10, reg.bottom - 50);
    }
    var f = ui.finger;
    f.style.left = cx + "px"; f.style.top = top + "px";
    if (f.getAttribute("data-dir") !== dir) {
      f.setAttribute("data-dir", dir);
      f.classList.toggle("up", dir === "up"); f.classList.toggle("down", dir === "down");
      ui.hand.textContent = dir === "up" ? "👆" : "👇";
    }

    /* tip wording: Ad above / below */
    if (focus.dynamicWord) {
      var tipTop = vh - tipH() - 14;
      var word = (r.top + r.height / 2) < tipTop ? "above" : "below";
      if (focus.word !== word) { focus.word = word; renderTipText(); }
    }
  }
  function loop() { layout(); rafId = requestAnimationFrame(loop); }
  function startLoop() { if (!rafId) rafId = requestAnimationFrame(loop); }
  function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  function renderTipText() {
    if (!focus || !focus.makeText) return;
    ui.text.innerHTML = focus.makeText(focus.word || "above");
  }

  function scrollToNode(node, done) {
    if (isFixedNode(node)) { if (done) done(); return; }   // floating bar: nothing to scroll to
    var r = node.getBoundingClientRect();
    var reg = region();
    var h = reg.bottom - reg.top;
    var wantTop = r.height >= h ? reg.top : reg.top + (h - r.height) / 2;
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    var y = clamp(window.pageYOffset + r.top - wantTop, 0, Math.max(0, maxY));
    window.scrollTo({ top: y, behavior: REDUCED ? "auto" : "smooth" });
    var last = -1, still = 0, t0 = now();
    (function wait() {
      var cur = Math.round(window.pageYOffset);
      still = cur === last ? still + 1 : 0;
      last = cur;
      if (still >= 6 || now() - t0 > 2200) return done && done();
      requestAnimationFrame(wait);
    })();
  }

  function focusOn(node, opts) {
    buildUI();
    focus = {
      node: node, radius: opts.radius || 14, prefer: opts.prefer,
      makeText: opts.makeText, dynamicWord: !!opts.dynamicWord, word: "above"
    };
    ui.spot.classList.toggle("noTag", !opts.tag);
    if (opts.tag) $(".slt-tag", ui.spot).textContent = opts.tag;
    ui.spot.classList.remove("ok");
    renderTipText();
    ui.spot.classList.add("on");
    ui.finger.classList.add("on");
    startLoop();
    layout();
    scrollToNode(node);
  }
  function unfocus() {
    focus = null; stopLoop();
    if (!ui) return;
    ui.spot.classList.remove("on", "ok"); ui.finger.classList.remove("on");
  }

  /* ==========================================================
     Controller
     ========================================================== */
  var phase = "idle";   // idle | intro | guide | verify | finish
  var target = null;    // id of the ad being guided

  function dismiss() {
    if (!ui) return;
    cancelPending(true);
    hide(ui.toast); hide(ui.tip); unfocus();
    phase = "idle";
  }

  function onShowMe() {
    var btn = $("#slt-show", ui.toast) || $("#slt-retry", ui.toast);
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="slt-spin"></span>Finding your ad…'; }
    resolvePicks().then(function (ok) {
      if (!ok) { showNoAds(); phase = "intro"; return; }
      if (isComplete()) { finishAll(); return; }
      hide(ui.toast);
      guideNext(true);
    });
  }

  function tipForAd(word) {
    return "Click on the <b>Ad " + word + "</b>, Spend a few seconds and come back";
  }

  function tipForSocial() {
    return "Click on the glowing <b>Social Bar</b> (the floating bar on your screen), Spend a few seconds and come back";
  }

  function guideNext(withIntro) {
    var left = remaining();
    if (!left.length) return finishAll();
    target = left[0];
    var unit = unitById(target);
    if (!unit || (target === SOCIAL_ID && !socialNode())) { // unit vanished: repick
      state.picks = state.picks.filter(function (id) { return id !== target; }); save();
      return resolvePicks().then(function () { guideNext(); });
    }
    phase = "guide";
    buildUI();
    ui.tip.classList.remove("done");
    ui.tip.querySelector(".slt-badge").innerHTML = "\uD83D\uDCA1 Pro Tip";
    refreshProgress();
    setStatus("go", "Waiting for your click on the glowing ad…");
    ui.acts.innerHTML = "";
    var go = el("button", "slt-btn ghost", "📍 Take me to the ad");
    go.type = "button";
    go.addEventListener("click", function () { if (focus) scrollToNode(focus.node); });
    ui.acts.appendChild(go);
    var idx = state.done.length + 1;
    var social = target === SOCIAL_ID;
    /* the Social Bar floats at the screen edge: park the tip at the top so it is not covered */
    ui.tip.classList.toggle("top", social);
    ui.tip.style.top = social ? (headerH() + 10) + "px" : "";
    focusOn(adNode(unit), {
      radius: social ? 10 : 12, tag: social ? "Social Bar " + idx + " of " + need() : "Ad " + idx + " of " + need(),
      makeText: social ? tipForSocial : tipForAd, dynamicWord: !social
    });
    show(ui.tip);
  }

  function finishAll() {
    phase = "finish";
    buildUI();
    var btn = $("#continue-btn");
    ui.tip.classList.add("done");
    ui.tip.classList.remove("top"); ui.tip.style.top = "";
    refreshProgress();
    ui.acts.innerHTML = "";
    var card = $("#continue-card") || btn;
    focus = null;
    focusOn(btn || card, {
      radius: 999, prefer: "below", tag: "", dynamicWord: false,
      makeText: function () { return "🎉 <b>All tasks complete!</b> Now tap <b>Continue</b> to go on."; }
    });
    ui.tip.querySelector(".slt-badge").innerHTML = "✅ Done";
    renderFinishStatus();
    show(ui.tip);
    window.dispatchEvent(new CustomEvent("shortlink:task-done"));
  }
  var flowState = { remaining: 0, timerDone: true };
  function renderFinishStatus() {
    if (phase !== "finish" || !ui) return;
    if (flowState.timerDone) setStatus("ok", "Everything’s ready — tap the glowing button.");
    else setStatus("go", "Almost there — Continue unlocks in <b>" + flowState.remaining + "s</b>.");
  }
  window.addEventListener("shortlink:state", function (e) {
    flowState = e.detail || flowState;
    renderFinishStatus();
  });
  window.addEventListener("shortlink:proceed", function () {
    if (!ui) return;
    hide(ui.toast); hide(ui.tip); unfocus(); phase = "idle";
  });

  /* ---- called by flow.js when Continue is tapped ---- */
  function start() {
    if (isComplete()) return false;
    buildUI();
    if (phase === "guide" || phase === "verify") {
      shake(ui.tip);
      if (focus) scrollToNode(focus.node);
      return true;
    }
    phase = "intro";
    showToast();
    shake(ui.toast);
    return true;
  }

  /* ==========================================================
     Click verification
     ========================================================== */
  var pend = null;     // the click we are verifying
  var hoverId = null;  // ad unit under the mouse
  var ticker = 0;

  function awayNow() {
    return document.visibilityState === "hidden" || (document.hasFocus && !document.hasFocus());
  }
  function inViewport(unit) {
    var r = adNode(unit).getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var w = Math.min(r.right, vw) - Math.max(r.left, 0);
    var h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return w > 0 && h > 0 && (w * h) >= 0.3 * r.width * r.height;
  }
  function blurActive() {
    try { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); window.focus(); } catch (e) {}
  }

  function registerClick(id) {
    if (pend) return;
    if (state.done.indexOf(id) > -1) return;
    var unit = unitById(id);
    var valid = phase === "guide" && id === target && !!unit && inViewport(unit);
    pend = { id: id, valid: valid, at: now(), away: 0, awayStart: null, left: false, wrongAd: phase === "guide" && id !== target };
    if (valid) {
      state.pend = { id: id, at: pend.at, left: false }; save();
      phase = "verify";
      setStatus("go", "Ad opened ✔ &nbsp;Stay a few seconds, then come back here.");
    }
    pend.timer = setTimeout(function () {         // click opened nothing
      if (pend && !pend.left) cancelPending(false);
    }, CFG.graceMs);
    if (!ticker) ticker = setInterval(tick, 250);
    setTimeout(tick, 60);
  }

  function cancelPending(silent) {
    if (pend && pend.timer) clearTimeout(pend.timer);
    var wasValid = pend && pend.valid;
    pend = null;
    if (ticker) { clearInterval(ticker); ticker = 0; }
    if (state.pend) { state.pend = null; save(); }
    blurActive();
    if (wasValid && phase === "verify") {
      phase = "guide";
      if (!silent && ui) setStatus("warn", "That click didn’t open the ad. Tap the glowing ad again.");
    }
  }

  function tick() {
    if (!pend) return;
    var t = now(), a = awayNow();
    if (a && pend.awayStart == null) {
      pend.awayStart = t; pend.left = true;
      if (pend.timer) { clearTimeout(pend.timer); pend.timer = 0; }
    }
    if (!a && pend.awayStart != null) {
      pend.away += t - pend.awayStart; pend.awayStart = null;
      returned();
    }
  }

  function returned() {
    var p = pend;
    pend = null;
    if (ticker) { clearInterval(ticker); ticker = 0; }
    state.pend = null; save();
    blurActive();
    if (!p.valid) {
      if (p.wrongAd && ui && phase === "guide") {
        setStatus("warn", "That wasn’t the glowing ad, so it didn’t count.");
        shake(ui.tip);
      }
      return;
    }
    if (p.away >= CFG.minAwayMs) return verified(p.id);
    phase = "guide";
    var secs = Math.ceil(CFG.minAwayMs / 1000);
    setStatus("warn", "That was too quick — stay on the ad page for at least <b>" + secs + " seconds</b>, then come back.");
    shake(ui.tip);
  }

  function verified(id) {
    if (state.done.indexOf(id) < 0) state.done.push(id);
    save();
    markUsed(id);                       // this ad can never be asked for again
    refreshProgress();
    setStatus("ok", "Ad " + state.done.length + " verified — thank you!");
    ui.spot.classList.add("ok");
    var tag = $(".slt-tag", ui.spot); if (tag) tag.textContent = "Done ✓";
    var r = focus ? focus.node.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    confetti(r.left + r.width / 2, r.top + r.height / 2);
    phase = "verify";
    window.dispatchEvent(new CustomEvent("shortlink:task-done"));
    setTimeout(function () {
      ui.spot.classList.remove("ok");
      if (remaining().length) { ui.finger.classList.remove("on"); guideNext(); }
      else finishAll();
    }, 1500);
  }

  function confetti(x, y) {
    if (REDUCED) return;
    var set = ["💖", "✨", "💛", "🌸", "🎉", "💕"];
    for (var i = 0; i < 16; i++) {
      var c = el("span", "slt-conf", set[i % set.length]);
      var ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.4, d = 70 + Math.random() * 110;
      c.style.left = x + "px"; c.style.top = y + "px";
      c.style.setProperty("--dx", Math.cos(ang) * d + "px");
      c.style.setProperty("--dy", Math.sin(ang) * d - 30 + "px");
      c.style.setProperty("--rot", Math.round(Math.random() * 360 - 180) + "deg");
      document.body.appendChild(c);
      (function (n) { setTimeout(function () { n.remove(); }, 1400); })(c);
    }
  }

  /* ---- listeners ---- */
  function bindUnits() {
    units().forEach(function (u) {
      var id = u.getAttribute("data-ad");
      u.addEventListener("mouseenter", function () { hoverId = id; });
      u.addEventListener("mouseleave", function () { if (hoverId === id) hoverId = null; });
      /* ads rendered in our own page (native banners): trusted clicks only */
      u.addEventListener("click", function (e) {
        if (!e.isTrusted || e.target === u) return;
        registerClick(id);
      }, true);
    });
  }

  /* Social Bar: it lives outside any slot, so watch the whole document */
  function inSocial(e) {
    var n = socialNode();
    if (!n) return false;
    var path = e.composedPath ? e.composedPath() : [];
    return path.indexOf(n) > -1 || (e.target && n.contains && n.contains(e.target));
  }
  document.addEventListener("mouseover", function (e) {
    try {
      if (inSocial(e)) hoverId = SOCIAL_ID;
      else if (hoverId === SOCIAL_ID) hoverId = null;
    } catch (err) {}
  }, true);
  document.addEventListener("click", function (e) {
    try {
      if (!e.isTrusted) return;
      if (inSocial(e)) registerClick(SOCIAL_ID);
    } catch (err) {}
  }, true);

  /* ads in cross-origin iframes: the click moves focus into the iframe */
  window.addEventListener("blur", function () {
    setTimeout(function () {
      var ae = document.activeElement;
      if (!ae || ae === document.body) return;
      var id, sn = socialNode();
      if (sn && (sn === ae || (sn.contains && sn.contains(ae)))) {
        id = SOCIAL_ID;
      } else {
        if (ae.tagName !== "IFRAME") return;
        var u = unitOf(ae);
        if (!u || isSocial(u)) return;
        id = u.getAttribute("data-ad");
      }
      if (!COARSE && hoverId !== id) return;        // focus was not caused by the mouse
      registerClick(id);
    }, 0);
  });

  document.addEventListener("visibilitychange", function () { setTimeout(tick, 80); });
  window.addEventListener("focus", function () { setTimeout(tick, 80); });
  window.addEventListener("pageshow", function () { setTimeout(tick, 80); });
  window.addEventListener("pagehide", function () {
    /* leaving this tab for the ad (same-tab navigation) */
    if (pend && pend.valid) {
      if (pend.awayStart == null) pend.awayStart = now();
      pend.left = true;
      if (pend.timer) { clearTimeout(pend.timer); pend.timer = 0; }
      state.pend = { id: pend.id, at: pend.at, left: true }; save();
    }
  });

  /* ---- came back after a same-tab navigation (page reloaded) ---- */
  function resumeAfterReload() {
    var p = state.pend;
    if (!p) return;
    state.pend = null; save();
    var id = p.id;
    if (!p.left || state.picks.indexOf(id) < 0 || state.done.indexOf(id) > -1) return;
    var away = now() - p.at;
    if (away > 15 * 60 * 1000) return;
    buildUI();
    resolvePicks().then(function () {
      if (away >= CFG.minAwayMs) { state.done.push(id); save(); markUsed(id); }
      refreshProgress();
      guideNext();
      if (away < CFG.minAwayMs) {
        setStatus("warn", "That was too quick — stay on the ad page for at least <b>" + Math.ceil(CFG.minAwayMs / 1000) + " seconds</b>, then come back.");
      } else {
        setStatus("ok", "Ad verified — thank you!");
      }
    });
  }

  /* ---- keep spotlight right when the window changes ---- */
  window.addEventListener("resize", function () { if (focus) layout(); });

  /* ---- public API: nothing here can mark an ad as clicked ---- */
  window.shortlinkTasks = {
    start: start,
    isComplete: isComplete,
    remaining: remaining
  };

  function init() {
    bindUnits();
    resumeAfterReload();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
