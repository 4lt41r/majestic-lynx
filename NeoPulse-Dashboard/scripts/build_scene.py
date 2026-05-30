"""
Build both GLB assets in a single Blender session.

Usage:
    blender --background project.blend --python scripts/build_scene.py
"""
import os
import runpy

scripts_dir = os.path.dirname(os.path.abspath(__file__))
blender_dir = os.path.join(os.path.dirname(scripts_dir), 'blender')

print('[NeoPulse] Building room.glb...')
runpy.run_path(os.path.join(blender_dir, 'build_room.py'))

print('[NeoPulse] Building sukuna.glb...')
runpy.run_path(os.path.join(blender_dir, 'build_sukuna.py'))

print('[NeoPulse] Done — src/assets/room.glb and src/assets/sukuna.glb written.')
