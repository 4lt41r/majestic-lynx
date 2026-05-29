# NeoPulse Dashboard — Project Log

---

## Phase 1 — Architecture Analysis
**Date:** 2026-05-29
**Status:** Complete

### What was done
- Defined full extension architecture (layman + technical terms)
- Mapped all 22 files to be created across 12 phases
- Documented all required Chrome permissions with privacy impact analysis
- Identified network speed approximation strategy (fetch timing, no-cors HEAD ping)
- Identified risks: speed accuracy ±30%, side panel Chrome 114+ requirement, Orbitron font CSP

### Files changed
None — analysis only.

### Risks noted
- Browser fetch timing gives ±30% accuracy for speed estimates
- `no-cors` mode limits ping to timing only (no response inspection)
- Side panel requires Chrome 114+

---

## Phase 2 — Base Folder Structure + Documentation
**Date:** 2026-05-29
**Status:** Complete

### What was added
- `NeoPulse-Dashboard/` root directory and full folder tree
- `README.md` — project overview, install guide, privacy note, known limitations
- `docs/ARCHITECTURE.md` — technical architecture, data flow, file responsibilities, CSP, Chrome API table
- `docs/PERMISSIONS.md` — every permission explained with privacy impact and removal consequence
- `docs/PROJECT_LOG.md` — this file
- `docs/TESTING_CHECKLIST.md` — manual testing skeleton
- Asset placeholder directories: `src/assets/icons/`, `src/assets/images/`, `src/assets/sounds/`

### Files changed
```
NeoPulse-Dashboard/README.md                (created)
NeoPulse-Dashboard/docs/ARCHITECTURE.md     (created)
NeoPulse-Dashboard/docs/PERMISSIONS.md      (created)
NeoPulse-Dashboard/docs/PROJECT_LOG.md      (created)
NeoPulse-Dashboard/docs/TESTING_CHECKLIST.md (created)
```

### How to test
Run `tree F:\Test\NeoPulse-Dashboard /F` in PowerShell and verify all folders and doc files are present.

### Next phase
Phase 3 — Create `manifest.json`

---

## Phase 3 — manifest.json
**Date:** 2026-05-29
**Status:** Complete

### What was added
- `manifest.json` with full Manifest V3 structure:
  - `chrome_url_overrides.newtab` → `src/newtab/index.html`
  - `background.service_worker` → `src/background/service-worker.js` (type: module)
  - `side_panel.default_path` → `src/sidepanel/sidepanel.html`
  - `options_ui.page` → `src/options/options.html` (opens in tab)
  - `permissions: ["storage", "sidePanel"]`
  - `host_permissions: ["https://www.google.com/generate_204"]`
  - Strict CSP: no unsafe-inline, no unsafe-eval
  - Icon paths declared (PNG files to be added in Phase 5)

### Files changed
```
NeoPulse-Dashboard/manifest.json  (created)
```

### How to test
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select `F:\Test\NeoPulse-Dashboard\`
4. Extension should load — icon warnings are expected (PNG files not yet created)
5. Open a new tab — Chrome will show an error since `index.html` doesn't exist yet (expected)

### Risks / limitations
- Icon PNG files are not yet created — Chrome will show icon warnings but still load the extension
- New tab will error until `src/newtab/index.html` is created in Phase 4

### Next phase
Phase 4 — New Tab HTML structure

---

## Phase 4 — New Tab HTML Structure
**Date:** 2026-05-29
**Status:** Complete

### What was added
- `src/newtab/index.html` — full semantic DOM structure with all widget sections:
  - Canvas particle overlay + animated grid background layer
  - Header: digital clock, date, network status dot
  - Search bar: input + engine selector (Google / Bing / DuckDuckGo)
  - Network panel: latency, download, upload, public IP metric cards with animated bars
  - Speed history graph canvas
  - Quick links tile grid
  - Bookmarks section (hidden by default)
  - Notes textarea (auto-save)
  - Weather placeholder card
  - Footer: settings button, side panel button
  - First-run privacy notice banner
- `src/newtab/styles.css` — stub (dark background only)
- `src/newtab/app.js` — stub (console.log only)
- `src/assets/icons/icon{16,32,48,128}.png` — placeholder neon-blue PNG icons

### Files changed
```
src/newtab/index.html    (created)
src/newtab/styles.css    (created — stub)
src/newtab/app.js        (created — stub)
src/assets/icons/icon16.png   (created — placeholder)
src/assets/icons/icon32.png   (created — placeholder)
src/assets/icons/icon48.png   (created — placeholder)
src/assets/icons/icon128.png  (created — placeholder)
```

### How to test
1. Reload unpacked extension at `chrome://extensions`
2. Open a new tab — the raw unstyled HTML structure should be visible on dark background
3. Check DevTools console — should see "NeoPulse Dashboard loaded"
4. No JavaScript errors expected

