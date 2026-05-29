# NeoPulse Dashboard — Architecture

## Overview

NeoPulse Dashboard is a Chrome Extension built with Manifest V3. It uses `chrome_url_overrides` to replace Chrome's default New Tab page with a custom HTML dashboard. All logic is vanilla JavaScript using ES Modules — no frameworks, no bundlers, no external dependencies.

## Extension Entry Points

| File | How Chrome loads it | Purpose |
|---|---|---|
| `src/newtab/index.html` | `chrome_url_overrides.newtab` | Main dashboard — loads on every new tab |
| `src/background/service-worker.js` | `background.service_worker` | Background coordinator — sets defaults on install, configures side panel |
| `src/sidepanel/sidepanel.html` | `chrome.sidePanel` API | Opera GX-style 4-tab panel — Home, Bookmarks, Weather, Notes |
| `src/options/options.html` | `chrome.runtime.openOptionsPage()` | Settings page |

## Data Flow

```
User opens New Tab
  → index.html loads in a new tab context
  → app.js (ES module) initializes
  → imports storage.js → chrome.storage.local.get() → loads saved preferences
  → applies theme, widget visibility, search engine from prefs
  → imports network.js → runNetworkCheck() → parallel fetch timing for
      latency (Google HEAD ping), download (jsDelivr GET), upload (httpbin POST),
      public IP (ipwho.is GET)
  → renders all widgets with live + stored data
  → setInterval ticks clock every 1s
  → scheduleAutoRefresh() runs network check on user-configured interval
  → initBookmarks() reads chrome.bookmarks if widget enabled
  → initWeather() fetches wttr.in if city configured and widget enabled

User changes a setting in options.js
  → chrome.storage.local.set() saves the change
  → chrome.storage.onChanged fires
  → app.js listener re-renders the affected widget

User opens side panel (toolbar icon or ◫ button)
  → sidepanel.js initializes
  → Tab navigation: Home | Bookmarks | Weather | Notes
  → Home tab runs triggerNetworkCheck() on load
  → Tabs load their content lazily on first activation
  → Notes textarea shares the same storage key as the dashboard
```

## File Responsibilities

### src/newtab/
- `index.html` — DOM skeleton only. No inline scripts or styles.
- `styles.css` — All visual styling: dark background, neon tokens, glassmorphism cards, animations, bookmark/weather styles, responsive layout.
- `app.js` — Dashboard controller. Initializes clock, search, particles, network widget (latency/download/upload/IP), quick links, notes, bookmarks, weather. Listens for storage changes.

### src/shared/
- `constants.js` — Default preference values, search engine URLs, speed test URLs, weather base URL, version string. Never imports anything.
- `storage.js` — Thin wrapper around `chrome.storage.local`. Exposes `getPrefs`, `setPrefs`, `resetPrefs`, `onPrefsChange`, `initStorage`.
- `utils.js` — Pure helper functions: `formatBytes`, `formatMs`, `formatMbps`, `debounce`, `createElement`, `timeAgo`. No side effects.
- `network.js` — Network estimation: `measureLatency`, `estimateDownloadSpeed`, `estimateUploadSpeed`, `fetchPublicIp`, `runNetworkCheck`, `scheduleAutoRefresh`.

### src/background/
- `service-worker.js` — Registers on `chrome.runtime.onInstalled`. Sets default preferences if storage is empty. Registers side panel path and sets `openPanelOnActionClick: true` so the toolbar icon opens the panel on any tab.

### src/sidepanel/
- `sidepanel.html` — 4-tab panel shell: Home (network + quick links), Bookmarks, Weather, Notes.
- `sidepanel.css` — Tab navigation bar, stat cards, bookmark browser, weather card, notes textarea.
- `sidepanel.js` — Tab switching (lazy-load on first activate), network check, bookmark browser, weather fetch, notes auto-save. Shares the `notes` storage key with the dashboard.

### src/options/
- `options.html/css/js` — Settings UI. Reads prefs on load, writes on every input change (debounced 300ms). Reset button clears storage and reloads.

## Network Speed Approximation

The extension cannot access raw system network interfaces. It approximates using browser fetch timing. All four checks run in parallel via `Promise.all`.

**Latency:**
```
start = performance.now()
fetch('https://www.google.com/generate_204', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
latencyMs = Math.round(performance.now() - start)
```
`mode: 'no-cors'` means the response is opaque — only timing is used.

**Download speed:**
```
start = performance.now()
res = fetch('https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js', { cache: 'no-store' })
buffer = await res.arrayBuffer()   // ~320 KB
elapsed = (performance.now() - start) / 1000
downloadMbps = (buffer.byteLength * 8) / elapsed / 1_000_000
```

