// Berkeal Studio Room 3D — sahne kurulumu. Metre cinsinden; oda x:[-3,3], z:[-3.2,3.2], tavan 2.8.
// Masa arka duvara dayalı (z=-3.2), kamera varsayılan olarak girişten (z>0) masaya bakar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
    white: std(0xe9e7e2, 0.4, 0.05),
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
  [-0.85, 0, 0.85].forEach(function (x, i) { panel(x, 1.62, 0.8, 0.85, i); });
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
  scene.add(new THREE.AmbientLight(0x2a2e44, 1.15));
  scene.add(new THREE.HemisphereLight(0x4a5478, 0x1a1210, 0.7));

  var spot = new THREE.SpotLight(0xffd9ac, 8, 9, 0.62, 0.85, 2);
  spot.position.set(0, 2.6, -1.1);
  spot.target.position.set(0, 0.8, -2.75);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0004;
  spot.shadow.normalBias = 0.02;
  scene.add(spot, spot.target);

  function ledLight(x, y, z, i, d) {
    var l = new THREE.PointLight(LED.red, i, d, 2);
    l.position.set(x, y, z); scene.add(l); ledLights.push(l); return l;
  }
  ledLight(0, 0.5, -3.05, 3.2, 5);
  ledLight(0, 1.45, -3.08, 2.2, 4.5);
  ledLight(-1.4, 0.35, -2.0, 1.4, 3);
  var screenSpill = new THREE.PointLight(0xcfe0ff, 1.0, 2.6, 2); screenSpill.position.set(0.05, 1.08, -2.5); scene.add(screenSpill);
  var pushGlow = new THREE.PointLight(0xff8a30, 0.8, 1.3, 2); pushGlow.position.set(-0.68, 1.0, -2.55); scene.add(pushGlow);
  var lamp = new THREE.PointLight(0xffb070, 6, 7, 2); lamp.position.set(2.5, 1.62, 2.4); scene.add(lamp);
  var shelfLight = new THREE.PointLight(0xffc890, 4, 4.5, 2); shelfLight.position.set(-2.1, 1.9, 1.6); scene.add(shelfLight);
  var fill = new THREE.PointLight(0x5a70ff, 6, 10, 2); fill.position.set(0, 2.45, 1.2); scene.add(fill);

  // LED şeritleri
  var strip = ledMat(3.0);
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
  neonMat.userData.boost = 2.2; ledMats.push(neonMat);
  plane(1.9, 0.475, neonMat, 0, 2.36, -3.18);
  if (document.fonts && document.fonts.load) document.fonts.load('700 86px "Space Mono"').then(function () { redraw(neonTex, 0); });

  // ---------- masa (L)
  var deskMat = new THREE.MeshPhysicalMaterial({ color: 0xb4b2ae, roughness: 0.52, metalness: 0.0, clearcoat: 0.08, clearcoatRoughness: 0.5 });
  var legMat = std(0x0c0c0e, 0.5, 0.5);
  rbox(2.5, 0.04, 1.0, 0.012, deskMat, 0, 0.74, -2.7);
  rbox(0.75, 0.04, 1.1, 0.012, deskMat, 0.875, 0.74, -1.65);
  box(0.05, 0.72, 0.9, legMat, -1.2, 0.36, -2.7);
  box(0.05, 0.72, 0.9, legMat, 1.2, 0.36, -2.7);
  box(0.65, 0.72, 0.05, legMat, 0.875, 0.36, -1.15);
  box(2.4, 0.3, 0.02, legMat, 0, 0.52, -3.12);
  obst(-1.3, 1.3, -3.2, -2.2); obst(0.45, 1.3, -2.2, -1.1);

  // masa matı (turuncu/sarı/kırmızı ışın deseni)
  var matTex = ctex(1024, 420, function (g, w, h) {
    var cols = ['#e8601c', '#f2b01e', '#c0281c', '#f08a1e'];
    g.fillStyle = '#e8601c'; g.fillRect(0, 0, w, h);
    var cx = w * 0.18, cy = h * 0.5, R = rng(3);
    for (var i = 0; i < 38; i++) {
      var a0 = (i / 38) * Math.PI * 2, a1 = a0 + Math.PI * 2 / 38 * 0.6;
      g.fillStyle = cols[i % 4];
      g.beginPath(); g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a0) * w * 2, cy + Math.sin(a0) * w * 2);
      g.lineTo(cx + Math.cos(a1) * w * 2, cy + Math.sin(a1) * w * 2);
      g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(20,6,2,.82)';
    for (var s = 0; s < 9; s++) {
      var bx = cx - 60 + s * 16, by = cy + 40;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 20 + R() * 40, by - 140 - R() * 90); g.lineTo(bx + 34, by); g.closePath(); g.fill();
    }
    g.fillStyle = '#18090a'; g.fillRect(0, h - 18, w, 18);
  });
  var deskMatMesh = plane(0.95, 0.39, std(0xffffff, 0.9, 0, { map: matTex }), -0.02, DY + 0.003, -2.5);
  deskMatMesh.rotation.x = -Math.PI / 2;

  // ---------- Ableton ekranı
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
          g.fillStyle = '#ef5b43'; g.fillRect(x, y, cw - pad, chh - pad);
          var p = ((t * 0.35 + c * 0.17) % 1);
          if (r === 1 + (c % 3)) { g.fillStyle = '#ffb09f'; g.fillRect(x, y, (cw - pad) * p, chh - pad); }
          g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + 6, y + chh * 0.28); g.lineTo(x + 6, y + chh * 0.62); g.lineTo(x + 16, y + chh * 0.45); g.fill();
        } else {
          g.fillStyle = '#bdbdc3'; g.fillRect(x, y, cw - pad, chh - pad);
        }
      }
    }
    for (var s = 0; s < rows; s++) {
      g.fillStyle = '#b0b0b6'; g.fillRect(gx + cols * cw + 4, gy + h * 0.055 + s * chh, w * 0.035, chh - pad);
      g.fillStyle = '#666'; g.beginPath(); g.moveTo(gx + cols * cw + 12, gy + h * 0.055 + s * chh + chh * 0.28); g.lineTo(gx + cols * cw + 12, gy + h * 0.055 + s * chh + chh * 0.62); g.lineTo(gx + cols * cw + 22, gy + h * 0.055 + s * chh + chh * 0.45); g.fill();
    }
    g.fillStyle = '#d9d9dc'; g.fillRect(w * 0.85, h * 0.055, w * 0.15, h * 0.745);
    for (var q = 0; q < 10; q++) { g.fillStyle = '#b3b3b9'; g.fillRect(w * 0.865, h * (0.09 + q * 0.06), w * 0.1, h * 0.025); }
    g.fillStyle = '#e0e0e3'; g.fillRect(0, h * 0.8, w, h * 0.2);
    g.fillStyle = '#efe9db'; g.fillRect(w * 0.22, h * 0.82, w * 0.26, h * 0.16);
    g.fillStyle = '#3f9be6'; g.beginPath();
    for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3 + Math.PI / 6; var px = w * 0.35 + Math.cos(a) * h * 0.06, py = h * 0.9 + Math.sin(a) * h * 0.06; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath(); g.fill();
    g.fillStyle = '#d9d2c0';
    [0.25, 0.28, 0.42, 0.45].forEach(function (kx, ki) { g.beginPath(); g.arc(w * kx, h * (ki % 2 ? 0.94 : 0.86), h * 0.018, 0, 7); g.fill(); });
    g.fillStyle = '#555'; g.font = '700 ' + Math.round(h * 0.022) + 'px sans-serif'; g.fillText('RAUM', w * 0.325, h * 0.975);
  }
  var screenTex = ctex(1280, 720, drawLive);
  var miniTex = ctex(640, 400, drawLive);
  var screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, color: new THREE.Color(1.7, 1.7, 1.7) });
  var miniMat = new THREE.MeshBasicMaterial({ map: miniTex, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) });

  // 27" monitör
  (function () {
    var g = grp(0.05, DY, -3.0, 0);
    rbox(0.26, 0.016, 0.19, 0.006, M.graphite, 0, 0.008, 0.02, g);
    box(0.045, 0.22, 0.02, M.graphite, 0, 0.12, -0.015, g);
    rbox(0.67, 0.39, 0.026, 0.01, M.black, 0, 0.31, -0.005, g);
    var s = new THREE.Mesh(new THREE.PlaneGeometry(0.645, 0.363), screenMat);
    s.position.set(0, 0.31, 0.0085); g.add(s);
    hot('s3d_t_screen', 0.05, DY + 0.5, -2.98);
  })();

  // ---------- ADAM T8V
  function speaker(x, z, ry) {
    var g = grp(x, DY, z, ry);
    box(0.27, 0.035, 0.32, M.foam, 0, 0.0175, 0, g, false);
    rbox(0.25, 0.40, 0.30, 0.012, M.black, 0, 0.235, 0, g);
    plane(0.226, 0.376, std(0x111113, 0.6, 0.2), 0, 0.235, 0.1515, g);
    var wy = 0.165;
    var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.032, 0.035, 36, 1, true), std(0x1d1d20, 0.55, 0.3, { side: THREE.DoubleSide }));
    cone.rotation.x = Math.PI / 2; cone.position.set(0, wy, 0.145); g.add(cone);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.009, 10, 40), M.rubber); ring.position.set(0, wy, 0.158); g.add(ring);
    var cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.alu); cap.rotation.x = Math.PI / 2; cap.position.set(0, wy, 0.158); g.add(cap);
    rbox(0.085, 0.052, 0.016, 0.004, M.alu, 0, 0.335, 0.153, g);
    plane(0.07, 0.038, std(0x08080a, 0.9), 0, 0.335, 0.1615, g);
    var lg = ctex(128, 32, function (c, w, h) { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8e8e8'; c.font = '700 20px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ADAM AUDIO', w / 2, h / 2); });
    plane(0.07, 0.0175, std(0xffffff, 0.8, 0, { map: lg }), 0, 0.055, 0.1518, g);
    return g;
  }
  speaker(-1.05, -2.93, 0.3);
  var spR = speaker(1.12, -2.93, -0.3);
  hot('s3d_t_mon', -1.05, DY + 0.5, -2.85);

  // ---------- Push 3
  function drawPush(g, w, h, t) {
    g.fillStyle = '#0c0c0d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16161a'; g.fillRect(w * 0.04, h * 0.05, w * 0.92, h * 0.16);
    g.fillStyle = '#2a2a30';
    for (var d = 0; d < 8; d++) { g.beginPath(); g.arc(w * (0.12 + d * 0.105), h * 0.13, h * 0.032, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,170,60,.8)'; g.font = '600 ' + Math.round(h * 0.03) + 'px monospace'; g.textBaseline = 'middle';
    g.fillText('Wavetable   Cutoff  Res  Drive', w * 0.1, h * 0.095);
    var px = w * 0.1, py = h * 0.27, ps = h * 0.085, pg = h * 0.01;
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var v = Math.sin(c * 0.9 + t * 1.4) * Math.cos(r * 0.7 - t * 1.1) + Math.sin((c + r) * 0.5 + t * 0.7) * 0.5;
      var on = ((c * 3 + r * 5 + Math.floor(t * 2)) % 7) < 3 || v > 0.55;
      var cols = ['#ff7a1a', '#ffb02e', '#ff3b2a'];
      g.fillStyle = on ? cols[(c + r) % 3] : '#241a14';
      g.fillRect(px + c * (ps + pg), py + r * (ps + pg), ps, ps);
    }
    g.fillStyle = '#26262b';
    for (var b = 0; b < 8; b++) { g.fillRect(w * 0.025, py + b * (ps + pg), w * 0.04, ps * 0.8); g.fillRect(w * 0.93, py + b * (ps + pg), w * 0.04, ps * 0.8); }
  }
  var pushTex = ctex(1024, 710, drawPush);
  (function () {
    var g = grp(-0.68, DY, -2.65, 0.18);
    var tilt = grp(0, 0.026, 0, 0, g); tilt.rotation.x = -0.2;
    rbox(0.41, 0.038, 0.285, 0.012, std(0x101012, 0.5, 0.3), 0, 0, 0, tilt);
    var top = plane(0.395, 0.274, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, map: pushTex, emissive: 0xffffff, emissiveMap: pushTex, emissiveIntensity: 1.5 }), 0, 0.0195, 0, tilt);
    top.rotation.x = -Math.PI / 2;
    hot('s3d_t_push', -0.68, DY + 0.16, -2.62);
  })();

  // ---------- fader kontrolcü
  function drawFaderBody(g, w, h) {
    g.fillStyle = '#e8e6e1'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#cfcdc8'; g.fillRect(w * 0.03, h * 0.04, w * 0.94, h * 0.2);
    for (var c = 0; c < 8; c++) {
      var x = w * (0.07 + c * 0.113);
      g.fillStyle = '#7c7a76'; g.beginPath(); g.arc(x + w * 0.02, h * 0.14, h * 0.045, 0, 7); g.fill();
      g.fillStyle = '#2a2a2c'; g.fillRect(x + w * 0.012, h * 0.3, w * 0.016, h * 0.62);
      g.fillStyle = '#f4f4f2'; g.fillRect(x - w * 0.002, h * (0.4 + ((c * 37) % 5) * 0.07), w * 0.054, h * 0.07);
      g.fillStyle = '#d54a4a'; g.fillRect(x - w * 0.002, h * (0.4 + ((c * 37) % 5) * 0.07) + h * 0.025, w * 0.054, h * 0.012);
    }
  }
  function drawFaderLed(g, w, h, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (var c = 0; c < 8; c++) {
      var x = w * (0.07 + c * 0.113) + w * 0.056;
      for (var i = 0; i < 9; i++) {
        var lvl = (Math.sin(t * 2.2 + c * 0.9) + 1) * 4.5;
        g.fillStyle = i < lvl ? '#c060ff' : '#1a0c22';
        g.fillRect(x, h * (0.88 - i * 0.065), w * 0.018, h * 0.04);
      }
    }
  }
  var faderBodyTex = ctex(768, 512, drawFaderBody);
  var faderLedTex = ctex(768, 512, drawFaderLed);
  (function () {
    var g = grp(0.55, DY, -2.68, -0.05);
    var tilt = grp(0, 0.022, 0, 0, g); tilt.rotation.x = -0.1;
    rbox(0.3, 0.028, 0.2, 0.007, M.white, 0, 0, 0, tilt);
    var top = plane(0.288, 0.192, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, map: faderBodyTex, emissive: 0xffffff, emissiveMap: faderLedTex, emissiveIntensity: 1.7 }), 0, 0.0145, 0, tilt);
    top.rotation.x = -Math.PI / 2;
    hot('s3d_t_faders', 0.55, DY + 0.12, -2.66);
  })();

  // ---------- klavye + mouse
  var kbMap = ctex(768, 256, function (g, w, h) {
    g.fillStyle = '#101012'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26262b';
    var rows = [15, 14, 14, 13, 12], y = h * 0.06;
    rows.forEach(function (n) { var kw = w * 0.92 / n; for (var i = 0; i < n; i++) { g.fillRect(w * 0.04 + i * kw + 2, y, kw - 4, h * 0.15); } y += h * 0.18; });
  });
  var kbEm = ctex(768, 256, function (g, w, h) {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b7e6c8';
    var rows = [15, 14, 14, 13, 12], y = h * 0.06, R = rng(21);
    rows.forEach(function (n) { var kw = w * 0.92 / n; for (var i = 0; i < n; i++) { g.fillRect(w * 0.04 + i * kw + kw * 0.3, y + h * 0.05, kw * 0.34, h * 0.05); } y += h * 0.18; });
  });
  (function () {
    var g = grp(-0.05, DY + 0.003, -2.44, 0);
    rbox(0.375, 0.012, 0.128, 0.004, M.plastic, 0, 0.006, 0, g);
    var top = plane(0.36, 0.12, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, map: kbMap, emissive: 0xffffff, emissiveMap: kbEm, emissiveIntensity: 1.6 }), 0, 0.0125, 0, g);
    top.rotation.x = -Math.PI / 2;
    rbox(0.065, 0.028, 0.11, 0.013, M.knob, 0.3, 0.017, 0.0, scene).position.set(0.3, DY + 0.017, -2.46);
  })();

  // ---------- Arturia AudioFuse Studio
  (function () {
    var g = grp(0.9, DY, -2.88, -0.15);
    var tilt = grp(0, 0.032, 0, 0, g); tilt.rotation.x = -0.25;
    rbox(0.23, 0.056, 0.2, 0.008, std(0x141416, 0.4, 0.7), 0, 0, 0, tilt);
    cyl(0.03, 0.03, 0.022, M.alu, 0.045, 0.036, 0.03, tilt, 32);
    cyl(0.026, 0.026, 0.004, std(0x0a0a0a, 0.5), 0.045, 0.049, 0.03, tilt, 32);
    [[-0.075, 0.06], [-0.075, 0.015], [-0.03, 0.06], [-0.03, 0.015]].forEach(function (p) { cyl(0.011, 0.011, 0.014, M.knob, p[0], 0.034, p[1], tilt, 16); });
    for (var i = 0; i < 8; i++) box(0.006, 0.003, 0.012, fixedGlow(0x40ff8a, 2.2), -0.095 + i * 0.009, 0.029, -0.07, tilt, false);
    hot('s3d_t_iface', 0.9, DY + 0.14, -2.82);
  })();

  // ---------- Acid 303 (bas makinesi)
  (function () {
    var g = grp(0.88, DY, -2.62, 0.05);
    rbox(0.3, 0.04, 0.155, 0.006, M.alu, 0, 0.02, 0, g);
    for (var k = 0; k < 7; k++) cyl(0.0095, 0.0095, 0.014, M.knob, -0.115 + k * 0.038, 0.047, -0.04, g, 16);
    for (var s = 0; s < 16; s++) box(0.0145, 0.006, 0.022, s % 4 === 0 ? fixedGlow(0xff7a2a, 1.6) : std(0xe9e9e9, 0.5), -0.12 + s * 0.0158, 0.043, 0.04, g, false);
    box(0.06, 0.003, 0.02, std(0xd2342a, 0.6), 0.1, 0.0415, -0.01, g, false);
    hot('s3d_t_303', 0.88, DY + 0.1, -2.6);
  })();

  // ---------- Arturia MicroFreak
  (function () {
    var g = grp(0.7, DY, -2.37, 0.1);
    rbox(0.34, 0.035, 0.2, 0.01, std(0x2a2b30, 0.45, 0.4), 0, 0.0175, 0, g);
    for (var r = 0; r < 2; r++) for (var c = 0; c < 6; c++) cyl(0.0075, 0.0075, 0.012, M.knob, -0.12 + c * 0.03, 0.04, -0.07 + r * 0.04, g, 14);
    box(0.09, 0.003, 0.05, std(0x08080a, 0.3), 0.1, 0.037, -0.055, g, false);
    var wk = std(0xf0f0ee, 0.5), bk = std(0x111113, 0.5);
    for (var w = 0; w < 15; w++) box(0.0155, 0.006, 0.055, wk, -0.1625 + w * 0.0232 + 0.011, 0.038, 0.06, g, false);
    var bp = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12];
    bp.forEach(function (i) { box(0.011, 0.008, 0.032, bk, -0.1625 + (i + 1) * 0.0232 - 0.0006, 0.04, 0.047, g, false); });
    mesh(new THREE.CircleGeometry(0.004, 10), fixedGlow(0xff3a2a, 2), -0.15, 0.0365, -0.085, g, false, false).rotation.x = -Math.PI / 2;
    hot('s3d_t_synth', 0.7, DY + 0.12, -2.34);
  })();

  // ---------- Arturia DrumBrute Impact
  (function () {
    var g = grp(0.86, DY, -2.0, -0.1);
    rbox(0.34, 0.05, 0.22, 0.012, std(0x1b1c1f, 0.5, 0.2), 0, 0.025, 0, g);
    for (var k = 0; k < 10; k++) cyl(0.009, 0.009, 0.013, k % 3 === 0 ? std(0xd8d8da, 0.4) : M.knob, -0.135 + (k % 5) * 0.045, 0.057, -0.07 + Math.floor(k / 5) * 0.045, g, 14);
    for (var s = 0; s < 16; s++) box(0.0165, 0.008, 0.024, s % 4 === 0 ? std(0xe84a2f, 0.5) : std(0xdcdcdc, 0.5), -0.131 + s * 0.0175, 0.054, 0.07, g, false);
    for (var p = 0; p < 4; p++) box(0.03, 0.006, 0.03, std(0x3a3b40, 0.7), 0.06 + p * 0.0375 - 0.0, 0.053, 0.02, g, false);
    hot('s3d_t_drum', 0.86, DY + 0.1, -1.98);
  })();

  // ---------- MacBook Pro
  (function () {
    var g = grp(0.86, DY, -1.5, -1.38);
    rbox(0.31, 0.016, 0.22, 0.006, std(0x2f3033, 0.35, 0.92), 0, 0.008, 0, g);
    var kk = plane(0.27, 0.085, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, map: kbMap, emissive: 0xffffff, emissiveMap: kbEm, emissiveIntensity: 1.3 }), 0, 0.0165, 0.03, g);
    kk.rotation.x = -Math.PI / 2;
    box(0.1, 0.0006, 0.07, std(0x232426, 0.5, 0.8), 0, 0.0166, 0.085, g, false);
    var hinge = grp(0, 0.014, -0.11, 0, g);
    hinge.rotation.x = -1.83;
    rbox(0.31, 0.008, 0.215, 0.004, std(0x2f3033, 0.35, 0.92), 0, 0, 0.1075, hinge);
    var sc = new THREE.Mesh(new THREE.PlaneGeometry(0.296, 0.2), miniMat);
    sc.rotation.x = Math.PI / 2; sc.position.set(0, -0.0042, 0.1075); hinge.add(sc);
    hot('s3d_t_laptop', 0.86, DY + 0.2, -1.5);
  })();

  // ---------- Tascam DR-05X
  (function () {
    var g = grp(1.05, DY, -1.28, 0.4);
    rbox(0.05, 0.026, 0.155, 0.006, std(0x1f1f21, 0.55, 0.3), 0, 0.013, 0, g);
    box(0.028, 0.001, 0.034, fixedGlow(0x6cff9a, 0.7), 0, 0.0268, -0.03, g, false);
    for (var b = 0; b < 3; b++) cyl(0.004, 0.004, 0.003, M.alu, -0.012 + b * 0.012, 0.027, 0.02, g, 10, false);
    [-0.012, 0.012].forEach(function (x) { cyl(0.0085, 0.0085, 0.02, M.alu, x, 0.02, -0.075, g, 14); });
    hot('s3d_t_rec', 1.05, DY + 0.1, -1.28);
  })();

  // telefon
  rbox(0.07, 0.008, 0.15, 0.006, std(0x101113, 0.3, 0.6), 0.62, DY + 0.004, -1.42, scene, false).rotation.y = 0.5;

  // kulaklık + stand
  (function () {
    var g = grp(-1.13, DY, -2.38, 0.4);
    cyl(0.06, 0.07, 0.015, M.black, 0, 0.0075, 0, g, 24);
    cyl(0.007, 0.007, 0.3, M.alu, 0, 0.165, 0, g, 12);
    var arc = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.009, 10, 32, Math.PI), M.plastic);
    arc.position.set(0, 0.275, 0); g.add(arc);
    [-0.075, 0.075].forEach(function (x) { var c = cyl(0.045, 0.045, 0.03, std(0x15151a, 0.5, 0.2), x, 0.27, 0, g, 24); c.rotation.z = Math.PI / 2; });
  })();

  // Grogu figürü (sağ hoparlörün üstünde)
  (function () {
    var g = grp(1.12, DY + 0.41, -2.93, -0.3);
    var robe = std(0x8a6b4a, 0.9), skin = std(0x9fb07c, 0.8);
    cyl(0.018, 0.034, 0.06, robe, 0, 0.03, 0, g, 14);
    var head = mesh(new THREE.SphereGeometry(0.03, 18, 14), skin, 0, 0.082, 0, g); head.scale.set(1, 0.92, 0.95);
    [-1, 1].forEach(function (s) {
      var ear = mesh(new THREE.ConeGeometry(0.014, 0.075, 10), skin, s * 0.052, 0.086, 0, g);
      ear.rotation.z = -s * 1.35;
      mesh(new THREE.SphereGeometry(0.0055, 8, 6), std(0x050505, 0.2), s * 0.011, 0.088, 0.027, g, false);
    });
  })();

  // kablolar
  (function () {
    var cm = std(0x050505, 0.8);
    [[-0.5, DY, -3.1, 0], [0.2, DY, -3.1, 0.2], [0.6, DY, -3.1, -0.3]].forEach(function (p) {
      var pts = [new THREE.Vector3(p[0], p[1], p[2]), new THREE.Vector3(p[0] + p[3] * 0.5, p[1] - 0.25, p[2] - 0.06), new THREE.Vector3(p[0] + p[3], 0.05, -3.0), new THREE.Vector3(p[0] + p[3] + 0.3, 0.012, -2.5)];
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.006, 6), cm, 0, 0, 0, scene, false, false);
    });
  })();

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
  chair(-0.15, -1.82, 0.35, 0xd5352a);
  chair(1.75, -1.85, -1.4, 0xd5352a);
  obst(1.45, 2.05, -2.2, -1.5);

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
      redraw(screenTex, t); redraw(miniTex, t); redraw(pushTex, t); redraw(faderLedTex, t);
    }
    var pulse = 0.94 + Math.sin(t * 1.7) * 0.06;
    strip.color.set(LED[ledKey]).multiplyScalar(3.0 * pulse);
    var f = 1 + Math.sin(t * 0.9) * 0.03 + (Math.sin(t * 37) > 0.995 ? -0.1 : 0);
    neonMat.color.set(LED[ledKey]).multiplyScalar(2.2 * f);
    pushGlow.intensity = 0.7 + Math.sin(t * 2.4) * 0.2;
    screenSpill.intensity = 0.95 + Math.sin(t * 1.1) * 0.1;
    var p = dust.geometry.attributes.position.array;
    for (var i = 0; i < p.length; i += 3) {
      p[i + 1] += Math.sin(t * 0.3 + i) * 0.0003 + 0.00008;
      p[i] += Math.cos(t * 0.2 + i * 0.7) * 0.0002;
      if (p[i + 1] > 2.7) p[i + 1] = 0.6;
    }
    dust.geometry.attributes.position.needsUpdate = true;
  }

  return { scene: scene, update: update, setLed: setLed, hotspots: hotspots, obstacles: obstacles, spot: spot };
}
