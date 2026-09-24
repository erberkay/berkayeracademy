/* Push 3 Laboratuvarı — cihaz (p3-device.js)
 *
 * Cihaz SVG'si, canlı katman (#p3Live), kontrol registry'si, hit-test ve katman hizalama.
 * Sözleşme: docs/push3/README.md §G4, kararlar A1–A2 ve "Görünüm istisnası".
 *
 * #p3Stage içindeki kardeş katmanlar:
 *   #p3DeviceWrap > svg  Statik cihaz. Filter yalnız wrap'ta ve enjeksiyondan sonra bu SVG'ye
 *                        yazılmaz (tek istisna setView'in viewBox'ı): filtreli alt ağaçtaki her
 *                        mutasyon tüm cihazı yeniden rasterize eder (commit bf82b0c'deki donma).
 *   svg#p3Live           Aynı viewBox, filtresiz: pad'ler, LED'li glif klonları, light bar'lar,
 *                        scene etiketleri, strip noktası, encoder halkaları, hedef çerçeveleri.
 *   canvas#p3LcdCanvas   LCD kutusuna hizalanır; çizim p3-lcd'nin.
 *   #p3HotspotLayer      Kontrol başına bir div + #p3PadSurface (role=grid, 64 gridcell).
 *
 * Bu modül girdi işlemez (p3-input) ve LED rengi hesaplamaz (p3-leds): elemanları kurar,
 * geometriyi bilir ve dışarı açar. Geometri sabittir (sartname-kontrol-haritasi,
 * dogrulanmis-donanim §2); getBBox kullanılmaz. #p3Live'daki her elemanın LED rengi CSS
 * `color`'ıdır (içerik currentColor ile boyanır), yani p3-leds yalnız `el.style.color` yazar.
 *
 * SAPMA / EKLEME:
 * - D-pad: haritadaki tek `dpad` yerine dpadUp/dpadDown/dpadLeft/dpadRight + dpadC (her okun
 *   kendi LED glifi ve erişilebilir düğmesi var). `dpad` ve `octpage` birer GROUPS kaydıdır:
 *   expand('dpad') ve svgRect('dpad') bütün bölgeyi verir; hitTest her zaman yaprak kimliği döner.
 * - Klon matrisi A1'deki getScreenCTM formülüyle alınır. Sahne gizliyken (menü açık) ekran CTM'i
 *   yok ya da tekil olduğundan aynı matris ata elemanların transform listelerinden kurulur.
 * - setView anlıktır; sartname-mobil'deki 200 ms viewBox geçişi yok. README'ye göre filter görünüm
 *   değişiminde "bir kez" rasterize olur, animasyon ise her karede yeniden rasterize ederdi.
 * - Nötrleştirmeye ek: strip'in statik noktası `Group 8` gizlenir (canlı nokta hareket eder),
 *   boşalan blend grubu `Rectangle 39` ile olası desen dolgulu arka plan silinir. "57 no-op rect"
 *   kuralı fill="none" ve stroke'suz rect'tir (dosyada tam 57; 2'sinin fill-opacity'si 0.04 değil).
 * - Ek API: GROUPS, PAD, VIEWS, view, svgRect, ring, stripDot, stripY, stripValue, targetG, expand.
 *   hotspotEl, controlRect ve svgRect `{pad:[x,y]}` de kabul eder (hitTest'in döndürdüğü biçim).
 * - align() LCD canvas'ın arka tamponunu da kurar (CSS px × DPR, en çok 2) ve bus'a
 *   'layout' {view, scale, lcdResized} yayar; tampon değişince canvas silinir, p3-lcd yeniden çizer.
 * - Hotspot katmanı sahnenin dolgu kutusunu kaplar: controlRect aynı px uzayında (#p3Coach için de).
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  var SVG_URL = '/assets/img/push3-device.svg';
  var NS = 'http://www.w3.org/2000/svg';

  // sartname-mobil-erisilebilirlik §1. full, cihaz dosyasının kendi viewBox'ıdır (P3.K.VB).
  var VIEWS = { full: '161 135 2116 1725', pads: '583 860 1222 918', padsStrip: '420 860 1385 918', controls: '575 240 1234 590' };

  // Pad ızgarası: pad i = r*8+c üstten sayılır; Push koordinatı x = c, y = 7-r (alttan).
  var PAD = { x0: 589, y0: 866, w: 146, h: 108, px: 152, py: 114 };
  var GRID_W = PAD.px * 7 + PAD.w, GRID_H = PAD.py * 7 + PAD.h;

  // Touch Strip izi (Frame 32) ve Figma'daki gösterge noktası (Group 8, izin sağında).
  var STRIP = { top: 884, bottom: 1750, dotX: 526.5, dotR: 6.5 };

  // p3-core yüklenmemişse (yalnız testte) kullanılan LCD kutusu; kaynak P3.K.LCD.
  var LCD_BOX = { x: 581, y: 490.167, w: 1222, h: 203.67 };

  // Encoder yüz merkezleri (Frame 11_n). Gölge katmanı 8 birim kayık olduğundan bbox değil yüz alınır.
  var ENC_X = [646.8, 801.0, 956.3, 1113.2, 1265.8, 1423.2, 1579.0, 1731.1], ENC_Y = 273.2;

  // Scene düğmeleri yukarıdan aşağı. Figma'daki etiketler hatalı (1/32t iki kez, 1/4 ile 1/4t yer
  // değiştirmiş), bu yüzden kendi metnimizi yazarız.
  // VARSAYIM: sıra Push 2 resmi CC43 = üst bilgisi ile Push 3 topluluk CC haritasından çıkarıldı.
  var SCENE_TEXT = ['1/32t', '1/32', '1/16t', '1/16', '1/8t', '1/8', '1/4t', '1/4'];

  // Çapraz bölünmüş bölgelerin hotspot şekli (kendi kutularına göre); hitTest aynı köşegenleri uygular.
  var TRI = {
    up: 'polygon(0 0, 100% 0, 50% 100%)',
    down: 'polygon(0 100%, 100% 100%, 50% 0)',
    left: 'polygon(0 0, 0 100%, 100% 50%)',
    right: 'polygon(100% 0, 100% 100%, 0 50%)'
  };

  // ---------------------------------------------------------------- registry
  // hit: {x,y,w,h} dikdörtgen ya da {cx,cy,r} daire, SVG biriminde. Hücre sınırları ayırıcı
  // rect'lerin orta çizgisinden geçer. led: glifi varsa 'label', light bar'ı varsa 'bar'.
  // label: cihazdaki İngilizce ad (kontrol adları çevrilmez; aria-label da budur).
  // Ek alanlar: bar (light bar kutusu), text (scene etiketi), dir/group (D-pad, Octave/Page),
  // toggle (aria-pressed), keys (aria-keyshortcuts; yalnız klavye düzeninden bağımsız tuşlar).
  var CONTROLS = {}, ids = [];

  function R(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }
  function O(cx, cy, r) { return { cx: cx, cy: cy, r: r }; }

  function def(id, kind, svgId, label, hit, glyphIds, extra) {
    var c = { id: id, kind: kind, svgId: svgId, label: label, hit: hit, glyphIds: glyphIds || [] };
    for (var k in extra) c[k] = extra[k];
    c.led = c.bar ? 'bar' : c.glyphIds.length ? 'label' : 'none';
    CONTROLS[id] = c;
    ids.push(id);
  }

  var k, x;

  // Sol üst (SessionSettings) ve sol ikinci sıra (SessionSettings_3); sınırlar 309.75 / 385 / 460.25.
  // y = 360.328 / 757.328 SVG'deki kesin değer (harita 360.3'e yuvarlar).
  def('sets', 'btn', 'TransparentButton', 'Sets', R(236, 360.328, 73.75, 66), ['file']);
  def('setup', 'btn', 'TransparentButton_2', 'Setup', R(309.75, 360.328, 75.25, 66), ['settings']);
  def('learn', 'btn', 'TransparentButton_3', 'Learn', R(385, 360.328, 75.25, 66), ['tutorial']);
  def('user', 'btn', 'TransparentButton_4', 'User', R(460.25, 360.328, 73.75, 66), ['stamp']);
  def('volume', 'enc', 'Knob_9', 'Volume', O(297, 586, 70));
  // Undo'nun glif kimliği Figma'da Save_2, üstünde "Undo" yazar.
  def('undo', 'btn', 'TextButton_2', 'Undo', R(468, 482, 66, 66), ['Save_2'], { keys: 'Control+Z Meta+Z' });
  def('save', 'btn', 'TextButton', 'Save', R(468, 636, 66, 66), ['Save'], { keys: 'Control+S Meta+S' });
  def('lock', 'btn', 'TransparentButton_9', 'Lock', R(236, 757.328, 73.75, 66), ['lock']);
  def('stopClip', 'btn', 'TransparentButton_10', 'Stop Clip', R(309.75, 757.328, 75.25, 66), ['sqaure']);
  def('mute', 'btn', 'TransparentButton_11', 'Mute', R(385, 757.328, 75.25, 66), ['mute'], { toggle: true });
  def('solo', 'btn', 'TransparentButton_12', 'Solo', R(460.25, 757.328, 73.75, 66), ['solo'], { toggle: true });

  // Ekran çevresi.
  for (k = 1; k <= 8; k++) {
    x = 590 + 153 * (k - 1);
    def('upper' + k, 'btn', k === 1 ? 'SelectionButton' : 'SelectionButton_' + k, 'Upper Display Button ' + k,
      R(x, 360, 136, 66), [], { bar: R(x + 14, 403, 108, 6) });
  }
  for (k = 1; k <= 8; k++) {
    x = 590 + 153 * (k - 1);
    def('lower' + k, 'btn', 'SelectionButton_' + (k + 8), 'Lower Display Button ' + k,
      R(x, 757, 136, 66), [], { bar: R(x + 14, 774, 108, 6) });
  }
  for (k = 1; k <= 8; k++) {
    def('enc' + k, 'enc', k === 1 ? 'Knob' : 'Knob_' + k, 'Encoder ' + k, R(ENC_X[k - 1] - 75, ENC_Y - 60, 150, 120));
  }
  def('lcd', 'lcd', 'LCD Display', 'Display', R(581, 482, 1222, 220));
  // VARSAYIM: MiscButton = Main Track (dogrulanmis-donanim "HALA BELIRSIZ").
  def('mainTrack', 'btn', 'MiscButton', 'Main Track', R(1852, 757, 62, 66), [], { bar: R(1866, 774, 34, 6) });
  def('add', 'btn', 'IconButton', 'Add', R(1852, 481, 66, 66), ['add']);
  def('swap', 'btn', 'IconButton_2', 'Swap', R(1852, 636, 66, 66), ['replace']);
  def('device', 'btn', 'TransparentButton_5', 'Device', R(1852, 360.328, 73.75, 66), ['track']);
  def('mix', 'btn', 'TransparentButton_6', 'Mix', R(1925.75, 360.328, 75.25, 66), ['mixer']);
  def('clip', 'btn', 'TransparentButton_7', 'Clip', R(2001, 360.328, 75.25, 66), ['player']);
  def('sessionScreen', 'btn', 'TransparentButton_8', 'Session Screen', R(2076.25, 360.328, 73.75, 66), ['layout']);
  def('jog', 'enc', 'Knob_11', 'Jog Wheel', O(2071.6, 585.2, 104.3));

  // Sol sütun. VARSAYIM: Knob_10 = Swing and Tempo (yalnız konumdan: Tap Tempo'nun hemen üstü).
  def('swingTempo', 'enc', 'Knob_10', 'Swing and Tempo', O(296.1, 905.4, 55));
  def('tapTempo', 'btn', 'TextTransparentButton', 'Tap Tempo', R(236, 980, 145, 97.5), ['Label']);
  // Metronome ikonu Figma'da yanlışlıkla `icon/quantize` adını taşır.
  def('metronome', 'btn', 'IconTransparentButton', 'Metronome', R(236, 1077.5, 145, 59.5), ['icon/quantize'], { toggle: true });
  def('quantize', 'btn', 'TextTransparentButton_2', 'Quantize', R(236, 1137, 145, 57), ['Label_2']);
  def('fixedLength', 'btn', 'TextTransparentButton_3', 'Fixed Length', R(236, 1257, 145, 58.5), ['Label_3'], { toggle: true });
  def('automate', 'btn', 'TextTransparentButton_4', 'Automate', R(236, 1315.5, 145, 58.5), ['Label_4']);
  def('new', 'btn', 'TextTransparentButton_13', 'New', R(236, 1437, 145, 59.5), ['Label_13']);
  def('capture', 'btn', 'TransparentBigButton_3', 'Capture', R(236, 1496.5, 145, 65), ['icon-big-focus']);
  def('record', 'btn', 'TransparentBigButton_4', 'Record', R(236, 1561.5, 145, 91.5), ['record'], { keys: 'Enter' });
  def('play', 'btn', 'ButtonBigPlay', 'Play', R(236, 1668, 145, 99), ['play'], { keys: 'Space' });
  def('strip', 'strip', 'TouchSlider', 'Touch Strip', R(426, 865, 107, 907));

  def('pads', 'pad', 'Pads', 'Pads', R(PAD.x0, PAD.y0, GRID_W, GRID_H));

  // Sağ sütun.
  for (k = 1; k <= 8; k++) {
    def('scene' + k, 'btn', k === 1 ? 'SideButton' : 'SideButton_' + k, 'Scene ' + k + ' (' + SCENE_TEXT[k - 1] + ')',
      R(1852, 869 + 115 * (k - 1), 62, 98), [k === 1 ? 'icon/play' : 'icon/play_' + k], { text: SCENE_TEXT[k - 1] });
  }
  // Oklar üçgen bölgelerdir (kutu = üçgenin sınırı); orta kare onların üstündedir.
  def('dpadUp', 'dpad', 'Frame 35', 'D-pad Up', R(1952, 757, 209, 104), ['Vector 1_4'], { dir: 'up', group: 'dpad' });
  def('dpadDown', 'dpad', 'Frame 35', 'D-pad Down', R(1952, 861, 209, 104), ['Vector 2_2'], { dir: 'down', group: 'dpad' });
  def('dpadLeft', 'dpad', 'Frame 35', 'D-pad Left', R(1952, 757, 104.5, 208), ['Vector 2_3'], { dir: 'left', group: 'dpad' });
  def('dpadRight', 'dpad', 'Frame 35', 'D-pad Right', R(2056.5, 757, 104.5, 208), ['Vector 1_5'], { dir: 'right', group: 'dpad' });
  def('dpadC', 'dpad', 'Frame 35', 'D-pad Center', R(2021, 825, 71, 71), [], { dir: 'center', group: 'dpad' });
  def('note', 'btn', 'TransparentBigButton', 'Note', R(1953, 980, 104.5, 104.5), ['icon-big-pads']);
  def('session', 'btn', 'TransparentBigButton_2', 'Session', R(2057.5, 980, 103.5, 104.5), ['icon-big-tracks']);
  def('scale', 'btn', 'TextTransparentButton_11', 'Scale', R(1953, 1084.5, 104.5, 62.5), ['Label_11'], { keys: '9' });
  def('layout', 'btn', 'TextTransparentButton_12', 'Layout', R(2057.5, 1084.5, 103.5, 62.5), ['Label_12'], { keys: '0' });
  def('repeat', 'btn', 'TextTransparentButton_5', 'Repeat', R(1953, 1209, 104.5, 102), ['Label_5'], { toggle: true });
  def('accent', 'btn', 'TextTransparentButton_6', 'Accent', R(2057.5, 1209, 103.5, 102), ['Label_6'], { toggle: true });
  def('doubleLoop', 'btn', 'TextTransparentButton_7', 'Double Loop', R(1953, 1324, 104.5, 81.5), ['Label_7']);
  def('duplicate', 'btn', 'TextTransparentButton_9', 'Duplicate', R(2057.5, 1324, 103.5, 81.5), ['Label_9']);
  def('convert', 'btn', 'TextTransparentButton_8', 'Convert', R(1953, 1405.5, 104.5, 78.5), ['Label_8']);
  def('delete', 'btn', 'TextTransparentButton_10', 'Delete', R(2057.5, 1405.5, 103.5, 78.5), ['Label_10'], { keys: 'Backspace' });
  def('octaveUp', 'octpage', 'JogControls', 'Octave Up', R(1953, 1499, 208, 104), ['Octave', 'Vector 1'],
    { dir: 'up', group: 'octpage', keys: 'ArrowUp' });
  def('octaveDown', 'octpage', 'JogControls_2', 'Octave Down', R(1953, 1603, 208, 104), ['Octave_2', 'Vector 1_2'],
    { dir: 'down', group: 'octpage', keys: 'ArrowDown' });
  def('pageLeft', 'octpage', 'JogControls_3', 'Page Left', R(1953, 1499, 104, 208), ['Page', 'Vector 1_3'],
    { dir: 'left', group: 'octpage', keys: 'ArrowLeft' });
  def('pageRight', 'octpage', 'JogControls_4', 'Page Right', R(2057, 1499, 104, 208), ['Page_2', 'Vector 2'],
    { dir: 'right', group: 'octpage', keys: 'ArrowRight' });
  def('shift', 'btn', 'TextTransparentButton_14', 'Shift', R(1953, 1725, 104.5, 46), ['Label_14'], { keys: 'Shift' });
  def('select', 'btn', 'TextTransparentButton_15', 'Select', R(2057.5, 1725, 103.5, 46), ['Label_15']);

  // Çapraz bölünmüş iki kare: Session D-pad (Frame 35) ve Octave/Page (Frame 34).
  var GROUPS = {
    dpad: { x: 1952, y: 757, w: 209, h: 208, cx: 2056.5, cy: 861, center: 'dpadC',
      up: 'dpadUp', down: 'dpadDown', left: 'dpadLeft', right: 'dpadRight' },
    octpage: { x: 1953, y: 1499, w: 208, h: 208, cx: 2057, cy: 1603,
      up: 'octaveUp', down: 'octaveDown', left: 'pageLeft', right: 'pageRight' }
  };

  // ---------------------------------------------------------------- saf geometri
  function bbox(hit) {
    return hit.r ? R(hit.cx - hit.r, hit.cy - hit.r, 2 * hit.r, 2 * hit.r) : hit;
  }

  // Yarı açık aralık: ortak kenar (ör. Sets | Setup = 309.75) tek bir kontrole düşer.
  function inRect(r, x, y) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }

  function inHit(hit, x, y) {
    if (!hit.r) return inRect(hit, x, y);
    var dx = x - hit.cx, dy = y - hit.cy;
    return dx * dx + dy * dy <= hit.r * hit.r;
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  // Pad'ler arası 6 birimlik boşluk ortadan bölünür: her nokta en yakın pada düşer.
  function padAt(x, y) {
    var c = Math.floor((x - PAD.x0 + (PAD.px - PAD.w) / 2) / PAD.px);
    var r = Math.floor((y - PAD.y0 + (PAD.py - PAD.h) / 2) / PAD.py);
    return c >= 0 && c <= 7 && r >= 0 && r <= 7 ? [c, 7 - r] : null;   // NaN da null
  }

  function padRect(x, y) {
    return R(PAD.x0 + PAD.px * x, PAD.y0 + PAD.py * (7 - y), PAD.w, PAD.h);
  }

  // Orta kare dışında merkez etrafında |dy| > |dx| ? dikey : yatay. Tam köşegen üstünde yatay,
  // tam merkezde sağ kazanır.
  function groupHit(g, x, y) {
    if (g.center && inRect(CONTROLS[g.center].hit, x, y)) return g.center;
    var dx = x - g.cx, dy = y - g.cy;
    if (Math.abs(dy) > Math.abs(dx)) return dy < 0 ? g.up : g.down;
    return dx < 0 ? g.left : g.right;
  }

  // (x, y) SVG biriminde → kontrol kimliği, {pad:[x,y]} ya da null.
  function hitTest(x, y) {
    if (inRect(CONTROLS.pads.hit, x, y)) return { pad: padAt(x, y) };
    for (var g in GROUPS) if (inRect(GROUPS[g], x, y)) return groupHit(GROUPS[g], x, y);
    for (var i = 0; i < ids.length; i++) {
      var c = CONTROLS[ids[i]];
      if (!c.group && c.kind !== 'pad' && inHit(c.hit, x, y)) return c.id;
    }
    return null;
  }

  // Kontrol, grup ya da {pad:[x,y]} için SVG birimindeki kutu (daireler için çevreleyen kare).
  function svgRect(t) {
    if (t && t.pad) return padRect(t.pad[0], t.pad[1]);
    var g = GROUPS[t];
    if (g) return R(g.x, g.y, g.w, g.h);
    return CONTROLS[t] ? bbox(CONTROLS[t].hit) : null;
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // Strip değeri 0..1 alttan; iz boyunca doğrusal.
  function stripY(v) { return STRIP.bottom - clamp01(v) * (STRIP.bottom - STRIP.top); }
  function stripValue(y) { return clamp01((STRIP.bottom - y) / (STRIP.bottom - STRIP.top)); }

  // Öğretici allow/targets listeleri için: 'upper*' önek, 'dpad'/'octpage' grup, diğerleri tam kimlik.
  // Sonuç registry sırasındadır.
  function expand(list) {
    var pats = [].concat(list || []);
    return ids.filter(function (id) {
      return pats.some(function (p) {
        if (typeof p !== 'string') return false;
        if (p === id) return true;
        if (p.charAt(p.length - 1) === '*') return id.indexOf(p.slice(0, -1)) === 0;
        return !!GROUPS[p] && CONTROLS[id].group === p;
      });
    });
  }

  // ---------------------------------------------------------------- DOM durumu
  var wrap = null, svg = null, live = null, canvas = null, layer = null, surface = null;
  var pads = [], bars = {}, glyphs = {}, rings = {}, hotspots = {}, cells = [];
  var view = 'full', loading = null, observed = false, pending = 0;
  var scr = null;   // SVG → istemci (viewport) px; toSvg'nin tersi
  var map = null;   // SVG → sahne px (hotspot katmanı, controlRect)

  function byId(id) { return document.getElementById(id); }
  function drop(n) { if (n && n.parentNode) n.parentNode.removeChild(n); }
  function each(list, fn) { Array.prototype.slice.call(list).forEach(fn); }

  function attrs(el, a) {
    for (var n in a) el.setAttribute(n, a[n]);
    return el;
  }

  function svgEl(tag, a) { return attrs(document.createElementNS(NS, tag), a || {}); }

  // #p3Live elemanı: içerik currentColor ile boyanır, LED rengi `color`.
  function liveEl(parent, tag, a, color) {
    var el = svgEl(tag, a);
    el.style.color = color;
    parent.appendChild(el);
    return el;
  }

  function liveGroup(cls) { return liveEl(live, 'g', { 'class': cls }, ''); }

  // ---------------------------------------------------------------- nötrleştirme
  // DOMParser aşamasında, bir kez (sartname-mimari §5 + karar A1). Canlı katmana taşınacak
  // orijinal glifleri {kimlik: eleman} olarak döndürür.
  function neutralize(doc) {
    var root = doc.documentElement, origs = {}, n;
    function get(id) { return doc.getElementById(id); }
    function paint(el, color) {
      if (el) each(el.getElementsByTagName('rect'), function (r) { r.setAttribute('fill', color); });
    }

    // 1. Figma'nın "yanık" çizdiği pad'lerin soft-light overlay'leri.
    drop(get('Rectangle 12'));
    for (n = 2; n <= 8; n++) drop(get('Rectangle 12_' + n));

    // 2. Renkli/parlak light bar'lar sönük griye; glow grupları gider. Işık #p3Live'da yanar.
    [2, 3, 4, 5, 6, 10, 11, 12, 13, 14].forEach(function (i) { paint(get('light_' + i), '#414548'); });
    for (n = 1; n <= 5; n++) { drop(get('Group ' + n)); drop(get('Group ' + n + '_2')); }
    drop(get('Ellipse 1_11'));
    drop(get('Ellipse 1_12'));

    // 3. LCD: yalnız zemin rect'i kalır, siyah (içerik canvas'ta). Pixels de böylece gider.
    var lcd = get('LCD Display'), keep = lcd && lcd.querySelector('rect');
    if (keep) {
      prune(lcd, keep);
      keep.setAttribute('fill', '#000000');
    }

    // 4. Pad'ler nötr; ışıklarını #p3Live'daki kendi rect'leri gösterir.
    for (n = 0; n < 64; n++) paint(get(n ? 'PadButton_' + (n + 1) : 'PadButton'), '#1D1C22');

    // 5. Klonlanacak glifler silinmez, gizlenir: enjeksiyondan sonra CTM'leri ölçülür. Scene
    //    etiketleri ve strip'in statik noktası yalnız gizlenir (yerlerine kendi metnimiz ve
    //    hareketli noktamız çizilir).
    hiddenIds().forEach(function (id) {
      var el = get(id);
      if (!el) { console.warn(`[p3] SVG katmanı bulunamadı: ${id}`); return; }
      el.setAttribute('visibility', 'hidden');
      origs[id] = el;
    });

    // 6. Görünmez no-op rect'ler (fill="none", stroke'suz). Arka plan: commit 308a07a desen
    //    dolgulu tam tuval rect'ini dosyadan kaldırdı; yeniden export'a karşı kural burada da
    //    durur. Boşalan blend grupları (Rectangle 39) gereksiz birleştirme katmanı açmasın.
    each(root.querySelectorAll('rect[fill="none"]'), function (r) { if (!r.hasAttribute('stroke')) drop(r); });
    each(root.querySelectorAll('rect[fill^="url(#pattern"]'), drop);
    each(root.querySelectorAll('pattern, image'), drop);
    each(root.querySelectorAll('g'), function (g) {
      if (!g.firstElementChild && /mix-blend-mode/.test(g.getAttribute('style') || '')) drop(g);
    });

    // 7. Çizim <g id="p3-art"> altında: F2'nin bölünmüş görünümü <use href="#p3-art"> ile çizer.
    var art = doc.createElementNS(NS, 'g');
    art.setAttribute('id', 'p3-art');
    each(root.childNodes, function (c) { if (c.nodeName !== 'defs') art.appendChild(c); });
    root.insertBefore(art, root.firstChild);

    // Görünüm load'dan önce seçildiyse viewBox burada yazılır (enjeksiyon sonrası yazı olmasın).
    attrs(root, {
      viewBox: VIEWS[view], width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet',
      'aria-hidden': 'true', focusable: 'false'   // anlamı wrap'ın role=img etiketi taşır
    });
    return origs;
  }

  // `keep` ve onu içeren gruplar dışında `node` altındaki her şeyi siler.
  function prune(node, keep) {
    each(node.children, function (c) {
      if (c === keep) return;
      if (c.contains(keep)) prune(c, keep);
      else drop(c);
    });
  }

  function hiddenIds() {
    var out = ['Group 8'];
    ids.forEach(function (id) { out = out.concat(CONTROLS[id].glyphIds); });
    for (var n = 1; n <= 8; n++) out.push(n === 1 ? '1/32t' : '1/32t_' + n);
    return out;
  }

  // ---------------------------------------------------------------- enjeksiyon ve #p3Live
  // Kabuk (§E) bu elemanları sağlar; yoksa emülatör açılabilsin diye wrap'ın kardeşi kurulur.
  function stageEl(id, make, after) {
    var el = byId(id);
    if (el) return el;
    console.warn(`[p3] #${id} kabukta yok, oluşturuldu`);
    el = make();
    el.id = id;
    el.style.position = 'absolute';
    after.parentNode.insertBefore(el, after.nextSibling);
    return el;
  }

  function mount(root) {
    wrap = byId('p3DeviceWrap');
    if (!wrap) throw new Error(`[p3] #p3DeviceWrap yok`);
    wrap.textContent = '';
    wrap.appendChild(document.adoptNode(root));
    api.svg = svg = root;
    api.live = live = stageEl('p3Live', function () { return svgEl('svg'); }, wrap);
    canvas = stageEl('p3LcdCanvas', function () { return document.createElement('canvas'); }, live);
    layer = stageEl('p3HotspotLayer', function () {
      return attrs(document.createElement('div'), { 'class': 'p3-hotspot-layer' });
    }, canvas);
  }

  // Karar A1: klonun kök kullanıcı uzayındaki konumu = kök CTM'in tersi × orijinalin CTM'i.
  function rootInverse() {
    var m = svg.getScreenCTM();
    if (!m || !(m.a * m.d - m.b * m.c)) return null;
    try {
      var inv = m.inverse();
      return isFinite(inv.a) ? inv : null;
    } catch (e) { return null; }
  }

  function relMatrix(el, inv) {
    var own = inv && el.getScreenCTM(), m;
    if (own) {
      m = inv.multiply(own);
      if (isFinite(m.a + m.b + m.c + m.d + m.e + m.f)) return m;
    }
    // Sahne gizliyken ekran CTM'i yok: aynı matris ataların transform listelerinden.
    m = svg.createSVGMatrix();
    for (var n = el; n && n !== svg; n = n.parentNode) {
      var t = n.transform && n.transform.baseVal.consolidate();
      if (t) m = t.matrix.multiply(m);
    }
    return m;
  }

  function round6(v) { return Math.round(v * 1e6) / 1e6; }

  // Klonda kimlikler silinir (cihaz SVG'sinde tekil kalmalı), boyalar currentColor olur.
  function cloneGlyph(orig, m) {
    var c = orig.cloneNode(true);
    c.removeAttribute('visibility');
    [c].concat(Array.prototype.slice.call(c.querySelectorAll('*'))).forEach(function (n) {
      n.removeAttribute('id');
      ['fill', 'stroke'].forEach(function (p) {
        var v = n.getAttribute(p);
        if (v && v !== 'none') n.setAttribute(p, 'currentColor');
      });
    });
    var g = svgEl('g', { transform: 'matrix(' + [m.a, m.b, m.c, m.d, m.e, m.f].map(round6).join(' ') + ')' });
    g.appendChild(c);
    return g;
  }

  // Figma etiketinin yeri: sol kenar +12.36, taban çizgisi +26.
  // VARSAYIM: 14.5 birim, Figma yazısının büyük harf yüksekliğine (≈10.2) karşılık gelir.
  function sceneText(c) {
    var t = svgEl('text', {
      x: c.hit.x + 12.36, y: c.hit.y + 26, fill: 'currentColor',
      'font-family': '"Instrument Sans", system-ui, sans-serif', 'font-size': 14.5, 'font-weight': 500
    });
    t.textContent = c.text;
    return t;
  }

  function buildLive(origs) {
    var C = (P3.K && P3.K.C) || {};
    var off = C.off || '#1D1C22', ledOff = C.ledOff || '#2E3236', dim = C.ledDim || '#7C858A', on = C.ledOn || '#FFFFFF';
    var i, h, g;

    live.textContent = '';
    // Kök fill="none", cihaz kökündeki gibi: fill'siz glifler (ör. Stop Clip karesi) dolmasın.
    attrs(live, {
      viewBox: VIEWS[view], preserveAspectRatio: 'xMidYMid meet', fill: 'none',
      'aria-hidden': 'true', focusable: 'false', 'pointer-events': 'none'
    });

    g = liveGroup('p3-live-pads');
    for (i = 0; i < 64; i++) {
      h = padRect(i % 8, 7 - (i >> 3));
      pads[i] = liveEl(g, 'rect', { x: h.x, y: h.y, width: h.w, height: h.h, rx: 5, fill: 'currentColor' }, off);
    }

    g = liveGroup('p3-live-bars');
    bars = {};
    ids.forEach(function (id) {
      var b = CONTROLS[id].bar;
      if (b) bars[id] = liveEl(g, 'rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 2, fill: 'currentColor' }, ledOff);
    });

    // Önce oku, sonra yaz: her klon eklemesi düzeni kirletir ve bir sonraki CTM okuması
    // yeniden düzen hesaplatır.
    var inv = rootInverse(), mats = {};
    ids.forEach(function (id) {
      CONTROLS[id].glyphIds.forEach(function (gid) { if (origs[gid]) mats[gid] = relMatrix(origs[gid], inv); });
    });
    g = liveGroup('p3-live-glyphs');
    glyphs = {};
    ids.forEach(function (id) {
      var c = CONTROLS[id];
      if (!c.glyphIds.length) return;
      var el = liveEl(g, 'g', { 'data-id': id }, dim);
      c.glyphIds.forEach(function (gid) { if (mats[gid]) el.appendChild(cloneGlyph(origs[gid], mats[gid])); });
      if (c.text) el.appendChild(sceneText(c));
      glyphs[id] = el;
    });

    // VARSAYIM: dokunma halkası bizim tasarımımız (yüz r33, gölgesiyle ≈r37; halka r42).
    g = liveGroup('p3-live-rings');
    rings = {};
    for (i = 1; i <= 8; i++) {
      h = CONTROLS['enc' + i].hit;
      rings['enc' + i] = liveEl(g, 'circle', { cx: h.x + h.w / 2, cy: h.y + h.h / 2, r: 42, stroke: 'currentColor', 'stroke-width': 3 }, on);
      rings['enc' + i].style.visibility = 'hidden';
    }

    api.stripDot = liveEl(live, 'circle', { 'class': 'p3-live-strip', cx: STRIP.dotX, cy: stripY(0.5), r: STRIP.dotR, fill: 'currentColor' }, on);
    api.targetG = liveGroup('p3-live-target');
  }

  // ---------------------------------------------------------------- hotspot DOM
  function pct(f) { return (f * 100).toFixed(4) + '%'; }

  // Tek yakalama yüzeyi (girdi p3-input'ta) + erişilebilirlik için 8 row × 8 gridcell.
  // Satırlar DOM'da görsel sırayla (üstten); etiketteki satır numarası Push gibi alttan sayılır.
  function padSurface() {
    surface = byId('p3PadSurface') || document.createElement('div');
    surface.id = 'p3PadSurface';
    surface.textContent = '';
    attrs(surface, { role: 'grid', 'aria-label': `Pad ızgarası` });
    cells = [];
    for (var r = 0; r < 8; r++) {
      var row = attrs(document.createElement('div'), { role: 'row', 'class': 'p3-pad-row' });
      for (var c = 0; c < 8; c++) {
        var y = 7 - r, cell = document.createElement('div'), s = cell.style;
        cell.className = 'p3-pad-cell';
        attrs(cell, { role: 'gridcell', 'data-x': c, 'data-y': y, 'data-i': r * 8 + c, 'aria-label': `Pad, satır ${y + 1} sütun ${c + 1}` });
        cell.tabIndex = c === 0 && y === 0 ? 0 : -1;   // roving tabindex; odağı p3-input taşır
        // Izgara sabit olduğundan hücreler yüzeyin yüzdesiyle bir kez yerleşir; hizalama dokunmaz.
        s.position = 'absolute';
        s.left = pct(PAD.px * c / GRID_W);
        s.top = pct(PAD.py * r / GRID_H);
        s.width = pct(PAD.w / GRID_W);
        s.height = pct(PAD.h / GRID_H);
        row.appendChild(cell);
        cells[r * 8 + c] = cell;
      }
      surface.appendChild(row);
    }
    return surface;
  }

  // Kabuk CSS'i .p3-hotspot, .p3-enc, .p3-jog, .p3-strip ve .p3-pad-surface'ı tanır (dokunma,
  // imleç, 44 px alan). Pad yüzeyi .p3-hotspot almaz: onun hover vurgusu bütün ızgarayı örterdi.
  function hotspotClass(c) {
    if (c.kind === 'pad') return 'p3-pad-surface p3-hs-pad';
    var extra = c.id === 'jog' ? ' p3-jog' : c.kind === 'enc' ? ' p3-enc' : c.kind === 'strip' ? ' p3-strip' : '';
    return 'p3-hotspot p3-hs-' + c.kind + extra;
  }

  function buildHotspots() {
    Object.keys(hotspots).forEach(function (id) { if (hotspots[id] !== surface) drop(hotspots[id]); });
    hotspots = {};
    ids.forEach(function (id) {
      var c = CONTROLS[id], el = c.kind === 'pad' ? padSurface() : document.createElement('div');
      hotspotClass(c).split(' ').forEach(function (cls) { el.classList.add(cls); });   // kabuğun sınıfları kalır
      el.setAttribute('data-id', id);
      if (c.kind !== 'pad') {
        el.tabIndex = 0;
        el.setAttribute('aria-label', c.label);
        if (c.kind === 'enc' || c.kind === 'strip') {
          // Yer tutucu değerler: aria-valuenow/valuetext'i parametreyi bilen modül yazar.
          attrs(el, { role: 'slider', 'aria-orientation': 'vertical', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 });
        } else {
          el.setAttribute('role', 'button');
          if (c.toggle) el.setAttribute('aria-pressed', 'false');
          if (c.keys) el.setAttribute('aria-keyshortcuts', c.keys);
        }
      }
      // Tıklama alanı çizimle aynı olsun: daireler border-radius (tarayıcı isabeti ve odak
      // halkası buna uyar), çapraz bölgeler clip-path üçgeni.
      if (c.hit.r) {
        el.setAttribute('data-shape', 'circle');
        el.style.borderRadius = '50%';
      } else if (TRI[c.dir]) {
        el.setAttribute('data-shape', 'tri');
        el.style.clipPath = TRI[c.dir];
      }
      var hl = attrs(document.createElement('div'), { 'class': 'p3-hl', 'aria-hidden': 'true' });
      el.insertBefore(hl, el.firstChild);
      layer.appendChild(el);
      hotspots[id] = el;
    });
  }

  // ---------------------------------------------------------------- hizalama
  function toPx(r) { return R(map.a * r.x + map.e, map.d * r.y + map.f, map.a * r.w, map.d * r.h); }

  function place(el, r) {
    var s = el.style;
    s.left = r.x + 'px';
    s.top = r.y + 'px';
    s.width = r.w + 'px';
    s.height = r.h + 'px';
  }

  // Hotspot katmanı, #p3Live ve LCD canvas cihaz SVG'sinin CTM'inden hizalanır. Cihaz SVG'si
  // yalnız okunur. Sahne gizliyse (menü açık) false döner; görünür olunca ResizeObserver tetikler.
  function align() {
    if (!svg || !layer) return false;
    var m = svg.getScreenCTM(), par = layer.offsetParent;
    if (!m || !(m.a > 0) || !(m.d > 0) || !par) return false;
    var pr = par.getBoundingClientRect(), sr = svg.getBoundingClientRect();
    var ox = pr.left + par.clientLeft, oy = pr.top + par.clientTop;
    scr = { a: m.a, d: m.d, e: m.e, f: m.f };
    map = { a: m.a, d: m.d, e: m.e - ox, f: m.f - oy };

    place(layer, R(0, 0, par.clientWidth, par.clientHeight));
    place(live, R(sr.left - ox, sr.top - oy, sr.width, sr.height));

    // SVG kutusunun SVG birimindeki karşılığı. pads/controls görünümlerinde letterbox şeritleri
    // komşu kontrolleri de gösterir; kutunun tamamen dışında kalan hotspot'lar gizlenir ki
    // görünmeyen bir kontrol odak almasın.
    var vis = R((sr.left - m.e) / m.a, (sr.top - m.f) / m.d, sr.width / m.a, sr.height / m.d);

    var L = (P3.K && P3.K.LCD) || LCD_BOX, lr = toPx(L);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var bw = Math.max(1, Math.round(lr.w * dpr)), bh = Math.max(1, Math.round(lr.h * dpr));
    var lcdResized = canvas.width !== bw || canvas.height !== bh;
    place(canvas, lr);
    canvas.style.visibility = overlaps(L, vis) ? '' : 'hidden';
    if (lcdResized) {
      canvas.width = bw;
      canvas.height = bh;
    }

    ids.forEach(function (id) {
      var el = hotspots[id], r = bbox(CONTROLS[id].hit);
      if (!el) return;
      place(el, toPx(r));
      el.style.visibility = overlaps(r, vis) ? '' : 'hidden';
    });

    if (P3.bus) P3.bus.emit('layout', { view: view, scale: m.a, lcdResized: lcdResized });
    return true;
  }

  function schedule() {
    if (!pending) pending = requestAnimationFrame(function () { pending = 0; align(); });
  }

  // Pencere başka DPR'li bir ekrana taşınınca boyut değişmez ama LCD tamponu yeniden kurulmalı.
  function watchDpr() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
    function changed() {
      if (mq.removeEventListener) mq.removeEventListener('change', changed);
      else mq.removeListener(changed);
      schedule();
      watchDpr();
    }
    if (mq.addEventListener) mq.addEventListener('change', changed);
    else mq.addListener(changed);
  }

  // ResizeObserver düzen sonrası, boyamadan önce çağrılır: hizalama aynı karede biter.
  // visualViewport, iOS'ta araç çubuğu açılıp kapanınca tetiklenir.
  function observe() {
    if (observed) return;
    observed = true;
    if (window.ResizeObserver) new ResizeObserver(function () { align(); }).observe(wrap);
    else window.addEventListener('resize', schedule);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule);
    watchDpr();
  }

  // ---------------------------------------------------------------- dış API
  function load() {
    if (loading) return loading;
    loading = fetch(SVG_URL).then(function (res) {
      if (!res.ok) throw new Error(`[p3] cihaz SVG'si alınamadı (${res.status})`);
      return res.text();
    }).then(function (text) {
      var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      var root = doc.documentElement;
      // Yanlış yolda Firebase rewrite'ı index.html döndürür; XML olarak çözülemez.
      if (root.nodeName !== 'svg' || doc.getElementsByTagName('parsererror').length) {
        throw new Error(`[p3] cihaz SVG'si çözümlenemedi`);
      }
      var origs = neutralize(doc);
      mount(root);
      buildLive(origs);
      buildHotspots();
      observe();
      align();
      return api;
    });
    loading.catch(function () { loading = null; });   // sonraki load() yeniden dener
    return loading;
  }

  function toSvg(clientX, clientY) {
    var m = scr;
    if (!m && svg) {
      var c = svg.getScreenCTM();
      if (c && c.a > 0 && c.d > 0) m = c;
    }
    return m ? { x: (clientX - m.e) / m.a, y: (clientY - m.f) / m.d } : null;
  }

  // Sahnenin (= hotspot katmanının) px uzayında kutu; hizalanmadıysa null.
  function controlRect(t) {
    var r = svgRect(t);
    return r && map ? toPx(r) : null;
  }

  // Görünüm istisnası (README §G4): cihaz SVG'sine enjeksiyondan sonra yazılan tek şey viewBox'tır;
  // #p3Live ile birlikte değişir. Load'dan önce çağrılırsa seçim load'da uygulanır.
  function setView(name) {
    if (!VIEWS[name]) return false;
    api.view = view = name;
    if (svg) {
      svg.setAttribute('viewBox', VIEWS[name]);
      live.setAttribute('viewBox', VIEWS[name]);
      align();
    }
    return true;
  }

  function hotspotEl(t) {
    if (t && t.pad) return cells[(7 - t.pad[1]) * 8 + t.pad[0]] || null;
    return hotspots[t] || null;
  }

  var api = P3.dev = {
    load: load,
    svg: null, live: null, view: view, stripDot: null, targetG: null,
    CONTROLS: CONTROLS, GROUPS: GROUPS, PAD: PAD, VIEWS: VIEWS,
    toSvg: toSvg, hitTest: hitTest, padAt: padAt, svgRect: svgRect, controlRect: controlRect,
    align: align, setView: setView, expand: expand, stripY: stripY, stripValue: stripValue,
    glyph: function (id) { return glyphs[id] || null; },
    padEl: function (i) { return pads[i] || null; },
    bar: function (id) { return bars[id] || null; },
    ring: function (id) { return rings[id] || null; },
    hotspotEl: hotspotEl
  };
})();
