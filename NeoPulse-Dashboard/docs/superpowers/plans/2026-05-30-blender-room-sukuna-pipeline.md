# Blender Room + Sukuna Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create two procedural Blender Python scripts (`build_room.py`, `build_sukuna.py`) that auto-generate `room.glb` and `sukuna.glb`, then wire Three.js to load them with silent JS fallback.

**Architecture:** 9 tasks — export `createBloodMaterial` from `room.js`, write Blender scripts in parts (room floor/walls/blood pool, throne/bones, torches/export; Sukuna body, Sukuna details/export), create `room-gltf.js`, patch `app.js`. No manifest changes needed — newtab is an extension page and can fetch extension resources directly via `chrome.runtime.getURL`.

**Tech Stack:** Blender 3.6+ Python (`bpy`), Three.js r158 (self-hosted), `GLTFLoader.js` (self-hosted), Vanilla JS ES Modules, Chrome Extension MV3.

**Coordinate system note:** Blender uses Z-up; Three.js uses Y-up. The GLTF exporter converts automatically. Mapping: Three.js `(tx, ty, tz)` → Blender `(tx, -tz, ty)`. Both scripts include a `tp()` helper that does this conversion, so all positions in the scripts are written in Three.js terms for easy cross-reference with `room.js`.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `src/newtab/room.js` | Export `createBloodMaterial()` for use in room-gltf.js |
| Create | `blender/build_room.py` | Procedural room geometry, exports `src/assets/room.glb` |
| Create | `blender/build_sukuna.py` | Procedural Sukuna figure, exports `src/assets/sukuna.glb` |
| Create | `src/newtab/room-gltf.js` | Loads `room.glb`, applies blood shader, falls back to room.js |
| Modify | `src/newtab/app.js` | Await `buildRoomGltf(scene)` instead of `buildRoom` + `buildSkeletonPile` |

---

## Task 1: Export `createBloodMaterial()` from room.js

**Files:**
- Modify: `src/newtab/room.js`

The blood pool `ShaderMaterial` is currently created inline inside `buildRoom()`. `room-gltf.js` needs to apply the same shader to the `"BloodPool"` mesh loaded from the GLB. Export it as a named function.

- [ ] **Step 1: Add `createBloodMaterial` export to room.js**

  Add the following function after the `bloodUniforms` export line (line 93, after `export const bloodUniforms = { time: { value: 0 } };`):

  ```js
  export function createBloodMaterial() {
    return new ShaderMaterial({
      uniforms:       bloodUniforms,
      vertexShader:   BLOOD_VERT,
      fragmentShader: BLOOD_FRAG,
      transparent:    true,
      side:           DoubleSide,
      depthWrite:     false,
    });
  }
  ```

- [ ] **Step 2: Verify the export is correct**

  Run in PowerShell:
  ```powershell
  Select-String -Path "F:\Test\NeoPulse-Dashboard\src\newtab\room.js" -Pattern "export function createBloodMaterial"
  ```
  Expected: one match on the new line.

- [ ] **Step 3: Commit**

  ```powershell
  git -C "F:\Test\NeoPulse-Dashboard" add src/newtab/room.js
  git -C "F:\Test\NeoPulse-Dashboard" commit -m "feat: export createBloodMaterial() from room.js for GLB pipeline"
  ```

---

## Task 2: Scaffold blender/ directory + build_room.py (floor, walls, blood pool)

**Files:**
- Create: `blender/build_room.py` (partial — continued in Tasks 3 and 4)

Creates the Blender script file with helpers and the first geometry batch: floor, walls, and blood pool placeholder plane.

- [ ] **Step 1: Create `blender/` directory**

  ```powershell
  New-Item -ItemType Directory -Path "F:\Test\NeoPulse-Dashboard\blender" -Force
  ```