### Next phase
Phase 5 — Full futuristic CSS design

---

## Phase 5 — Futuristic CSS Design
**Date:** 2026-05-29
**Status:** Complete

### What was added
- Full `src/newtab/styles.css` with:
  - CSS design tokens via custom properties (`--accent`, `--bg-dark`, `--glass-*`, etc.)
  - Theme variants: neon-blue (default), neon-purple, neon-green — switched by `data-theme` on `<html>`
  - Orbitron + Share Tech Mono fonts via `@import` (CSS only, no CDN JS)
  - Animated grid background (`@keyframes grid-pulse`) with radial mask
  - Full-screen particle canvas styles (populated by JS)
  - `.glass-card` glassmorphism component with `backdrop-filter`, glow on hover
  - Large neon clock with `clock-flicker` keyframe
  - Status dot with `status-pulse` keyframe for online state
  - Search bar with `focus-within` neon glow ring
  - 4-column network metric card grid with animated fill bars
  - `approx-tag` badge styling
  - Speed graph canvas container
  - Quick links grid with holographic `holo-shimmer` hover animation
  - Bookmarks list styling
  - Frosted glass notes textarea
  - Weather placeholder card
  - `.btn`, `.btn--neon`, `.btn--ghost`, `.btn--icon` button variants
  - Fixed footer with gradient fade
  - Privacy notice banner
  - `neon-shimmer` keyframe on section titles
  - CRT scanline overlay (`body::after`)
  - Responsive breakpoints: 3-col (desktop), 2-col (≤900px), 1-col (≤560px)

### Files changed
```
src/newtab/styles.css  (fully replaced from stub)
```

### How to test
1. Reload extension at `chrome://extensions`
2. Open a new tab — futuristic dark cyberpunk layout should be visible
3. Grid background should pulse gently
4. Clock should show neon glow
5. Cards should have glassmorphism borders

### Next phase
Phase 6 — JavaScript (clock, search, quick links, particles, service worker)

---

## Phase 6 — JavaScript Core
**Date:** 2026-05-29
**Status:** Complete

### What was added
- `src/shared/constants.js` — DEFAULTS, SEARCH_ENGINES, PARTICLE_COUNTS, VERSION, PING_URL
- `src/shared/storage.js` — getPrefs (deep-merge with defaults), setPrefs, resetPrefs, onPrefsChange, initStorage
- `src/shared/utils.js` — debounce, formatTime, formatDate, formatMs, formatMbps, formatBytes, setText, createElement, clamp, timeAgo
- `src/background/service-worker.js` — onInstalled handler: initStorage, sidePanel.setOptions
- `src/newtab/app.js` (full build):
  - init() boot sequence
  - startClock() — setInterval 1s, formatTime/formatDate
  - applyTheme() — sets data-theme on <html>
  - applyWidgetVisibility() — shows/hides sections from prefs
  - setupSearch() — form submit navigates to engine URL
  - renderQuickLinks() — builds tiles via createElement (no innerHTML)
  - setupNotes() — debounced auto-save, saved indicator flash
  - initParticles() — canvas rAF loop, count driven by animationIntensity
  - setupFooter() — version label, settings button, side panel button
  - showPrivacyNotice() — first-run banner, dismisses to storage
  - listenForPrefChanges() — live theme/widget/links re-render on storage change
  - window.onerror + unhandledrejection global guards

