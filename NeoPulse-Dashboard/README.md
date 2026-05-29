# NeoPulse Dashboard

A futuristic cyberpunk Chrome Extension that replaces your New Tab page with a live internet dashboard — neon glassmorphism UI, animated particles, network speed monitoring, quick links, notes, and a full settings page.

---

## Features

| Feature | Details |
|---|---|
| Digital clock | Large neon HUD clock updating every second |
| Network speed | Approximate latency + download speed with live history graph |
| Offline detection | Instant status dot change on connect/disconnect |
| Quick links | 6 configurable launch tiles with hover glow |
| Notes | Auto-saving notes synced between dashboard and side panel |
| Speed graph | Canvas-drawn history of last 20 readings |
| Side panel | Compact Chrome side panel with stats and notes |
| Settings page | Theme, animations, widgets, search engine, refresh interval |
| 3 themes | Neon Blue (default), Neon Purple, Neon Green |
| Privacy first | All data stored locally — nothing sent to any server |

---

## Requirements

- Google Chrome **114 or later** (for side panel support; dashboard works on older Chrome)
- Developer Mode enabled (for loading unpacked extensions)

---

## Installation

### Step 1 — Download the extension

Download or clone this repository so you have the `NeoPulse-Dashboard` folder on your computer.

```
NeoPulse-Dashboard/
  manifest.json   ← this file must be present at the root
  README.md
  docs/
  src/
```

### Step 2 — Open Chrome Extensions

Open Chrome and navigate to:

```
chrome://extensions
```

### Step 3 — Enable Developer Mode

Toggle **Developer Mode** on using the switch in the **top-right corner** of the Extensions page.

### Step 4 — Load unpacked

Click the **Load unpacked** button that appears after enabling Developer Mode.

### Step 5 — Select the folder

In the file picker, navigate to and select the `NeoPulse-Dashboard` folder — the one that contains `manifest.json` directly inside it (do **not** select a parent folder).

### Step 6 — Open a new tab

Press `Ctrl+T` (Windows/Linux) or `Cmd+T` (Mac). The NeoPulse Dashboard should appear instead of Chrome's default new tab.

---

## How to Use

### Search
Click anywhere on the dashboard (search bar is auto-focused) and type your query. Press Enter. Change the search engine via the dropdown next to the search bar.

### Speed Test
The first speed test runs automatically ~1.5 seconds after opening a new tab. Click **Run Speed Test** to trigger a manual test. Values are labelled "approx" — they are estimates, not precision measurements.

### Notes
Click the Notes area and start typing. Notes are saved automatically after a short pause. They are shared between the main dashboard and the side panel.

### Side Panel
Click the **◫** button in the bottom-right of the dashboard. The Chrome side panel opens on the right side of the browser showing compact network stats and your notes.

### Settings
Click the **⚙** button in the bottom-right. The settings page opens as a full tab. All changes save automatically — no Submit button needed.

---

## Customisation

### Changing the theme
Settings → Appearance → Theme colour → choose Neon Blue, Neon Purple, or Neon Green.

### Hiding widgets
Settings → Widgets → toggle any widget off. Changes apply immediately on the next new tab.

### Adjusting speed test frequency
Settings → Network → Auto-refresh interval → drag the slider (60 seconds minimum to 1 hour maximum).

### Changing the search engine
Settings → Search → Default search engine.

---

## Privacy

NeoPulse Dashboard is built with privacy as a default:

- **No tracking** — no analytics, no telemetry, no advertising
- **No external data collection** — your notes, settings, and browsing stay on your device
- **Local storage only** — all preferences use `chrome.storage.local`, isolated to this extension
- **Outbound requests are minimal and transparent:**
  - `https://www.google.com/generate_204` — HEAD request for latency estimation (no user data sent)
  - `https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js` — downloaded to estimate connection speed (no user data sent)
- **Both network requests can be seen in Chrome DevTools Network tab** — nothing is hidden

---

## Known Limitations

| Limitation | Why |
|---|---|
| Speed values are approximate ±30% | Browser fetch timing is an estimate, not a precision tool |
| Upload speed shows "N/A" | Requires a server endpoint — not included for privacy reasons |
| IP / ISP shows "—" | Requires a geolocation API — not bundled to avoid third-party calls |
| Side panel requires Chrome 114+ | `chrome.sidePanel` API minimum version |
| Weather is a placeholder | Live weather requires a free API key from OpenWeatherMap |
| Notes don't sync across devices | Uses local storage by design — opt-in sync is a future option |

---

## Permissions Used

| Permission | Why |
|---|---|
| `storage` | Save your settings and notes locally on your device |
| `sidePanel` | Register and open the Chrome side panel |

See `docs/PERMISSIONS.md` for the full breakdown including optional permissions and privacy impact of each.

---

## Project Structure

```
NeoPulse-Dashboard/
├── manifest.json              Extension manifest (Manifest V3)
├── README.md                  This file
├── docs/
│   ├── ARCHITECTURE.md        Technical architecture and data flow
│   ├── PERMISSIONS.md         Every permission explained with privacy impact
│   ├── PROJECT_LOG.md         Phase-by-phase development log
│   └── TESTING_CHECKLIST.md   Complete manual testing guide
└── src/
    ├── newtab/                Main dashboard (New Tab override)
    ├── sidepanel/             Chrome side panel
    ├── options/               Settings page
    ├── background/            Service worker
    ├── shared/                Shared modules (storage, network, utils, constants)
    └── assets/                Icons and media
```

---

## Future Improvements

- Live weather via OpenWeatherMap (user provides own API key in Settings)
- Drag-to-reorder quick links
- Custom quick link editor in Settings
- Customisable download test URL in Settings
- Optional `chrome.storage.sync` for cross-device settings (opt-in)
- Ambient sound effects
- Additional themes (Matrix green, Amber terminal, Ice blue)
- Pomodoro / focus timer widget