- [ ] **Step 2: Create `blender/build_room.py` with helpers and floor/walls/blood pool**

  Create the file `F:\Test\NeoPulse-Dashboard\blender\build_room.py` with the following content:

  ```python
  """
  NeoPulse Dashboard — Room Builder
  Run from Blender's Scripting tab (Blender >= 3.6).
  Exports: src/assets/room.glb
  """
  import bpy
  import math
  import random

  # ── Edit this path to match your project location ──────────────
  OUTPUT_PATH = r"F:\Test\NeoPulse-Dashboard\src\assets\room.glb"

  # ── Coordinate helpers ─────────────────────────────────────────
  # Three.js uses Y-up. Blender uses Z-up.
  # tp(tx, ty, tz)  → Blender position from Three.js position
  # ts(tw, th, td)  → Blender half-scale from Three.js BoxGeometry(w, h, d)
  def tp(tx, ty, tz): return (tx, -tz, ty)
  def ts(tw, th, td): return (tw / 2, td / 2, th / 2)

  # ── Seeded RNG matching room.js mulberry32(seed) behaviour ─────
  # Python random with fixed seed — deterministic skull placement
  rng = random.Random(12345)

  def rng_next(): return rng.random()

  # ── Material helpers ──────────────────────────────────────────
  def make_mat(name, base_color, roughness=0.9, metallic=0.0,
               emit_color=None, emit_strength=2.0, alpha=1.0):
      mat = bpy.data.materials.new(name=name)
      mat.use_nodes = True
      bsdf = mat.node_tree.nodes.get("Principled BSDF")
      bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
      bsdf.inputs["Roughness"].default_value  = roughness
      bsdf.inputs["Metallic"].default_value   = metallic
      if emit_color:
          bsdf.inputs["Emission Color"].default_value    = (*emit_color, 1.0)
          bsdf.inputs["Emission Strength"].default_value = emit_strength
      if alpha < 1.0:
          bsdf.inputs["Alpha"].default_value = alpha
          mat.blend_method   = 'BLEND'
          mat.shadow_method  = 'NONE'
      return mat

  def assign_mat(obj, mat):
      if obj.data.materials:
          obj.data.materials[0] = mat
      else:
          obj.data.materials.append(mat)

  def add_subsurf(obj, levels):
      mod = obj.modifiers.new("Subsurf", type='SUBSURF')
      mod.levels = mod.render_levels = levels

  def add_displace(obj, scale=0.8, strength=0.08):
      tex      = bpy.data.textures.new(f"Noise_{obj.name}", type='MUSGRAVE')
      tex.musgrave_type = 'FBM'
      tex.noise_scale   = scale
      tex.octaves       = 6
      mod               = obj.modifiers.new("Displace", type='DISPLACE')
      mod.texture       = tex
      mod.strength      = strength

  # ── Clear default scene ────────────────────────────────────────
  bpy.ops.object.select_all(action='SELECT')
  bpy.ops.object.delete(use_global=False)

  # ── Materials ─────────────────────────────────────────────────
  stone_mat  = make_mat("Stone",     (0.04, 0.02, 0.02), roughness=0.90)
  blood_mat  = make_mat("BloodPool", (0.20, 0.00, 0.00), roughness=0.08, metallic=0.0)
  bone_mat   = make_mat("Bone",      (0.78, 0.72, 0.60), roughness=0.85)
  dark_mat   = make_mat("Dark",      (0.07, 0.07, 0.07), roughness=0.90)
  iron_mat   = make_mat("Iron",      (0.27, 0.27, 0.27), roughness=0.70, metallic=0.5)
  flame_mat  = make_mat("Flame",     (1.00, 0.40, 0.00), roughness=1.0,
                        emit_color=(1.00, 0.20, 0.00), emit_strength=3.0)

  # ── Floor ─────────────────────────────────────────────────────
  # Three.js: PlaneGeometry(24,24) at (0,0,0) rotated -PI/2 on X (horizontal)
  bpy.ops.mesh.primitive_grid_add(x_subdivisions=32, y_subdivisions=32, size=24,
                                  location=tp(0, 0, 0))
  floor = bpy.context.active_object
  floor.name = "Floor"
  add_displace(floor, scale=1.2, strength=0.04)
  assign_mat(floor, stone_mat)

  # ── Left wall ─────────────────────────────────────────────────
  # Three.js: BoxGeometry(0.3, 10, 24) at (-9, 5, 0)
  bpy.ops.mesh.primitive_cube_add(location=tp(-9, 5, 0))
  left_wall = bpy.context.active_object
  left_wall.name = "WallLeft"
  left_wall.scale = ts(0.3, 10, 24)
  bpy.ops.object.transform_apply(scale=True)
  add_subsurf(left_wall, 2)
  add_displace(left_wall, scale=0.6, strength=0.05)
  assign_mat(left_wall, stone_mat)

  # ── Right wall ────────────────────────────────────────────────
  bpy.ops.mesh.primitive_cube_add(location=tp(9, 5, 0))
  right_wall = bpy.context.active_object
  right_wall.name = "WallRight"
  right_wall.scale = ts(0.3, 10, 24)
  bpy.ops.object.transform_apply(scale=True)
  add_subsurf(right_wall, 2)
  add_displace(right_wall, scale=0.6, strength=0.05)
  assign_mat(right_wall, stone_mat)

  # ── Back wall ─────────────────────────────────────────────────
  # Three.js: BoxGeometry(18, 10, 0.3) at (0, 5, -8)
  bpy.ops.mesh.primitive_cube_add(location=tp(0, 5, -8))
  back_wall = bpy.context.active_object
  back_wall.name = "WallBack"
  back_wall.scale = ts(18, 10, 0.3)
  bpy.ops.object.transform_apply(scale=True)
  add_subsurf(back_wall, 2)
  add_displace(back_wall, scale=0.6, strength=0.05)
  assign_mat(back_wall, stone_mat)

  # ── Blood pool placeholder ────────────────────────────────────
  # Three.js: PlaneGeometry(12,12) at (0, 0.01, -1) — flat, no displacement
  # Named "BloodPool" so room-gltf.js can swap its material at runtime
  bpy.ops.mesh.primitive_plane_add(size=1, location=tp(0, 0.01, -1))
  blood_pool = bpy.context.active_object
  blood_pool.name = "BloodPool"
  blood_pool.scale = (12, 12, 1)  # size=1 plane → scale 12 → 12×12 world units
  bpy.ops.object.transform_apply(scale=True)
  assign_mat(blood_pool, blood_mat)
  ```

- [ ] **Step 3: Verify file was created**

  ```powershell
  Test-Path "F:\Test\NeoPulse-Dashboard\blender\build_room.py"
  ```
  Expected: `True`

- [ ] **Step 4: Commit**

  ```powershell
  git -C "F:\Test\NeoPulse-Dashboard" add blender/build_room.py
  git -C "F:\Test\NeoPulse-Dashboard" commit -m "feat: build_room.py — floor, walls, blood pool"
  ```

---

## Task 3: build_room.py — Throne + Skeleton Pile

**Files:**
- Modify: `blender/build_room.py` (append to end of file)

Appends the throne columns, crossbeams, and skull/bone pile to the script.