### Security fix applied
- Replaced `grid.innerHTML = ''` with `grid.replaceChildren()` — no innerHTML assignments anywhere in codebase

### Files changed
```
src/shared/constants.js          (created)
src/shared/storage.js            (created)
src/shared/utils.js              (created)
src/background/service-worker.js (created)
src/newtab/app.js                (fully replaced from stub)
```

### How to test
1. Reload extension at `chrome://extensions`
2. Open new tab — clock should tick every second, date should show correctly
3. Type in search bar + Enter — should navigate to Google
4. Change engine to Bing, search again — should use Bing
5. Particles should float gently across the screen
6. DevTools console should show zero errors

### Next phase
Phase 7 — Network speed / latency module

---

## Phase 7 — Network Speed / Latency Module
**Date:** 2026-05-29
**Status:** Complete

### What was added
- `src/shared/network.js`:
  - `checkOnlineStatus()` — returns `navigator.onLine`
  - `measureLatency(url)` — HEAD fetch with `performance.now()` timing, `mode: no-cors`
  - `estimateDownloadSpeed(url)` — fetches ~320KB React file, measures bytes/elapsed
  - `runNetworkCheck(config)` — runs latency + download in parallel, returns `{ online, latencyMs, downloadMbps, timestamp }`
  - `scheduleAutoRefresh(intervalSec, cb)` — enforces 60s minimum floor
- `src/newtab/app.js` additions:
  - `initNetwork()` — wires browser online/offline events, manual button, auto-refresh timer
  - `triggerNetworkCheck()` — loading state, error handling, saves to session storage
  - `updateNetworkUI()` — updates metric cards + animated bar fills
  - `updateStatusDot()` — switches CSS class for online/offline/unknown
  - `saveSpeedReading()` — appends to `chrome.storage.session.speedHistory` (for graph in Phase 8)
- `manifest.json` — added `https://cdn.jsdelivr.net/*` to host_permissions
- CSP updated in both manifest.json and index.html to include cdn.jsdelivr.net

### Files changed
```
src/shared/network.js        (created)
src/shared/constants.js      (added DEFAULT_DOWNLOAD_URL)
src/newtab/app.js            (added network module wiring)
src/newtab/index.html        (updated CSP meta tag)
manifest.json                (added cdn.jsdelivr.net host permission + CSP)
```

### How to test
1. Reload extension, open new tab
2. After ~1.5s the speed test auto-runs — latency and download values appear
3. Values should show "approx" badge
4. Click "Run Speed Test" — values update, button shows "Testing…" during run
5. Disconnect WiFi/network → status dot turns red, widget shows "—" values
6. Reconnect → dot turns green, next auto-run restores values

### Risks / limitations
- Download test fetches ~320KB from CDN — uses bandwidth (only on demand or at refresh interval)
- Accuracy is ±30% — labeled accordingly in UI
- IP / ISP display shows "—" — requires a separate geolocation API (future enhancement)

### Next phase
Phase 8 — Speed graph + dashboard animations

---

## Phase 8 — Speed Graph + Animations
**Date:** 2026-05-29
**Status:** Complete

### What was added
- `src/newtab/app.js` additions:
  - `initSpeedGraph()` — sets up canvas DPI scaling, loads session history, draws on resize
  - `setupCanvasDpi()` — applies `devicePixelRatio` scaling for sharp HiDPI rendering
  - `loadAndDrawGraph()` — reads `chrome.storage.session.speedHistory`, calls drawSpeedGraph
  - `drawSpeedGraph(history)` — full canvas render:
    - Placeholder text when < 2 readings
    - 4 horizontal grid lines with Y-axis Mbps labels
    - Gradient fill under the line
    - 3-pass glow polyline (wide dim → medium → thin bright)
    - Data point dots; latest point highlighted white
    - X-axis reading count label
  - `saveSpeedReading()` — now calls `drawSpeedGraph()` after each save
  - `flashValue(id)` — CSS class restart trick for value-update flash animation
  - `applyAnimationIntensity()` — sets `data-animation` attribute on `<html>`
