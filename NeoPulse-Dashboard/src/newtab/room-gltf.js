import { Group, FogExp2 } from '../assets/three.module.min.js';
import { GLTFLoader } from '../assets/GLTFLoader.js';
import { buildRoom, buildSkeletonPile, createBloodMaterial } from './room.js';

export async function buildRoomGltf(scene) {
  const glbUrl = chrome.runtime.getURL('src/assets/room.glb');

  return new Promise(resolve => {
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      gltf => {
        scene.fog = new FogExp2(0x0a0000, 0.018);

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
