import { DEFAULTS, VERSION, WTTR_BASE_URL } from '../shared/constants.js';
import { getPrefs, setPrefs, onPrefsChange } from '../shared/storage.js';
import { debounce, formatMs, formatMbps, setText, createElement, timeAgo } from '../shared/utils.js';
import { runNetworkCheck, scheduleAutoRefresh, checkOnlineStatus } from '../shared/network.js';

// ── State ──────────────────────────────────────────────────────
let prefs         = { ...DEFAULTS };
let autoRefreshId = null;
let bookmarkClicks = {};

// ── Boot ───────────────────────────────────────────────────────
async function init() {
  prefs = await getPrefs();

  document.documentElement.dataset.theme     = prefs.theme ?? 'neon-blue';
  document.documentElement.dataset.animation = prefs.animationIntensity ?? 'medium';

  setupTabs();
  setupNotes(prefs.notes);
  setupButtons();
  setText(document.getElementById('footer-version'), `v${VERSION}`);

  updateStatusDot(checkOnlineStatus());
  window.addEventListener('online',  () => updateStatusDot(true));
  window.addEventListener('offline', () => {
    updateStatusDot(false);
    updateNetworkUI({ online: false, latencyMs: null, downloadMbps: null, uploadMbps: null, ip: null, isp: null, timestamp: Date.now() });
  });

  setTimeout(() => triggerNetworkCheck(), 1000);

  if (autoRefreshId) clearInterval(autoRefreshId);
  autoRefreshId = scheduleAutoRefresh(prefs.refreshInterval, triggerNetworkCheck);

  onPrefsChange(changes => {
    if (changes.theme)       document.documentElement.dataset.theme     = changes.theme.newValue;
    if (changes.animationIntensity) document.documentElement.dataset.animation = changes.animationIntensity.newValue;
    if (changes.quickLinks)  renderQuickLinks(changes.quickLinks.newValue);
    if (changes.notes) {
      const ta = document.getElementById('notes-input');
      if (ta && document.activeElement !== ta) ta.value = changes.notes.newValue ?? '';
    }
    if (changes.weatherCity || changes.weatherUnits) {
      prefs = {
        ...prefs,
        weatherCity:  changes.weatherCity?.newValue  ?? prefs.weatherCity,
        weatherUnits: changes.weatherUnits?.newValue ?? prefs.weatherUnits,
      };
    }
  });
}

// ── Tab navigation ─────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.panel-tab').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Lazy-load content when a tab is first opened
  document.querySelectorAll('.panel-tab').forEach(btn => {
    if (btn.classList.contains('panel-tab--active')) {
      onTabActivated(btn.dataset.tab);
    }
  });
}

