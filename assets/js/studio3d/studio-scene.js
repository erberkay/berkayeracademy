// Berkeal Studio Room 3D — sahne kurulumu. Metre cinsinden; oda x:[-3,3], z:[-3.2,3.2], tavan 2.8.
// Masa arka duvara dayalı (z=-3.2), kamera varsayılan olarak girişten (z>0) masaya bakar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

var MODEL_V = '202610273100';

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
  var pushGlow = new THREE.PointLight(0xffd8a8, 0.15, 0.9, 2); pushGlow.position.set(-0.74, 1.0, -2.45); scene.add(pushGlow);
  var lamp = new THREE.PointLight(0xffb070, 6, 7, 2); lamp.position.set(2.5, 1.62, 2.4); scene.add(lamp);
  var shelfLight = new THREE.PointLight(0xffc890, 4, 4.5, 2); shelfLight.position.set(0.6, 1.9, 2.3); scene.add(shelfLight);
  var fill = new THREE.PointLight(0x5a70ff, 6, 10, 2); fill.position.set(0, 2.45, 1.2); scene.add(fill);

  // LED şeritleri
  var strip = ledMat(1.6);
  box(2.5, 0.022, 0.022, strip, 0, 0.36, -3.18, scene, false);
  box(1.7, 0.022, 0.022, strip, 0, 1.22, -3.19, scene, false);
  box(0.022, 1.0, 0.022, strip, -1.3, 1.62, -3.19, scene, false);
  box(0.022, 1.0, 0.022, strip, 1.3, 1.62, -3.19, scene, false);
  box(5.4, 0.022, 0.022, strip, 0, 2.74, -3.18, scene, false);

  // ---------- masa düzeni: Blender modeli (tools/studio3d/build_desk.py → assets/models/studio-desk.glb)
  // Baskılı yüzeyler GLB'de TEX_* / SCREEN_* adlı malzemeler; dokular burada canvas ile çizilip bağlanır.
  obst(-1.2, 1.2, -3.2, -2.55); obst(-3.0, -2.5, 1.2, 2.0); obst(-2.6, -1.9, -2.1, -0.8); obst(-1.2, -0.45, -2.55, -2.3); obst(0.45, 1.2, -2.55, -2.3); obst(-2.65, -2.25, -2.6, -2.2); obst(-2.65, -2.25, -0.7, -0.3);

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
  function rr(g, x, y, w, h, fill, stroke) { g.beginPath(); g.rect(x, y, w, h); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.stroke(); } }
  // DrumBrute Impact 1984: plaka .31 x .284 m; 8 enstrüman sütunu x = -0.1 + c*0.0335 (Blender ile aynı)
  var drumTex = gtex(1024, 938, function (g, w, h) {
    g.fillStyle = '#e8e5dd'; g.fillRect(0, 0, w, h);
    var U = function (x) { return (x + 0.155) / 0.31 * w; }, V = function (y) { return (0.142 - y) / 0.284 * h; };
    g.lineWidth = 2;
    rr(g, U(-0.118), V(0.058), U(0.152) - U(-0.118), V(-0.112) - V(0.058), null, '#bdb8ad');
    for (var c = 1; c < 8; c++) { var x = U(-0.1 + c * 0.0335 - 0.0168); g.strokeStyle = '#c9c4b9'; g.beginPath(); g.moveTo(x, V(0.055)); g.lineTo(x, V(-0.1)); g.stroke(); }
    rr(g, U(-0.152), V(0.095), U(-0.122) - U(-0.152), V(-0.105) - V(0.095), null, '#bdb8ad');
    var nm = ['KICK', 'SNARE 1', 'SNARE 2', 'TOM HI', 'TOM LO', 'CYMBAL', 'CL. HAT', 'OP. HAT'];
    for (var i = 0; i < 8; i++) {
      var cx = U(-0.1 + i * 0.0335);
      label(g, nm[i], cx, V(0.052), 13, '#4a4740');
      label(g, 'LEVEL', cx, V(0.026), 10, '#6d6a62'); label(g, 'PITCH', cx + 6, V(-0.007), 10, '#6d6a62'); label(g, 'DECAY', cx, V(-0.042), 10, '#6d6a62');
      label(g, nm[i], cx, V(-0.096), 10, '#4a4740');
    }
    for (var s2 = 0; s2 < 16; s2++) label(g, String(s2 + 1), U(-0.088 + (s2 % 8) * 0.019), V(0.085 - (s2 >> 3) * 0.017) - 17, 9, '#6d6a62');
    label(g, 'METRONOME', U(-0.138), V(0.09), 9, '#6d6a62');
    label(g, 'DISTORTION', U(0.068), V(0.1), 10, '#e8561e'); label(g, 'MASTER', U(0.108), V(0.1), 10, '#6d6a62');
    label(g, 'SWING', U(-0.012), V(0.095), 9, '#6d6a62');
  });
  // AudioFuse Studio: resmî ürün görselinin piksel düzeni (Blender'daki düğmelerle aynı koordinatlar)
  function lbl(g, t, x, y, px, col, al) { label(g, t, x, y, px, col || '#d9dbe0', al); }
  var fuseTex = gtex(1188, 716, function (g, w, h) {
    var P = function (x) { return (x - 721) * 2; }, Q = function (y) { return (y - 307.5) * 2; };
    g.fillStyle = '#1c1d21'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9dbe0'; g.lineWidth = 2;
    g.beginPath(); g.arc(P(735), Q(316), 14, 0, 7); g.stroke(); lbl(g, 'A', P(735), Q(316), 16);
    lbl(g, 'AUDIOFUSE STUDIO', P(840), Q(333), 22, '#eceef2');
    ['INTERNAL', 'ADAT', 'SPDIF', 'WORD', 'USB'].forEach(function (t, i) {
      var x = P(1130 + i * 22); g.fillStyle = i === 0 ? '#9fd8ff' : '#3a3d44'; g.beginPath(); g.arc(x, Q(331), 4, 0, 7); g.fill(); lbl(g, t, x, Q(341), 8, '#9a9ea6');
    });
    g.strokeStyle = '#2c2e34'; g.beginPath(); g.moveTo(0, Q(362)); g.lineTo(w, Q(362)); g.stroke();
    g.strokeStyle = '#8a8d94'; g.lineWidth = 2;
    [733, 822, 911, 999].forEach(function (x0, i) {
      g.strokeRect(P(x0), Q(380), 154, Q(517) - Q(380));
      g.fillStyle = '#1c1d21'; g.fillRect(P(x0 + 10), Q(380) - 9, 134, 18);
      lbl(g, 'INPUT CHANNEL ' + (i + 1), P(x0 + 38.5), Q(380), 12, '#e6e7ea');
      ['MIC', 'LINE', 'INST'].forEach(function (t, k) {
        var x = P(x0 + 18 + k * 19);
        g.fillStyle = k === (i === 2 ? 0 : 1) ? '#9fd8ff' : '#33363c'; g.beginPath(); g.arc(x, Q(404), 4, 0, 7); g.fill();
        lbl(g, t, x, Q(412), 9, '#c9ccd2');
      });
      ['CLIP', '3', '6', '10', '16', '20', '26', '42', '60'].forEach(function (t, m) {
        var y = Q(426 + m * 10); lbl(g, t, P(x0 + 55), y, 8, '#8a8d94');
        g.fillStyle = m >= 4 + (i % 3) ? '#4fd46e' : '#22392a'; g.fillRect(P(x0 + 62), y - 6, 12, 12);
      });
      g.strokeRect(P(x0), Q(548), 154, Q(617) - Q(548));
      lbl(g, 'GAIN ' + (i + 1), P(x0 + 14), Q(556), 9, '#a9adb5', 'left');
      g.fillStyle = '#c9ccd2'; [x0 + 22, x0 + 55].forEach(function (x) { g.beginPath(); g.arc(P(x), Q(609), 3, 0, 7); g.fill(); });
    });
    lbl(g, 'OUTPUT LEVEL', P(1182), Q(385), 12, '#e6e7ea');
    for (var d = 0; d < 26; d++) {
      var a = Math.PI * 0.72 + d / 25 * Math.PI * 1.56, x = P(1182) + Math.cos(a) * 124, y = Q(441) + Math.sin(a) * 124;
      g.fillStyle = d < 18 ? '#55e07a' : '#23392a'; g.fillRect(x - 5, y - 5, 10, 10);
    }
    lbl(g, 'SPEAKER A', P(1270), Q(405), 9); lbl(g, 'SPEAKER B', P(1270), Q(413), 9);
    g.fillStyle = '#9fd8ff'; g.beginPath(); g.arc(P(1293), Q(413), 4, 0, 7); g.fill();
    lbl(g, 'PHONES', P(1182), Q(567), 12, '#e6e7ea'); lbl(g, 'TALK', P(1284), Q(562), 8); lbl(g, 'BACK', P(1284), Q(592), 8);
    ['MAIN', 'CUE 1', 'CUE 2'].forEach(function (t, k) { lbl(g, t, P(1142), Q(600 + k * 8), 8); lbl(g, t, P(1222), Q(600 + k * 8), 8); });
    g.fillStyle = '#9fd8ff'; [[1167, 616], [1197, 608]].forEach(function (p2) { g.beginPath(); g.arc(P(p2[0]), Q(p2[1]), 4, 0, 7); g.fill(); });
  });
  var fuseRearTex = gtex(1222, 292, function (g, w, h) {
    var P = function (x) { return (x - 712) * 2; }, Q = function (y) { return (y - 417) * 2; };
    g.fillStyle = '#1a1b1e'; g.fillRect(0, 0, w, h);
    lbl(g, 'ARTURIA', P(767), Q(426), 22, '#eceef2');
    lbl(g, 'AUDIOFUSE STUDIO', P(840), Q(551), 16, '#d9dbe0');
    g.fillStyle = '#0c0c0e';
    [[748, 445], [748, 460], [748, 475], [897, 445], [897, 460], [918, 445], [918, 460], [1053, 445], [1053, 460], [1077, 445], [1077, 460], [1100, 445], [1100, 460], [1287, 445], [1287, 460], [1287, 475], [1287, 490]].forEach(function (v) { g.fillRect(P(v[0]) - 14, Q(v[1]), 28, 7); });
    [['MIDI', 841], ['WCLK | S/PDIF', 988], ['OPTICAL IN', 1159], ['OPTICAL OUT', 1234]].forEach(function (t) { lbl(g, t[0], P(t[1]), Q(423), 10); });
    g.strokeStyle = '#9a9ea6'; g.lineWidth = 1.5;
    [[897, 980, 'SPEAKERS  A  B'], [993, 1033, 'AUX OUT'], [1048, 1130, 'INSERT'], [1145, 1225, 'LINE INPUTS'], [1230, 1272, 'PHONO / LINE']].forEach(function (b) {
      g.strokeRect(P(b[0]), Q(478), P(b[1]) - P(b[0]), Q(553) - Q(478)); lbl(g, b[2], (P(b[0]) + P(b[1])) / 2, Q(556), 9);
    });
    lbl(g, 'USB HUB', P(860), Q(474), 9); lbl(g, 'USB-C', P(805), Q(492), 9); lbl(g, 'DC', P(773), Q(521), 9);
  });
  // TD-3 (TB-303 düzeni): plaka .301 x .161 m, düğme/tuş koordinatları Blender ile aynı
  var td3Tex = gtex(1204, 644, function (g, w, h) {
    var U = function (x) { return (x + 0.1505) / 0.301 * w; }, V = function (y) { return (0.0805 - y) / 0.161 * h; };
    g.fillStyle = '#1c1d20'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#cfd2d8'; g.lineWidth = 2; g.strokeRect(U(-0.147), V(0.078), U(0.147) - U(-0.147), V(-0.078) - V(0.078));
    label(g, 'TD-3', U(-0.14), V(0.074), 30, '#f0f0f0', 'left');
    label(g, 'ANALOG BASS LINE SYNTHESIZER', U(-0.09), V(0.074), 12, '#b9bcc2', 'left');
    ['TUNING', 'CUT OFF FREQ', 'RESONANCE', 'ENV MOD', 'DECAY', 'ACCENT'].forEach(function (t, i) { label(g, t, U(-0.124 + i * 0.026), V(0.05), 10, '#d9dbe0'); });
    ['SYNC', 'FILTER', 'TRACK'].forEach(function (t, i) { label(g, t, U(0.072 + i * 0.026), V(0.05), 10, '#d9dbe0'); });
    label(g, 'TEMPO', U(-0.122), V(0.012), 11, '#d9dbe0'); label(g, 'TRACK', U(-0.045), V(0.012), 11, '#d9dbe0');
    label(g, 'PATTERN', U(0.0), V(0.012), 11, '#d9dbe0'); label(g, 'VOLUME', U(0.125), V(0.012), 11, '#d9dbe0');
    label(g, 'MODE', U(-0.085), V(0.038), 9, '#9a9ea6'); label(g, 'WAVEFORM', U(0.085), V(0.038), 9, '#9a9ea6');
    g.save(); g.translate(U(0.052), V(0.03)); label(g, 'behringer', 0, 0, 22, '#f0f0f0'); g.restore();
    g.strokeStyle = '#d9dbe0'; g.beginPath(); g.arc(U(0.052), V(0.045), 12, 0, 7); g.stroke();
    g.fillStyle = '#d9dbe0'; g.fillRect(U(-0.147), V(-0.002), U(0.147) - U(-0.147), 6);
    ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'].forEach(function (t, i) { label(g, t, U(-0.06 + i * 0.0185), V(-0.062), 10, '#d9dbe0'); });
    ['PITCH MODE', 'TIME MODE', 'FUNCTION'].forEach(function (t, i) { label(g, t, U(-0.095), V(-0.018 - i * 0.017) - 14, 8, '#9a9ea6'); });
    label(g, 'RUN / STOP', U(-0.124), V(-0.064), 9, '#d9dbe0');
    ['DOWN', 'UP', 'ACCENT', 'SLIDE'].forEach(function (t, i) { label(g, t, U(0.095 + (i % 2) * 0.019), V(-0.02 - (i >> 1) * 0.026) - 16, 8, '#9a9ea6'); });
  });
  // MicroFreak: resmî ürün görselinin piksel düzeni (Blender'daki düğmelerle aynı koordinatlar), tuşlar düz dokunmatik
  var mfTex = gtex(1769, 1315, function (g, w, h) {
    var P = function (x) { return (x - 559.7) * 2; }, Q = function (y) { return (y - 278.7) * 2; };
    g.fillStyle = '#1f2024'; g.fillRect(0, 0, w, h);
    // modülasyon matrisi
    g.strokeStyle = '#7d8290'; g.lineWidth = 2;
    for (var c = 0; c < 8; c++) { var x = P(622 + c * 27); g.beginPath(); g.moveTo(x, Q(318)); g.lineTo(x, Q(382)); g.stroke(); g.beginPath(); g.moveTo(x, Q(318)); g.lineTo(x + 30, Q(298)); g.stroke(); }
    ['CycEnv', 'Env', 'LFO', 'Press', 'Key/Arp'].forEach(function (t, r) { var y = Q(335 + r * 11.5); lbl(g, t, P(612), y, 11, '#c9ccd2', 'right'); g.beginPath(); g.moveTo(P(616), y); g.lineTo(P(812), y); g.stroke(); });
    ['Pitch', 'Wave', 'Timbre', 'Cutoff', 'Assign1', 'Assign2', 'Assign3'].forEach(function (t, c) { g.save(); g.translate(P(634 + c * 27), Q(305)); g.rotate(-0.9); lbl(g, t, 0, 0, 11, '#e6e7ea'); g.restore(); });
    function sec(t, a, b, y) { g.strokeStyle = '#cfd2d8'; g.lineWidth = 2; g.beginPath(); g.moveTo(P(a), Q(y)); g.lineTo(P(b), Q(y)); g.stroke(); g.fillStyle = '#1f2024'; var tw = t.length * 12 + 20; g.fillRect((P(a) + P(b)) / 2 - tw / 2, Q(y) - 12, tw, 24); lbl(g, t, (P(a) + P(b)) / 2, Q(y), 17, '#f0f1f4'); }
    sec('DIGITAL OSCILLATOR', 662, 925, 406); sec('ANALOG FILTER', 932, 1117, 406); sec('CYCLING ENVELOPE', 1125, 1443, 406);
    sec('ARP / SEQ', 742, 925, 509); sec('LFO', 932, 1117, 509); sec('ENVELOPE', 1133, 1443, 509);
    g.fillStyle = '#0c0c0e'; g.fillRect(P(562), Q(512), P(670) - P(562), Q(594) - Q(512)); lbl(g, 'OCTAVE', P(616), Q(502), 17, '#f0f1f4');
    var L = [[863, 'Matrix'], [1021, 'Panel'], [1183, 'Preset'], [1255, 'Save'], [1320, 'Utility'], [1398, 'Master']];
    L.forEach(function (q) { lbl(g, q[1], P(q[0]), Q(377), 13, '#e6e7ea'); });
    g.strokeStyle = '#e6e7ea'; g.strokeRect(P(918), Q(364), P(972) - P(918), 22); lbl(g, 'Paraphonic', P(945), Q(371), 12, '#e6e7ea');
    [[606, 'Glide'], [697, 'Type'], [760, 'Wave'], [822, 'Timbre'], [884, 'Shape'], [945, 'Type'], [1021, 'Cutoff'], [1086, 'Resonance'], [1142, 'Mode'], [1216, 'Rise / Shape'], [1280, 'Fall / Shape'], [1345, 'Hold / Sustain'], [1410, 'Amount']].forEach(function (q) { lbl(g, q[1], P(q[0]), Q(480), 13, '#e6e7ea'); });
    [[699, 'Shift'], [761, 'Arp | Seq'], [808, 'Oct | Mod'], [884, 'Rate / Swing'], [959, 'Shape'], [1087, 'Rate'], [1157, 'Amp Mod'], [1217, 'Attack'], [1282, 'Decay / Rel'], [1347, 'Sustain'], [1411, 'Filter Amt']].forEach(function (q) { lbl(g, q[1], P(q[0]), Q(583), 13, '#e6e7ea'); });
    [['LPF', 430], ['BPF', 445], ['HPF', 460]].forEach(function (q, i) { lbl(g, q[0], P(985), Q(q[1]), 10, '#c9ccd2'); g.fillStyle = i === 1 ? '#7fdcff' : '#3a3d44'; g.beginPath(); g.arc(P(972), Q(q[1]), 4, 0, 7); g.fill(); });
    [['Env', 430], ['Run', 445], ['Loop', 460]].forEach(function (q, i) { lbl(g, q[0], P(1182), Q(q[1]), 10, '#c9ccd2'); g.fillStyle = i === 2 ? '#7fdcff' : '#3a3d44'; g.beginPath(); g.arc(P(1170), Q(q[1]), 4, 0, 7); g.fill(); });
    // mermer bant + ARTURIA
    var R = rng(33);
    g.save(); g.beginPath(); g.rect(0, Q(600), w, Q(640) - Q(600)); g.clip();
    g.fillStyle = '#111215'; g.fillRect(0, Q(600), w, Q(640) - Q(600));
    for (var k = 0; k < 160; k++) {
      g.strokeStyle = 'rgba(235,237,242,' + (0.25 + R() * 0.6) + ')'; g.lineWidth = 1.5 + R() * 4;
      var x0 = R() * w, y0 = Q(600) + R() * (Q(640) - Q(600)); g.beginPath(); g.moveTo(x0, y0);
      g.bezierCurveTo(x0 + 20 + R() * 30, y0 - 20 + R() * 40, x0 + 40 + R() * 30, y0 - 20 + R() * 40, x0 + 70 + R() * 30, y0 - 10 + R() * 20); g.stroke();
    }
    g.restore();
    g.fillStyle = '#111215'; g.fillRect(P(935), Q(605), P(1075) - P(935), Q(635) - Q(605));
    label(g, 'ARTURIA', P(1005), Q(620), 40, '#f4f4f4');
    // dokunmatik şerit: turuncu çerçeveli ikonlar + uzun zikzak
    g.fillStyle = '#18191c'; g.fillRect(0, Q(640), w, Q(688) - Q(640));
    g.strokeStyle = '#e8861e'; g.lineWidth = 3;
    [595, 646, 696, 746, 796, 872, 922, 972].forEach(function (x) { g.strokeRect(P(x) - 34, Q(644), 68, 76); g.beginPath(); g.moveTo(P(x) - 16, Q(670)); g.lineTo(P(x), Q(655)); g.lineTo(P(x) + 16, Q(670)); g.stroke(); });
    g.strokeRect(P(1040), Q(644), P(1410) - P(1040), 76);
    g.beginPath(); for (var z = 0; z < 12; z++) { var zx = P(1050) + z * 60; g.lineTo(zx, Q(z % 2 ? 650 : 678)); } g.stroke();
    // 25 düz dokunmatik tuş: turuncu noktalı beyaz, koyu noktalı siyah tuşlar
    var k0 = P(566), k1 = P(1362), ky0 = Q(690), ky1 = Q(942), kw = (k1 - k0) / 15;
    g.fillStyle = '#121214'; g.fillRect(k0 - 6, ky0, P(1445) - k0, ky1 - ky0);
    for (var i = 0; i < 15; i++) {
      var x1 = k0 + i * kw;
      g.fillStyle = '#f4f2ee'; g.fillRect(x1 + 3, ky0 + 2, kw - 6, ky1 - ky0 - 4);
      g.fillStyle = '#e9a06a';
      for (var yy = ky0 + 14; yy < ky1 - 10; yy += 13) for (var xx = x1 + 12; xx < x1 + kw - 10; xx += 13) g.fillRect(xx, yy, 7, 7);
    }
    [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].forEach(function (i) {
      var bx = k0 + (i + 1) * kw - kw * 0.32, bw = kw * 0.64, by = ky0, bh = (ky1 - ky0) * 0.52;
      g.fillStyle = '#2a1e18'; g.fillRect(bx, by, bw, bh);
      g.fillStyle = '#b8642c';
      for (var yy2 = by + 10; yy2 < by + bh - 8; yy2 += 13) for (var xx2 = bx + 8; xx2 < bx + bw - 8; xx2 += 13) g.fillRect(xx2, yy2, 6, 6);
    });
    g.fillStyle = '#f4f2ee'; g.fillRect(k1 + 4, ky0 + 2, P(1440) - k1 - 6, ky1 - ky0 - 4);
    g.fillStyle = '#e9a06a'; for (var yy3 = ky0 + 120; yy3 < ky1 - 10; yy3 += 13) for (var xx3 = k1 + 20; xx3 < P(1430); xx3 += 13) g.fillRect(xx3, yy3, 7, 7);
    label(g, 'MICRO', P(1391), Q(712), 24, '#e8761e'); label(g, 'FREAK', P(1391), Q(728), 24, '#e8761e');
  });
  var pushTex = gtex(2048, 1712, function (g, w, h) { g.fillStyle = '#141416'; g.fillRect(0, 0, w, h); });
  (function () {
    var im = new Image();
    im.onload = function () { var g = pushTex.userData.g; g.drawImage(im, 39, 32, 2000, 1671.66, 0, 0, 2048, 1712); pushTex.needsUpdate = true; };
    im.src = '/assets/img/push3-device.svg';
  })();
  // Logitech Craft tuş baskıları: konumlar Blender'ın yazdığı assets/models/craft-legends.json'dan (saydam, arka ışıklı)
  var craftTex = gtex(2048, 710, function (g, w, h) { g.clearRect(0, 0, w, h); });
  fetch('/assets/models/craft-legends.json?v=' + MODEL_V).then(function (r) { return r.json(); }).then(function (keys) {
    var g = craftTex.userData.g, w = 2048, h = 710;
    g.clearRect(0, 0, w, h);
    keys.forEach(function (k) {
      var t = k.t, px = t.length > 2 ? 15 : 22;
      g.fillStyle = 'rgba(236,246,240,.95)'; g.font = '600 ' + px + 'px "Instrument Sans", sans-serif';
      g.textBaseline = 'top'; g.textAlign = 'left';
      var x = k.x * w - k.w * w / 2 + 10, y = k.y * h - 30;
      if (t) g.fillText(t, x, y);
    });
    craftTex.needsUpdate = true;
  }).catch(function () {});
  // Tascam DR-05X ön paneli (resmî görsel pikselleri: gövde 462..586 x 300..577) ve LCD
  var drTex = gtex(600, 1263, function (g, w, h) {
    var U = function (px) { return (((px - 524) / 124 * 0.061) + 0.0285) / 0.057 * w; }, V = function (py) { return (0.06 - (438.5 - py) / 277 * 0.124) / 0.12 * h; };
    g.fillStyle = '#2b2c30'; g.fillRect(0, 0, w, h);
    label(g, 'TASCAM', U(524), V(311), 46, '#f2f2f2');
    label(g, 'PEAK', U(509), V(326), 16, '#c9ccd2'); label(g, 'REC', U(541), V(326), 16, '#c9ccd2');
    g.fillStyle = '#ff4a3a'; g.fillRect(U(503), V(332), 26, 8); g.fillRect(U(535), V(332), 26, 8);
    label(g, 'DR-05X', U(524), V(403), 34, '#f2f2f2');
    label(g, '⏻/ HOME', U(497), V(421), 15, '#c9ccd2'); label(g, 'RECORD', U(552), V(421), 15, '#c9ccd2');
    g.strokeStyle = '#55575d'; g.lineWidth = 3; g.beginPath(); g.arc(U(525), V(501), (U(565) - U(485)) / 2, 0, 7); g.stroke();
    label(g, 'MENU', U(500), V(478), 13, '#c9ccd2'); label(g, 'QUICK', U(550), V(478), 13, '#c9ccd2');
    label(g, 'PB CONT', U(500), V(526), 13, '#c9ccd2'); label(g, 'MARK', U(550), V(526), 13, '#c9ccd2');
    label(g, 'LINEAR PCM RECORDER', U(524), V(558), 20, '#e6e7ea');
  });
  var drLcdTex = gtex(512, 268, function (g, w, h) {
    g.fillStyle = '#b9d3ff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16233a'; g.font = '700 26px monospace'; g.textBaseline = 'top';
    g.fillText('■ STOP   00:25:19', 16, 14);
    for (var i = 0; i < 2; i++) { g.fillRect(16, 60 + i * 26, 300 + i * 40, 14); }
    g.font = '600 22px monospace'; g.fillText('-48 -30 -18 -12 -6  0dB', 16, 116);
    g.fillText('DR0000_0005.wav', 16, 160); g.fillText('WAV 16bit 44.1k', 16, 200);
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
    TEX_drum: { tex: drumTex }, TEX_fuse: { tex: fuseTex }, TEX_fuse_rear: { tex: fuseRearTex }, TEX_td3: { tex: td3Tex },
    TEX_mf: { tex: mfTex }, TEX_push: { tex: pushTex },
    TEX_craft: { tex: craftTex, alpha: true, emissive: 0.9 }, TEX_mbkeys: { tex: mbKeysTex, emissive: 0.4 },
    TEX_adam: { tex: adamTex }, TEX_mat: { tex: matTex }, TEX_dr: { tex: drTex }, TEX_drlcd: { tex: drLcdTex, emissive: 0.7 }
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
  // masa (Blender) + hazır modeller (CC BY, kaynaklar sayfada): PS5, DualSense, Grogu, MacBook
  var draco = new DRACOLoader(); draco.setDecoderPath('/assets/vendor/three/addons/libs/draco/gltf/');
  var gltf = new GLTFLoader(); gltf.setDRACOLoader(draco);
  function prep(root) {
    root.traverse(function (o) {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (Array.isArray(o.material)) o.material = o.material.map(swapMat); else o.material = swapMat(o.material);
    });
    return root;
  }
  function loadGlb(name, place) {
    return new Promise(function (resolve) {
      gltf.load('/assets/models/' + name + '.glb?v=' + MODEL_V, function (gl) {
        var r = prep(gl.scene); r.name = name;
        if (place) { r.rotation.order = 'YXZ'; place(r); }
        if (r.userData.sitOn != null) { r.updateMatrixWorld(true); var bb = new THREE.Box3().setFromObject(r); r.position.y += r.userData.sitOn - bb.min.y; }
        scene.add(r); resolve(true);
      }, undefined, function (e) { console.warn('[s3d] model yüklenemedi: ' + name, e); resolve(false); });
    });
  }
  var tvDraw = null, tvLast = -1, walkerTick = null, spin = null;
  // gezen kedi Fred: Fred – The Cat taramasına Somali Cat Animated'in (DreamNoms, CC BY) iskeleti ve animasyonları
  // aktarıldı (tools/studio3d/rig_fred.py). Odanın boş zemininde rastgele bir noktaya yürür, orada durur ya da oturup
  // bir süre bekler, sonra kalkıp başka yere gider. Model -z'ye bakar.
  (function () {
    var SC = 0.125, TS = 1.5, SPEED = 1.38 * SC * TS, PAD = 0.2;
    var BLOCK = [{ x0: -0.35, x1: 0.25, z0: -2.25, z1: -1.65 }]; // sandalye ayağı
    var walker = null, nodes = null;
    function free(x, z) {
      if (x < -2.72 || x > 2.72 || z < -2.92 || z > 2.92) return false;
      var L = obstacles.concat(BLOCK);
      for (var i = 0; i < L.length; i++) { var o = L[i]; if (x > o.x0 - PAD && x < o.x1 + PAD && z > o.z0 - PAD && z < o.z1 + PAD) return false; }
      return true;
    }
    function clear(a, b) {
      var n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.05);
      for (var i = 1; i < n; i++) if (!free(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n)) return false;
      return true;
    }
    function graph() {
      nodes = [];
      for (var x = -2.7; x <= 2.71; x += 0.3) for (var z = -2.9; z <= 2.91; z += 0.3) if (free(x, z)) nodes.push({ x: x, z: z, nb: [] });
      for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        if (Math.hypot(a.x - b.x, a.z - b.z) < 0.45 && clear(a, b)) { a.nb.push(j); b.nb.push(i); }
      }
    }
    function nearest(x, z) {
      var bi = 0, bd = 1e9;
      nodes.forEach(function (n, i) { var d = Math.hypot(n.x - x, n.z - z); if (d < bd && n.nb.length) { bd = d; bi = i; } });
      return bi;
    }
    function route(from) {
      // ulaşılabilen düğümlerden en az 1.5 m uzaktakine git; yolu düz görüşle kısalt
      var prev = {}, q = [from], seen = {}; seen[from] = 1;
      while (q.length) { var c = q.shift(); nodes[c].nb.forEach(function (n) { if (!seen[n]) { seen[n] = 1; prev[n] = c; q.push(n); } }); }
      var far = Object.keys(seen).map(Number).filter(function (i) { return Math.hypot(nodes[i].x - nodes[from].x, nodes[i].z - nodes[from].z) > 1.5; });
      if (!far.length) return [];
      var t = far[Math.floor(Math.random() * far.length)], p = [];
      while (t !== from && t != null) { p.unshift(nodes[t]); t = prev[t]; }
      var out = [], cur = { x: walker.root.position.x, z: walker.root.position.z }, k = 0;
      while (k < p.length) { var j = p.length - 1; while (j > k && !clear(cur, p[j])) j--; out.push(p[j]); cur = p[j]; k = j + 1; }
      return out;
    }
    function play(n) {
      var a = walker.A[n]; if (!a || walker.cur === a) return;
      a.reset().play();
      if (walker.cur) walker.cur.crossFadeTo(a, 0.35, false);
      walker.cur = a;
    }
    gltf.load('/assets/models/fred-walk.glb?v=' + MODEL_V, function (gl) {
      graph();
      var root = new THREE.Group(), body = gl.scene;
      body.scale.setScalar(SC); body.position.y = 1.62 * SC;
      body.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
      root.add(body); root.name = 'fred'; scene.add(root);
      var mixer = new THREE.AnimationMixer(body), A = {};
      gl.animations.forEach(function (c) { A[c.name] = mixer.clipAction(c); });
      ['SitDown', 'StandUp'].forEach(function (n) { if (A[n]) { A[n].setLoop(THREE.LoopOnce, 1); A[n].clampWhenFinished = true; } });
      var start = nodes.filter(function (n) { return n.nb.length > 2; });
      var s0 = start[Math.floor(Math.random() * start.length)];
      root.position.set(s0.x, 0, s0.z); root.rotation.y = Math.random() * 6.28;
      walker = { root: root, mixer: mixer, A: A, cur: null, state: 'idle', until: 2 + Math.random() * 3, path: [] };
      play('Idle');
    }, undefined, function (e) { console.warn('[s3d] kedi yüklenemedi', e); });
    var clock = 0;
    walkerTick = function (dt) {
      if (!walker) return;
      clock += dt; walker.mixer.update(dt);
      var w = walker, r = w.root;
      if (w.state === 'walk') {
        var p = w.path[0];
        if (!p) {
          w.state = Math.random() < 0.55 ? 'sitdown' : 'idle';
          w.until = clock + (w.state === 'idle' ? 2.5 + Math.random() * 4 : 1.5);
          play(w.state === 'idle' ? 'Idle' : 'SitDown');
          return;
        }
        var dx = p.x - r.position.x, dz = p.z - r.position.z, d = Math.hypot(dx, dz);
        if (d < 0.06) { w.path.shift(); return; }
        var diff = Math.atan2(-dx, -dz) - r.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        r.rotation.y += diff * Math.min(1, dt * 3.2);
        // dönerken yavaşlar; adım hızı yürüme hızına bağlı, ayak kaymaz
        var sp = SPEED * Math.max(0.2, Math.cos(Math.min(1.37, Math.abs(diff))));
        w.A.Walk.timeScale = TS * sp / SPEED;
        var step = Math.min(d, sp * dt);
        r.position.x -= Math.sin(r.rotation.y) * step; r.position.z -= Math.cos(r.rotation.y) * step;
        return;
      }
      if (clock < w.until) return;
      if (w.state === 'sitdown') { w.state = 'sit'; w.until = clock + 6 + Math.random() * 10; play('SittingIdle'); }
      else if (w.state === 'sit') { w.state = 'standup'; w.until = clock + 1.5; play('StandUp'); }
      else {
        w.path = route(nearest(r.position.x, r.position.z));
        if (w.path.length) { w.state = 'walk'; play('Walk'); } else { w.state = 'idle'; w.until = clock + 3; play('Idle'); }
      }
    };
    window.__s3dCat = function () { return walker; };
  })();
  // sahne masa yüklenince açılır; hazır modeller arkadan eklenir
  var ready = loadGlb('studio-desk');
  ready.then(function () {
    return Promise.all([
      loadGlb('ps5', function (r) { r.position.set(-0.6, DY, -3.06); r.rotation.y = 0.12; }),
      loadGlb('dualsense', function (r) { r.position.set(-0.44, DY, -2.59); r.rotation.y = -0.25; r.userData.sitOn = DY; }),
      loadGlb('grogu', function (r) { r.position.set(0.44, DY, -3.05); r.rotation.y = -0.3; }),
      // koleksiyon rafı (ön duvar; raf yüzü -z), plak masası (sol duvar), duvar tabloları
      loadGlb('db01', function (r) { r.position.set(0.34, 1.316, 2.96); r.rotation.y = Math.PI; r.userData.sitOn = 1.316; }),
      loadGlb('batman', function (r) { r.position.set(0.57, 1.316, 2.96); r.rotation.y = Math.PI; r.userData.sitOn = 1.316; }),
      loadGlb('avata', function (r) { r.position.set(1.2, 1.316, 2.96); r.userData.sitOn = 1.316; }),
      loadGlb('mando', function (r) { r.position.set(0.75, 1.316, 2.96); r.rotation.y = Math.PI; r.userData.sitOn = 1.316; }),
      loadGlb('avatadrone', function (r) { r.position.set(0.97, 1.316, 2.96); r.rotation.y = 0.26; r.userData.sitOn = 1.316; }),
      loadGlb('om5', function (r) { r.position.set(1.45, 1.316, 2.96); r.rotation.y = Math.PI; r.userData.sitOn = 1.316; }),
      loadGlb('recordrack', function (r) { r.position.set(-2.77, 0, 1.6); r.rotation.y = Math.PI / 2; r.userData.sitOn = 0; }),
      loadGlb('art', function (r) {
        // seçilen tablolar (tools/studio3d/tablolar.png numaraları): [x, y, z, ry]; düğüm orijini arka yüzün ortası
        var F = Math.PI, L = Math.PI / 2, Rw = -Math.PI / 2;
        var W = { art_14: [-2.998, 2.08, 0.45, L], art_15: [-2.998, 2.08, 1.6, L], art_18: [-2.998, 2.08, 2.75, L],
                  art_43: [-2.998, 1.27, 0.45, L], art_46: [-2.998, 1.27, 1.6, L], art_49: [-2.998, 1.27, 2.75, L],
                  art_10: [2.998, 1.6, -2.3, Rw], art_11: [2.998, 1.6, -1.75, Rw], art_12: [2.998, 1.6, -1.2, Rw], art_36: [2.998, 1.6, -0.65, Rw],
                  art_5: [1.98, 2.0, 3.198, F], art_25: [2.56, 2.0, 3.198, F], art_28: [1.98, 1.28, 3.198, F], art_31: [2.56, 1.28, 3.198, F],
                  art_58: [-2.55, 1.95, 3.198, F], art_53: [-2.55, 1.3, 3.198, F], art_44: [-0.76, 1.6, 3.198, F] };
        r.traverse(function (o) { var w = W[o.name]; if (w && o.isMesh || (w && o.children.length)) { o.position.set(w[0], w[1], w[2]); o.rotation.set(0, w[3], 0); } });
      }),
      loadGlb('djconsole', function (r) { r.position.set(-2.25, 0.9, -1.45); r.rotation.y = Math.PI / 2; r.userData.sitOn = 0.9; }),
      loadGlb('mxmaster', function (r) { r.position.set(0.22, DY, -2.62); r.rotation.order = 'YZX'; r.rotation.set(1.26, Math.PI / 2 + 0.12, 0.16); r.userData.sitOn = DY + 0.001; }),
      loadGlb('macbook', function (r) { r.position.set(1.0052, DY + 0.0637, -2.6446); r.rotation.y = -0.15;  /* standın eğimli yüzeyine, ön tırnakların arkasına oturur */ r.rotation.x = 0.244; })
    ]);
  });
  hot('s3d_t_push', -0.78, DY + 0.2, -2.53);
  hot('s3d_t_screen', -0.05, DY + 0.62, -3.06);
  hot('s3d_t_mon', -1.05, DY + 0.68, -2.98);
  hot('s3d_t_iface', -0.02, DY + 0.24, -2.9);
  hot('s3d_t_drum', -0.34, DY + 0.22, -2.86);
  hot('s3d_t_303', 0.27, DY + 0.1, -2.86);
  hot('s3d_t_synth', 0.62, DY + 0.2, -2.8);
  hot('s3d_t_laptop', 1.0, DY + 0.33, -2.61);
  hot('s3d_t_rec', 0.62, DY + 0.06, -2.42);
  hot('s3d_t_dj', -2.25, 1.08, -1.45);
  // AudioFuse yükselticisinin altındaki kırmızı ışık ve Grogu'nun yanındaki mumlar
  ledLight(-0.02, DY + 0.03, -2.92, 0.22, 1.0);
  box(0.26, 0.008, 0.008, ledMat(1.6), -0.02, DY + 0.02, -2.84, scene, false);
  var candleLight = new THREE.PointLight(0xffa040, 0.22, 1.2, 2); candleLight.position.set(0.62, DY + 0.1, -3.02); scene.add(candleLight);

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
  chair(-0.05, -1.95, 0.2, 0xd5352a);

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
    });
  }
  var frameMat = std(0xffffff, 0.5, 0, { map: woodTex });
  var photoSlots = [], photoMeshes = [], clickables = [];
  [0.0, 0.95, 1.9].forEach(function (z, i) {
    var g = grp(2.965, 1.58, z, -Math.PI / 2);
    box(0.62, 0.82, 0.03, frameMat, 0, 0, 0, g);
    var pm2 = new THREE.MeshStandardMaterial({ map: placeholder(i), roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.12 });
    pm2.emissiveMap = pm2.map;
    var pmesh = plane(0.54, 0.74, pm2, 0, 0, 0.0165, g);
    photoSlots.push(pm2); photoMeshes.push(pmesh);
  });
  // duvardaki çerçeveler: kapak + ad (CONFIG.photos: { src | art, title, sub, uri }); çerçeveye ya da etiketine tıklayınca Spotify'da çalar
  var FRAME_Z = [0.0, 0.95, 1.9];
  function frameArt(g, p, im) {
    g.fillStyle = '#0d0d10'; g.fillRect(0, 0, 600, 822);
    if (im) g.drawImage(im, 20, 20, 560, 560);
    else if (p.art === 'golden') {
      var gr = g.createLinearGradient(20, 20, 580, 580);
      gr.addColorStop(0, '#2a1a05'); gr.addColorStop(0.45, '#b8862b'); gr.addColorStop(0.7, '#f3d27a'); gr.addColorStop(1, '#5a3a0c');
      g.fillStyle = gr; g.fillRect(20, 20, 560, 560);
      g.strokeStyle = 'rgba(255,240,200,.55)'; g.lineWidth = 2;
      for (var r = 40; r < 300; r += 26) { g.beginPath(); g.arc(300, 300, r, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#1a1005'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '400 92px "Instrument Serif", serif'; g.fillText('Golden', 300, 270); g.fillText('Sound', 300, 360);
    }
    g.fillStyle = '#f2f2f2'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '400 54px "Instrument Serif", serif'; g.fillText(p.title || '', 300, 640);
    if (p.sub) { g.fillStyle = '#9a9ea6'; g.font = '500 24px "Instrument Sans", sans-serif'; g.fillText(p.sub, 300, 690); }
    g.fillStyle = '#1db954'; g.beginPath(); g.arc(196, 752, 20, 0, 7); g.fill();
    g.fillStyle = '#0d0d10'; g.beginPath(); g.moveTo(189, 741); g.lineTo(189, 763); g.lineTo(207, 752); g.closePath(); g.fill();
    g.fillStyle = '#cfd2d8'; g.font = '600 30px "Instrument Sans", sans-serif'; g.textAlign = 'left';
    g.fillText(`Tıkla, çalsın`, 228, 754);
  }
  (CONFIG.photos || []).forEach(function (p, i) {
    if (!photoSlots[i] || !p) return;
    var c = document.createElement('canvas'); c.width = 600; c.height = 822;
    var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    var cover = null;
    function paint() { frameArt(c.getContext('2d'), p, cover); tx.needsUpdate = true; }
    paint();
    if (p.src) { var im = new Image(); im.onload = function () { cover = im; paint(); }; im.src = p.src; }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
    photoSlots[i].map = tx; photoSlots[i].emissiveMap = tx; photoSlots[i].emissiveIntensity = 0.22; photoSlots[i].needsUpdate = true;
    if (p.uri) {
      hotspots.push({ text: p.title, spotify: p.uri, pos: new THREE.Vector3(2.9, 1.12, FRAME_Z[i]) });
      clickables.push({ mesh: photoMeshes[i], uri: p.uri, title: p.title });
    }
  });

  // oluklu vinil yüzü (plak rafı ve pikap ortak kullanır)
  function grooveTexFor(title, sub, label) {
    return ctex(512, 512, function (c, w, h) {
      c.fillStyle = '#060607'; c.fillRect(0, 0, w, h);
      var r = rng(5);
      for (var rad = 70; rad < 252; rad += 1.1) { c.strokeStyle = 'rgba(255,255,255,' + (0.06 + r() * 0.1) + ')'; c.lineWidth = 0.6; c.beginPath(); c.arc(256, 256, rad, 0, 7); c.stroke(); }
      [130, 168, 205].forEach(function (rad) { c.strokeStyle = '#000'; c.lineWidth = 2.5; c.beginPath(); c.arc(256, 256, rad, 0, 7); c.stroke(); });
      c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 3; c.beginPath(); c.arc(256, 256, 251, 0, 7); c.stroke();
      c.fillStyle = label; c.beginPath(); c.arc(256, 256, 58, 0, 7); c.fill();
      c.fillStyle = '#1a1005'; c.textAlign = 'center'; c.font = '600 13px "Instrument Sans", sans-serif'; c.fillText(title, 256, 236);
      c.font = '400 10px "Instrument Sans", sans-serif'; c.fillText(sub, 256, 286);
      c.fillStyle = '#060607'; c.beginPath(); c.arc(256, 256, 4, 0, 7); c.fill();
    });
  }

  // ön duvar: plak rafı (raf yüzü -z, odaya bakar). Alt üç kat 4'er hücre; 31.5 cm LP kılıfları sırtı öne dönük dik durur,
  // yarım dolu hücrelerde son plaklar yana yaslanır, bir hücrede yatay yığın, ikisinde kapağı öne dönük plak; rafın üstünde
  // duvara yaslı kapak ve kılıfından yarı çıkmış plak.
  (function () {
    var g = grp(0.6, 0, 2.98, Math.PI);
    var wood = std(0xffffff, 0.5, 0, { map: woodTex });
    box(0.04, 2.1, 0.4, wood, -1.0, 1.05, 0, g); box(0.04, 2.1, 0.4, wood, 1.0, 1.05, 0, g);
    for (var s = 0; s < 6; s++) box(2.0, 0.03, 0.4, wood, 0, 0.1 + s * 0.4, 0, g);
    for (var lv = 0; lv < 3; lv++) [-0.49, 0, 0.49].forEach(function (x) { box(0.03, 0.37, 0.4, wood, x, 0.3 + lv * 0.4, 0, g); });

    // sırt atlası: 256 şerit (16 x 512 px), her biri bir kılıf sırtı (zemin rengi + dikey yazı + katalog no)
    var R = rng(77);
    var COLS = ['#111113', '#141416', '#1c1c1f', '#efe9dc', '#f4f1ea', '#d9d2c3', '#5a5a5e', '#8a8a8e', '#a07b52', '#6b4a2e',
                '#9c2a22', '#c43a2c', '#1f2f4f', '#2a4a7a', '#c99a2e', '#1f6b62', '#d0662a', '#3d5a2a', '#4b2a5a', '#c76a8a'];
    var WORDS = ['NIGHT', 'SIGNAL', 'DUB', 'ECHO', 'ACID', 'DEEP', 'HOUSE', 'TAPE', 'VOL. 2', 'NOIR', 'LOOP', 'MOON', 'DRIFT', 'GOLD', 'RAVE',
                 'SOUL', 'JAZZ', 'MODE', 'PULSE', 'ORBIT', 'LIVE', 'DUST', 'BLUE', 'NOVA', 'SESSIONS', 'RIDDIM', 'SKY', 'TIDE', 'LP', 'EP'];
    var atlas = ctex(2048, 1024, function (c, w, h) {
      var r = rng(301);
      for (var k = 0; k < 256; k++) {
        var x = (k % 128) * 16, y = Math.floor(k / 128) * 512;
        var bg = COLS[Math.floor(r() * COLS.length)];
        c.fillStyle = bg; c.fillRect(x, y, 16, 512);
        var light = /^#[c-f]/i.test(bg) || bg === '#a07b52';
        var ink = light ? '#1a1a1a' : (r() < 0.3 ? '#e8c46a' : '#f2f0ea');
        if (r() < 0.35) { c.fillStyle = ink; c.globalAlpha = 0.85; c.fillRect(x, y + 20 + r() * 40, 16, 6 + r() * 10); c.globalAlpha = 1; }
        c.save(); c.translate(x + 11.5, y + 492); c.rotate(-Math.PI / 2);
        c.fillStyle = ink; c.font = (r() < 0.5 ? '700 ' : '500 ') + (9 + Math.floor(r() * 3)) + 'px "Instrument Sans", sans-serif';
        var t = WORDS[Math.floor(r() * WORDS.length)] + (r() < 0.6 ? ' · ' + WORDS[Math.floor(r() * WORDS.length)] : '');
        c.fillText(t, 70, 0);
        c.font = '400 7px monospace'; c.globalAlpha = 0.7; c.fillText('BE-' + (100 + k), 4, 0); c.globalAlpha = 1;
        c.restore();
      }
    });
    atlas.anisotropy = 16;
    var base = new THREE.BoxGeometry(1, 1, 1), parts = [];
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
    function rec(th, x, y, z, rz, ry, flat) {
      var gm = base.clone(), uv = gm.attributes.uv, k = Math.floor(R() * 256);
      var u0 = (k % 128) * 16 / 2048, u1 = u0 + 16 / 2048, v1 = 1 - Math.floor(k / 128) * 0.5, v0 = v1 - 0.5;
      for (var i = 0; i < uv.count; i++) {
        if (i >= 16 && i < 20) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
        else uv.setXY(i, (u0 + u1) / 2, v0 + 0.004);
      }
      sv.set(th, 0.315, 0.315); pv.set(x, y, z);
      q.setFromEuler(e3.set(0, ry || 0, (rz || 0) + (flat ? Math.PI / 2 : 0)));
      gm.applyMatrix4(m4.compose(pv, q, sv)); parts.push(gm);
    }
    function thick() { var r = R(); return r < 0.01 ? 0.024 : r < 0.1 ? 0.007 + R() * 0.004 : 0.0032 + R() * 0.0022; }
    var CELLS = [[-0.98, -0.505], [-0.475, -0.015], [0.015, 0.475], [0.505, 0.98]];
    var ZC = 0.2 - 0.025 - 0.1575, H2 = 0.1575;
    // hücre içeriği: 'full' | 'lean' (yarım + yaslananlar) | 'stack' (yatay yığın) | 'face' (önde kapak)
    var PLAN = [['full', 'lean', 'full', 'full'], ['full', 'face', 'full', 'stack'], ['lean', 'full', 'face', 'full']];
    var faces = [];
    PLAN.forEach(function (row, lv) {
      var y0 = 0.1 + lv * 0.4 + 0.015;
      row.forEach(function (kind, ci) {
        var x0 = CELLS[ci][0], x1 = CELLS[ci][1], x = x0 + 0.002;
        if (kind === 'stack') {
          var yy = y0, n = 6 + Math.floor(R() * 4);
          for (var i = 0; i < n; i++) { var t = thick(); rec(t, (x0 + x1) / 2 + (R() - 0.5) * 0.02, yy + t / 2, ZC + (R() - 0.5) * 0.02, 0, (R() - 0.5) * 0.08, true); yy += t + 0.0004; }
          return;
        }
        var stop = kind === 'lean' ? x0 + (x1 - x0) * (0.45 + R() * 0.2) : x1 - 0.004;
        while (true) {
          var t = thick(); if (x + t > stop) break;
          rec(t, x + t / 2, y0 + H2 + (R() - 0.5) * 0.002, ZC + (R() - 0.5) * 0.008, 0, (R() - 0.5) * 0.01);
          x += t + 0.0003;
        }
        if (kind === 'lean') {
          // son plaklar dik duranlara yaslanır: alt kenar sabit, üst kenar sola yatık
          var a = 0.16 + R() * 0.1, px = x + 0.315 * Math.sin(a) * 0.98;
          for (var j = 0; j < 9 && px < x1 - 0.01; j++) {
            var tl = thick();
            rec(tl, px - Math.sin(a) * H2 + Math.cos(a) * tl / 2, y0 + Math.cos(a) * H2 + Math.sin(a) * tl / 2, ZC + (R() - 0.5) * 0.008, a, 0);
            px += tl / Math.cos(a) + 0.0004;
          }
        }
        if (kind === 'face') faces.push([(x0 + x1) / 2, y0]);
      });
    });
    var recMesh = new THREE.Mesh(mergeGeometries(parts), std(0xffffff, 0.72, 0, { map: atlas }));
    recMesh.castShadow = true; recMesh.receiveShadow = true; g.add(recMesh);

    // kapaklar: CONFIG.photos kapakları (With You, Golden Sound, Can't Sleep)
    var edge = std(0x141414, 0.7);
    function coverMat(p) {
      var c = document.createElement('canvas'); c.width = c.height = 512;
      var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      var cx = c.getContext('2d');
      function paint(im) {
        if (im) cx.drawImage(im, 0, 0, 512, 512);
        else {
          var gr = cx.createLinearGradient(0, 0, 512, 512);
          gr.addColorStop(0, '#2a1a05'); gr.addColorStop(0.45, '#b8862b'); gr.addColorStop(0.7, '#f3d27a'); gr.addColorStop(1, '#5a3a0c');
          cx.fillStyle = gr; cx.fillRect(0, 0, 512, 512);
          cx.strokeStyle = 'rgba(255,240,200,.55)'; cx.lineWidth = 2;
          for (var r = 24; r < 260; r += 22) { cx.beginPath(); cx.arc(256, 256, r, 0, 7); cx.stroke(); }
          cx.fillStyle = '#1a1005'; cx.textAlign = 'center'; cx.font = '400 84px "Instrument Serif", serif';
          cx.fillText('Golden', 256, 236); cx.fillText('Sound', 256, 318);
        }
        tx.needsUpdate = true;
      }
      paint(null);
      if (p && p.src) { var im = new Image(); im.onload = function () { paint(im); }; im.src = p.src; }
      else if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { paint(null); });
      return [edge, edge, edge, edge, std(0xffffff, 0.55, 0, { map: tx }), edge];
    }
    var ph = CONFIG.photos || [];
    function pick(fn) { return ph.filter(fn)[0]; }
    var covers = [pick(function (p) { return p.src && /with-you/.test(p.src); }), pick(function (p) { return p.art === 'golden'; })];
    faces.forEach(function (f, i) {
      var cm = new THREE.Mesh(new THREE.BoxGeometry(0.315, 0.315, 0.004), coverMat(covers[i]));
      cm.position.set(f[0], f[1] + 0.1575 * Math.cos(0.05), 0.186); cm.rotation.x = -0.05;
      cm.castShadow = true; g.add(cm);
    });

    // plak: oluklu siyah vinil + orta etiket
    var grooveTex = grooveTexFor(`CAN'T SLEEP`, 'MARSIAS · BERKAEL', '#c8962e');
    var vinylFace = std(0xffffff, 0.26, 0, { map: grooveTex, envMapIntensity: 1.6 });
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.1505, 0.1505, 0.0016, 96), [std(0x050506, 0.4), vinylFace, vinylFace]);
    disc.rotation.x = Math.PI / 2; disc.castShadow = true;

    // 3. kat: duvara yaslı Can't Sleep kapağı, plak kılıftan yana doğru yarı çıkmış
    var tilt = -0.27;
    var lean = new THREE.Group(); lean.position.set(0.8, 1.315, -0.1); lean.rotation.x = tilt; g.add(lean);
    var sl = new THREE.Mesh(new THREE.BoxGeometry(0.315, 0.315, 0.004), coverMat(pick(function (p) { return p.src && /cant-sleep/.test(p.src); })));
    sl.position.set(0, 0.1575, 0); sl.castShadow = true; lean.add(sl);
    disc.position.set(-0.17, 0.1575, -0.004); lean.add(disc);

    // 4. kat: açıklığı dolduran geniş ekran (1.88 x 0.3525 m = yan yana üç 16:9). Sitenin ana sayfası üç sütunda yavaşça kayar
    // (assets/img/studio/tv: canlı sayfanın ardışık ekranları); tıklayınca ana sayfa açılır.
    var tv = new THREE.Group(); tv.position.set(0, 1.715, 0.08); g.add(tv);
    var tvBlack = std(0x0b0b0c, 0.35, 0.2);
    rbox(1.92, 0.366, 0.03, 0.006, tvBlack, 0, 0.184, 0, tv);
    var TW = 2048, TH = 384, CW = TW / 3;
    var tvC = document.createElement('canvas'); tvC.width = TW; tvC.height = TH;
    var tvX = tvC.getContext('2d'); tvX.fillStyle = '#0b0b0e'; tvX.fillRect(0, 0, TW, TH);
    var tvTex = new THREE.CanvasTexture(tvC); tvTex.colorSpace = THREE.SRGBColorSpace; tvTex.anisotropy = 8;
    var tvScreen = plane(1.88, 0.3525, new THREE.MeshBasicMaterial({ map: tvTex, color: 0xcfcfcf }), 0, 0.184, 0.0155, tv);
    var tvImgs = [], TV_N = 7;
    for (var ti = 0; ti < TV_N; ti++) { var im = new Image(); im.src = '/assets/img/studio/tv/home-' + ti + '.jpg?v=' + MODEL_V; tvImgs.push(im); }
    var tvGlow = new THREE.PointLight(0x9fb0ff, 0.3, 2.2, 2); tvGlow.position.set(0.6, 1.9, 2.6); scene.add(tvGlow);
    clickables.push({ mesh: tvScreen, href: '/' });
    tvDraw = function (t) {
      // sütun c, sayfanın k+c. ekranını gösterir; 3 sn durur, 1.6 sn'de hepsi birer ekran aşağı kayar
      var cyc = 4.6, k = Math.floor(t / cyc), f = Math.max(0, (t % cyc) - 3) / 1.6;
      f = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      for (var c = 0; c < 3; c++) {
        var a = tvImgs[(k + c) % TV_N], b = tvImgs[(k + c + 1) % TV_N], x = c * CW;
        if (!a.complete || !a.naturalWidth) continue;
        tvX.save(); tvX.beginPath(); tvX.rect(x, 0, CW, TH); tvX.clip();
        tvX.drawImage(a, x, -f * TH, CW, TH);
        if (f > 0 && b.complete) tvX.drawImage(b, x, TH - f * TH, CW, TH);
        tvX.restore();
        if (c) { tvX.fillStyle = '#000'; tvX.fillRect(x - 2, 0, 4, TH); }
      }
      tvTex.needsUpdate = true;
    };
    obst(-0.45, 1.65, 2.75, 3.2);
  })();

  // sağ duvar, posterlerin altı: konsol masası + pikap (33⅓ devirde döner; plağa tıklayınca Golden Sound çalar)
  (function () {
    var g = grp(2.75, 0, -1.85, -Math.PI / 2);
    var wood = std(0xffffff, 0.5, 0, { map: woodTex }), metal = std(0x18181a, 0.4, 0.6);
    rbox(1.2, 0.035, 0.42, 0.006, wood, 0, 0.7025, 0, g);
    [[-0.57, -0.18], [0.57, -0.18], [-0.57, 0.18], [0.57, 0.18]].forEach(function (p) { box(0.025, 0.685, 0.025, metal, p[0], 0.3425, p[1], g); });
    rbox(1.14, 0.02, 0.38, 0.004, wood, 0, 0.22, 0, g);
    // alt rafta yatay plak yığını ve dik duran birkaç plak
    var R = rng(41), cols = [0x111113, 0xefe9dc, 0x9c2a22, 0x1f2f4f, 0xc99a2e, 0x5a5a5e];
    for (var i = 0, y = 0.23; i < 7; i++, y += 0.0045) {
      var r = box(0.315, 0.004, 0.315, std(cols[i % cols.length], 0.7), -0.33 + (R() - 0.5) * 0.015, y + 0.002, (R() - 0.5) * 0.015, g);
      r.rotation.y = (R() - 0.5) * 0.1;
    }
    for (var j = 0; j < 9; j++) box(0.004, 0.315, 0.315, std(cols[Math.floor(R() * cols.length)], 0.7), 0.15 + j * 0.006, 0.23 + 0.1575, 0, g);

    // pikap: gövde, ayaklar, tabla, plak, iğne kolu, düğmeler
    var tt = new THREE.Group(); tt.position.set(-0.08, 0.72, 0); g.add(tt);
    var body = std(0x111113, 0.3, 0.3), alu = std(0xc8c8cc, 0.28, 1), dark = std(0x070708, 0.5);
    [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]].forEach(function (p) { cyl(0.025, 0.028, 0.016, alu, p[0], 0.008, p[1], tt, 20); });
    rbox(0.45, 0.085, 0.355, 0.008, body, 0, 0.0585, 0, tt);
    var TOP = 0.101;
    var rot = new THREE.Group(); rot.position.set(-0.07, TOP, 0.005); tt.add(rot);
    cyl(0.153, 0.153, 0.026, alu, 0, 0.013, 0, rot, 72);
    var vt = grooveTexFor('GOLDEN SOUND', 'BERKAY ER', '#e0b04a');
    var vf = std(0xffffff, 0.26, 0, { map: vt, envMapIntensity: 1.6 });
    var platter = mesh(new THREE.CylinderGeometry(0.1505, 0.1505, 0.0018, 96), [std(0x050506, 0.4), vf, vf], 0, 0.027, 0, rot);
    cyl(0.0035, 0.0035, 0.018, alu, 0, 0.035, 0, rot, 10);
    // iğne kolu: pivot sağ arkada, kafa plağın dış oluklarında
    var arm = new THREE.Group(); arm.position.set(0.15, TOP, -0.11); tt.add(arm);
    cyl(0.028, 0.03, 0.03, alu, 0, 0.015, 0, arm, 28);
    cyl(0.012, 0.012, 0.03, dark, 0, 0.045, 0, arm, 16);
    var tip = new THREE.Vector3(-0.07 - 0.15 + 0.115 * Math.cos(2.2), 0, 0.005 + 0.11 + 0.115 * Math.sin(2.2));
    var len = Math.hypot(tip.x, tip.z), ang = Math.atan2(tip.x, tip.z);
    var beam = new THREE.Group(); beam.position.set(0, 0.055, 0); beam.rotation.y = ang; arm.add(beam);
    var tube = cyl(0.0035, 0.0035, len, alu, 0, -0.012, len / 2, beam, 10); tube.rotation.x = Math.PI / 2 - 0.05;
    box(0.016, 0.008, 0.03, dark, 0, -0.026, len, beam);
    var cw = cyl(0.016, 0.016, 0.035, dark, 0, 0.001, -0.045, beam, 20); cw.rotation.x = Math.PI / 2;
    cyl(0.006, 0.006, 0.05, alu, 0.06, 0.025, -0.06, arm, 10);
    box(0.06, 0.006, 0.012, alu, 0.17, TOP + 0.003, 0.12, tt);
    cyl(0.018, 0.018, 0.006, alu, -0.18, TOP + 0.003, 0.14, tt, 20);
    [-0.135, -0.105].forEach(function (x) { box(0.022, 0.005, 0.012, dark, x, TOP + 0.0025, 0.155, tt); });
    var ph = (CONFIG.photos || []).filter(function (p) { return p.art === 'golden'; })[0];
    if (ph && ph.uri) clickables.push({ mesh: platter, uri: ph.uri, title: ph.title });
    spin = function (dt) { rot.rotation.y -= 3.49 * dt; };
    obst(2.5, 3.0, -2.5, -1.2);
  })();

  // sehpa: Hasselblad 500C/M (kendi modelimiz): krom gövde, siyah deri, 80 mm Planar, bel hizası vizör, A12 film kartuşu
  (function () {
    var g = grp(1.74, 0.42, 1.0, -2.2);
    var chrome = std(0xd6d6d8, 0.22, 1), leather = std(0x121212, 0.85), black = std(0x0a0a0b, 0.45, 0.2);
    rbox(0.088, 0.088, 0.072, 0.004, chrome, 0, 0.044, 0, g);
    [0.0365, -0.0365].forEach(function (x) { box(0.002, 0.07, 0.06, leather, x * 1.24, 0.044, 0, g); });
    rbox(0.09, 0.09, 0.04, 0.004, chrome, 0, 0.045, -0.056, g);
    box(0.08, 0.08, 0.002, leather, 0, 0.045, -0.077, g);
    [-1, 1].forEach(function (s) { box(0.002, 0.075, 0.032, leather, s * 0.0455, 0.045, -0.056, g); });
    rbox(0.07, 0.03, 0.07, 0.003, black, 0, 0.103, -0.004, g);
    box(0.066, 0.002, 0.066, chrome, 0, 0.119, -0.004, g);
    var L = new THREE.Group(); L.position.set(0, 0.046, 0.036); L.rotation.x = Math.PI / 2; g.add(L);
    cyl(0.036, 0.036, 0.012, chrome, 0, 0.006, 0, L, 40);
    cyl(0.034, 0.034, 0.022, black, 0, 0.023, 0, L, 40);
    for (var i = 0; i < 24; i++) { var a = i / 24 * Math.PI * 2; box(0.003, 0.02, 0.003, chrome, Math.cos(a) * 0.0345, 0.023, Math.sin(a) * 0.0345, L).rotation.y = -a; }
    cyl(0.033, 0.033, 0.016, chrome, 0, 0.042, 0, L, 40);
    cyl(0.031, 0.031, 0.014, black, 0, 0.057, 0, L, 40);
    var glass = new THREE.Mesh(new THREE.CircleGeometry(0.024, 32), std(0x0a1830, 0.05, 0.8));
    glass.position.set(0, 0.0645, 0); glass.rotation.x = -Math.PI / 2; L.add(glass);
    var knob = cyl(0.022, 0.022, 0.014, chrome, 0.051, 0.05, -0.004, g, 30); knob.rotation.z = Math.PI / 2;
    cyl(0.005, 0.005, 0.01, chrome, 0.03, 0.075, 0.038, g, 12).rotation.x = Math.PI / 2;
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
  var lastT = 0;
  function update(t, cam) {
    if (walkerTick) walkerTick(Math.min(0.05, t - lastT));
    if (spin) spin(t - lastT);
    lastT = t;
    if (tvDraw && t - tvLast > 1 / 30) { tvLast = t; tvDraw(t); }
    if (t - lastTex > 0.1) {
      lastTex = t;
      redraw(screenTex, t); redraw(miniTex, t);
    }
    var pulse = 0.94 + Math.sin(t * 1.7) * 0.06;
    strip.color.set(LED[ledKey]).multiplyScalar(1.6 * pulse);
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

  return { scene: scene, ready: ready, clickables: clickables, update: update, setLed: setLed, hotspots: hotspots, obstacles: obstacles, spot: spot };
}
