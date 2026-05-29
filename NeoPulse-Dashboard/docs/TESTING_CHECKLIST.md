# NeoPulse Dashboard — Testing Checklist

Complete this checklist top-to-bottom after any significant change or before sharing/publishing the extension.

---

## 1. Load the Extension in Chrome

- [ ] Open Chrome and navigate to `chrome://extensions`
- [ ] Enable **Developer Mode** (toggle, top-right corner)
- [ ] Click **Load unpacked**
- [ ] Select the `NeoPulse-Dashboard` folder — the one containing `manifest.json`
- [ ] Extension appears in the list with the neon-blue icon and **no red error banners**
- [ ] Extension toolbar icon is visible (neon-blue square)

> If you see "Manifest file is missing or unreadable" — you selected the wrong folder.
> If you see a permissions error — check manifest.json host_permissions.

---

## 2. New Tab Page

- [ ] Open a new tab (`Ctrl+T` / `Cmd+T`)
- [ ] NeoPulse Dashboard loads instead of Chrome's default new tab
- [ ] Dark background with animated grid is visible
- [ ] No blank white flash before the dashboard appears
- [ ] Floating particles are visible (if animation intensity is not "off")
- [ ] No JavaScript errors in Chrome DevTools console (`F12` → Console tab)

---

## 3. Clock and Date

- [ ] Large digital clock is displayed in neon colour
- [ ] Clock shows the correct current time
- [ ] Clock ticks and updates every second — watch for 5 seconds to confirm
- [ ] Date shows correct weekday, day, month, and year
- [ ] Date updates at midnight without requiring a page reload (leave tab open overnight to confirm, or manually test by temporarily changing system time)

---

## 4. Network Status Dot

- [ ] Green pulsing dot and "Online" label appear when connected
- [ ] Disconnect from the internet (disable WiFi/Ethernet)
- [ ] Dot turns red and label shows "Offline" — should change within 1 second
- [ ] Reconnect to the internet — dot returns to green within 1 second

---

## 5. Search Bar

- [ ] Search bar is focused automatically on page load
- [ ] Type a query and press **Enter** — navigates to Google search
- [ ] Change engine dropdown to **Bing** — search navigates to Bing
- [ ] Change engine dropdown to **DuckDuckGo** — search navigates to DuckDuckGo
- [ ] Engine preference persists: open a new tab and confirm the selected engine is still chosen
- [ ] Search bar shows neon glow border when focused
- [ ] Empty search does not navigate anywhere

---

## 6. Network Speed Widget

- [ ] After ~1.5 seconds, latency value appears (e.g., "45") with "ms approx" label
- [ ] Download speed value appears (e.g., "87.3") with "Mbps approx" label
- [ ] Both values have the "approx" badge — never claim exact precision
- [ ] Animated bar fills under latency and download cards
- [ ] "Last tested: Just now" label appears after the test
- [ ] Click **Run Speed Test** button — button shows "Testing…" during run
- [ ] Values update after manual test completes
- [ ] Upload speed value appears with "Mbps approx" label after test completes (~1–2 extra seconds)
- [ ] IP card shows your public IPv4 address
- [ ] ISP label below IP card shows your internet provider name
- [ ] Animated bar fills under upload card
- [ ] Disconnect internet → all metric cards show "—"
- [ ] Reconnect → next auto-run or manual test restores all values including upload and IP

---

## 7. Speed History Graph

- [ ] After first speed test: graph shows placeholder "Run speed test to build history…"
- [ ] After second speed test: a glowing cyan line appears connecting two data points
- [ ] After multiple tests: line extends with new points on the right
- [ ] Latest data point is highlighted white
- [ ] Y-axis shows Mbps labels
- [ ] X-axis shows reading count
- [ ] Graph redraws correctly after browser window is resized

---

## 8. Quick Links

- [ ] Default tiles appear (GitHub, Gmail, YouTube, Maps, Drive, Reddit)
- [ ] Each tile displays an icon and a label
- [ ] Clicking a tile opens the URL in the current tab
- [ ] Hovering a tile shows holographic glow lift effect
- [ ] Tiles are visible at all three layout widths (desktop, tablet ~900px, mobile ~560px)

---

## 9. Notes Widget

- [ ] Notes textarea is visible and accepts input
- [ ] Type something in the notes area
- [ ] Wait ~0.6 seconds — "✓ saved" indicator flashes briefly
- [ ] Open a new tab — the typed notes are still there
- [ ] Open the Side Panel — notes match what was typed in the new tab
- [ ] Type in the Side Panel notes — open a new tab — notes match
- [ ] The `<textarea>` does not allow HTML injection (type `<img src=x>` — should appear as plain text only)

