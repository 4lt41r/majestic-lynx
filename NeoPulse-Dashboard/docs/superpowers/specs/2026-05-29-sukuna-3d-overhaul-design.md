# NeoPulse Dashboard — Sukuna 3D Overhaul Design Spec

**Date:** 2026-05-29
**Goal:** Replace the scrollable cyberpunk dashboard with a full-viewport Three.js 3D throne room scene featuring Sukuna (Jujutsu Kaisen) as the centrepiece, with UI widgets embedded as actual 3D objects inside the room.

**Architecture:** Approach B — single `WebGLRenderer` fills the entire viewport. UI widgets (clock, quick links, network strip) are Three.js meshes with `CanvasTexture` faces updated at runtime. Raycasting handles hover and click on 3D objects. The only HTML overlay is the search `<input>` precisely positioned over a 3D pedestal mesh. Footer buttons (⚙ ◫) float as small HTML overlays in the bottom-right corner.

**Tech Stack:** Three.js r158 (self-hosted at `src/assets/three.min.js`), vanilla JS ES Modules, Chrome Extension MV3, no bundler, no external CDN for 3D.

---

## 1. Viewport & Layout

- `body`, `html`, and `#scene-canvas` are fixed at `100vw × 100vh`. `overflow: hidden`. No scrolling ever.
- The Three.js canvas is the only full-page element.
- Two HTML overlays sit above the canvas via `position: fixed`:
  1. `#search-overlay` — the search input + engine select, positioned over the pedestal mesh
  2. `#footer-controls` — ⚙ and ◫ buttons, bottom-right corner
- Privacy notice banner (first-run only) remains as a fixed overlay, crimson-themed.

---

## 2. Scene Layout & Camera

**Camera:**
- `PerspectiveCamera`, FOV 65°, near 0.1, far 100
- Position: `(0, 3.5, 8)` — slightly elevated, looking toward `(0, 1.5, 0)`
- No orbit controls — camera is fixed; the scene provides all the depth

**Room geometry:**
- Floor: `PlaneGeometry(24, 24)`, `CanvasTexture` with cracked dark-stone tile pattern drawn in Canvas 2D
- Blood pool: `PlaneGeometry(12, 12)` raised 0.01 above floor, centred on throne, custom `ShaderMaterial` with animated ripple UV offset
- Left wall: `BoxGeometry(0.3, 10, 24)` at x = -9
- Right wall: `BoxGeometry(0.3, 10, 24)` at x = +9
- Back wall: `BoxGeometry(18, 10, 0.3)` at z = -8
- Ceiling: not rendered (camera never looks up; skipped for performance)

**Lighting:**
| Light | Type | Colour | Intensity | Position |
|---|---|---|---|---|
| Ambient | `AmbientLight` | `#200000` | 0.8 | — |
| Sukuna backlight | `PointLight` | `#cc1100` | 3 | `(0, 4, -5)` |
| Gold curse light | `PointLight` | `#b8860b` | 1.5 | `(-4, 6, 2)` |
| Blood pool uplight | `PointLight` | `#800000` | 2 | `(0, 0.5, 0)` |

All lights cast shadows (`castShadow: true`). Renderer shadow map: `PCFSoftShadowMap`.

---

## 3. Sukuna Figure

Built entirely from Three.js primitives. Base material: `MeshStandardMaterial({ color: #111111, roughness: 0.8, metalness: 0.1 })`.

**Skeleton hierarchy (all parented to a root `Group` at position `(0, 2.2, -4)`):**

| Part | Geometry | Notes |
|---|---|---|
| Torso | `BoxGeometry(1.2, 1.4, 0.7)` | Centre of group |
| Head | `BoxGeometry(0.9, 0.9, 0.8)` | +Y 1.2 from torso |
| Left upper leg | `CylinderGeometry(0.2, 0.2, 1)` | Rotated outward, cross-legged |
| Left lower leg | `CylinderGeometry(0.18, 0.18, 0.9)` | Folded back |
| Right upper leg | mirror of left | |
| Right lower leg | mirror of left | |
| Left arm | `CylinderGeometry(0.15, 0.15, 1.1)` | Resting on left knee |
| Right arm | mirror | Resting on right knee |
| Ghost arm L1 | Same as left arm | `opacity: 0.35`, spread +30° behind |
| Ghost arm L2 | Same | `opacity: 0.2`, spread +60° behind |
| Ghost arm R1 | mirror | |
| Ghost arm R2 | mirror | |

