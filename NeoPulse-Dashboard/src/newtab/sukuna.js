import {
  Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  LineSegments, BufferGeometry, Float32BufferAttribute,
} from '../assets/three.module.min.js';

export function buildSukuna(scene) {
  const root = new Group();
  root.position.set(0, 2.2, -4);
  scene.add(root);

  const bodyMat   = new MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 });
  const ghostMat  = new MeshStandardMaterial({ color: 0x111111, roughness: 0.8, transparent: true, opacity: 0.35 });
  const ghostMat2 = new MeshStandardMaterial({ color: 0x111111, roughness: 0.8, transparent: true, opacity: 0.2 });
  const eyeMat    = new MeshBasicMaterial({ color: 0xff0000 });

  // ── Torso ──
  const torso = new Mesh(new BoxGeometry(1.2, 1.4, 0.7), bodyMat);
  torso.castShadow = true;
  root.add(torso);

  // ── Head ──
  const head = new Mesh(new BoxGeometry(0.9, 0.9, 0.8), bodyMat);
  head.position.set(0, 1.15, 0);
  head.castShadow = true;
  root.add(head);

  // ── Cross-legged legs ──
  const legDef = [
    { x: -0.65, rx:  0.6, rz: -0.4 },  // left upper
    { x:  0.65, rx:  0.6, rz:  0.4 },  // right upper
  ];
  legDef.forEach(({ x, rx, rz }) => {
    const leg = new Mesh(new CylinderGeometry(0.18, 0.2, 1.0, 8), bodyMat);
    leg.position.set(x, -0.85, 0.3);
    leg.rotation.set(rx, 0, rz);
    leg.castShadow = true;
    root.add(leg);
  });

  const lowerLegDef = [
    { x: -1.1, rz: -0.3 },
    { x:  1.1, rz:  0.3 },
  ];
  lowerLegDef.forEach(({ x, rz }) => {
    const leg = new Mesh(new CylinderGeometry(0.16, 0.18, 0.9, 8), bodyMat);
    leg.position.set(x, -1.1, -0.2);
    leg.rotation.set(1.2, 0, rz);
    leg.castShadow = true;
    root.add(leg);
  });

  // ── Arms resting on knees ──
  const leftArm  = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), bodyMat);
  leftArm.position.set(-0.8, -0.3, 0.4);
  leftArm.rotation.set(0.8, 0, -0.15);
  leftArm.castShadow = true;
  root.add(leftArm);

  const rightArm = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), bodyMat);
  rightArm.position.set(0.8, -0.3, 0.4);
  rightArm.rotation.set(0.8, 0, 0.15);
  rightArm.castShadow = true;
  root.add(rightArm);

  // ── Ghost arms (extra pair) ──
  const ghostArmL1 = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), ghostMat);
  ghostArmL1.position.set(-1.05, -0.1, -0.1);
  ghostArmL1.rotation.set(0.4, 0, -0.5);
  root.add(ghostArmL1);

  const ghostArmL2 = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), ghostMat2);
  ghostArmL2.position.set(-1.25, 0.1, -0.3);
  ghostArmL2.rotation.set(0.2, 0, -0.8);
  root.add(ghostArmL2);

  const ghostArmR1 = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), ghostMat);
  ghostArmR1.position.set(1.05, -0.1, -0.1);
  ghostArmR1.rotation.set(0.4, 0, 0.5);
  root.add(ghostArmR1);

  const ghostArmR2 = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), ghostMat2);
  ghostArmR2.position.set(1.25, 0.1, -0.3);
  ghostArmR2.rotation.set(0.2, 0, 0.8);
  root.add(ghostArmR2);

  // ── Eyes — 4 total (2 normal + 2 above) ──
  [
    [-0.17, 1.20, 0.42],
    [ 0.17, 1.20, 0.42],
    [-0.17, 1.42, 0.42],
    [ 0.17, 1.42, 0.42],
  ].forEach(([x, y, z]) => {
    const eye = new Mesh(new SphereGeometry(0.055, 8, 8), eyeMat);
    eye.position.set(x, y, z);
    root.add(eye);
  });

  // ── Tattoo line segments ──
  root.add(buildFaceTattoos(head.position));
  root.add(buildTorsoTattoos());

  return { root, torso, head, ghostArmL1, ghostArmL2, ghostArmR1, ghostArmR2, eyeMat };
}

function buildFaceTattoos(headPos) {
  const pts = [
    // 3 horizontal bars (forehead → cheek)
    -0.3,  0.28, 0,   0.3,  0.28, 0,
    -0.3,  0.08, 0,   0.3,  0.08, 0,
    -0.3, -0.15, 0,   0.3, -0.15, 0,
    // V branching down chin
    -0.12, -0.15, 0,  -0.2, -0.4, 0,
     0.12, -0.15, 0,   0.2, -0.4, 0,
    -0.2,  -0.4,  0,   0,   -0.44, 0,
     0.2,  -0.4,  0,   0,   -0.44, 0,
  ];
  const ls = makeLineSegs(pts);
  ls.position.set(headPos.x, headPos.y, 0.41);
  return ls;
}

function buildTorsoTattoos() {
  const pts = [
    -0.5,  0.4, 0,   0,    0.1, 0,
     0,    0.1, 0,   0.5,  0.4, 0,
    -0.5,  0.0, 0,   0,   -0.3, 0,
     0,   -0.3, 0,   0.5,  0.0, 0,
    -0.3,  0.4, 0,  -0.3, -0.55, 0,
     0.3,  0.4, 0,   0.3, -0.55, 0,
  ];
  const ls = makeLineSegs(pts);
  ls.position.set(0, 0, 0.36);
  return ls;
}

function makeLineSegs(pts) {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return new LineSegments(geo, new LineBasicMaterial({ color: 0xff1a1a }));
}

export function animateSukuna(refs, elapsed) {
  const t = elapsed;

  // Breathing (torso scale + head follows)
  const breathe = 1 + 0.02 * Math.sin(t * 0.7);
  refs.torso.scale.y = breathe;
  refs.head.position.y = 1.15 + (breathe - 1) * 0.7;

  // Ghost arm drift
  refs.ghostArmL1.rotation.z = -0.5 + Math.sin(t * 0.40 + 1.0) * 0.09;
  refs.ghostArmL2.rotation.z = -0.8 + Math.sin(t * 0.35 + 2.1) * 0.12;
  refs.ghostArmR1.rotation.z =  0.5 + Math.sin(t * 0.40 + 1.5) * 0.09;
  refs.ghostArmR2.rotation.z =  0.8 + Math.sin(t * 0.35 + 0.5) * 0.12;

  // Eye glow pulse
  const l = 0.4 + 0.25 * Math.sin(t * 1.5);
  refs.eyeMat.color.setRGB(l, 0, 0);
}
