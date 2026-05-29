# NeoPulse Dashboard — Sukuna 3D Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scrollable cyberpunk dashboard with a full-viewport Three.js 3D throne room where Sukuna sits on a skeleton pile above a blood pool, and all UI widgets (clock, quick links, network strip) are actual 3D objects in the scene.

**Architecture:** Single `WebGLRenderer` on a full-viewport `<canvas>`. Room geometry (floor, walls, blood pool, skeleton throne) in `room.js`. Sukuna low-poly character in `sukuna.js`. 3D UI objects (clock box, link panels, network strip) with `CanvasTexture` faces in `ui-objects.js`. Renderer + camera + lighting + animation loop + raycasting in `scene.js`. `app.js` wires everything together. The only HTML overlay is the search `<input>` + footer buttons.

**Tech Stack:** Three.js r158 ES module (self-hosted at `src/assets/three.module.min.js`), vanilla JS ES Modules, Chrome Extension MV3, no bundler.

**Spec:** `docs/superpowers/specs/2026-05-29-sukuna-3d-overhaul-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/assets/three.module.min.js` | DOWNLOAD | Three.js r158 ES module bundle |
| `src/shared/constants.js` | MODIFY | Add `IP_FALLBACK_URL`, `UPLOAD_TIMEOUT_MS` |
| `manifest.json` | MODIFY | Add `api.ipify.org` to host_permissions + CSP |
| `src/shared/network.js` | MODIFY | AbortController timeout on upload, IP fallback |
| `src/newtab/index.html` | OVERHAUL | Canvas + search overlay + footer buttons only |
| `src/newtab/styles.css` | OVERHAUL | Full-viewport crimson theme, overlay positioning |
| `src/newtab/room.js` | CREATE | Floor, walls, blood pool shader, skeleton pile, throne |
| `src/newtab/sukuna.js` | CREATE | Sukuna geometry, tattoos, ghost arms, idle animation |
| `src/newtab/ui-objects.js` | CREATE | Clock mesh, quick link panels, network strip, pedestal |
| `src/newtab/scene.js` | CREATE | Renderer, camera, lighting, animation loop, raycasting |
| `src/newtab/app.js` | OVERHAUL | Wires all modules, search, footer, network, prefs |

---

## Task 1: Download Three.js + Update Manifest + Constants

**Files:**
- Create: `src/assets/three.module.min.js`
- Modify: `src/shared/constants.js`
- Modify: `manifest.json`

- [ ] **Step 1: Download Three.js r158 ES module**

```powershell
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.min.js" -OutFile "F:\Test\NeoPulse-Dashboard\src\assets\three.module.min.js"
```

Expected: file ~580 KB created at `src/assets/three.module.min.js`.

Verify: `(Get-Item "F:\Test\NeoPulse-Dashboard\src\assets\three.module.min.js").Length` — should be > 400000.

- [ ] **Step 2: Update `src/shared/constants.js`**

Replace the entire file with:

```js
export const VERSION = '1.0.0';

export const DEFAULTS = {
  theme: 'neon-blue',
  animationIntensity: 'medium',
  particlesEnabled: true,
  soundsEnabled: false,
  searchEngine: 'google',
  refreshInterval: 300,
  notes: '',
  privacyDismissed: false,
  quickLinks: [
    { label: 'GitHub',   url: 'https://github.com',           icon: '🐙' },
    { label: 'Gmail',    url: 'https://mail.google.com',      icon: '📧' },
    { label: 'YouTube',  url: 'https://youtube.com',          icon: '▶' },
    { label: 'Maps',     url: 'https://maps.google.com',      icon: '🗺' },
    { label: 'Drive',    url: 'https://drive.google.com',     icon: '💾' },
    { label: 'Reddit',   url: 'https://reddit.com',           icon: '🤖' },
  ],
  widgets: {
    clock: true, network: true, quickLinks: true,
    notes: true, bookmarks: false, weather: false,
  },
  weatherCity:  '',
  weatherUnits: 'metric',
};

export const SEARCH_ENGINES = {
  google:     'https://www.google.com/search?q=',
  bing:       'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
};

export const PARTICLE_COUNTS = { off: 0, low: 20, medium: 50, high: 100 };

export const PING_URL         = 'https://www.google.com/generate_204';
export const DEFAULT_DOWNLOAD_URL = 'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js';
export const UPLOAD_URL       = 'https://httpbin.org/post';
export const IP_API_URL       = 'https://ipwho.is/';
export const IP_FALLBACK_URL  = 'https://api.ipify.org?format=json';
export const WTTR_BASE_URL    = 'https://wttr.in/';
export const UPLOAD_TIMEOUT_MS = 10000;
```

- [ ] **Step 3: Update `manifest.json`**

Replace the entire file with:

```json
{
  "manifest_version": 3,
  "name": "NeoPulse Dashboard",
  "version": "1.0.0",
  "description": "A futuristic cyberpunk New Tab dashboard with live network stats, quick links, notes, and glassmorphism UI.",

  "icons": {
    "16":  "src/assets/icons/icon16.png",
    "32":  "src/assets/icons/icon32.png",
    "48":  "src/assets/icons/icon48.png",
    "128": "src/assets/icons/icon128.png"
  },

  "chrome_url_overrides": {
    "newtab": "src/newtab/index.html"
  },

  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },

  "side_panel": {
    "default_path": "src/sidepanel/sidepanel.html"
  },

  "options_ui": {
    "page": "src/options/options.html",
    "open_in_tab": true
  },

  "permissions": [
    "storage",
    "sidePanel",
    "bookmarks",
    "tabs"
  ],

  "host_permissions": [
    "https://www.google.com/generate_204",
    "https://cdn.jsdelivr.net/*",
    "https://httpbin.org/*",
    "https://ipwho.is/*",
    "https://api.ipify.org/*",
    "https://wttr.in/*"
  ],

  "content_security_policy": {
    "extension_pages": "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://www.google.com https://cdn.jsdelivr.net https://httpbin.org https://ipwho.is https://api.ipify.org https://wttr.in; img-src 'self' data:; script-src 'self'"
  },

  "action": {
    "default_title": "NeoPulse Dashboard",
    "default_icon": {
      "16":  "src/assets/icons/icon16.png",
      "32":  "src/assets/icons/icon32.png",
      "48":  "src/assets/icons/icon48.png",
      "128": "src/assets/icons/icon128.png"
    }
  }
}
```

