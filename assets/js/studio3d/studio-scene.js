// Berkeal Studio Room 3D — sahne kurulumu. Metre cinsinden; oda x:[-3,3], z:[-3.2,3.2], tavan 2.8.
// Masa arka duvara dayalı (z=-3.2), kamera varsayılan olarak girişten (z>0) masaya bakar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

var MODEL_V = '202610270600';

var DY = 0.76; // masa üst yüzeyi

function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function ctex(w, h, draw, o) {
  o = o || {};
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  var g = c.getContext('2d');
  draw(g, w, h, 0);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  t.userData = { g: g, w: w, h: h, draw: draw };
  return t;
}
function redraw(t, time) {
  var u = t.userData;
  u.draw(u.g, u.w, u.h, time);
  t.needsUpdate = true;
}

export var LED = { red: 0xff2418, violet: 0x8a3dff, cyan: 0x18c8ff, amber: 0xff9a1f };

export function buildStudio(renderer, CONFIG) {
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040406);
  scene.fog = new THREE.FogExp2(0x06060a, 0.05);

  var pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  pm.dispose();

  var anims = [];
  var ledMats = [], ledLights = [], ledTints = [];
  var hotspots = [];
  var obstacles = [];

  // ---------- yardımcılar
  function std(c, r, m, o) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r == null ? 0.6 : r, metalness: m || 0 }, o || {}));
  }
  function mesh(geo, mat, x, y, z, parent, cast, recv) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = cast !== false;
    m.receiveShadow = recv !== false;
    (parent || scene).add(m);
    return m;
  }
  function box(w, h, d, mat, x, y, z, parent, cast) { return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent, cast); }
  function rbox(w, h, d, r, mat, x, y, z, parent, cast) { return mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z, parent, cast); }
  function cyl(rt, rb, h, mat, x, y, z, parent, seg, cast) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), mat, x, y, z, parent, cast); }
  function grp(x, y, z, ry, parent) {
    var g = new THREE.Group();
    g.position.set(x || 0, y || 0, z || 0);
    g.rotation.y = ry || 0;
    (parent || scene).add(g);
    return g;
  }
  function plane(w, h, mat, x, y, z, parent) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.receiveShadow = true;
    (parent || scene).add(m);
    return m;
  }
  function ledMat(boost, key) {
    var m = new THREE.MeshBasicMaterial({ color: new THREE.Color(LED.red).multiplyScalar(boost), toneMapped: false });
    m.userData.boost = boost;
    ledMats.push(m);
    return m;
  }
  function fixedGlow(hex, boost) {
    return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(boost), toneMapped: false });
  }
  function hot(key, x, y, z) { hotspots.push({ key: key, pos: new THREE.Vector3(x, y, z) }); }
  function obst(x0, x1, z0, z1) { obstacles.push({ x0: x0, x1: x1, z0: z0, z1: z1 }); }

  // ---------- dokular
  var floorTex = ctex(1024, 1024, function (g, w, h) {
    var R = rng(11), rows = 8, ph = h / rows;
    for (var i = 0; i < rows; i++) {
      g.fillStyle = 'hsl(26,36%,' + (19 + R() * 9) + '%)';
      g.fillRect(0, i * ph, w, ph);
      for (var k = 0; k < 46; k++) {
        g.strokeStyle = 'rgba(' + (R() < 0.5 ? '0,0,0' : '255,200,150') + ',' + (R() * 0.07) + ')';
        g.lineWidth = R() * 2 + 0.4;
        var y = i * ph + R() * ph;
        g.beginPath(); g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + R() * 8 - 4, w * 0.6, y + R() * 8 - 4, w, y + R() * 6 - 3);
        g.stroke();
      }
      var jx = R() * w;
      g.fillStyle = 'rgba(0,0,0,.6)';
      g.fillRect(jx, i * ph, 2.5, ph);
      g.fillRect(0, i * ph + ph - 2, w, 2.5);
    }
  }, { repeat: [5, 5.4] });

  function fabricTex(col, rep) {
    return ctex(256, 256, function (g, w, h) {
      g.fillStyle = col; g.fillRect(0, 0, w, h);
      var R = rng(5);
      for (var i = 0; i < 5000; i++) {
        g.fillStyle = 'rgba(' + (R() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (R() * 0.09) + ')';
        g.fillRect(R() * w, R() * h, 1 + R() * 1.5, 1 + R() * 1.5);
      }
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
      for (var x = 0; x < w; x += 4) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); }
      for (var y = 0; y < h; y += 4) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
    }, { repeat: rep || [1, 1] });
  }
  var woodTex = ctex(256, 512, function (g, w, h) {
    var R = rng(9);
    g.fillStyle = '#6b4526'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 90; i++) {
      g.strokeStyle = 'rgba(' + (R() < 0.5 ? '30,15,5' : '190,130,80') + ',' + (R() * 0.22) + ')';
      g.lineWidth = R() * 2.4 + 0.5;
      var x = R() * w;
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + R() * 14 - 7, h * 0.3, x + R() * 14 - 7, h * 0.7, x + R() * 10 - 5, h); g.stroke();
    }
  });

  var M = {
    black: std(0x0d0d0f, 0.5, 0.25),
    plastic: std(0x1a1b1e, 0.5, 0.1),
    alu: std(0xb9bcc2, 0.32, 0.92),
    graphite: std(0x2b2c30, 0.42, 0.7),
    white: std(0xcfcdc8, 0.5, 0.05),
    knob: std(0x08080a, 0.45, 0.3),
    foam: std(0x090909, 1, 0),
    rubber: std(0x050505, 0.9, 0)
  };

  // ---------- oda kabuğu
  var floorMat = std(0xffffff, 0.46, 0, { map: floorTex, bumpMap: floorTex, bumpScale: 0.8 });
  var floor = plane(6, 6.4, floorMat, 0, 0, 0); floor.rotation.x = -Math.PI / 2;
  var wallMat = std(0x18181c, 0.94);
  var wb = plane(6, 2.8, wallMat, 0, 1.4, -3.2);
  var wl = plane(6.4, 2.8, wallMat, -3, 1.4, 0); wl.rotation.y = Math.PI / 2;
  var wr = plane(6.4, 2.8, wallMat, 3, 1.4, 0); wr.rotation.y = -Math.PI / 2;
  var wf = plane(6, 2.8, wallMat, 0, 1.4, 3.2); wf.rotation.y = Math.PI;
  var ceil = plane(6, 6.4, std(0x0c0c0f, 0.96), 0, 2.8, 0); ceil.rotation.x = Math.PI / 2;

  // akustik paneller (arka duvar)
  var panelTex = [fabricTex('#1d2026', [1, 1.4]), fabricTex('#292c33', [1, 1.4]), fabricTex('#22262d', [1, 1.4])];
  function panel(x, y, w, h, i) {
    var m = std(0xffffff, 1, 0, { map: panelTex[i % 3], bumpMap: panelTex[i % 3], bumpScale: 0.4 });
    rbox(w, h, 0.07, 0.01, m, x, y, -3.165, scene, false);
  }
  [-2.55, -1.85, 1.85, 2.55].forEach(function (x, i) { panel(x, 1.5, 0.66, 1.6, i + 1); });
  // köşe bas tuzakları
  [-1, 1].forEach(function (s) {
    var m = std(0xffffff, 1, 0, { map: fabricTex('#202329', [1, 4]) });
    cyl(0.28, 0.28, 2.8, m, s * 2.72, 1.4, -2.92, scene, 28, false);
  });

  // sol duvar: ahşap difüzör (QRD benzeri)
  (function () {
    var backing = std(0x0b0b0d, 1);
    var b = plane(2.7, 2.0, backing, -2.99, 1.4, -1.5); b.rotation.y = Math.PI / 2;
    var sm = std(0xffffff, 0.55, 0, { map: woodTex });
    var n = 46, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 2.0, 1), sm, n);
    inst.castShadow = true; inst.receiveShadow = true;
    var d = new THREE.Object3D();
    for (var i = 0; i < n; i++) {
      var depth = 0.02 + ((i * i) % 7) * 0.02;
      d.position.set(-2.99 + depth / 2, 1.4, -2.83 + i * 0.0565);
      d.scale.set(depth, 1, 0.038);
      d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
    }
    scene.add(inst);
  })();

  // tavan: bulut paneller + ray ışık
  [-1.6, 0.2, 1.8].forEach(function (z, i) {
    var m = std(0xffffff, 1, 0, { map: fabricTex(i === 1 ? '#262930' : '#1c1f25', [2, 3]) });
    rbox(1.9, 0.06, 1.3, 0.02, m, i === 1 ? 0 : (i === 0 ? -0.4 : 1.4), 2.72, z - 0.2, scene, false);
  });
  var track = box(1.5, 0.04, 0.05, M.black, 0, 2.74, -1.1, scene, false);
  [-0.55, 0, 0.55].forEach(function (x) {
    var head = cyl(0.04, 0.05, 0.12, M.black, x, 2.66, -1.1, scene, 16, false);
    var bulb = mesh(new THREE.CircleGeometry(0.038, 16), fixedGlow(0xffd9ac, 2.4), x, 2.595, -1.1, scene, false, false);
    bulb.rotation.x = Math.PI / 2;
  });

  // ---------- ışıklar
  scene.add(new THREE.AmbientLight(0x2a2e44, 0.95));
  scene.add(new THREE.HemisphereLight(0x4a5478, 0x1a1210, 0.55));

  var spot = new THREE.SpotLight(0xffd9ac, 5, 9, 0.75, 1, 2);
  spot.position.set(0, 2.6, -1.6);
  spot.target.position.set(0, 0.8, -2.85);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0004;
  spot.shadow.normalBias = 0.02;
  scene.add(spot, spot.target);

  function ledLight(x, y, z, i, d) {
    var l = new THREE.PointLight(LED.red, i, d, 2);
    l.position.set(x, y, z); scene.add(l); ledLights.push(l); return l;
  }
  ledLight(-0.6, 0.15, -2.0, 0.7, 2.5);
  (function () { var sp = new THREE.SpotLight(LED.red, 5, 6, 0.95, 1, 2); sp.position.set(0, 2.3, -2.0); sp.target.position.set(0, 1.1, -3.1); scene.add(sp, sp.target); ledLights.push(sp); })();
  var screenSpill = new THREE.PointLight(0xcfe0ff, 0.6, 2.4, 2); screenSpill.position.set(0, 1.05, -2.75); scene.add(screenSpill);
  var pushGlow = new THREE.PointLight(0xffd8a8, 0.15, 0.9, 2); pushGlow.position.set(-0.56, 1.0, -2.55); scene.add(pushGlow);
  var lamp = new THREE.PointLight(0xffb070, 6, 7, 2); lamp.position.set(2.5, 1.62, 2.4); scene.add(lamp);
  var shelfLight = new THREE.PointLight(0xffc890, 4, 4.5, 2); shelfLight.position.set(-2.1, 1.9, 1.6); scene.add(shelfLight);
  var fill = new THREE.PointLight(0x5a70ff, 6, 10, 2); fill.position.set(0, 2.45, 1.2); scene.add(fill);

  // LED şeritleri
  var strip = ledMat(1.6);
  box(2.5, 0.022, 0.022, strip, 0, 0.36, -3.18, scene, false);
  box(1.7, 0.022, 0.022, strip, 0, 1.22, -3.19, scene, false);
  box(0.022, 1.0, 0.022, strip, -1.3, 1.62, -3.19, scene, false);
  box(0.022, 1.0, 0.022, strip, 1.3, 1.62, -3.19, scene, false);
  box(5.4, 0.022, 0.022, strip, 0, 2.74, -3.18, scene, false);

  // neon yazı
  var neonTex = ctex(1024, 256, function (g, w, h) {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.font = '700 86px "Space Mono", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#fff'; g.shadowBlur = 24; g.fillStyle = '#fff';
    g.fillText('BERKAY ER ACADEMY', w / 2, h * 0.44);
    g.shadowBlur = 0; g.lineWidth = 4; g.strokeStyle = '#fff';
    g.beginPath(); g.moveTo(w * 0.16, h * 0.78); g.lineTo(w * 0.84, h * 0.78); g.stroke();
  });
  var neonMat = new THREE.MeshBasicMaterial({ map: neonTex, color: new THREE.Color(LED.red).multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  neonMat.userData.boost = 1.3; ledMats.push(neonMat);
  plane(1.9, 0.475, neonMat, 0, 2.5, -3.04);
  if (document.fonts && document.fonts.load) document.fonts.load('700 86px "Space Mono"').then(function () { redraw(neonTex, 0); });

  // ---------- masa düzeni: Blender modeli (tools/studio3d/build_desk.py → assets/models/studio-desk.glb)
  // Baskılı yüzeyler GLB'de TEX_* / SCREEN_* adlı malzemeler; dokular burada canvas ile çizilip bağlanır.
  obst(-0.8, 0.8, -3.2, -2.6); obst(-0.8, -0.45, -2.6, -2.45); obst(0.45, 0.8, -2.6, -2.45);

  function gtex(w, h, draw, o) { var t = ctex(w, h, draw, o); t.flipY = false; return t; }

  function drawLive(g, w, h, t) {
    g.fillStyle = '#cfcfd2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b4b4b9'; g.fillRect(0, 0, w, h * 0.055);
    g.fillStyle = '#555'; g.font = '600 ' + Math.round(h * 0.03) + 'px sans-serif'; g.textBaseline = 'middle';
    g.fillText('File   Edit   Create   View   Options   Help', w * 0.02, h * 0.028);
    g.fillStyle = '#c4c4c8'; g.fillRect(0, h * 0.055, w * 0.17, h * 0.745);
    for (var i = 0; i < 18; i++) { g.fillStyle = i % 5 === 0 ? '#9a9aa0' : '#adadb3'; g.fillRect(w * 0.015, h * (0.09 + i * 0.038), w * (0.05 + ((i * 37) % 9) * 0.01), h * 0.018); }
    var gx = w * 0.19, gy = h * 0.075, cols = 8, rows = 8, cw = (w * 0.62) / cols, chh = h * 0.082, pad = 3;
    var tr = ['#e8503a', '#e8503a', '#f08a3c', '#e8503a', '#6fb7e6', '#e8503a', '#9a6fe0', '#8ec26a'];
    for (var c = 0; c < cols; c++) {
      g.fillStyle = tr[c]; g.fillRect(gx + c * cw, gy, cw - pad, h * 0.045);
      g.fillStyle = '#222'; g.font = '600 ' + Math.round(h * 0.024) + 'px sans-serif';
      g.fillText((c + 1) + ' ' + ['Kick', 'Bass', 'Lead', 'Pad', 'FX', 'Hats', 'Arp', 'Vox'][c], gx + c * cw + 6, gy + h * 0.023);
      for (var r = 0; r < rows; r++) {
        var x = gx + c * cw, y = gy + h * 0.055 + r * chh;
        var on = (c + r * 2) % 3 !== 1 && c > 1 && r > 0 && r < 7;
        if (on) {
          g.fillStyle = '#e6553f'; g.fillRect(x, y, cw - pad, chh - pad);
          var p = ((t * 0.35 + c * 0.17) % 1);
          if (r === 1 + (c % 3)) { g.fillStyle = '#f39c8a'; g.fillRect(x, y, (cw - pad) * p, chh - pad); }
          g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + 6, y + chh * 0.28); g.lineTo(x + 6, y + chh * 0.62); g.lineTo(x + 16, y + chh * 0.45); g.fill();
        } else { g.fillStyle = '#bdbdc3'; g.fillRect(x, y, cw - pad, chh - pad); }
      }
    }
    g.fillStyle = '#d9d9dc'; g.fillRect(w * 0.85, h * 0.055, w * 0.15, h * 0.745);
    for (var q = 0; q < 10; q++) { g.fillStyle = '#b3b3b9'; g.fillRect(w * 0.865, h * (0.09 + q * 0.06), w * 0.1, h * 0.025); }
    g.fillStyle = '#e0e0e3'; g.fillRect(0, h * 0.8, w, h * 0.2);
    g.fillStyle = '#efe9db'; g.fillRect(w * 0.22, h * 0.82, w * 0.26, h * 0.16);
    g.fillStyle = '#3f9be6'; g.beginPath();
    for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3 + Math.PI / 6; var px = w * 0.35 + Math.cos(a) * h * 0.06, py = h * 0.9 + Math.sin(a) * h * 0.06; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath(); g.fill();
    g.fillStyle = '#555'; g.font = '700 ' + Math.round(h * 0.022) + 'px sans-serif'; g.fillText('RAUM', w * 0.325, h * 0.975);
  }
  var screenTex = gtex(1280, 720, drawLive);
  var miniTex = gtex(800, 520, drawLive);

  function label(g, txt, x, y, px, col, align) {
    g.fillStyle = col || '#fff'; g.font = '600 ' + px + 'px "Space Mono", monospace';
    g.textAlign = align || 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y);
  }
  // DrumBrute Impact 1984: plaka .31 x .284 m; sütun merkezleri x = -0.125 + c*0.0275
  var drumTex = gtex(1024, 938, function (g, w, h) {
    g.fillStyle = '#e7e4dc'; g.fillRect(0, 0, w, h);
    var U = function (x) { return (x + 0.155) / 0.31 * w; }, V = function (y) { return (0.142 - y) / 0.284 * h; };
    g.strokeStyle = '#b9b5ab'; g.lineWidth = 2;
    for (var c = 0; c <= 10; c++) { var x = U(-0.139 + c * 0.0275); g.beginPath(); g.moveTo(x, V(0.055)); g.lineTo(x, V(-0.085)); g.stroke(); }
    g.strokeStyle = '#e8561e'; g.lineWidth = 4; g.strokeRect(U(-0.14), V(0.088), U(0.16) - U(-0.14), V(0.052) - V(0.088));
    var nm = ['KICK1', 'KICK2', 'SNARE', 'CLAP', 'RIM', 'C.HAT', 'O.HAT', 'TOM HI', 'TOM LO', 'CYMBAL'];
    for (var i = 0; i < 10; i++) label(g, nm[i], U(-0.125 + i * 0.0275), V(-0.078), 15, '#3a3a3a');
    for (var r = 0; r < 2; r++) for (var j = 0; j < 10; j++) label(g, r ? 'DECAY' : 'LEVEL', U(-0.125 + j * 0.0275), V(0.035 - r * 0.032) + 34, 11, '#55524c');
    label(g, 'DRUMBRUTE IMPACT', U(-0.09), V(0.135), 22, '#fff');
    label(g, 'ARTURIA', U(0.11), V(-0.105), 26, '#e8561e');
    label(g, '1984', U(0.145), V(-0.105), 18, '#3a3a3a');
  });
  var fuseTex = gtex(1024, 600, function (g, w, h) {
    g.fillStyle = '#1b1b1f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3a3a40'; g.lineWidth = 2; g.strokeRect(w * 0.03, h * 0.08, w * 0.5, h * 0.84);
    for (var i = 0; i < 4; i++) label(g, String(i + 1), w * (0.1 + i * 0.113), h * 0.12, 22, '#cfd2d8');
    label(g, 'AUDIOFUSE STUDIO', w * 0.78, h * 0.86, 22, '#cfd2d8');
    label(g, 'MONITOR', w * 0.8, h * 0.12, 18, '#9a9ea6');
    label(g, 'ARTURIA', w * 0.78, h * 0.94, 18, '#e8561e');
  });
  var td3Tex = gtex(1024, 554, function (g, w, h) {
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d8dade'; g.lineWidth = 2; g.strokeRect(w * 0.02, h * 0.04, w * 0.96, h * 0.92);
    label(g, 'TD-3', w * 0.08, h * 0.12, 44, '#e8e8e8', 'left');
    label(g, 'behringer', w * 0.9, h * 0.12, 30, '#e8e8e8', 'right');
    var kn = ['TUNING', 'CUT OFF', 'RESONANCE', 'ENV MOD', 'DECAY', 'ACCENT', 'VOLUME'];
    for (var i = 0; i < 7; i++) label(g, kn[i], w * ((0.03 + i * 0.033 + 0.1475) / 0.295), h * 0.38, 13, '#cfd2d8');
    label(g, 'TEMPO', w * 0.4, h * 0.58, 14, '#cfd2d8'); label(g, 'WAVEFORM', w * 0.6, h * 0.58, 14, '#cfd2d8');
    label(g, 'ANALOG BASS LINE SYNTHESIZER', w * 0.32, h * 0.92, 15, '#9a9ea6');
  });
  var mfTex = gtex(1024, 452, function (g, w, h) {
    g.fillStyle = '#1c1d21'; g.fillRect(0, 0, w, h);
    var R = rng(33);
    for (var i = 0; i < 46; i++) {
      g.strokeStyle = 'rgba(225,228,235,' + (0.06 + R() * 0.22) + ')'; g.lineWidth = 1 + R() * 4;
      g.beginPath(); var x = R() * w; g.moveTo(x, 0);
      g.bezierCurveTo(x + R() * 160 - 80, h * 0.3, x + R() * 220 - 110, h * 0.7, x + R() * 160 - 80, h); g.stroke();
    }
    label(g, 'MicroFreak', w * 0.84, h * 0.88, 30, '#f0f0f0');
    label(g, 'ARTURIA', w * 0.08, h * 0.92, 18, '#e8561e', 'left');
  });
  var mfKeysTex = gtex(1024, 302, function (g, w, h) {
    g.fillStyle = '#2a2a2c'; g.fillRect(0, 0, w, h);
    var kw = w / 15;
    for (var k = 0; k < 15; k++) {
      g.fillStyle = '#e2e2e0'; g.fillRect(k * kw + 3, 4, kw - 6, h - 8);
      g.fillStyle = '#8e8e8c';
      for (var dy = 0; dy < 9; dy++) for (var dx = 0; dx < 5; dx++) g.fillRect(k * kw + kw * 0.18 + dx * kw * 0.15, h * 0.12 + dy * h * 0.09, 3, 3);
    }
    [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].forEach(function (i) { g.fillStyle = '#3a2a22'; g.fillRect((i + 1) * kw - kw * 0.3, 0, kw * 0.6, h * 0.58); });
  });
  var pushTex = gtex(1024, 860, function (g, w, h) {
    g.fillStyle = '#141416'; g.fillRect(0, 0, w, h);
    label(g, 'PUSH', w * 0.06, h * 0.05, 22, '#8a8a90', 'left');
    label(g, 'Ableton', w * 0.94, h * 0.05, 22, '#8a8a90', 'right');
  });
  // Logitech Craft tuş baskıları (saydam; tuş geometrisinin üstünde)
  var craftTex = gtex(1024, 310, function (g, w, h) {
    g.clearRect(0, 0, w, h);
    var rows = [15, 14, 14, 13, 11], ch = 'QWERTYUIOPASDFGHJKLZXCVBNM1234567890';
    rows.forEach(function (n, r) {
      for (var i = 0; i < n; i++) {
        var x = -0.175 + i * 0.0182, y = 0.035 - r * 0.0185;
        label(g, ch[(r * 7 + i) % ch.length], (x + 0.165) / 0.33 * w - 6, (0.05 - y) / 0.1 * h - 6, 15, 'rgba(235,245,240,.9)');
      }
    });
  });
  var mbKeysTex = gtex(1024, 360, function (g, w, h) {
    g.fillStyle = '#0d0d0f'; g.fillRect(0, 0, w, h);
    var rows = [14, 14, 13, 12, 11];
    rows.forEach(function (n, r) {
      var kw = w / 14.5;
      for (var i = 0; i < n; i++) {
        g.fillStyle = '#1d1d21'; g.fillRect(8 + i * kw, 8 + r * h / 5.2, kw - 8, h / 5.2 - 10);
        g.fillStyle = 'rgba(220,240,230,.55)'; g.fillRect(8 + i * kw + kw * 0.38, 8 + r * h / 5.2 + 12, 8, 4);
      }
    });
  });
  var adamTex = gtex(256, 64, function (g, w, h) { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); label(g, 'ADAM AUDIO', w / 2, h / 2, 30, '#e8e8e8'); });
  // masa matı: dikey renk bantları ve turuncu giysili figür siluetleri (fotoğraftaki renkler)
  var matTex = gtex(1024, 432, function (g, w, h) {
    var cols = ['#c7301e', '#e8601c', '#f2b01e', '#e8601c', '#c7301e', '#f2b01e', '#2a6fc0', '#e8601c'];
    var bw = w / cols.length, R = rng(3);
    cols.forEach(function (c, i) { g.fillStyle = c; g.fillRect(i * bw, 0, bw + 1, h); });
    for (var i = 0; i < 9; i++) {
      var cx = i * w / 8.5 + 40, by = h * 0.98;
      g.fillStyle = '#e46b16'; g.beginPath(); g.ellipse(cx, by - 70, 44, 80, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2b4f9e'; g.fillRect(cx - 44, by - 72, 88, 12);
      g.fillStyle = '#f0c9a0'; g.beginPath(); g.arc(cx, by - 170, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = i % 3 === 0 ? '#f6d23a' : '#141414';
      for (var s = 0; s < 6; s++) { g.beginPath(); g.moveTo(cx - 26 + s * 10, by - 182); g.lineTo(cx - 34 + s * 13 + R() * 10, by - 230 - R() * 30); g.lineTo(cx - 18 + s * 10, by - 186); g.closePath(); g.fill(); }
    }
  });

  var TEXMAP = {
    SCREEN_main: { tex: screenTex, screen: 1.0 },
    SCREEN_laptop: { tex: miniTex, screen: 0.95 },
    TEX_drum: { tex: drumTex }, TEX_fuse: { tex: fuseTex }, TEX_td3: { tex: td3Tex },
    TEX_mf: { tex: mfTex }, TEX_mfkeys: { tex: mfKeysTex }, TEX_push: { tex: pushTex },
    TEX_craft: { tex: craftTex, alpha: true, emissive: 0.6 }, TEX_mbkeys: { tex: mbKeysTex, emissive: 0.4 },
    TEX_adam: { tex: adamTex }, TEX_mat: { tex: matTex }
  };
  var swapped = {};
  function swapMat(m) {
    if (swapped[m.uuid]) return swapped[m.uuid];
    var sp = TEXMAP[m.name], out = m;
    if (m.name === 'RGB_strip') { out = ledMat(1.4); swapped[m.uuid] = out; return out; }
    // fotoğraftaki gibi loş: ped/LED kendinden ışımalarını kıs
    if (m.name === 'push_pad') { m.color.multiplyScalar(0.72); m.emissive.setScalar(0); }
    else if (m.emissive && !sp) m.emissive.multiplyScalar(0.6);
    if (sp && sp.screen) {
      out = new THREE.MeshBasicMaterial({ map: sp.tex, toneMapped: false, color: new THREE.Color(sp.screen, sp.screen, sp.screen) });
    } else if (sp) {
      m.map = sp.tex; m.color.set(0xffffff);
      if (sp.emissive) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = sp.tex; m.emissiveIntensity = sp.emissive; }
      if (sp.alpha) { m.transparent = true; m.alphaTest = 0.25; m.depthWrite = false; }
      m.needsUpdate = true;
    }
    swapped[m.uuid] = out;
    return out;
  }
  var ready = new Promise(function (resolve) {
    new GLTFLoader().load('/assets/models/studio-desk.glb?v=' + MODEL_V, function (gl) {
      gl.scene.traverse(function (o) {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        if (Array.isArray(o.material)) o.material = o.material.map(swapMat); else o.material = swapMat(o.material);
      });
      scene.add(gl.scene);
      resolve(true);
    }, undefined, function (e) { console.warn('[s3d] masa modeli yüklenemedi', e); resolve(false); });
  });
  hot('s3d_t_push', -0.56, DY + 0.2, -2.66);
  hot('s3d_t_screen', 0, DY + 0.52, -3.04);
  hot('s3d_t_mon', -0.63, DY + 0.62, -2.98);
  hot('s3d_t_iface', 0.0, DY + 0.22, -2.95);
  hot('s3d_t_drum', -0.3, DY + 0.22, -2.86);
  hot('s3d_t_303', 0.3, DY + 0.1, -2.86);
  hot('s3d_t_synth', 0.4, DY + 0.17, -2.72);
  hot('s3d_t_laptop', 0.68, DY + 0.32, -2.66);
  hot('s3d_t_rec', 0.5, DY + 0.06, -2.52);
  // AudioFuse yükselticisinin altındaki kırmızı ışık ve Grogu'nun yanındaki mumlar
  ledLight(0.0, DY + 0.03, -2.9, 0.22, 1.0);
  box(0.28, 0.008, 0.008, ledMat(1.6), 0.0, DY + 0.02, -2.86, scene, false);
  var candleLight = new THREE.PointLight(0xffa040, 0.22, 1.2, 2); candleLight.position.set(0.2, DY + 0.1, -2.97); scene.add(candleLight);

  // masanın arkasında siyah perde (fotoğraftaki gibi), çubuk ve halkalar
  (function () {
    var geo = new THREE.PlaneGeometry(3.1, 2.2, 140, 1);
    var pa = geo.attributes.position;
    for (var i = 0; i < pa.count; i++) {
      var x = pa.getX(i);
      pa.setZ(i, Math.sin(x * 11) * 0.03 + Math.sin(x * 27 + 1) * 0.01);
    }
    geo.computeVertexNormals();
    var cm = std(0x0a0a0d, 1, 0, { side: THREE.DoubleSide });
    var c = mesh(geo, cm, 0, 1.13, -3.1, scene, true);
    cyl(0.014, 0.014, 3.3, M.black, 0, 2.24, -3.08, scene, 10, false).rotation.z = Math.PI / 2;
    [-1.5, 1.5].forEach(function (x) { mesh(new THREE.SphereGeometry(0.025, 12, 8), M.black, x, 2.24, -3.08, scene, false, false); });
  })();

  // sol köşede hasır sepet
  cyl(0.2, 0.17, 0.42, std(0x8a6a3a, 0.9), -1.62, 0.21, -2.85, scene, 24);
  cyl(0.15, 0.15, 0.015, std(0x2a2118, 1), -1.62, 0.42, -2.85, scene, 24, false);

  // ---------- sandalye
  function chair(x, z, ry, accent) {
    var g = grp(x, 0, z, ry);
    var fab = std(0x17181b, 0.85);
    rbox(0.5, 0.08, 0.5, 0.03, fab, 0, 0.5, 0, g);
    rbox(0.46, 0.55, 0.07, 0.03, fab, 0, 0.82, 0.24, g);
    var s = box(0.46, 0.012, 0.012, std(accent, 0.7), 0, 0.82, 0.205, g, false); s.scale.y = 1;
    cyl(0.025, 0.025, 0.28, M.alu, 0, 0.3, 0, g, 14);
    for (var i = 0; i < 5; i++) {
      var a = i / 5 * Math.PI * 2;
      var arm = box(0.3, 0.025, 0.04, M.black, Math.cos(a) * 0.15, 0.1, Math.sin(a) * 0.15, g, false);
      arm.rotation.y = -a;
      mesh(new THREE.SphereGeometry(0.025, 10, 8), M.black, Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3, g, false);
    }
    return g;
  }
  chair(0.0, -2.05, 0.25, 0xd5352a);

  // ---------- ders köşesi: halı, kanepe, sehpa, lamba, bitki
  var rugTex = ctex(512, 448, function (g, w, h) {
    g.fillStyle = '#1b1d28'; g.fillRect(0, 0, w, h);
    var R = rng(7);
    for (var i = 0; i < 3000; i++) { g.fillStyle = 'rgba(255,255,255,' + R() * 0.05 + ')'; g.fillRect(R() * w, R() * h, 2, 2); }
    g.strokeStyle = '#3a3f58'; g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36);
    g.strokeStyle = '#ff5a3c'; g.lineWidth = 2; g.strokeRect(34, 34, w - 68, h - 68);
    for (var k = 0; k < 7; k++) { g.beginPath(); g.moveTo(60, h * 0.5 + Math.sin(k) * 6); for (var x = 60; x < w - 60; x += 8) g.lineTo(x, h * 0.5 + Math.sin(x * 0.05 + k) * (14 + k * 6)); g.strokeStyle = 'rgba(255,255,255,' + (0.05 + k * 0.015) + ')'; g.stroke(); }
  });
  var rug = plane(2.6, 2.2, std(0xffffff, 1, 0, { map: rugTex }), 1.55, 0.004, 0.9); rug.rotation.x = -Math.PI / 2;

  (function () {
    var g = grp(2.55, 0, 0.9, -Math.PI / 2);
    var fab = std(0xffffff, 1, 0, { map: fabricTex('#2a2c33', [3, 1]), bumpMap: fabricTex('#2a2c33', [3, 1]), bumpScale: 0.5 });
    rbox(2.2, 0.2, 0.9, 0.05, fab, 0, 0.24, 0, g);
    [-0.73, 0, 0.73].forEach(function (x) { rbox(0.72, 0.14, 0.72, 0.05, fab, x, 0.41, 0.07, g); });
    rbox(2.2, 0.5, 0.22, 0.08, fab, 0, 0.62, -0.34, g);
    [-1.05, 1.05].forEach(function (x) { rbox(0.14, 0.34, 0.9, 0.06, fab, x, 0.4, 0, g); });
    [[-1, -0.35], [1, -0.35], [-1, 0.35], [1, 0.35]].forEach(function (p) { cyl(0.025, 0.02, 0.12, M.black, p[0], 0.06, p[1], g, 10, false); });
    obst(2.05, 3.0, -0.25, 2.05);
    hot('s3d_t_lounge', 2.45, 1.0, 0.9);
  })();
  (function () {
    var wood = std(0xffffff, 0.45, 0, { map: woodTex });
    cyl(0.42, 0.42, 0.04, wood, 1.6, 0.4, 0.9, scene, 40);
    cyl(0.025, 0.025, 0.38, M.black, 1.6, 0.2, 0.9, scene, 12);
    cyl(0.2, 0.2, 0.02, M.black, 1.6, 0.01, 0.9, scene, 24, false);
    obst(1.15, 2.05, 0.45, 1.35);
    // sehpa üstü: küçük mum/ses kutusu
    cyl(0.04, 0.04, 0.09, std(0xd8d0c0, 0.7), 1.5, 0.465, 0.85, scene, 16, false);
    mesh(new THREE.SphereGeometry(0.008, 8, 6), fixedGlow(0xffc060, 3), 1.5, 0.52, 0.85, scene, false, false);
  })();
  (function () {
    cyl(0.12, 0.12, 0.02, M.black, 2.55, 0.01, 2.5, scene, 24, false);
    cyl(0.012, 0.012, 1.5, M.black, 2.55, 0.76, 2.5, scene, 10);
    var shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.26, 28, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb878).multiplyScalar(1.6), side: THREE.DoubleSide, toneMapped: false }));
    shade.position.set(2.55, 1.62, 2.5); scene.add(shade);
    lamp.position.set(2.5, 1.55, 2.45);
    obst(2.4, 2.7, 2.35, 2.65);
  })();
  (function () {
    var g = grp(2.58, 0, -0.85, 0);
    cyl(0.16, 0.12, 0.3, std(0x1b1d22, 0.7), 0, 0.15, 0, g, 24);
    var leaf = std(0x1f4a2b, 0.7, 0, { side: THREE.DoubleSide });
    var R = rng(2);
    for (var i = 0; i < 14; i++) {
      var a = R() * Math.PI * 2, tl = 0.35 + R() * 0.5;
      var l = mesh(new THREE.SphereGeometry(0.1, 12, 8), leaf, Math.cos(a) * 0.12, 0.5 + R() * 0.35, Math.sin(a) * 0.12, g);
      l.scale.set(0.35, 1.5 + R() * 0.5, 0.12);
      l.rotation.z = Math.cos(a) * 0.6; l.rotation.x = -Math.sin(a) * 0.6; l.rotation.y = a;
    }
    obst(2.38, 2.78, -1.05, -0.65);
  })();

  // çerçeveler (fotoğraf yuvaları) — sağ duvar, kanepe üstü
  function placeholder(i) {
    return ctex(384, 512, function (g, w, h) {
      var R = rng(40 + i);
      g.fillStyle = '#0d0e14'; g.fillRect(0, 0, w, h);
      var gr = g.createRadialGradient(w * 0.5, h * 0.4, 10, w * 0.5, h * 0.4, w * 0.8);
      gr.addColorStop(0, ['#ff3c2a', '#8a3dff', '#18c8ff'][i % 3]); gr.addColorStop(1, '#0d0e14');
      g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.beginPath();
      for (var x = 20; x < w - 20; x += 3) { var amp = (Math.sin(x * 0.04 + i) * 0.5 + 0.5) * 70 * (0.3 + R()); g.moveTo(x, h * 0.55 - amp); g.lineTo(x, h * 0.55 + amp); }
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '700 22px monospace'; g.textAlign = 'center';
      g.fillText('BERKAY ER ACADEMY', w / 2, h * 0.9);
    });
  }
  var frameMat = std(0xffffff, 0.5, 0, { map: woodTex });
  var photoSlots = [];
  [0.0, 0.95, 1.9].forEach(function (z, i) {
    var g = grp(2.965, 1.58, z, -Math.PI / 2);
    box(0.62, 0.82, 0.03, frameMat, 0, 0, 0, g);
    var pm2 = new THREE.MeshStandardMaterial({ map: placeholder(i), roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.12 });
    pm2.emissiveMap = pm2.map;
    plane(0.54, 0.74, pm2, 0, 0, 0.0165, g);
    photoSlots.push(pm2);
  });
  var tl = new THREE.TextureLoader();
  (CONFIG.photos || []).forEach(function (p, i) {
    if (!photoSlots[i] || !p || !p.src) return;
    tl.load(p.src, function (tx) {
      tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      var ia = tx.image.width / tx.image.height, sa = 0.54 / 0.74;
      if (ia > sa) { tx.repeat.set(sa / ia, 1); tx.offset.set((1 - sa / ia) / 2, 0); } else { tx.repeat.set(1, ia / sa); tx.offset.set(0, (1 - ia / sa) / 2); }
      photoSlots[i].map = tx; photoSlots[i].emissiveMap = tx; photoSlots[i].needsUpdate = true;
    });
  });

  // sol duvar: plak rafı
  (function () {
    var g = grp(-2.82, 0, 1.6, Math.PI / 2);
    var wood = std(0xffffff, 0.5, 0, { map: woodTex });
    box(0.04, 2.1, 0.4, wood, -1.0, 1.05, 0, g); box(0.04, 2.1, 0.4, wood, 1.0, 1.05, 0, g);
    for (var s = 0; s < 6; s++) box(2.0, 0.03, 0.4, wood, 0, 0.1 + s * 0.4, 0, g);
    var R = rng(77), pal = [0xc0392b, 0xe8b84b, 0x2c3e50, 0x16a085, 0x8e44ad, 0xecf0f1, 0xd35400, 0x1b1b1b, 0x3a86c8];
    var n = 420, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std(0xffffff, 0.7), n);
    var d = new THREE.Object3D(), col = new THREE.Color(), idx = 0;
    for (var lv = 0; lv < 4; lv++) {
      var x = -0.94;
      while (x < 0.94 && idx < n) {
        var th = 0.008 + R() * 0.012;
        d.position.set(x + th / 2, 0.1 + lv * 0.4 + 0.145 + 0.02, 0.0);
        d.scale.set(th, 0.3, 0.3);
        d.updateMatrix(); inst.setMatrixAt(idx, d.matrix);
        col.setHex(pal[Math.floor(R() * pal.length)]); inst.setColorAt(idx, col);
        x += th + 0.002; idx++;
      }
    }
    inst.count = idx; inst.castShadow = true; g.add(inst);
    // üst raflarda dekor
    cyl(0.1, 0.07, 0.2, std(0x22252b, 0.6), 0.3, 1.835, 0, g, 18);
    rbox(0.4, 0.2, 0.28, 0.02, std(0x2a2c31, 0.5, 0.4), -0.45, 1.835, 0, g);
    obst(-3.0, -2.5, 0.5, 2.7);
  })();

  // kapı (ön duvar)
  (function () {
    var g = grp(-1.6, 1.03, 3.17, Math.PI);
    box(1.0, 2.08, 0.05, std(0xffffff, 0.55, 0, { map: woodTex }), 0, 0, 0, g);
    cyl(0.012, 0.012, 0.14, M.alu, 0.38, -0.05, -0.05, g, 10).rotation.z = Math.PI / 2;
  })();

  // ---------- ışıkta uçuşan toz
  var dust;
  (function () {
    var n = 220, pos = new Float32Array(n * 3), R = rng(99);
    for (var i = 0; i < n; i++) { pos[i * 3] = (R() - 0.5) * 2.4; pos[i * 3 + 1] = 0.6 + R() * 2; pos[i * 3 + 2] = -3 + R() * 2.5; }
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffe2b8, size: 0.008, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dust);
  })();

  // ---------- LED rengi
  var ledKey = 'red';
  function setLed(key) {
    if (!LED[key]) return;
    ledKey = key;
    ledMats.forEach(function (m) { m.color.set(LED[key]).multiplyScalar(m.userData.boost); });
    ledLights.forEach(function (l) { l.color.set(LED[key]); });
  }
  setLed('red');

  // ---------- animasyon
  var lastTex = -1;
  function update(t) {
    if (t - lastTex > 0.1) {
      lastTex = t;
      redraw(screenTex, t); redraw(miniTex, t);
    }
    var pulse = 0.94 + Math.sin(t * 1.7) * 0.06;
    strip.color.set(LED[ledKey]).multiplyScalar(1.6 * pulse);
    var f = 1 + Math.sin(t * 0.9) * 0.03 + (Math.sin(t * 37) > 0.995 ? -0.1 : 0);
    neonMat.color.set(LED[ledKey]).multiplyScalar(1.3 * f);
    pushGlow.intensity = 0.15;
    screenSpill.intensity = 0.58 + Math.sin(t * 1.1) * 0.04;
    var p = dust.geometry.attributes.position.array;
    for (var i = 0; i < p.length; i += 3) {
      p[i + 1] += Math.sin(t * 0.3 + i) * 0.0003 + 0.00008;
      p[i] += Math.cos(t * 0.2 + i * 0.7) * 0.0002;
      if (p[i + 1] > 2.7) p[i + 1] = 0.6;
    }
    dust.geometry.attributes.position.needsUpdate = true;
  }

  return { scene: scene, ready: ready, update: update, setLed: setLed, hotspots: hotspots, obstacles: obstacles, spot: spot };
}
