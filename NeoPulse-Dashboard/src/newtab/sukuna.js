import { buildToonSukuna }      from './sukuna-toon.js';
import { buildBillboardSukuna } from './sukuna-billboard.js';
import { buildGltfSukuna }      from './sukuna-gltf.js';

export async function buildSukuna(scene, mode = 'toon') {
  switch (mode) {
    case 'billboard': return buildBillboardSukuna(scene);
    case 'gltf':      return buildGltfSukuna(scene);
    default:          return buildToonSukuna(scene);
  }
}

export function animateSukuna(refs, elapsed) {
  if (refs?.animateFn) refs.animateFn(refs, elapsed);
}

export function disposeSukuna(refs) {
  if (!refs?.root) return;
  const scene = refs.root.parent;
  if (scene) scene.remove(refs.root);
  refs.root.traverse(child => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach(m => m.dispose());
    } else {
      child.material?.dispose();
    }
  });
}