- [ ] **Step 4: Validate manifest JSON**

```powershell
Get-Content "F:\Test\NeoPulse-Dashboard\manifest.json" | ConvertFrom-Json | Select-Object manifest_version, name, version
```

Expected: `manifest_version: 3`, `name: NeoPulse Dashboard`, `version: 1.0.0`.

- [ ] **Step 5: Commit**

```powershell
cd "F:\Test"
git add NeoPulse-Dashboard/src/assets/three.module.min.js NeoPulse-Dashboard/src/shared/constants.js NeoPulse-Dashboard/manifest.json
git commit -m "feat: add Three.js r158, ipify fallback to constants and manifest"
```

---

## Task 2: Fix network.js (Upload Timeout + IP Fallback)

**Files:**
- Modify: `src/shared/network.js`

- [ ] **Step 1: Replace `src/shared/network.js` entirely**

```js
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
```

- [ ] **Step 2: Commit**

```powershell
cd "F:\Test"
git add NeoPulse-Dashboard/src/shared/network.js
git commit -m "fix: add AbortController timeout to upload, fallback IP via ipify"
```

---

## Task 3: Overhaul index.html + styles.css

**Files:**
- Overhaul: `src/newtab/index.html`
- Overhaul: `src/newtab/styles.css`

- [ ] **Step 1: Replace `src/newtab/index.html` entirely**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://www.google.com https://cdn.jsdelivr.net https://httpbin.org https://ipwho.is https://api.ipify.org https://wttr.in; img-src 'self' data:; script-src 'self'" />
  <title>NeoPulse Dashboard</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>

  <canvas id="scene-canvas"></canvas>

  <!-- Search overlay — JS positions this over the 3D pedestal -->
  <div id="search-overlay">
    <form id="search-form" autocomplete="off">
      <input
        id="search-input"
        type="search"
        placeholder="Search the web…"
        spellcheck="false"
        aria-label="Search query"
      />
      <select id="search-engine-select" aria-label="Search engine">
        <option value="google">Google</option>
        <option value="bing">Bing</option>
        <option value="duckduckgo">DDG</option>
      </select>
    </form>
  </div>

  <!-- Footer: settings + side panel buttons -->
  <div id="footer-controls">
    <button id="btn-settings"  type="button" title="Open Settings"    aria-label="Open Settings">⚙</button>
    <button id="btn-sidepanel" type="button" title="Open Side Panel"  aria-label="Open Side Panel">◫</button>
    <span id="footer-version"></span>
  </div>

  <!-- First-run privacy notice -->
  <div id="privacy-notice" hidden>
    <p>NeoPulse stores notes and settings <strong>locally on this device only</strong>.
       Speed tests make anonymous requests to measure latency.</p>
    <button id="privacy-dismiss">Got it</button>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Replace `src/newtab/styles.css` entirely**

```css
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');

/* ── Reset ─────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #050000;
}

/* ── Three.js canvas ────────────────────────────────────────── */
#scene-canvas {
  position: fixed;
  inset: 0;
  display: block;
  width: 100vw;
  height: 100vh;
}

/* ── Search overlay ─────────────────────────────────────────── */
#search-overlay {
  position: fixed;
  z-index: 10;
  transform: translateX(-50%);
  pointer-events: auto;
}

#search-form {
  display: flex;
  align-items: center;
  gap: 8px;
}

#search-input {
  background: rgba(0, 0, 0, 0.88);
  border: 1px solid #8b0000;
  border-radius: 6px;
  color: #ff9999;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.95rem;
  padding: 8px 14px;
  outline: none;
  width: 320px;
  caret-color: #ff1a1a;
  transition: border-color 0.2s, box-shadow 0.2s;
}

#search-input:focus {
  border-color: #ff1a1a;
  box-shadow: 0 0 14px rgba(255, 26, 26, 0.55);
}

#search-input::placeholder { color: rgba(200, 60, 60, 0.4); }

#search-engine-select {
  background: rgba(0, 0, 0, 0.88);
  border: 1px solid #5c0000;
  border-radius: 6px;
  color: #cc4444;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  padding: 8px 8px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

#search-engine-select:focus { border-color: #ff1a1a; }
#search-engine-select option { background: #0a0000; }

/* ── Footer controls ────────────────────────────────────────── */
#footer-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
}

#footer-controls button {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid #5c0000;
  background: rgba(0, 0, 0, 0.78);
  color: #cc4444;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, color 0.2s, box-shadow 0.2s;
}

#footer-controls button:hover {
  border-color: #ff1a1a;
  color: #ff6666;
  box-shadow: 0 0 14px rgba(255, 26, 26, 0.45);
}

#footer-version {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.6rem;
  color: rgba(100, 30, 30, 0.55);
  letter-spacing: 0.08em;
}

/* ── Privacy notice ─────────────────────────────────────────── */
#privacy-notice {
  position: fixed;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  background: rgba(10, 0, 0, 0.96);
  border: 1px solid #5c0000;
  border-radius: 8px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.8rem;
  color: #aa4444;
  max-width: min(500px, calc(100vw - 32px));
  box-shadow: 0 0 24px rgba(139, 0, 0, 0.3);
}

#privacy-notice strong { color: #ff6666; }

#privacy-dismiss {
  background: transparent;
  border: 1px solid #8b0000;
  border-radius: 4px;
  color: #cc4444;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.72rem;
  padding: 5px 12px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color 0.2s, color 0.2s;
}

#privacy-dismiss:hover {
  border-color: #ff1a1a;
  color: #ff6666;
}

/* ── Scanline overlay (subtle CRT effect) ───────────────────── */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.025) 2px,
    rgba(0, 0, 0, 0.025) 4px
  );
}

[hidden] { display: none !important; }
```

- [ ] **Step 3: Reload extension in Chrome and open a new tab**

The page should show a solid dark red/black background (Three.js canvas will be black since scene.js does not exist yet). No console errors about missing elements. The search overlay and footer buttons will not appear yet.

Expected in DevTools Console: only `[NeoPulse] Init failed: ...` error about missing `scene.js` module — acceptable at this stage.

