// Berkeal Studio Room 3D — render döngüsü, kamera, arayüz. Sahne: studio-scene.js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { buildStudio, LED } from './studio-scene.js?v=202610272300';

// Fotoğraflar geldiğinde: photos: [{ src: '/assets/img/studio/1.jpg' }, ...] (3 çerçeve)
var CONFIG = { photos: [
  { src: '/assets/img/studio/with-you.jpg', title: 'With You', sub: 'Marsias, Berkael', uri: 'spotify:track:5WEQl4cZ78p41LWwIni8yJ' },
  { art: 'golden', title: 'Golden Sound', sub: 'Berkay Er · Playlist', uri: 'spotify:playlist:2DAH389gTrBgFEaVTSuQPD' },
  { src: '/assets/img/studio/cant-sleep.jpg', title: `Can't Sleep`, sub: 'Marsias, Berkael & Woosa', uri: 'spotify:track:3qPfzaAnQWUP9W7JlIGB6I' }
] };

var WPS = [
  { k: 's3d_wp_entry', p: [0.2, 1.55, 1.4], l: [0, 1.0, -2.9] },
  { k: 's3d_wp_desk', p: [0.0, 1.28, -1.6], l: [0.0, 0.95, -2.95] },
  { k: 's3d_wp_screen', p: [-0.05, 1.2, -2.2], l: [-0.05, 1.13, -3.08] },
  { k: 's3d_wp_gear', p: [0.0, 1.5, -1.9], l: [0.0, 0.85, -2.78] },
  { k: 's3d_wp_dj', p: [-1.25, 1.62, -1.45], l: [-2.3, 0.92, -1.45] },
  { k: 's3d_wp_lounge', p: [-0.1, 1.55, -0.2], l: [2.6, 0.7, 0.9] },
  { k: 's3d_wp_shelf', p: [0.3, 1.6, 1.0], l: [-3, 1.2, 1.6] }
];
var LEDS = [['red', 's3d_c_red'], ['violet', 's3d_c_violet'], ['cyan', 's3d_c_cyan'], ['amber', 's3d_c_amber']];

var $ = function (id) { return document.getElementById(id); };
function T(k) {
  var i = window._i18n;
  if (i && typeof i.t === 'function') { var v = i.t(k); if (v && v !== k) return v; }
  return k;
}
function hex(n) { return '#' + ('000000' + n.toString(16)).slice(-6); }

var stage = $('s3dStage') || document.querySelector('.s3d');
var canvas = $('s3dCanvas');
var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;

function fail() {
  var e = $('s3dErr'); if (e) e.hidden = false;
  var b = document.querySelector('.s3d-load-bar'); if (b) b.hidden = true;
}

var renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) { fail(); throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

var studio = buildStudio(renderer, CONFIG);
var scene = studio.scene;

var cam = new THREE.PerspectiveCamera(62, 1, 0.05, 40);
cam.rotation.order = 'YXZ';

var size = new THREE.Vector2(1, 1);
var rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: coarse ? 2 : 4 });
var composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, cam));
var bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.4, 1.7);
composer.addPass(bloom);
var vig = new ShaderPass(VignetteShader);
vig.uniforms.offset.value = 0.9;
vig.uniforms.darkness.value = 1.15;
composer.addPass(vig);
composer.addPass(new OutputPass());

function resize() {
  var w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  size.set(w, h);
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

// ---------- kamera durumu
var st = { x: 0, y: 1.6, z: 2.9, yaw: 0, pitch: 0, fov: 62 };
var fovTarget = 62;
var tw = null;
var keys = {};
var sway = 0;

function angles(p, l) {
  var dx = l[0] - p[0], dy = l[1] - p[1], dz = l[2] - p[2];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function flyTo(p, l, dur) {
  var a = angles(p, l);
  var dy = a.yaw - st.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  tw = { t0: performance.now(), dur: dur || 1700, f: { x: st.x, y: st.y, z: st.z, yaw: st.yaw, pitch: st.pitch },
         t: { x: p[0], y: p[1], z: p[2], yaw: st.yaw + dy, pitch: a.pitch } };
}
function snapTo(w) {
  var a = angles(w.p, w.l);
  st.x = w.p[0]; st.y = w.p[1]; st.z = w.p[2]; st.yaw = a.yaw; st.pitch = a.pitch;
}
snapTo(WPS[0]);
// açılış: tavana yakın yukarıdan girişe süzülür
st.y = 2.2; st.z = 2.9; st.pitch = -0.2;

var wpBtns = [];
function markWp(i) { wpBtns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); }); }
function goWp(i) { markWp(i); flyTo(WPS[i].p, WPS[i].l); }

