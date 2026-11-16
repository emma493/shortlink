/* Shortlink — Ad reload on page navigation.
 * Reloads social bar + popunder scripts when the user navigates to a new page.
 * Each page load is a fresh HTML document, so ads appear new on every page.
 */
(function () {
  const SOCIAL_BAR_SRC = "https://biomanos.org/14/e83c3df1d025804eca4fb0e8e81cf573";
  const POPUNDER_SRC = "https://benchform.org/1/02714438000f2ba1f30b00c100a6036c";

  function reloadAds() {
    // Remove existing social bar scripts
    document.querySelectorAll(
      'script[src*="biomanos.org/14/e83c3df1d025804eca4fb0e8e81cf573"]'
    ).forEach((s) => s.remove());

    // Remove existing popunder scripts
    document.querySelectorAll(
      'script[src*="benchform.org/1/02714438000f2ba1f30b00c100a6036c"]'
    ).forEach((s) => s.remove());

    // Inject fresh social bar with cache-busting param
    const s1 = document.createElement("script");
    s1.src = SOCIAL_BAR_SRC + "?t=" + Date.now();
    s1.setAttribute("data-cfasync", "false");
    s1.async = true;
    document.head.appendChild(s1);

    // Inject fresh popunder with cache-busting param
    const s2 = document.createElement("script");
    s2.src = POPUNDER_SRC + "?t=" + Date.now();
    s2.setAttribute("data-cfasync", "false");
    s2.async = true;
    document.head.appendChild(s2);
  }

  // Reload once on page load (each navigation = new page = fresh ads)
  reloadAds();
})();
