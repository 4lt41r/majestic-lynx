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
    tat.scale = (w / 2, 0.015, h / 2)   # flat plane — thin strip
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
    tat.scale = (w / 2, 0.015, h / 2)
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
