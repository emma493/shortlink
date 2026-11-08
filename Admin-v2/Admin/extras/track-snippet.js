// Add to your existing track.js. Records country, device, session and screen with every page view.
// Your page_views documents keep the same fields (page, referrer, createdAt) plus the new ones below.
async function getCountry() {
  try {
    const t = await (await fetch("/cdn-cgi/trace")).text();   // works on any site behind Cloudflare
    return (t.match(/^loc=(\w\w)/m) || [])[1] || "";
  } catch { return ""; }
}
function getSession() {
  let s = sessionStorage.getItem("sl_sid");
  if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("sl_sid", s); }
  return s;
}
const extra = {
  country: await getCountry(),
  userAgent: navigator.userAgent,
  sessionId: getSession(),
  screen: screen.width + "x" + screen.height,
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};
// Merge into the object you already pass to addDoc(PAGE_VIEWS_COLLECTION, { page, referrer, createdAt, ...extra })