---

## 10. Settings Page

- [ ] Click the ⚙ button (bottom-right of dashboard) — settings page opens as a full tab
- [ ] All current settings are pre-filled correctly
- [ ] **Theme**: Change to "Neon Purple" — settings page recolours immediately
- [ ] Open a new tab — dashboard is purple
- [ ] **Theme**: Change back to "Neon Blue" — verify revert
- [ ] **Animation intensity**: Set to "Off" — all animations stop on next tab open
- [ ] **Animation intensity**: Restore to "Medium"
- [ ] **Particles**: Toggle off — new tab shows no floating particles
- [ ] **Particles**: Toggle back on
- [ ] **Refresh interval**: Move slider — label updates (e.g., "10 min", "1.0 hr")
- [ ] **Widget toggles**: Disable "Network Speed" — new tab hides the network panel
- [ ] Re-enable "Network Speed"
- [ ] **Search engine**: Change to Bing — search from new tab uses Bing
- [ ] "✓ Settings saved" banner appears ~0.3s after any change and auto-dismisses
- [ ] **Reset**: Click "Reset all settings" → confirm in dialog → page reloads with defaults
- [ ] After reset: open new tab — neon blue theme, all widgets visible

---

## 11. Side Panel

- [ ] Click the ◫ button (bottom-right of dashboard) — Chrome side panel opens on the right
- [ ] Panel shows NeoPulse header with status dot
- [ ] After ~1s, latency and download values appear with "approx" labels
- [ ] Click **Run Test** button — values update
- [ ] Quick link tiles visible (first 4 links)
- [ ] Click a quick link — URL opens
- [ ] Type in the Notes textarea — open a new tab — notes match
- [ ] Click **⚙ Settings** in the panel — settings page opens
- [ ] Disconnect internet — panel status dot turns red
- [ ] Side panel note: requires **Chrome 114 or later**. On older Chrome, the ◫ button will fail silently.

---

## 12. Offline Mode

- [ ] Disconnect from the internet completely (disable all network interfaces)
- [ ] Open a new tab
- [ ] Dashboard loads (no white screen or extension crash)
- [ ] Clock still ticks correctly
- [ ] Status dot is red, label shows "Offline"
- [ ] Network metric cards show "—" without any JS error
- [ ] Notes widget is fully functional
- [ ] Quick links are visible (they just navigate if clicked — that will fail, which is expected)
- [ ] Speed test shows "—" gracefully — no unhandled rejection in console
- [ ] Reconnect — status dot returns to green within 1 second
- [ ] Next auto-refresh restores speed values

---

## 13. Performance

Open Chrome DevTools (`F12`) on a new tab page:

**Console tab:**
- [ ] Zero errors on page load
- [ ] Zero errors after speed test completes
- [ ] Zero errors after 2+ minutes of idle

**Performance tab (record for 10 seconds, idle tab):**
- [ ] CPU usage stays under 5% during idle (particles running)
- [ ] No long tasks (>50ms) during idle

**Memory tab (take heap snapshot):**
- [ ] JS Heap is under 50 MB after page fully loads
- [ ] Take a second snapshot after 5 minutes — heap size is stable (not growing)

---

## 14. Security Checks

**Via DevTools Console:**
- [ ] No CSP violations in the console (would show red "Refused to..." messages)
- [ ] Type `<script>alert(1)</script>` into the Notes textarea — should be stored and displayed as plain text, not execute
- [ ] Verify the extension does not load any external scripts (`chrome://extensions` → extension details → check no external JS is requested)

**Via network tab in DevTools (on a new tab):**
- [ ] Only requests seen are: fonts.googleapis.com (CSS only), fonts.gstatic.com (fonts), google.com/generate_204 (ping), cdn.jsdelivr.net (speed test file)
- [ ] No requests to analytics, tracking, or advertising domains
- [ ] No requests that include user data, cookies, or identifiers in the URL

---

## Known Limitations (Do Not File as Bugs)

| Limitation | Reason |
|---|---|
| Upload speed shows "N/A" | Upload speed cannot be measured from a browser without a server endpoint |
| Speed values are approximate ±30% | Browser fetch timing is not a precision network tool |
| IP / ISP shows "—" | Requires a separate geolocation API — not included by default |
| Side panel requires Chrome 114+ | `chrome.sidePanel` API introduced in Chrome 114 |
| Weather widget shows placeholder | Requires a free API key (OpenWeatherMap etc.) — not bundled |
| First speed test takes 2–4 seconds | Downloads ~320KB from jsDelivr for measurement |
| Notes do not sync across devices | Uses `chrome.storage.local`, not `chrome.storage.sync`, by design |
