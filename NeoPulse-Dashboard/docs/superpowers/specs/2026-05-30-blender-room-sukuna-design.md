# NeoPulse Dashboard — Blender Room & Sukuna Design Spec

**Date:** 2026-05-30
**Goal:** Replace Three.js-primitive room geometry and Sukuna figure with high-poly (~145k tri total) Blender-authored assets exported as `room.glb` and `sukuna.glb`, loaded at runtime via GLTFLoader with graceful JS fallback.

---

## 1. Pipeline Overview

```
blender/build_room.py    → src/assets/room.glb
blender/build_sukuna.py  → src/assets/sukuna.glb
src/newtab/room-gltf.js  → loads room.glb, replaces room.js primitives
src/newtab/app.js        → tries room.glb/sukuna.glb, falls back to JS
```

**How to run:**
1. Open Blender (any version ≥ 3.6)
2. Open the Scripting tab, paste the relevant script, click Run
3. Script builds all geometry and materials procedurally, then exports the GLB directly into `src/assets/`

**Fallback guarantee:** If either GLB is absent or fails to load, the scene renders identically to today using the existing JS-built geometry. No regression.

---

## 2. Hybrid Scene Architecture

`room.glb` carries **geometry only** (walls, floor, throne, bones, torches as static meshes).

Three.js continues to own all runtime effects:
- `FogExp2` atmosphere
- `PointLight` torch flicker (`animateRoom` in `room.js`)
- Blood pool ripple `ShaderMaterial` (applied to the `"BloodPool"` mesh after GLB load)
- Dust particle system

This ensures animated atmosphere is identical whether the GLB loads or not.

---

## 3. Room Geometry — `build_room.py`

**Target: ~80k tris**

| Object | Mesh base | Modifiers | Material | Tris (est.) |
|---|---|---|---|---|
| Floor | `Plane(24×24)` | SubSurf level 4, Displace (Musgrave — stone cracks) | Stone PBR `#0a0606`, roughness 0.9 | ~16k |
| Left wall | `Box` | SubSurf level 3, Displace (Wave+Noise — block seams) | Stone PBR | ~9k |
| Right wall | `Box` | same | Stone PBR | ~9k |
| Back wall | `Box` | same | Stone PBR | ~9k |
| Throne uprights (×2) | `Cylinder(32)` | none | Bone ivory `#c8b89a`, roughness 0.6 | ~2k |
| Throne crossbeams (×3) | `Box` | none | Bone ivory | ~2k |
| Skull pile (12 skulls) | `Box` head + `Sphere(×2)` eye sockets, joined | none | Bone ivory | ~10k |
| Long bones (×30) | `Cylinder(12)` random length | none | Bone ivory | ~8k |
| Torch brackets (×4) | `Cylinder(8)` | none | Iron `#444444`, metalness 0.5 | ~1.6k |
| Torch flames (×4) | `Cone` subdivided | none | Orange emissive `#ff6600` (strength 2.0) | ~1.6k |
| Blood pool | `Plane(12×12)` | none (flat — runtime shader applied) | Placeholder (replaced at load) | ~200 |

**Blood pool special handling:** The export names this mesh `"BloodPool"`. `room-gltf.js` traverses the loaded scene, finds the mesh by name, and replaces its material with the existing `ShaderMaterial` from `room.js` so the ripple animation applies to the high-poly geometry.

**Materials:** All Principled BSDF nodes → exported natively as GLTF `pbrMetallicRoughness`. No texture baking required.

**Skull placement:** Seeded Python `random` (seed=42) for deterministic layout. Skulls stack radially around throne center, higher toward center (conical mound).

---

## 4. Sukuna Geometry — `build_sukuna.py`

**Target: ~65k tris. Static seated cross-legged pose. No rig.**

