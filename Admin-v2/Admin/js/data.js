// Data layer: reads Firestore page_views, normalises every event, aggregates for any date range.
import { db, PAGE_VIEWS_COLLECTION, query, orderBy, limit, onSnapshot } from "./firebase.js";

export const FINAL = "/page-5.html";
export const PAGE_LABELS = { "/": "Page 1 · Landing", "/page-2.html": "Page 2 · Dating benefits", "/page-3.html": "Page 3 · Lisbon story", "/page-4.html": "Page 4 · Romance rituals", "/page-5.html": "Page 5 · Final (CPA)" };
const ORDER = Object.keys(PAGE_LABELS);
const SOCIAL = /facebook|fb\.|instagram|tiktok|twitter|^t\.co|^x\.com|whatsapp|telegram|snapchat|youtube|reddit|linkedin|pinterest|threads/i;
const SEARCH = /google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|brave/i;

const ms = t => !t ? 0 : t.toMillis ? t.toMillis() : t.seconds ? t.seconds * 1000 : (new Date(t).getTime() || 0);

export function parseUA(u = "") {
  let device = "Desktop";
  if (/bot|crawl|spider|preview|facebookexternalhit/i.test(u)) device = "Bot";
  else if (/iPad|Tablet/i.test(u) || (/Android/i.test(u) && !/Mobile/i.test(u))) device = "Tablet";
  else if (/Mobi|iPhone|Android/i.test(u)) device = "Mobile";
  const browser = /FBAN|FBAV/.test(u) ? "Facebook app" : /Instagram/.test(u) ? "Instagram app" : /TikTok|musical_ly/i.test(u) ? "TikTok app" : /Edg\//.test(u) ? "Edge" : /OPR\/|Opera/.test(u) ? "Opera" : /SamsungBrowser/.test(u) ? "Samsung Internet" : /Firefox|FxiOS/.test(u) ? "Firefox" : /Chrome|CriOS/.test(u) ? "Chrome" : /Safari/.test(u) ? "Safari" : u ? "Other" : "Unknown";
  const os = /Windows/.test(u) ? "Windows" : /iPhone|iPad|iPod/.test(u) ? "iOS" : /Android/.test(u) ? "Android" : /Mac OS X|Macintosh/.test(u) ? "macOS" : /CrOS/.test(u) ? "ChromeOS" : /Linux/.test(u) ? "Linux" : u ? "Other" : "Unknown";
  return { device, browser, os };
}

export function refInfo(raw, utm) {
  let host = "Direct", type = "Direct";
  if (utm) { host = utm; type = SOCIAL.test(utm) ? "Social" : SEARCH.test(utm) ? "Search" : "Campaign"; }
  else if (raw) {
    try { host = new URL(raw).hostname.replace(/^(www|m|l)\./, ""); } catch { host = String(raw).slice(0, 40); }
    type = SOCIAL.test(host) ? "Social" : SEARCH.test(host) ? "Search" : "Referral";
  }
  return { host, type };
}

export function flag(cc) { return /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0))) : "🌐"; }
const names = (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; } })();
export const countryName = cc => (cc && cc !== "??" && names ? (() => { try { return names.of(cc); } catch { return cc; } })() : "Unknown") || cc;

export function normalize(d, id) {
  const ua = d.userAgent || d.ua || "";
  const p = parseUA(ua);
  const cc = String(d.country || d.countryCode || d.geo?.country || d.cf?.country || "").toUpperCase().slice(0, 2);
  const r = refInfo(d.referrer, d.utm_source || d.utm?.source);
  return {
    id, t: ms(d.createdAt || d.timestamp), page: d.page || "/",
    sid: d.sessionId || d.sid || d.visitorId || null,
    cc: /^[A-Z]{2}$/.test(cc) ? cc : "??", city: d.city || "",
    device: d.device || p.device, browser: d.browser || p.browser, os: d.os || p.os,
    screen: d.screen || "", lang: String(d.language || d.lang || "").slice(0, 5) || "",
    ref: r.host, refType: r.type, rawRef: d.referrer || "", hasUA: !!(ua || d.device), hasSid: !!(d.sessionId || d.sid || d.visitorId),
  };
}

export const tally = (arr, fn) => {
  const m = new Map();
  for (const x of arr) { const k = fn(x); m.set(k, (m.get(k) || 0) + 1); }
  return [...m].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
};

