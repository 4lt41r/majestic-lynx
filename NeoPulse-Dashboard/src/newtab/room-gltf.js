import { Group, FogExp2 } from '../assets/three.module.min.js';
import { GLTFLoader } from '../assets/GLTFLoader.js';
import { buildRoom, buildSkeletonPile, createBloodMaterial, buildAtmosphereEffects } from './room.js';

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
        let bloodPoolFound = false;

        gltf.scene.traverse(child => {
          if (!child.isMesh) return;
          child.castShadow    = true;
          child.receiveShadow = true;
          if (child.name === 'BloodPool') {
            child.material    = bloodMat;
            child.renderOrder = 1;
            bloodPoolFound    = true;
          }
        });

        if (!bloodPoolFound) {
          bloodMat.dispose();
          console.warn('[NeoPulse] room.glb has no BloodPool mesh — blood shader not applied');
        }

        buildAtmosphereEffects(scene);

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
