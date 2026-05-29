import { DEFAULTS, VERSION } from '../shared/constants.js';
import { getPrefs, setPrefs, onPrefsChange } from '../shared/storage.js';
import { debounce, formatMs, formatMbps, setText, createElement, timeAgo } from '../shared/utils.js';
import { runNetworkCheck, scheduleAutoRefresh, checkOnlineStatus } from '../shared/network.js';

// ── State ──────────────────────────────────────────────────────
let prefs          = { ...DEFAULTS };
let autoRefreshId  = null;

// ── Boot ───────────────────────────────────────────────────────
async function init() {
  prefs = await getPrefs();

  document.documentElement.dataset.theme     = prefs.theme ?? 'neon-blue';
  document.documentElement.dataset.animation = prefs.animationIntensity ?? 'medium';

  renderQuickLinks(prefs.quickLinks);
  setupNotes(prefs.notes);
  setupButtons();
  setText(document.getElementById('footer-version'), `v${VERSION}`);

  updateStatusDot(checkOnlineStatus());
  window.addEventListener('online',  () => updateStatusDot(true));
  window.addEventListener('offline', () => {
    updateStatusDot(false);
    updateNetworkUI({ online: false, latencyMs: null, downloadMbps: null, timestamp: Date.now() });
  });

  // Initial speed check after short delay
  setTimeout(() => triggerNetworkCheck(), 1000);

  // Auto-refresh
  if (autoRefreshId) clearInterval(autoRefreshId);
  autoRefreshId = scheduleAutoRefresh(prefs.refreshInterval, triggerNetworkCheck);

  // React to pref changes from main dashboard or settings
  onPrefsChange(changes => {
    if (changes.theme)       document.documentElement.dataset.theme     = changes.theme.newValue;
    if (changes.animationIntensity) document.documentElement.dataset.animation = changes.animationIntensity.newValue;
    if (changes.quickLinks)  renderQuickLinks(changes.quickLinks.newValue);
    if (changes.notes) {
      const ta = document.getElementById('notes-input');
      // Only update textarea if the user isn't currently typing in the panel
      if (ta && document.activeElement !== ta) ta.value = changes.notes.newValue ?? '';
    }
  });
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
    updateNetworkUI({ online: checkOnlineStatus(), latencyMs: null, downloadMbps: null, timestamp: Date.now() });
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Run Test'; }
  }
}

function updateNetworkUI({ online, latencyMs, downloadMbps, timestamp }) {
  updateStatusDot(online);
  setText(document.getElementById('metric-latency'),  (online && latencyMs    != null) ? formatMs(latencyMs)       : '—');
  setText(document.getElementById('metric-download'), (online && downloadMbps != null) ? formatMbps(downloadMbps)  : '—');
  setText(document.getElementById('last-tested'),     `Tested: ${timeAgo(timestamp)}`);
}

function updateStatusDot(isOnline) {
  const dot   = document.getElementById('network-status-dot');
  const label = document.getElementById('network-status-label');
  dot?.classList.remove('status-dot--online', 'status-dot--offline', 'status-dot--unknown');
  dot?.classList.add(isOnline ? 'status-dot--online' : 'status-dot--offline');
  setText(label, isOnline ? 'Online' : 'Offline');
}

// ── Quick links ────────────────────────────────────────────────
function renderQuickLinks(links = []) {
  const grid = document.getElementById('quick-links-grid');
  if (!grid) return;

  grid.replaceChildren();

  // Show first 4 links only (panel is narrow)
  const shown = (links.length ? links : DEFAULTS.quickLinks).slice(0, 4);
  shown.forEach(({ label, url, icon }) => {
    const a = createElement('a', {
      className: 'quick-link-tile',
      href: url,
      title: label,
      rel: 'noopener noreferrer',
    });
    a.append(
      createElement('span', { className: 'quick-link-tile__icon' },  icon ?? '🔗'),
      createElement('span', { className: 'quick-link-tile__label' }, label),
    );
    grid.appendChild(a);
  });
}

// ── Notes — shared storage key with main dashboard ─────────────
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