function activateTab(tabId) {
  document.querySelectorAll('.panel-tab').forEach(btn => {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle('panel-tab--active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    const active = panel.id === `tab-${tabId}`;
    panel.hidden = !active;
  });

  onTabActivated(tabId);
}

function onTabActivated(tabId) {
  if (tabId === 'home') {
    renderQuickLinks(prefs.quickLinks);
  } else if (tabId === 'bookmarks') {
    initPanelBookmarks();
  } else if (tabId === 'weather') {
    initPanelWeather();
  }
}

// ── Network check ──────────────────────────────────────────────
async function triggerNetworkCheck() {
  const btn = document.getElementById('run-speed-test');
  if (btn) { btn.disabled = true; btn.textContent = 'Testing…'; }

  try {
    const result = await runNetworkCheck({
      pingUrl:     prefs.pingUrl,
      downloadUrl: prefs.downloadUrl,
    });
    updateNetworkUI(result);
  } catch (err) {
    console.error('[NeoPulse Panel] Network check failed:', err);
    updateNetworkUI({ online: checkOnlineStatus(), latencyMs: null, downloadMbps: null, uploadMbps: null, ip: null, isp: null, timestamp: Date.now() });
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Run Test'; }
  }
}

function updateNetworkUI({ online, latencyMs, downloadMbps, uploadMbps, ip, isp, timestamp }) {
  updateStatusDot(online);

  setText(document.getElementById('metric-latency'),  (online && latencyMs    != null) ? formatMs(latencyMs)      : '—');
  setText(document.getElementById('metric-download'), (online && downloadMbps != null) ? formatMbps(downloadMbps) : '—');
  setText(document.getElementById('metric-upload'),   (online && uploadMbps   != null) ? formatMbps(uploadMbps)   : '—');

  const ulUnit = document.getElementById('metric-upload-unit');
  if (ulUnit) ulUnit.textContent = (online && uploadMbps != null) ? 'Mbps approx' : (online ? 'measuring…' : '—');

  setText(document.getElementById('metric-ip'),  (online && ip)  ? ip  : '—');
  setText(document.getElementById('metric-isp'), (online && isp) ? `ISP: ${isp}` : 'ISP: —');
  setText(document.getElementById('last-tested'), `Tested: ${timeAgo(timestamp)}`);
}

function updateStatusDot(isOnline) {
  const dot   = document.getElementById('network-status-dot');
  const label = document.getElementById('network-status-label');
  dot?.classList.remove('status-dot--online', 'status-dot--offline', 'status-dot--unknown');
  dot?.classList.add(isOnline ? 'status-dot--online' : 'status-dot--offline');
  setText(label, isOnline ? 'Online' : 'Offline');
}

// ── Quick links (Home tab) ─────────────────────────────────────
function renderQuickLinks(links = []) {
  const grid = document.getElementById('quick-links-grid');
  if (!grid) return;

  grid.replaceChildren();

  const shown = (links.length ? links : DEFAULTS.quickLinks).slice(0, 6);
  shown.forEach(({ label, url, icon }) => {
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

// ── Bookmarks (Bookmarks tab) ──────────────────────────────────
let bookmarksInitialised = false;

async function initPanelBookmarks() {
  if (!chrome.bookmarks) {
    const list = document.getElementById('panel-bookmarks-list');
    if (list) {
      list.replaceChildren();
      list.appendChild(createElement('div', { className: 'bm-empty' }, 'Bookmarks permission not granted.'));
    }
    return;
  }

  // Load click tracking from storage once
  if (!bookmarksInitialised) {
    try {
      const stored = await chrome.storage.local.get('bookmarkClicks');
      bookmarkClicks = stored.bookmarkClicks ?? {};
    } catch { /* non-fatal */ }
    bookmarksInitialised = true;
  }

  // Wire tab buttons (only once)
  const tabButtons = document.querySelectorAll('#tab-bookmarks .bm-tab-btn');
  tabButtons.forEach(btn => {
    if (!btn.dataset.wired) {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('bm-tab-btn--active'));
        btn.classList.add('bm-tab-btn--active');
        renderPanelBookmarks(btn.dataset.tab);
      });
      btn.dataset.wired = '1';
    }
  });

  renderPanelBookmarks('recent');
}

async function renderPanelBookmarks(view) {
  const list = document.getElementById('panel-bookmarks-list');
  if (!list) return;

  list.replaceChildren();
  list.appendChild(createElement('div', { className: 'bm-loading' }, 'Loading…'));

  try {
    if (view === 'recent') {
      await renderRecentInList(list);
    } else {
      await renderDomainInList(list);
    }
  } catch (err) {
    list.replaceChildren();
    list.appendChild(createElement('div', { className: 'bm-empty' }, 'Could not load bookmarks.'));
    console.error('[NeoPulse Panel] Bookmarks error:', err);
  }
}

async function renderRecentInList(list) {
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
  recent.slice(0, 20).forEach(node => list.appendChild(buildBookmarkItem(node)));
}

async function renderDomainInList(list) {
  const [tree] = await chrome.bookmarks.getTree();
  const flat   = flattenBookmarks(tree);

  const groups = new Map();
  for (const node of flat) {
    let host = '';
    try { host = new URL(node.url).hostname.replace(/^www\./, ''); } catch { host = 'other'; }
    if (!groups.has(host)) groups.set(host, []);
    groups.get(host).push(node);
  }

  for (const items of groups.values()) {
    items.sort((a, b) => {
      const aC = bookmarkClicks[a.url] ?? 0;
      const bC = bookmarkClicks[b.url] ?? 0;
      if (bC !== aC) return bC - aC;
      return (b.dateAdded ?? 0) - (a.dateAdded ?? 0);
    });
  }

  const sortedGroups = [...groups.entries()].sort((a, b) => {
    const aT = Math.max(...a[1].map(n => bookmarkClicks[n.url] ?? n.dateAdded ?? 0));
    const bT = Math.max(...b[1].map(n => bookmarkClicks[n.url] ?? n.dateAdded ?? 0));
    return bT - aT;
  });

  list.replaceChildren();

  if (!sortedGroups.length) {
    list.appendChild(createElement('div', { className: 'bm-empty' }, 'No bookmarks found.'));
    return;
  }

  for (const [host, items] of sortedGroups) {
    const group   = createElement('div', { className: 'bm-group' });
    const header  = createElement('button', { className: 'bm-group__header', type: 'button' });
    const favicon = createElement('img', { className: 'bm-favicon', alt: '' });
    favicon.src = getFaviconUrl(items[0].url);
    favicon.onerror = () => { favicon.style.display = 'none'; };
    const hostLabel = createElement('span', { className: 'bm-group__host' }, host || 'other');
    const count     = createElement('span', { className: 'bm-group__count' }, `${items.length}`);
    const chevron   = createElement('span', { className: 'bm-group__chevron' }, '›');
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
  favicon.onerror = () => { favicon.style.display = 'none'; };
  a.append(favicon, createElement('span', { className: 'bm-item__label' }, node.title || node.url));
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
  } catch { return ''; }
}

// ── Weather (Weather tab — wttr.in, no key needed) ────────────
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

async function initPanelWeather() {
  const container = document.getElementById('panel-weather-content');
  if (!container) return;

  const { weatherCity, weatherUnits } = prefs;

  if (!weatherCity?.trim()) {
    container.replaceChildren(
      createElement('div', { className: 'weather-placeholder' },
        'Enter a city name in Settings → Weather. No API key needed.'),
    );
    return;
  }

  container.replaceChildren(createElement('div', { className: 'weather-loading' }, 'Fetching weather…'));

  try {
    const url  = `${WTTR_BASE_URL}${encodeURIComponent(weatherCity.trim())}?format=j1`;
    const res  = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} — check city name`);
    const data = await res.json();

    const cond     = data.current_condition?.[0];
    if (!cond) throw new Error('No data returned');

    const imperial = weatherUnits === 'imperial';
    const temp     = imperial ? cond.temp_F     : cond.temp_C;
    const feels    = imperial ? cond.FeelsLikeF : cond.FeelsLikeC;
    const unitSym  = imperial ? '°F' : '°C';
    const humidity = cond.humidity ?? '—';
    const desc     = cond.weatherDesc?.[0]?.value ?? '';
    const icon     = WTTR_ICONS[Number(cond.weatherCode)] ?? '🌡';
    const areaName = data.nearest_area?.[0]?.areaName?.[0]?.value ?? '';
    const country  = data.nearest_area?.[0]?.country?.[0]?.value ?? '';

    container.replaceChildren();

    const locLine = createElement('div', { className: 'weather-location' },
      `${areaName}${country ? ', ' + country : ''}`);

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
    container.append(locLine, card);

  } catch (err) {
    container.replaceChildren(
      createElement('div', { className: 'weather-error' }, `⚠ ${err.message}`),
    );
  }
}

// ── Notes (Notes tab) ──────────────────────────────────────────
function setupNotes(savedText = '') {
  const textarea  = document.getElementById('notes-input');
  const indicator = document.getElementById('notes-saved-indicator');
  if (!textarea) return;

  textarea.value = savedText;

  const save = debounce(async () => {
    await setPrefs({ notes: textarea.value });
    if (indicator) {
      indicator.textContent = '✓';
      indicator.classList.add('saved-indicator--visible');
      setTimeout(() => indicator.classList.remove('saved-indicator--visible'), 1200);
    }
  }, 600);

  textarea.addEventListener('input', save);
}

// ── Buttons ────────────────────────────────────────────────────
function setupButtons() {
  document.getElementById('run-speed-test')
    ?.addEventListener('click', triggerNetworkCheck);

  document.getElementById('btn-settings')
    ?.addEventListener('click', () => chrome.runtime.openOptionsPage());
}

// ── Global error guards ────────────────────────────────────────
window.onerror = (msg, src, line, col, err) => {
  console.error('[NeoPulse Panel] Uncaught error:', msg, { src, line, col, err });
  return false;
};

window.addEventListener('unhandledrejection', e => {
  console.error('[NeoPulse Panel] Unhandled rejection:', e.reason);
});

// ── Start ──────────────────────────────────────────────────────
init().catch(err => console.error('[NeoPulse Panel] Init failed:', err));
