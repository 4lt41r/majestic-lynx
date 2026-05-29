import { VERSION } from '../shared/constants.js';
import { getPrefs, setPrefs, resetPrefs } from '../shared/storage.js';
import { debounce } from '../shared/utils.js';

// ── Boot ───────────────────────────────────────────────────────
async function init() {
  const prefs = await getPrefs();

  applyThemePreview(prefs.theme);
  applyAnimPreview(prefs.animationIntensity);
  populateForm(prefs);
  bindControls();
  setupResetButton();
  setupDashboardLink();

  document.getElementById('footer-version').textContent = `NeoPulse v${VERSION}`;
}

// ── Apply theme/animation immediately so settings page matches ──
function applyThemePreview(theme) {
  document.documentElement.dataset.theme = theme ?? 'neon-blue';
}

function applyAnimPreview(intensity) {
  document.documentElement.dataset.animation = intensity ?? 'medium';
}

// ── Populate all form controls from stored prefs ───────────────
function populateForm(prefs) {
  setSelect('theme',               prefs.theme);
  setSelect('animationIntensity',  prefs.animationIntensity);
  setSelect('searchEngine',        prefs.searchEngine);
  setCheck('particlesEnabled',     prefs.particlesEnabled);
  setCheck('soundsEnabled',        prefs.soundsEnabled);
  setRange('refreshInterval',      prefs.refreshInterval);

  // Widget toggles
  const w = prefs.widgets ?? {};
  setCheck('widget-clock',         w.clock);
  setCheck('widget-network',       w.network);
  setCheck('widget-quickLinks',    w.quickLinks);
  setCheck('widget-notes',         w.notes);
  setCheck('widget-bookmarks',     w.bookmarks);
  setCheck('widget-weather',       w.weather);

  // Weather
  setText_('weatherCity',   prefs.weatherCity  ?? '');
  setSelect('weatherUnits', prefs.weatherUnits ?? 'metric');
}

// ── Bind all controls to auto-save ────────────────────────────
function bindControls() {
  const save = debounce(saveAll, 300);

  // Select dropdowns
  ['theme', 'animationIntensity', 'searchEngine'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      // Reflect theme/animation on this page immediately
      if (id === 'theme')              applyThemePreview(getValue(id));
      if (id === 'animationIntensity') applyAnimPreview(getValue(id));
      save();
    });
  });

  // Checkboxes
  [
    'particlesEnabled', 'soundsEnabled',
    'widget-clock', 'widget-network', 'widget-quickLinks',
    'widget-notes', 'widget-bookmarks', 'widget-weather',
  ].forEach(id => {
    document.getElementById(id)?.addEventListener('change', save);
  });

  // Weather text input
  document.getElementById('weatherCity')?.addEventListener('input', save);

  document.getElementById('weatherUnits')?.addEventListener('change', save);

  // Range slider — update display immediately, save debounced
  const rangeEl   = document.getElementById('refreshInterval');
  const outputEl  = document.getElementById('refreshInterval-display');
  rangeEl?.addEventListener('input', () => {
    if (outputEl) outputEl.textContent = formatInterval(Number(rangeEl.value));
    save();
  });
}

// ── Read current form state and write to storage ──────────────
async function saveAll() {
  const prefs = {
    theme:              getValue('theme'),
    animationIntensity: getValue('animationIntensity'),
    searchEngine:       getValue('searchEngine'),
    particlesEnabled:   getChecked('particlesEnabled'),
    soundsEnabled:      getChecked('soundsEnabled'),
    refreshInterval:    Number(document.getElementById('refreshInterval')?.value ?? 300),
    widgets: {
      clock:      getChecked('widget-clock'),
      network:    getChecked('widget-network'),
      quickLinks: getChecked('widget-quickLinks'),
      notes:      getChecked('widget-notes'),
      bookmarks:  getChecked('widget-bookmarks'),
      weather:    getChecked('widget-weather'),
    },
    weatherCity:   getValue('weatherCity').trim(),
    weatherUnits:  getValue('weatherUnits'),
  };

  await setPrefs(prefs);
  showSaveBanner();
}

// ── Reset button ───────────────────────────────────────────────
function setupResetButton() {
  document.getElementById('btn-reset')?.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Reset all NeoPulse settings, notes, and quick links to defaults?\n\nThis cannot be undone.'
    );
    if (!confirmed) return;
    await resetPrefs();
    window.location.reload();
  });
}

// ── "← New Tab" link ──────────────────────────────────────────
function setupDashboardLink() {
  document.getElementById('open-dashboard')?.addEventListener('click', e => {
    e.preventDefault();
    window.location.href = chrome.runtime.getURL('src/newtab/index.html');
  });
}

// ── Save banner ────────────────────────────────────────────────
let bannerTimer = null;
function showSaveBanner() {
  const banner = document.getElementById('save-banner');
  if (!banner) return;
  banner.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { banner.hidden = true; }, 1800);
}

// ── Helpers ────────────────────────────────────────────────────
function setSelect(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.value = value;
}

function setCheck(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = Boolean(value);
}

function setRange(id, value) {
  const el  = document.getElementById(id);
  const out = document.getElementById(`${id}-display`);
  if (el && value != null) {
    el.value = value;
    if (out) out.textContent = formatInterval(Number(value));
  }
}

function getValue(id) {
  return document.getElementById(id)?.value ?? '';
}

function getChecked(id) {
  return document.getElementById(id)?.checked ?? false;
}

function setText_(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function formatInterval(seconds) {
  if (seconds < 60)   return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} hr`;
}

// ── Global error guards ────────────────────────────────────────
window.onerror = (msg, src, line, col, err) => {
  console.error('[NeoPulse Settings] Uncaught error:', msg, { src, line, col, err });
  return false;
};

window.addEventListener('unhandledrejection', e => {
  console.error('[NeoPulse Settings] Unhandled rejection:', e.reason);
});

// ── Run ────────────────────────────────────────────────────────
init().catch(err => console.error('[NeoPulse Settings] Init failed:', err));