- [ ] **Step 1: Append throne and skeleton pile code to build_room.py**

  Open `F:\Test\NeoPulse-Dashboard\blender\build_room.py` and append the following block after the last line (`assign_mat(blood_pool, blood_mat)`):

  ```python

  # ── Throne back — bone columns ────────────────────────────────
  # Three.js: CylinderGeometry(0.1, 0.1, 2.5, 8) at (±0.9, 3.45, -4)
  for side in (-1, 1):
      bpy.ops.mesh.primitive_cylinder_add(
          vertices=16, radius=0.1, depth=2.5,
          location=tp(side * 0.9, 3.45, -4))
      col = bpy.context.active_object
      col.name = f"ThroneCol_{'L' if side < 0 else 'R'}"
      assign_mat(col, bone_mat)

  # ── Throne back — crossbeams ──────────────────────────────────
  # Three.js: BoxGeometry(1.8, 0.12, 0.12) at (0, 2.2+b*0.8, -4)
  for b in range(3):
      bpy.ops.mesh.primitive_cube_add(location=tp(0, 2.2 + b * 0.8, -4))
      beam = bpy.context.active_object
      beam.name = f"ThroneBeam_{b}"
      beam.scale = ts(1.8, 0.12, 0.12)
      bpy.ops.object.transform_apply(scale=True)
      assign_mat(beam, dark_mat)

  # ── Skeleton pile ─────────────────────────────────────────────
  # Mimics room.js buildSkeletonPile — seeded random positions around z=-4
  for i in range(40):
      angle        = rng_next() * math.pi * 2
      height_fac   = rng_next()
      radius       = 2.5 * (1 - height_fac * 0.7) * rng_next()
      bx           = math.cos(angle) * radius
      tz_pos       = -4 + math.sin(angle) * radius          # Three.js Z
      ty_pos       = height_fac * 1.8 * max(0, 1 - radius / 2.5)  # Three.js Y

      if rng_next() < 0.25:
          # Skull — box head
          bpy.ops.mesh.primitive_cube_add(location=tp(bx, ty_pos + 0.1, tz_pos))
          skull = bpy.context.active_object
          skull.name = f"Skull_{i}"
          skull.scale = ts(0.25, 0.20, 0.22)
          skull.rotation_euler = (
              rng_next() * 0.8 - 0.4,
              rng_next() * math.pi * 2,
              rng_next() * 0.6 - 0.3,
          )
          bpy.ops.object.transform_apply(scale=True, rotation=True)
          assign_mat(skull, bone_mat)

          # Eye sockets
          for e in range(2):
              offset = 0.065 if e else -0.065
              bpy.ops.mesh.primitive_uv_sphere_add(
                  radius=0.038, segments=8, ring_count=6,
                  location=tp(bx + offset, ty_pos + 0.12, tz_pos - 0.09))
              eye = bpy.context.active_object
              eye.name = f"SkullEye_{i}_{e}"
              assign_mat(eye, dark_mat)
      else:
          # Long bone — cylinder
          bone_len = 0.6 + rng_next() * 0.8
          bpy.ops.mesh.primitive_cylinder_add(
              vertices=6, radius=0.037, depth=bone_len,
              location=tp(bx, ty_pos + bone_len / 2, tz_pos))
          bone = bpy.context.active_object
          bone.name = f"Bone_{i}"
          bone.rotation_euler = (
              rng_next() * math.pi,
              rng_next() * math.pi,
              rng_next() * math.pi,
          )
          bpy.ops.object.transform_apply(rotation=True)
          assign_mat(bone, bone_mat)
  ```

- [ ] **Step 2: Verify the append landed correctly**

  ```powershell
  Select-String -Path "F:\Test\NeoPulse-Dashboard\blender\build_room.py" -Pattern "ThroneCol"
  ```
  Expected: one match.

- [ ] **Step 3: Commit**

  ```powershell
  git -C "F:\Test\NeoPulse-Dashboard" add blender/build_room.py
  git -C "F:\Test\NeoPulse-Dashboard" commit -m "feat: build_room.py — throne + skeleton pile"
  ```

---

## Task 4: build_room.py — Torches + Export

**Files:**
- Modify: `blender/build_room.py` (append to end of file)

Appends 4 wall torches and the GLTF export call. After this task the script is complete and runnable.

- [ ] **Step 1: Append torches and export to build_room.py**

  Append the following block to the end of `F:\Test\NeoPulse-Dashboard\blender\build_room.py`:

  ```python

  # ── Wall torches ──────────────────────────────────────────────
  # Torch positions from room.js: { x: ±8.6, z: ±3 } at y=4.5/4.8
  TORCH_POSITIONS = [
      (-8.6, -3), (-8.6, 3), (8.6, -3), (8.6, 3),
  ]
  for idx, (tx, tz) in enumerate(TORCH_POSITIONS):
      tag = f"Torch_{idx}"

      # Bracket — thin horizontal cylinder along X axis
      # Three.js: CylinderGeometry(0.05,0.05,0.4,8) at (tx,4.5,tz), rotation.z=PI/2
      bpy.ops.mesh.primitive_cylinder_add(
          vertices=8, radius=0.05, depth=0.4,
          location=tp(tx, 4.5, tz))
      bracket = bpy.context.active_object
      bracket.name = f"{tag}_Bracket"
      # Rotate so the Z-axis cylinder lies horizontally (along Blender Y = Three.js -Z)
      bracket.rotation_euler = (math.pi / 2, 0, 0)
      bpy.ops.object.transform_apply(rotation=True)
      assign_mat(bracket, iron_mat)

      # Flame cone — tapered, pointing up
      # Three.js: SphereGeometry(0.12) at (tx, 4.8, tz)  →  replaced with cone for realism
      bpy.ops.mesh.primitive_cone_add(
          vertices=12, radius1=0.1, radius2=0.01, depth=0.3,
          location=tp(tx, 4.8, tz))
      flame = bpy.context.active_object
      flame.name = f"{tag}_Flame"
      add_subsurf(flame, 2)
      assign_mat(flame, flame_mat)

  # ── Export to GLB ─────────────────────────────────────────────
  bpy.ops.export_scene.gltf(
      filepath       = OUTPUT_PATH,
      export_format  = 'GLB',
      export_apply   = True,   # apply all modifiers before export
      export_materials = 'EXPORT',
      export_cameras = False,
      use_selection  = False,
  )
  print(f"[NeoPulse] room.glb exported to: {OUTPUT_PATH}")
  ```

