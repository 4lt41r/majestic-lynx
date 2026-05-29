import {
  WebGLRenderer, Scene, PerspectiveCamera, Clock,
  AmbientLight, PointLight,
  Raycaster, Vector2,
  PCFSoftShadowMap,
} from '../assets/three.module.min.js';

let _renderer, _scene, _camera, _clock, _raycaster, _mouse;
let _rafId = null;

export function initScene(canvas) {
  _renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = PCFSoftShadowMap;
  _renderer.setClearColor(0x050000);

  _scene = new Scene();

  _camera = new PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
  _camera.position.set(0, 3.5, 8);
  _camera.lookAt(0, 1.5, 0);

  _clock    = new Clock();
  _raycaster = new Raycaster();
  _mouse     = new Vector2(10, 10); // off-screen so no accidental intersects on load

  // ── Lighting ──
  _scene.add(new AmbientLight(0x200000, 0.8));

  const backLight = new PointLight(0xcc1100, 3, 25, 2);
  backLight.position.set(0, 4, -5);
  backLight.castShadow = true;
  backLight.shadow.mapSize.set(512, 512);
  _scene.add(backLight);

  const goldLight = new PointLight(0xb8860b, 1.5, 20, 2);
  goldLight.position.set(-4, 6, 2);
  goldLight.castShadow = true;
  goldLight.shadow.mapSize.set(512, 512);
  _scene.add(goldLight);

  const poolLight = new PointLight(0x800000, 2, 12, 2);
  poolLight.position.set(0, 0.5, -1);
  _scene.add(poolLight);

  window.addEventListener('resize', _onResize);
  window.addEventListener('mousemove', _onMouseMove);

  return { renderer: _renderer, scene: _scene, camera: _camera };
}

function _onResize() {
  _camera.aspect = window.innerWidth / window.innerHeight;
  _camera.updateProjectionMatrix();
  _renderer.setSize(window.innerWidth, window.innerHeight);
}

function _onMouseMove(e) {
  _mouse.x = (e.clientX / window.innerWidth)  *  2 - 1;
  _mouse.y = (e.clientY / window.innerHeight) * -2 + 1;
}

// onFrame(delta, elapsed) — called each animation frame before render
export function startLoop(onFrame) {
  function loop() {
    _rafId = requestAnimationFrame(loop);
    const delta   = _clock.getDelta();
    const elapsed = _clock.getElapsedTime();
    _raycaster.setFromCamera(_mouse, _camera);
    onFrame(delta, elapsed);
    _renderer.render(_scene, _camera);
  }
  _rafId = requestAnimationFrame(loop);
}

export function stopLoop() {
  if (_rafId != null) { cancelAnimationFrame(_rafId); _rafId = null; }
}

export function getRenderer()  { return _renderer; }
export function getScene()     { return _scene; }
export function getCamera()    { return _camera; }
export function getRaycaster() { return _raycaster; }
