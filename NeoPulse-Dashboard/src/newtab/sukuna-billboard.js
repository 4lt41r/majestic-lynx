import {
  Group, Mesh, PlaneGeometry,
  MeshBasicMaterial, CanvasTexture, DoubleSide,
} from '../assets/three.module.min.js';

function drawSukunaCanvas() {
  const W = 512, H = 768;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d0000');
  bg.addColorStop(1, '#050000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Body silhouette
  ctx.fillStyle = '#1a0808';
  ctx.beginPath();
  ctx.ellipse(256, 440, 120, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hakama robes
  ctx.fillStyle = '#0a0010';
  ctx.beginPath();
  ctx.moveTo(136, 480);
  ctx.lineTo(80,  700);
  ctx.lineTo(432, 700);
  ctx.lineTo(376, 480);
  ctx.quadraticCurveTo(256, 440, 136, 480);
  ctx.fill();

  // Kimono fold lines
  ctx.strokeStyle = '#2a0020';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(256, 430);
  ctx.lineTo(220, 520);
  ctx.moveTo(256, 430);
  ctx.lineTo(292, 520);
  ctx.stroke();

  // Neck
  ctx.fillStyle = '#7a3010';
  ctx.beginPath();
  ctx.ellipse(256, 350, 40, 55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#8b3a14';
  ctx.beginPath();
  ctx.ellipse(256, 240, 90, 105, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair crown
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(256, 170, 88, 60, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair spikes
  const spikes = [
    [256, 108, 0], [230, 115, -0.35], [282, 115, 0.35],
    [205, 130, -0.65], [307, 130, 0.65],
  ];
  ctx.fillStyle = '#0d0d0d';
  spikes.forEach(([cx, cy, angle]) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, 42);
    ctx.lineTo(14, 42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // 4 eyes
  const eyePos = [
    [230, 240], [282, 240],
    [230, 212], [282, 212],
  ];
  eyePos.forEach(([ex, ey]) => {
    ctx.fillStyle = '#1a0000';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const grd = ctx.createRadialGradient(ex, ey, 1, ex, ey, 18);
    grd.addColorStop(0, 'rgba(255,0,0,0.5)');
    grd.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 18, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Face tattoos — 3 horizontal bars
  ctx.strokeStyle = '#dd1111';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  [[200, 200, 312, 200], [195, 228, 317, 228], [198, 260, 314, 260]].forEach(([x1,y1,x2,y2]) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });

  // Face tattoos — V chin lines
  ctx.beginPath();
  ctx.moveTo(235, 274); ctx.lineTo(222, 308); ctx.lineTo(256, 318);
  ctx.moveTo(277, 274); ctx.lineTo(290, 308); ctx.lineTo(256, 318);
  ctx.stroke();

  // Torso tattoos — diamond pattern
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(196, 400); ctx.lineTo(256, 360); ctx.lineTo(316, 400);
  ctx.moveTo(196, 440); ctx.lineTo(256, 480); ctx.lineTo(316, 440);
  ctx.moveTo(256, 360); ctx.lineTo(256, 480);
  ctx.stroke();

  // Mouth
  ctx.strokeStyle = '#5a1a0a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(234, 282); ctx.lineTo(278, 282);
  ctx.stroke();

  // Aura glow
  const aura = ctx.createRadialGradient(256, 400, 60, 256, 400, 240);
  aura.addColorStop(0, 'rgba(140,0,0,0.18)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, W, H);

  return c;
}

export function buildBillboardSukuna(scene) {
  const canvas  = drawSukunaCanvas();
  const texture = new CanvasTexture(canvas);
  const mat     = new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide });
  const mesh    = new Mesh(new PlaneGeometry(2.8, 4.2), mat);

  const root = new Group();
  root.position.set(0, 2.8, -4);
  root.add(mesh);
  scene.add(root);

  return {
    root,
    torso: mesh, head: mesh,
    ghostArmL1: null, ghostArmL2: null,
    ghostArmR1: null, ghostArmR2: null,
    eyeMat: null,
    animateFn: animateBillboard,
  };
}

function animateBillboard(refs, elapsed) {
  refs.root.position.y = 2.8 + Math.sin(elapsed * 0.6) * 0.06;
  refs.root.rotation.y = Math.sin(elapsed * 0.4) * 0.04;
}
