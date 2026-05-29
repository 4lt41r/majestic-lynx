import { DEFAULTS, SEARCH_ENGINES, PARTICLE_COUNTS, VERSION, WTTR_BASE_URL } from '../shared/constants.js';
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
  initBookmarks();
  initWeather(prefs);
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

  if (selector) selector.value = prefs.searchEngine ?? 'google';

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
    a.append(
      createElement('span', { className: 'quick-link-tile__icon' }, icon ?? '🔗'),
      createElement('span', { className: 'quick-link-tile__label' }, label),
    );
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id });
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
    if (changes.weatherCity || changes.weatherUnits) {
      prefs = {
        ...prefs,
        weatherCity:  changes.weatherCity?.newValue  ?? prefs.weatherCity,
        weatherUnits: changes.weatherUnits?.newValue ?? prefs.weatherUnits,
      };
      initWeather(prefs);
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

  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim() || '#00d4ff';
  const cyan = '#00ffea';

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

  const dlValues = history.map(r => r.downloadMbps ?? 0);
  const maxDl    = Math.max(...dlValues, 1);
  const yScale   = val => pad.top + cH - clamp(val / maxDl, 0, 1) * cH;
  const xScale   = i   => pad.left + (history.length > 1 ? (i / (history.length - 1)) * cW : cW / 2);

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

  ctx.fillStyle    = `${accent}33`;
  ctx.font         = '9px "Share Tech Mono", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`last ${history.length} readings`, pad.left + cW / 2, H - pad.bottom + 6);

  const points = history.map((r, i) => ({ x: xScale(i), y: yScale(r.downloadMbps ?? 0) }));

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

  [[5, 0.10], [2.5, 0.30], [1.2, 0.95]].forEach(([lw, alpha]) => {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 255, 234, ${alpha})`;
    ctx.lineWidth   = lw;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    points.forEach(({ x, y }, i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.stroke();
  });

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
  updateStatusDot(checkOnlineStatus());

  window.addEventListener('online',  () => updateStatusDot(true));
  window.addEventListener('offline', () => {
    updateStatusDot(false);
    updateNetworkUI({ online: false, latencyMs: null, downloadMbps: null, uploadMbps: null, ip: null, isp: null, timestamp: Date.now() });
  });

  document.getElementById('run-speed-test')
    ?.addEventListener('click', () => triggerNetworkCheck(currentPrefs));

  setTimeout(() => triggerNetworkCheck(currentPrefs), 1400);

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
    updateNetworkUI({ online: checkOnlineStatus(), latencyMs: null, downloadMbps: null, uploadMbps: null, ip: null, isp: null, timestamp: Date.now() });
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Run Speed Test'; }
  }
}

function updateNetworkUI({ online, latencyMs, downloadMbps, uploadMbps, ip, isp, timestamp }) {
  updateStatusDot(online);

  const latencyText = (online && latencyMs    != null) ? formatMs(latencyMs)      : '—';
  const latencyPct  = (online && latencyMs    != null) ? clamp(1 - latencyMs / 500, 0.05, 1) * 100 : 0;
  setText(document.getElementById('metric-latency'), latencyText);
  setBarFill('bar-latency', latencyPct);
  if (online && latencyMs != null) flashValue('metric-latency');

  const dlText = (online && downloadMbps != null) ? formatMbps(downloadMbps) : '—';
  const dlPct  = (online && downloadMbps != null) ? clamp(downloadMbps / 100, 0.05, 1) * 100 : 0;
  setText(document.getElementById('metric-download'), dlText);
  setBarFill('bar-download', dlPct);
  if (online && downloadMbps != null) flashValue('metric-download');

  const ulText = (online && uploadMbps != null) ? formatMbps(uploadMbps) : '—';
  const ulPct  = (online && uploadMbps != null) ? clamp(uploadMbps / 100, 0.05, 1) * 100 : 0;
  setText(document.getElementById('metric-upload'), ulText);
  // Upload card unit label — swap from "browser limitation" once we have a value
  const ulUnit = document.getElementById('metric-upload-unit');
  if (ulUnit) ulUnit.textContent = (online && uploadMbps != null) ? 'Mbps approx' : (online ? 'measuring…' : '—');
  setBarFill('bar-upload', ulPct);
  if (online && uploadMbps != null) flashValue('metric-upload');

  const ipEl  = document.getElementById('metric-ip');
  const ispEl = document.getElementById('metric-isp');
  setText(ipEl,  (online && ip)  ? ip  : '—');
  setText(ispEl, (online && isp) ? `ISP: ${isp}` : 'ISP: —');

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

function flashValue(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('metric-card__value--updating');
  void el.offsetWidth;
  el.classList.add('metric-card__value--updating');
}

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

// ── Bookmarks ──────────────────────────────────────────────────
// Tracks which bookmark URLs have been clicked, keyed by URL → timestamp.
// This lets us sort "Recent" by last-clicked without needing the history permission.
let bookmarkClicks = {};

async function initBookmarks() {
  const section = document.getElementById('bookmarks');
  if (!section || section.hidden) return;
  if (!chrome.bookmarks) return; // permission not granted

  // Load click history from storage
  try {
    const stored = await chrome.storage.local.get('bookmarkClicks');
    bookmarkClicks = stored.bookmarkClicks ?? {};
  } catch { /* non-fatal */ }

  // Wire tab buttons
  section.querySelectorAll('.bm-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      section.querySelectorAll('.bm-tab-btn').forEach(b => b.classList.remove('bm-tab-btn--active'));
      btn.classList.add('bm-tab-btn--active');
      renderBookmarks(btn.dataset.tab);
    });
  });

  renderBookmarks('recent');
}

async function renderBookmarks(view = 'recent') {
  const list = document.getElementById('bookmarks-list');
  if (!list) return;

  list.replaceChildren();

  const loading = createElement('div', { className: 'bm-loading' }, 'Loading…');
  list.appendChild(loading);

  try {
    if (view === 'recent') {
      await renderRecentBookmarks(list);
    } else {
      await renderDomainBookmarks(list);
    }
  } catch (err) {
    list.replaceChildren();
    list.appendChild(createElement('div', { className: 'bm-empty' }, 'Could not load bookmarks.'));
    console.error('[NeoPulse] Bookmarks error:', err);
  }
}

async function renderRecentBookmarks(list) {
  // Get 30 recently added, then re-sort by last clicked (if tracked)
  const recent = await chrome.bookmarks.getRecent(30);

  recent.sort((a, b) => {
    const aClick = bookmarkClicks[a.url] ?? 0;
    const bClick = bookmarkClicks[b.url] ?? 0;
    if (bClick !== aClick) return bClick - aClick;
    return (b.dateAdded ?? 0) - (a.dateAdded ?? 0);
  });

  list.replaceChildren();

  if (!recent.length) {
    list.appendChild(createElement('div', { className: 'bm-empty' }, 'No bookmarks found.'));
    return;
  }

  recent.slice(0, 20).forEach(node => {
    list.appendChild(buildBookmarkItem(node));
  });
}

async function renderDomainBookmarks(list) {
  const [tree] = await chrome.bookmarks.getTree();
  const flat   = flattenBookmarks(tree);

  // Group by hostname
  const groups = new Map();
  for (const node of flat) {
    let host = '';
    try { host = new URL(node.url).hostname.replace(/^www\./, ''); } catch { host = 'other'; }
    if (!groups.has(host)) groups.set(host, []);
    groups.get(host).push(node);
  }

  // Sort each group's bookmarks by last clicked, then dateAdded
  for (const items of groups.values()) {
    items.sort((a, b) => {
      const aClick = bookmarkClicks[a.url] ?? 0;
      const bClick = bookmarkClicks[b.url] ?? 0;
      if (bClick !== aClick) return bClick - aClick;
      return (b.dateAdded ?? 0) - (a.dateAdded ?? 0);
    });
  }

  // Sort groups by the most-recently interacted bookmark in the group
  const sortedGroups = [...groups.entries()].sort((a, b) => {
    const aTime = Math.max(...a[1].map(n => bookmarkClicks[n.url] ?? n.dateAdded ?? 0));
    const bTime = Math.max(...b[1].map(n => bookmarkClicks[n.url] ?? n.dateAdded ?? 0));
    return bTime - aTime;
  });

  list.replaceChildren();

  if (!sortedGroups.length) {
    list.appendChild(createElement('div', { className: 'bm-empty' }, 'No bookmarks found.'));
    return;
  }

  for (const [host, items] of sortedGroups) {
    const group = createElement('div', { className: 'bm-group' });

    const header = createElement('button', { className: 'bm-group__header', type: 'button' });
    const favicon = createElement('img', { className: 'bm-favicon', alt: '' });
    favicon.src = getFaviconUrl(items[0].url);
    favicon.onerror = () => { favicon.src = ''; favicon.style.display = 'none'; };
    const hostLabel = createElement('span', { className: 'bm-group__host' }, host || 'other');
    const count = createElement('span', { className: 'bm-group__count' }, `${items.length}`);
    const chevron = createElement('span', { className: 'bm-group__chevron' }, '›');
    header.append(favicon, hostLabel, count, chevron);

    const body = createElement('div', { className: 'bm-group__body' });
    items.forEach(node => body.appendChild(buildBookmarkItem(node)));

    header.addEventListener('click', () => {
      const open = group.classList.toggle('bm-group--open');
      chevron.textContent = open ? '⌄' : '›';
    });

    group.append(header, body);
    list.appendChild(group);
  }
}

function buildBookmarkItem(node) {
  const a = createElement('a', {
    className: 'bm-item',
    href: node.url,
    title: node.title || node.url,
    rel: 'noopener noreferrer',
  });

  const favicon = createElement('img', { className: 'bm-favicon', alt: '' });
  favicon.src = getFaviconUrl(node.url);
  favicon.onerror = () => { favicon.src = ''; favicon.style.display = 'none'; };

  const label = createElement('span', { className: 'bm-item__label' }, node.title || node.url);

  a.append(favicon, label);

  a.addEventListener('click', async () => {
    bookmarkClicks[node.url] = Date.now();
    try { await chrome.storage.local.set({ bookmarkClicks }); } catch { /* non-fatal */ }
  });

  return a;
}

function flattenBookmarks(node, result = []) {
  if (node.url) result.push(node);
  if (node.children) node.children.forEach(c => flattenBookmarks(c, result));
  return result;
}

function getFaviconUrl(pageUrl) {
  try {
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', pageUrl);
    url.searchParams.set('size', '16');
    return url.toString();
  } catch {
    return '';
  }
}

// ── Weather (wttr.in — no API key needed) ─────────────────────
// Maps wttr.in weather codes to emoji icons
const WTTR_ICONS = {
  113: '☀',  116: '⛅', 119: '☁',  122: '☁',
  143: '🌫', 176: '🌦', 179: '🌨', 182: '🌧', 185: '🌧',
  200: '⛈', 227: '❄',  230: '❄',  248: '🌫', 260: '🌫',
  263: '🌦', 266: '🌦', 281: '🌧', 284: '🌧', 293: '🌦',
  296: '🌦', 299: '🌧', 302: '🌧', 305: '🌧', 308: '🌧',
  311: '🌧', 314: '🌧', 317: '🌨', 320: '🌨', 323: '🌨',
  326: '❄',  329: '❄',  332: '❄',  335: '❄',  338: '❄',
  350: '🌧', 353: '🌦', 356: '🌧', 359: '🌧', 362: '🌨',
  365: '🌨', 368: '❄',  371: '❄',  374: '🌧', 377: '🌧',
  386: '⛈', 389: '⛈', 392: '⛈', 395: '⛈',
};

async function initWeather(currentPrefs) {
  const section = document.getElementById('weather-placeholder');
  if (!section || section.hidden) return;

  const { weatherCity, weatherUnits } = currentPrefs;

  if (!weatherCity?.trim()) {
    renderWeatherPlaceholder(section);
    return;
  }

  renderWeatherLoading(section);

  try {
    const url  = `${WTTR_BASE_URL}${encodeURIComponent(weatherCity.trim())}?format=j1`;
    const res  = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} — check city name`);
    const data = await res.json();
    renderWeatherData(section, data, weatherUnits ?? 'metric');
  } catch (err) {
    renderWeatherError(section, err.message);
  }
}