**Upload speed:**
```
payload = new Uint8Array(150 * 1024)   // 150 KB
crypto.getRandomValues(payload)        // random so it cannot be compressed
start = performance.now()
fetch('https://httpbin.org/post', { method: 'POST', body: payload,
  headers: { 'Content-Type': 'application/octet-stream' }, cache: 'no-store' })
elapsed = (performance.now() - start) / 1000
uploadMbps = (payload.byteLength * 8) / elapsed / 1_000_000
```
Timing ends when server response headers arrive (not full body) — dominated by upload time for a large payload.

**Public IP + ISP:**
```
res = fetch('https://ipwho.is/', { cache: 'no-store' })
data = await res.json()   // { ip, isp, city, country, success }
```

All values labeled "Approximate" in the UI.

## Bookmarks Implementation

Bookmarks are never stored remotely. Two views are available:

**Recent view:** `chrome.bookmarks.getRecent(30)` — sorted by last-clicked timestamp (stored in `chrome.storage.local` under `bookmarkClicks: { url: timestamp }`) with `dateAdded` as fallback.

**By Domain view:** `chrome.bookmarks.getTree()` → flatten all leaf nodes → group by `new URL(node.url).hostname` → sort groups by most-recently-interacted bookmark → sort items within group by last-clicked then `dateAdded`.

Domain groups collapse/expand on click. Favicons use Chrome's built-in `chrome-extension://[id]/_favicon/?pageUrl=` endpoint — no external favicon CDN.

## Weather Implementation

Weather is fetched from `wttr.in` — no API key required.

```
GET https://wttr.in/{city}?format=j1
→ JSON: { current_condition, nearest_area, weather }
```

The `current_condition[0]` object provides `temp_C`/`temp_F`, `FeelsLikeC`/`FeelsLikeF`, `humidity`, `weatherCode`, and `weatherDesc`. A lookup table maps `weatherCode` integers to emoji icons. Weather is fetched only when:
1. The Weather widget is enabled in Settings
2. A city name is configured in Settings → Weather

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
  "privacyDismissed": false,
  "weatherCity": "",
  "weatherUnits": "metric",
  "quickLinks": [
    { "label": "GitHub", "url": "https://github.com", "icon": "🐙" }
  ],
  "widgets": {
    "clock": true,
    "network": true,
    "quickLinks": true,
    "notes": true,
    "bookmarks": false,
    "weather": false
  },
  "bookmarkClicks": {
    "https://example.com": 1717000000000
  }
}
```

`bookmarkClicks` is a flat map of `url → lastClickedTimestamp`. It grows as the user clicks bookmarks and is used solely for sorting.

## Content Security Policy

Enforced at two levels — both must allow an operation for it to proceed:

1. `manifest.json` → `content_security_policy.extension_pages`
2. `<meta http-equiv="Content-Security-Policy">` in each HTML file

Current policy (applied to all extension pages via manifest):
```
default-src 'self';
style-src   'self' https://fonts.googleapis.com;
font-src    https://fonts.gstatic.com;
connect-src 'self' https://www.google.com https://cdn.jsdelivr.net
            https://httpbin.org https://ipwho.is https://wttr.in;
img-src     'self' data:;
script-src  'self'
```

No `unsafe-inline`, no `unsafe-eval`. The `data:` in `img-src` allows the SVG arrow in the settings page select dropdown.

## Chrome API Usage

| API | Used in | Purpose |
|---|---|---|
| `chrome.storage.local` | storage.js, app.js, sidepanel.js | Persist all preferences and bookmark click history |
| `chrome.storage.session` | app.js | Cache speed history for the current browser session |
| `chrome.runtime.onInstalled` | service-worker.js | Set defaults on first install |
| `chrome.runtime.openOptionsPage` | app.js, sidepanel.js | Open settings page |
| `chrome.sidePanel.setOptions` | service-worker.js | Register side panel path |
| `chrome.sidePanel.setPanelBehavior` | service-worker.js | Enable toolbar icon → panel on any tab |
| `chrome.sidePanel.open` | app.js | Open panel from dashboard ◫ button |
| `chrome.tabs.query` | app.js | Get active tab ID for sidePanel.open |
| `chrome.bookmarks.getTree` | app.js, sidepanel.js | Load all bookmarks for By Domain view |
| `chrome.bookmarks.getRecent` | app.js, sidepanel.js | Load recently added bookmarks for Recent view |
| `chrome.runtime.getURL` | app.js, sidepanel.js | Build favicon URL via built-in /_favicon/ endpoint |
