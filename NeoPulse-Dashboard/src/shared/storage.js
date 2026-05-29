import { DEFAULTS } from './constants.js';

export async function getPrefs() {
  try {
    const stored = await chrome.storage.local.get(null);
    return {
      ...DEFAULTS,
      ...stored,
      widgets: { ...DEFAULTS.widgets, ...(stored.widgets ?? {}) },
    };
  } catch (err) {
    console.error('[NeoPulse] Storage read failed — using defaults:', err);
    return { ...DEFAULTS, widgets: { ...DEFAULTS.widgets } };
  }
}

export async function setPrefs(obj) {
  try {
    return await chrome.storage.local.set(obj);
  } catch (err) {
    console.error('[NeoPulse] Storage write failed:', err);
  }
}

export async function resetPrefs() {
  try {
    await chrome.storage.local.clear();
    return await chrome.storage.local.set(DEFAULTS);
  } catch (err) {
    console.error('[NeoPulse] Storage reset failed:', err);
  }
}

export function onPrefsChange(callback) {
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        try { callback(changes); }
        catch (err) { console.error('[NeoPulse] Pref change handler threw:', err); }
      }
    });
  } catch (err) {
    console.error('[NeoPulse] Could not register storage change listener:', err);
  }
}

export async function getPref(key) {
  const prefs = await getPrefs();
  return prefs[key];
}

export async function initStorage() {
  try {
    const existing = await chrome.storage.local.get(null);
    if (Object.keys(existing).length === 0) {
      return await chrome.storage.local.set(DEFAULTS);
    }
  } catch (err) {
    console.error('[NeoPulse] Storage init failed:', err);
  }
}
