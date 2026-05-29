import {
  PlaneGeometry, BoxGeometry, CylinderGeometry, SphereGeometry,
  Mesh, MeshStandardMaterial, ShaderMaterial, CanvasTexture,
  DoubleSide, RepeatWrapping,
} from '../assets/three.module.min.js';

// ── Seeded PRNG — deterministic placement every load ───────────
function mulberry32(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeFloorCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const rand = mulberry32(7);
  ctx.fillStyle = '#0a0606';
  ctx.fillRect(0, 0, 512, 512);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#1f0a0a';
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  for (let i = 0; i < 25; i++) {
    const x = rand() * 512, y = rand() * 512;
    const len = 20 + rand() * 55;
    const a = rand() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.strokeStyle = `rgba(80, 0, 0, ${0.2 + rand() * 0.5})`;
    ctx.lineWidth = rand() * 1.2 + 0.3;
    ctx.stroke();
  }
  return c;
}

function makeWallCanvas() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const rand = mulberry32(13);
  ctx.fillStyle = '#0d0808';
  ctx.fillRect(0, 0, 512, 256);
  const bW = 64, bH = 32;
  for (let row = 0; row * bH < 256; row++) {
    const offset = (row % 2) * (bW / 2);
    for (let col = -1; col * bW < 512 + bW; col++) {
      const x = col * bW + offset, y = row * bH;
      ctx.strokeStyle = `rgba(6, 0, 0, ${0.5 + rand() * 0.35})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, bW - 2, bH - 2);
    }
  }
  return c;
}

const BLOOD_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BLOOD_FRAG = `
  uniform float time;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    float r1 = sin(uv.x * 8.0 - time * 0.6) * 0.04;
    float r2 = sin(uv.y * 8.0 - time * 0.5) * 0.04;
    uv.x += r1; uv.y += r2;
    uv = clamp(uv, 0.0, 1.0);
    float edge = smoothstep(0.0, 0.18,
      min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
    vec3 dark   = vec3(0.05, 0.0, 0.0);
    vec3 bright = vec3(0.48, 0.02, 0.02);
    vec3 col = mix(dark, bright, uv.y + (r1 + r2) * 2.5);
    gl_FragColor = vec4(col, edge * 0.92);
  }
`;

// Exported so app.js can increment time uniform each frame
export const bloodUniforms = { time: { value: 0 } };

export function buildRoom(scene) {
  // ── Floor ──
  const floorTex = new CanvasTexture(makeFloorCanvas());
  floorTex.wrapS = floorTex.wrapT = RepeatWrapping;
  floorTex.repeat.set(3, 3);
  const floor = new Mesh(
    new PlaneGeometry(24, 24),
    new MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Walls ──
  const wallTex = new CanvasTexture(makeWallCanvas());
  wallTex.wrapS = wallTex.wrapT = RepeatWrapping;
  const wallMat = new MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0 });

  const leftWall = new Mesh(new BoxGeometry(0.3, 10, 24), wallMat);
  leftWall.position.set(-9, 5, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new Mesh(new BoxGeometry(0.3, 10, 24), wallMat);
  rightWall.position.set(9, 5, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  const backWall = new Mesh(new BoxGeometry(18, 10, 0.3), wallMat);
  backWall.position.set(0, 5, -8);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // ── Blood pool ──
  const bloodMesh = new Mesh(
    new PlaneGeometry(12, 12),
    new ShaderMaterial({
      uniforms:       bloodUniforms,
      vertexShader:   BLOOD_VERT,
      fragmentShader: BLOOD_FRAG,
      transparent:    true,
      side:           DoubleSide,
      depthWrite:     false,
    })
  );
  bloodMesh.rotation.x = -Math.PI / 2;
  bloodMesh.position.set(0, 0.01, -1);
  scene.add(bloodMesh);

  // ── Splatter droplets ──
  const splatterMat = new MeshStandardMaterial({ color: 0x3d0000, roughness: 0.85 });
  const sr = mulberry32(99);
  for (let i = 0; i < 8; i++) {
    const radius = 6 + sr() * 3;
    const angle  = sr() * Math.PI * 2;
    const drop = new Mesh(new SphereGeometry(0.04 + sr() * 0.07, 6, 6), splatterMat);
    drop.position.set(Math.cos(angle) * radius, 0.005, -1 + Math.sin(angle) * radius);
    scene.add(drop);
  }
}

export function buildSkeletonPile(scene) {
  const rand    = mulberry32(12345);
  const boneMat = new MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.85, metalness: 0 });
  const eyeMat  = new MeshStandardMaterial({ color: 0x000000, emissive: 0x050000, emissiveIntensity: 1 });

  for (let i = 0; i < 40; i++) {
    const angle       = rand() * Math.PI * 2;
    const heightFactor = rand();
    const radius      = 2.5 * (1 - heightFactor * 0.7) * rand();
    const x           = Math.cos(angle) * radius;
    const z           = -4 + Math.sin(angle) * radius;
    const y           = heightFactor * 1.8 * Math.max(0, 1 - radius / 2.5);

    if (rand() < 0.25) {
      // Skull
      const skull = new Mesh(new BoxGeometry(0.25, 0.2, 0.22), boneMat);
      skull.position.set(x, y + 0.1, z);
      skull.rotation.set(rand() * 0.8 - 0.4, rand() * Math.PI * 2, rand() * 0.6 - 0.3);
      skull.castShadow = true;
      scene.add(skull);
      for (let e = 0; e < 2; e++) {
        const eye = new Mesh(new SphereGeometry(0.038, 6, 6), eyeMat);
        eye.position.set(x + (e ? 0.065 : -0.065), y + 0.12, z - 0.09);
        scene.add(eye);
      }
    } else {
      // Long bone
      const boneLen = 0.6 + rand() * 0.8;
      const bone = new Mesh(new CylinderGeometry(0.035, 0.04, boneLen, 6), boneMat);
      bone.position.set(x, y + boneLen / 2, z);
      bone.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      bone.castShadow = true;
      scene.add(bone);
    }
  }

  // ── Throne back columns + crossbeams ──
  const boneColMat = new MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.85 });
  const darkMat    = new MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

  for (const side of [-1, 1]) {
    const col = new Mesh(new CylinderGeometry(0.1, 0.1, 2.5, 8), boneColMat);
    col.position.set(side * 0.9, 3.45, -4);
    col.castShadow = true;
    scene.add(col);
  }

  for (let b = 0; b < 3; b++) {
    const beam = new Mesh(new BoxGeometry(1.8, 0.12, 0.12), darkMat);
    beam.position.set(0, 2.2 + b * 0.8, -4);
    scene.add(beam);
  }
}