// Group events into visits: by session id when present, otherwise each event is its own visit.
export function aggregate(all, days) {
  const from = days ? Date.now() - days * 864e5 : 0;
  const ev = all.filter(e => e.t >= from).sort((a, b) => b.t - a.t);
  const sess = new Map();
  for (const e of ev) {
    const key = e.sid || e.id;
    let s = sess.get(key);
    if (!s) sess.set(key, s = { key, pages: new Set(), first: e.t, last: e.t, cc: e.cc, device: e.device, browser: e.browser, os: e.os, ref: e.ref, refType: e.refType, n: 0 });
    s.pages.add(e.page); s.first = Math.min(s.first, e.t); s.last = Math.max(s.last, e.t); s.n++;
    if (e.cc !== "??") s.cc = e.cc;
  }
  const sessions = [...sess.values()].sort((a, b) => b.last - a.last);
  for (const s of sessions) s.done = s.pages.has(FINAL);
  const done = sessions.filter(s => s.done).length;
  const bounced = sessions.filter(s => s.pages.size === 1 && !s.done).length;
  const hourly = days === 1;
  const step = hourly ? 36e5 : 864e5, span = hourly ? 24 : (days || 30);
  const base = Math.floor(Date.now() / step) * step - (span - 1) * step;
  const series = Array.from({ length: span }, (_, i) => ({ t: base + i * step, views: 0, done: 0 }));
  for (const e of ev) { const i = Math.floor((e.t - base) / step); if (series[i]) { series[i].views++; if (e.page === FINAL) series[i].done++; } }
  const hours = Array(24).fill(0); ev.forEach(e => hours[new Date(e.t).getHours()]++);
  const byKey = (fn) => {
    const m = new Map();
    for (const s of sessions) { const k = fn(s); const o = m.get(k) || { k, n: 0, done: 0 }; o.n++; if (s.done) o.done++; m.set(k, o); }
    return [...m.values()].sort((a, b) => b.n - a.n);
  };
  const funnel = ORDER.map(p => ({ page: p, n: sessions.filter(s => s.pages.has(p)).length }));
  const cov = f => ev.length ? Math.round(ev.filter(f).length / ev.length * 100) : 0;
  return {
    ev, sessions, views: ev.length, visitors: sessions.length, done, bounced, series, hours, funnel, hourly,
    rate: sessions.length ? done / sessions.length * 100 : 0, bounce: sessions.length ? bounced / sessions.length * 100 : 0,
    active: new Set(all.filter(e => e.t > Date.now() - 3e5).map(e => e.sid || e.id)).size,
    countries: byKey(s => s.cc), referrers: byKey(s => s.ref), refTypes: byKey(s => s.refType),
    devices: byKey(s => s.device), browsers: byKey(s => s.browser), systems: byKey(s => s.os),
    screens: tally(ev.filter(e => e.screen), e => e.screen), langs: tally(ev.filter(e => e.lang), e => e.lang),
    coverage: { country: cov(e => e.cc !== "??"), device: cov(e => e.hasUA), session: cov(e => e.hasSid), screen: cov(e => e.screen) },
  };
}

export function demoEvents(n = 1500) {
  const C = ["GH", "GH", "GH", "NG", "US", "GB", "KE", "ZA", "CA", "DE", "IN", "BR"], R = ["", "", "https://l.facebook.com/", "https://www.google.com/", "https://t.co/x", "https://www.tiktok.com/", "https://wa.me/", "https://www.instagram.com/", "https://www.youtube.com/"];
  const U = ["Mozilla/5.0 (Linux; Android 13; SM-A135F) Chrome/120 Mobile Safari/537.36", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605 Version/17 Mobile Safari/604", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17 Safari/605", "Mozilla/5.0 (Linux; Android 12) FBAV/430 Mobile"];
  const out = []; let id = 0;
  for (let i = 0; i < n / 3; i++) {
    const t0 = Date.now() - Math.random() ** 2 * 14 * 864e5, cc = C[Math.random() * C.length | 0], ref = R[Math.random() * R.length | 0], ua = U[Math.random() * U.length | 0], sid = "d" + i;
    const depth = Math.random() < .3 ? 1 : Math.random() < .5 ? 3 : Math.random() < .5 ? 4 : 5;
    for (let p = 0; p < depth; p++) out.push(normalize({ page: ORDER[p], createdAt: t0 + p * 45e3, country: cc, referrer: p ? "" : ref, userAgent: ua, sessionId: sid, screen: ["390x844", "412x915", "1920x1080", "1440x900"][Math.random() * 4 | 0], language: "en" }, "e" + id++));
  }
  return out;
}

export function listen(onData, onState, limitN = 3000) {
  const q = query(PAGE_VIEWS_COLLECTION, orderBy("createdAt", "desc"), limit(limitN));
  return onSnapshot(q, snap => { onData(snap.docs.map(d => normalize(d.data(), d.id))); onState("ok"); },
    err => { console.warn(err); onState("bad", err.message); });
}
