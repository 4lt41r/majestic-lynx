import { Group } from '../assets/three.module.min.js';
import { GLTFLoader } from '../assets/GLTFLoader.js';
import { buildToonSukuna } from './sukuna-toon.js';

export async function buildGltfSukuna(scene) {
  const glbUrl = chrome.runtime.getURL('src/assets/sukuna.glb');

  return new Promise(resolve => {
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      gltf => {
        const root = new Group();
        root.position.set(0, 0, -4);
        root.add(gltf.scene);
        scene.add(root);

        gltf.scene.scale.set(1, 1, 1);

        gltf.scene.traverse(child => {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
          }
        });

        resolve({
          root,
          torso: root, head: root,
          ghostArmL1: null, ghostArmL2: null,
          ghostArmR1: null, ghostArmR2: null,
          eyeMat: null,
          animateFn: animateGltf,
        });
      },
      undefined,
      err => {
        console.warn('[NeoPulse] GLTF load failed, falling back to toon:', err.message ?? err);
        resolve(buildToonSukuna(scene));
      }
    );
  });
}

function animateGltf(refs, elapsed) {
  refs.root.position.y = Math.sin(elapsed * 0.5) * 0.04;
}