// ---------- çarpışma
var R = 0.28;
function inBox(o, x, z) { return x > o.x0 - R && x < o.x1 + R && z > o.z0 - R && z < o.z1 + R; }
function blocked(ox, oz, nx, nz) {
  if (nx < -3 + R || nx > 3 - R || nz < -3.2 + R || nz > 3.2 - R) return true;
  for (var i = 0; i < studio.obstacles.length; i++) {
    var o = studio.obstacles[i];
    if (inBox(o, nx, nz) && !inBox(o, ox, oz)) return true;
  }
  return false;
}
function walk(dt) {
  var f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  var s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (!f && !s) return;
  tw = null;
  var sp = (keys.ShiftLeft || keys.ShiftRight ? 3.0 : 1.5) * dt;
  var fx = -Math.sin(st.yaw), fz = -Math.cos(st.yaw), rx = Math.cos(st.yaw), rz = -Math.sin(st.yaw);
  var dx = (fx * f + rx * s) * sp, dz = (fz * f + rz * s) * sp;
  if (!blocked(st.x, st.z, st.x + dx, st.z)) st.x += dx;
  if (!blocked(st.x, st.z, st.x, st.z + dz)) st.z += dz;
  markWp(-1);
}

// ---------- girdi
var drag = null;
canvas.addEventListener('pointerdown', function (e) {
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('is-drag');
  canvas.focus({ preventScroll: true });
});
canvas.addEventListener('pointermove', function (e) {
  if (!drag || e.pointerId !== drag.id) return;
  var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY;
  if (tw && (Math.abs(dx) + Math.abs(dy)) > 2) { tw = null; markWp(-1); }
  if (tw) return;
  var k = (st.fov / 62) * (coarse ? 0.0042 : 0.0034);
  st.yaw -= dx * k;
  st.pitch = Math.max(-1.25, Math.min(1.25, st.pitch - dy * k));
});
function endDrag(e) { if (drag && e.pointerId === drag.id) { drag = null; canvas.classList.remove('is-drag'); } }
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', function (e) {
  e.preventDefault();
  fovTarget = Math.max(34, Math.min(78, fovTarget + e.deltaY * 0.03));
}, { passive: false });
window.addEventListener('keydown', function (e) {
  var t = e.target && e.target.tagName;
  if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
  if (/^(KeyW|KeyA|KeyS|KeyD|Arrow(Up|Down|Left|Right)|ShiftLeft|ShiftRight)$/.test(e.code)) {
    keys[e.code] = true;
    if (e.code.indexOf('Arrow') === 0 && document.activeElement === canvas) e.preventDefault();
  }
  var n = parseInt(e.key, 10);
  if (n >= 1 && n <= WPS.length && !e.ctrlKey && !e.metaKey) goWp(n - 1);
});
window.addEventListener('keyup', function (e) { keys[e.code] = false; });
window.addEventListener('blur', function () { keys = {}; });

// ---------- arayüz
var wps = $('s3dWps');
WPS.forEach(function (w, i) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'seg-btn'; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
  b.textContent = T(w.k);
  b.setAttribute('data-i18n', w.k);
  b.addEventListener('click', function () { goWp(i); });
  wps.appendChild(b); wpBtns.push(b);
});

