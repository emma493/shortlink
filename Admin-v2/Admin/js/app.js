import { listen, aggregate, demoEvents, flag, countryName, tally, PAGE_LABELS, FINAL } from "./data.js";

const $ = s => document.querySelector(s);
const fmt = n => Math.round(n).toLocaleString();
const pct = n => (Math.round(n * 10) / 10) + "%";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ago = t => { const s = (Date.now() - t) / 1000; return s < 60 ? "just now" : s < 3600 ? (s / 60 | 0) + "m ago" : s < 86400 ? (s / 3600 | 0) + "h ago" : (s / 86400 | 0) + "d ago"; };
const I = d => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;

const PAGES = [
  ["Analytics"],
  ["overview", "Overview", "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"],
  ["realtime", "Realtime", "M22 12h-4l-3 9L9 3l-3 9H2"],
  ["Audience"],
  ["countries", "Countries", "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"],
  ["devices", "Devices & browsers", "M5 2h14v20H5zM11 18h2"],
  ["visitors", "Visitors", "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"],
  ["Acquisition"],
  ["referrers", "Referrers", "M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"],
  ["funnel", "Funnel & pages", "M22 3H2l8 9.5V19l4 2v-8.5z"],
  ["Data"],
  ["log", "Event log", "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"],
  ["setup", "Setup & export", "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"],
];

let raw = [], A = null, demo = false, charts = [], cur = "overview", unsub = null, filter = "";

// ---------- building blocks ----------
const kpi = (l, v, note = "", hot) => `<div class="card kpi ${hot ? "hot" : ""}"><div class="lbl">${l}</div><div class="num">${v}</div><div class="note">${note}</div></div>`;
const card = (t, sub, body) => `<div class="card"><h2>${t}</h2><div class="sub">${sub || ""}</div>${body}</div>`;
const empty = m => `<div class="empty">${m}</div>`;
function bars(items, label, total) {
  if (!items.length) return empty("No data in this range yet.");
  const max = items[0].n || 1;
  return `<div class="bars">${items.map(x => `<div class="bar"><div class="top"><span class="nm">${label ? label(x) : esc(x.k)}</span><span class="vl">${fmt(x.n)} · ${pct(x.n / total * 100)}</span></div><div class="track"><i style="width:${x.n / max * 100}%"></i></div></div>`).join("")}</div>`;
}
const cLabel = x => `${flag(x.k)} ${esc(countryName(x.k))}`;
const canvas = id => `<div class="chart sm"><canvas id="${id}"></canvas></div>`;
function table(head, rows) {
  return `<div class="tw"><table><thead><tr>${head.map(h => `<th class="${h[1] || ""}">${h[0]}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${head.length}">${empty("Nothing to show yet.")}</td></tr>`}</tbody></table></div>`;
}
const COLORS = ["#ff5c8a", "#9b7bff", "#5ad1c4", "#ffb86b", "#6aa8ff", "#c7f26b", "#ff8f6b", "#b38cff"];
function chart(id, cfg) {
  const el = document.getElementById(id); if (!el || !window.Chart) return;
  Chart.defaults.color = "#9a8ca8"; Chart.defaults.borderColor = "#322840"; Chart.defaults.font.family = "Figtree";
  charts.push(new Chart(el, cfg));
}
const donut = (id, items) => chart(id, { type: "doughnut", data: { labels: items.slice(0, 8).map(x => x.k), datasets: [{ data: items.slice(0, 8).map(x => x.n), backgroundColor: COLORS, borderColor: "#1d1726", borderWidth: 3 }] }, options: { maintainAspectRatio: false, cutout: "66%", plugins: { legend: { position: "right", labels: { boxWidth: 10 } } } } });
const hbar = (id, items, fmtK) => chart(id, { type: "bar", data: { labels: items.slice(0, 10).map(x => fmtK ? fmtK(x.k) : x.k), datasets: [{ data: items.slice(0, 10).map(x => x.n), backgroundColor: "#ff5c8a", borderRadius: 5 }] }, options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } } } });

// ---------- pages ----------
const views = {
  overview() {
    const a = A;
    return `<div class="grid g-kpi">${kpi("Page views", fmt(a.views), "all five pages")}${kpi("Visits", fmt(a.visitors), a.coverage.session ? "grouped by session" : "1 visit per view (no session id yet)")}${kpi("Completed (CPA)", fmt(a.done), "reached page 5", 1)}${kpi("Completion rate", pct(a.rate), "of visits")}${kpi("Bounce rate", pct(a.bounce), "left after page 1")}${kpi("Active now", fmt(a.active), "last 5 minutes")}</div>
    <div class="grid g-2">${card("Traffic over time", a.hourly ? "Views and completions per hour" : "Views and completions per day", `<div class="chart"><canvas id="c1"></canvas></div>`)}${card("When visitors arrive", "Views by hour of day (your browser's time)", `<div class="chart"><canvas id="c2"></canvas></div>`)}</div>
    <div class="grid g-3">${card("Top countries", "Visits by visitor country", bars(a.countries.slice(0, 6), cLabel, a.visitors))}${card("Top referrers", "Where visitors came from", bars(a.referrers.slice(0, 6), null, a.visitors))}${card("Devices", "Visits by device type", canvas("c3"))}</div>`;
  },
  realtime() {
    const recent = A.ev.filter(e => e.t > Date.now() - 36e5).slice(0, 40);
    return `<div class="grid g-2">${card("Active visitors", "Seen in the last 5 minutes", `<div class="live"><span class="num">${fmt(A.active)}</span><span class="sub">on your pages right now</span></div>`)}${card("Last hour", "Views per 5 minutes", `<div class="chart sm"><canvas id="c1"></canvas></div>`)}</div>
    ${card("Live feed", "Updates the moment a visitor loads a page", table([["When"], ["Country"], ["Page"], ["Device"], ["From"]], recent.map(e => `<tr><td>${ago(e.t)}</td><td>${flag(e.cc)} ${esc(countryName(e.cc))}</td><td><span class="pill ${e.page === FINAL ? "cpa" : ""}">${esc(PAGE_LABELS[e.page] || e.page)}</span></td><td>${e.device} · ${e.browser}</td><td>${esc(e.ref)}</td></tr>`)))}`;
  },
  countries() {
    const a = A, unk = a.countries.find(c => c.k === "??");
    return `${!a.coverage.country ? card("Country data is missing", "", `<p>Your current tracker doesn't save the visitor's country yet. Open <b>Setup &amp; export</b> and add the one-line upgrade to <code>track.js</code>. New visits will show up here.</p>`) + "<br>" : ""}
    <div class="grid g-2">${card("Visits by country", "Top 10", `<div class="chart"><canvas id="c1"></canvas></div>`)}${card("Share of visits", unk ? `${unk.n} visits have no country yet` : "", bars(a.countries.slice(0, 8), cLabel, a.visitors))}</div>
    ${card("All countries", "Which countries actually complete the journey", table([["Country"], ["Visits", "r"], ["Share", "r"], ["Completed", "r"], ["Completion", "r"]], a.countries.map(c => `<tr><td>${cLabel({ k: c.k })}</td><td class="r">${fmt(c.n)}</td><td class="r">${pct(c.n / a.visitors * 100)}</td><td class="r">${fmt(c.done)}</td><td class="r">${pct(c.done / c.n * 100)}</td></tr>`)))}`;
  },
  devices() {
    const a = A, t = a.visitors;
    return `<div class="grid g-3">${card("Device type", "Mobile, tablet or desktop", canvas("c1"))}${card("Browser", "", canvas("c2"))}${card("Operating system", "", canvas("c3"))}</div>
    <div class="grid g-2">${card("Browsers", "Visits and completion", table([["Browser"], ["Visits", "r"], ["Completion", "r"]], a.browsers.map(x => `<tr><td>${esc(x.k)}</td><td class="r">${fmt(x.n)}</td><td class="r">${pct(x.done / x.n * 100)}</td></tr>`)))}${card("Screen sizes & languages", a.coverage.screen ? "" : "Needs the tracker upgrade", bars(a.screens.slice(0, 5), null, a.views || 1) + "<br>" + bars(a.langs.slice(0, 4), null, a.views || 1))}</div>`;
  },
  visitors() {
    return card("Recent visits", `${fmt(A.visitors)} visits in this range (latest 100 shown)`, table([["Last seen"], ["Country"], ["Device"], ["Source"], ["Pages", "r"], ["Result"]], A.sessions.slice(0, 100).map(s => `<tr><td>${ago(s.last)}</td><td>${flag(s.cc)} ${esc(countryName(s.cc))}</td><td>${s.device} · ${s.os}</td><td>${esc(s.ref)}</td><td class="r">${s.pages.size}/5</td><td><span class="pill ${s.done ? "cpa" : ""}">${s.done ? "Completed" : s.pages.size === 1 ? "Bounced" : "In progress"}</span></td></tr>`)));
  },
  referrers() {
    const a = A;
    return `<div class="grid g-2">${card("Source type", "Direct, search, social, referral", canvas("c1"))}${card("Top referrers", "", bars(a.referrers.slice(0, 10), null, a.visitors))}</div>
    ${card("Which sources convert", "Completion rate by referrer", table([["Referrer"], ["Type"], ["Visits", "r"], ["Completed", "r"], ["Completion", "r"]], a.referrers.map(r => `<tr><td>${esc(r.k)}</td><td><span class="pill">${esc(a.sessions.find(s => s.ref === r.k)?.refType || "")}</span></td><td class="r">${fmt(r.n)}</td><td class="r">${fmt(r.done)}</td><td class="r">${pct(r.done / r.n * 100)}</td></tr>`)))}`;
  },
  funnel() {
    const f = A.funnel, top = f[0].n || 1;
    return `<div class="grid g-2">${card("Visitor journey", "Visits that reached each page", `<div class="funnel">${f.map((s, i) => `<div class="step"><div class="fb" style="width:${Math.max(s.n / top * 100, 12)}%">${fmt(s.n)}</div><div>${esc(PAGE_LABELS[s.page])}</div>${i ? `<div class="drop">${f[i - 1].n ? "−" + pct((1 - s.n / f[i - 1].n) * 100) + " dropped from previous page" : ""}</div>` : ""}</div>`).join("")}</div>`)}
    ${card("Views by page", "Raw page loads", table([["Page"], ["Views", "r"], ["Share", "r"]], tally(A.ev, e => e.page).map(p => `<tr><td>${esc(PAGE_LABELS[p.k] || p.k)}</td><td class="r">${fmt(p.n)}</td><td class="r">${pct(p.n / A.views * 100)}</td></tr>`)))}</div>`;
  },
  log() {
    const rows = A.ev.filter(e => !filter || `${e.page} ${e.ref} ${e.cc} ${countryName(e.cc)} ${e.device} ${e.browser} ${e.os}`.toLowerCase().includes(filter)).slice(0, 300);
    return `<div class="row"><input type="search" id="q" placeholder="Filter by country, page, device, referrer…" value="${esc(filter)}" style="min-width:280px"><button class="btn" id="csv">Export CSV</button></div>
    <div id="logTable">${logTable(rows)}</div>`;
  },
  setup() {
    const c = A.coverage, row = (l, v) => `<div class="cov"><span style="width:150px">${l}</span><div class="track"><i style="width:${v}%"></i></div><b>${v}%</b></div>`;
    return `<div class="grid g-2">${card("What your tracker is saving", `Share of ${fmt(A.views)} events in this range that include each field`, row("Country", c.country) + row("Device / browser", c.device) + row("Session id", c.session) + row("Screen size", c.screen) + `<p class="sub" style="margin-top:12px">Anything under 100% means older events were recorded before that field existed. New visits fill the gaps.</p>`)}
    ${card("Preview mode", "See every page filled with sample data", `<div class="row"><button class="btn primary" id="demo">${demo ? "Switch back to live data" : "Load sample data"}</button></div><p class="sub">Sample data is generated in your browser and never written to Firestore.</p>`)}</div>
    ${card("Upgrade your tracker", "Add this to track.js so every visit also records country, device, session and screen. Country comes from Cloudflare, which you already use.", `<pre>${esc(document.getElementById("trackerSrc")?.textContent || "")}</pre><div class="row" style="margin:12px 0 0"><a class="btn" href="extras/track-snippet.js" download>Download track-snippet.js</a></div>`)}`;
  },
};
const logTable = rows => table([["Time"], ["Country"], ["Page"], ["Device"], ["Browser"], ["OS"], ["Referrer"]], rows.map(e => `<tr><td>${new Date(e.t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td><td>${flag(e.cc)} ${esc(countryName(e.cc))}</td><td>${esc(e.page)}</td><td>${e.device}</td><td>${e.browser}</td><td>${e.os}</td><td>${esc(e.ref)}</td></tr>`));