- `src/newtab/styles.css` additions:
  - `html[data-animation="off"]` — strips all animations/transitions
  - `html[data-animation="low"]` — slows transitions, reduces glow
  - `html[data-animation="high"]` — snappier transitions, brighter glows
  - `@keyframes graph-appear` — graph canvas scale-in on first data
  - `@keyframes value-update` — neon flash when metric card value changes
  - `@keyframes dot-pulse` — latest data point pulses

### Files changed
```
src/newtab/app.js      (added graph + animation intensity)
src/newtab/styles.css  (added intensity variants + graph animations)
```

### How to test
1. Reload extension, open new tab
2. Run speed test twice — graph should draw a cyan glowing polyline
3. Run a third time — graph updates with new point, latest dot highlighted white
4. In settings (Phase 9), change animation intensity to "off" — all animations stop
5. Chrome DevTools Performance tab: idle CPU should stay under 5%

### Next phase
Phase 9 — Options / settings page

---

## Phase 9 — Options / Settings Page
**Date:** 2026-05-29
**Status:** Complete

### What was added
- `src/options/options.html` — full settings page with 5 sections:
  - Appearance: theme colour select, animation intensity select, particles toggle
  - Widgets: 6 show/hide toggles (clock, network, quick links, notes, bookmarks, weather)
  - Search: default search engine select
  - Network: refresh interval range slider with human-readable label, sounds toggle
  - Reset: danger-styled section with confirmation dialog before clearing all prefs
- `src/options/options.css` — full futuristic styling matching main dashboard:
  - Same design tokens, theme variants, glass cards
  - Custom toggle switch component
  - Custom range slider with neon thumb
  - Custom select with chevron arrow
  - Animated save banner (slides in from right)
  - Danger section with red accent
- `src/options/options.js`:
  - `populateForm()` — reads all prefs and fills every control on load
  - `bindControls()` — debounced 300ms auto-save on any input change
  - `saveAll()` — reads full form state, writes to chrome.storage.local
  - `setupResetButton()` — window.confirm guard before resetPrefs()
  - `applyThemePreview()` / `applyAnimPreview()` — settings page reflects theme/animation immediately
  - `showSaveBanner()` — "✓ Settings saved" banner appears 1.8s after any change
  - `formatInterval()` — converts seconds to "5 min", "1 hr", etc.

### Files changed
```
src/options/options.html  (created)
src/options/options.css   (created)
src/options/options.js    (created)
```

### How to test
1. Open new tab, click ⚙ Settings button
2. Verify all controls reflect current saved values
3. Change theme → settings page recolours immediately
4. Change theme → open new tab → verify dashboard uses new colour
5. Toggle a widget off → open new tab → verify widget is hidden
6. Change refresh interval → slider label updates in real time
7. Click Reset → confirm → page reloads with defaults

### Next phase
Phase 10 — Side panel

---

## Phase 10 — Side Panel
**Date:** 2026-05-29
**Status:** Complete

### What was added
- `src/sidepanel/sidepanel.html` — compact panel layout:
  - Header: NeoPulse logo + network status dot + label
  - Network stats: 2-card grid (latency, download) with approx badges
  - Quick links: 4-tile grid (first 4 from prefs)
  - Notes textarea: shared storage key with main dashboard
  - Footer: settings button + version label
- `src/sidepanel/sidepanel.css` — compact futuristic styling:
  - Same design tokens + theme variants as main dashboard
  - 4-column quick link grid optimised for narrow panel width
  - Smaller font sizes, tighter spacing
  - Scrollable full-height layout
- `src/sidepanel/sidepanel.js`:
  - Boot: loads prefs, applies theme/animation, renders links, runs initial network check
  - `triggerNetworkCheck()` — loading state, error handling
  - `updateNetworkUI()` — updates stat cards + last-tested label
  - `updateStatusDot()` — online/offline CSS class switching
  - `renderQuickLinks()` — first 4 links, safe DOM construction
  - `setupNotes()` — debounced auto-save to shared `notes` storage key
  - `onPrefsChange` listener — live theme/links/notes sync from dashboard
  - Notes textarea: only updates from external change if user is not actively typing