var ledsEl = $('s3dLeds');
var ledBtns = [];
LEDS.forEach(function (c, i) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 's3d-led';
  b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
  b.setAttribute('aria-label', T('s3d_light') + ': ' + T(c[1]));
  b.title = T(c[1]);
  var sw = document.createElement('i'); sw.style.setProperty('--c', hex(LED[c[0]])); b.appendChild(sw);
  b.addEventListener('click', function () {
    studio.setLed(c[0]);
    ledBtns.forEach(function (x, j) { x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
  });
  ledsEl.appendChild(b); ledBtns.push(b);
});

var tagsEl = $('s3dTags');
var tags = studio.hotspots.map(function (h) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 's3d-tag';
  b.innerHTML = '<span class="s3d-tag-dot"></span><span class="s3d-tag-txt"></span>';
  b.lastChild.textContent = h.text || T(h.key);
  if (h.key) b.setAttribute('data-i18n-tag', h.key);
  if (h.spotify) b.classList.add('s3d-tag--track');
  b.addEventListener('click', function () {
    if (h.spotify) { openPlayer(h.spotify, h.text); return; }
    var dx = st.x - h.pos.x, dz = st.z - h.pos.z, d = Math.hypot(dx, dz) || 1;
    var p = [h.pos.x + dx / d * 0.95, Math.max(1.05, h.pos.y + 0.4), h.pos.z + dz / d * 0.95];
    markWp(-1);
    flyTo(p, [h.pos.x, h.pos.y, h.pos.z], 1200);
  });
  tagsEl.appendChild(b);
  return { el: b, h: h };
});
// Spotify oynatıcısı (Spotify iFrame API: tıklayınca seçilen parça/liste çalar)
var player = $('s3dPlayer'), playerEl = $('s3dPlayerEmbed');
var spApi = null, spCtl = null, spWant = null, spLoading = false;
function spLoad() {
  if (spLoading) return; spLoading = true;
  window.onSpotifyIframeApiReady = function (api) { spApi = api; if (spWant) openPlayer(spWant.uri, spWant.title); };
  var sc = document.createElement('script'); sc.src = 'https://open.spotify.com/embed/iframe-api/v1'; sc.async = true; document.body.appendChild(sc);
}
function openPlayer(uri, title) {
  player.hidden = false;
  if (!spApi) { spWant = { uri: uri, title: title }; spLoad(); return; }
  if (!spCtl) {
    spApi.createController(playerEl, { uri: uri, width: '100%', height: 152 }, function (ctl) {
      spCtl = ctl;
      ctl.addListener('ready', function () { ctl.play(); });
    });
  } else { spCtl.loadUri(uri); spCtl.play(); }
}
$('s3dPlayerClose').addEventListener('click', function () { player.hidden = true; if (spCtl) spCtl.pause(); });
// çerçeveye tıklama (sürüklemeden): ışın ile hangi çerçeve
var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), downAt = null;
canvas.addEventListener('pointerdown', function (e) { downAt = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', function (e) {
  if (!downAt || Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y) > 6) return;
  var r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  var list = studio.clickables || [], hit = ray.intersectObjects(list.map(function (c) { return c.mesh; }), false)[0];
  if (!hit || hit.distance > 6) return;
  for (var i = 0; i < list.length; i++) if (list[i].mesh === hit.object) { openPlayer(list[i].uri, list[i].title); break; }
});
var tagsOn = true;
var tagBtn = $('s3dTagBtn');
tagBtn.addEventListener('click', function () {
  tagsOn = !tagsOn;
  tagBtn.setAttribute('aria-pressed', String(tagsOn));
  stage.classList.toggle('no-tags', !tagsOn);
});
$('s3dFull').addEventListener('click', function () {
  if (document.fullscreenElement) document.exitFullscreen();
  else if (stage.requestFullscreen) stage.requestFullscreen();
});
if (coarse) { var hint = $('s3dHint'); if (hint) { hint.setAttribute('data-i18n', 's3d_hint_touch'); hint.textContent = T('s3d_hint_touch'); } }

var v3 = new THREE.Vector3(), fwd = new THREE.Vector3();
function updateTags() {
  if (!tagsOn) return;
  cam.getWorldDirection(fwd);
  for (var i = 0; i < tags.length; i++) {
    var t = tags[i];
    v3.copy(t.h.pos).sub(cam.position);
    var dist = v3.length();
    var front = v3.dot(fwd) / (dist || 1);
    v3.copy(t.h.pos).project(cam);
    var on = front > 0.2 && dist < 4.8 && dist > 0.45 && Math.abs(v3.x) < 1.0 && Math.abs(v3.y) < 1.0;
    t.el.classList.toggle('is-on', on);
    if (on) t.el.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * size.x - 5).toFixed(1) + 'px,' + ((-v3.y * 0.5 + 0.5) * size.y - 5).toFixed(1) + 'px)';
    t.el.tabIndex = on ? 0 : -1;
  }
}

// ---------- döngü
var last = performance.now(), elapsed = 0;
var first = true, running = true, modelReady = false;
studio.ready.then(function () { modelReady = true; });
document.addEventListener('visibilitychange', function () { running = !document.hidden; last = performance.now(); });

function frame() {
  requestAnimationFrame(frame);
  if (!running) return;
  var now = performance.now();
  var dt = Math.min((now - last) / 1000, 0.05);
  last = now; elapsed += dt;
  var t = elapsed;

  if (tw) {
    var k = Math.min(1, (performance.now() - tw.t0) / tw.dur), e = ease(k);
    for (var n in tw.t) st[n] = tw.f[n] + (tw.t[n] - tw.f[n]) * e;
    if (k >= 1) tw = null;
  }
  walk(dt);
  st.fov += (fovTarget - st.fov) * Math.min(1, dt * 8);
  if (Math.abs(cam.fov - st.fov) > 0.01) { cam.fov = st.fov; cam.updateProjectionMatrix(); }

  sway = Math.sin(t * 0.6) * 0.0035;
  cam.position.set(st.x, st.y + Math.sin(t * 0.9) * 0.0035, st.z);
  cam.rotation.set(st.pitch + sway, st.yaw + sway * 0.6, 0);

  studio.update(t);
  composer.render();
  updateTags();

  if (first && modelReady) {
    first = false;
    var L = $('s3dLoad');
    L.classList.add('is-done');
    setTimeout(function () { L.hidden = true; }, 700);
    flyTo(WPS[0].p, WPS[0].l, 3200);
  }
}
frame();

window.__s3d = { cam: cam, st: st, scene: scene, goWp: goWp, flyTo: flyTo, renderer: renderer, studio: studio, bloom: bloom };