| Part | Mesh base | Modifiers | Material | Tris (est.) |
|---|---|---|---|---|
| Head | `UVSphere(64, 32)` scaled `(0.9, 1.05, 0.88)` | SubSurf level 2 | Skin `#7a3010`, roughness 0.55 | ~8k |
| Hair spikes (×5) | `Cone(12)` bent via curve | SubSurf level 3 | Black `#111111`, roughness 0.85 | ~3k |
| Torso | `Cylinder(32)` shoulder-taper | SubSurf level 2 | Dark body `#1a0808` | ~6k |
| Hakama front panel | `Box` | SubSurf level 3, Displace (Wave — fabric folds) | Dark robe `#0d0008`, roughness 0.9 | ~6k |
| Hakama side wrap | `Box` | SubSurf level 3, Displace (Wave) | Dark robe | ~6k |
| Main arms (×2) | `Cylinder(16)` | SubSurf level 2 | Dark body | ~3k |
| Ghost arms (×4) | Duplicate of main arm | none | Dark body, alpha 0.35 / 0.22 via `alphaMode: BLEND` | ~12k |
| Eyes (×4) | `UVSphere(16)` | none | Red emissive `#ff0000`, strength 3.0 | ~3.2k |
| Tattoos | Thin `Plane` strips flush to surface | none | Red emissive `#dd1111`, strength 1.5 | ~2k |
| Legs upper (×2) | `Cylinder(16)` | SubSurf level 2 | Dark robe | ~4k |
| Legs lower (×2) | `Cylinder(16)` | SubSurf level 2 | Dark robe | ~4k |
| Collar / kimono fold (×2) | `Box` | SubSurf level 2 | Dark robe | ~2k |

**Ghost arm transparency:** Uses Blender `Principled BSDF` with alpha < 1 + `Blend Mode: Alpha Blend`. GLTF exporter outputs `alphaMode: "BLEND"` with `baseColorFactor[3] < 1`; Three.js `MeshStandardMaterial` reads this as `transparent: true, opacity: 0.35`. No extra Three.js code needed.

**Eye and tattoo emissives:** Blender emission-only materials export as GLTF `emissiveFactor` + `emissiveTexture`. Three.js `MeshStandardMaterial` renders these as always-glowing regardless of scene lighting.

**Pose:** Applied via vertex group scaling + manual rotation values set in script. All modifiers applied before export so GLB contains clean mesh data.

---

## 5. Three.js Integration

### New file: `src/newtab/room-gltf.js`

Mirrors `sukuna-gltf.js` structure:

```js
export async function buildRoomGltf(scene) {
  // Load room.glb via GLTFLoader
  // On success: traverse meshes, enable shadows, find "BloodPool" mesh,
  //             replace its material with ShaderMaterial from room.js
  // On failure: fall back to buildRoom(scene) + buildSkeletonPile(scene)
}
```

### Modified: `src/newtab/app.js`

Replace in `init()`:
```js
// Before:
buildRoom(scene);
buildSkeletonPile(scene);

// After:
roomRefs = await buildRoomGltf(scene);
```

`animateRoom(elapsed)` continues to run every frame unchanged — drives torch PointLight flicker, dust particles, and blood pool `time` uniform regardless of which room loaded.

### No new dependencies

No DRACOLoader required. GLBs exported uncompressed (~8–15 MB total). If file size is unacceptable after testing, Draco compression can be added as a Python script flag + `DRACOLoader` wired in at that point.

### Manifest / CSP

No changes. GLBs loaded via `chrome.runtime.getURL('src/assets/room.glb')` — covered by existing `script-src 'self'`.

---

## 6. Files Changed

| Action | File | Purpose |
|---|---|---|
| Create | `blender/build_room.py` | Procedural room geometry, exports `room.glb` |
| Create | `blender/build_sukuna.py` | Procedural Sukuna figure, exports `sukuna.glb` |
| Create | `src/newtab/room-gltf.js` | Loads `room.glb`, falls back to `room.js` |
| Modify | `src/newtab/app.js` | Await `buildRoomGltf`, keep `animateRoom` |
| Add | `src/assets/room.glb` | Output of `build_room.py` |
| Add | `src/assets/sukuna.glb` | Output of `build_sukuna.py` |
| Modify | `manifest.json` | Add `*.glb` to `web_accessible_resources` so `chrome.runtime.getURL` resolves them |

---

## 7. Out of Scope

- Skeletal rig / animations in Blender (static pose only)
- Draco compression (deferred — add if file size is a problem)
- Photorealistic skin / face sculpting (stylized high-poly only)
- Texture baking (procedural materials export directly as PBR)
- Room lighting in GLB (Three.js owns all lights)

---

## 8. Constraints

- Blender ≥ 3.6 required (GLTF exporter with alpha blend support)
- No new CDN URLs — all assets are local
- GLBs must be added to `manifest.json` `web_accessible_resources` so `chrome.runtime.getURL` can resolve them
- Extension must render correctly with no internet connection