**Tattoo lines:**
- `LineSegments` geometry parented to head and torso
- Face: 3 horizontal bars across forehead/cheeks, branching V-lines down chin
- Torso: diagonal branching lines across chest
- Material: `LineBasicMaterial({ color: #ff1a1a, linewidth: 2 })` — emissive red

**Eyes:**
- 4× `SphereGeometry(0.06)` at eye positions (2 standard, 2 above)
- `MeshBasicMaterial({ color: #ff0000 })` — unlit, always glowing red

**Idle animation (render loop):**
- Breathing: `torso.scale.y = 1 + 0.02 * Math.sin(t * 0.7)`, `head` follows
- Ghost arms: `ghostArmL1.rotation.z = Math.sin(t * 0.4 + 1.0) * 0.09`
- Eye pulse: `eyeMat.color.setHSL(0, 1, 0.4 + 0.25 * Math.sin(t * 1.5))`

---

## 4. Skeleton Throne & Blood Pool

**Skeleton pile:**
- 40 pieces placed procedurally using a seeded PRNG (`mulberry32` — 8-line pure JS, no dependency)
- Long bones: `CylinderGeometry(0.05, 0.05, rand(0.6, 1.4))`, dirty bone-white `#c8b89a`
- Skulls: `BoxGeometry(0.25, 0.2, 0.22)` with two `SphereGeometry(0.06)` eye sockets (black emissive)
- Mound shape: radial distance from centre falls off with height — pieces near centre stack higher
- All pieces `castShadow: true`, `receiveShadow: true`

**Throne back:**
- Two vertical `CylinderGeometry` columns (bone-white) at `x ± 0.9`, rising 2.5 units
- Three horizontal `BoxGeometry` crossbeams between columns
- Dark charcoal `MeshStandardMaterial({ color: #1a1a1a })`

**Blood pool shader:**
```glsl
// fragment
uniform float time;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  float ripple = sin((uv.x * 8.0 - time * 0.6)) * 0.04
               + sin((uv.y * 8.0 - time * 0.5)) * 0.04;
  uv += ripple;
  float edge = smoothstep(0.0, 0.18, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
  vec3 col = mix(vec3(0.05, 0.0, 0.0), vec3(0.5, 0.02, 0.02), uv.y + ripple * 2.0);
  gl_FragColor = vec4(col, edge * 0.92);
}
```
- `side: THREE.DoubleSide`, `transparent: true`, `depthWrite: false`
- `time` uniform incremented by `delta` each frame

**Splatter droplets:** 8 `SphereGeometry(rand(0.04, 0.1))` placed randomly on floor outside pool, `MeshStandardMaterial({ color: #3d0000 })`

---

## 5. 3D UI Objects

### Wall Clock (left wall)

- `BoxGeometry(1.4, 1.4, 0.12)` at `(-7.5, 3.5, -2)`, rotated to face inward
- Front face UV mapped to a 256×256 `CanvasTexture`
- Canvas drawn each second:
  - Black background, thin gold border ring
  - 12 crimson tick marks
  - Hour hand: dark gold line
  - Minute hand: crimson line
  - Second hand: bright red thin line
  - Date string below centre in `Share Tech Mono` font
- `mesh.castShadow = true`
- Emissive `#1a0000` with `emissiveIntensity` pulsing 0.3→0.8 on 3s sine

### Quick Link Panels (right wall, 2×3 grid)

- 6× `PlaneGeometry(1.2, 0.9)` panels at `x = 7.8`, staggered z/y positions:
  ```
  Row 1 (y=4.5): z = -5, -3.5
  Row 2 (y=3.2): z = -5, -3.5
  Row 3 (y=1.9): z = -5, -3.5
  ```