### Files changed
```
src/sidepanel/sidepanel.html  (created)
src/sidepanel/sidepanel.css   (created)
src/sidepanel/sidepanel.js    (created)
```

### How to test
1. Open new tab → click ◫ side panel button
2. Side panel should open on the right side of Chrome
3. After ~1s, latency and download values appear
4. Type in the notes area → open new tab → notes should match
5. Type in notes in new tab → side panel notes should update (if not actively typing)
6. Click Settings in panel → settings page opens
7. Change theme in settings → panel recolours live
8. Disconnect network → status dot turns red

### Next phase
Phase 11 — Error handling + privacy safeguards

---

## Phase 11 — Error Handling + Privacy Safeguards
**Date:** 2026-05-29
**Status:** Complete

### What was added / fixed

#### storage.js — full try/catch on every function
- `getPrefs()` — returns DEFAULTS on storage failure, logs error
- `setPrefs()` — catches and logs write failures silently
- `resetPrefs()` — catches clear/set failures
- `onPrefsChange()` — outer listener registration + inner callback wrapped
- `initStorage()` — catches init failures

#### app.js
- `init()` — try/catch around `getPrefs()` — falls back to DEFAULTS
- `showStorageError()` — red banner injected via safe DOM (no innerHTML), auto-removes after 6s
- `initParticles()` — null-check on `canvas.getContext('2d')` before use
- `window.onerror` + `unhandledrejection` already present (Phase 6)

#### options.js
- Added `window.onerror` + `unhandledrejection` global handlers (were missing)

#### sidepanel.js
- Added `unhandledrejection` handler (window.onerror already present from Phase 10)

### Security audit results
| Check | Result |
|---|---|
| `innerHTML` assignments | None found |
| `eval()` calls | None found |
| `document.write` calls | None found |
| `new Function()` calls | None found |
| User data in console logs | None — only Error objects + version strings |
| CSP meta tag in all HTML | Present and correct |
| Brace balance in all JS | All 8 files balanced |

### CSP per page
- `newtab`: connects to google.com + cdn.jsdelivr.net (speed test)
- `sidepanel`: same as newtab (runs speed test)
- `options`: no connect-src (no outbound requests)

### Files changed
```
src/shared/storage.js         (try/catch added to all functions)
src/newtab/app.js             (storage error banner, getContext null-check)
src/options/options.js        (added window.onerror + unhandledrejection)
src/sidepanel/sidepanel.js    (added unhandledrejection)
```

### Next phase
Phase 12 — Final testing checklist + Chrome loading guide

---

## Phase 12 — Final Testing Checklist + Chrome Loading Guide
**Date:** 2026-05-29
**Status:** Complete

### What was added / finalized
- `docs/TESTING_CHECKLIST.md` — fully written with 14 test sections and ~60 individual test cases:
  - Extension load, New Tab, Clock, Status dot, Search, Network widget
  - Speed graph, Quick links, Notes, Settings, Side panel
  - Offline mode, Performance benchmarks, Security checks
  - Known limitations table
- `README.md` — fully updated with:
  - Feature table
  - Step-by-step installation guide with screenshots callouts
  - Usage instructions for all features
  - Privacy statement with exact outbound URLs disclosed
  - Known limitations table
  - Full project structure tree
  - Future improvements list

### Final security audit results
| Check | Result |
|---|---|
| Hardcoded API keys / secrets / tokens | None found |
| `eval()` in any file | None found |
| Unapproved external URLs in JS | None found |
| `innerHTML` assignments | None found |
| CSP violations | None (no unsafe-inline, no unsafe-eval) |
| Manifest permissions | Minimal: storage + sidePanel only |
| All JS brace-balanced | All 8 files balanced |

### Final manifest state
```json
permissions: ["storage", "sidePanel"]
host_permissions: [
  "https://www.google.com/generate_204",
  "https://cdn.jsdelivr.net/*"
]
```

### Files changed
```
docs/TESTING_CHECKLIST.md  (fully written — was skeleton)
README.md                  (fully rewritten)
docs/PROJECT_LOG.md        (this entry)
```

---

## Project Complete ✓

All 12 phases implemented. 24 files created. Extension is ready to load and test in Chrome.
