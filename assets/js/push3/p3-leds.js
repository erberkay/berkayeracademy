/* Push 3 Laboratuvarı — LED'ler ve pad ışıkları (p3-leds.js)
 *
 * Her kontrolün LED durumunu {m:'off'|'dim'|'on'|'blink'|'pulse', c} olarak hesaplar ve #p3Live'daki
 * elemanlara yazar: pad rect'leri, düğme glif klonları, light bar'lar, strip noktası, encoder halkaları,
 * öğretici hedef çerçeveleri. Sözleşme: docs/push3/README.md §G5, §H10; kurallar
 * sartname-kontrol-haritasi.md (LED sütunu + light bar), sartname-scale-note.md §5 (pad renkleri),
 * dogrulanmis-donanim.md §4.
 *
 * Boyama: #p3Live'daki her eleman currentColor ile çizilir (p3-device), bu yüzden yalnız
 * `el.style.color` yazılır. Olaylar yalnız "kirli" işaretler; asıl iş tek rAF'te yapılır ve bir
 * elemana yalnız rengi gerçekten değiştiyse yazılır (son yazılan değer önbellekte). Blink/pulse ve
 * hedef çerçevesi varken döngü en çok 30 fps'te boyar, aradaki bekleme setTimeout'tadır (boşta rAF
 * dönmez). Faz, transport çalıyorsa P3.seq.beatNow()'dan, durukken 120 BPM iç saatten gelir.
 *
 * Kurallar (controlLed) ile gösterilen durum ayrıdır: controlLed saf kuraldır (basılı tutma dahil);
 * setDisabled (soluk = off), flash (beyaz) ve prefers-reduced-motion (blink/pulse → on) yalnız
 * boyamada uygulanır. padColor da aynı şekilde saf kuraldır.
 *
 * SAPMA / EKLEME:
 * - controlLed durum nesnesine iki isteğe bağlı alan eklendi: k = basılıyken yanacak renk (varsayılan
 *   beyaz; Record için kırmızı), o = blink/pulse'ın sönük fazı (varsayılan blink'te ledOff, pulse'ta c×0.3).
 * - Basılı tutulan her LED'li kontrol (S.held, P3.modes.isHeld ya da 'in' olayındaki fiziksel basış)
 *   dim ise 'on' yanar (dogrulanmis-donanim §4 "Kullanılabilir = dim, basılıyken on"). off olan
 *   (kullanılamayan: sınırdaki Octave, boş Undo, işlevsiz light bar) basınca da sönük kalır.
 * - Zamanlama kontrol haritasını izler: blink 1 vuruş periyot %50, pulse 2 vuruş sinüs.
 *   dogrulanmis-donanim §4'teki 1/8 blink ve 1/4 pulse "(ç)" işaretli çıkarımdır ve 120 BPM'de
 *   4 Hz yanıp sönme verir (WCAG 2.3.1 sınırı 3 Hz). Aynı nedenle 180 BPM üstünde blink periyodu
 *   2 vuruşa çıkar.
 * - Drum pad'lerinin 'note' olayındaki `note` alanı MIDI numarası kabul edilir (36 + pad, drumCell);
 *   olay `note` yerine `pad` taşırsa 36 + pad kullanılır.
 * - Drum pad solo/mute (P3 renkleri blueD / track×0.4) için durum alanı §D'de yok; t.padSolo[pad] ve
 *   t.padMute[pad] okunur (yoksa kapalı). Faz 1'de modes bunları yazmazsa etkisizdir.
 * - Drum step'leri ve loop pad'leri track'in çalan clip'ini, çalmıyorsa slot 0'ı okur
 *   (VARSAYIM: Faz 1'de tek clip slotu kullanılır). Clip uzunluğunun dışındaki step'ler off
 *   (VARSAYIM: gerçek Push'ta clip dışı step'ler sönüktür; şartname yazmıyor). Clip yokken görünen
 *   sayfanın loop pad'i beyaz, diğerleri off.
 * - Basılı tutulan step'in blink'i (F2 step düzenleme) yok.
 * - Kayıt kırmızısı yalnız transport.rec 'rec' | 'overdub' iken. Record LED'i: bu ikisinde kırmızı on;
 *   'countin' | 'pending' | 'armed' (seq'in bekleme durumu nasıl adlandırılırsa) blink; diğerleri
 *   kırmızı×0.3.
 * - D-pad: Scale menüsü açıkken gam listesinin ucunda off, değilse dim; menü dışında dim (Session F2).
 *   Page ◀▶: drum track'te sayfa varsa dim, yoksa off; Learn sayfasında o yönde bölüm sayfası varsa dim,
 *   uçta off (P3.lcd.learnPages; VARSAYIM); 64 Notes'ta off. Learn açıkken üstünde bölüm olan upper dim,
 *   boş sütun off, lower off (VARSAYIM: bölüm başlatma düğmeleri).
 * - Bank görünümünde switch option'ları (Filter 1/2, Slope, Sync, Expression) her zaman beyaz
 *   (VARSAYIM: iki durum da geçerli seçim, Scale menüsündeki In Key LED'i gibi); action option'ı
 *   etkinse dim, değilse off. Drum track'te bank görünümü yok: zincir kuralları geçerli, upper1 off.
 * - Öğretici kilidinde soluk (setDisabled) encoder'ın dokunma halkası çizilmez.
 * - Zincir görünümünde lower: sessiz track, solo varken solosuz track ve Stop Clip basılıyken durmuş
 *   track söner (dogrulanmis-donanim §4 "Unlit durumları"); seçili track her zaman beyaz.
 * - aria-pressed registry'deki toggle'lara ek olarak Scale ve Learn'e de yazılır (overlay açık/kapalı).
 * - Pad aria-label'ı sartname-mobil biçimini izler: 'C3, kök nota, satır 1 sütun 1'. Drum:
 *   'Kick, pad 1'; boş drum pad 'E1, boş pad'; step 'Adım 5, nota var'; loop 'Loop sayfası 2'.
 * - S.prefs.noteNames açıkken pad'lere nota/ses adı yazılır ve kök pad'lere iç çerçeve çizilir
 *   (rengi tek gösterge yapmama, WCAG 1.4.1; sartname-mobil). Kendi grubumuz pad'lerin hemen üstünde.
 * - Strip noktası ve encoder dokunma halkaları da burada boyanır: nokta S.strip'ten (pb −1..1,
 *   mod 0..1; drum track'te bank konumu), halka 'in' dokunma olayından ya da S.wtui.touched'dan.
 * - Hedef çerçevesi 'dpad'/'octpage' grup adında tek çerçeve çizer; 1.2 s periyotla pulse yapar
 *   (sartname-ogretici), reduced-motion'da sabit.
 * - setDisabled hotspot'a aria-disabled="true" ve p3-disabled sınıfı yazar (kabuk CSS'i
 *   [aria-disabled] ile soluklaştırır); sınıf hotspot'un .p3-hl'ine de eklenir. {pad:[x,y]} ile
 *   kapatılan pad'in gridcell'i de aria-disabled alır.
 * - Drum playhead için 'tick' her karede pad boyatmaz: yalnız playhead yeni bir step'e ya da loop
 *   pad'ine geçince pad'ler kirlenir. seq'in 'step' olayı da pad'leri kirletir.
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  var NS = 'http://www.w3.org/2000/svg';
  var FRAME_MS = 1000 / 30;          // blink/pulse boyama sınırı (≤30 fps)
  var IDLE_BPM = 120;                // transport durukken iç saat
  var TARGET_PERIOD_MS = 1200;       // öğretici hedef çerçevesi pulse periyodu
  var FAST_BPM = 180;                // üstünde blink yarı hızda (≤3 Hz, WCAG 2.3.1)
  var EPS = 1e-6;
  var WHITE = '#FFFFFF';
  var REC_STATES = { rec: 1, overdub: 1 };
  var WAIT_STATES = { countin: 1, pending: 1, armed: 1 };
  var NO_PRESS_LIGHT = { user: 1, convert: 1 };   // işlevi yok, basınca da sönük kalır
  // aria-pressed yazılan düğmeler: registry toggle'ları + overlay düğmeleri.
  var PRESSED_EXTRA = ['scale', 'learn'];

  // ---------------------------------------------------------------- renk yardımcıları
  function C() { return P3.K.C; }

  function rgb(h) {
    var n = parseInt(String(h).slice(1, 7), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function byte(v) { v = Math.round(v); return v < 0 ? 0 : v > 255 ? 255 : v; }
  function hex(r, g, b) {
    return '#' + ((1 << 24) | (byte(r) << 16) | (byte(g) << 8) | byte(b)).toString(16).slice(1).toUpperCase();
  }
  function mix(a, b, t) {
    var p = rgb(a), q = rgb(b);
    return hex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t);
  }
  function shade(h, k) { var p = rgb(h); return hex(p[0] * k, p[1] * k, p[2] * k); }
  function tint(h, t) { return mix(h, WHITE, t); }
  // Nota adı yazısı için: açık pad'de siyah, koyu pad'de beyaz.
  function inkFor(h) { var p = rgb(h); return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) > 140 ? '#000000' : WHITE; }

  function frac(v) { return v - Math.floor(v); }
  function clamp01(v) { return !(v > 0) ? 0 : v > 1 ? 1 : v; }
  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  // ---------------------------------------------------------------- durum yardımcıları
  function led(m, c, extra) {
    var s = { m: m, c: c };
    if (extra) for (var k in extra) s[k] = extra[k];
    return s;
  }
  function OFF() { return led('off', C().ledOff); }
  function DIM() { return led('dim', C().ledDim); }
  function ON(c) { return led('on', c || C().ledOn); }
  function onDim(cond, c) { return cond ? ON(c) : DIM(); }
  // Light bar: dim = rengin ×0.4'ü (kontrol haritası).
  function barOn(c) { return led('on', c || WHITE); }
  function barDim(c) { return led('dim', shade(c || WHITE, 0.4)); }

  function track(S, i) {
    var ts = S.tracks || [];
    return ts[i === undefined ? (S.sel && S.sel.track) || 0 : i] || ts[0];
  }
  function selIndex(S) { return (S.sel && S.sel.track) || 0; }
  function recording(S) { return !!(S.transport && REC_STATES[S.transport.rec]); }
  function playingTransport(S) { return !!(S.transport && S.transport.playing); }

  function controls() { return (P3.dev && P3.dev.CONTROLS) || {}; }

  // ---------------------------------------------------------------- basılı tutma
  var pressed = {};   // 'in' olaylarından fiziksel basış (modes held tutmasa da basılı düğme yanar)

  function isHeld(id) {
    var S = P3.S;
    if (pressed[id]) return true;
    if (S && S.held && S.held[id]) return true;
    return !!(P3.modes && typeof P3.modes.isHeld === 'function' && P3.modes.isHeld(id));
  }

  // ---------------------------------------------------------------- çalan notalar
  // track → { midi → { pad: n, seq: n } }. Aynı perdeyi çalan tüm pad'ler birlikte yanar;
  // sayaç, aynı perdeye iki pad basılıyken birinin bırakılmasının diğerini söndürmemesi için.
  var lit = {};

  function litEntry(tr, note, make) {
    var t = lit[tr] || (make ? (lit[tr] = {}) : null);
    if (!t) return null;
    return t[note] || (make ? (t[note] = { pad: 0, seq: 0 }) : null);
  }

  function onNote(e) {
    if (!e) return;
    var note = typeof e.note === 'number' ? e.note : typeof e.pad === 'number' ? 36 + e.pad : null;
    if (note === null) return;
    var tr = e.track === undefined ? selIndex(P3.S || {}) : e.track;
    var key = e.src === 'seq' ? 'seq' : 'pad';
    var r = litEntry(tr, note, !!e.on);
    if (!r) return;
    r[key] = e.on ? r[key] + 1 : Math.max(0, r[key] - 1);
    if (!r.pad && !r.seq) delete lit[tr][note];
    dirty.pads = true;
    schedule();
  }

  function isLit(tr, note) {
    var r = litEntry(tr, note, false);
    return !!(r && (r.pad || r.seq));
  }

  // Transport durunca seq'in açık bıraktığı notalar söner (seq off göndermeden durabilir).
  function clearSeqLit() {
    for (var tr in lit) for (var n in lit[tr]) {
      var r = lit[tr][n];
      r.seq = 0;
      if (!r.pad) delete lit[tr][n];
    }
  }

  // ---------------------------------------------------------------- clip yardımcıları
  function curClip(t) {
    if (!t || !t.clips) return null;
    var slot = t.playing >= 0 ? t.playing : 0;   // VARSAYIM: Faz 1'de tek slot (0)
    return t.clips[slot] || null;
  }

  // Clip içindeki çalma konumu (beat) ya da çalmıyorsa null.
  function playhead(S, i, t) {
    if (!playingTransport(S) || !P3.seq || typeof P3.seq.playhead !== 'function') return null;
    if (t && t.playing !== undefined && t.playing < 0 && !curClip(t)) return null;
    var b = P3.seq.playhead(i);
    return typeof b === 'number' && b >= 0 && isFinite(b) ? b : null;
  }

  // ---------------------------------------------------------------- pad renkleri
  function noteColor(S, t, x, y) {
    var K = C(), sc = P3.scale;
    var m = sc.padNote(S.scale, t.pos, x, y);
    if (m === null) return K.off;
    if (isLit(selIndex(S), m)) return recording(S) ? K.red : K.green;
    var cls = sc.padClass(S.scale, m);
    return cls === 'root' ? t.color : cls === 'scale' ? K.white : K.off;
  }

  function hasSound(pad) {
    return !!(pad >= 0 && P3.drums && typeof P3.drums.hasSound === 'function' && P3.drums.hasSound(pad));
  }

  // Öncelik (P3 kılavuzu): çalıyor > seçili > solo > mute > sesli > boş.
  function drumPadColor(S, t, pad) {
    var K = C();
    if (isLit(selIndex(S), 36 + pad)) return K.green;
    if (t.selPad === pad) return K.white;
    if (t.padSolo && t.padSolo[pad]) return K.blueD;
    if (t.padMute && t.padMute[pad]) return shade(t.color, 0.4);
    return hasSound(pad) ? t.color : K.gray;
  }

  // Step'in içeriği (seçili drum pad'inin notaları): 'out' clip dışı, 'empty', ya da
  // {vel: en yüksek velocity, muted: hepsi susturulmuş mu}. Renk ve aria-label ortak kullanır.
  function stepInfo(t, step) {
    var clip = curClip(t);
    if (!clip) return 'empty';
    var b = P3.scale.GRID[t.grid].b, t0 = step * b, t1 = t0 + b;
    if (t0 >= (clip.len || 0) - EPS) return 'out';   // VARSAYIM: clip dışı step sönük
    var p = 36 + t.selPad, vel = -1, muted = true, notes = clip.notes || [];
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.p !== p || n.t < t0 - EPS || n.t >= t1 - EPS) continue;
      if (n.v > vel) vel = n.v;
      if (!n.m) muted = false;
    }
    return vel < 0 ? 'empty' : { vel: vel, muted: muted };
  }

  function stepColor(S, t, step) {
    var K = C(), b = P3.scale.GRID[t.grid].b, t0 = step * b, t1 = t0 + b;
    var clip = curClip(t), ph = clip ? playhead(S, selIndex(S), t) : null;
    if (ph !== null && ph >= t0 - EPS && ph < t1 - EPS) return recording(S) ? K.red : K.green;
    var info = stepInfo(t, step);
    if (info === 'out') return K.off;
    if (info === 'empty') return K.gray;
    var base = clip.color || t.color;
    if (info.muted) return tint(base, 0.55);
    // VARSAYIM (sartname-scale-note §5): velocity kademeleri.
    return shade(base, info.vel >= 120 ? 1 : info.vel >= 60 ? 0.65 : 0.4);
  }

  function loopColor(S, t, page) {
    var K = C(), sc = P3.scale, lb = sc.loopPadBeats(t), a = page * lb, b = a + lb;
    var pb = sc.pageBeats(t), v0 = t.page * pb, v1 = v0 + pb;
    var visible = a < v1 - EPS && b > v0 + EPS;
    var clip = curClip(t);
    if (!clip) return visible ? K.white : K.off;
    var ph = playhead(S, selIndex(S), t);
    if (ph !== null && ph >= a - EPS && ph < b - EPS) return recording(S) ? K.red : K.green;
    var loop = clip.loop || [0, clip.len || 0];
    if (!(a < loop[1] - EPS && b > loop[0] + EPS)) return K.off;
    return visible ? K.white : K.gray;
  }

  function padColor(x, y) {
    var S = P3.S;
    if (!S || !P3.scale) return C().off;
    var t = track(S);
    if (!t) return C().off;
    if (t.kind !== 'drum') return noteColor(S, t, x, y);
    var cell = P3.scale.drumCell(x, y, t);
    if (cell.k === 'drum') return drumPadColor(S, t, cell.pad);
    if (cell.k === 'step') return stepColor(S, t, cell.step);
    if (cell.k === 'loop') return loopColor(S, t, cell.page);
    return C().off;   // triplet'te sağdaki iki sütun
  }

  // Erişilebilir ad (§H10). Konum eki sartname-mobil'deki biçim: satır/sütun alttan/soldan 1'den.
  function padLabel(x, y) {
    var S = P3.S, sc = P3.scale, t = S && track(S);
    var at = `satır ${y + 1} sütun ${x + 1}`;
    if (!t || !sc) return `Pad, ${at}`;
    if (t.kind !== 'drum') {
      var m = sc.padNote(S.scale, t.pos, x, y);
      if (m === null) return `Boş pad, ${at}`;
      var cls = sc.padClass(S.scale, m);
      var what = cls === 'root' ? `kök nota` : cls === 'scale' ? `gam içi` : `gam dışı`;
      return `${sc.noteName(m)}, ${what}, ${at}`;
    }
    var cell = sc.drumCell(x, y, t);
    if (cell.k === 'drum') {
      var slot = P3.drums && P3.drums.KIT && cell.pad >= 0 ? P3.drums.KIT[cell.pad] : null;
      return slot && slot.name ? `${slot.name}, pad ${cell.pad + 1}` : `${sc.noteName(36 + cell.pad)}, boş pad`;
    }
    if (cell.k === 'step') {
      var info = stepInfo(t, cell.step);
      var state = typeof info === 'string' ? `boş` : info.muted ? `susturulmuş` : `nota var`;
      return `Adım ${cell.step + 1}, ${state}`;
    }
    if (cell.k === 'loop') return `Loop sayfası ${cell.page + 1}`;
    return `Kullanılmıyor`;
  }

  // Nota adları açıkken pad'e yazılacak kısa metin; kök pad'e iç çerçeve.
  function padMark(x, y) {
    var S = P3.S, sc = P3.scale, t = S && track(S);
    if (!t || !sc) return { text: '', root: false };
    if (t.kind !== 'drum') {
      var m = sc.padNote(S.scale, t.pos, x, y);
      return m === null ? { text: '', root: false } : { text: sc.noteName(m), root: sc.padClass(S.scale, m) === 'root' };
    }
    var cell = sc.drumCell(x, y, t);
    if (cell.k !== 'drum' || cell.pad < 0) return { text: '', root: false };
    var slot = P3.drums && P3.drums.KIT ? P3.drums.KIT[cell.pad] : null;
    return { text: slot && slot.name ? slot.name : sc.noteName(36 + cell.pad), root: false };
  }

  // ---------------------------------------------------------------- kontrol kuralları
  function scaleBar(S, up, k) {
    var sc = S.scale, R = P3.scale.ROOT_NOTES;
    if (up) {
      if (k === 1 || k === 8) return OFF();
      return R[k - 2] === sc.root ? barOn() : barDim();
    }
    if (k === 1) return barOn();                                 // In Key / Chromatic: iki durumda da beyaz
    if (k === 8) return sc.fixed ? barOn() : barDim();
    return R[k + 4] === sc.root ? barOn() : barDim();
  }

  function bankOption(S, t, k) {
    var wtp = P3.wtp, b = wtp && wtp.BANKS && wtp.BANKS[S.wtui.bank];
    var opt = b ? b.options(S, t)[k - 2] : null;
    if (!opt) return OFF();
    if (opt.kind === 'toggle') return opt.get(S, t) ? barOn() : barDim();
    if (opt.kind === 'switch') return barOn();
    return (!opt.enabled || opt.enabled(S, t)) ? barDim() : OFF();
  }

  function deviceBar(S, up, k) {
    var t = track(S), sel = selIndex(S);
    var bank = !!(S.bankView && t && t.kind === 'synth' && t.p && P3.wtp && P3.wtp.BANKS);
    if (up) {
      if (k === 1) return t && t.kind === 'synth' ? barOn() : OFF();   // drum track'te bank yok (§H14)
      return bank ? bankOption(S, t, k) : OFF();
    }
    if (bank) {
      if (k - 1 >= P3.wtp.BANKS.length) return OFF();
      return k - 1 === S.wtui.bank ? barOn() : led('dim', shade(t.color, 0.5));
    }
    var ts = S.tracks || [], tk = ts[k - 1];
    if (!tk) return OFF();
    if (k - 1 === sel) return barOn();
    var anySolo = ts.some(function (x) { return x && x.solo; });
    if (tk.mute || (anySolo && !tk.solo)) return OFF();
    if (isHeld('stopClip') && !(tk.playing >= 0)) return OFF();
    return led('dim', shade(tk.color, 0.5));
  }

  // Learn: üstünde bölüm olan düğme dim, boş sütun off (LCD yoksa hepsi dim).
  function learnBar(k) {
    var L = P3.lcd;
    if (!L || typeof L.learnChapterAt !== 'function') return barDim();
    var ch = L.learnChapterAt(k);
    return ch !== null && ch !== undefined ? barDim() : OFF();
  }

  function barLed(S, id) {
    var up = id.charAt(0) === 'u', k = +id.slice(5);
    if (S.overlay === 'scale') return scaleBar(S, up, k);
    if (S.overlay === 'learn') return up ? learnBar(k) : OFF();   // VARSAYIM: bölüm başlatma düğmeleri
    return deviceBar(S, up, k);
  }

  function sceneLed(S, k) {
    var t = track(S), K = C();
    if (!t || S.pad === 'session') return DIM();
    if (t.repeat && t.repeat.on) return k - 1 === t.repeat.rate ? ON(K.repeatGreen) : DIM();
    if (t.kind === 'drum') return k - 1 === t.grid ? ON(K.ledOn) : DIM();
    return DIM();   // 64 Notes'ta grid anlamsız
  }

  function dpadLed(S, id) {
    if (S.overlay !== 'scale') return DIM();
    var i = S.scale.idx, last = P3.scale.SCALES.length - 1;
    if (id === 'dpadUp' || id === 'dpadLeft') return i > 0 ? DIM() : OFF();
    if (id === 'dpadDown' || id === 'dpadRight') return i < last ? DIM() : OFF();
    return OFF();   // merkez: Scale menüsünde işlevi yok
  }

  function octaveLed(S, up) {
    var t = track(S), sc = P3.scale;
    if (!t) return OFF();
    var can = t.kind === 'drum' ? (up ? sc.drumCanUp(t) : sc.drumCanDown(t))
      : (up ? sc.canUp(S.scale, t) : sc.canDown(S.scale, t));
    return can ? ON() : OFF();
  }

  function pageLed(S, right) {
    var t = track(S);
    if (S.overlay === 'learn') {
      var lp = P3.lcd && typeof P3.lcd.learnPages === 'function' ? P3.lcd.learnPages() : undefined;
      if (lp === undefined) return DIM();   // LCD yok: sayfa bilinmiyor
      if (!lp || lp.pages < 2) return OFF();
      return (right ? lp.page < lp.pages - 1 : lp.page > 0) ? DIM() : OFF();
    }
    if (!t || t.kind !== 'drum') return OFF();
    if (!right) return t.page > 0 ? DIM() : OFF();
    var clip = curClip(t);
    return clip && (t.page + 1) * P3.scale.pageBeats(t) < (clip.len || 0) - EPS ? DIM() : OFF();
  }

  function recordLed(S) {
    var red = C().red, r = S.transport ? S.transport.rec : 'idle';
    if (REC_STATES[r]) return ON(red);
    if (WAIT_STATES[r]) return led('blink', red, { o: shade(red, 0.3), k: red });
    return led('dim', shade(red, 0.3), { k: red });
  }

  var RULES = {
    sets: DIM,
    setup: function (S) { return onDim(S.overlay === 'setup'); },
    learn: function (S) { return onDim(S.overlay === 'learn'); },
    user: OFF,
    lock: DIM,
    stopClip: DIM,
    mute: function (S) { var t = track(S); return onDim(t && t.mute); },
    solo: function (S) { var t = track(S); return onDim(t && t.solo); },
    // VARSAYIM (kontrol haritası): yığın doluysa dim, boşsa off. Shift basılıyken Redo yığınına bakar.
    undo: function () {
      var st = P3.store, can = st && (isHeld('shift') ? st.canRedo() : st.canUndo());
      return can ? DIM() : OFF();
    },
    save: DIM,
    mainTrack: function () { return barDim(); },
    add: DIM,
    swap: function (S) { return onDim(S.overlay === 'swap'); },
    device: function (S) { return onDim(S.view === 'device'); },
    mix: function (S) { return onDim(S.view === 'mix'); },
    clip: function (S) { return onDim(S.view === 'clip'); },
    sessionScreen: function (S) { return onDim(S.view === 'sessionScreen'); },
    tapTempo: DIM,
    metronome: function (S) { return S.transport && S.transport.metro ? led('pulse', C().ledOn) : DIM(); },
    quantize: DIM,
    fixedLength: DIM,          // Faz 2: durum alanı yok
    automate: DIM,             // kapalıyken beyaz dim; açık (#E12020) Faz 3
    'new': DIM,
    capture: DIM,
    record: recordLed,
    play: function (S) { return playingTransport(S) ? ON(C().playGreen) : DIM(); },
    note: function (S) { return onDim(S.pad === 'note'); },
    session: function (S) { return onDim(S.pad === 'session'); },
    scale: function (S) { return onDim(S.overlay === 'scale'); },
    layout: DIM,
    repeat: function (S) { var t = track(S); return t && t.repeat && t.repeat.on ? led('pulse', C().ledOn) : DIM(); },
    accent: function (S) { return onDim(S.accent && S.accent.on); },
    doubleLoop: DIM,
    duplicate: DIM,
    convert: OFF,
    'delete': DIM,
    octaveUp: function (S) { return octaveLed(S, true); },
    octaveDown: function (S) { return octaveLed(S, false); },
    pageLeft: function (S) { return pageLed(S, false); },
    pageRight: function (S) { return pageLed(S, true); },
    shift: DIM,
    select: DIM
  };

  // Kural: gate/flash/reduced-motion uygulanmamış durum.
  function controlLed(id) {
    var S = P3.S, c = controls()[id];
    if (!S || !c || c.led === 'none') return OFF();
    var st;
    if (RULES[id]) st = RULES[id](S, id);
    else if (/^(upper|lower)[1-8]$/.test(id)) st = barLed(S, id);
    else if (/^scene[1-8]$/.test(id)) st = sceneLed(S, +id.slice(5));
    else if (c.group === 'dpad') st = dpadLed(S, id);
    else st = DIM();
    if (st.m === 'dim' && !NO_PRESS_LIGHT[id] && isHeld(id)) st = led('on', st.k || WHITE);
    return st;
  }

  // Toggle düğmelerin aria-pressed değeri (§H10). null = bu düğmede aria-pressed yok.
  function pressedOf(id) {
    var S = P3.S, t = S && track(S);
    if (!S) return null;
    switch (id) {
      case 'mute': return !!(t && t.mute);
      case 'solo': return !!(t && t.solo);
      case 'metronome': return !!(S.transport && S.transport.metro);
      case 'fixedLength': return false;
      case 'repeat': return !!(t && t.repeat && t.repeat.on);
      case 'accent': return !!(S.accent && S.accent.on);
      case 'scale': return S.overlay === 'scale';
      case 'learn': return S.overlay === 'learn';
    }
    return null;
  }

  // ---------------------------------------------------------------- gate / hedef / flash
  var disabled = {}, disabledPads = {}, allPadsDisabled = false;
  var targets = [], targetHls = [], targetRects = [];
  var flashes = {}, flashPads = {};
  var reduced = false;

  // Liste → {ids:{id:true}, pads:{i:true}, allPads, groups:[ad]}. Dizeler P3.dev.expand'den geçer
  // ('upper*', 'dpad' grubu); {pad:[x,y]} tek pad; 'pads' bütün ızgara.
  function resolve(list) {
    var out = { ids: {}, pads: {}, allPads: false, groups: [], padList: [] };
    [].concat(list || []).forEach(function (p) {
      if (p && p.pad) {
        var i = (7 - p.pad[1]) * 8 + p.pad[0];
        if (i >= 0 && i < 64) { out.pads[i] = true; out.padList.push(p); }
        return;
      }
      if (typeof p !== 'string') return;
      if (P3.dev && P3.dev.GROUPS && P3.dev.GROUPS[p]) out.groups.push(p);
      var ids = P3.dev && P3.dev.expand ? P3.dev.expand(p) : (controls()[p] ? [p] : []);
      ids.forEach(function (id) {
        if (id === 'pads') out.allPads = true;
        out.ids[id] = true;
      });
    });
    return out;
  }

  function hotspot(id) { return P3.dev && P3.dev.hotspotEl ? P3.dev.hotspotEl(id) : null; }

  // Hotspot'u (ve varsa .p3-hl'ini) kapalı/açık işaretler.
  function markDisabled(el, on) {
    if (!el) return;
    var hl = el.querySelector ? el.querySelector('.p3-hl') : null;
    if (on) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
    [el, hl].forEach(function (n) { if (n) n.classList[on ? 'add' : 'remove']('p3-disabled'); });
  }

  function padCell(i) { return hotspot({ pad: [i % 8, 7 - (i >> 3)] }); }

  function setDisabled(list) {
    var r = resolve(list), id;
    for (id in disabled) {
      if (!r.ids[id]) markDisabled(hotspot(id), false);
      dirty.ctl[id] = true;
    }
    for (id in r.ids) {
      markDisabled(hotspot(id), true);
      dirty.ctl[id] = true;
    }
    for (id in disabledPads) if (!r.pads[id]) markDisabled(padCell(+id), false);
    for (id in r.pads) markDisabled(padCell(+id), true);
    disabled = r.ids;
    disabledPads = r.pads;
    allPadsDisabled = r.allPads;
    dirty.pads = dirty.rings = true;   // soluk encoder'ın halkası gizlenir
    schedule();
  }

  function clearTargets() {
    targetHls.forEach(function (hl) { hl.classList.remove('target'); });
    targetRects.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    targetHls = [];
    targetRects = [];
  }

  function frameRect(g, r) {
    var pad = 8, el = document.createElementNS(NS, 'rect');
    el.setAttribute('x', r.x - pad);
    el.setAttribute('y', r.y - pad);
    el.setAttribute('width', r.w + 2 * pad);
    el.setAttribute('height', r.h + 2 * pad);
    el.setAttribute('rx', 10);
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', WHITE);
    el.setAttribute('stroke-width', 5);
    g.appendChild(el);
    targetRects.push(el);
  }

  // Öğretici hedefi: #p3Live'da beyaz çerçeve + hotspot'un .p3-hl.target vurgusu.
  function setTarget(list) {
    clearTargets();
    targets = [].concat(list || []);
    var dev = P3.dev, g = dev && dev.targetG;
    if (!dev) return;
    var r = resolve(targets), grouped = {};
    r.groups.forEach(function (name) {
      if (g) frameRect(g, dev.svgRect(name));
      dev.expand(name).forEach(function (id) { grouped[id] = true; });
    });
    Object.keys(r.ids).forEach(function (id) {
      var el = hotspot(id), hl = el && el.querySelector('.p3-hl');
      if (hl) { hl.classList.add('target'); targetHls.push(hl); }
      if (g && !grouped[id]) { var rc = dev.svgRect(id); if (rc) frameRect(g, rc); }
    });
    r.padList.forEach(function (p) { var rc = dev.svgRect(p); if (g && rc) frameRect(g, rc); });
    if (g) g.style.opacity = '';
    delete written.target;   // stil sıfırlandı; önbellek bir sonraki boyamayı engellemesin
    schedule();
  }

  // Kısa süreli beyaz yanma (öğretici "işte burası", modes geri bildirimi).
  function flash(list, ms) {
    var r = resolve(list), until = now() + (ms > 0 ? ms : 300), id, i;
    for (id in r.ids) {
      if (id === 'pads') { for (i = 0; i < 64; i++) flashPads[i] = until; continue; }
      flashes[id] = until;
      dirty.ctl[id] = true;
    }
    for (i in r.pads) flashPads[i] = until;
    dirty.pads = true;
    setTimeout(function () { expireFlashes(); }, (ms > 0 ? ms : 300) + 5);
    schedule();
  }

  function expireFlashes() {
    var t = now(), id;
    for (id in flashes) if (flashes[id] <= t) { delete flashes[id]; dirty.ctl[id] = true; }
    for (id in flashPads) if (flashPads[id] <= t) { delete flashPads[id]; dirty.pads = true; }
    schedule();
  }

  // Boyanan durum: kural + gate + flash + reduced-motion.
  function shown(id, t) {
    if (disabled[id]) return OFF();
    if (flashes[id] > t) return ON(WHITE);
    var st = controlLed(id);
    if (reduced && (st.m === 'blink' || st.m === 'pulse')) st = led('on', st.c);
    return st;
  }

  function colorAt(st, beat) {
    if (st.m === 'blink') {                                                      // 1 vuruş, %50
      var S = P3.S, fast = S && S.transport && S.transport.bpm > FAST_BPM;
      return frac(fast ? beat / 2 : beat) < 0.5 ? st.c : (st.o || C().ledOff);
    }
    if (st.m === 'pulse') {                                                      // 2 vuruş, sinüs
      var s = 0.5 - 0.5 * Math.cos(Math.PI * beat);
      return mix(st.o || shade(st.c, 0.3), st.c, s);
    }
    return st.c;
  }

  // ---------------------------------------------------------------- faz
  var lastTick = null;

  function phaseBeat(t) {
    var S = P3.S;
    if (S && playingTransport(S)) {
      if (P3.seq && typeof P3.seq.beatNow === 'function') {
        var b = P3.seq.beatNow();
        if (typeof b === 'number' && isFinite(b)) return b;
      }
      if (lastTick) return lastTick.beat + (t - lastTick.t) * ((S.transport.bpm || IDLE_BPM) / 60000);
    }
    return t * IDLE_BPM / 60000;
  }

  // ---------------------------------------------------------------- kirli kümeler ve boyama
  var dirty = { ctl: {}, allCtl: false, pads: false, labels: false, strip: false, rings: false };
  var written = {};        // eleman anahtarı → son yazılan değer
  var anim = {};           // id → gösterilen blink/pulse durumu
  var touched = {};        // encN → dokunuluyor ('in' olayı)
  var raf = 0, timer = 0, lastAnim = -1e9, inited = false;
  var marks = null;        // nota adı / kök çerçevesi grubu (kendi grubumuz)

  function write(key, el, prop, value) {
    if (written[key] === value) return;
    written[key] = value;
    if (prop === 'color') el.style.color = value;
    else if (prop === 'visibility') el.style.visibility = value;
    else el.setAttribute(prop, value);
  }

  function ledEl(id, c) {
    if (!P3.dev) return null;
    return c.led === 'bar' ? P3.dev.bar(id) : P3.dev.glyph(id);
  }

  function paintControl(id, t, beat) {
    var c = controls()[id];
    if (!c || c.led === 'none') return;
    var el = ledEl(id, c);
    if (!el) return;
    var st = shown(id, t);
    if (st.m === 'blink' || st.m === 'pulse') anim[id] = st; else delete anim[id];
    write('c:' + id, el, 'color', colorAt(st, beat));
    var p = pressedOf(id), hs;
    if (p !== null && (c.toggle || PRESSED_EXTRA.indexOf(id) >= 0) && (hs = hotspot(id))) {
      write('p:' + id, hs, 'aria-pressed', p ? 'true' : 'false');
    }
  }

  function paintPads(t) {
    var K = C(), i, x, y, el, col;
    for (i = 0; i < 64; i++) {
      el = P3.dev.padEl(i);
      if (!el) continue;
      x = i % 8; y = 7 - (i >> 3);
      if (allPadsDisabled || disabledPads[i]) col = K.off;
      else if (flashPads[i] > t) col = K.white;
      else col = padColor(x, y);
      write('pad:' + i, el, 'color', col);
      if (marks && marks.on) write('ink:' + i, marks.text[i], 'fill', inkFor(col));
    }
  }

  function paintLabels() {
    var S = P3.S, i, x, y, cell;
    for (i = 0; i < 64; i++) {
      x = i % 8; y = 7 - (i >> 3);
      cell = P3.dev.hotspotEl({ pad: [x, y] });
      if (cell) write('lbl:' + i, cell, 'aria-label', padLabel(x, y));
    }
    var on = !!(S && S.prefs && S.prefs.noteNames);
    if (on && !marks) buildMarks();
    if (!marks) return;
    marks.on = on;
    write('marks', marks.g, 'visibility', on ? 'visible' : 'hidden');
    if (!on) return;
    for (i = 0; i < 64; i++) {
      var mk = padMark(i % 8, 7 - (i >> 3));
      if (written['txt:' + i] !== mk.text) { written['txt:' + i] = mk.text; marks.text[i].textContent = mk.text; }
      write('root:' + i, marks.root[i], 'visibility', mk.root ? 'visible' : 'hidden');
    }
    delete written['ink:0'];   // metin rengi bir sonraki pad boyamasında yeniden hesaplansın
    for (i = 1; i < 64; i++) delete written['ink:' + i];
    dirty.pads = true;
  }

  // Pad'lerin hemen üstüne (hedef çerçevesinin altına) kendi grubumuz: nota adı + kök iç çerçevesi.
  function buildMarks() {
    var first = P3.dev.padEl(0), live = P3.dev.live;
    if (!first || !live) return;
    var P = P3.dev.PAD, g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'p3-live-padmarks');
    marks = { g: g, text: [], root: [], on: false };
    for (var i = 0; i < 64; i++) {
      var c = i % 8, r = i >> 3, x = P.x0 + P.px * c, y = P.y0 + P.py * r;
      var fr = document.createElementNS(NS, 'rect');
      [['x', x + 7], ['y', y + 7], ['width', P.w - 14], ['height', P.h - 14], ['rx', 3],
        ['fill', 'none'], ['stroke', '#000000'], ['stroke-opacity', 0.55], ['stroke-width', 4]].forEach(function (a) { fr.setAttribute(a[0], a[1]); });
      fr.style.visibility = 'hidden';
      var tx = document.createElementNS(NS, 'text');
      [['x', x + P.w / 2], ['y', y + P.h / 2 + 8], ['text-anchor', 'middle'], ['font-size', 22], ['font-weight', 600],
        ['font-family', '"Instrument Sans", system-ui, sans-serif']].forEach(function (a) { tx.setAttribute(a[0], a[1]); });
      g.appendChild(fr);
      g.appendChild(tx);
      marks.root[i] = fr;
      marks.text[i] = tx;
    }
    live.insertBefore(g, first.parentNode.nextSibling);
  }

  function stripPos(S) {
    var t = track(S), st = S.strip || {};
    if (t && t.kind === 'drum') return clamp01((t.bank + 36) / 112);   // bank −36..76
    if (st.mode === 'mod') return clamp01(st.mod);
    return clamp01(((st.pb || 0) + 1) / 2);
  }

  function paintStrip() {
    var dot = P3.dev.stripDot, S = P3.S;
    if (dot && S && P3.dev.stripY) write('strip', dot, 'cy', String(Math.round(P3.dev.stripY(stripPos(S)) * 100) / 100));
  }

  function paintRings() {
    var S = P3.S, tw = S && S.wtui ? S.wtui.touched : -1;
    for (var i = 1; i <= 8; i++) {
      var r = P3.dev.ring && P3.dev.ring('enc' + i);
      // Öğretici kilidindeki (soluk) encoder'da halka çizilmez: dokunuş olayı gate'te yutulur.
      var on = !disabled['enc' + i] && (touched['enc' + i] || tw === i - 1);
      if (r) write('ring:' + i, r, 'visibility', on ? 'visible' : 'hidden');
    }
  }

  function paintTargets(t) {
    var g = P3.dev.targetG;
    if (!g || !targetRects.length) return;
    // 1.2 s periyotla 0.45..1 opaklık; reduced-motion'da sabit.
    var o = reduced ? 1 : 0.725 - 0.275 * Math.cos(2 * Math.PI * t / TARGET_PERIOD_MS);
    write('target', g, 'opacity', String(Math.round(o * 100) / 100));
  }

  function ready() { return !!(P3.S && P3.dev && P3.dev.padEl && P3.dev.padEl(0)); }

  function frame() {
    raf = 0;
    if (!ready()) return;   // cihaz yüklenmedi: kirli kalır, 'layout' olayı yeniden tetikler
    var t = now(), beat = phaseBeat(t), id;
    var ctl = dirty.allCtl ? Object.keys(controls()) : Object.keys(dirty.ctl);
    var labels = dirty.labels, pads = dirty.pads, strip = dirty.strip, rings = dirty.rings;
    dirty.ctl = {}; dirty.allCtl = false; dirty.labels = dirty.pads = dirty.strip = dirty.rings = false;

    ctl.forEach(function (i) { paintControl(i, t, beat); });
    if (labels) { paintLabels(); pads = true; dirty.pads = false; }
    if (pads) paintPads(t);
    if (strip) paintStrip();
    if (rings) paintRings();

    var animating = Object.keys(anim).length > 0 || (targetRects.length > 0 && !reduced);
    if (animating && t - lastAnim >= FRAME_MS - 1) {
      lastAnim = t;
      for (id in anim) if (ctl.indexOf(id) < 0) paintControl(id, t, beat);
      paintTargets(t);
    } else if (targetRects.length) paintTargets(t);
    if (animating) wake(lastAnim + FRAME_MS - t);
  }

  function schedule() {
    if (raf) return;
    if (timer) { clearTimeout(timer); timer = 0; }
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(frame);
    else raf = setTimeout(frame, 16);
  }

  // Yalnız animasyon için: bir sonraki boyama anına kadar rAF döndürmeden bekle.
  function wake(ms) {
    if (raf || timer) return;
    timer = setTimeout(function () { timer = 0; schedule(); }, Math.max(0, ms));
  }

  function invalidate(ids) {
    if (ids === '*' || ids === undefined) {
      dirty.allCtl = dirty.pads = dirty.labels = dirty.strip = dirty.rings = true;
      schedule();
      return;
    }
    [].concat(ids).forEach(function (id) {
      if (id && id.pad) { dirty.pads = true; return; }
      if (typeof id !== 'string') return;
      if (id === 'pads') { dirty.pads = dirty.labels = true; return; }
      if (id === 'strip') { dirty.strip = true; return; }
      if (/^enc[1-8]$/.test(id)) dirty.rings = true;
      var list = P3.dev && P3.dev.expand ? P3.dev.expand(id) : [id];
      list.forEach(function (x) { dirty.ctl[x] = true; });
    });
    schedule();
  }

  // ---------------------------------------------------------------- olaylar
  function markControls() { dirty.allCtl = true; }
  function markPads() { dirty.pads = dirty.labels = true; }

  function onState(e) {
    var p = (e && e.path) || '*', parts = String(p).split('.'), head = parts[0];
    if (p === '*') { invalidate('*'); return; }
    switch (head) {
      case 'tracks':
        // Encoder dönüşleri sık gelir: yalnız bank option light bar'ları etkilenir.
        if (parts[2] === 'p' || parts[2] === 'mods' || parts[2] === 'preset') { invalidate(['upper*', 'lower*']); return; }
        if (parts[2] === 'vol' || parts[2] === 'pan') return;
        markControls(); markPads(); dirty.strip = true;
        break;
      case 'scale': markControls(); markPads(); break;
      case 'wtui': invalidate(['upper*', 'lower*']); dirty.rings = true; break;
      case 'transport':
        markControls(); dirty.pads = true;
        if (parts[1] === 'playing' && !P3.S.transport.playing) { clearSeqLit(); lastTick = null; }
        break;
      case 'accent': case 'held': markControls(); break;
      case 'strip': dirty.strip = true; break;
      case 'popup': case 'vol': case 'swingTempo': return;
      default: invalidate('*'); return;   // sel, overlay, bankView, view, pad, app, prefs ve bilinmeyenler
    }
    schedule();
  }

  function onIn(ev) {
    if (!ev) return;
    var id = null, G = P3.dev && P3.dev.GROUPS;
    if (ev.k === 'btn') id = ev.id;
    else if (ev.k === 'dpad') id = ev.id || (G && (ev.dir === 'center' ? G.dpad.center : G.dpad[ev.dir]));
    else if (ev.k === 'octpage') id = ev.id || (G && G.octpage[ev.dir]);
    else if (ev.k === 'enc' && typeof ev.touch === 'boolean') {
      if (ev.touch) touched[ev.id] = true; else delete touched[ev.id];
      dirty.rings = true;
      schedule();
      return;
    }
    if (!id || ev.down === undefined) return;
    if (ev.down) pressed[id] = true; else delete pressed[id];
    markControls();   // basılı düğme başka LED'leri de etkiler (Shift → Undo, Stop Clip → lower)
    schedule();
  }

  function onTransport(e) {
    if (e && e.playing === false) { clearSeqLit(); lastTick = null; tickKey = ''; }
    markControls();
    dirty.pads = true;
    schedule();
  }

  // Drum track'te playhead yeni bir step'e ya da loop pad'ine geçince pad'ler yeniden boyanır;
  // arada (60 fps tick) hiçbir şey yapılmaz.
  var tickKey = '';
  function onTick(e) {
    if (e && typeof e.beat === 'number') lastTick = { beat: e.beat, t: now() };
    var S = P3.S, t = S && track(S);
    if (!t || t.kind !== 'drum') return;
    var ph = playhead(S, selIndex(S), t), key = '';
    if (ph !== null) key = Math.floor(ph / P3.scale.GRID[t.grid].b + EPS) + '|' + Math.floor(ph / P3.scale.loopPadBeats(t) + EPS);
    if (key === tickKey) return;
    tickKey = key;
    dirty.pads = true;
    schedule();
  }

  function onPanic() {
    lit = {};
    pressed = {};
    touched = {};
    invalidate('*');
  }

  function init() {
    if (inited) { invalidate('*'); return P3.leds; }
    inited = true;
    var bus = P3.bus;
    bus.on('state', onState);
    bus.on('transport', onTransport);
    bus.on('tick', onTick);
    bus.on('note', onNote);
    bus.on('panic', onPanic);
    bus.on('in', onIn);
    bus.on('history', function () { invalidate(['undo']); });
    bus.on('drums', function () { markPads(); schedule(); });
    bus.on('step', function () { markPads(); schedule(); });
    ['overlay', 'mode', 'restore', 'layout', 'lang'].forEach(function (ty) { bus.on(ty, function () { invalidate('*'); }); });
    try {
      var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq) {
        reduced = !!mq.matches;
        var onChange = function () { reduced = !!mq.matches; invalidate('*'); };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
      }
    } catch (e) { reduced = false; }
    invalidate('*');
    return P3.leds;
  }

  P3.leds = {
    init: init,
    invalidate: invalidate,
    padColor: padColor,
    padLabel: padLabel,
    controlLed: controlLed,
    flash: flash,
    setTarget: setTarget,
    setDisabled: setDisabled,
    isLit: isLit,
    // Test ve öğretici için: gösterilen durum (gate/flash/reduced-motion dahil).
    shown: function (id) { return shown(id, now()); },
    color: { shade: shade, tint: tint, mix: mix }
  };
})();