- [ ] **Step 4: Commit**

```powershell
cd "F:\Test"
git add NeoPulse-Dashboard/src/newtab/index.html NeoPulse-Dashboard/src/newtab/styles.css
git commit -m "feat: replace dashboard with full-viewport canvas shell (crimson theme)"
```

---

## Task 4: Create room.js

**Files:**
- Create: `src/newtab/room.js`

- [ ] **Step 1: Create `src/newtab/room.js`**

```js
import {
  PlaneGeometry, BoxGeometry, CylinderGeometry, SphereGeometry,
  Mesh, MeshStandardMaterial, ShaderMaterial, CanvasTexture,
  DoubleSide, RepeatWrapping,
} from '../assets/three.module.min.js';

// ── Seeded PRNG — deterministic placement every load ───────────
function mulberry32(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeFloorCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const rand = mulberry32(7);
  ctx.fillStyle = '#0a0606';
  ctx.fillRect(0, 0, 512, 512);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#1f0a0a';
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  for (let i = 0; i < 25; i++) {
    const x = rand() * 512, y = rand() * 512;
    const len = 20 + rand() * 55;
    const a = rand() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.strokeStyle = `rgba(80, 0, 0, ${0.2 + rand() * 0.5})`;
    ctx.lineWidth = rand() * 1.2 + 0.3;
    ctx.stroke();
  }
  return c;
}

function makeWallCanvas() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const rand = mulberry32(13);
  ctx.fillStyle = '#0d0808';
  ctx.fillRect(0, 0, 512, 256);
  const bW = 64, bH = 32;
  for (let row = 0; row * bH < 256; row++) {
    const offset = (row % 2) * (bW / 2);
    for (let col = -1; col * bW < 512 + bW; col++) {
      const x = col * bW + offset, y = row * bH;
      ctx.strokeStyle = `rgba(6, 0, 0, ${0.5 + rand() * 0.35})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, bW - 2, bH - 2);
    }
  }
  return c;
}

const BLOOD_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BLOOD_FRAG = `
  uniform float time;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    float r1 = sin(uv.x * 8.0 - time * 0.6) * 0.04;
    float r2 = sin(uv.y * 8.0 - time * 0.5) * 0.04;
    uv.x += r1; uv.y += r2;
    uv = clamp(uv, 0.0, 1.0);
    float edge = smoothstep(0.0, 0.18,
      min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
    vec3 dark   = vec3(0.05, 0.0, 0.0);
    vec3 bright = vec3(0.48, 0.02, 0.02);
    vec3 col = mix(dark, bright, uv.y + (r1 + r2) * 2.5);
    gl_FragColor = vec4(col, edge * 0.92);
  }
`;

// Exported so app.js can increment time uniform each frame
export const bloodUniforms = { time: { value: 0 } };

export function buildRoom(scene) {
  // ── Floor ──
  const floorTex = new CanvasTexture(makeFloorCanvas());
  floorTex.wrapS = floorTex.wrapT = RepeatWrapping;
  floorTex.repeat.set(3, 3);
  const floor = new Mesh(
    new PlaneGeometry(24, 24),
    new MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Walls ──
  const wallTex = new CanvasTexture(makeWallCanvas());
  wallTex.wrapS = wallTex.wrapT = RepeatWrapping;
  const wallMat = new MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0 });

  const leftWall = new Mesh(new BoxGeometry(0.3, 10, 24), wallMat);
  leftWall.position.set(-9, 5, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new Mesh(new BoxGeometry(0.3, 10, 24), wallMat);
  rightWall.position.set(9, 5, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  const backWall = new Mesh(new BoxGeometry(18, 10, 0.3), wallMat);
  backWall.position.set(0, 5, -8);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // ── Blood pool ──
  const bloodMesh = new Mesh(
    new PlaneGeometry(12, 12),
    new ShaderMaterial({
      uniforms:       bloodUniforms,
      vertexShader:   BLOOD_VERT,
      fragmentShader: BLOOD_FRAG,
      transparent:    true,
      side:           DoubleSide,
      depthWrite:     false,
    })
  );
  bloodMesh.rotation.x = -Math.PI / 2;
  bloodMesh.position.set(0, 0.01, -1);
  scene.add(bloodMesh);

  // ── Splatter droplets ──
  const splatterMat = new MeshStandardMaterial({ color: 0x3d0000, roughness: 0.85 });
  const sr = mulberry32(99);
  for (let i = 0; i < 8; i++) {
    const radius = 6 + sr() * 3;
    const angle  = sr() * Math.PI * 2;
    const drop = new Mesh(new SphereGeometry(0.04 + sr() * 0.07, 6, 6), splatterMat);
    drop.position.set(Math.cos(angle) * radius, 0.005, -1 + Math.sin(angle) * radius);
    scene.add(drop);
  }
}

export function buildSkeletonPile(scene) {
  const rand    = mulberry32(12345);
  const boneMat = new MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.85, metalness: 0 });
  const eyeMat  = new MeshStandardMaterial({ color: 0x000000, emissive: 0x050000, emissiveIntensity: 1 });

  for (let i = 0; i < 40; i++) {
    const angle       = rand() * Math.PI * 2;
    const heightFactor = rand();
    const radius      = 2.5 * (1 - heightFactor * 0.7) * rand();
    const x           = Math.cos(angle) * radius;
    const z           = -4 + Math.sin(angle) * radius;
    const y           = heightFactor * 1.8 * Math.max(0, 1 - radius / 2.5);

    if (rand() < 0.25) {
      // Skull
      const skull = new Mesh(new BoxGeometry(0.25, 0.2, 0.22), boneMat);
      skull.position.set(x, y + 0.1, z);
      skull.rotation.set(rand() * 0.8 - 0.4, rand() * Math.PI * 2, rand() * 0.6 - 0.3);
      skull.castShadow = true;
      scene.add(skull);
      for (let e = 0; e < 2; e++) {
        const eye = new Mesh(new SphereGeometry(0.038, 6, 6), eyeMat);
        eye.position.set(x + (e ? 0.065 : -0.065), y + 0.12, z - 0.09);
        scene.add(eye);
      }
    } else {
      // Long bone
      const boneLen = 0.6 + rand() * 0.8;
      const bone = new Mesh(new CylinderGeometry(0.035, 0.04, boneLen, 6), boneMat);
      bone.position.set(x, y + boneLen / 2, z);
      bone.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      bone.castShadow = true;
      scene.add(bone);
    }
  }

  // ── Throne back columns + crossbeams ──
  const boneColMat = new MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.85 });
  const darkMat    = new MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

  for (const side of [-1, 1]) {
    const col = new Mesh(new CylinderGeometry(0.1, 0.1, 2.5, 8), boneColMat);
    col.position.set(side * 0.9, 3.45, -4);
    col.castShadow = true;
    scene.add(col);
  }

  for (let b = 0; b < 3; b++) {
    const beam = new Mesh(new BoxGeometry(1.8, 0.12, 0.12), darkMat);
    beam.position.set(0, 2.2 + b * 0.8, -4);
    scene.add(beam);
  }
}
```

- [ ] **Step 2: Commit**

```powershell
cd "F:\Test"
git add NeoPulse-Dashboard/src/newtab/room.js
git commit -m "feat: add room.js — floor, walls, blood pool shader, skeleton pile"
```

---

## Task 5: Create sukuna.js

**Files:**
- Create: `src/newtab/sukuna.js`

- [ ] **Step 1: Create `src/newtab/sukuna.js`**

```js
import {
  Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  LineSegments, BufferGeometry, Float32BufferAttribute,
} from '../assets/three.module.min.js';

