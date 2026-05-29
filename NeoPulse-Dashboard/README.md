# NeoPulse Dashboard

A futuristic cyberpunk Chrome Extension that replaces your New Tab page with a live internet dashboard — neon glassmorphism UI, animated particles, network speed monitoring, bookmarks browser, weather, quick links, notes, and an Opera GX-style side panel.

---

## Features

| Feature | Details |
|---|---|
| Digital clock | Large neon HUD clock updating every second |
| Network speed | Latency, download, upload (approx) with live history graph |
| Public IP + ISP | Fetched on each speed test via ipwho.is |
| Offline detection | Instant status dot change on connect/disconnect |
| Quick links | 6 configurable launch tiles with hover glow |
| Bookmarks | Smart browser with Recent and By Domain views; sorts by last clicked |
| Notes | Auto-saving notes synced between dashboard and side panel |
| Speed graph | Canvas-drawn history of last 20 readings |
| Weather | Live weather via wttr.in — no API key required, just enter a city |
| Side panel | Opera GX-style 4-tab panel (Home, Bookmarks, Weather, Notes) — opens from toolbar icon on **any** tab |
| Settings page | Theme, animations, widgets, weather city, search engine, refresh interval |
| 3 themes | Neon Blue (default), Neon Purple, Neon Green |
| Privacy first | All personal data stored locally — minimal, transparent outbound requests |

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
The first speed test runs automatically ~1.5 seconds after opening a new tab. Click **Run Speed Test** to trigger a manual test. All values are labelled "approx" — they are estimates, not precision measurements.

### Bookmarks
Enable the Bookmarks widget in Settings → Widgets. Two views:
- **Recent** — your most recently added bookmarks, sorted by last clicked
- **By Domain** — all bookmarks grouped by website, with the most-used groups at the top

Click any domain group header to expand it.

### Notes
Click the Notes area and start typing. Notes are saved automatically after a short pause. They are shared between the main dashboard and the side panel.

### Weather
1. Go to **Settings → Weather**
2. Type your city name (e.g. `London`, `New York`, `Tokyo`)
3. Choose Celsius or Fahrenheit
4. Enable the Weather widget in **Settings → Widgets**

No API key needed — weather is powered by [wttr.in](https://wttr.in).

### Side Panel
Click the **◫** button in the bottom-right of the dashboard, **or** click the NeoPulse toolbar icon from any tab. The panel has four tabs:

| Tab | Content |
|---|---|
| ◉ Home | Network stats (latency, download, upload, IP), quick links |
| ⊞ Bookmarks | Full bookmark browser — accessible on any page |
| ☁ Weather | Live weather card |
| ≡ Notes | Full notes textarea, synced with dashboard |

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

### Setting up weather
Settings → Weather → City → type any city name. Units toggle between °C and °F.

---

## Privacy

NeoPulse Dashboard is built with privacy as a default:

- **No tracking** — no analytics, no telemetry, no advertising
- **No external data collection** — your notes, settings, and browsing stay on your device
- **Local storage only** — all preferences use `chrome.storage.local`, isolated to this extension
- **Outbound requests are minimal and transparent:**

| URL | Purpose | Data sent |
|---|---|---|
| `https://www.google.com/generate_204` | Latency ping (HEAD request) | None |
| `https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js` | Download speed estimate | None |
| `https://httpbin.org/post` | Upload speed estimate (POST of random bytes) | 150 KB of random binary — no user data |
| `https://ipwho.is/` | Public IP + ISP lookup | None (server reads your IP to return it) |
| `https://wttr.in/{city}` | Live weather (only if city configured in Settings) | City name only |

- **All requests visible in Chrome DevTools → Network tab** — nothing is hidden
- **Bookmark data** is read locally only — never sent anywhere

---

## Known Limitations

| Limitation | Why |
|---|---|
| Speed values are approximate ±30% | Browser fetch timing is an estimate, not a precision tool |
| IP lookup discloses IP to ipwho.is | Unavoidable — the server must see your IP to return it |
| Side panel requires Chrome 114+ | `chrome.sidePanel` API minimum version |
| Notes don't sync across devices | Uses local storage by design — opt-in sync is a future option |
| First speed test takes 2–4 seconds | Downloads ~320 KB from jsDelivr for measurement |
| Upload measurement adds ~1–2 seconds | Posts 150 KB to httpbin.org for round-trip timing |

---

## Permissions Used

| Permission | Why |
|---|---|
| `storage` | Save your settings, notes, and bookmark click history locally |
| `sidePanel` | Register and open the Chrome side panel |
| `bookmarks` | Read your Chrome bookmarks for the Bookmarks widget |
| `tabs` | Query the active tab ID to open the side panel from the dashboard button |

See `docs/PERMISSIONS.md` for the full breakdown including privacy impact of each.

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
    ├── sidepanel/             Opera GX-style 4-tab side panel
    ├── options/               Settings page
    ├── background/            Service worker
    ├── shared/                Shared modules (storage, network, utils, constants)
    └── assets/                Icons and media
```

---

## Future Improvements

- Drag-to-reorder quick links
- Custom quick link editor in Settings
- Customisable download test URL in Settings
- Optional `chrome.storage.sync` for cross-device settings (opt-in)
- Ambient sound effects
- Additional themes (Matrix green, Amber terminal, Ice blue)
- Pomodoro / focus timer widget
- Bookmark search within the panel