function renderWeatherPlaceholder(section) {
  section.replaceChildren();
  const title = createElement('div', { className: 'section-title' }, 'Weather');
  const inner = createElement('div', { className: 'weather-placeholder__content' });
  inner.append(
    createElement('span', { className: 'weather-placeholder__icon' }, '🌐'),
    createElement('p', { className: 'weather-placeholder__text' }, 'Enter a city name in Settings → Weather to enable live data. No API key needed.'),
  );
  section.append(title, inner);
}

function renderWeatherLoading(section) {
  section.replaceChildren();
  section.append(
    createElement('div', { className: 'section-title' }, 'Weather'),
    createElement('div', { className: 'weather-loading' }, 'Fetching weather…'),
  );
}

function renderWeatherError(section, msg) {
  section.replaceChildren();
  const errEl = createElement('div', { className: 'weather-error' }, `⚠ ${msg}`);
  section.append(createElement('div', { className: 'section-title' }, 'Weather'), errEl);
}

function renderWeatherData(section, data, units) {
  const cond     = data.current_condition?.[0];
  if (!cond) { renderWeatherError(section, 'No data returned'); return; }

  const imperial = units === 'imperial';
  const temp     = imperial ? cond.temp_F     : cond.temp_C;
  const feels    = imperial ? cond.FeelsLikeF : cond.FeelsLikeC;
  const unitSym  = imperial ? '°F' : '°C';
  const humidity = cond.humidity ?? '—';
  const desc     = cond.weatherDesc?.[0]?.value ?? '';
  const icon     = WTTR_ICONS[Number(cond.weatherCode)] ?? '🌡';
  const areaName = data.nearest_area?.[0]?.areaName?.[0]?.value ?? '';
  const country  = data.nearest_area?.[0]?.country?.[0]?.value ?? '';

  section.replaceChildren();

  const title = createElement('div', { className: 'section-title' });
  title.append(
    createElement('span', {}, 'Weather'),
    createElement('span', { className: 'weather-location' }, ` — ${areaName}${country ? ', ' + country : ''}`),
  );

  const card  = createElement('div', { className: 'weather-card' });
  const mainEl = createElement('div', { className: 'weather-card__main' });
  mainEl.append(
    createElement('span', { className: 'weather-card__icon' }, icon),
    createElement('span', { className: 'weather-card__temp' }, `${temp}${unitSym}`),
  );
  const detail = createElement('div', { className: 'weather-card__detail' });
  detail.append(
    createElement('span', { className: 'weather-card__desc' }, desc),
    createElement('span', { className: 'weather-card__meta' }, `Feels like ${feels}${unitSym} · Humidity ${humidity}%`),
  );
  card.append(mainEl, detail);
  section.append(title, card);
}

// ── Global error guard ─────────────────────────────────────────
window.onerror = (msg, src, line, col, err) => {
  console.error('[NeoPulse] Uncaught error:', msg, { src, line, col, err });
  return false;
};

window.addEventListener('unhandledrejection', e => {
  console.error('[NeoPulse] Unhandled promise rejection:', e.reason);
});

// ── Start ──────────────────────────────────────────────────────
init().catch(err => console.error('[NeoPulse] Init failed:', err));