export function buildSukuna(scene) {
  const root = new Group();
  root.position.set(0, 2.2, -4);
  scene.add(root);

  const bodyMat   = new MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 });
  const ghostMat  = new MeshStandardMaterial({ color: 0x111111, roughness: 0.8, transparent: true, opacity: 0.35 });
  const ghostMat2 = new MeshStandardMaterial({ color: 0x111111, roughness: 0.8, transparent: true, opacity: 0.2 });
  const eyeMat    = new MeshBasicMaterial({ color: 0xff0000 });

  // ── Torso ──
  const torso = new Mesh(new BoxGeometry(1.2, 1.4, 0.7), bodyMat);
  torso.castShadow = true;
  root.add(torso);

  // ── Head ──
  const head = new Mesh(new BoxGeometry(0.9, 0.9, 0.8), bodyMat);
  head.position.set(0, 1.15, 0);
  head.castShadow = true;
  root.add(head);

  // ── Cross-legged legs ──
  const legDef = [
    { x: -0.65, rx:  0.6, rz: -0.4 },  // left upper
    { x:  0.65, rx:  0.6, rz:  0.4 },  // right upper
  ];
  legDef.forEach(({ x, rx, rz }) => {
    const leg = new Mesh(new CylinderGeometry(0.18, 0.2, 1.0, 8), bodyMat);
    leg.position.set(x, -0.85, 0.3);
    leg.rotation.set(rx, 0, rz);
    leg.castShadow = true;
    root.add(leg);
  });

  const lowerLegDef = [
    { x: -1.1, rz: -0.3 },
    { x:  1.1, rz:  0.3 },
  ];
  lowerLegDef.forEach(({ x, rz }) => {
    const leg = new Mesh(new CylinderGeometry(0.16, 0.18, 0.9, 8), bodyMat);
    leg.position.set(x, -1.1, -0.2);
    leg.rotation.set(1.2, 0, rz);
    leg.castShadow = true;
    root.add(leg);
  });

  // ── Arms resting on knees ──
  const leftArm  = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), bodyMat);
  leftArm.position.set(-0.8, -0.3, 0.4);
  leftArm.rotation.set(0.8, 0, -0.15);
  leftArm.castShadow = true;
  root.add(leftArm);

  const rightArm = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), bodyMat);
  rightArm.position.set(0.8, -0.3, 0.4);
  rightArm.rotation.set(0.8, 0, 0.15);
  rightArm.castShadow = true;
  root.add(rightArm);

  // ── Ghost arms (extra pair) ──
  const ghostArmL1 = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), ghostMat);
  ghostArmL1.position.set(-1.05, -0.1, -0.1);
  ghostArmL1.rotation.set(0.4, 0, -0.5);
  root.add(ghostArmL1);

  const ghostArmL2 = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), ghostMat2);
  ghostArmL2.position.set(-1.25, 0.1, -0.3);
  ghostArmL2.rotation.set(0.2, 0, -0.8);
  root.add(ghostArmL2);

  const ghostArmR1 = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), ghostMat);
  ghostArmR1.position.set(1.05, -0.1, -0.1);
  ghostArmR1.rotation.set(0.4, 0, 0.5);
  root.add(ghostArmR1);

  const ghostArmR2 = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), ghostMat2);
  ghostArmR2.position.set(1.25, 0.1, -0.3);
  ghostArmR2.rotation.set(0.2, 0, 0.8);
  root.add(ghostArmR2);

  // ── Eyes — 4 total (2 normal + 2 above) ──
  [
    [-0.17, 1.20, 0.42],
    [ 0.17, 1.20, 0.42],
    [-0.17, 1.42, 0.42],
    [ 0.17, 1.42, 0.42],
  ].forEach(([x, y, z]) => {
    const eye = new Mesh(new SphereGeometry(0.055, 8, 8), eyeMat);
    eye.position.set(x, y, z);
    root.add(eye);
  });

  // ── Tattoo line segments ──
  root.add(buildFaceTattoos(head.position));
  root.add(buildTorsoTattoos());

  return { root, torso, head, ghostArmL1, ghostArmL2, ghostArmR1, ghostArmR2, eyeMat };
}

function buildFaceTattoos(headPos) {
  const pts = [
    // 3 horizontal bars (forehead → cheek)
    -0.3,  0.28, 0,   0.3,  0.28, 0,
    -0.3,  0.08, 0,   0.3,  0.08, 0,
    -0.3, -0.15, 0,   0.3, -0.15, 0,
    // V branching down chin
    -0.12, -0.15, 0,  -0.2, -0.4, 0,
     0.12, -0.15, 0,   0.2, -0.4, 0,
    -0.2,  -0.4,  0,   0,   -0.44, 0,
     0.2,  -0.4,  0,   0,   -0.44, 0,
  ];
  const ls = makeLineSegs(pts);
  ls.position.set(headPos.x, headPos.y, 0.41);
  return ls;
}

