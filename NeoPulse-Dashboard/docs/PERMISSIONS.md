# NeoPulse Dashboard — Permissions Reference

## Declared Permissions

### `storage`

**Required:** Yes

**Why it is needed:**
All user preferences (theme, widget toggles, notes, search engine, refresh interval, weather city, bookmark click history) are saved using `chrome.storage.local`. Without this permission, the extension cannot remember any settings between tab opens.

**What happens if removed:**
Settings reset to defaults every time you open a new tab. Notes are lost on tab close.

**Privacy impact:**
None. Data is stored only on your local device. `chrome.storage.local` is isolated to this extension — no other extension or website can read it.

---

### `sidePanel`

**Required:** Yes (for side panel feature)

**Why it is needed:**
Needed to register the side panel path on install (`chrome.sidePanel.setOptions`), configure the toolbar icon to open the panel on click (`chrome.sidePanel.setPanelBehavior`), and open the panel from the dashboard button.

**What happens if removed:**
The side panel button on the dashboard does nothing. The toolbar icon click does nothing. The rest of the extension is unaffected.

**Privacy impact:**
None. This permission only controls the extension's own side panel UI.

---

### `bookmarks`

**Required:** Yes (for Bookmarks widget)

**Why it is needed:**
The Bookmarks widget reads your Chrome bookmark tree using `chrome.bookmarks.getTree()` and `chrome.bookmarks.getRecent()` to display titles and URLs grouped by domain or sorted by recency.

**What happens if removed:**
The Bookmarks widget cannot load — it shows an error. The widget can be disabled in Settings → Widgets to avoid the error.

**Privacy impact:**
Low. The extension reads bookmark titles and URLs but never transmits them outside the browser. Click timestamps are stored locally in `chrome.storage.local` to enable "last visited" sorting — this data never leaves your device.

---

### `tabs`

**Required:** Yes (for side panel button on new tab)

**Why it is needed:**
The ◫ button on the dashboard calls `chrome.tabs.query({ active: true, currentWindow: true })` to get the current tab ID, which is required by `chrome.sidePanel.open({ tabId })`.

**What happens if removed:**
The ◫ button on the dashboard silently fails. The side panel can still be opened via the toolbar icon (which does not need a tab ID).

**Privacy impact:**
Minimal. Only the ID of the currently active tab is read — no URL, title, or content is accessed.

---

## Host Permissions

### `https://www.google.com/generate_204`

**Why it is needed:**
Used as the latency ping target. The extension sends a HEAD request and measures the round-trip time using `performance.now()`. The response is a 204 No Content with no body.

**Privacy impact:**
Google's servers see a standard HTTP HEAD request from your IP address. No user data, cookies, or identifying headers are included beyond standard browser headers.

**What happens if removed:**
Latency widget shows "—". Download, upload, and IP checks still work.

---

### `https://cdn.jsdelivr.net/*`

**Why it is needed:**
Used to fetch a known-size file (~320 KB) for download speed estimation. Elapsed time divided into bytes gives an approximate download speed.

**Privacy impact:**
The CDN sees a standard GET request from your IP. No user data sent.

**What happens if removed:**
Download speed widget shows "—". Latency still works.

---

### `https://httpbin.org/*`

**Why it is needed:**
Used for upload speed estimation. The extension POSTs 150 KB of `crypto.getRandomValues()` bytes (not user data) and measures round-trip time.

**Privacy impact:**
httpbin.org receives a plain POST of random binary bytes. No user data, no cookies, no identifiers. The payload is cryptographically random and carries no meaning.

**What happens if removed:**
Upload speed widget shows "—". All other metrics still work.

---

### `https://ipwho.is/*`

**Why it is needed:**
Fetches the user's public IP address and ISP name to display in the Public IP card. Called once per network check.

**Privacy impact:**
The server sees your IP address (unavoidable — that is the data being returned). No other data is sent. The request carries no cookies, no user identifiers, and no browsing data. ipwho.is is a free public lookup service.

**What happens if removed:**
Public IP and ISP cards show "—". All speed metrics still work.

---

### `https://wttr.in/*`

**Why it is needed:**
Fetches live weather data for the city the user has configured in Settings → Weather. Only called when a city name is configured and the Weather widget is enabled.

**Privacy impact:**
The request URL contains the city name the user entered (e.g. `wttr.in/London?format=j1`). The server sees your IP address and the city name. No other data is sent. wttr.in is a free public weather service.

**What happens if removed:**
Weather widget shows "—" or an error. All other features still work.

---

## Permissions NOT Requested

| Permission | Reason not requested |
|---|---|
| `history` | Bookmark click tracking is handled internally in `chrome.storage.local` — no browsing history access needed |
| `cookies` | No cookie access needed |
| `downloads` | No download management |
| `geolocation` | Weather uses a user-supplied city name — no device location access |
| `notifications` | No push notifications or alerts |
| `identity` | No Google sign-in or OAuth |
| `scripting` | Extension uses declarative New Tab override only, no runtime injection |
| `webRequest` | No request interception needed |
| `nativeMessaging` | No communication with native apps |

---

## Privacy Summary

- **No data leaves your device** except standard HTTP requests for speed testing and weather
- **No analytics** of any kind
- **No advertising** or tracking pixels
- **No external APIs** called without user knowledge
- **No browsing history** accessed
- **No bookmark data** transmitted outside the browser
- All personal data stored in `chrome.storage.local` — device-only, extension-isolated
- All outbound requests are listed above and visible in Chrome DevTools → Network tab