- Each panel rotated `-Math.PI / 2` on Y to face inward
- `CanvasTexture` 192×144: dark background `#0a0000`, crimson border, emoji icon (36px), label below (14px `Share Tech Mono`)
- Raycasting array includes all 6 panels
- Hover: `emissiveIntensity` → 0.6, `position.x` nudges −0.08 (pops forward from wall)
- Click: `window.open(url, '_self')`

### Network Status Strip (back wall, above throne)

- `PlaneGeometry(7, 0.5)` at `(0, 6.2, -7.8)`, facing forward
- `CanvasTexture` 560×40 redrawn after each network check:
  - Green/red dot, "Online"/"Offline", then `↓ XX Mbps  ↑ XX Mbps  XX ms  XXX.XXX.XXX.XXX`
  - Font: `Share Tech Mono 13px`, colour `#ff6666`
- Not interactive (display only)

---

## 6. Search Overlay

- HTML `<div id="search-overlay">` with `<input>` and `<select>` inside
- Positioned via JS: each frame (or on resize), project the pedestal mesh's world position to screen coords using `mesh.getWorldPosition()` + `camera.project()`, set `left`/`top` CSS
- **Pedestal mesh:** `BoxGeometry(2.4, 0.15, 0.6)` at `(0, 0.08, 5.5)` — dark stone in foreground
- Input styling: `background: rgba(0,0,0,0.85)`, `border: 1px solid #8b0000`, `color: #ff6666`, `font-family: Share Tech Mono`, focus glow `box-shadow: 0 0 12px #ff1a1a`
- On submit: navigate to selected engine URL + encoded query

---

## 7. Bug Fixes

### Upload speed
- Add `AbortController` with 10-second timeout to `estimateUploadSpeed()`
- If `httpbin.org` returns null, log `[NeoPulse] upload timeout` to console only

### Public IP
- Primary: `ipwho.is` (existing)
- Fallback: `https://api.ipify.org?format=json` — returns `{ ip }` only (no ISP)
- Both added to `manifest.json` `host_permissions` and CSP `connect-src`
- ISP shows `—` if fallback was used

### Weather city display
- Show user-typed `weatherCity` pref as the primary title
- Show wttr.in `areaName` as `(resolved: X)` subtitle only when it differs from input

---

## 8. Files Changed

| File | Change |
|---|---|
| `src/newtab/scene.js` | **CREATE** — renderer, camera, lighting, animation loop, raycasting |
| `src/newtab/room.js` | **CREATE** — floor, walls, blood pool, skeleton pile, throne |
| `src/newtab/sukuna.js` | **CREATE** — Sukuna geometry, tattoos, idle animation |
| `src/newtab/ui-objects.js` | **CREATE** — clock mesh, link panels, network strip, pedestal |
| `src/assets/three.min.js` | **DOWNLOAD** — Three.js r158 self-hosted |
| `src/newtab/index.html` | **OVERHAUL** — canvas + search overlay + footer only |
| `src/newtab/app.js` | **OVERHAUL** — remove old widgets, wire scene modules |
| `src/newtab/styles.css` | **OVERHAUL** — crimson theme, full-viewport, overlay positioning |
| `src/shared/network.js` | **MODIFY** — AbortController timeout, IP fallback |
| `src/shared/constants.js` | **MODIFY** — add `ipify.org` URL, upload timeout constant |
| `manifest.json` | **MODIFY** — add `api.ipify.org` to CSP + host_permissions |
| `src/sidepanel/*` | unchanged |
| `src/options/*` | unchanged |
| `src/background/*` | unchanged |

---

## 9. Out of Scope

- Weather widget on main page (side panel only)
- Bookmarks on main page (side panel only)
- Notes on main page (side panel only)
- Speed history graph (removed entirely from main page)
- Custom quick link editor (future)
- Sound effects

---

## Constraints

- Three.js loaded from `src/assets/three.min.js` — `script-src 'self'` covers it
- No new CDN URLs for scripts — CSP `script-src 'self'` unchanged
- All textures generated via Canvas 2D API at runtime — no image files added
- Extension must still load and function with no internet connection (3D scene renders offline; network widgets show `—`)
