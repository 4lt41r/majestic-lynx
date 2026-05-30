import { DEFAULTS, SEARCH_ENGINES, VERSION } from '../shared/constants.js';
import { getPrefs, setPrefs, onPrefsChange }  from '../shared/storage.js';
import { runNetworkCheck, scheduleAutoRefresh } from '../shared/network.js';
import { initScene, startLoop, getCamera, getRenderer, getRaycaster } from './scene.js';
import { bloodUniforms, animateRoom } from './room.js';
import { buildRoomGltf } from './room-gltf.js';
import { buildSukuna, animateSukuna, disposeSukuna } from './sukuna.js';
import { buildClock, buildQuickLinkPanels, buildNetworkStrip, buildSearchPedestal } from './ui-objects.js';

let prefs            = { ...DEFAULTS };
let autoRefreshTimer = null;
let _scene           = null;

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
  _scene = scene;

  // ── Build 3D scene ──
  await buildRoomGltf(scene);
  sukunaRefs    = await buildSukuna(scene, prefs.sceneMode ?? 'toon');
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
    animateRoom(elapsed);

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
    if (changes.sceneMode && _scene) {
      const newMode = changes.sceneMode.newValue ?? 'toon';
      prefs.sceneMode = newMode;
      (async () => {
        disposeSukuna(sukunaRefs);
        sukunaRefs = await buildSukuna(_scene, newMode);
      })();
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
