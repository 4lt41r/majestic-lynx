export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function formatMs(ms) {
  if (ms == null) return '—';
  return `${Math.round(ms)}`;
}

export function formatMbps(mbps) {
  if (mbps == null) return '—';
  return mbps >= 100 ? Math.round(mbps).toString() : mbps.toFixed(1);
}

export function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

// Format a timestamp as "HH:MM:SS"
export function formatTime(date = new Date()) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

// Format a Date as "Monday, 29 May 2026"
export function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Safe textContent setter — never uses innerHTML
export function setText(el, text) {
  if (el) el.textContent = text;
}

// Create a DOM element with optional attributes and text
export function createElement(tag, attrs = {}, text = '') {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') el.className = v;
    else el.setAttribute(k, v);
  }
  if (text) el.textContent = text;
  return el;
}

// Clamp a number between min and max
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Return relative time string like "2 min ago"
export function timeAgo(timestamp) {
  if (!timestamp) return 'Never';
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 10)  return 'Just now';
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
