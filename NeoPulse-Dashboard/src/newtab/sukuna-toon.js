import {
  Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry,
  MeshToonMaterial, MeshBasicMaterial, LineBasicMaterial,
  LineSegments, BufferGeometry, Float32BufferAttribute,
  DataTexture, RGBAFormat, NearestFilter,
} from '../assets/three.module.min.js';

function makeToonGradient() {
  const data = new Uint8Array([
    20,  5,  5, 255,
    80, 20, 20, 255,
   140, 50, 50, 255,
   200, 90, 90, 255,
  ]);
  const tex = new DataTexture(data, 4, 1, RGBAFormat);
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function toonMat(color, gradientMap) {
  return new MeshToonMaterial({ color, gradientMap });
}

export function buildToonSukuna(scene) {
  const grad     = makeToonGradient();
  const bodyMat  = toonMat(0x1a0a0a, grad);
  const skinMat  = toonMat(0x8b4513, grad);
  const robeMat  = toonMat(0x0d0008, grad);
  const hairMat  = toonMat(0x111111, grad);
  const eyeMat   = new MeshBasicMaterial({ color: 0xff0000 });
  const tatMat   = new LineBasicMaterial({ color: 0xff1a1a });

  const root = new Group();
  root.position.set(0, 2.2, -4);
  scene.add(root);

  // Head (sphere)
  const head = new Mesh(new SphereGeometry(0.48, 16, 16), skinMat);
  head.position.set(0, 1.35, 0);
  head.scale.set(1, 1.1, 0.95);
  head.castShadow = true;
  root.add(head);

  // Hair spikes
  const spikePositions = [
    { x: 0,     y: 0.42, rz: 0    },
    { x: 0.22,  y: 0.38, rz: 0.3  },
    { x: -0.22, y: 0.38, rz: -0.3 },
    { x: 0.38,  y: 0.28, rz: 0.6  },
    { x: -0.38, y: 0.28, rz: -0.6 },
  ];
  spikePositions.forEach(({ x, y, rz }) => {
    const spike = new Mesh(new ConeGeometry(0.07, 0.38, 6), hairMat);
    spike.position.set(x, head.position.y + y, 0);
    spike.rotation.z = rz;
    root.add(spike);
  });

  // Torso
  const torso = new Mesh(new CylinderGeometry(0.5, 0.6, 1.4, 12), bodyMat);
  torso.position.set(0, 0, 0);
  torso.castShadow = true;
  root.add(torso);

  // Hakama (wide robe skirt)
  const hakamaF = new Mesh(new BoxGeometry(1.4, 0.9, 0.5), robeMat);
  hakamaF.position.set(0, -0.85, 0.1);
  hakamaF.castShadow = true;
  root.add(hakamaF);

  const hakamaS = new Mesh(new BoxGeometry(0.6, 0.85, 1.0), robeMat);
  hakamaS.position.set(0, -0.87, 0);
  root.add(hakamaS);

  // Collar
  const collarL = new Mesh(new BoxGeometry(0.12, 0.8, 0.12), robeMat);
  collarL.position.set(-0.18, 0.3, 0.42);
  collarL.rotation.z =  0.25;
  root.add(collarL);

  const collarR = new Mesh(new BoxGeometry(0.12, 0.8, 0.12), robeMat);
  collarR.position.set( 0.18, 0.3, 0.42);
  collarR.rotation.z = -0.25;
  root.add(collarR);

  // Cross-legged legs
  [{ x: -0.65, rx: 0.6, rz: -0.4 }, { x: 0.65, rx: 0.6, rz: 0.4 }].forEach(({ x, rx, rz }) => {
    const leg = new Mesh(new CylinderGeometry(0.2, 0.22, 1.1, 10), robeMat);
    leg.position.set(x, -0.85, 0.3);
    leg.rotation.set(rx, 0, rz);
    leg.castShadow = true;
    root.add(leg);
  });

  // Arms
  [{ x: -0.8, rz: -0.15 }, { x: 0.8, rz: 0.15 }].forEach(({ x, rz }) => {
    const arm = new Mesh(new CylinderGeometry(0.15, 0.17, 1.1, 10), bodyMat);
    arm.position.set(x, -0.3, 0.4);
    arm.rotation.set(0.8, 0, rz);
    arm.castShadow = true;
    root.add(arm);
  });

  // Ghost arms
  const ghostMat  = new MeshToonMaterial({ color: 0x2a0505, gradientMap: grad, transparent: true, opacity: 0.38 });
  const ghostMat2 = new MeshToonMaterial({ color: 0x2a0505, gradientMap: grad, transparent: true, opacity: 0.22 });
  const ghostDefs = [
    { pos: [-1.05, -0.1, -0.1], rot: [0.4, 0, -0.5], mat: ghostMat  },
    { pos: [-1.25,  0.1, -0.3], rot: [0.2, 0, -0.8], mat: ghostMat2 },
    { pos: [ 1.05, -0.1, -0.1], rot: [0.4, 0,  0.5], mat: ghostMat  },
    { pos: [ 1.25,  0.1, -0.3], rot: [0.2, 0,  0.8], mat: ghostMat2 },
  ];
  const ghostArms = ghostDefs.map(({ pos, rot, mat }) => {
    const a = new Mesh(new CylinderGeometry(0.13, 0.15, 1.1, 8), mat);
    a.position.set(...pos);
    a.rotation.set(...rot);
    root.add(a);
    return a;
  });

  // 4 eyes
  [[-0.17, 1.37, 0.47], [0.17, 1.37, 0.47], [-0.17, 1.58, 0.47], [0.17, 1.58, 0.47]].forEach(([x, y, z]) => {
    const eye = new Mesh(new SphereGeometry(0.058, 8, 8), eyeMat);
    eye.position.set(x, y, z);
    root.add(eye);
  });

  // Tattoos
  root.add(_faceTattoos(head.position, tatMat));
  root.add(_torsoTattoos(tatMat));

  return {
    root, torso, head,
    ghostArmL1: ghostArms[0], ghostArmL2: ghostArms[1],
    ghostArmR1: ghostArms[2], ghostArmR2: ghostArms[3],
    eyeMat,
    animateFn: animateToon,
  };
}

function _makeLineSegs(pts, mat) {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return new LineSegments(geo, mat);
}

function _faceTattoos(headPos, mat) {
  const pts = [
    -0.3,  0.28, 0,   0.3,  0.28, 0,
    -0.3,  0.08, 0,   0.3,  0.08, 0,
    -0.3, -0.15, 0,   0.3, -0.15, 0,
    -0.12, -0.15, 0, -0.2, -0.4, 0,
     0.12, -0.15, 0,  0.2, -0.4, 0,
    -0.2,  -0.4,  0,  0,   -0.44, 0,
     0.2,  -0.4,  0,  0,   -0.44, 0,
  ];
  const ls = _makeLineSegs(pts, mat);
  ls.position.set(headPos.x, headPos.y, 0.50);
  return ls;
}

function _torsoTattoos(mat) {
  const pts = [
    -0.5,  0.4, 0,   0,    0.1, 0,
     0,    0.1, 0,   0.5,  0.4, 0,
    -0.5,  0.0, 0,   0,   -0.3, 0,
     0,   -0.3, 0,   0.5,  0.0, 0,
    -0.3,  0.4, 0,  -0.3, -0.55, 0,
     0.3,  0.4, 0,   0.3, -0.55, 0,
  ];
  const ls = _makeLineSegs(pts, mat);
  ls.position.set(0, 0, 0.52);
  return ls;
}

function animateToon(refs, elapsed) {
  const t = elapsed;
  const breathe = 1 + 0.02 * Math.sin(t * 0.7);
  refs.torso.scale.y = breathe;
  refs.head.position.y = 1.35 + (breathe - 1) * 0.7;

  refs.ghostArmL1.rotation.z = -0.5 + Math.sin(t * 0.40 + 1.0) * 0.09;
  refs.ghostArmL2.rotation.z = -0.8 + Math.sin(t * 0.35 + 2.1) * 0.12;
  refs.ghostArmR1.rotation.z =  0.5 + Math.sin(t * 0.40 + 1.5) * 0.09;
  refs.ghostArmR2.rotation.z =  0.8 + Math.sin(t * 0.35 + 0.5) * 0.12;

  const l = 0.4 + 0.25 * Math.sin(t * 1.5);
  refs.eyeMat.color.setRGB(l, 0, 0);
}
