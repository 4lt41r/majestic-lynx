import {
  BoxGeometry, PlaneGeometry, Mesh,
  MeshStandardMaterial, CanvasTexture, Vector3,
} from '../assets/three.module.min.js';

// ── Wall Clock ─────────────────────────────────────────────────
// Positioned on the left wall at x=-7.5. The +X face of the
// BoxGeometry (material index 0) naturally points toward the room
// centre, so no rotation needed.
export function buildClock(scene) {
  const canvas  = document.createElement('canvas');
  canvas.width  = canvas.height = 256;
  const texture = new CanvasTexture(canvas);

  const ironMat = new MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.5 });
  const faceMat = new MeshStandardMaterial({
    map: texture,
    emissive: 0x200000,
    emissiveIntensity: 0.4,
  });

  // Index 0 = +X face (faces room centre from left wall) — assigned canvas texture.
  // Indices 1-5 get the iron material.
  const mesh = new Mesh(new BoxGeometry(1.4, 1.4, 0.12), [
    faceMat, ironMat, ironMat, ironMat, ironMat, ironMat,
  ]);
  mesh.position.set(-7.5, 3.5, -2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  return {
    mesh,
    updateTexture(now) {
      drawClockFace(canvas, now);
      texture.needsUpdate = true;
      faceMat.emissiveIntensity = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(now.getTime() / 1000 * 0.7));
    },
  };
}

function drawClockFace(canvas, now) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2, r = W * 0.4;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#040000';
  ctx.fillRect(0, 0, W, H);

  // Gold outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Crimson face ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#5c0000';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Tick marks
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const isMajor = i % 3 === 0;
    const outer = r - 1, inner = outer - (isMajor ? 14 : 7);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.lineTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.strokeStyle = isMajor ? '#b8860b' : '#8b0000';
    ctx.lineWidth   = isMajor ? 2.5 : 1;
    ctx.stroke();
  }

  const h = now.getHours() % 12 + now.getMinutes() / 60;
  const m = now.getMinutes() + now.getSeconds() / 60;
  const s = now.getSeconds() + now.getMilliseconds() / 1000;

  drawHand(ctx, cx, cy, (h / 12) * Math.PI * 2 - Math.PI / 2, r * 0.52, '#b8860b', 4.5);
  drawHand(ctx, cx, cy, (m / 60) * Math.PI * 2 - Math.PI / 2, r * 0.73, '#cc1100', 3);
  drawHand(ctx, cx, cy, (s / 60) * Math.PI * 2 - Math.PI / 2, r * 0.84, '#ff1a1a', 1.5);

  // Centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#b8860b';
  ctx.fill();

  // Date string
  const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  ctx.fillStyle = '#7a1a1a';
  ctx.font = '10px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`, cx, cy + r * 0.38);
}

function drawHand(ctx, cx, cy, angle, length, color, width) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.lineCap     = 'round';
  ctx.stroke();
}

// ── Quick Link Panels ──────────────────────────────────────────
// 6 panels on the right wall in a 2-column × 3-row grid.
// PlaneGeometry with rotation.y = -Math.PI/2 makes the panel
// normal point in -X direction (toward room centre from right wall).
export function buildQuickLinkPanels(scene, links) {
  const POSITIONS = [        // [z, y]
    [-5.0, 4.5], [-3.5, 4.5],
    [-5.0, 3.2], [-3.5, 3.2],
    [-5.0, 1.9], [-3.5, 1.9],
  ];

  const panels = links.slice(0, 6).map((link, i) => {
    const [z, y] = POSITIONS[i];
    const canvas  = document.createElement('canvas');
    canvas.width  = 192;
    canvas.height = 144;
    const texture = new CanvasTexture(canvas);
    const mat = new MeshStandardMaterial({
      map: texture,
      emissive: 0x2a0000,
      emissiveIntensity: 0.2,
      roughness: 0.8,
    });
    const mesh = new Mesh(new PlaneGeometry(1.2, 0.9), mat);
    mesh.position.set(7.78, y, z);
    mesh.rotation.y = -Math.PI / 2;
    scene.add(mesh);

    drawLinkPanel(canvas, link, false);
    texture.needsUpdate = true;

    return { mesh, mat, canvas, texture, link };
  });

  return {
    panels,
    setHover(index, hovered) {
      const p = panels[index];
      if (!p) return;
      p.mat.emissiveIntensity = hovered ? 0.6 : 0.2;
      p.mesh.position.x = 7.78 + (hovered ? -0.08 : 0);
      drawLinkPanel(p.canvas, p.link, hovered);
      p.texture.needsUpdate = true;
    },
  };
}

