# NeoPulse Dashboard — Permissions Reference

## Declared Permissions

### `storage`

**Required:** Yes

**Why it is needed:**
All user preferences (theme, widget toggles, notes, search engine, refresh interval) are saved using `chrome.storage.local`. Without this permission, the extension cannot remember any settings between tab opens.

**What happens if removed:**
Settings reset to defaults every time you open a new tab. Notes are lost on tab close.

**Privacy impact:**
None. Data is stored only on your local device. `chrome.storage.local` is isolated to this extension — no other extension or website can read it.

---

### `sidePanel`

**Required:** Yes (for side panel feature)

**Why it is needed:**
Needed to register the side panel path on install (`chrome.sidePanel.setOptions`) and to open the panel from the dashboard button (`chrome.sidePanel.open`).

**What happens if removed:**
The side panel button on the dashboard does nothing. The rest of the extension is unaffected.

**Privacy impact:**
None. This permission only controls the extension's own side panel UI.

---

### `bookmarks` *(optional)*

**Required:** No — disabled by default

**Why it is needed:**
If the user enables the Bookmarks widget in settings, the extension reads the bookmark tree using `chrome.bookmarks.getTree()` to display bookmark titles and URLs in the dashboard.

**What happens if removed:**
The Bookmarks widget is permanently hidden. No other functionality is affected.

**Privacy impact:**
Low. The extension reads bookmark titles and URLs but never stores them remotely or exposes them outside the dashboard UI.

---

### `tabs` *(optional)*

**Required:** No — disabled by default

**Why it is needed:**
If enabled, the extension can read the URL of the currently active tab to show contextual quick links.

**What happens if removed:**
Quick links lose context-awareness and show static user-defined links only.

**Privacy impact:**
Low. Only the URL of the currently active tab is read, only when the user explicitly triggers the feature.

---

## Host Permissions

### `https://www.google.com/generate_204`

**Why it is needed:**
Used as the latency ping target. The extension sends a HEAD request and measures the round-trip time using `performance.now()`. The response is a 204 with no body — near-zero data transfer.

**Privacy impact:**
Google's servers see a standard HTTP HEAD request from your IP address, identical to any normal web request. No user data, cookies, or headers beyond standard browser headers are included.

**What happens if removed:**
Latency widget shows "Unavailable". Download speed test still works if its URL is on a permitted host.

---

### `https://cdn.jsdelivr.net/*` *(configurable)*

**Why it is needed:**
Used to fetch a known-size file for download speed estimation. The file size divided by fetch time gives an approximate download speed.

**Privacy impact:**
The CDN sees a standard GET request from your IP. No user data sent.

**What happens if removed:**
Download speed widget shows "Unavailable". Latency still works.

---

## Permissions NOT Requested

| Permission | Reason not requested |
|---|---|
| `history` | The dashboard does not use browsing history in any way |
| `cookies` | No cookie access needed |
| `downloads` | No download management |
| `geolocation` | Weather is a static placeholder; no location access taken |
| `notifications` | No push notifications or alerts |
| `identity` | No Google sign-in or OAuth |
| `scripting` | Extension uses declarative New Tab override only, no runtime injection |
| `webRequest` | No request interception needed |
| `nativeMessaging` | No communication with native apps |

---

## Privacy Summary

- **No data leaves your device** (except standard HTTP requests for speed testing)
- **No analytics** of any kind
- **No advertising** or tracking pixels
- **No external APIs** called without user knowledge
- **No browsing history** accessed
- All data stored in `chrome.storage.local` — device-only, extension-isolated
