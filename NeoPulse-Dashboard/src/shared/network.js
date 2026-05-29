import { PING_URL, DEFAULT_DOWNLOAD_URL } from './constants.js';

// ── Online status ──────────────────────────────────────────────
export function checkOnlineStatus() {
  return navigator.onLine;
}

// ── Latency ping ───────────────────────────────────────────────
// Sends a HEAD request to a fast URL and times the round trip.
// Uses no-cors so no CORS error is thrown; response is opaque but timing is real.
export async function measureLatency(url = PING_URL) {
  try {
    const start = performance.now();
    await fetch(url, { method: 'HEAD', cache: 'no-store', mode: 'no-cors' });
    return Math.round(performance.now() - start);
  } catch {
    return null;
  }
}

// ── Download speed estimate ────────────────────────────────────
// Fetches a known-size file and divides bytes by elapsed seconds.
// jsdelivr sends CORS headers so arrayBuffer() can be read.
export async function estimateDownloadSpeed(url = DEFAULT_DOWNLOAD_URL) {
  try {
    const start = performance.now();
    const res    = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buffer  = await res.arrayBuffer();
    const elapsed = (performance.now() - start) / 1000; // seconds
    if (elapsed <= 0) return null;
    const mbps = (buffer.byteLength * 8) / elapsed / 1_000_000;
    return Math.round(mbps * 10) / 10; // one decimal place
  } catch {
    return null;
  }
}

// ── Full network check ─────────────────────────────────────────
// Runs latency + download in parallel. Returns a result object.
// All values are labelled "approximate" in the UI — never claim precision.
export async function runNetworkCheck({
  pingUrl       = PING_URL,
  downloadUrl   = DEFAULT_DOWNLOAD_URL,
} = {}) {
  const online = checkOnlineStatus();
  if (!online) {
    return { online: false, latencyMs: null, downloadMbps: null, timestamp: Date.now() };
  }

  const [latencyMs, downloadMbps] = await Promise.all([
    measureLatency(pingUrl),
    estimateDownloadSpeed(downloadUrl),
  ]);

  return { online, latencyMs, downloadMbps, timestamp: Date.now() };
}

// ── Auto-refresh scheduler ─────────────────────────────────────
// Enforces a minimum 60-second floor to avoid hammering the network.
// Returns the interval ID so the caller can cancel it.
export function scheduleAutoRefresh(intervalSec, callback) {
  const ms = Math.max(60, intervalSec) * 1000;
  return setInterval(callback, ms);
}
