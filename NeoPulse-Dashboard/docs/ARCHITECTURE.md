# NeoPulse Dashboard — Architecture

## Overview

NeoPulse Dashboard is a Chrome Extension built with Manifest V3. It uses `chrome_url_overrides` to replace Chrome's default New Tab page with a custom HTML dashboard. All logic is vanilla JavaScript using ES Modules — no frameworks, no bundlers, no external dependencies.

## Extension Entry Points

| File | How Chrome loads it | Purpose |
|---|---|---|
| `src/newtab/index.html` | `chrome_url_overrides.newtab` | Main dashboard — loads on every new tab |
| `src/background/service-worker.js` | `background.service_worker` | Background coordinator — sets defaults on install |
| `src/sidepanel/sidepanel.html` | `chrome.sidePanel` API | Right-side panel — mini network stats + notes |
| `src/options/options.html` | `chrome.runtime.openOptionsPage()` | Settings page |

## Data Flow

```
User opens New Tab
  → index.html loads in a new tab context
  → app.js (ES module) initializes
  → imports storage.js → chrome.storage.local.get() → loads saved preferences
  → applies theme, widget visibility, search engine from prefs
  → imports network.js → runNetworkCheck() → fetch timing for latency/speed
  → renders all widgets with live + stored data
  → setInterval ticks clock every 1s
  → scheduleAutoRefresh() runs network check on user-configured interval

User changes a setting in options.js
  → chrome.storage.local.set() saves the change
  → chrome.storage.onChanged fires
  → app.js listener re-renders the affected widget
```

## File Responsibilities

### src/newtab/
- `index.html` — DOM skeleton only. No inline scripts or styles.
- `styles.css` — All visual styling: dark background, neon tokens, glassmorphism cards, animations, responsive layout.
- `app.js` — Dashboard controller. Initializes clock, search, particles, network widget, quick links, notes. Listens for storage changes.

### src/shared/
- `constants.js` — Default preference values, search engine URLs, version string. Never imports anything.
- `storage.js` — Thin wrapper around `chrome.storage.local`. Exposes `getPrefs`, `setPrefs`, `resetPrefs`, `onPrefsChange`.
- `utils.js` — Pure helper functions: `formatBytes`, `formatMs`, `debounce`, `createElement`. No side effects.
- `network.js` — Network estimation: `measureLatency`, `estimateDownloadSpeed`, `runNetworkCheck`, `scheduleAutoRefresh`.

### src/background/
- `service-worker.js` — Registers on `chrome.runtime.onInstalled`. Sets default preferences if storage is empty. Registers side panel path.

### src/sidepanel/
- `sidepanel.html/css/js` — Compact version of the dashboard showing network stats and notes only. Shares storage keys with main dashboard so notes sync.

### src/options/
- `options.html/css/js` — Settings UI. Reads prefs on load, writes on every input change (debounced 300ms). Reset button clears storage and reloads.

## Network Speed Approximation

The extension cannot access raw system network interfaces. It approximates using browser fetch timing:

**Latency:**
```
start = performance.now()
fetch('https://www.google.com/generate_204', { method: 'HEAD', cache: 'no-store', mode: 'no-cors' })
latency = performance.now() - start
```
Note: `mode: 'no-cors'` means the response body/headers are opaque — we only use the timing.

**Download speed:**
```
start = performance.now()
fetch(configuredTestUrl, { cache: 'no-store' })
buffer = await response.arrayBuffer()
elapsed = (performance.now() - start) / 1000
speedMbps = (buffer.byteLength * 8) / elapsed / 1_000_000
```
All values are labeled "Approximate (~±30%)" in the UI.

## Settings Storage Schema

```json
{
  "theme": "neon-blue",
  "animationIntensity": "medium",
  "particlesEnabled": true,
  "soundsEnabled": false,
  "searchEngine": "google",
  "refreshInterval": 300,
  "notes": "",
  "quickLinks": [],
  "privacyDismissed": false,
  "widgets": {
    "clock": true,
    "network": true,
    "quickLinks": true,
    "notes": true,
    "bookmarks": false,
    "weather": false
  }
}
```

## Content Security Policy

Enforced at two levels:
1. `manifest.json` extension_pages CSP
2. `<meta http-equiv="Content-Security-Policy">` in each HTML file

Policy: `default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src https://www.google.com`

No `unsafe-inline`, no `unsafe-eval`.

## Chrome API Usage

| API | Used in | Purpose |
|---|---|---|
| `chrome.storage.local` | storage.js | Persist all preferences |
| `chrome.storage.session` | app.js | Cache speed history for current session |
| `chrome.runtime.onInstalled` | service-worker.js | Set defaults on first install |
| `chrome.runtime.openOptionsPage` | app.js | Open settings from dashboard |
| `chrome.sidePanel` | service-worker.js, app.js | Register and open side panel |
