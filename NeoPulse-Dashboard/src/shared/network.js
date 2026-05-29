import { PING_URL, DEFAULT_DOWNLOAD_URL, UPLOAD_URL, IP_API_URL } from './constants.js';

// ── Online status ──────────────────────────────────────────────
export function checkOnlineStatus() {
  return navigator.onLine;
}

// ── Latency ping ───────────────────────────────────────────────
// no-cors so no CORS error; response is opaque but timing is real.
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
// jsdelivr sends CORS headers so arrayBuffer() can be read.
export async function estimateDownloadSpeed(url = DEFAULT_DOWNLOAD_URL) {
  try {
    const start  = performance.now();
    const res    = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buffer  = await res.arrayBuffer();
    const elapsed = (performance.now() - start) / 1000;
    if (elapsed <= 0) return null;
    return Math.round(((buffer.byteLength * 8) / elapsed / 1_000_000) * 10) / 10;
  } catch {
    return null;
  }
}

// ── Upload speed estimate ──────────────────────────────────────
// POSTs 150 KB of random bytes to httpbin.org (open CORS, free) and times
// until the server acknowledges with response headers.
// No user data sent — payload is crypto-random binary.
export async function estimateUploadSpeed() {
  try {
    const size    = 150 * 1024; // 150 KB
    const payload = new Uint8Array(size);
    crypto.getRandomValues(payload);
    const start   = performance.now();
    const res     = await fetch(UPLOAD_URL, {
      method:  'POST',
      body:    payload,
      cache:   'no-store',
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    // httpbin returns 200; any 2xx is a success — don't bail on non-200
    if (res.status < 200 || res.status >= 300) return null;
    const elapsed = (performance.now() - start) / 1000;
    if (elapsed <= 0) return null;
    return Math.round(((size * 8) / elapsed / 1_000_000) * 10) / 10;
  } catch {
    return null;
  }
}

// ── Public IP + ISP lookup ─────────────────────────────────────
// ipwho.is — free, HTTPS, no API key. Returns { ip, isp, ... }.
export async function fetchPublicIp() {
  try {
    const res  = await fetch(IP_API_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success && data.success !== undefined) return null;
    return { ip: data.ip ?? null, isp: data.isp ?? null };
  } catch {
    return null;
  }
}

// ── Full network check ─────────────────────────────────────────
// Runs latency, download, upload, and IP lookup in parallel.
export async function runNetworkCheck({
  pingUrl     = PING_URL,
  downloadUrl = DEFAULT_DOWNLOAD_URL,
} = {}) {
  const online = checkOnlineStatus();
  if (!online) {
    return {
      online: false,
      latencyMs: null, downloadMbps: null, uploadMbps: null,
      ip: null, isp: null,
      timestamp: Date.now(),
    };
  }

  const [latencyMs, downloadMbps, uploadMbps, ipInfo] = await Promise.all([
    measureLatency(pingUrl),
    estimateDownloadSpeed(downloadUrl),
    estimateUploadSpeed(),
    fetchPublicIp(),
  ]);

  return {
    online,
    latencyMs,
    downloadMbps,
    uploadMbps,
    ip:  ipInfo?.ip  ?? null,
    isp: ipInfo?.isp ?? null,
    timestamp: Date.now(),
  };
}

// ── Auto-refresh scheduler ─────────────────────────────────────
export function scheduleAutoRefresh(intervalSec, callback) {
  return setInterval(callback, Math.max(60, intervalSec) * 1000);
}