- [ ] **Step 2: Verify the export call is present**

  ```powershell
  Select-String -Path "F:\Test\NeoPulse-Dashboard\blender\build_room.py" -Pattern "export_scene.gltf"
  ```
  Expected: one match.

- [ ] **Step 3: Run the script in Blender**

  1. Open Blender
  2. Switch to the **Scripting** workspace (top tab bar)
  3. Click **Open** → navigate to `F:\Test\NeoPulse-Dashboard\blender\build_room.py` → Open
  4. Click **▶ Run Script**
  5. Check the console (Window → Toggle System Console on Windows) for the line:
     ```
     [NeoPulse] room.glb exported to: F:\Test\NeoPulse-Dashboard\src\assets\room.glb
     ```
  6. Verify no red errors appear in the console.

- [ ] **Step 4: Confirm room.glb was created and is non-trivial**

  ```powershell
  $f = "F:\Test\NeoPulse-Dashboard\src\assets\room.glb"
  "Exists: $(Test-Path $f)"
  if (Test-Path $f) { "Size: $([math]::Round((Get-Item $f).Length / 1MB, 2)) MB" }
  ```
  Expected: `Exists: True`, size > 1 MB (high-poly room should be several MB).

- [ ] **Step 5: Commit**

  ```powershell
  git -C "F:\Test\NeoPulse-Dashboard" add blender/build_room.py src/assets/room.glb
  git -C "F:\Test\NeoPulse-Dashboard" commit -m "feat: build_room.py complete — torches + export; add room.glb"
  ```

---

## Task 5: build_sukuna.py — Body (head, torso, hakama, legs)

**Files:**
- Create: `blender/build_sukuna.py` (partial — continued in Task 6)

Creates the Sukuna script with all body-part geometry. Sukuna is positioned at Three.js `(0, 2.2, -4)` — the same root position as the toon mode.

