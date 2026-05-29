import { DEFAULTS, SEARCH_ENGINES, PARTICLE_COUNTS, VERSION } from '../shared/constants.js';
import { getPrefs, setPrefs, onPrefsChange } from '../shared/storage.js';
import { debounce, formatTime, formatDate, formatMs, formatMbps, setText, createElement, clamp, timeAgo } from '../shared/utils.js';
import { runNetworkCheck, scheduleAutoRefresh, checkOnlineStatus } from '../shared/network.js';

// ── State ──────────────────────────────────────────────────────
let prefs = { ...DEFAULTS };
let particleAnimId   = null;
let autoRefreshTimer = null;

// ── Boot ───────────────────────────────────────────────────────
async function init() {
  try {
    prefs = await getPrefs();
  } catch {
    showStorageError();
    prefs = { ...DEFAULTS, widgets: { ...DEFAULTS.widgets } };
  }

  applyTheme(prefs.theme);
  applyAnimationIntensity(prefs.animationIntensity);
  applyWidgetVisibility(prefs.widgets);
  startClock();
  setupSearch();
  renderQuickLinks(prefs.quickLinks);
  setupNotes(prefs.notes);
  setupFooter();
  initParticles(prefs);
  await initSpeedGraph();
  initNetwork(prefs);
  showPrivacyNotice(prefs.privacyDismissed);
  listenForPrefChanges();
}

function showStorageError() {
  const banner = document.createElement('div');
  banner.setAttribute('role', 'alert');
  banner.style.cssText = [
    'position:fixed', 'top:12px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:999', 'background:rgba(4,8,16,0.96)',
    'border:1px solid rgba(255,45,85,0.5)', 'border-radius:8px',
    'padding:10px 18px', 'font-family:monospace', 'font-size:12px',
    'color:#ff2d55', 'box-shadow:0 0 20px rgba(255,45,85,0.2)',
  ].join(';');
  banner.textContent = '⚠ Storage unavailable — settings not saved this session';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 6000);
}

// ── Clock ──────────────────────────────────────────────────────
function startClock() {
  const clockEl = document.getElementById('clock');
  const dateEl  = document.getElementById('date-display');

  function tick() {
    const now = new Date();
    setText(clockEl, formatTime(now));
    setText(dateEl,  formatDate(now));
  }

  tick();
  setInterval(tick, 1000);
}

// ── Theme ──────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme ?? 'neon-blue';
}

function applyAnimationIntensity(intensity) {
  document.documentElement.dataset.animation = intensity ?? 'medium';
}

// ── Widget visibility ──────────────────────────────────────────
function applyWidgetVisibility(widgets = {}) {
  const map = {
    network:    'network-panel',
    quickLinks: 'quick-links',
    notes:      'notes-section',
    bookmarks:  'bookmarks',
    weather:    'weather-placeholder',
  };

  for (const [key, id] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.hidden = !(widgets[key] ?? DEFAULTS.widgets[key]);
  }
}

// ── Search ─────────────────────────────────────────────────────
function setupSearch() {
  const form     = document.getElementById('search-form');
  const input    = document.getElementById('search-input');
  const selector = document.getElementById('search-engine-select');

  // Set selector to match saved pref
  if (selector) selector.value = prefs.searchEngine ?? 'google';

  // Save engine choice immediately
  selector?.addEventListener('change', async () => {
    prefs.searchEngine = selector.value;
    await setPrefs({ searchEngine: selector.value });
  });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    const query = input?.value.trim();
    if (!query) return;
    const base = SEARCH_ENGINES[prefs.searchEngine] ?? SEARCH_ENGINES.google;
    window.location.href = base + encodeURIComponent(query);
  });

  // Focus search on load (only if user isn't mid-session)
  input?.focus({ preventScroll: true });
}

// ── Quick Links ────────────────────────────────────────────────
function renderQuickLinks(links = []) {
  const grid = document.getElementById('quick-links-grid');
  if (!grid) return;

  grid.replaceChildren();

  (links.length ? links : DEFAULTS.quickLinks).forEach(({ label, url, icon }) => {
    const a = createElement('a', {
      className: 'quick-link-tile',
      href: url,
      title: label,
      rel: 'noopener noreferrer',
    });

    const iconEl = createElement('span', { className: 'quick-link-tile__icon' }, icon ?? '🔗');
    const labelEl = createElement('span', { className: 'quick-link-tile__label' }, label);

    a.append(iconEl, labelEl);
    grid.appendChild(a);
  });
}