function buildTorsoTattoos() {
  const pts = [
    -0.5,  0.4, 0,   0,    0.1, 0,
     0,    0.1, 0,   0.5,  0.4, 0,
    -0.5,  0.0, 0,   0,   -0.3, 0,
     0,   -0.3, 0,   0.5,  0.0, 0,
    -0.3,  0.4, 0,  -0.3, -0.55, 0,
     0.3,  0.4, 0,   0.3, -0.55, 0,
  ];
  const ls = makeLineSegs(pts);
  ls.position.set(0, 0, 0.36);
  return ls;
}

function makeLineSegs(pts) {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return new LineSegments(geo, new LineBasicMaterial({ color: 0xff1a1a }));
}

export function animateSukuna(refs, elapsed) {
  const t = elapsed;

  // Breathing (torso scale + head follows)
  const breathe = 1 + 0.02 * Math.sin(t * 0.7);
  refs.torso.scale.y = breathe;
  refs.head.position.y = 1.15 + (breathe - 1) * 0.7;

  // Ghost arm drift
  refs.ghostArmL1.rotation.z = -0.5 + Math.sin(t * 0.40 + 1.0) * 0.09;
  refs.ghostArmL2.rotation.z = -0.8 + Math.sin(t * 0.35 + 2.1) * 0.12;
  refs.ghostArmR1.rotation.z =  0.5 + Math.sin(t * 0.40 + 1.5) * 0.09;
  refs.ghostArmR2.rotation.z =  0.8 + Math.sin(t * 0.35 + 0.5) * 0.12;

  // Eye glow pulse
  const l = 0.4 + 0.25 * Math.sin(t * 1.5);
  refs.eyeMat.color.setRGB(l, 0, 0);
}
```

- [ ] **Step 2: Commit**

```powershell
cd "F:\Test"
git add NeoPulse-Dashboard/src/newtab/sukuna.js
git commit -m "feat: add sukuna.js — low-poly geometry, tattoos, ghost arms, idle animation"
```

---

## Task 6: Create ui-objects.js

**Files:**
- Create: `src/newtab/ui-objects.js`

- [ ] **Step 1: Create `src/newtab/ui-objects.js`**

```js
import {
  BoxGeometry, PlaneGeometry, Mesh,
  MeshStandardMaterial, CanvasTexture, Vector3,
} from '../assets/three.module.min.js';

// ── Wall Clock ─────────────────────────────────────────────────
// Positioned on the left wall at x=-7.5. The +X face of the
// BoxGeometry (material index 0) naturally points toward the room
// centre, so no rotation needed.
export function buildClock(scene) {
  const canvas  = document.createElement('canvas');
  canvas.width  = canvas.height = 256;
  const texture = new CanvasTexture(canvas);

  const ironMat = new MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.5 });
  const faceMat = new MeshStandardMaterial({
    map: texture,
    emissive: 0x200000,
    emissiveIntensity: 0.4,
  });

  // Index 0 = +X face (faces room centre from left wall) — assigned canvas texture.
  // Indices 1-5 get the iron material.
  const mesh = new Mesh(new BoxGeometry(1.4, 1.4, 0.12), [
    faceMat, ironMat, ironMat, ironMat, ironMat, ironMat,
  ]);
  mesh.position.set(-7.5, 3.5, -2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  return {
    mesh,
    updateTexture(now) {
      drawClockFace(canvas, now);
      texture.needsUpdate = true;
      faceMat.emissiveIntensity = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(now.getTime() / 1000 * 0.7));
    },
  };
}

function drawClockFace(canvas, now) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2, r = W * 0.4;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#040000';
  ctx.fillRect(0, 0, W, H);

  // Gold outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Crimson face ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#5c0000';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Tick marks
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const isMajor = i % 3 === 0;
    const outer = r - 1, inner = outer - (isMajor ? 14 : 7);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.lineTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.strokeStyle = isMajor ? '#b8860b' : '#8b0000';
    ctx.lineWidth   = isMajor ? 2.5 : 1;
    ctx.stroke();
  }

  const h = now.getHours() % 12 + now.getMinutes() / 60;
  const m = now.getMinutes() + now.getSeconds() / 60;
  const s = now.getSeconds() + now.getMilliseconds() / 1000;

  drawHand(ctx, cx, cy, (h / 12) * Math.PI * 2 - Math.PI / 2, r * 0.52, '#b8860b', 4.5);
  drawHand(ctx, cx, cy, (m / 60) * Math.PI * 2 - Math.PI / 2, r * 0.73, '#cc1100', 3);
  drawHand(ctx, cx, cy, (s / 60) * Math.PI * 2 - Math.PI / 2, r * 0.84, '#ff1a1a', 1.5);

  // Centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#b8860b';
  ctx.fill();

  // Date string
  const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  ctx.fillStyle = '#7a1a1a';
  ctx.font = '10px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`, cx, cy + r * 0.38);
}

function drawHand(ctx, cx, cy, angle, length, color, width) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.lineCap     = 'round';
  ctx.stroke();
}

// ── Quick Link Panels ──────────────────────────────────────────
// 6 panels on the right wall in a 2-column × 3-row grid.
// PlaneGeometry with rotation.y = -Math.PI/2 makes the panel
// normal point in -X direction (toward room centre from right wall).
export function buildQuickLinkPanels(scene, links) {
  const POSITIONS = [        // [z, y]
    [-5.0, 4.5], [-3.5, 4.5],
    [-5.0, 3.2], [-3.5, 3.2],
    [-5.0, 1.9], [-3.5, 1.9],
  ];

  const panels = links.slice(0, 6).map((link, i) => {
    const [z, y] = POSITIONS[i];
    const canvas  = document.createElement('canvas');
    canvas.width  = 192;
    canvas.height = 144;
    const texture = new CanvasTexture(canvas);
    const mat = new MeshStandardMaterial({
      map: texture,
      emissive: 0x2a0000,
      emissiveIntensity: 0.2,
      roughness: 0.8,
    });
    const mesh = new Mesh(new PlaneGeometry(1.2, 0.9), mat);
    mesh.position.set(7.78, y, z);
    mesh.rotation.y = -Math.PI / 2;
    scene.add(mesh);

    drawLinkPanel(canvas, link, false);
    texture.needsUpdate = true;

    return { mesh, mat, canvas, texture, link };
  });

  return {
    panels,
    setHover(index, hovered) {
      const p = panels[index];
      if (!p) return;
      p.mat.emissiveIntensity = hovered ? 0.6 : 0.2;
      p.mesh.position.x = 7.78 + (hovered ? -0.08 : 0);
      drawLinkPanel(p.canvas, p.link, hovered);
      p.texture.needsUpdate = true;
    },
  };
}