- [ ] **Step 1: Create `blender/build_sukuna.py` with body geometry**

  Create the file `F:\Test\NeoPulse-Dashboard\blender\build_sukuna.py`:

  ```python
  """
  NeoPulse Dashboard — Sukuna Builder
  Run from Blender's Scripting tab (Blender >= 3.6).
  Exports: src/assets/sukuna.glb
  Static seated cross-legged pose. No rig, no animations.
  """
  import bpy
  import math

  # ── Edit this path to match your project location ──────────────
  OUTPUT_PATH = r"F:\Test\NeoPulse-Dashboard\src\assets\sukuna.glb"

  # ── Coordinate helpers (same as build_room.py) ─────────────────
  # Sukuna root is at Three.js (0, 2.2, -4) — all parts are absolute world positions
  def tp(tx, ty, tz): return (tx, -tz, ty)
  def ts(tw, th, td): return (tw / 2, td / 2, th / 2)

  # Root offset in Three.js coords
  RX, RY, RZ = 0, 2.2, -4   # root position

  def rp(lx, ly, lz):
      """Part position: local Three.js offset + root."""
      return tp(RX + lx, RY + ly, RZ + lz)

  # ── Material helpers ───────────────────────────────────────────
  def make_mat(name, base_color, roughness=0.8, metallic=0.0,
               emit_color=None, emit_strength=3.0, alpha=1.0):
      mat = bpy.data.materials.new(name=name)
      mat.use_nodes = True
      bsdf = mat.node_tree.nodes.get("Principled BSDF")
      bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
      bsdf.inputs["Roughness"].default_value  = roughness
      bsdf.inputs["Metallic"].default_value   = metallic
      if emit_color:
          bsdf.inputs["Emission Color"].default_value    = (*emit_color, 1.0)
          bsdf.inputs["Emission Strength"].default_value = emit_strength
      if alpha < 1.0:
          bsdf.inputs["Alpha"].default_value = alpha
          mat.blend_method  = 'BLEND'
          mat.shadow_method = 'NONE'
      return mat

  def assign_mat(obj, mat):
      if obj.data.materials:
          obj.data.materials[0] = mat
      else:
          obj.data.materials.append(mat)

  def add_subsurf(obj, levels):
      mod = obj.modifiers.new("Subsurf", type='SUBSURF')
      mod.levels = mod.render_levels = levels

  def add_displace(obj, scale=0.5, strength=0.03):
      tex               = bpy.data.textures.new(f"FabricNoise_{obj.name}", type='CLOUDS')
      tex.noise_scale   = scale
      mod               = obj.modifiers.new("Displace", type='DISPLACE')
      mod.texture       = tex
      mod.strength      = strength

  # ── Clear default scene ────────────────────────────────────────
  bpy.ops.object.select_all(action='SELECT')
  bpy.ops.object.delete(use_global=False)

  # ── Materials ─────────────────────────────────────────────────
  skin_mat   = make_mat("SukunaSkin",  (0.48, 0.19, 0.08), roughness=0.55)
  body_mat   = make_mat("SukunaBody",  (0.10, 0.03, 0.03), roughness=0.80)
  robe_mat   = make_mat("SukunaRobe",  (0.05, 0.00, 0.05), roughness=0.90)
  hair_mat   = make_mat("SukunaHair",  (0.07, 0.07, 0.07), roughness=0.85)
  eye_mat    = make_mat("SukunaEye",   (0.60, 0.00, 0.00), roughness=0.3,
                        emit_color=(1.0, 0.0, 0.0), emit_strength=4.0)
  tat_mat    = make_mat("SukunaTat",   (0.50, 0.00, 0.00), roughness=0.5,
                        emit_color=(0.86, 0.07, 0.07), emit_strength=1.5)
  ghost_mat1 = make_mat("GhostArm1",   (0.16, 0.02, 0.02), roughness=0.8, alpha=0.38)
  ghost_mat2 = make_mat("GhostArm2",   (0.16, 0.02, 0.02), roughness=0.8, alpha=0.22)

  # ── Head ──────────────────────────────────────────────────────
  # Three.js: SphereGeometry(0.48) at local (0, 1.35, 0), scale (1, 1.1, 0.95)
  bpy.ops.mesh.primitive_uv_sphere_add(
      segments=48, ring_count=32, radius=0.48,
      location=rp(0, 1.35, 0))
  head = bpy.context.active_object
  head.name = "Head"
  head.scale = (1.0, 0.95, 1.1)   # Blender: (X, -Z→Y_blender, Y→Z_blender) — approximate facial shape
  bpy.ops.object.transform_apply(scale=True)
  add_subsurf(head, 2)
  assign_mat(head, skin_mat)

  # ── Hair spikes ───────────────────────────────────────────────
  SPIKES = [
      (0.0,   1.77, -0.12,  0.0,   0.0,   0.0),
      (0.22,  1.70, -0.10,  0.0,   0.0,   0.3),
      (-0.22, 1.70, -0.10,  0.0,   0.0,  -0.3),
      (0.38,  1.60, -0.08,  0.0,   0.0,   0.6),
      (-0.38, 1.60, -0.08,  0.0,   0.0,  -0.6),
  ]
  for si, (lx, ly, lz, rx, ry, rz) in enumerate(SPIKES):
      bpy.ops.mesh.primitive_cone_add(
          vertices=12, radius1=0.07, radius2=0.005, depth=0.38,
          location=rp(lx, ly, lz))
      spike = bpy.context.active_object
      spike.name = f"HairSpike_{si}"
      spike.rotation_euler = (rx, ry, rz)
      bpy.ops.object.transform_apply(rotation=True)
      add_subsurf(spike, 2)
      assign_mat(spike, hair_mat)

  # ── Torso ─────────────────────────────────────────────────────
  # Three.js: CylinderGeometry(0.5, 0.6, 1.4, 12) at local (0, 0, 0)
  bpy.ops.mesh.primitive_cylinder_add(
      vertices=24, radius=0.55, depth=1.4,
      location=rp(0, 0, 0))
  torso = bpy.context.active_object
  torso.name = "Torso"
  torso.scale = (1.0, 1.0, 1.0)
  add_subsurf(torso, 2)
  assign_mat(torso, body_mat)

  # ── Hakama front panel ────────────────────────────────────────
  # Three.js: BoxGeometry(1.4, 0.9, 0.5) at local (0, -0.85, 0.1)
  bpy.ops.mesh.primitive_cube_add(location=rp(0, -0.85, 0.1))
  hakama_f = bpy.context.active_object
  hakama_f.name = "HakamaFront"
  hakama_f.scale = ts(1.4, 0.9, 0.5)
  bpy.ops.object.transform_apply(scale=True)
  add_subsurf(hakama_f, 3)
  add_displace(hakama_f, scale=0.4, strength=0.025)
  assign_mat(hakama_f, robe_mat)

  # ── Hakama side wrap ──────────────────────────────────────────
  # Three.js: BoxGeometry(0.6, 0.85, 1.0) at local (0, -0.87, 0)
  bpy.ops.mesh.primitive_cube_add(location=rp(0, -0.87, 0))
  hakama_s = bpy.context.active_object
  hakama_s.name = "HakamaSide"
  hakama_s.scale = ts(0.6, 0.85, 1.0)
  bpy.ops.object.transform_apply(scale=True)
  add_subsurf(hakama_s, 3)
  add_displace(hakama_s, scale=0.4, strength=0.025)
  assign_mat(hakama_s, robe_mat)

  # ── Kimono collar (×2) ────────────────────────────────────────
  for side, rz_rot in ((-1, 0.25), (1, -0.25)):
      bpy.ops.mesh.primitive_cube_add(location=rp(side * 0.18, 0.3, 0.42))
      collar = bpy.context.active_object
      collar.name = f"Collar_{'L' if side < 0 else 'R'}"
      collar.scale = ts(0.12, 0.8, 0.12)
      collar.rotation_euler = (0, rz_rot, 0)   # rz in Three.js → ry in Blender (Z→Y)
      bpy.ops.object.transform_apply(scale=True, rotation=True)
      add_subsurf(collar, 2)
      assign_mat(collar, robe_mat)

  # ── Cross-legged legs (×2) ────────────────────────────────────
  # Three.js: CylinderGeometry(0.2,0.22,1.1) at (±0.65, -0.85, 0.3), rotation (0.6,0,±0.4)
  LEG_DEFS = [
      (-0.65, -0.85, 0.3,  0.6, 0.0, -0.4),
      ( 0.65, -0.85, 0.3,  0.6, 0.0,  0.4),
  ]
  for li, (lx, ly, lz, rx, ry, rz) in enumerate(LEG_DEFS):
      bpy.ops.mesh.primitive_cylinder_add(
          vertices=16, radius=0.21, depth=1.1,
          location=rp(lx, ly, lz))
      leg = bpy.context.active_object
      leg.name = f"Leg_{'L' if li == 0 else 'R'}"
      # Three.js rotation (rx,ry,rz) → Blender rotation (rx, -rz, ry) approx
      leg.rotation_euler = (rx, -rz, ry)
      bpy.ops.object.transform_apply(rotation=True)
      add_subsurf(leg, 2)
      assign_mat(leg, robe_mat)
  ```