// ── Notes ──────────────────────────────────────────────────────
function setupNotes(savedText = '') {
  const textarea  = document.getElementById('notes-input');
  const indicator = document.getElementById('notes-saved-indicator');
  if (!textarea) return;

  textarea.value = savedText;

  const save = debounce(async () => {
    await setPrefs({ notes: textarea.value });
    if (indicator) {
      indicator.textContent = '✓ saved';
      indicator.classList.add('saved-indicator--visible');
      setTimeout(() => indicator.classList.remove('saved-indicator--visible'), 1500);
    }
  }, 600);

  textarea.addEventListener('input', save);
}

// ── Particles ──────────────────────────────────────────────────
function initParticles({ animationIntensity = 'medium', particlesEnabled = true } = {}) {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const count = particlesEnabled ? (PARTICLE_COUNTS[animationIntensity] ?? 50) : 0;

  if (particleAnimId) {
    cancelAnimationFrame(particleAnimId);
    particleAnimId = null;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  if (count === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // Build accent colour from CSS variable
  const accentRaw = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim() || '#00d4ff';

  const particles = Array.from({ length: count }, () => ({
    x:     Math.random() * canvas.width,
    y:     Math.random() * canvas.height,
    r:     Math.random() * 1.6 + 0.4,
    vx:    (Math.random() - 0.5) * 0.35,
    vy:    (Math.random() - 0.5) * 0.35,
    alpha: Math.random() * 0.5 + 0.1,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = accentRaw;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    particleAnimId = requestAnimationFrame(draw);
  }

  draw();
}

// ── Footer ─────────────────────────────────────────────────────
function setupFooter() {
  setText(document.getElementById('footer-version'), `v${VERSION}`);

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btn-sidepanel')?.addEventListener('click', async () => {
    try {
      const tab = await chrome.tabs.getCurrent();
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {
      // Side panel not supported on this Chrome version — silently ignore
    }
  });
}

// ── Privacy notice ─────────────────────────────────────────────
function showPrivacyNotice(dismissed = false) {
  const notice  = document.getElementById('privacy-notice');
  const dismiss = document.getElementById('privacy-dismiss');
  if (!notice || dismissed) return;

  notice.hidden = false;

  dismiss?.addEventListener('click', async () => {
    notice.hidden = true;
    await setPrefs({ privacyDismissed: true });
  });
}

// ── Live pref change listener ──────────────────────────────────
function listenForPrefChanges() {
  onPrefsChange(changes => {
    if (changes.theme)       applyTheme(changes.theme.newValue);
    if (changes.widgets)     applyWidgetVisibility(changes.widgets.newValue);
    if (changes.quickLinks)  renderQuickLinks(changes.quickLinks.newValue);
    if (changes.searchEngine && document.getElementById('search-engine-select')) {
      document.getElementById('search-engine-select').value = changes.searchEngine.newValue;
      prefs.searchEngine = changes.searchEngine.newValue;
    }
    if (changes.particlesEnabled || changes.animationIntensity) {
      prefs = {
        ...prefs,
        particlesEnabled:   changes.particlesEnabled?.newValue   ?? prefs.particlesEnabled,
        animationIntensity: changes.animationIntensity?.newValue ?? prefs.animationIntensity,
      };
      applyAnimationIntensity(prefs.animationIntensity);
      initParticles(prefs);
    }
  });
}

// ── Speed history graph ────────────────────────────────────────
let graphCanvas = null;

async function initSpeedGraph() {
  graphCanvas = document.getElementById('speed-graph');
  if (!graphCanvas) return;

  setupCanvasDpi(graphCanvas);
  window.addEventListener('resize', () => {
    setupCanvasDpi(graphCanvas);
    loadAndDrawGraph();
  });

  await loadAndDrawGraph();
}

function setupCanvasDpi(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr  = window.devicePixelRatio || 1;
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

async function loadAndDrawGraph() {
  try {
    const stored  = await chrome.storage.session.get('speedHistory');
    const history = Array.isArray(stored.speedHistory) ? stored.speedHistory : [];
    drawSpeedGraph(history);
    if (history.length >= 2) {
      graphCanvas?.closest('.graph-section')?.classList.add('graph-section--has-data');
    }
  } catch {
    drawSpeedGraph([]);
  }
}

function drawSpeedGraph(history) {
  if (!graphCanvas) return;
  const ctx = graphCanvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W   = graphCanvas.width  / dpr;
  const H   = graphCanvas.height / dpr;

  ctx.clearRect(0, 0, W, H);

  // Get current accent colour from CSS variable
  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim() || '#00d4ff';
  const cyan = '#00ffea';

  // Placeholder state
  if (history.length < 2) {
    ctx.fillStyle = `${accent}40`;
    ctx.font = '11px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Run speed test to build history…', W / 2, H / 2);
    return;
  }

  const pad = { top: 18, right: 14, bottom: 26, left: 38 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top  - pad.bottom;

  // Max value for Y scale (at least 1 to avoid division by zero)
  const dlValues = history.map(r => r.downloadMbps ?? 0);
  const maxDl    = Math.max(...dlValues, 1);
  const yScale   = val => pad.top + cH - clamp(val / maxDl, 0, 1) * cH;
  const xScale   = i   => pad.left + (history.length > 1 ? (i / (history.length - 1)) * cW : cW / 2);

  // ── Horizontal grid lines ──
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const y     = pad.top + (cH / gridCount) * i;
    const label = Math.round(maxDl - (maxDl / gridCount) * i);

    ctx.beginPath();
    ctx.strokeStyle = `${accent}14`;
    ctx.lineWidth   = 0.5;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cW, y);
    ctx.stroke();

    ctx.fillStyle     = `${accent}55`;
    ctx.font          = '9px "Share Tech Mono", monospace';
    ctx.textAlign     = 'right';
    ctx.textBaseline  = 'middle';
    ctx.fillText(`${label}`, pad.left - 5, y);
  }

  // ── X-axis label ──
  ctx.fillStyle    = `${accent}33`;
  ctx.font         = '9px "Share Tech Mono", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`last ${history.length} readings`, pad.left + cW / 2, H - pad.bottom + 6);

  // ── Compute points ──
  const points = history.map((r, i) => ({
    x: xScale(i),
    y: yScale(r.downloadMbps ?? 0),
  }));

  // ── Gradient fill under line ──
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
  grad.addColorStop(0, `${cyan}28`);
  grad.addColorStop(1, `${cyan}00`);

  ctx.beginPath();
  points.forEach(({ x, y }, i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.lineTo(points.at(-1).x, pad.top + cH);
  ctx.lineTo(points[0].x, pad.top + cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // ── Glowing line — 3 passes: wide dim → medium → thin bright ──
  [[5, 0.10], [2.5, 0.30], [1.2, 0.95]].forEach(([lw, alpha]) => {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 255, 234, ${alpha})`;
    ctx.lineWidth   = lw;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    points.forEach(({ x, y }, i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.stroke();
  });

  // ── Data point dots ──
  points.forEach(({ x, y }, i) => {
    const isLatest = i === points.length - 1;
    ctx.beginPath();
    ctx.arc(x, y, isLatest ? 3.5 : 2, 0, Math.PI * 2);
    ctx.fillStyle   = isLatest ? '#ffffff' : cyan;
    ctx.shadowColor = cyan;
    ctx.shadowBlur  = isLatest ? 10 : 5;
    ctx.fill();
    ctx.shadowBlur  = 0;
  });
}

// ── Network module ─────────────────────────────────────────────
function initNetwork(currentPrefs) {
  // Reflect current browser online state immediately
  updateStatusDot(checkOnlineStatus());

  // React to browser-level online/offline events without a fetch
  window.addEventListener('online',  () => updateStatusDot(true));
  window.addEventListener('offline', () => {
    updateStatusDot(false);
    updateNetworkUI({ online: false, latencyMs: null, downloadMbps: null, timestamp: Date.now() });
  });

  // Manual "Run Speed Test" button
  document.getElementById('run-speed-test')
    ?.addEventListener('click', () => triggerNetworkCheck(currentPrefs));

  // Auto-run once after a short delay so the page renders first
  setTimeout(() => triggerNetworkCheck(currentPrefs), 1400);

  // Schedule periodic auto-refresh
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  if (currentPrefs.refreshInterval > 0) {
    autoRefreshTimer = scheduleAutoRefresh(
      currentPrefs.refreshInterval,
      () => triggerNetworkCheck(currentPrefs),
    );
  }
}

async function triggerNetworkCheck(currentPrefs) {
  const btn = document.getElementById('run-speed-test');
  if (btn) { btn.disabled = true; btn.textContent = 'Testing…'; }

  try {
    const result = await runNetworkCheck({
      pingUrl:     currentPrefs.pingUrl,
      downloadUrl: currentPrefs.downloadUrl,
    });
    updateNetworkUI(result);
    await saveSpeedReading(result);
  } catch (err) {
    console.error('[NeoPulse] Network check failed:', err);
    updateNetworkUI({ online: checkOnlineStatus(), latencyMs: null, downloadMbps: null, timestamp: Date.now() });
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Run Speed Test'; }
  }
}

function updateNetworkUI({ online, latencyMs, downloadMbps, timestamp }) {
  updateStatusDot(online);

  // Latency card — lower is better; bar fills inversely (0ms = full, 500ms+ = empty)
  const latencyText = (online && latencyMs != null) ? formatMs(latencyMs) : '—';
  const latencyPct  = (online && latencyMs != null) ? clamp(1 - latencyMs / 500, 0.05, 1) * 100 : 0;
  setText(document.getElementById('metric-latency'), latencyText);
  setBarFill('bar-latency', latencyPct);
  if (online && latencyMs != null) flashValue('metric-latency');

  // Download card — higher is better; scale 0–100 Mbps
  const dlText = (online && downloadMbps != null) ? formatMbps(downloadMbps) : '—';
  const dlPct  = (online && downloadMbps != null) ? clamp(downloadMbps / 100, 0.05, 1) * 100 : 0;
  setText(document.getElementById('metric-download'), dlText);
  setBarFill('bar-download', dlPct);
  if (online && downloadMbps != null) flashValue('metric-download');

  setText(document.getElementById('last-tested'), `Last tested: ${timeAgo(timestamp)}`);
}

function updateStatusDot(isOnline) {
  const dot   = document.getElementById('network-status-dot');
  const label = document.getElementById('network-status-label');
  dot?.classList.remove('status-dot--online', 'status-dot--offline', 'status-dot--unknown');
  dot?.classList.add(isOnline ? 'status-dot--online' : 'status-dot--offline');
  setText(label, isOnline ? 'Online' : 'Offline');
}

function setBarFill(id, percent) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.round(percent)}%`;
}

// Briefly flash a metric card value when it updates
function flashValue(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('metric-card__value--updating');
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('metric-card__value--updating');
}

// Store speed reading and redraw graph
async function saveSpeedReading({ downloadMbps, latencyMs, timestamp }) {
  if (!downloadMbps && !latencyMs) return;
  try {
    const stored  = await chrome.storage.session.get('speedHistory');
    const history = Array.isArray(stored.speedHistory) ? stored.speedHistory : [];
    history.push({ downloadMbps, latencyMs, timestamp });
    if (history.length > 20) history.shift();
    await chrome.storage.session.set({ speedHistory: history });
    drawSpeedGraph(history);
    if (history.length >= 2) {
      graphCanvas?.closest('.graph-section')?.classList.add('graph-section--has-data');
    }
  } catch {
    // chrome.storage.session unavailable on older Chrome — non-fatal
  }
}

// ── Global error guard ─────────────────────────────────────────
window.onerror = (msg, src, line, col, err) => {
  console.error('[NeoPulse] Uncaught error:', msg, { src, line, col, err });
  return false; // allow default handling
};

window.addEventListener('unhandledrejection', e => {
  console.error('[NeoPulse] Unhandled promise rejection:', e.reason);
});

// ── Start ──────────────────────────────────────────────────────
init().catch(err => console.error('[NeoPulse] Init failed:', err));
