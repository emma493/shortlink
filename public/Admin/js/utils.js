// ==========================================
// Shortlink Admin — Utilities
// ==========================================

export function fmt(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return "Never";
  let date;
  if (timestamp?.toDate && typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "number") {
    date = new Date(timestamp);
  } else if (typeof timestamp === "string") {
    date = new Date(timestamp);
  } else {
    return "Just now";
  }

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const PAGE_LABELS = {
  "/": "Page 1 — Landing",
  "/page-2.html": "Page 2 — Dating benefits",
  "/page-3.html": "Page 3 — Lisbon story",
  "/page-4.html": "Page 4 — Romance rituals",
  "/page-5.html": "Page 5 — Final page (CPA)",
};