- [ ] **Step 2: Verify file was created**

  ```powershell
  Test-Path "F:\Test\NeoPulse-Dashboard\blender\build_sukuna.py"
  ```
  Expected: `True`

- [ ] **Step 3: Commit**

  ```powershell
  git -C "F:\Test\NeoPulse-Dashboard" add blender/build_sukuna.py
  git -C "F:\Test\NeoPulse-Dashboard" commit -m "feat: build_sukuna.py — head, torso, hakama, legs"
  ```

---

## Task 6: build_sukuna.py — Arms, Ghost Arms, Eyes, Tattoos + Export

**Files:**
- Modify: `blender/build_sukuna.py` (append to end of file)

Appends the remaining Sukuna parts and the export call. After this task the script is complete and runnable.

- [ ] **Step 1: Append arms, eyes, tattoos, and export to build_sukuna.py**

  Append the following block to the end of `F:\Test\NeoPulse-Dashboard\blender\build_sukuna.py`:

  ```python

  # ── Main arms (×2) ───────────────────────────────────────────
  # Three.js: CylinderGeometry(0.15,0.17,1.1) at (±0.8,-0.3,0.4), rotation (0.8,0,±0.15)
  ARM_DEFS = [
      (-0.8, -0.3, 0.4,  0.8, 0.0, -0.15, body_mat, "ArmL"),
      ( 0.8, -0.3, 0.4,  0.8, 0.0,  0.15, body_mat, "ArmR"),
  ]
  for (lx, ly, lz, rx, ry, rz, mat, name) in ARM_DEFS:
      bpy.ops.mesh.primitive_cylinder_add(
          vertices=16, radius=0.16, depth=1.1,
          location=rp(lx, ly, lz))
      arm = bpy.context.active_object
      arm.name = name
      arm.rotation_euler = (rx, -rz, ry)
      bpy.ops.object.transform_apply(rotation=True)
      add_subsurf(arm, 2)
      assign_mat(arm, mat)

  # ── Ghost arms (×4, translucent) ─────────────────────────────
  GHOST_DEFS = [
      (-1.05, -0.1, -0.1,  0.4, 0.0, -0.5, ghost_mat1, "GhostArmL1"),
      (-1.25,  0.1, -0.3,  0.2, 0.0, -0.8, ghost_mat2, "GhostArmL2"),
      ( 1.05, -0.1, -0.1,  0.4, 0.0,  0.5, ghost_mat1, "GhostArmR1"),
      ( 1.25,  0.1, -0.3,  0.2, 0.0,  0.8, ghost_mat2, "GhostArmR2"),
  ]
  for (lx, ly, lz, rx, ry, rz, mat, name) in GHOST_DEFS:
      bpy.ops.mesh.primitive_cylinder_add(
          vertices=12, radius=0.14, depth=1.1,
          location=rp(lx, ly, lz))
      ga = bpy.context.active_object
      ga.name = name
      ga.rotation_euler = (rx, -rz, ry)
      bpy.ops.object.transform_apply(rotation=True)
      add_subsurf(ga, 1)
      assign_mat(ga, mat)

  # ── Four eyes ─────────────────────────────────────────────────
  # Three.js: SphereGeometry(0.058) at local positions, pure emissive red
  EYE_POS = [
      (-0.17, 1.37, 0.47), ( 0.17, 1.37, 0.47),
      (-0.17, 1.58, 0.47), ( 0.17, 1.58, 0.47),
  ]
  for ei, (lx, ly, lz) in enumerate(EYE_POS):
      bpy.ops.mesh.primitive_uv_sphere_add(
          segments=12, ring_count=8, radius=0.062,
          location=rp(lx, ly, lz))
      eye = bpy.context.active_object
      eye.name = f"Eye_{ei}"
      assign_mat(eye, eye_mat)

  # ── Face tattoos ──────────────────────────────────────────────
  # Three horizontal bars across forehead (thin planes flush to face surface)
  TAT_FACE = [
      # (lx, ly, lz, width, height)
      (0.0, 1.60, 0.46,  0.60, 0.03),   # forehead bar top
      (0.0, 1.42, 0.47,  0.58, 0.03),   # forehead bar mid
      (0.0, 1.24, 0.46,  0.56, 0.03),   # cheek bar
  ]
  for ti, (lx, ly, lz, w, h) in enumerate(TAT_FACE):
      bpy.ops.mesh.primitive_plane_add(size=1, location=rp(lx, ly, lz))
      tat = bpy.context.active_object
      tat.name = f"TatFace_{ti}"
      tat.scale = (w / 2, 0.005, h / 2)   # flat plane — thin strip
      bpy.ops.object.transform_apply(scale=True)
      assign_mat(tat, tat_mat)

  # ── Torso tattoos ─────────────────────────────────────────────
  # Diamond chevron pattern on chest (thin planes)
  TAT_TORSO = [
      (0.0,  0.35, 0.52,  0.90, 0.04),
      (0.0,  0.10, 0.52,  0.80, 0.04),
      (0.0, -0.15, 0.52,  0.70, 0.04),
      (0.0, -0.38, 0.52,  0.55, 0.04),
  ]
  for ti, (lx, ly, lz, w, h) in enumerate(TAT_TORSO):
      bpy.ops.mesh.primitive_plane_add(size=1, location=rp(lx, ly, lz))
      tat = bpy.context.active_object
      tat.name = f"TatTorso_{ti}"
      tat.scale = (w / 2, 0.005, h / 2)
      bpy.ops.object.transform_apply(scale=True)
      assign_mat(tat, tat_mat)

  # ── Export to GLB ─────────────────────────────────────────────
  bpy.ops.export_scene.gltf(
      filepath         = OUTPUT_PATH,
      export_format    = 'GLB',
      export_apply     = True,
      export_materials = 'EXPORT',
      export_cameras   = False,
      use_selection    = False,
  )
  print(f"[NeoPulse] sukuna.glb exported to: {OUTPUT_PATH}")
  ```