function drawLinkPanel(canvas, link, hovered) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = hovered ? '#1f0000' : '#0a0000';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = hovered ? '#ff1a1a' : '#5c0000';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  ctx.font = '34px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText(link.icon ?? '🔗', W / 2, H * 0.43);

  ctx.fillStyle = hovered ? '#ff8888' : '#cc4444';
  ctx.font = '600 11px "Share Tech Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(link.label, W / 2, H * 0.72);
}

// ── Network Status Strip ───────────────────────────────────────
// Thin panel on the back wall above the throne.
// PlaneGeometry faces +Z by default; positioned at z=-7.78
// so the camera (at z=8) sees its front face.
export function buildNetworkStrip(scene) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 560;
  canvas.height = 40;
  const texture = new CanvasTexture(canvas);

  const mat = new MeshStandardMaterial({
    map: texture,
    emissive: 0x110000,
    emissiveIntensity: 0.3,
    roughness: 0.9,
  });

  const mesh = new Mesh(new PlaneGeometry(7, 0.5), mat);
  mesh.position.set(0, 6.2, -7.78);
  scene.add(mesh);

  drawNetworkStrip(canvas, { online: false, latencyMs: null, downloadMbps: null, uploadMbps: null, ip: null });
  texture.needsUpdate = true;

  return {
    mesh,
    updateTexture(data) {
      drawNetworkStrip(canvas, data);
      texture.needsUpdate = true;
    },
  };
}

function drawNetworkStrip(canvas, { online, latencyMs, downloadMbps, uploadMbps, ip }) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, y = H / 2;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,0,0,0.85)';
  ctx.fillRect(0, 0, W, H);

  ctx.beginPath();
  ctx.arc(18, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = online ? '#39ff14' : '#ff2d55';
  ctx.fill();

  const dl = downloadMbps != null ? `${downloadMbps}` : '—';
  const ul = uploadMbps   != null ? `${uploadMbps}`   : '—';
  const ms = latencyMs    != null ? `${latencyMs}ms`  : '—';
  const ip_ = ip ?? '—';

  ctx.fillStyle = '#ff6666';
  ctx.font = '13px "Share Tech Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${online ? 'ONLINE' : 'OFFLINE'}   ↓ ${dl} Mbps   ↑ ${ul} Mbps   ${ms}   ${ip_}`,
    34, y
  );
}

// ── Search Pedestal ────────────────────────────────────────────
// Low stone platform in the foreground. The HTML search overlay
// is positioned above it using getScreenPosition().
export function buildSearchPedestal(scene) {
  const mat = new MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0.1 });
  const trimMat = new MeshStandardMaterial({
    color: 0x5c3800, roughness: 0.6, metalness: 0.8,
    emissive: 0x1a0800, emissiveIntensity: 0.3,
  });

  const base = new Mesh(new BoxGeometry(2.4, 0.15, 0.6), mat);
  base.position.set(0, 0.075, 5.5);
  base.receiveShadow = true;
  scene.add(base);

  // Gold trim on front edge
  const trim = new Mesh(new BoxGeometry(2.4, 0.04, 0.02), trimMat);
  trim.position.set(0, 0.13, 5.81);
  scene.add(trim);

  return {
    mesh: base,
    getScreenPosition(camera, canvasW, canvasH) {
      const v = new Vector3();
      base.getWorldPosition(v);
      v.project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * canvasW,
        y: (-v.y * 0.5 + 0.5) * canvasH,
      };
    },
  };
}
```

- [ ] **Step 2: Commit**

```powershell
cd "F:\Test"
git add NeoPulse-Dashboard/src/newtab/ui-objects.js
git commit -m "feat: add ui-objects.js — clock, link panels, network strip, search pedestal"
```

---

## Task 7: Create scene.js

**Files:**
- Create: `src/newtab/scene.js`

- [ ] **Step 1: Create `src/newtab/scene.js`**

```js
import {
  WebGLRenderer, Scene, PerspectiveCamera, Clock,
  AmbientLight, PointLight,
  Raycaster, Vector2,
  PCFSoftShadowMap,
} from '../assets/three.module.min.js';

let _renderer, _scene, _camera, _clock, _raycaster, _mouse;
let _rafId = null;

export function initScene(canvas) {
  _renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = PCFSoftShadowMap;
  _renderer.setClearColor(0x050000);

  _scene = new Scene();

  _camera = new PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
  _camera.position.set(0, 3.5, 8);
  _camera.lookAt(0, 1.5, 0);

  _clock    = new Clock();
  _raycaster = new Raycaster();
  _mouse     = new Vector2(10, 10); // off-screen so no accidental intersects on load

  // ── Lighting ──
  _scene.add(new AmbientLight(0x200000, 0.8));

  const backLight = new PointLight(0xcc1100, 3, 25, 2);
  backLight.position.set(0, 4, -5);
  backLight.castShadow = true;
  backLight.shadow.mapSize.set(512, 512);
  _scene.add(backLight);

  const goldLight = new PointLight(0xb8860b, 1.5, 20, 2);
  goldLight.position.set(-4, 6, 2);
  goldLight.castShadow = true;
  goldLight.shadow.mapSize.set(512, 512);
  _scene.add(goldLight);

  const poolLight = new PointLight(0x800000, 2, 12, 2);
  poolLight.position.set(0, 0.5, -1);
  _scene.add(poolLight);

  window.addEventListener('resize', _onResize);
  window.addEventListener('mousemove', _onMouseMove);

  return { renderer: _renderer, scene: _scene, camera: _camera };
}

