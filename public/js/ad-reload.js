/* Shortlink — Ad watchdog.
 * Keeps social bar + popunder alive on every page.
 * If they disappear (removed, clicked, navigated away, or never loaded),
 * they are re-injected immediately with a fresh cache-bust.
 */
(function () {
  const SOCIAL_BAR_SRC = "https://biomanos.org/14/e83c3df1d025804eca4fb0e8e81cf573";
  const POPUNDER_SRC = "https://benchform.org/1/02714438000f2ba1f30b00c100a6036c";

  function removeAds() {
    document.querySelectorAll('script[src*="biomanos.org/14/e83c3df1d025804eca4fb0e8e81cf573"]').forEach((s) => s.remove());
    document.querySelectorAll('script[src*="benchform.org/1/02714438000f2ba1f30b00c100a6036c"]').forEach((s) => s.remove());
  }

  function injectScript(src) {
    const s = document.createElement("script");
    s.src = src + "?t=" + Date.now();
    s.setAttribute("data-cfasync", "false");
    s.async = true;
    document.head.appendChild(s);
  }

  function reloadAds() {
    removeAds();
    injectScript(SOCIAL_BAR_SRC);
    injectScript(POPUNDER_SRC);
  }

  function adsArePresent() {
    const social = document.querySelector('script[src*="biomanos.org/14/e83c3df1d025804eca4fb0e8e81cf573"]');
    const pop = document.querySelector('script[src*="benchform.org/1/02714438000f2ba1f30b00c100a6036c"]');
    return Boolean(social && pop);
  }

  // 1. Initial load
  reloadAds();

  // 2. Watchdog: poll every 2 seconds. If either ad is missing, restore it.
  setInterval(function () {
    if (!adsArePresent()) {
      reloadAds();
    }
  }, 2000);

  // 3. Tab visibility: user came back to this tab — refresh ads
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      reloadAds();
    }
  });

  // 4. Scroll: user moved on the page — refresh ads if missing
  let ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        if (!adsArePresent()) {
          reloadAds();
        }
        ticking = false;
      });
      ticking = true;
    }
  });
})();