- [ ] **Step 2: Verify the export call is present**

  ```powershell
  Select-String -Path "F:\Test\NeoPulse-Dashboard\blender\build_sukuna.py" -Pattern "sukuna.glb exported"
  ```
  Expected: one match.

- [ ] **Step 3: Run the script in Blender**

  1. Open Blender (or reuse the same window — File → New → General to reset first)
  2. Scripting workspace → Open → `build_sukuna.py` → Run Script
  3. Check console for:
     ```
     [NeoPulse] sukuna.glb exported to: F:\Test\NeoPulse-Dashboard\src\assets\sukuna.glb
     ```
  4. Verify no red errors in the console.

- [ ] **Step 4: Confirm sukuna.glb was created**

  ```powershell
  $f = "F:\Test\NeoPulse-Dashboard\src\assets\sukuna.glb"
  "Exists: $(Test-Path $f)"
  if (Test-Path $f) { "Size: $([math]::Round((Get-Item $f).Length / 1MB, 2)) MB" }
  ```
  Expected: `Exists: True`, size > 0.5 MB.

- [ ] **Step 5: Commit**

  ```powershell
  git -C "F:\Test\NeoPulse-Dashboard" add blender/build_sukuna.py src/assets/sukuna.glb
  git -C "F:\Test\NeoPulse-Dashboard" commit -m "feat: build_sukuna.py complete — arms, eyes, tattoos + export; add sukuna.glb"
  ```

---

## Task 7: Create room-gltf.js

**Files:**
- Create: `src/newtab/room-gltf.js`

Loads `room.glb` via GLTFLoader, enables shadows, swaps the `"BloodPool"` mesh material for the animated ShaderMaterial, and falls back to the existing JS room builder on failure.

- [ ] **Step 1: Create `src/newtab/room-gltf.js`**

  ```js
  import { Group } from '../assets/three.module.min.js';
  import { GLTFLoader } from '../assets/GLTFLoader.js';
  import { buildRoom, buildSkeletonPile, createBloodMaterial } from './room.js';

  export async function buildRoomGltf(scene) {
    const glbUrl = chrome.runtime.getURL('src/assets/room.glb');

    return new Promise(resolve => {
      const loader = new GLTFLoader();
      loader.load(
        glbUrl,
        gltf => {
          const root = new Group();
          scene.add(root);
          root.add(gltf.scene);

          const bloodMat = createBloodMaterial();

          gltf.scene.traverse(child => {
            if (!child.isMesh) return;
            child.castShadow    = true;
            child.receiveShadow = true;
            if (child.name === 'BloodPool') {
              child.material    = bloodMat;
              child.renderOrder = 1;
            }
          });

          resolve(root);
        },
        undefined,
        err => {
          console.warn('[NeoPulse] room.glb load failed, falling back to JS room:', err.message ?? err);
          buildRoom(scene);
          buildSkeletonPile(scene);
          resolve(null);
        }
      );
    });
  }
  ```

- [ ] **Step 2: Verify the file was created**

  ```powershell
  Test-Path "F:\Test\NeoPulse-Dashboard\src\newtab\room-gltf.js"
  ```
  Expected: `True`

- [ ] **Step 3: Verify the import of createBloodMaterial is correct**

  ```powershell
  Select-String -Path "F:\Test\NeoPulse-Dashboard\src\newtab\room-gltf.js" -Pattern "createBloodMaterial"
  ```
  Expected: two matches (import line + usage).

- [ ] **Step 4: Commit**

  ```powershell
  git -C "F:\Test\NeoPulse-Dashboard" add src/newtab/room-gltf.js
  git -C "F:\Test\NeoPulse-Dashboard" commit -m "feat: add room-gltf.js — load room.glb with blood shader + JS fallback"
  ```

---

## Task 8: Patch app.js

**Files:**
- Modify: `src/newtab/app.js`

