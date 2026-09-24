/* Push 3 Laboratuvarı — çekirdek (p3-core.js)
 *
 * Sabitler (P3.K), olay yolu (P3.bus), durum ve undo (P3.store), yerel kayıt (P3.save),
 * i18n köprüsü (P3.t), yardımcılar (P3.u) ve P3.panic. Sözleşme: docs/push3/README.md §G1, §D.
 * Dosya yalnız tanım yapar; yüklenirken hiçbir yan etki üretmez (README §C).
 *
 * SAPMA/EKLEME (sözleşmede olmayan ya da belirsiz olan yerler):
 * - P3.store.set opts.merge + P3.store.endMerge(): encoder dönüşleri dokunuştan bırakmaya kadar
 *   tek undo kaydında birleşir (README §D "Encoder dönüşleri … tek undo kaydı").
 * - set(path, undefined) düz nesnede anahtarı siler (ör. held[id]); undo bunu geri koyar.
 * - Değer değişmiyorsa set hiçbir şey yapmaz (olay yok, undo kaydı yok) ve false döner.
 * - tx içinde fn hata atarsa o ana kadarki değişiklikler geri alınır ve hata yeniden atılır.
 * - restore(snap) durumu yerinde değiştirir (P3.S kimliği korunur), geçmişi siler ve
 *   bus 'state' {path:'*'} + 'restore' yayınlar.
 * - bus 'history' {canUndo, canRedo}: undo LED'i ve düğme durumları için.
 * - Undo kayıtları nesne değerlerini derin kopyalar; sonradan yerinde yapılan değişiklikler geçmişi bozmaz.
 * - Yalnız synth track'lerde p/mods vardır (§D'de drum track'te yok). JSON'dan dönen p (dizi ya da
 *   {"0":…} nesnesi) init/restore sırasında Float32Array'e çevrilir.
 * - UNSUPPORTED'da `partial:true` işaretli kayıtlar (layout, mainTrack) Faz 1'de tepki verir ama
 *   asıl işlevleri yoktur; modes kendi popup'ını gösterir, açıklamayı buradan alır.
 *   Faz 3 kayıtları da `(yakında)` der (planlı özellik); `(bu simülatörde yok)` yalnız phase 0.
 * - i18n köprüsü yükleme anında değil P3.bridgeI18n() ile kurulur; P3.store.init onu çağırır.
 * - P3.save.load() ilk çağrıda pagehide/visibilitychange'e flush bağlar (bekleyen yazı kaybolmasın).
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  // ---------------------------------------------------------------- sabitler
  P3.K = {
    V: '20260925a',
    HOLD_MS: 300, DOUBLE_MS: 500, TOUCH_POPUP_MS: 400, POPUP_MS: 1500,
    UNDO_MAX: 100,
    SAVE_KEY: 'bk_push3_v1', SAVE_MS: 300,
    VB: '161 135 2116 1725',
    LCD: { x: 581, y: 490.167, w: 1222, h: 203.67, W: 960, H: 160 },
    C: {
      off: '#1D1C22', gray: '#3A3A40', grayL: '#7A7A80', white: '#E6E6E6', green: '#38D65A', red: '#FA325E', blueD: '#2448C8',
      ledOff: '#2E3236', ledDim: '#7C858A', ledOn: '#FFFFFF', playGreen: '#0BC049', repeatGreen: '#46DD43', automateRed: '#E12020',
      lcdBg: '#000000', lcdName: '#8A8F93', lcdTrack: '#383E43', lcdDisabled: '#3A3F44', lcdWhite: '#FFFFFF', lcdMono: '#6B7075'
    },
    // Track'lerin sabit alanları; çalışma alanlarını initState ekler.
    TRACKS: [
      { id: 0, name: 'Wavetable', kind: 'synth', color: '#0088DE', preset: 'init' },
      { id: 1, name: 'Drums', kind: 'drum', color: '#D87635', kit: 'p3kit' }
    ],
    // Faz 1'de çalışmayan kontroller (sartname-kontrol-haritasi.md). phase: 2|3 planlı, 0 kapsam dışı.
    // partial:true → Faz 1'de kısmi tepki var (modes kendi popup'ını gösterir), asıl işlev sonra gelir.
    UNSUPPORTED: {
      sets: { phase: 3, tr: `Sets: Gerçek Push 3'te kayıtlı Set'leri listeler, açar ve yenisini başlatır. Burada Serbest Çal kayıtları olarak gelecek (yakında).` },
      setup: { phase: 3, tr: `Setup: Pad hassasiyeti, MPE, ekran parlaklığı ve iş akışı gibi cihaz ayarlarını açar (yakında).` },
      user: { phase: 0, tr: `User: Pad'leri ve düğmeleri başka yazılımlar için serbest bir MIDI kontrolcüsüne çevirir (bu simülatörde yok).` },
      lock: { phase: 2, tr: `Lock: Basılı tutup Stop Clip, Mute veya Solo'ya basınca o işlev kilitlenir; alt ekran düğmeleri track'leri doğrudan durdurur, susturur ya da solo yapar (yakında).` },
      save: { phase: 3, tr: `Save: Açık Set'i kaydeder. Burada Serbest Çal durumunu saklayacak (yakında).` },
      add: { phase: 3, tr: `Add: Tarayıcıyı açar; seçili track'e cihaz, preset ya da yeni bir track ekler (yakında).` },
      swap: { phase: 2, tr: `Swap: Seçili cihazın presetini tarayıcıdan değiştirir (Hot-Swap); listede jog ile gezilir (yakında).` },
      mix: { phase: 2, tr: `Mix: Ekranı mikser görünümüne alır; encoder'lar track seviyelerini ve pan'ları ayarlar (yakında).` },
      clip: { phase: 3, tr: `Clip: Seçili clip'in başlangıç, loop, uzunluk ve transpoze ayarlarını ekranda açar (yakında).` },
      sessionScreen: { phase: 2, tr: `Session Screen: Ekranda Live'ın Session View'ına benzeyen clip ızgarasını gösterir (yakında).` },
      quantize: { phase: 2, tr: `Quantize: Kısa basınca seçili clip'in notalarını ızgaraya hizalar; basılı tutunca quantize ayarları açılır (yakında).` },
      fixedLength: { phase: 2, tr: `Fixed Length: Açıkken yeni kayıtlar seçilen uzunlukta (ör. 2 bar) kendiliğinden biter ve döngüye girer; basılı tutunca uzunluk seçilir (yakında).` },
      automate: { phase: 3, tr: `Automate: Açıkken çalma sırasında encoder hareketleri clip'e otomasyon olarak kaydedilir (yakında).` },
      'new': { phase: 2, tr: `New: Seçili clip'i durdurur ve yeni bir fikir kaydetmek için boş bir clip slotu hazırlar (yakında).` },
      capture: { phase: 2, tr: `Capture: Kayıt kapalıyken bile son çaldıklarını yakalayıp bir clip'e dönüştürür (yakında).` },
      session: { phase: 2, tr: `Session: Pad'leri clip başlatma ızgarasına çevirir; her sütun bir track, her satır bir scene. Basılı tutunca geçici olarak geçer (yakında).` },
      repeat: { phase: 2, tr: `Repeat: Basılı tuttuğun pad'i seçili ritim aralığında tekrar tekrar çalar; aralık sağdaki scene düğmeleriyle seçilir (yakında).` },
      doubleLoop: { phase: 2, tr: `Double Loop: Clip'in döngü uzunluğunu ve içindeki notaları ikiye katlar (yakında).` },
      duplicate: { phase: 2, tr: `Duplicate: Seçili clip'i, scene'i ya da sequencer sayfasını kopyalar; basılı tutup başka bir yere basınca oraya kopyalar (yakında).` },
      convert: { phase: 0, tr: `Convert: Bir sesi Simpler'a, Drum Rack'e ya da audio clip'e dönüştürür (bu simülatörde yok).` },
      dpadC: { phase: 2, tr: `D-pad ortası: Session'da seçili scene'i ya da clip'i başlatır (yakında).` },
      layout: { phase: 2, partial: true, tr: `Layout: Pad düzenini değiştirir; melodik track'te 64 Notes, Melodic Sequencer ve Sequencer + 32 Notes, Drum Rack'te Loop Selector, 16 Velocities ve 64 Pads arasında geçer. 4ths, 3rds ve Sequential Scale menüsündedir. Şimdilik yalnız 64 Notes var (yakında).` },
      // VARSAYIM: MiscButton = Main Track eşlemesi çıkarım (dogrulanmis-donanim.md §244).
      mainTrack: { phase: 2, partial: true, tr: `Main Track: Ana (master) track'i seçer; Mix görünümünde ana çıkışın seviyesini ve efektlerini ayarlarsın (yakında).` }
    },
    kbVel: 100, kbVelShift: 70
  };

  // ---------------------------------------------------------------- olay yolu
  // Dinleyici hatası diğer dinleyicileri durdurmaz. Emit sırasında on/off güvenli (kopya üzerinde döner).
  var listeners = {};

  P3.bus = {
    on: function (type, fn) {
      (listeners[type] || (listeners[type] = [])).push(fn);
      return function () { P3.bus.off(type, fn); };
    },
    off: function (type, fn) {
      var a = listeners[type];
      if (!a) return;
      var i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    },
    // Özel dinleyiciler (payload, type), '*' dinleyicileri (type, payload) alır.
    emit: function (type, payload) {
      if (type === '*') return;
      var a = listeners[type], w = listeners['*'], i;
      if (a && a.length) {
        a = a.slice();
        for (i = 0; i < a.length; i++) {
          try { a[i](payload, type); } catch (e) { console.warn('[p3] bus listener error:', type, e); }
        }
      }
      if (w && w.length) {
        w = w.slice();
        for (i = 0; i < w.length; i++) {
          try { w[i](type, payload); } catch (e) { console.warn('[p3] bus * listener error:', type, e); }
        }
      }
    }
  };

  // ---------------------------------------------------------------- yardımcılar
  function hasRaf() { return typeof requestAnimationFrame === 'function'; }

  function isTyped(v) { return ArrayBuffer.isView(v) && !(v instanceof DataView); }

  function deepClone(v) {
    if (v === null || typeof v !== 'object') return v;
    if (isTyped(v)) return v.slice();
    if (Array.isArray(v)) {
      var a = new Array(v.length);
      for (var i = 0; i < v.length; i++) a[i] = deepClone(v[i]);
      return a;
    }
    if (v instanceof Date) return new Date(v.getTime());
    var o = {};
    for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = deepClone(v[k]);
    return o;
  }

  function nav() { return typeof navigator !== 'undefined' ? navigator : null; }

  function mq(q) {
    try { return typeof matchMedia === 'function' && matchMedia(q).matches; } catch (e) { return false; }
  }

  P3.u = {
    clamp: function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },
    // JS'teki % negatif sayıda negatif döner; pad/oktav indekslerinde hep 0..m-1 gerekir.
    mod: function (n, m) { return ((n % m) + m) % m; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    // −70 dB altı Live'daki gibi −inf sayılır.
    dbToGain: function (db) { return (db < -70 || db !== db) ? 0 : Math.pow(10, db / 20); },
    gainToDb: function (g) { return g > 0 ? 20 * Math.log10(g) : -Infinity; },
    // Tekrarlanabilir rastgelelik (prosedürel tablolar, testler).
    mulberry32: function (seed) {
      var a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    deepClone: deepClone,
    // Kare başına en fazla bir çağrı, son argümanlarla.
    rafThrottle: function (fn) {
      var id = null, args = null, ctx = null;
      function run() { id = null; var a = args; args = null; fn.apply(ctx, a); }
      function w() {
        args = arguments; ctx = this;
        if (id === null) id = hasRaf() ? requestAnimationFrame(run) : setTimeout(run, 16);
      }
      w.cancel = function () {
        if (id === null) return;
        if (hasRaf()) cancelAnimationFrame(id); else clearTimeout(id);
        id = null; args = null;
      };
      return w;
    },
    debounce: function (fn, ms) {
      var id = null, args = null, ctx = null;
      function run() { id = null; var a = args; args = null; fn.apply(ctx, a); }
      function w() { args = arguments; ctx = this; if (id !== null) clearTimeout(id); id = setTimeout(run, ms); }
      w.cancel = function () { if (id !== null) clearTimeout(id); id = null; args = null; };
      w.flush = function () { if (id !== null) { clearTimeout(id); run(); } };
      return w;
    },
    // iPadOS 13+ kendini Mac olarak tanıtır; dokunma noktası sayısı ayırt eder.
    isIOS: function () {
      var n = nav();
      if (!n) return false;
      return /iPad|iPhone|iPod/.test(n.userAgent || '') || (n.platform === 'MacIntel' && n.maxTouchPoints > 1);
    },
    isMobile: function () {
      var n = nav();
      return !!n && (P3.u.isIOS() || /Android|Mobi/i.test(n.userAgent || ''));
    },
    // Dokunmatik dizüstülerde fare de olabilir; herhangi bir hassas işaretçi yeterli.
    hasPointerFine: function () { return mq('(any-pointer: fine)'); }
  };

  // ---------------------------------------------------------------- durum
  function makeTrack(def) {
    var t = deepClone(def);
    t.mute = false; t.solo = false; t.arm = true; t.vol = 0; t.pan = 0;
    if (t.kind === 'synth') {
      t.p = new Float32Array(0);   // P3.store.init P3.wtp.defaults() ile doldurur
      t.mods = {};
      t.pos = 21;                  // P3.scale.defaultPos: C Major / In Key / 4ths
    } else {
      t.selPad = 0; t.bank = 0; t.page = 0; t.loopOff = 0;
    }
    t.repeat = { on: false, rate: 5 };
    t.grid = 3;
    t.clips = [null, null, null, null, null, null, null, null];
    t.playing = -1;
    return t;
  }

  P3.initState = function () {
    return {
      v: 1,
      app: { mode: 'menu', audio: 'off', profile: 'std' },
      pad: 'note',
      view: 'device',
      overlay: null,
      bankView: false,
      popup: null,
      held: {},
      sel: { track: 0 },
      tracks: P3.K.TRACKS.map(makeTrack),
      scale: { root: 0, idx: 0, inKey: true, fixed: false, layoutIdx: 0 },
      transport: { playing: false, rec: 'idle', bpm: 120, swing: 0, metro: false, tapTimes: [] },
      swingTempo: 'tempo',
      vol: { target: 'main', main: -10, phones: -10, cue: -10 },
      accent: { on: false },
      strip: { mode: 'pb', pb: 0, mod: 0 },
      wtui: { bank: 0, osc: '1', flt: 1, env: 'amp', lfo: 1, ampView: 'time', modView: 'time', expr: 'mpe', target: null, prevBank: 0, touched: -1 },
      prefs: { velMode: 'fixed', kbOn: true, kbLayout: 'grid', kbWin: 0, noteNames: false, hints: true, view: 'auto', quality: 'auto' }
    };
  };

  // Synth track parametrelerini tamamlar. p3-wt-params core'dan sonra yüklendiği için tembel yapılır.
  // JSON'dan gelen p dizi ya da {"0":…} nesnesi olabilir; Float32Array'e çevrilir.
  function hydrate(S) {
    var wtp = P3.wtp;
    (S.tracks || []).forEach(function (t) {
      if (t.kind !== 'synth') return;
      if (t.p && !isTyped(t.p) && typeof t.p === 'object') {
        var src = t.p, n = Array.isArray(src) ? src.length : Object.keys(src).length, f = new Float32Array(n);
        for (var i = 0; i < n; i++) f[i] = +src[i] || 0;
        t.p = f;
      }
      if (!isTyped(t.p)) t.p = new Float32Array(0);
      if (!t.mods || typeof t.mods !== 'object') t.mods = {};
      if (!wtp) return;
      if (t.p.length === 0 && typeof wtp.defaults === 'function') {
        t.p = wtp.defaults();
        if (wtp.DEFAULT_MODS && Object.keys(t.mods).length === 0) t.mods = deepClone(wtp.DEFAULT_MODS);
      }
    });
  }

  // ---------------------------------------------------------------- store
  // Undo kaydı: {label, changes:[{path, prev, next}]}. Aynı path bir kayıtta bir kez tutulur
  // (ilk prev, son next) — encoder birleştirmesi ve tx bunu kullanır.
  var undoStack = [], redoStack = [];
  var txRec = null;
  var mergeRec = null, mergeKey = null;

  function splitPath(path) {
    if (path === '' || path == null) return [];
    return String(path).split('.');
  }

  function keyOf(obj, k) { return (Array.isArray(obj) || isTyped(obj)) ? +k : k; }

  function resolveParent(S, parts) {
    var o = S;
    for (var i = 0; i < parts.length - 1; i++) {
      if (o === null || typeof o !== 'object') return null;
      o = o[keyOf(o, parts[i])];
    }
    return (o !== null && typeof o === 'object') ? o : null;
  }

  function readPath(path) {
    var parts = splitPath(path), o = P3.store.S;
    for (var i = 0; i < parts.length; i++) {
      if (o === null || typeof o !== 'object') return undefined;
      o = o[keyOf(o, parts[i])];
    }
    return o;
  }

  // Ham yazma: geçmişe dokunmaz. Değişen değeri {prev, next} olarak döner, değişmediyse null.
  function writePath(path, value) {
    var parts = splitPath(path);
    if (!parts.length) { console.warn('[p3] store.set: empty path'); return null; }
    var parent = resolveParent(P3.store.S, parts);
    if (!parent) { console.warn('[p3] store.set: missing parent for', path); return null; }
    var k = keyOf(parent, parts[parts.length - 1]);
    var prev = parent[k];
    if (isTyped(parent)) {
      if (k < 0 || k >= parent.length || k !== Math.floor(k)) { console.warn('[p3] store.set: index out of range', path); return null; }
      if (Math.fround(value) === prev) return null;
      parent[k] = value;
    } else if (value === undefined && !Array.isArray(parent)) {
      if (!(k in parent)) return null;
      delete parent[k];
    } else {
      if (prev === value) return null;
      parent[k] = value;
    }
    return { prev: prev, next: parent[k] };
  }

  function emitHistory() {
    P3.bus.emit('history', { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
  }

  function addChange(rec, path, prev, next) {
    for (var i = 0; i < rec.changes.length; i++) {
      if (rec.changes[i].path === path) { rec.changes[i].next = next; return; }
    }
    rec.changes.push({ path: path, prev: prev, next: next });
  }

  function pushRecord(rec) {
    undoStack.push(rec);
    if (undoStack.length > P3.K.UNDO_MAX) undoStack.shift();
    redoStack.length = 0;
    emitHistory();
  }

  function closeMerge() { mergeRec = null; mergeKey = null; }

  // Kayıttaki değişiklikleri uygular; dir = 'prev' (undo) ya da 'next' (redo).
  function applyRecord(rec, dir) {
    var list = dir === 'prev' ? rec.changes.slice().reverse() : rec.changes;
    list.forEach(function (c) {
      var r = writePath(c.path, deepClone(c[dir]));
      if (r) P3.bus.emit('state', { path: c.path, value: r.next, prev: r.prev });
    });
  }

  P3.store = {
    S: null,

    // S verilmezse initState() kullanılır. Geçmiş temizlenir.
    init: function (S) {
      S = S || P3.initState();
      hydrate(S);
      P3.store.S = P3.S = S;
      undoStack.length = 0; redoStack.length = 0; txRec = null; closeMerge();
      P3.bridgeI18n();
      return S;
    },

    get: function (path) { return readPath(path); },

    // opts: {undo:'etiket', merge:'anahtar', silent:true}. Değer değiştiyse true döner.
    set: function (path, value, opts) {
      if (!P3.store.S) { console.warn('[p3] store.set before init:', path); return false; }
      opts = opts || {};
      path = String(path);
      var r = writePath(path, value);
      if (!r) return false;

      if (txRec) {
        addChange(txRec, path, deepClone(r.prev), deepClone(r.next));
      } else if (opts.undo) {
        if (opts.merge && mergeRec && mergeKey === opts.merge && undoStack[undoStack.length - 1] === mergeRec) {
          addChange(mergeRec, path, deepClone(r.prev), deepClone(r.next));
        } else {
          var rec = { label: opts.undo, changes: [{ path: path, prev: deepClone(r.prev), next: deepClone(r.next) }] };
          if (opts.merge) { mergeRec = rec; mergeKey = opts.merge; } else closeMerge();
          pushRecord(rec);
        }
      }

      if (!opts.silent) P3.bus.emit('state', { path: path, value: r.next, prev: r.prev });
      return true;
    },

    // Açık birleştirmeyi kapatır (encoder dokunuşu bitti). key verilirse yalnız o anahtarı kapatır.
    endMerge: function (key) {
      if (key === undefined || key === mergeKey) closeMerge();
    },

    // fn içindeki tüm set'ler tek undo kaydında toplanır (opts.undo aranmaz). İç içe tx dışa katılır.
    tx: function (label, fn) {
      if (txRec) return fn();
      closeMerge();
      var rec = txRec = { label: label, changes: [] };
      var out;
      try {
        out = fn();
      } catch (e) {
        txRec = null;
        applyRecord(rec, 'prev');
        throw e;
      }
      txRec = null;
      if (rec.changes.length) pushRecord(rec);
      return out;
    },

    undo: function () {
      if (txRec) { console.warn('[p3] store.undo inside tx ignored'); return false; }
      closeMerge();
      var rec = undoStack.pop();
      if (!rec) return false;
      applyRecord(rec, 'prev');
      redoStack.push(rec);
      emitHistory();
      P3.bus.emit('undo', { label: rec.label });
      return true;
    },

    redo: function () {
      if (txRec) { console.warn('[p3] store.redo inside tx ignored'); return false; }
      closeMerge();
      var rec = redoStack.pop();
      if (!rec) return false;
      applyRecord(rec, 'next');
      undoStack.push(rec);
      emitHistory();
      P3.bus.emit('redo', { label: rec.label });
      return true;
    },

    canUndo: function () { return undoStack.length > 0; },
    canRedo: function () { return redoStack.length > 0; },
    // Son kaydın etiketi (LCD popup'ı için: "Undo: Scale").
    undoLabel: function () { var r = undoStack[undoStack.length - 1]; return r ? r.label : null; },
    redoLabel: function () { var r = redoStack[redoStack.length - 1]; return r ? r.label : null; },

    clearHistory: function () {
      undoStack.length = 0; redoStack.length = 0; closeMerge();
      emitHistory();
    },

    snapshot: function () { return deepClone(P3.store.S); },

    // Nesne kimliği korunur: P3.S'yi tutan modüller aynı referansla devam eder.
    restore: function (snap) {
      var S = P3.store.S, k;
      if (!S || !snap || typeof snap !== 'object') return false;
      var c = deepClone(snap);
      for (k in S) if (!(k in c)) delete S[k];
      for (k in c) S[k] = c[k];
      hydrate(S);
      undoStack.length = 0; redoStack.length = 0; closeMerge();
      emitHistory();
      P3.bus.emit('state', { path: '*', value: S, prev: null });
      P3.bus.emit('restore', {});
      return true;
    }
  };

  P3.S = null;

  // ---------------------------------------------------------------- yerel kayıt
  // Tek anahtar altında tek JSON. Gizli modda / kota dolunca / bozuk JSON'da sessizce boş nesneye düşer.
  var saveCache = null, saveTimer = null, saveHooked = false;

  function storage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }

  function readSaved() {
    try {
      var ls = storage(), raw = ls && ls.getItem(P3.K.SAVE_KEY);
      if (!raw) return {};
      var o = JSON.parse(raw);
      return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    } catch (e) { return {}; }
  }

  function hookUnload() {
    if (saveHooked || typeof window.addEventListener !== 'function') return;
    saveHooked = true;
    window.addEventListener('pagehide', function () { P3.save.flush(); });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') P3.save.flush(); });
    }
  }

  P3.save = {
    // Diskten yeniden okur (başka sekmenin yazdığını görmek için de kullanılır). Bekleyen yazı önce yazılır.
    load: function () {
      if (saveTimer !== null) P3.save.flush();
      saveCache = readSaved();
      hookUnload();
      return saveCache;
    },
    // key noktalı olabilir: 'tutorial.current'.
    get: function (key) {
      if (!saveCache) saveCache = readSaved();
      var parts = splitPath(key), o = saveCache;
      for (var i = 0; i < parts.length; i++) {
        if (o === null || typeof o !== 'object') return undefined;
        o = o[parts[i]];
      }
      return o;
    },
    patch: function (key, value) {
      if (!saveCache) saveCache = readSaved();
      var parts = splitPath(key);
      if (!parts.length) return;
      var o = saveCache;
      for (var i = 0; i < parts.length - 1; i++) {
        if (o[parts[i]] === null || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
        o = o[parts[i]];
      }
      if (value === undefined) delete o[parts[parts.length - 1]];
      else o[parts[parts.length - 1]] = value;
      if (saveTimer !== null) clearTimeout(saveTimer);
      saveTimer = setTimeout(P3.save.flush, P3.K.SAVE_MS);
    },
    flush: function () {
      if (saveTimer !== null) { clearTimeout(saveTimer); saveTimer = null; }
      if (!saveCache) return;
      if (saveCache.v === undefined) saveCache.v = 1;
      try {
        var ls = storage();
        if (ls) ls.setItem(P3.K.SAVE_KEY, JSON.stringify(saveCache));
      } catch (e) { /* gizli mod / kota: ilerleme yalnız bu oturumda kalır */ }
    },
    reset: function () {
      if (saveTimer !== null) { clearTimeout(saveTimer); saveTimer = null; }
      saveCache = {};
      try { var ls = storage(); if (ls) ls.removeItem(P3.K.SAVE_KEY); } catch (e) { /* yut */ }
    }
  };

  // ---------------------------------------------------------------- dil
  function lang() {
    try {
      var i = window._i18n;
      if (i && typeof i.getLang === 'function') return i.getLang() || 'tr';
      var ls = storage();
      return (ls && ls.getItem('_lang')) || 'tr';
    } catch (e) { return 'tr'; }
  }

  // Faz 1 yalnız TR; EN metni yoksa TR döner.
  P3.t = function (o) {
    if (o == null) return '';
    if (typeof o !== 'object') return String(o);
    return o[lang()] || o.tr || '';
  };

  // i18n.js setLang bir olay yaymıyor; JS ile çizilen metinlerin yenilenmesi için sarmalanır.
  // İdempotent: ikinci çağrı tekrar sarmalamaz.
  P3.bridgeI18n = function () {
    var i = window._i18n;
    if (!i || typeof i.setLang !== 'function' || i.setLang._p3) return;
    var orig = i.setLang;
    var wrapped = function (l) {
      var r = orig.apply(this, arguments);
      P3.bus.emit('lang', l);
      return r;
    };
    wrapped._p3 = true;
    i.setLang = wrapped;
  };

  // ---------------------------------------------------------------- panik
  // Asılı notaları ve basılı durumları temizlemek için tek çağrı; dinleyenler: wt, drums, input, seq.
  P3.panic = function (reason) { P3.bus.emit('panic', { reason: reason || '' }); };
})();