function _onResize() {
  _camera.aspect = window.innerWidth / window.innerHeight;
  _camera.updateProjectionMatrix();
  _renderer.setSize(window.innerWidth, window.innerHeight);
}

function _onMouseMove(e) {
  _mouse.x = (e.clientX / window.innerWidth)  *  2 - 1;
  _mouse.y = (e.clientY / window.innerHeight) * -2 + 1;
}

// onFrame(delta, elapsed) — called each animation frame before render
export function startLoop(onFrame) {
  function loop() {
    _rafId = requestAnimationFrame(loop);
    const delta   = _clock.getDelta();
    const elapsed = _clock.getElapsedTime();
    _raycaster.setFromCamera(_mouse, _camera);
    onFrame(delta, elapsed);
    _renderer.render(_scene, _camera);
  }
  _rafId = requestAnimationFrame(loop);
}

export function stopLoop() {
  if (_rafId != null) { cancelAnimationFrame(_rafId); _rafId = null; }
}

export function getRenderer()  { return _renderer; }
export function getScene()     { return _scene; }
export function getCamera()    { return _camera; }
export function getRaycaster() { return _raycaster; }
```

- [ ] **Step 2: Commit**

```powershell
cd "F:\Test"
git add NeoPulse-Dashboard/src/newtab/scene.js
git commit -m "feat: add scene.js — WebGLRenderer, camera, lights, animation loop, raycasting"
```

---

## Task 8: Overhaul app.js

**Files:**
- Overhaul: `src/newtab/app.js`

- [ ] **Step 1: Replace `src/newtab/app.js` entirely**

```js
import { DEFAULTS, SEARCH_ENGINES, VERSION } from '../shared/constants.js';
import { getPrefs, setPrefs, onPrefsChange }  from '../shared/storage.js';
import { runNetworkCheck, scheduleAutoRefresh } from '../shared/network.js';
import { initScene, startLoop, getCamera, getRenderer, getRaycaster } from './scene.js';
import { buildRoom, buildSkeletonPile, bloodUniforms } from './room.js';
import { buildSukuna, animateSukuna } from './sukuna.js';
import { buildClock, buildQuickLinkPanels, buildNetworkStrip, buildSearchPedestal } from './ui-objects.js';

let prefs            = { ...DEFAULTS };
let autoRefreshTimer = null;

// 3D object handles (set during init)
let clockObj        = null;
let quickLinksObj   = null;
let networkStripObj = null;
let pedestalObj     = null;
let sukunaRefs      = null;

async function init() {
  try {
    prefs = await getPrefs();
  } catch {
    showBanner('⚠ Storage unavailable — settings not saved this session', '#ff2d55');
    prefs = { ...DEFAULTS };
  }

  const canvas = document.getElementById('scene-canvas');
  const { scene } = initScene(canvas);

  // ── Build 3D scene ──
  buildRoom(scene);
  buildSkeletonPile(scene);
  sukunaRefs    = buildSukuna(scene);
  clockObj      = buildClock(scene);
  quickLinksObj = buildQuickLinkPanels(
    scene,
    (prefs.quickLinks?.length ? prefs.quickLinks : DEFAULTS.quickLinks)
  );
  networkStripObj = buildNetworkStrip(scene);
  pedestalObj     = buildSearchPedestal(scene);

  // ── HTML overlays ──
  setupSearch();
  setupFooter();
  positionSearchOverlay();
  window.addEventListener('resize', positionSearchOverlay);
  showPrivacyNotice(prefs.privacyDismissed);

  // ── Raycasting: quick link hover + click ──
  const raycaster  = getRaycaster();
  const linkMeshes = quickLinksObj.panels.map(p => p.mesh);
  let hoveredIndex = -1;

  window.addEventListener('click', () => {
    if (hoveredIndex >= 0) {
      window.location.href = quickLinksObj.panels[hoveredIndex].link.url;
    }
  });

  // ── Network checks ──
  initNetwork();

  // ── Animation loop ──
  let lastSecond = -1;
  startLoop((delta, elapsed) => {
    // Blood pool ripple
    bloodUniforms.time.value = elapsed;

    // Sukuna idle
    animateSukuna(sukunaRefs, elapsed);

    // Clock — redraw canvas once per second
    const now = new Date();
    if (now.getSeconds() !== lastSecond) {
      lastSecond = now.getSeconds();
      clockObj.updateTexture(now);
    }

    // Quick link hover via raycasting
    const hits     = raycaster.intersectObjects(linkMeshes);
    const newHover = hits.length > 0 ? linkMeshes.indexOf(hits[0].object) : -1;
    if (newHover !== hoveredIndex) {
      if (hoveredIndex >= 0) quickLinksObj.setHover(hoveredIndex, false);
      if (newHover     >= 0) quickLinksObj.setHover(newHover,    true);
      hoveredIndex = newHover;
      document.body.style.cursor = newHover >= 0 ? 'pointer' : 'default';
    }
  });

  listenForPrefChanges();
}

// ── Search overlay positioning ─────────────────────────────────
function positionSearchOverlay() {
  if (!pedestalObj) return;
  const camera   = getCamera();
  const renderer = getRenderer();
  const cW = renderer.domElement.clientWidth;
  const cH = renderer.domElement.clientHeight;
  const { x, y } = pedestalObj.getScreenPosition(camera, cW, cH);
  const overlay = document.getElementById('search-overlay');
  if (overlay) {
    overlay.style.left = `${x}px`;
    overlay.style.top  = `${y - 30}px`; // sit just above pedestal top surface
  }
}

// ── Search form ────────────────────────────────────────────────
function setupSearch() {
  const form   = document.getElementById('search-form');
  const input  = document.getElementById('search-input');
  const select = document.getElementById('search-engine-select');

  if (select) select.value = prefs.searchEngine ?? 'google';

  select?.addEventListener('change', async () => {
    prefs.searchEngine = select.value;
    await setPrefs({ searchEngine: select.value });
  });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    const q = input?.value.trim();
    if (!q) return;
    const base = SEARCH_ENGINES[prefs.searchEngine] ?? SEARCH_ENGINES.google;
    window.location.href = base + encodeURIComponent(q);
  });

  // Auto-focus after a short delay so the 3D canvas initialises first
  setTimeout(() => input?.focus({ preventScroll: true }), 400);
}