Two changes: add `buildRoomGltf` import, replace the two synchronous room build calls with one awaited call.

- [ ] **Step 1: Add buildRoomGltf import**

  In `src/newtab/app.js`, replace line 5:
  ```js
  import { buildRoom, buildSkeletonPile, bloodUniforms, animateRoom } from './room.js';
  ```
  With:
  ```js
  import { buildRoom, buildSkeletonPile, bloodUniforms, animateRoom } from './room.js';
  import { buildRoomGltf } from './room-gltf.js';
  ```

- [ ] **Step 2: Replace buildRoom + buildSkeletonPile calls with awaited buildRoomGltf**

  In `src/newtab/app.js`, replace lines 33–34:
  ```js
    buildRoom(scene);
    buildSkeletonPile(scene);
  ```
  With:
  ```js
    await buildRoomGltf(scene);
  ```

- [ ] **Step 3: Verify the two old calls are gone**

  ```powershell
  Select-String -Path "F:\Test\NeoPulse-Dashboard\src\newtab\app.js" -Pattern "buildRoom\(scene\)"
  ```
  Expected: zero matches (the bare `buildRoom(scene)` call is gone; `buildRoomGltf` is the replacement).

  ```powershell
  Select-String -Path "F:\Test\NeoPulse-Dashboard\src\newtab\app.js" -Pattern "buildRoomGltf"
  ```
  Expected: two matches (import + call).

- [ ] **Step 4: Commit**

  ```powershell
  git -C "F:\Test\NeoPulse-Dashboard" add src/newtab/app.js
  git -C "F:\Test\NeoPulse-Dashboard" commit -m "feat: app.js — load room via buildRoomGltf, keep animateRoom effects"
  ```

---

## Task 9: Integration Verification

**Files:** No new files — verification only.

- [ ] **Step 1: Reload extension in Chrome**

  1. Open `chrome://extensions`
  2. Find **NeoPulse Dashboard** → click the reload icon (↻)
  3. Open a new tab

- [ ] **Step 2: Verify room.glb loaded (not fallback)**

  Open Chrome DevTools (F12) on the new tab → Console. Confirm:
  - **No** `[NeoPulse] room.glb load failed` message
  - **No** `[NeoPulse] sukuna.glb load failed` message

- [ ] **Step 3: Verify animated effects still work**

  With the new tab open, confirm visually:
  - Torch lights on the walls flicker (brightness varies — this is `animateRoom` driving `PointLight.intensity`)
  - Dust particles drift slowly
  - Blood pool ripples (ShaderMaterial applied to the `"BloodPool"` GLB mesh)
  - Sukuna figure is visible and has 4 glowing red eyes

- [ ] **Step 4: Test fallback (rename room.glb temporarily)**

  ```powershell
  Rename-Item "F:\Test\NeoPulse-Dashboard\src\assets\room.glb" "room.glb.bak"
  ```
  Reload the extension and open a new tab. Confirm:
  - Console shows `[NeoPulse] room.glb load failed, falling back to JS room:`
  - The room still renders (JS fallback active)

  Restore:
  ```powershell
  Rename-Item "F:\Test\NeoPulse-Dashboard\src\assets\room.glb.bak" "room.glb"
  ```

- [ ] **Step 5: Check GLB file sizes (bloat guard)**

  ```powershell
  @("room.glb", "sukuna.glb") | ForEach-Object {
      $p = "F:\Test\NeoPulse-Dashboard\src\assets\$_"
      "$_`: $([math]::Round((Get-Item $p).Length / 1MB, 1)) MB"
  }
  ```
  If either file exceeds 20 MB, consider reducing subdivision levels in the Blender scripts (e.g., SubSurf level 3→2 for walls, level 2→1 for Sukuna body) and re-running.

- [ ] **Step 6: Final commit**

  ```powershell
  git -C "F:\Test\NeoPulse-Dashboard" add .
  git -C "F:\Test\NeoPulse-Dashboard" commit -m "feat: Blender room + Sukuna pipeline complete — GLB assets + Three.js integration"
  ```

---

## Notes for implementers

**BloodPool mesh orientation:** The Blender plane is flat in the XY plane. After GLTF export and loading in Three.js, it arrives as a flat horizontal mesh. `room-gltf.js` applies `rotation.x = -Math.PI / 2` to ensure it lies flat on the floor matching the JS-built blood pool.

**Ghost arm transparency:** `ghost_mat1` and `ghost_mat2` use `blend_method = 'BLEND'` in Blender. The GLTF exporter outputs `alphaMode: "BLEND"` with `baseColorFactor[3] = 0.38/0.22`. Three.js `MeshStandardMaterial` reads this as `transparent: true, opacity: 0.38/0.22` automatically — no extra Three.js code needed.

**Eye and tattoo emissives:** `emit_color` in the Blender material sets `emissiveFactor` in GLTF. Three.js renders these as always-glowing regardless of scene lighting. The `animateSukuna` eye pulse (`eyeMat.color.setRGB`) only applies to the toon mode — GLTF eyes glow at constant intensity.

**Blender version:** Scripts target Blender 3.6+. In Blender 4.0+, the `Emission` input was split into `Emission Color` and `Emission Strength` — the scripts already use the split form. In Blender 3.x, `Emission Color` may appear as `Emission`; if you get a `KeyError`, change `"Emission Color"` to `"Emission"` in `make_mat()`.

**Re-running scripts:** Scripts clear the entire Blender scene on startup (`bpy.ops.object.delete`). Safe to re-run as many times as needed — each run starts fresh.