function drawLinkPanel(canvas, link, hovered) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = hovered ? '#1f0000' : '#0a0000';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = hovered ? '#ff1a1a' : '#5c0000';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  ctx.font = '34px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText(link.icon ?? '🔗', W / 2, H * 0.43);

  ctx.fillStyle = hovered ? '#ff8888' : '#cc4444';
  ctx.font = '600 11px "Share Tech Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(link.label, W / 2, H * 0.72);
}

// ── Network Status Strip ───────────────────────────────────────
// Thin panel on the back wall above the throne.
// PlaneGeometry faces +Z by default; positioned at z=-7.78
// so the camera (at z=8) sees its front face.
export function buildNetworkStrip(scene) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 560;
  canvas.height = 40;
  const texture = new CanvasTexture(canvas);

  const mat = new MeshStandardMaterial({
    map: texture,
    emissive: 0x110000,
    emissiveIntensity: 0.3,
    roughness: 0.9,
  });

  const mesh = new Mesh(new PlaneGeometry(7, 0.5), mat);
  mesh.position.set(0, 6.2, -7.78);
  scene.add(mesh);

  drawNetworkStrip(canvas, { online: false, latencyMs: null, downloadMbps: null, uploadMbps: null, ip: null });
  texture.needsUpdate = true;

  return {
    mesh,
    updateTexture(data) {
      drawNetworkStrip(canvas, data);
      texture.needsUpdate = true;
    },
  };
}

function drawNetworkStrip(canvas, { online, latencyMs, downloadMbps, uploadMbps, ip }) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, y = H / 2;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,0,0,0.85)';
  ctx.fillRect(0, 0, W, H);

  ctx.beginPath();
  ctx.arc(18, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = online ? '#39ff14' : '#ff2d55';
  ctx.fill();

  const dl = downloadMbps != null ? `${downloadMbps}` : '—';
  const ul = uploadMbps   != null ? `${uploadMbps}`   : '—';
  const ms = latencyMs    != null ? `${latencyMs}ms`  : '—';
  const ip_ = ip ?? '—';

  ctx.fillStyle = '#ff6666';
  ctx.font = '13px "Share Tech Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${online ? 'ONLINE' : 'OFFLINE'}   ↓ ${dl} Mbps   ↑ ${ul} Mbps   ${ms}   ${ip_}`,
    34, y
  );
}

// ── Search Pedestal ────────────────────────────────────────────
// Low stone platform in the foreground. The HTML search overlay
// is positioned above it using getScreenPosition().
export function buildSearchPedestal(scene) {
  const mat = new MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0.1 });
  const trimMat = new MeshStandardMaterial({
    color: 0x5c3800, roughness: 0.6, metalness: 0.8,
    emissive: 0x1a0800, emissiveIntensity: 0.3,
  });

  const base = new Mesh(new BoxGeometry(2.4, 0.15, 0.6), mat);
  base.position.set(0, 0.075, 5.5);
  base.receiveShadow = true;
  scene.add(base);

  // Gold trim on front edge
  const trim = new Mesh(new BoxGeometry(2.4, 0.04, 0.02), trimMat);
  trim.position.set(0, 0.13, 5.81);
  scene.add(trim);

  return {
    mesh: base,
    getScreenPosition(camera, canvasW, canvasH) {
      const v = new Vector3();
      base.getWorldPosition(v);
      v.project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * canvasW,
        y: (-v.y * 0.5 + 0.5) * canvasH,
      };
    },
  };
}
