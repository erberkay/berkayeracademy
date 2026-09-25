/* Push 3 Laboratuvarı — girdi (p3-input.js)
 *
 * Pointer ve bilgisayar klavyesini tek olay biçimine indirger: P3.bus.emit('in', ev).
 * Sözleşme: docs/push3/README.md §G11, §H1, §H11, karar A6 ve A11; sartname-mobil-erisilebilirlik
 * (dokunma, klavye erişimi), sartname-kontrol-haritasi (Düzen A, kısayollar), dogrulanmis-dsp-web §12.
 * Bu modül yorum yapmaz: modifier kombinasyonları, accent, overlay ve ses p3-modes'undur. Gate
 * (öğretici kilidi, Seviye 1) p3-app'te: bus 'in' → P3.app.gate(ev) → P3.modes.dispatch(ev).
 *
 * Olaylar:
 *   {k:'pad', x, y, down:true, vel, src, t} / {k:'pad', x, y, down:false, src, t}   y alttan, t = performance.now
 *   {k:'btn', id, down:true} / {k:'btn', id, down:false, dt}
 *   {k:'dpad'|'octpage', id, dir, down[, dt]}
 *   {k:'enc', id, turn, steps, fine}  {k:'enc', id, touch}  {k:'enc', id, press:true}  {k:'enc', id, reset:true}
 *   {k:'strip', v, down|move|up:true}
 *
 * SAPMA / EKLEME:
 * - dpad/octpage olayları `id` de taşır (dpadUp, octaveUp …): gate ve öğretici hedefleri kimlikle çalışır.
 *   dt yalnız down:false'ta.
 * - LCD hotspot'una tıklama {k:'btn', id:'lcd', down} verir (Seviye 1'in "Ekran" görevi); modes yok sayar.
 * - Jog yatay fırlatma (sartname-kontrol-haritasi: >20 px, <200 ms): {k:'enc', id:'jog', nudge:'left'|'right'}.
 *   Fırlatmayla karışmasın diye jog dönüşü ilk 200 ms bekletilir. Jog yalnız tam çentikte (15°) olay verir.
 * - Çift tık sıfırlaması yalnız enc1..8'de. Volume, Swing&Tempo ve Jog'da tık = press:true olduğundan çift tık
 *   iki basış olur; bunlar klavyede Delete ile ya da Delete basılıyken dokunarak sıfırlanır.
 * - Delete basılıyken (düğme ya da Backspace) bir encoder'a dokunmak touch:true'nun ardından reset:true verir;
 *   modes'un bunu ayrıca yapması gerekmez (yaparsa store değişmeyen değeri yazmaz, zararsız).
 * - Encoder tıkı: 4 px'ten az hareket sürükleme sayılmaz (dokunmatikte titreme değeri oynatmasın). press
 *   yalnız HOLD_MS'den kısa tıkta: dokunup bekleyince açılan popup'tan sonra bırakmak hedef değiştirmesin.
 * - steps ivmesiz ham px'ten sayılır (enum/int parametreler ivmeyle seçenek atlamasın); turn ivmelidir.
 * - Tekerlek: çentik benzeri olay (|Δ| ≥ 40 px) tam bir çentik; trackpad'in küçük Δ'ları 40 px'te bir çentik.
 * - Ctrl/⌘+Z → Undo düğmesine bas-bırak. Ctrl/⌘+Shift+Z → Shift basılı değilse geçici Shift + Undo
 *   (Push'taki Shift+Undo = Redo); geçici Shift'in down olayı combo:true taşır (öğretici kilidi Undo izinliyse
 *   onu da geçirir). Ctrl/⌘+S → Save (haritada var; modes popup'ını gösterir). Harf e.key'den okunur (TR-F,
 *   AZERTY: Z/S harfinin yeri); e.key Latin harf değilse (Kiril vb.) fiziksel e.code'a düşülür.
 * - Shift tuşu ertelenir: keydown'da Push'un Shift'ine basılmaz. Sonraki tuş (Tab hariç) ya da sahnedeki bir
 *   pointer basışı onu basar; Shift yalnız basılıp bırakılırsa bas-bırak olur. Tab gelirse iptal: Shift+Tab
 *   ile geri gezinmek Push'un Shift'ine basmaz (Seviye 1'de yanlış cevap sayılmaz).
 * - Odaktaki encoder/jog'da Space = Enter (Volume, Swing&Tempo, Jog'da press); odaktaki strip'te Enter/Space
 *   tüketilir ve bir şey yapmaz. İkisi de Play/Record kısayoluna düşmez.
 * - Strip hotspot'unun aria-valuenow (0..100) / aria-valuetext'i S.strip'ten yazılır (pb: −1..1 → 0..100).
 * - Sahne (#p3Stage) kaydırılamaz: odak kısmen görünen bir hotspot'a gelince tarayıcı sahneyi kaydırırsa
 *   hemen geri alınır (P3.dev.toSvg'nin önbellekteki CTM'i eskimesin); pad odağı preventScroll ile taşınır.
 * - Escape her yerde (metin alanı hariç) releaseAll + P3.panic('escape'); sahne odaktaysa ayrıca
 *   {k:'btn', id:'escape', down} (keyup'ta down:false). Tek tuş değil, kbOn kapalıyken de çalışır.
 * - contextmenu: sahnede yalnız engellenir, panic yok. Android'de pad'e uzun basmak contextmenu üretir;
 *   orada panic basılı notayı keserdi. Sahne dışında menü açılırsa (up olayları menüye gider) basılı
 *   bir şey varsa releaseAll + panic.
 * - bus 'panic' (mod değişimi, overlay açılışı…) yalnız pad'leri bırakır; parmak kalkana dek o pointer
 *   yeni nota üretmez. Düğmeler bırakılmaz: Scale basılıyken açılan overlay momentary kalmalı.
 *   blur / visibilitychange(hidden) / pagehide / Escape ise releaseAll (keyup'lar gelmeyecek).
 * - Odak: sahneye (#p3Stage) tabindex=-1 verilir ve pointer etkileşiminde sahne odaklanır; tek tuş kısayolları
 *   (WCAG 2.1.4) sahne ya da içindeki bir kontrol odaktayken çalışır. Odaklı kontrolün kendi tuşları
 *   (slider okları, grid okları, düğmede Enter/Space) önce gelir ve kbOn'dan bağımsızdır.
 * - Klavye odağı (:focus-visible) encoder'a touch verir; fareyle gelen odak vermez (yoksa sürüklenen
 *   encoder odakta kaldıkça dokunulu görünürdü).
 * - Klavye velocity'si (Minus/Equal ±20, 20..127; §I13 alt sınır 20) yalnız bu oturumda tutulur; LCD
 *   popup'ı gösterilir.
 *   BracketLeft/Right S.prefs.kbWin'i (0..4) undo'suz yazar. Shift+Slash bus 'keys' {} yayar (tuş etiketi
 *   katmanı, p3-app / #p3KeysBtn). Slash tek başına Tap Tempo.
 * - Strip klavyeyle: odaktayken ↑/→ +0.1, ↓/← −0.1, PgUp/PgDn ±0.25, Home/End 0/1; tuş basılıyken strip
 *   dokunulu (down/move), bırakınca up. Başlangıç değeri S.strip'ten.
 * - e.repeat tek tuş kısayollarında ve pad tuşlarında yok sayılır; odaktaki slider'da (encoder, strip) ok ve
 *   PgUp/PgDn tekrarları ARIA slider geleneğiyle değeri sürdürür.
 * - macOS'ta ⌘ basılıyken diğer tuşların keyup'ı gelmez: ⌘ bırakılınca klavyeyle basılı her şey bırakılır.
 * - Ek API: P3.input.focus() (sahneyi odaklar; p3-app oyuna girerken çağırmalı), P3.input.kbVelocity(),
 *   P3.input.util (saf yardımcılar; testler için; SHORTCUTS ve KB_ROWS p3-app'in tuş katmanının kaynağı).
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  // ---------------------------------------------------------------- sabitler
  var ENC_PX = 200;          // dikey sürükleme: 200 px = turn 1.0
  var STEP_PX = 24;          // her 24 px bir detent
  var DRAG_PX = 4;           // altı tık
  var WHEEL_TURN = 0.01, WHEEL_PX = 40, WHEEL_IDLE_MS = 300;
  var KEY_TURN = 0.01, PAGE_TURN = 0.1, PAGE_STEPS = 10, RANGE_STEPS = 1000;
  // VARSAYIM: jog iç bölgesinde (yarıçapın %30'u) açı kararsız; orada dikey sürükleme 24 px = 15° sayılır.
  var JOG_DEG = 15, JOG_INNER = 0.3, JOG_PX_DEG = 15 / 24;
  var FLICK_MS = 200, FLICK_PX = 20;
  var TAP_SLOP = 20;         // çift tıkın iki basışı arasındaki en büyük uzaklık (px)
  var VEL_FIXED = 100, VEL_LO = 40, VEL_HI = 127, KB_VEL_STEP = 20, KB_VEL_MIN = 20;   // §I13
  var STRIP_KEY = 0.1, STRIP_PAGE = 0.25;

  // Düzen A (sartname-kontrol-haritasi): üstten alta klavye sıraları; sıra r → pad satırı y = kbWin + 3 - r.
  var KB_ROWS = [
    ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'],
    ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI'],
    ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'],
    ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma']
  ];
  var KB_WIN_MAX = 4;

  // Basılı tutulan kısayollar: keydown = düğmeye bas, keyup = bırak (Scale/Delete/Shift süreye bağlı).
  var SHORTCUTS = {
    Space: 'play', Enter: 'record', Slash: 'tapTempo', Digit9: 'scale', Digit0: 'layout',
    Period: 'repeat', Backquote: 'accent', Backspace: 'delete', ShiftLeft: 'shift', ShiftRight: 'shift',
    Backslash: 'select', ArrowUp: 'octaveUp', ArrowDown: 'octaveDown', ArrowLeft: 'pageLeft', ArrowRight: 'pageRight'
  };

  var PRESS_ENC = { volume: 1, swingTempo: 1, jog: 1 };
  var SHIFT_CODE = { ShiftLeft: 1, ShiftRight: 1 };

  // ---------------------------------------------------------------- saf yardımcılar
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function trunc(v) { return v < 0 ? Math.ceil(v) : Math.floor(v); }

  // VARSAYIM: şartnamedeki "hız" px/ms (1.5 px/ms = 1500 px/s'de ivme 2×, 4.5 px/ms'de tavan 4×).
  function accel(speed) { return 1 + Math.min(3, speed / 1.5); }

  // Dikey sürükleme örneği → {turn, steps}. st = {speed, acc} sürükleme boyunca yaşar.
  // dy ekran px (aşağı +), dt ms, speed px/ms (yumuşatılmış). fine'da ivme yok; ×0.1'i wtp/modes uygular (§H1).
  function encDrag(st, dy, dt, fine) {
    var inst = Math.abs(dy) / Math.max(1, dt);
    st.speed = st.speed == null ? inst : st.speed * 0.5 + inst * 0.5;
    var up = -dy;
    st.acc += up;
    var steps = trunc(st.acc / STEP_PX);
    st.acc -= steps * STEP_PX;
    return { turn: up / ENC_PX * (fine ? 1 : accel(st.speed)), steps: steps };
  }

  // Tekerlek olayı → çentik (+1 yukarı, −1 aşağı, 0 henüz yok). st = {acc, t}.
  function wheelNotch(st, deltaY, deltaX, deltaMode, t) {
    var d = deltaY || deltaX || 0;   // Shift+tekerlek macOS'ta yatay kaydırmaya döner
    if (deltaMode === 1) d *= 16; else if (deltaMode === 2) d *= 400;
    if (!d) return 0;
    if (t - st.t > WHEEL_IDLE_MS || (st.acc && (st.acc < 0) !== (d < 0))) st.acc = 0;
    st.t = t;
    if (Math.abs(d) >= WHEEL_PX) { st.acc = 0; return d < 0 ? 1 : -1; }
    st.acc += d;
    if (Math.abs(st.acc) < WHEEL_PX) return 0;
    d = st.acc;
    st.acc = 0;
    return d < 0 ? 1 : -1;
  }

  // Düzen A: e.code → [x, y] (y alttan) | null.
  function kbPad(code, win) {
    win = clamp(win | 0, 0, KB_WIN_MAX);
    for (var r = 0; r < KB_ROWS.length; r++) {
      var c = KB_ROWS[r].indexOf(code);
      if (c >= 0) return [c, win + 3 - r];
    }
    return null;
  }

  // Jog: iki nokta arası dönüş (derece, saat yönü +). İç bölgede dikey sürüklemeye düşer (yukarı +).
  function jogDelta(a, b, c, R) {
    var ra = Math.sqrt((a.x - c.x) * (a.x - c.x) + (a.y - c.y) * (a.y - c.y));
    var rb = Math.sqrt((b.x - c.x) * (b.x - c.x) + (b.y - c.y) * (b.y - c.y));
    if (ra >= R * JOG_INNER && rb >= R * JOG_INNER) {
      var d = (Math.atan2(b.y - c.y, b.x - c.x) - Math.atan2(a.y - c.y, a.x - c.x)) * 180 / Math.PI;
      return d > 180 ? d - 360 : d < -180 ? d + 360 : d;
    }
    return -(b.y - a.y) * JOG_PX_DEG;
  }

  function flickDir(dx, dy, dt) {
    if (dt >= FLICK_MS || Math.abs(dx) <= FLICK_PX || Math.abs(dx) <= 2 * Math.abs(dy)) return null;
    return dx < 0 ? 'left' : 'right';
  }

  // Karar A6 'position': pad içi yükseklik (0 alt kenar, 1 üst kenar) → 40..127.
  function posVel(frac) { return Math.round(VEL_LO + clamp(frac, 0, 1) * (VEL_HI - VEL_LO)); }

  // Çapraz bölünmüş kareler (D-pad, Octave/Page): hotspot'un clip-path'ine güvenmeden koordinattan yaprak kimlik.
  // Nokta başka gruba düşerse (kenar) basılan hotspot'un kimliği kalır.
  function groupLeaf(id, p) {
    var dev = P3.dev, c = dev && dev.CONTROLS[id];
    if (!c || !c.group || !p || typeof dev.hitTest !== 'function') return id;
    var hit = dev.hitTest(p.x, p.y), h = typeof hit === 'string' && dev.CONTROLS[hit];
    return h && h.group === c.group ? hit : id;
  }

  // ---------------------------------------------------------------- durum
  var inited = false, layer = null, stage = null;
  var padPtrs = {};     // pointerId → {x, y, src}   x < 0: parmak pad dışında
  var btnPtrs = {};     // pointerId → kontrol id
  var encPtrs = {};     // pointerId → encoder sürükleme durumu
  var btns = {};        // kontrol id → {t0, src:{kaynak:1}}   btn, dpad, octpage
  var keyHeld = {};     // e.code → {kind:'pad'|'btn'|'strip'|'escape', …}
  var touches = {};     // enc id → {hover, focus, n}
  var wheels = {};      // enc id → {acc, t}
  var strip = null;     // {src, v, keys}
  var lastTap = null;   // {id, t, x, y}
  var kbVel = null;

  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  // Olay zamanı performance.now tabanında; eski tarayıcıların epoch damgası yerine şimdi.
  function evTime(e) {
    var t = e && e.timeStamp, n = now();
    return t > 0 && Math.abs(n - t) < 60000 ? t : n;
  }

  function emit(ev) { P3.bus.emit('in', ev); }
  function ctl(id) { return P3.dev && P3.dev.CONTROLS ? P3.dev.CONTROLS[id] : null; }
  function prefs() { return P3.S && P3.S.prefs; }
  function kbOn() { var p = prefs(); return !p || p.kbOn !== false; }
  function kbWin() { var p = prefs(); return p ? clamp(p.kbWin | 0, 0, KB_WIN_MAX) : 0; }
  function keysOf(o) { return Object.keys(o); }
  function popup(text, sub) { if (P3.lcd && typeof P3.lcd.popup === 'function') P3.lcd.popup(text, sub); }
  function isFine(e) { return !!(e && e.shiftKey) || !!btns.shift; }

  function capture(el, pid) {
    try { el.setPointerCapture(pid); } catch (err) { /* sentetik olay ya da bitmiş pointer */ }
  }

  function toSvg(e) { return P3.dev && P3.dev.toSvg ? P3.dev.toSvg(e.clientX, e.clientY) : null; }

  // Olay hedefinden katman içindeki hotspot'a (data-id'li ilk ata). Pad hücreleri yüzeye çıkar.
  function hotspotOf(t) {
    for (; t && t !== layer; t = t.parentNode) {
      if (t.getAttribute && t.getAttribute('data-id')) return t;
    }
    return null;
  }

  // ---------------------------------------------------------------- düğmeler (btn, dpad, octpage)
  // Aynı kontrole birden çok kaynak basabilir (iki parmak, parmak + tuş): ilk basış down, son bırakış up.
  function ctlEvent(id, down) {
    var c = ctl(id);
    if (c && (c.kind === 'dpad' || c.kind === 'octpage')) return { k: c.kind, id: id, dir: c.dir, down: down };
    return { k: 'btn', id: id, down: down };
  }

  // combo: Ctrl/⌘ kombinasyonunun sentezlediği basış (down olayı combo:true taşır).
  function press(id, src, combo) {
    var b = btns[id];
    if (b) { b.src[src] = 1; return; }
    b = btns[id] = { t0: now(), src: {} };
    b.src[src] = 1;
    var ev = ctlEvent(id, true);
    if (combo) ev.combo = true;
    emit(ev);
  }

  function release(id, src) {
    var b = btns[id];
    if (!b || !b.src[src]) return;
    delete b.src[src];
    if (keysOf(b.src).length) return;
    delete btns[id];
    var ev = ctlEvent(id, false);
    ev.dt = now() - b.t0;
    emit(ev);
  }

  function tap(id, src) { press(id, src); release(id, src); }

  // ---------------------------------------------------------------- encoder dokunma
  // Dokunma kaynakları: fare/kalem hover, klavye odağı, basılı pointer sayısı. Biri varsa touch:true.
  function setTouch(id, key, on) {
    var t = touches[id] || (touches[id] = { hover: false, focus: false, n: 0 });
    var was = t.hover || t.focus || t.n > 0;
    if (key === 'n') t.n = Math.max(0, t.n + (on ? 1 : -1));
    else t[key] = on;
    var is = t.hover || t.focus || t.n > 0;
    if (is === was) return;
    emit({ k: 'enc', id: id, touch: is });
    if (is && btns['delete']) emit({ k: 'enc', id: id, reset: true });   // Delete + dokunma
  }

  // ---------------------------------------------------------------- pad yüzeyi
  function padVel(xy, p) {
    var pr = prefs();
    if (!pr || pr.velMode !== 'position' || !p || !P3.dev.svgRect) return VEL_FIXED;
    var r = P3.dev.svgRect({ pad: xy });
    return r ? posVel((r.y + r.h - p.y) / r.h) : VEL_FIXED;
  }

  // Koordinattan pad (karar: tek yakalama yüzeyi, padAt(toSvg)). p = SVG birimi nokta.
  function padHitAt(p) {
    var xy = P3.dev.padAt(p.x, p.y);
    return xy ? { x: xy[0], y: xy[1], vel: padVel(xy, p) } : null;
  }

  // Katman henüz hizalanmadıysa (toSvg null) basılan hücre elemanı yedektir. Yalnız pointerdown'da:
  // capture'dan sonra hedef hep yüzeyin kendisidir.
  function cellHit(target) {
    for (var t = target; t && t !== layer; t = t.parentNode) {
      if (t.getAttribute && t.getAttribute('data-x') != null) {
        return { x: +t.getAttribute('data-x'), y: +t.getAttribute('data-y'), vel: VEL_FIXED };
      }
    }
    return null;
  }

  function padOn(st, hit, t) {
    st.x = hit.x; st.y = hit.y;
    emit({ k: 'pad', x: hit.x, y: hit.y, down: true, vel: hit.vel, src: st.src, t: t });
  }

  // İdempotent: pad'i bırakılmış bir kayıt ikinci kez up üretmez.
  function padOff(st, t) {
    if (st.x < 0) return;
    var x = st.x, y = st.y;
    st.x = st.y = -1;
    emit({ k: 'pad', x: x, y: y, down: false, src: st.src, t: t });
  }

  function padDown(e) {
    var pid = e.pointerId, st = padPtrs[pid];
    if (st) padOff(st, evTime(e));
    st = padPtrs[pid] = { x: -1, y: -1, src: 'p' + pid };
    var p = toSvg(e), hit = p ? padHitAt(p) : cellHit(e.target);
    if (hit) padOn(st, hit, evTime(e));
  }

  // Glissando: pad değişince eskisi up, yenisi down (aynı src). Hızlı kaydırmada ara pad'ler
  // birleştirilmiş örneklerden yakalanır (sentetik olaylarda liste boş gelir). Konumu
  // hesaplanamayan örnek (katman hizasız) notayı kesmez, atlanır.
  function padMove(e, st) {
    var list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
    if (!list || !list.length) list = [e];
    for (var i = 0; i < list.length; i++) {
      var s = list[i], p = toSvg(s);
      if (!p) continue;
      var hit = padHitAt(p), t = evTime(s);
      if (hit && hit.x === st.x && hit.y === st.y) continue;
      if (!hit && st.x < 0) continue;
      padOff(st, t);
      if (hit) padOn(st, hit, t);
    }
  }

  function releasePads() {
    var t = now();
    keysOf(padPtrs).forEach(function (pid) { padOff(padPtrs[pid], t); });
    padPtrs = {};
    keysOf(keyHeld).forEach(function (code) {
      var h = keyHeld[code];
      if (h.kind !== 'pad') return;
      delete keyHeld[code];
      padOff(h, t);
    });
  }

  // ---------------------------------------------------------------- encoder'lar ve jog
  function encDown(e, id, el) {
    var t = evTime(e), st = encPtrs[e.pointerId] = {
      id: id, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: t, t: t,
      moved: false, reset: false, drag: { speed: null, acc: 0 }, pend: 0, jacc: 0, c: null, R: 0
    };
    if (id === 'jog' && el.getBoundingClientRect) {
      var r = el.getBoundingClientRect();
      st.c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      st.R = r.width / 2;
    }
    setTouch(id, 'n', true);
    if (!PRESS_ENC[id] && lastTap && lastTap.id === id && t - lastTap.t < P3.K.DOUBLE_MS &&
        Math.abs(e.clientX - lastTap.x) + Math.abs(e.clientY - lastTap.y) < TAP_SLOP) {
      lastTap = null;
      st.reset = true;
      emit({ k: 'enc', id: id, reset: true });
    }
  }

  function jogEmit(st, deg, fine) {
    st.jacc += deg;
    var steps = trunc(st.jacc / JOG_DEG);
    if (!steps) return;
    st.jacc -= steps * JOG_DEG;
    emit({ k: 'enc', id: 'jog', turn: steps * JOG_DEG / 360, steps: steps, fine: fine });
  }

  function encMove(e, st) {
    var x = e.clientX, y = e.clientY, t = evTime(e), fine = isFine(e);
    if (!st.moved) {
      var dist = Math.abs(x - st.x0) + Math.abs(y - st.y0);
      if (dist < DRAG_PX) return;
      st.moved = true;
      // Tıkın titremesi (ilk DRAG_PX) değere karışmaz ama eşiği aşan kısım sayılır: referans başlangıçtan
      // eşik kadar ilerletilir ve bu olayın kalanı aşağıda işlenir. Hızlı bir sürükleme (trackpad fırlatması,
      // hızlı dokunmatik kaydırma) tek büyük olayla gelirse mesafesinin tamamı kaybolmasın diye.
      var k = DRAG_PX / dist;
      st.x = st.x0 + (x - st.x0) * k; st.y = st.y0 + (y - st.y0) * k;
    }
    if (st.id === 'jog') {
      var deg = st.c ? jogDelta({ x: st.x, y: st.y }, { x: x, y: y }, st.c, st.R) : -(y - st.y) * JOG_PX_DEG;
      if (t - st.t0 < FLICK_MS) st.pend += deg;          // fırlatma mı dönüş mü, henüz belli değil
      else { jogEmit(st, deg + st.pend, fine); st.pend = 0; }
    } else {
      var r = encDrag(st.drag, y - st.y, t - st.t, fine);
      if (r.turn || r.steps) emit({ k: 'enc', id: st.id, turn: r.turn, steps: r.steps, fine: fine });
    }
    st.x = x; st.y = y; st.t = t;
  }

  function encEnd(e, st, cancelled) {
    var t = evTime(e), dur = t - st.t0;
    if (st.id === 'jog' && st.moved && !cancelled) {
      var dir = flickDir(e.clientX - st.x0, e.clientY - st.y0, dur);
      if (dir) emit({ k: 'enc', id: 'jog', nudge: dir });
      else if (st.pend) jogEmit(st, st.pend, isFine(e));
    }
    if (!st.moved && !cancelled && !st.reset && dur < P3.K.HOLD_MS) {
      if (PRESS_ENC[st.id]) emit({ k: 'enc', id: st.id, press: true });
      else lastTap = { id: st.id, t: t, x: e.clientX, y: e.clientY };
    }
    setTouch(st.id, 'n', false);
  }

  // ---------------------------------------------------------------- touch strip
  function stripValueAt(e, el) {
    var p = toSvg(e);
    if (p && P3.dev.stripValue) return P3.dev.stripValue(p.y);
    var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    return r && r.height ? clamp(1 - (e.clientY - r.top) / r.height, 0, 1) : 0.5;
  }

  function stripStart(src, v) {
    strip = { src: src, v: v, keys: 0 };
    emit({ k: 'strip', v: v, down: true });
  }

  function stripTo(v) {
    if (!strip || v === strip.v) return;
    strip.v = v;
    emit({ k: 'strip', v: v, move: true });
  }

  function stripEnd() {
    if (!strip) return;
    var v = strip.v;
    strip = null;
    emit({ k: 'strip', v: v, up: true });
  }

  // Klavye başlangıcı: modes'un tuttuğu değer (PB −1..1 → 0..1; Mod 0..1).
  function stripStateValue() {
    var s = P3.S && P3.S.strip;
    if (!s) return 0.5;
    return s.mode === 'mod' ? clamp(+s.mod || 0, 0, 1) : clamp(((+s.pb || 0) + 1) / 2, 0, 1);
  }

  // ---------------------------------------------------------------- pointer dağıtımı
  function focusStage() {
    if (!stage || document.activeElement === stage || typeof stage.focus !== 'function') return;
    try { stage.focus({ preventScroll: true }); } catch (err) { /* eski tarayıcı */ }
  }

  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var hs = hotspotOf(e.target), id = hs && hs.getAttribute('data-id'), c = id && ctl(id);
    if (!c) return;
    e.preventDefault();
    flushShift();   // klavye Shift'i basılıyken dokunuş: Push'ta Shift + kontrol
    capture(hs, e.pointerId);   // her zaman: parmak yüzeyden çıkıp orada kalksa da up bize gelir
    focusStage();
    var pid = e.pointerId;
    if (c.kind === 'pad') padDown(e);
    else if (c.kind === 'enc') encDown(e, id, hs);
    else if (c.kind === 'strip') { if (!strip) stripStart('p' + pid, stripValueAt(e, hs)); }
    else {
      if (c.group) id = groupLeaf(id, toSvg(e));
      btnPtrs[pid] = id;
      press(id, 'p' + pid);
    }
  }

  function onMove(e) {
    var pid = e.pointerId;
    if (padPtrs[pid]) padMove(e, padPtrs[pid]);
    else if (encPtrs[pid]) encMove(e, encPtrs[pid]);
    else if (strip && strip.src === 'p' + pid) stripTo(stripValueAt(e, hotspotOf(e.target)));
  }

  // pointerup, pointercancel ve lostpointercapture aynı yere gelir; ilki durumu siler, sonrakiler boşa düşer.
  function endPointer(e, cancelled) {
    var pid = e.pointerId, st;
    if ((st = padPtrs[pid])) {
      delete padPtrs[pid];
      padOff(st, evTime(e));
    }
    if (btnPtrs[pid] != null) {
      var id = btnPtrs[pid];
      delete btnPtrs[pid];
      release(id, 'p' + pid);
    }
    if ((st = encPtrs[pid])) {
      delete encPtrs[pid];
      encEnd(e, st, cancelled);
    }
    if (strip && strip.src === 'p' + pid) stripEnd();
  }

  function onUp(e) { endPointer(e, false); }
  function onCancel(e) { endPointer(e, true); }

  function encOf(t) {
    var hs = hotspotOf(t), id = hs && hs.getAttribute('data-id'), c = id && ctl(id);
    return c && c.kind === 'enc' ? id : null;
  }

  // Fare/kalem hover = dokunma. pointerenter/leave kabarcıklanmadığı için over/out + relatedTarget.
  function onOver(e) {
    if (e.pointerType === 'touch') return;
    var id = encOf(e.target);
    if (id && encOf(e.relatedTarget) !== id) setTouch(id, 'hover', true);
  }

  function onOut(e) {
    if (e.pointerType === 'touch') return;
    var id = encOf(e.target);
    if (id && encOf(e.relatedTarget) !== id) setTouch(id, 'hover', false);
  }

  function focusVisible(el) {
    try { return el.matches(':focus-visible'); } catch (err) { return true; }
  }

  function onFocusIn(e) {
    var id = encOf(e.target);
    if (id && focusVisible(e.target)) setTouch(id, 'focus', true);
  }

  function onFocusOut(e) {
    var id = encOf(e.target);
    if (id) setTouch(id, 'focus', false);
  }

  function onWheel(e) {
    if (e.ctrlKey) return;   // trackpad pinch: sayfa yakınlaştırması tarayıcıya kalsın
    var id = encOf(e.target);
    if (!id) return;
    e.preventDefault();
    var st = wheels[id] || (wheels[id] = { acc: 0, t: -Infinity });
    var n = wheelNotch(st, e.deltaY, e.deltaX, e.deltaMode, evTime(e));
    if (!n) return;
    if (id === 'jog') emit({ k: 'enc', id: id, turn: n * JOG_DEG / 360, steps: n, fine: false });
    else emit({ k: 'enc', id: id, turn: n * WHEEL_TURN, steps: n, fine: isFine(e) });
  }

  function onMouseDown(e) {
    // Yerel odak ve metin seçimi olmasın; odak focusStage ile sahneye gider.
    if (hotspotOf(e.target)) e.preventDefault();
  }

  // ---------------------------------------------------------------- klavye
  function stageHasFocus() {
    var ae = document.activeElement;
    return !!(stage && ae && (ae === stage || stage.contains(ae)));
  }

  function isNative(el) {
    return !!el && (/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(el.tagName || '') || !!el.isContentEditable);
  }

  function isTextField(el) {
    return !!el && (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName || '') || !!el.isContentEditable);
  }

  function kbVelocity() {
    if (kbVel == null) kbVel = P3.K.kbVel;
    return kbVel;
  }

  function keyPad(code, x, y, shift) {
    if (keyHeld[code]) return;
    var st = keyHeld[code] = { kind: 'pad', x: -1, y: -1, src: 'key:' + code };
    padOn(st, { x: x, y: y, vel: shift ? P3.K.kbVelShift : kbVelocity() }, now());
  }

  function keyBtn(code, id) {
    if (keyHeld[code]) return;
    keyHeld[code] = { kind: 'btn', id: id, src: 'key:' + code };
    press(id, 'key:' + code);
  }

  // Ertelenen Shift (Shift+Tab Push'un Shift'ine basmasın): keydown yalnız işaretler.
  function keyShift(code) {
    if (keyHeld[code]) return;
    keyHeld[code] = { kind: 'shiftPend', id: 'shift', src: 'key:' + code };
  }

  // Bekleyen Shift'i gerçek basışa çevirir (sonraki tuş ya da pointer basışı gelince).
  function flushShift() {
    keysOf(keyHeld).forEach(function (code) {
      var h = keyHeld[code];
      if (h.kind !== 'shiftPend') return;
      h.kind = 'btn';
      press(h.id, h.src);
    });
  }

  function cancelShift() {
    keysOf(keyHeld).forEach(function (code) { if (keyHeld[code].kind === 'shiftPend') delete keyHeld[code]; });
  }

  function keyStrip(code, delta, abs) {
    if (strip && strip.src !== 'key') return;   // parmak strip'teyken klavye karışmaz
    var from = strip ? strip.v : stripStateValue();
    var v = clamp(abs != null ? abs : Math.round((from + delta) * 1000) / 1000, 0, 1);
    if (!strip) stripStart('key', v); else stripTo(v);
    if (!keyHeld[code]) { keyHeld[code] = { kind: 'strip' }; strip.keys++; }
  }

  // tapPending: bekleyen Shift yalnız basılıp bırakıldı (keyup) → bas-bırak; releaseAll'da basılmaz.
  function endKey(h, t, tapPending) {
    if (h.kind === 'pad') padOff(h, t);
    else if (h.kind === 'btn') release(h.id, h.src);
    else if (h.kind === 'shiftPend') { if (tapPending) tap(h.id, h.src); }
    else if (h.kind === 'strip') { if (strip && strip.src === 'key' && --strip.keys <= 0) stripEnd(); }
    else if (h.kind === 'escape') emit({ k: 'btn', id: 'escape', down: false, dt: now() - h.t0 });
  }

  function releaseKeys() {
    var held = keyHeld, t = now();
    keyHeld = {};
    keysOf(held).forEach(function (code) { endKey(held[code], t); });
  }

  // Odaktaki pad hücresi: oklar roving odağı taşır (y alttan: ↑ = y+1), Enter/Space çalar.
  function gridKey(e, cell) {
    var x = +cell.getAttribute('data-x'), y = +cell.getAttribute('data-y'), nx = x, ny = y, ctrl = e.ctrlKey || e.metaKey;
    switch (e.code) {
      case 'ArrowUp': ny = Math.min(7, y + 1); break;
      case 'ArrowDown': ny = Math.max(0, y - 1); break;
      case 'ArrowLeft': nx = Math.max(0, x - 1); break;
      case 'ArrowRight': nx = Math.min(7, x + 1); break;
      case 'Home': nx = 0; if (ctrl) ny = 7; break;
      case 'End': nx = 7; if (ctrl) ny = 0; break;
      case 'Enter': case 'Space':
        if (!e.repeat) keyPad(e.code, x, y, e.shiftKey);
        return true;
      default: return false;
    }
    if (ctrl && e.code.indexOf('Arrow') === 0) return false;
    var next = P3.dev.hotspotEl && P3.dev.hotspotEl({ pad: [nx, ny] });
    if (next && next !== cell) {
      cell.tabIndex = -1;
      next.tabIndex = 0;
      // Kısmen görünen pad'e odak sahneyi kaydırmasın (katman hizası bozulur).
      try { next.focus({ preventScroll: true }); } catch (err) { next.focus(); }
    }
    return true;
  }

  // Odaktaki encoder slider'ı (sartname-mobil erişilebilirlik tablosu, §G11).
  function encKey(e, id) {
    var n, turn, fine = e.shiftKey;
    switch (e.code) {
      case 'ArrowUp': case 'ArrowRight': n = 1; turn = KEY_TURN; break;
      case 'ArrowDown': case 'ArrowLeft': n = -1; turn = -KEY_TURN; break;
      case 'PageUp': n = PAGE_STEPS; turn = PAGE_TURN; break;
      case 'PageDown': n = -PAGE_STEPS; turn = -PAGE_TURN; break;
      case 'Home': n = -RANGE_STEPS; turn = -1; fine = false; break;
      case 'End': n = RANGE_STEPS; turn = 1; fine = false; break;
      case 'Enter': case 'Space':   // Space de: Play kısayoluna düşmesin
        if (!e.repeat && PRESS_ENC[id]) emit({ k: 'enc', id: id, press: true });
        return true;
      case 'Delete':
        if (!e.repeat) emit({ k: 'enc', id: id, reset: true });
        return true;
      default: return false;
    }
    if (id === 'jog') { turn = n * JOG_DEG / 360; fine = false; }
    emit({ k: 'enc', id: id, turn: turn, steps: n, fine: fine });
    return true;
  }

  function stripKey(e) {
    switch (e.code) {
      case 'ArrowUp': case 'ArrowRight': keyStrip(e.code, STRIP_KEY); return true;
      case 'ArrowDown': case 'ArrowLeft': keyStrip(e.code, -STRIP_KEY); return true;
      case 'PageUp': keyStrip(e.code, STRIP_PAGE); return true;
      case 'PageDown': keyStrip(e.code, -STRIP_PAGE); return true;
      case 'Home': if (!e.repeat) keyStrip(e.code, 0, 0); return true;
      case 'End': if (!e.repeat) keyStrip(e.code, 0, 1); return true;
      case 'Enter': case 'Space': return true;   // strip'in basışı yok; Record/Play kısayoluna düşmesin
      default: return false;
    }
  }

  // Odaktaki kontrolün kendi tuşları; kbOn'dan bağımsız (erişilebilirlik). true = tüketildi.
  function focusedKey(e, ae) {
    var hs = hotspotOf(ae), id = hs && hs.getAttribute('data-id'), c = id && ctl(id);
    if (!c) return false;
    if (c.kind === 'pad') return ae !== hs && gridKey(e, ae);
    if (e.ctrlKey || e.metaKey) return false;
    if (c.kind === 'enc') return encKey(e, id);
    if (c.kind === 'strip') return stripKey(e);
    if (e.code !== 'Enter' && e.code !== 'Space') return false;
    if (!e.repeat) keyBtn(e.code, id);
    return true;
  }

  // Ctrl/⌘ kombinasyonları: tek tuş değil, kbOn'dan bağımsız (yine de yalnız sahne odaktayken).
  // Kombinasyon harfi: kullanıcının düzenindeki harf (e.key); Latin harf değilse fiziksel tuş (e.code).
  function comboLetter(e) {
    var k = typeof e.key === 'string' ? e.key.toLowerCase() : '';
    if (/^[a-z]$/.test(k)) return k;
    var m = /^Key([A-Z])$/.exec(e.code || '');
    return m ? m[1].toLowerCase() : '';
  }

  function comboKey(e) {
    var letter = comboLetter(e);
    if (letter === 'z') {
      if (e.repeat) return true;
      if (!e.shiftKey) tap('undo', 'key:combo');
      else {
        var synth = !btns.shift;   // Push'ta Redo = Shift+Undo
        if (synth) press('shift', 'key:combo', true);
        tap('undo', 'key:combo');
        if (synth) release('shift', 'key:combo');
      }
      return true;
    }
    if (letter === 's') {
      if (!e.repeat) tap('save', 'key:combo');
      return true;
    }
    return false;
  }

  function setKbVel(d) {
    kbVel = clamp(kbVelocity() + d, KB_VEL_MIN, 127);
    popup('Key Velocity', String(kbVel));
  }

  function setKbWin(d) {
    var w = clamp(kbWin() + d, 0, KB_WIN_MAX);
    if (P3.store && P3.store.S) P3.store.set('prefs.kbWin', w);
    popup('Keyboard', `Pad rows ${w + 1}-${w + 4}`);
  }

  // Tek tuş kısayolları ve Düzen A (yalnız sahne odakta + kbOn; WCAG 2.1.4).
  function shortcutKey(e) {
    var code = e.code;
    if (code === 'Slash' && e.shiftKey) { P3.bus.emit('keys', {}); return true; }
    if (SHORTCUTS[code] === 'shift') { keyShift(code); return true; }
    if (SHORTCUTS[code]) { keyBtn(code, SHORTCUTS[code]); return true; }
    var xy = kbPad(code, kbWin());
    if (xy) { keyPad(code, xy[0], xy[1], e.shiftKey); return true; }
    if (code === 'Minus' || code === 'Equal') { setKbVel(code === 'Equal' ? KB_VEL_STEP : -KB_VEL_STEP); return true; }
    if (code === 'BracketLeft' || code === 'BracketRight') { setKbWin(code === 'BracketRight' ? 1 : -1); return true; }
    return false;
  }

  function isShortcut(code) {
    return !!SHORTCUTS[code] || !!kbPad(code, 0) || /^(Slash|Minus|Equal|BracketLeft|BracketRight)$/.test(code);
  }

  function escapeKey(e) {
    if (e.repeat) return;
    releaseAll();
    P3.panic('escape');
    if (stageHasFocus()) {
      keyHeld.Escape = { kind: 'escape', t0: now() };
      emit({ k: 'btn', id: 'escape', down: true });
    }
  }

  function onKeyDown(e) {
    if (e.defaultPrevented || e.isComposing || !e.code) return;   // IME ve kodsuz sanal klavye tuşları
    var ae = document.activeElement;
    if (e.code === 'Escape') { if (!isTextField(ae)) escapeKey(e); return; }
    if (e.code === 'Tab') { cancelShift(); return; }   // Shift+Tab: geri gezinme, Push'un Shift'i değil
    if (!stageHasFocus() || isNative(ae)) return;   // koç balonundaki gibi gerçek düğmeler kendi tuşlarını kullanır
    if (e.altKey) return;
    if (!SHIFT_CODE[e.code]) flushShift();
    if (ae !== stage && focusedKey(e, ae)) { e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey) { if (comboKey(e)) e.preventDefault(); return; }
    if (!kbOn()) return;
    if (e.repeat) { if (isShortcut(e.code)) e.preventDefault(); return; }
    if (shortcutKey(e)) e.preventDefault();
  }

  function onKeyUp(e) {
    if (e.key === 'Meta' || e.code === 'MetaLeft' || e.code === 'MetaRight') { releaseKeys(); return; }
    var h = keyHeld[e.code];
    if (!h) return;
    delete keyHeld[e.code];
    endKey(h, now(), stageHasFocus());
  }

  // ---------------------------------------------------------------- panik ve yaşam döngüsü
  function anyHeld() {
    return keysOf(padPtrs).length + keysOf(btns).length + keysOf(keyHeld).length + keysOf(encPtrs).length > 0 || !!strip;
  }

  // Basılı her şeyi bırakır ve up olaylarını yayar. P3.panic çağırmaz (çağıran karar verir).
  function releaseAll() {
    releaseKeys();
    releasePads();
    var ptrs = btnPtrs;
    btnPtrs = {};
    keysOf(ptrs).forEach(function (pid) { release(ptrs[pid], 'p' + pid); });
    keysOf(btns).forEach(function (id) {            // kalan kaynaklar (ör. yarım kalmış kombinasyon)
      var b = btns[id];
      delete btns[id];
      emit(Object.assign(ctlEvent(id, false), { dt: now() - b.t0 }));
    });
    stripEnd();
    encPtrs = {};
    keysOf(touches).forEach(function (id) {
      var t = touches[id], was = t.hover || t.focus || t.n > 0;
      t.hover = t.focus = false;
      t.n = 0;
      if (was) emit({ k: 'enc', id: id, touch: false });
    });
    wheels = {};
    lastTap = null;
  }

  function panicAll(reason) {
    releaseAll();
    P3.panic(reason);
  }

  function onContextMenu(e) {
    if (stage && stage.contains(e.target)) { e.preventDefault(); return; }
    if (anyHeld()) panicAll('contextmenu');
  }

  function onVisibility() { if (document.visibilityState === 'hidden') panicAll('hidden'); }
  function onBlur(e) { if (!e || e.target === window || e.target === document) panicAll('blur'); }
  function onPageHide() { panicAll('pagehide'); }

  // Strip slider'ının erişilebilir değeri (p3-device yer tutucu 0 yazar; değeri tutan S.strip).
  function syncStripAria() {
    var el = P3.dev && typeof P3.dev.hotspotEl === 'function' ? P3.dev.hotspotEl('strip') : null;
    var s = P3.S && P3.S.strip;
    if (!el || !el.setAttribute || !s) return;
    var mod = s.mode === 'mod', v = stripStateValue(), pb = clamp(+s.pb || 0, -1, 1), txt;
    if (mod) txt = `Mod Wheel ${Math.round(v * 100)}%`;
    else txt = `Pitch Bend ${pb > 0 ? '+' : ''}${Math.round(pb * 100)}%`;
    el.setAttribute('aria-valuenow', String(Math.round(v * 100)));
    el.setAttribute('aria-valuetext', txt);
  }

  function onState(ch) {
    if (ch && (ch.path === 'prefs.kbOn' || ch.path === '*') && !kbOn()) releaseKeys();
    if (ch && (ch.path === '*' || /^strip(\.|$)/.test(String(ch.path)))) syncStripAria();
  }

  // overflow:clip desteklemeyen tarayıcıda odak sahneyi kaydırırsa geri al (toSvg önbellekteki CTM'i kullanır).
  function onStageScroll() {
    if (stage && (stage.scrollTop || stage.scrollLeft)) { stage.scrollTop = 0; stage.scrollLeft = 0; }
  }

  // ---------------------------------------------------------------- dış API
  function init() {
    if (inited) return true;
    layer = document.getElementById('p3HotspotLayer');
    stage = document.getElementById('p3Stage');
    if (!layer) { console.warn('[p3] #p3HotspotLayer yok; girdi kurulamadı'); return false; }
    inited = true;
    if (stage && !stage.hasAttribute('tabindex')) stage.tabIndex = -1;

    // Tek dinleyici kümesi katmanda: hotspot'lar ve pad yüzeyi yeniden kurulsa da geçerli.
    layer.addEventListener('pointerdown', onDown);
    layer.addEventListener('pointermove', onMove);
    layer.addEventListener('pointerup', onUp);
    layer.addEventListener('pointercancel', onCancel);
    layer.addEventListener('lostpointercapture', onCancel);
    layer.addEventListener('pointerover', onOver);
    layer.addEventListener('pointerout', onOut);
    layer.addEventListener('mousedown', onMouseDown);
    layer.addEventListener('wheel', onWheel, { passive: false });
    layer.addEventListener('focusin', onFocusIn);
    layer.addEventListener('focusout', onFocusOut);
    if (stage) stage.addEventListener('scroll', onStageScroll);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('blur', onBlur);

    P3.bus.on('panic', releasePads);
    P3.bus.on('state', onState);
    syncStripAria();
    return true;
  }

  function setKeyboard(on) {
    on = !!on;
    if (!on) releaseKeys();
    if (P3.store && P3.store.S) P3.store.set('prefs.kbOn', on);
    return on;
  }

  P3.input = {
    init: init,
    setKeyboard: setKeyboard,
    releaseAll: releaseAll,
    focus: focusStage,
    kbVelocity: kbVelocity,
    util: {
      accel: accel, encDrag: encDrag, wheelNotch: wheelNotch, kbPad: kbPad, jogDelta: jogDelta,
      flickDir: flickDir, posVel: posVel, groupLeaf: groupLeaf,
      ENC_PX: ENC_PX, STEP_PX: STEP_PX, JOG_DEG: JOG_DEG, KB_ROWS: KB_ROWS, SHORTCUTS: SHORTCUTS
    }
  };
})();
