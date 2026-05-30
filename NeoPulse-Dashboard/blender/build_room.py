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

# ── Seeded RNG — deterministic skull placement ─────────────────
# Python random.Random and JS mulberry32 use different algorithms;
# placement is reproducible but won't match the JS room exactly.
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
                radius=0.038, segments=6, ring_count=6,
                location=tp(bx + offset, ty_pos + 0.12, tz_pos - 0.09))
            eye = bpy.context.active_object
            eye.name = f"SkullEye_{i}_{e}"
            assign_mat(eye, dark_mat)
    else:
        # Long bone — cylinder
        bone_len = 0.6 + rng_next() * 0.8
        bpy.ops.mesh.primitive_cone_add(
            vertices=6, radius1=0.04, radius2=0.035, depth=bone_len,
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