// ── Footer buttons ─────────────────────────────────────────────
function setupFooter() {
  const ver = document.getElementById('footer-version');
  if (ver) ver.textContent = `v${VERSION}`;

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btn-sidepanel')?.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id });
    } catch { /* Chrome < 114 — silently ignore */ }
  });
}

// ── Privacy notice ─────────────────────────────────────────────
function showPrivacyNotice(dismissed) {
  const notice = document.getElementById('privacy-notice');
  const btn    = document.getElementById('privacy-dismiss');
  if (!notice || dismissed) return;
  notice.hidden = false;
  btn?.addEventListener('click', async () => {
    notice.hidden = true;
    await setPrefs({ privacyDismissed: true });
  });
}

// ── Network ────────────────────────────────────────────────────
function initNetwork() {
  window.addEventListener('online',  () =>
    networkStripObj?.updateTexture({ online: true,  latencyMs: null, downloadMbps: null, uploadMbps: null, ip: null }));
  window.addEventListener('offline', () =>
    networkStripObj?.updateTexture({ online: false, latencyMs: null, downloadMbps: null, uploadMbps: null, ip: null }));

  // First check ~1.4s after load so the scene is visible first
  setTimeout(triggerNetworkCheck, 1400);

  autoRefreshTimer = scheduleAutoRefresh(prefs.refreshInterval ?? 300, triggerNetworkCheck);
}

async function triggerNetworkCheck() {
  try {
    const result = await runNetworkCheck({
      pingUrl:     prefs.pingUrl,
      downloadUrl: prefs.downloadUrl,
    });
    networkStripObj?.updateTexture(result);
  } catch (err) {
    console.error('[NeoPulse] Network check failed:', err);
  }
}

// ── Live pref changes ──────────────────────────────────────────
function listenForPrefChanges() {
  onPrefsChange(changes => {
    if (changes.searchEngine) {
      prefs.searchEngine = changes.searchEngine.newValue;
      const sel = document.getElementById('search-engine-select');
      if (sel) sel.value = prefs.searchEngine;
    }
    if (changes.refreshInterval) {
      prefs.refreshInterval = changes.refreshInterval.newValue;
      if (autoRefreshTimer) clearInterval(autoRefreshTimer);
      autoRefreshTimer = scheduleAutoRefresh(prefs.refreshInterval, triggerNetworkCheck);
    }
  });
}

// ── Error guards ───────────────────────────────────────────────
window.onerror = (msg, src, line, col, err) => {
  console.error('[NeoPulse] Uncaught error:', msg, { src, line, col, err });
  return false;
};

window.addEventListener('unhandledrejection', e => {
  console.error('[NeoPulse] Unhandled rejection:', e.reason);
});

// ── Utility ────────────────────────────────────────────────────
function showBanner(msg, color = '#ff2d55') {
  const b = document.createElement('div');
  b.style.cssText = [
    'position:fixed', 'top:12px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:999', 'background:rgba(4,8,16,0.96)',
    `border:1px solid ${color}55`, 'border-radius:8px',
    'padding:10px 18px', 'font-family:monospace', 'font-size:12px',
    `color:${color}`,
  ].join(';');
  b.textContent = msg;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 5000);
}

init().catch(err => console.error('[NeoPulse] Init failed:', err));
```

- [ ] **Step 2: Commit**

```powershell
cd "F:\Test"
git add NeoPulse-Dashboard/src/newtab/app.js
git commit -m "feat: overhaul app.js — wire Three.js scene, search, network, raycasting"
```

---

## Task 9: Verify + Push

**Files:** None modified.

- [ ] **Step 1: Reload the extension in Chrome**

1. Open `chrome://extensions`
2. Click the **↺ reload** button on the NeoPulse Dashboard card
3. Open a new tab (`Ctrl+T`)

Expected result:
- Throne room fills the entire viewport — dark stone floor, blood pool with ripple, skeleton pile, Sukuna seated in centre
- Wall clock visible on left wall with animated hands
- Quick link panels visible on right wall (GitHub, Gmail, YouTube, Maps, Drive, Reddit)
- Network strip on back wall above the throne
- Search bar overlay visible in foreground over the stone pedestal
- Footer ⚙ and ◫ buttons visible bottom-right

- [ ] **Step 2: Open Chrome DevTools (F12) → Console tab**

Expected: **zero errors**. Any red errors indicate a problem. Common issues and fixes:

| Error | Fix |
|---|---|
| `Cannot resolve module '../assets/three.module.min.js'` | Three.js download failed — re-run Step 1 of Task 1 |
| `Uncaught SyntaxError in three.module.min.js` | Downloaded file corrupt — delete and re-download |
| `TypeError: _renderer is null` | scene.js init failed before other modules ran — check console for earlier error |
| Clock not visible | BoxGeometry material index issue — verify `buildClock` sets `faceMat` as index 0 |
| Quick links not visible | Check `rotation.y = -Math.PI / 2` in `buildQuickLinkPanels` |

- [ ] **Step 3: Verify raycasting + click**

Hover the mouse over the right-wall panels — cursor should change to `pointer` and the panel should brighten with a red glow. Click a panel to navigate.

- [ ] **Step 4: Verify network strip updates**

After ~1.5 seconds, the back-wall strip should update from `OFFLINE —` to show real latency/download values.

- [ ] **Step 5: Commit and push**

```powershell
cd "F:\Test"
git push origin main
```

Expected: `main -> main` push confirmation.

---

## Known Post-Implementation Tweaks

These are aesthetic tuning items — not bugs. Adjust the values in the relevant files after first seeing the scene:

| Item | File | What to adjust |
|---|---|---|
| Camera too high / too low | `scene.js` | `_camera.position.y` (currently 3.5) |
| Sukuna too small / large | `sukuna.js` | `root.scale.set(x, y, z)` on the group |
| Blood pool too bright / dark | `room.js` | `bright` vec3 in `BLOOD_FRAG` |
| Clock glow too strong | `ui-objects.js` | `emissiveIntensity` range in `updateTexture` |
| Quick links hard to see | `ui-objects.js` | Adjust panel `y` positions in `POSITIONS` array |
| Search bar offset | `app.js` | `y - 30` offset in `positionSearchOverlay` |
