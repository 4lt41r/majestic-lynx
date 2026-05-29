import {
  PING_URL, DEFAULT_DOWNLOAD_URL, UPLOAD_URL, UPLOAD_TIMEOUT_MS,
  IP_API_URL, IP_FALLBACK_URL,
} from './constants.js';

export function checkOnlineStatus() {
  return navigator.onLine;
}

export async function measureLatency(url = PING_URL) {
  try {
    const start = performance.now();
    await fetch(url, { method: 'HEAD', cache: 'no-store', mode: 'no-cors' });
    return Math.round(performance.now() - start);
  } catch {
    return null;
  }
}

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

export async function estimateUploadSpeed() {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const size    = 150 * 1024;
    const payload = new Uint8Array(size);
    crypto.getRandomValues(payload);
    const start   = performance.now();
    const res     = await fetch(UPLOAD_URL, {
      method:  'POST',
      body:    payload,
      cache:   'no-store',
      signal:  controller.signal,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    if (res.status < 200 || res.status >= 300) return null;
    const elapsed = (performance.now() - start) / 1000;
    if (elapsed <= 0) return null;
    return Math.round(((size * 8) / elapsed / 1_000_000) * 10) / 10;
  } catch (err) {
    if (err.name === 'AbortError') console.warn('[NeoPulse] upload timeout');
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchPublicIp() {
  // Primary: ipwho.is (returns ip + isp)
  try {
    const res  = await fetch(IP_API_URL, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.ip) {
        return { ip: data.ip, isp: data.isp ?? null };
      }
    }
  } catch { /* fall through */ }

  // Fallback: api.ipify.org (IP only, no ISP)
  try {
    const res  = await fetch(IP_FALLBACK_URL, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) return { ip: data.ip, isp: null };
    }
  } catch { /* both failed */ }

  return null;
}

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

export function scheduleAutoRefresh(intervalSec, callback) {
  return setInterval(callback, Math.max(60, intervalSec) * 1000);
}
