import { initStorage } from '../shared/storage.js';

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  // Set default preferences if this is a fresh install
  await initStorage();

  // Register the side panel so it appears in Chrome's UI
  await chrome.sidePanel.setOptions({
    path: 'src/sidepanel/sidepanel.html',
    enabled: true,
  });

  // Allow the side panel to be opened from the extension's action button
  // Clicking the toolbar icon on any tab opens the side panel
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  if (reason === 'install') {
    console.log('[NeoPulse] Installed — defaults set.');
  } else if (reason === 'update') {
    console.log('[NeoPulse] Updated to', chrome.runtime.getManifest().version);
  }
});