// charts after mount
const after = {
  overview() {
    const s = A.series, lab = s.map(p => new Date(p.t).toLocaleString([], A.hourly ? { hour: "2-digit" } : { month: "short", day: "numeric" }));
    chart("c1", { type: "line", data: { labels: lab, datasets: [{ label: "Views", data: s.map(p => p.views), borderColor: "#ff5c8a", backgroundColor: "rgba(255,92,138,.14)", fill: true, tension: .35, pointRadius: 0 }, { label: "Completed", data: s.map(p => p.done), borderColor: "#5ad1c4", tension: .35, pointRadius: 0 }] }, options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { labels: { boxWidth: 10 } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true } } } });
    chart("c2", { type: "bar", data: { labels: A.hours.map((_, i) => i + "h"), datasets: [{ data: A.hours, backgroundColor: "#9b7bff", borderRadius: 4 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }, y: { beginAtZero: true } } } });
    donut("c3", A.devices);
  },
  realtime() {
    const b = Array(12).fill(0), now = Date.now(); raw.forEach(e => { const i = 11 - Math.floor((now - e.t) / 3e5); if (i >= 0 && i < 12) b[i]++; });
    chart("c1", { type: "bar", data: { labels: b.map((_, i) => `-${(11 - i) * 5}m`), datasets: [{ data: b, backgroundColor: "#5ad1c4", borderRadius: 4 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  },
  countries() { hbar("c1", A.countries, k => countryName(k)); },
  devices() { donut("c1", A.devices); donut("c2", A.browsers); donut("c3", A.systems); },
  referrers() { donut("c1", A.refTypes); },
};

// ---------- shell ----------
function csv() {
  const h = ["time", "page", "country", "device", "browser", "os", "referrer", "session"];
  const lines = [h.join(",")].concat(A.ev.map(e => [new Date(e.t).toISOString(), e.page, e.cc, e.device, e.browser, e.os, e.ref, e.sid || ""].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = "shortlink-events.csv"; a.click();
}
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 1800); }
function setStatus(s, msg) {
  $("#status").innerHTML = `<i class="dot ${s === "ok" ? "ok" : s === "bad" ? "bad" : "warn"}"></i>${demo ? "Sample data" : s === "ok" ? "Live · Firestore" : s === "bad" ? "Can't read data" : "Connecting…"}`;
  if (s === "bad") toast(msg || "Firestore read failed. Check your security rules.");
}
function render() {
  charts.forEach(c => c.destroy()); charts = [];
  A = aggregate(raw, +$("#range").value);
  $("#view").innerHTML = (views[cur] || views.overview)();
  after[cur]?.();
  $("#foot").textContent = `${fmt(raw.length)} events loaded`;
  $("#q")?.addEventListener("input", e => { filter = e.target.value.toLowerCase(); const rows = A.ev.filter(x => !filter || `${x.page} ${x.ref} ${x.cc} ${countryName(x.cc)} ${x.device} ${x.browser} ${x.os}`.toLowerCase().includes(filter)).slice(0, 300); $("#logTable").innerHTML = logTable(rows); });
  $("#csv")?.addEventListener("click", csv);
  $("#demo")?.addEventListener("click", () => { demo = !demo; connect(); });
}
function nav() {
  $("#nav").innerHTML = PAGES.map(p => p.length === 1 ? `<div class="grp">${p[0]}</div>` : `<a href="#${p[0]}" class="${p[0] === cur ? "on" : ""}">${I(p[2])}<span>${p[1]}</span></a>`).join("");
  $("#title").textContent = (PAGES.find(p => p[0] === cur) || PAGES[1])[1];
}
function route() { cur = location.hash.slice(1) || "overview"; if (!views[cur]) cur = "overview"; nav(); $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("open"); render(); window.scrollTo(0, 0); }
function connect() {
  unsub?.(); setStatus("wait");
  if (demo) { raw = demoEvents(); setStatus("ok"); render(); return; }
  unsub = listen(d => { raw = d; render(); }, setStatus);
}
window.addEventListener("hashchange", route);
$("#range").addEventListener("change", render);
$("#refresh").addEventListener("click", () => { connect(); toast("Refreshed"); });
$("#menuBtn").addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#scrim").classList.add("open"); });
$("#scrim").addEventListener("click", route);
setInterval(() => { if (document.visibilityState === "visible" && (cur === "realtime" || cur === "overview")) render(); }, 30000);
nav(); route(); connect();
