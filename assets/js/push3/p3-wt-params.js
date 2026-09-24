/* p3-wt-params.js — Push 3 Laboratuvarı: Wavetable parametre modeli, Push 3 bankaları, presetler (P3.wtp)
 *
 * Sözleşme: docs/push3/README.md §G3. Parametre listesi ve sırası sartname-ses-motoru.md §2
 * WT_PARAMS ile birebir aynıdır (worklet aynı listeyi isimle kullanır); tek fark Cat 0..6 ve
 * Tab 0..3 (README A3). Sıra değişirse P3.K.V ve preset şeması sürümü artırılır.
 * Banka tanımları Push 3 script'ini izler (dogrulanmis-wavetable.md §C, birincil kaynak);
 * ekran biçimleri sartname-ses-motoru §2, sanal parametreler §3, tablolar §11, presetler §12.
 *
 * Dosya DOM'a dokunmaz ve yüklenirken yan etki üretmez. Kök nesne window yoksa globalThis'tir:
 * Node testleri ve istenirse AudioWorklet kapsamı aynı dosyayı (lfoShape, envCurve, PARAMS) kullanabilir.
 *
 * Yazma yolu: set/run/slotTurn/slotReset/setBank önce değişiklik listesi kurar, sonra uygular.
 * P3.store bu S'nin sahibiyse her değişiklik P3.store.set(path, value, opts) ile yazılır
 * (bus 'state' olayı + opts.undo/merge ile undo); değilse (Node testi) nesneler doğrudan değişir.
 * Her çağrı uygulanan listeyi döndürür:
 *   {t:'p',   k, path:'p.<i>',          value, prev}   tr.p[IDX[k]]
 *   {t:'mod', k, src, path:'mods.<k>.<src>', value, prev}   value undefined = miktar silindi (0)
 *   {t:'row', k, path:'mods.<k>',       value:{}, prev:undefined}   boş matris satırı (Add to Matrix)
 *   {t:'ui',  key, path:'wtui.<key>',   value, prev}   S.wtui
 * Track yolları store'da 'tracks.<i>.' önekiyle yazılır. applyPreset store'u kullanmaz (toplu yeniden kurulum).
 *
 * SAPMA/EKLEME (sözleşmeye göre):
 * - PARAMS kayıtlarına `name` (Live parametre adı) eklendi: Current Mod Target etiketi ve matris adları için.
 * - fmt(p, v, tr): tr opsiyonel ama oNTab için gerekli (tablo adı kategoriye bağlı). ENUMS.Tab yok;
 *   dinamik liste enumValues(p, tr). Tab'ın etkin üst sınırı kategorideki tablo sayısı − 1 (slotTurn uygular);
 *   kategori değişince Tab 0'a döner (VARSAYIM: Live'daki kategori seçici gibi).
 * - Slot'larda opsiyonel `dis:true`: Osc N kapalıyken Category, Table, Effect Type ve Pitch gri (dogrulanmis §B).
 *   Görevdeki `v:` anahtarı kullanıldı (README G3'teki `virtual:` yerine).
 * - vis() tek nesne döndürür; Main'de osc 1/2 seçiliyken ikinci görselleştirme (filter 3–5) `next` alanındadır
 *   (Push script'inde Main iki görselleştirme taşır). Nesne bağlam alanı da taşır: osc | flt | env | lfo.
 * - VIRTUAL imzaları options'la aynı düzende: get(S,tr,slot), set(S,tr,v,slot,opts),
 *   step(S,tr,turn,steps,fine,slot), fmt(S,tr,v?,slot). Selector'lar indeksle çalışır.
 * - Slot düzeyi yardımcılar slotView / slotTurn / slotReset: LCD ve modes aynı mantığı paylaşsın diye.
 * - setBank(S, i, opts): Matrix ve MIDI & MPE 'önceki banka' olarak kaydedilmez; Back hep son ses
 *   bankasına döner (dogrulanmis §C: script'in 'MIDI' adı yüzünden yaptığı hata uygulanmadı).
 * - Matris hedef takma adları (Live'daki gibi): Volume → 'AMP', Transpose → 'PITCH', Osc N Pitch → 'oNTransp'.
 *   Current Mod Target slotu AMP için Volume'u, PITCH için Transpose'u, oNTransp için pitchN'i gösterir.
 * - Mod Target listesi = miktarı olan satırlar + seçili hedef (Live: tıklanan parametre matriste geçici görünür).
 * - Osc Pitch: normal çevirmede `steps` ile yarım ton (detune korunur), fine'da `turn` ile sürekli
 *   (200 px = 2 st, px başına 0.01 st). Şartnamedeki "8 px'te 1 st" yerine: step durumsuz olduğu için tam
 *   yarım tona oturmanın tek yolu detent (Push: "normal = yarım ton, Shift = ince ayar").
 * - Main ve Oscillators'ta Mix seçiliyken Osc toggle option'ı boş (VARSAYIM: tek bir osilatör seçili değil).
 * - Add to Matrix option'ına enabled(S,tr) eklendi (yalnız dokunulan parametre modüle edilebiliyorsa).
 * - SOURCES README sırasını izler (11 Slide, 12 Note PB); araştırmadaki .adv indeksleri (11 Note PB,
 *   12 Slide) farklı ama .adv yüklenmediği için önemsiz — DEFAULT_MODS isimle eşlendi. SRC sabitleri eklendi.
 * - Faz kapısı: audibleTable(id) Faz 2 tablolarını 0'a (Temel Şekiller) düşürür, tableName(id) '(yakında)' ekler.
 * - SRATE_BARS: ENUMS.SRate'in bar cinsinden sayısal karşılığı (motor metni ayrıştırmasın diye).
 * - envCurve(x, s) eklendi; lfoShape'e Random için opsiyonel u (worklet kendi PRNG'sini verir).
 * - Preset mods DEFAULT_MODS'un üstüne yazılır (PB→Pitch, Velocity→Amp her presette kalır). Şartnamede
 *   verilmeyen değerler (pos-pad/noise-atmo pos .5, wobble/acid taban frekansı, testere için pos 2/3) VARSAYIM.
 */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : globalThis;
  var P3 = root.P3 = root.P3 || {};

  // Bu fazdan sonraki tablolar görünür ama Temel Şekiller olarak çalar (README A3). Faz 2'de 2 olur.
  var PHASE = 1;

  function clamp(x, a, b) { return x > a ? (x < b ? x : b) : a; }   // NaN → a

  // ---------------------------------------------------------------- parametreler
  // İlk 7 argüman sartname §2'deki P() ile aynı; name = Live parametre adı, en = ENUMS anahtarı.
  function P(k, min, max, def, curve, unit, mod, name, en) {
    var p = { k: k, min: min, max: max, def: def, curve: curve, unit: unit || '', mod: mod || 0, name: name };
    if (en) p.en = en;
    return p;
  }
  function OSC(p, n, on, fx) {
    var N = 'Osc ' + n + ' ';
    return [
      P(p + 'On', 0, 1, on, 'bool', '', 0, N + 'On'),
      P(p + 'Cat', 0, 6, 0, 'enum', '', 0, N + 'Category', 'Cat'),
      P(p + 'Tab', 0, 3, 0, 'enum', '', 0, N + 'Table', 'Tab'),
      P(p + 'Pos', 0, 1, 0, 'lin', '%', 1, N + 'Pos'),
      P(p + 'Transp', -24, 24, 0, 'int', 'st', 1, N + 'Transp'),
      P(p + 'Det', -.5, .5, 0, 'lin', 'st', 1, N + 'Detune'),
      P(p + 'Fx', 0, 3, fx, 'enum', '', 0, N + 'Effect Type', 'Fx'),
      P(p + 'Fx1', -1, 1, 0, 'lin', '%', 1, N + 'Effect 1'),
      P(p + 'Fx2', 0, 1, 0, 'lin', '%', 1, N + 'Effect 2'),
      P(p + 'Pan', -1, 1, 0, 'lin', 'pan', 1, N + 'Pan'),
      P(p + 'Gain', 0, 1, 1, 'gain', 'dB', 1, N + 'Gain')
    ];
  }
  function FLT(p, n, on, type, freq) {
    var N = 'Flt ' + n + ' ';
    return [
      P(p + 'On', 0, 1, on, 'bool', '', 0, N + 'On'),
      P(p + 'Type', 0, 4, type, 'enum', '', 0, N + 'Type', 'Type'),
      P(p + 'Circ', 0, 4, 0, 'enum', '', 0, N + 'LP/HP', 'Circ'),
      P(p + 'CircB', 0, 1, 0, 'enum', '', 0, N + 'BP/NO/MO', 'CircB'),
      P(p + 'Slope', 0, 1, 0, 'enum', '', 0, N + 'Slope', 'Slope'),
      P(p + 'Freq', 20, 20480, freq, 'exp', 'Hz', 1, N + 'Freq'),
      P(p + 'Res', 0, 1.25, 0, 'lin', '%', 1, N + 'Res'),
      P(p + 'Drive', 0, 24, 0, 'lin', 'dB', 1, N + 'Drive'),
      P(p + 'Morph', 0, 1, 0, 'lin', '%', 1, N + 'Morph')
    ];
  }
  function ENV(p, name, amp) {
    var N = name + ' ';
    return [
      P(p + 'A', 0, 20, .001, 'time', 's', 1, N + 'Attack'),
      P(p + 'D', .0015, 20, .6, 'time', 's', 1, N + 'Decay'),
      amp ? P(p + 'S', 0, 1, .5011876, 'gain', 'dB', 2, N + 'Sustain') : P(p + 'S', 0, 1, .5, 'lin', '%', 1, N + 'Sustain'),
      P(p + 'R', .0015, 20, .6, 'time', 's', 1, N + 'Release'),
      P(p + 'ASl', -1, 1, 0, 'lin', '%', 0, N + 'A Slope'),
      P(p + 'DSl', -1, 1, .5, 'lin', '%', 0, N + 'D Slope'),
      P(p + 'RSl', -1, 1, .5, 'lin', '%', 0, N + 'R Slope'),
      P(p + 'Loop', 0, 2, 0, 'enum', '', 0, N + 'Loop Mode', 'Loop')
    ].concat(amp ? [] : [
      P(p + 'Init', 0, 1, 0, 'lin', '%', 2, N + 'Initial'),
      P(p + 'Peak', 0, 1, 1, 'lin', '%', 1, N + 'Peak'),
      P(p + 'Fin', 0, 1, 0, 'lin', '%', 1, N + 'Final')
    ]);
  }
  function LFO(p, n) {
    var N = 'LFO ' + n + ' ';
    return [
      P(p + 'Shape', 0, 4, 0, 'enum', '', 0, N + 'Shape', 'Shape'),
      P(p + 'Shp', -1, 1, 0, 'lin', '%', 1, N + 'Shaping'),
      P(p + 'Amt', 0, 1, 1, 'lin', '%', 2, N + 'Amount'),
      P(p + 'Phase', 0, 360, 0, 'lin', '°', 0, N + 'Phase Offset'),
      P(p + 'Sync', 0, 1, 0, 'enum', '', 0, N + 'Sync', 'Sync'),
      P(p + 'Rate', .01, 30, 1, 'exp', 'Hz', 1, N + 'Rate'),
      P(p + 'SRate', 0, 21, 15, 'enum', '', 0, N + 'S. Rate', 'SRate'),
      P(p + 'Att', 0, 20, 0, 'time', 's', 1, N + 'Attack Time'),
      P(p + 'Retrig', 0, 1, 1, 'bool', '', 0, N + 'Retrigger')
    ];
  }

  var PARAMS = [].concat(OSC('o1', 1, 1, 3), OSC('o2', 2, 0, 0),
    [P('subOn', 0, 1, 0, 'bool', '', 0, 'Sub On'), P('subGain', 0, 1, .5011875, 'gain', 'dB', 1, 'Sub Gain'),
     P('subTone', 0, 1, 0, 'lin', '%', 1, 'Sub Tone'), P('subOct', 0, 2, 1, 'enum', '', 0, 'Sub Transpose', 'subOct')],
    FLT('f1', 1, 1, 0, 20480), FLT('f2', 2, 0, 1, 20), [P('route', 0, 2, 0, 'enum', '', 0, 'Filter Routing', 'route')],
    ENV('amp', 'Amp', true), ENV('e2', 'Env 2', false), ENV('e3', 'Env 3', false), LFO('l1', 1), LFO('l2', 2),
    [P('modTime', -1, 1, 0, 'lin', '%', 1, 'Time'), P('modAmt', 0, 2, 1, 'lin', '%', 2, 'Global Mod Amount'),
     P('transp', -48, 48, 0, 'int', 'st', 1, 'Transpose'), P('glide', 0, 20, 0, 'time', 's', 0, 'Glide'),
     P('vol', 0, 1, .3548134, 'gain', 'dB', 2, 'Volume'), P('mono', 0, 1, 0, 'bool', '', 0, 'Mono On'),
     P('polyIdx', 0, 7, 6, 'enum', '', 0, 'Poly Voices', 'polyIdx'), P('uniMode', 0, 6, 0, 'enum', '', 0, 'Unison Mode', 'uniMode'),
     P('uniVoices', 2, 8, 3, 'int', '', 0, 'Unison Voices'), P('uniAmt', 0, 1, .3, 'lin', '%', 2, 'Unison Amount'),
     P('hq', 0, 1, 0, 'bool', '', 0, 'Hi-Quality')],
    // 104, 105: yalnız matris hedefi. Live'da Volume'un matris satırı 'Amp', Transpose'unki 'Pitch'tir.
    [P('AMP', 0, 1, 1, 'lin', '%', 2, 'Amp'), P('PITCH', -48, 48, 0, 'lin', 'st', 1, 'Pitch')]);

  var IDX = {};
  PARAMS.forEach(function (p, i) { IDX[p.k] = i; });

  // ---------------------------------------------------------------- enum'lar ve tablolar
  var CATS = [`Temel`, `Harmonik`, `Vokal`, `FM`, `Sync`, `Dijital`, `Gürültü`];

  var ENUMS = {
    Cat: CATS,
    Fx: ['None', 'FM', 'Classic', 'Modern'],
    Type: ['Lowpass', 'Highpass', 'Bandpass', 'Notch', 'Morph'],
    Circ: ['Clean', 'OSR', 'MS2', 'SMP', 'PRD'],
    CircB: ['Clean', 'OSR'],
    Slope: ['12 dB', '24 dB'],
    route: ['Serial', 'Parallel', 'Split'],
    Loop: ['None', 'Trigger', 'Loop'],
    subOct: ['0', '-1', '-2'],
    Shape: ['Sine', 'Triangle', 'Saw', 'Square', 'Random'],
    Sync: ['Hz', 'Sync'],
    polyIdx: [2, 3, 4, 5, 6, 7, 8, 16],   // sayı: motor ses sayısını buradan okur
    uniMode: ['None', 'Classic', 'Shimmer', 'Noise', 'Phase Sync', 'Position Spread', 'Random Note'],
    // VARSAYIM: 22 adım, 15 = '1' (bar). Etiket listesi doğrulanamadı.
    SRate: ['1/64', '1/48', '1/32', '1/24', '1/16', '1/12', '1/8', '1/6', '3/16', '1/4', '5/16', '1/3', '3/8',
      '1/2', '3/4', '1', '1.5', '2', '3', '4', '6', '8'],
    Bool: ['Off', 'On'],
    // Push'a özel seçiciler (S.wtui)
    Osc: ['1', '2', 'S', 'Mix'],
    Flt: ['1', '2'],
    Env: ['Amp', 'Env2', 'Env3'],
    Lfo: ['1', '2'],
    AmpView: ['Time', 'Slope'],
    ModView: ['Time', 'Slope', 'Value'],
    Expr: ['MPE', 'Mono/Poly']
  };
  var POLY_TEXT = ENUMS.polyIdx.map(String);
  // S. Rate'in bar cinsinden sayısal karşılığı; motor LFO hızını bpm/60/(bar·4) ile bulur.
  var SRATE_BARS = ENUMS.SRate.map(function (s) { var q = s.split('/'); return q.length > 1 ? Number(q[0]) / Number(q[1]) : Number(s); });

  // §11: hepsi prosedürel ve kendi isimlerimizle. tab = kategori içi sıra, id = TABLES dizini.
  var TABLES = [
    { id: 0, cat: 0, tab: 0, name: `Temel Şekiller`, phase: 1 },
    { id: 1, cat: 0, tab: 1, name: `Pulse`, phase: 1 },
    { id: 2, cat: 0, tab: 2, name: `Sinüs Katlama`, phase: 1 },
    { id: 3, cat: 1, tab: 0, name: `Harmonik Tarama`, phase: 1 },
    { id: 4, cat: 1, tab: 1, name: `Tek↔Çift`, phase: 1 },
    { id: 5, cat: 1, tab: 2, name: `Organ`, phase: 1 },
    { id: 6, cat: 2, tab: 0, name: `Vokaller`, phase: 1 },
    { id: 7, cat: 3, tab: 0, name: `FM Tarama`, phase: 1 },
    { id: 8, cat: 4, tab: 0, name: `Sync Tarama`, phase: 2 },
    { id: 9, cat: 5, tab: 0, name: `Bitcrush`, phase: 2 },
    { id: 10, cat: 6, tab: 0, name: `Gürültü Spektrumu`, phase: 2 },
    { id: 11, cat: 5, tab: 1, name: `Rezonans Tarama`, phase: 2 }
  ];
  var BY_CAT = CATS.map(function (c, i) {
    return TABLES.filter(function (t) { return t.cat === i; }).sort(function (a, b) { return a.tab - b.tab; });
  });

  function catIndex(cat) { return clamp(Math.round(cat), 0, CATS.length - 1); }
  function tablesOf(cat) { return BY_CAT[catIndex(cat)].slice(); }
  // Kategoride olmayan bir Tab son tabloya oturur; böylece eski/bozuk değer de çalınabilir kalır.
  function tableId(cat, tab) {
    var list = BY_CAT[catIndex(cat)];
    return list[clamp(Math.round(tab), 0, list.length - 1)].id;
  }
  function tableName(id) {
    var t = TABLES[id];
    if (!t) return '';
    return t.phase > PHASE ? `${t.name} (yakında)` : t.name;
  }
  function audibleTable(id) { return TABLES[id] && TABLES[id].phase <= PHASE ? id : 0; }

  // Enum/bool parametrenin ekranda gösterilen değer listesi (her zaman string).
  function enumValues(p, tr) {
    if (p.curve === 'bool') return ENUMS.Bool;
    if (p.en === 'Tab') {
      var cat = tr && tr.p ? tr.p[IDX[p.k.replace('Tab', 'Cat')]] : 0;
      return BY_CAT[catIndex(cat)].map(function (t) { return tableName(t.id); });
    }
    return p.en === 'polyIdx' ? POLY_TEXT : ENUMS[p.en];
  }
  function tabLimit(tr, tabKey) { return BY_CAT[catIndex(tr.p[IDX[tabKey.replace('Tab', 'Cat')]])].length - 1; }

  // ---------------------------------------------------------------- eğriler ve encoder
  // Normalize değer n ∈ [0,1] ↔ gerçek değer (sartname §2). time eğrisi n³ VARSAYIM; gain: dB = −70+70n, n=0 → −inf.
  function toNorm(p, v) {
    var lo = p.min, hi = p.max;
    v = clamp(v, lo, hi);
    switch (p.curve) {
      case 'exp': return Math.log(v / lo) / Math.log(hi / lo);
      case 'time': return Math.cbrt((v - lo) / (hi - lo));
      case 'gain': return v > 0 ? clamp((20 * Math.log10(v) + 70) / 70, 0, 1) : 0;
      default: return (v - lo) / (hi - lo);
    }
  }
  function fromNorm(p, n) {
    var lo = p.min, hi = p.max;
    n = clamp(n, 0, 1);
    switch (p.curve) {
      case 'exp': return lo * Math.pow(hi / lo, n);
      case 'time': return lo + (hi - lo) * n * n * n;
      case 'gain': return n > 0 ? Math.pow(10, (70 * n - 70) / 20) : 0;
      case 'int': case 'enum': case 'bool': return Math.round(lo + n * (hi - lo));
      default: return lo + n * (hi - lo);
    }
  }
  // Encoder olayı → yeni değer. Sürekli değerler turn ile (1.0 = tam aralık), enum/int/bool steps ile
  // (detent başına 1). fine (Shift) turn'ü ×0.1 ölçekler; input turn'ü ayrıca ölçeklememelidir.
  function step(p, v, turn, steps, fine) {
    if (p.curve === 'bool') return steps > 0 ? p.max : steps < 0 ? p.min : v;
    if (p.curve === 'int' || p.curve === 'enum') return steps ? clamp(Math.round(v) + (steps | 0), p.min, p.max) : v;
    if (!turn) return v;
    return fromNorm(p, toNorm(p, v) + turn * (fine ? 0.1 : 1));
  }

  // ---------------------------------------------------------------- ekran biçimleri
  // sartname §2; Figma/M3'te görülmeyen hassasiyetler VARSAYIM. Eksi işareti ASCII '-'.
  function fixed(x, d) { var s = x.toFixed(d); return Number(s) === 0 ? (0).toFixed(d) : s; }   // '-0.0' yazma
  function fmtHz(v) {
    if (v < 9.995) return v.toFixed(2) + ' Hz';
    if (v < 99.95) return v.toFixed(1) + ' Hz';
    if (v < 999.5) return Math.round(v) + ' Hz';
    return (v / 1000).toFixed(1) + ' kHz';
  }
  function fmtTime(v) {
    var ms = v * 1000;
    if (ms < 9.95) return fixed(ms, 1) + ' ms';
    if (ms < 999.5) return Math.round(ms) + ' ms';
    return (v < 9.995 ? v.toFixed(2) : v.toFixed(1)) + ' s';
  }
  function fmtGain(v) { return v > 0 ? fixed(20 * Math.log10(v), 1) + ' dB' : '-inf dB'; }
  function fmtSt(v) {
    var r = Math.round(v * 100) / 100, a = Math.abs(r);
    return (r > 0 ? '+' : r < 0 ? '-' : '') + (a === Math.round(a) ? a : a.toFixed(2)) + ' st';
  }
  function fmtPan(v) { var n = Math.round(Math.abs(v) * 50); return n === 0 ? 'C' : n + (v < 0 ? ' L' : ' R'); }
  function fmtPct(v, digits) { return (digits ? fixed(v * 100, digits) : String(Math.round(v * 100) || 0)) + ' %'; }

  // tr yalnız oNTab için gerekir (tablo adları kategoriye bağlı).
  function fmt(p, v, tr) {
    if (p.curve === 'enum' || p.curve === 'bool') {
      var list = enumValues(p, tr);
      return list[clamp(Math.round(v) - p.min, 0, list.length - 1)];
    }
    switch (p.unit) {
      case 'Hz': return fmtHz(v);
      case 's': return fmtTime(v);
      case 'dB': return p.curve === 'gain' ? fmtGain(v) : fixed(v, 1) + ' dB';
      case 'st': return fmtSt(v);
      case 'pan': return fmtPan(v);
      case '°': return Math.round(v) + '°';
      case '%': return fmtPct(v, p.k === 'f1Res' || p.k === 'f2Res' ? 1 : 0);   // Resonance: '0.0 %'
    }
    return String(Math.round(v));   // birimsiz tamsayı (Unison Voices)
  }

  // ---------------------------------------------------------------- matris kaynakları
  var SOURCES = ['Amp', 'Env 2', 'Env 3', 'LFO 1', 'LFO 2', 'Velocity', 'Key', 'PB', 'Pressure', 'Mod Wheel',
    'Random', 'Slide', 'Note PB'];
  var SRC = { AMP_ENV: 0, ENV2: 1, ENV3: 2, LFO1: 3, LFO2: 4, VEL: 5, KEY: 6, PB: 7, PRESS: 8, MW: 9, RAND: 10,
    SLIDE: 11, NOTE_PB: 12 };

  // Wavetable.adv başlangıç matrisi. Anahtar = SOURCES indeksi.
  var DEFAULT_MODS = {
    o1Pos: { 9: 1, 11: 0.33 },     // Mod Wheel, Slide
    o1Fx1: { 8: 0.07 },            // Pressure → Osc 1 Warp
    AMP: { 5: 0.5 },               // Velocity
    PITCH: { 7: 2 / 48, 12: 1 }    // PB ±2 st, Note PB ±48 st
  };

  // Live'da bu parametrelerin matris satırı başka bir hedeftir.
  var MOD_ALIAS = { vol: 'AMP', transp: 'PITCH', o1Det: 'o1Transp', o2Det: 'o2Transp' };
  var FX_TARGET = [['FX 1', 'FX 2'], ['FM Pitch', 'FM Amt'], ['PW', 'Sync'], ['Warp', 'Fold']];

  // Matris satırının adı (Mod Target değeri). Filtre satırları matriste hâlâ eski adla ('Filter 1 Freq').
  function targetName(k, tr) {
    if (!k || IDX[k] === undefined) return '—';
    var m = /^o([12])(Transp|Fx1|Fx2)$/.exec(k);
    if (m) {
      if (m[2] === 'Transp') return 'Osc ' + m[1] + ' Pitch';
      var fx = tr && tr.p ? clamp(Math.round(tr.p[IDX['o' + m[1] + 'Fx']]), 0, 3) : 0;
      return 'Osc ' + m[1] + ' ' + FX_TARGET[fx][m[2] === 'Fx1' ? 0 : 1];
    }
    m = /^f([12])(Freq|Res|Drive|Morph)$/.exec(k);
    if (m) return 'Filter ' + m[1] + ' ' + m[2];
    return PARAMS[IDX[k]].name;
  }

  function hasAmount(row) { for (var s in row) if (row[s]) return true; return false; }
  // Görünen hedefler: miktarı olan satırlar + seçili hedef (boş satır yalnız seçiliyken görünür).
  function targetList(S, tr) {
    var cur = S.wtui.target, list = [];
    for (var k in tr.mods) if (IDX[k] !== undefined && (k === cur || hasAmount(tr.mods[k]))) list.push(k);
    return list.sort(function (a, b) { return IDX[a] - IDX[b]; });
  }
  // Etkin hedef: S.wtui.target bu track'in matrisinde yoksa ilk satır.
  function modTarget(S, tr) {
    var list = targetList(S, tr);
    return list.indexOf(S.wtui.target) >= 0 ? S.wtui.target : (list[0] || null);
  }

  // ---------------------------------------------------------------- değişiklik listesi
  // ch* fonksiyonları durumu değiştirmez, yalnız kayıt ekler; commit uygular.
  function chP(tr, k, v, out) {
    var i = IDX[k], prev = tr.p[i], next = Math.fround(v);
    if (next !== prev) out.push({ t: 'p', k: k, path: 'p.' + i, value: next, prev: prev });
    return out;
  }
  function chMod(tr, k, src, a, out) {
    var row = tr.mods[k], prev = row ? row[src] : undefined, next = a ? a : undefined;   // 0 → anahtar silinir
    if (next !== prev) out.push({ t: 'mod', k: k, src: src, path: 'mods.' + k + '.' + src, value: next, prev: prev });
    return out;
  }
  function chRow(tr, k, out) {
    if (!tr.mods[k]) out.push({ t: 'row', k: k, path: 'mods.' + k, value: {}, prev: undefined });
    return out;
  }
  function chUi(S, key, v, out) {
    var prev = S.wtui[key];
    if (prev !== v) out.push({ t: 'ui', key: key, path: 'wtui.' + key, value: v, prev: prev });
    return out;
  }

  // Yeni satır her yazımda taze nesnedir; döndürülen kayıttaki {} canlı durumla paylaşılmaz.
  function writeValue(c) { return c.t === 'row' ? (c.value ? {} : undefined) : c.value; }

  function applyDirect(S, tr, c) {
    var v = writeValue(c), row;
    if (c.t === 'p') tr.p[IDX[c.k]] = v;
    else if (c.t === 'ui') S.wtui[c.key] = v;
    else if (c.t === 'row') { if (v) tr.mods[c.k] = v; else delete tr.mods[c.k]; }
    else if (c.t === 'mod') {
      row = tr.mods[c.k] || (tr.mods[c.k] = {});
      if (v === undefined) delete row[c.src]; else row[c.src] = v;
    }
  }

  // Store bu durumun sahibiyse onun üzerinden yazar (olay + undo), değilse doğrudan.
  // Birleştirme anahtarı olmayan çok parçalı bir işlem tek undo kaydı olsun diye tx'e sarılır.
  function commit(S, tr, changes, opts) {
    if (!changes.length) return changes;
    var st = P3.store, ti = tr && S.tracks ? S.tracks.indexOf(tr) : -1;
    var viaStore = st && st.S === S && typeof st.set === 'function' &&
      changes.every(function (c) { return c.t === 'ui' || ti >= 0; });
    if (!viaStore) {
      changes.forEach(function (c) { applyDirect(S, tr, c); });
      return changes;
    }
    var write = function () {
      changes.forEach(function (c) { st.set(c.t === 'ui' ? c.path : 'tracks.' + ti + '.' + c.path, writeValue(c), opts); });
    };
    if (opts && opts.undo && !opts.merge && changes.length > 1 && typeof st.tx === 'function') st.tx(opts.undo, write);
    else write();
    return changes;
  }

  var BANK_MATRIX = 6;   // 6 Matrix, 7 MIDI & MPE: 'önceki banka' olarak kaydedilmez

  function planBank(S, i, out) {
    var cur = S.wtui.bank;
    i = clamp(Math.round(i), 0, 7);
    if (i === cur) return out;
    if (cur < BANK_MATRIX) chUi(S, 'prevBank', cur, out);
    return chUi(S, 'bank', i, out);
  }
  function setBank(S, i, opts) { return commit(S, null, planBank(S, i, []), opts); }

  // ---------------------------------------------------------------- sanal parametreler (S.wtui)
  // Seçici: değer S.wtui[key]'de saklanır; encoder ve option indeksle çalışır.
  function selector(key, label, values, stored) {
    function get(S) { var i = stored.indexOf(S.wtui[key]); return i < 0 ? 0 : i; }
    return {
      label: label, values: values,
      get: get,
      set: function (S, tr, i, slot, opts) {
        return commit(S, tr, chUi(S, key, stored[clamp(Math.round(i), 0, stored.length - 1)], []), opts);
      },
      step: function (S, tr, turn, steps) { return clamp(get(S) + (steps | 0), 0, stored.length - 1); },
      fmt: function (S, tr, i) { return values[i === undefined ? get(S) : clamp(Math.round(i), 0, values.length - 1)]; }
    };
  }

  var PITCH_FINE = 20;   // fine: turn×0.1×20 → 200 px = 2 st (px başına 0.01 st, sartname §2)

  // Osc N Pitch = Transp + Det tek encoder'da (Push PitchParameter). Ayrıştırma: t = round(c), det = c − t.
  function pitch(n) {
    var tk = 'o' + n + 'Transp', dk = 'o' + n + 'Det';
    function get(S, tr) { return tr.p[IDX[tk]] + tr.p[IDX[dk]]; }
    return {
      label: 'Osc ' + n + ' Pitch', bipolar: true, def: 0, modKey: tk,
      get: get,
      set: function (S, tr, c, slot, opts) {
        c = clamp(c, -24.5, 24.5);
        var t = clamp(Math.round(c), -24, 24), out = chP(tr, tk, t, []);
        return commit(S, tr, chP(tr, dk, clamp(c - t, -0.5, 0.5), out), opts);
      },
      // Normal: detent başına yarım ton, detune korunur. Shift: sürekli ince ayar.
      step: function (S, tr, turn, steps, fine) {
        var c = get(S, tr);
        return clamp(fine ? c + turn * 0.1 * PITCH_FINE : c + (steps | 0), -24.5, 24.5);
      },
      fmt: function (S, tr, c) { return fmtSt(c === undefined ? get(S, tr) : c); },
      norm: function (S, tr) { return (get(S, tr) + 24.5) / 49; }
    };
  }

  function amtGet(S, tr, slot) {
    var k = modTarget(S, tr), row = k ? tr.mods[k] : null;
    return row && row[slot.src] || 0;
  }

  var VIRTUAL = {
    osc: selector('osc', 'Oscillator', ENUMS.Osc, ['1', '2', 'S', 'Mix']),
    flt: selector('flt', 'Filter', ENUMS.Flt, [1, 2]),
    env: selector('env', 'Envelopes', ENUMS.Env, ['amp', 'e2', 'e3']),
    lfo: selector('lfo', 'LFO', ENUMS.Lfo, [1, 2]),
    ampView: selector('ampView', 'Envelope View', ENUMS.AmpView, ['time', 'slope']),
    modView: selector('modView', 'Envelope View', ENUMS.ModView, ['time', 'slope', 'value']),
    expr: selector('expr', 'Expression Mode', ENUMS.Expr, ['mpe', 'monopoly']),
    pitch1: pitch(1),
    pitch2: pitch(2),

    // Matris satırı seçici. Değer = targetList içindeki indeks (liste boşsa −1).
    modTarget: {
      label: 'Mod Target',
      get: function (S, tr) { return targetList(S, tr).indexOf(modTarget(S, tr)); },
      set: function (S, tr, i, slot, opts) {
        var list = targetList(S, tr);
        return list.length ? commit(S, tr, chUi(S, 'target', list[clamp(Math.round(i), 0, list.length - 1)], []), opts) : [];
      },
      step: function (S, tr, turn, steps) {
        var list = targetList(S, tr);
        return list.length ? clamp(list.indexOf(modTarget(S, tr)) + (steps | 0), 0, list.length - 1) : -1;
      },
      fmt: function (S, tr, i) {
        var list = targetList(S, tr);
        return targetName(list[i === undefined ? list.indexOf(modTarget(S, tr)) : i] || null, tr);
      }
    },

    // Seçili hedef için bir kaynağın miktarı (slot.src), −1..1. Tam aralık = 2 birim.
    modAmt: {
      label: 'Amount', bipolar: true, def: 0,
      get: amtGet,
      set: function (S, tr, a, slot, opts) {
        var k = modTarget(S, tr);
        return k ? commit(S, tr, chMod(tr, k, slot.src, clamp(a, -1, 1), []), opts) : [];
      },
      step: function (S, tr, turn, steps, fine, slot) {
        return clamp(amtGet(S, tr, slot) + (turn || 0) * 2 * (fine ? 0.1 : 1), -1, 1);
      },
      // PB ve Note PB perde hedeflerinde yarım ton gösterilir: Pitch ×48, Osc N Pitch ×24 (dogrulanmis §C).
      fmt: function (S, tr, a, slot) {
        if (a === undefined) a = amtGet(S, tr, slot);
        var k = modTarget(S, tr), src = slot && slot.src;
        if ((src === SRC.PB || src === SRC.NOTE_PB) && (k === 'PITCH' || k === 'o1Transp' || k === 'o2Transp')) {
          return (Math.round(a * (k === 'PITCH' ? 48 : 24) * 10) / 10 || 0) + ' st';   // VARSAYIM: birim 'st'
        }
        return fmtPct(a, 0);
      },
      norm: function (S, tr, slot) { return (amtGet(S, tr, slot) + 1) / 2; }
    }
  };

  // ---------------------------------------------------------------- bank seçenekleri (üst düğme 2..8)
  function toggleOpt(label, k) {
    return {
      label: label, kind: 'toggle',
      get: function (S, tr) { return tr.p[IDX[k]] > 0.5; },
      set: function (S, tr, on, opts) { return commit(S, tr, chP(tr, k, on ? 1 : 0, []), opts); }
    };
  }
  function paramSwitch(label, values, k) {
    return {
      label: label, kind: 'switch', values: values,
      get: function (S, tr) { return Math.round(tr.p[IDX[k]]); },
      set: function (S, tr, i, opts) { return commit(S, tr, chP(tr, k, clamp(Math.round(i), 0, values.length - 1), []), opts); }
    };
  }
  function virtualSwitch(label, name) {
    var V = VIRTUAL[name];
    return {
      label: label, kind: 'switch', values: V.values,
      get: function (S, tr) { return V.get(S, tr); },
      set: function (S, tr, i, opts) { return V.set(S, tr, i, null, opts); }
    };
  }
  function goTo(label, bank, key, value) {
    return {
      label: label, kind: 'action',
      run: function (S, tr, opts) { return commit(S, tr, planBank(S, bank, chUi(S, key, value, [])), opts); }
    };
  }

  // Dokunulan encoder'ın matris hedefi; modüle edilemiyorsa null.
  function touchedTarget(S, tr) {
    var b = BANKS[S.wtui.bank], i = S.wtui.touched;
    var s = b && i >= 0 && i < 8 ? b.slots(S, tr)[i] : null;
    if (!s) return null;
    if (s.v) return VIRTUAL[s.v].modKey || null;
    return PARAMS[IDX[s.k]].mod ? (MOD_ALIAS[s.k] || s.k) : null;
  }

  var OPT = {
    osc1: toggleOpt('Osc', 'o1On'), osc2: toggleOpt('Osc', 'o2On'), sub: toggleOpt('Sub', 'subOn'),
    filter: virtualSwitch('Filter Switch', 'flt'),
    slope1: paramSwitch('Slope', ['12dB', '24dB'], 'f1Slope'), slope2: paramSwitch('Slope', ['12dB', '24dB'], 'f2Slope'),
    sync1: paramSwitch('Sync', ['Hz', 'Sync'], 'l1Sync'), sync2: paramSwitch('Sync', ['Hz', 'Sync'], 'l2Sync'),
    expr: virtualSwitch('Expression Mode', 'expr'),
    // Tek bir encoder'a dokunuluyken ve parametresi modüle edilebiliyorsa etkin: satırı matrise ekler,
    // Mod Target yapar ve Matrix bankasına geçer (dogrulanmis §C).
    add: {
      label: 'Add to Matrix', kind: 'action',
      enabled: function (S, tr) { return !!touchedTarget(S, tr); },
      run: function (S, tr, opts) {
        var k = touchedTarget(S, tr);
        if (!k) return [];
        return commit(S, tr, planBank(S, BANK_MATRIX, chUi(S, 'target', k, chRow(tr, k, []))), opts);
      }
    },
    back: {
      label: 'Back', kind: 'action',
      run: function (S, tr, opts) {
        var b = S.wtui.prevBank;
        return commit(S, tr, planBank(S, b >= 0 && b < BANK_MATRIX ? b : 0, []), opts);
      }
    },
    goTo: [goTo('Go to Amp Env', 4, 'env', 'amp'), goTo('Go to Env 2', 4, 'env', 'e2'), goTo('Go to Env 3', 4, 'env', 'e3'),
      goTo('Go to LFO 1', 5, 'lfo', 1), goTo('Go to LFO 2', 5, 'lfo', 2)]
  };

  // ---------------------------------------------------------------- bankalar
  function slot(k, label, dis) { var s = { k: k, label: label }; if (dis) s.dis = true; return s; }
  function vslot(v, label, dis) { var s = { v: v, label: label }; if (dis) s.dis = true; return s; }
  function amt(src, label) { return { v: 'modAmt', src: src, label: label }; }

  function on(tr, k) { return tr.p[IDX[k]] > 0.5; }
  function ival(tr, k) { return Math.round(tr.p[IDX[k]]); }
  function oscN(S) { return S.wtui.osc === '1' ? 1 : S.wtui.osc === '2' ? 2 : 0; }   // 0 = S / Mix
  function fltN(S) { return S.wtui.flt === 2 ? 2 : 1; }
  function envKey(S) { return S.wtui.env === 'e2' || S.wtui.env === 'e3' ? S.wtui.env : 'amp'; }
  function lfoN(S) { return S.wtui.lfo === 2 ? 2 : 1; }
  function oscToggle(S) {
    var n = oscN(S);
    return n ? OPT['osc' + n] : S.wtui.osc === 'S' ? OPT.sub : null;   // VARSAYIM: Mix'te boş
  }

  // Current Mod Target slotu: hedefin kendi parametresi, kendi adıyla (takma adlar tersine çevrilir).
  function targetSlot(k) {
    if (k === 'AMP') return slot('vol', 'Volume');
    if (k === 'PITCH') return slot('transp', 'Transpose');
    if (k === 'o1Transp') return vslot('pitch1', 'Osc 1 Pitch');
    if (k === 'o2Transp') return vslot('pitch2', 'Osc 2 Pitch');
    return slot(k, PARAMS[IDX[k]].name);
  }

  var FX1_LABEL = [null, 'Pitch', 'Pulse Width', 'Warp'];   // None, FM, Classic, Modern
  var FX2_LABEL = [null, 'Amount', 'Sync', 'Fold'];
  var ADD = OPT.add;
  var NONE7 = [null, null, null, null, null, null, null];

  // Drum track'te (p yok) bankalar boş döner.
  function bank(name, vis, slots, options) {
    return {
      name: name,
      vis: function (S, tr) { return tr && tr.p ? vis(S, tr) : null; },
      slots: function (S, tr) { return tr && tr.p ? slots(S, tr) : [null, null, null, null, null, null, null, null]; },
      options: function (S, tr) { return tr && tr.p ? options(S, tr) : NONE7.slice(); }
    };
  }

  var BANKS = [
    bank('Main',
      function (S) {
        var filter = { type: 'filter', cols: [3, 5], flt: fltN(S) }, n = oscN(S);
        return n ? { type: 'wavetable', cols: [0, 2], osc: n, next: filter } : filter;
      },
      function (S, tr) {
        var n = oscN(S), f = 'f' + fltN(S), s2, s3;
        if (n) { s2 = slot('o' + n + 'Tab', 'Table', !on(tr, 'o' + n + 'On')); s3 = slot('o' + n + 'Pos', 'Position'); }
        else if (S.wtui.osc === 'S') { s2 = slot('subGain', 'Gain'); s3 = slot('subTone', 'Tone'); }
        else { s2 = slot('o1Gain', 'Gain 1'); s3 = slot('o2Gain', 'Gain 2'); }
        return [vslot('osc', 'Oscillator'), s2, s3,
          // README A5: Filter 2'de script eski 'Filter 2 Type' adını aradığı için gerçek cihazda slot boş.
          fltN(S) === 1 ? slot('f1Type', 'Filter Type') : null,
          slot(f + 'Freq', 'Frequency'), slot(f + 'Res', 'Resonance'), slot('modTime', 'Mod Time'), slot('modAmt', 'Mod Amt')];
      },
      // Üst 5: tanım 'Filter' option'ı istiyor ama script bu adda option yaratmıyor → boş.
      function (S) { return [oscToggle(S), null, OPT.filter, null, null, null, ADD]; }),

    bank('Oscillators',
      function (S) { var n = oscN(S); return n ? { type: 'wavetable', cols: [1, 3], osc: n } : null; },
      function (S, tr) {
        var n = oscN(S);
        if (n) {
          var p = 'o' + n, off = !on(tr, p + 'On'), fx = clamp(ival(tr, p + 'Fx'), 0, 3);
          return [vslot('osc', 'Oscillator'), slot(p + 'Cat', 'Category', off), slot(p + 'Tab', 'Table', off),
            slot(p + 'Pos', 'Position'), vslot('pitch' + n, 'Pitch', off), slot(p + 'Fx', 'Effect Type', off),
            fx ? slot(p + 'Fx1', FX1_LABEL[fx]) : null, fx ? slot(p + 'Fx2', FX2_LABEL[fx]) : null];
        }
        if (S.wtui.osc === 'S') {
          return [vslot('osc', 'Oscillator'), slot('subGain', 'Gain'), slot('subTone', 'Tone'), slot('subOct', 'Octave'),
            null, null, null, null];
        }
        return [vslot('osc', 'Oscillator'), vslot('pitch1', 'Pitch 1', !on(tr, 'o1On')), vslot('pitch2', 'Pitch 2', !on(tr, 'o2On')),
          slot('subOct', 'Octave Sub'), slot('o1Gain', 'Gain 1'), slot('o2Gain', 'Gain 2'), null, slot('subGain', 'Gain Sub')];
      },
      function (S) { return [oscToggle(S), null, null, null, null, null, ADD]; }),

    bank('Filters',
      function (S) { return { type: 'filter', cols: [2, 4], flt: fltN(S) }; },
      function (S, tr) {
        var f = 'f' + fltN(S), type = ival(tr, f + 'Type'), circ = type <= 1 ? f + 'Circ' : f + 'CircB', s7 = null;
        // Drive: devre Clean değilken (script Notch'ta da gösterir; DSP kılavuzu izler, sartname §7).
        if (type === 4) s7 = slot(f + 'Morph', 'Morph');
        else if (ival(tr, circ) !== 0) s7 = slot(f + 'Drive', 'Drive');
        return [vslot('flt', 'Filter'), slot(f + 'On', 'Filter'), slot(f + 'Type', 'Type'), slot(f + 'Freq', 'Frequency'),
          slot(f + 'Res', 'Resonance'), slot(circ, 'Filter Circuit'), s7, slot('route', 'Routing')];
      },
      function (S) { return [null, OPT['slope' + fltN(S)], null, null, null, null, ADD]; }),

    bank('Global',
      function () { return null; },
      function (S, tr) {
        return [slot('mono', 'Mono'), on(tr, 'mono') ? slot('glide', 'Glide') : slot('polyIdx', 'Poly Voices'),
          slot('uniMode', 'Unison Mode'), slot('uniVoices', 'Unison Voices'), slot('uniAmt', 'Unison Amount'),
          slot('transp', 'Transpose'), null, slot('vol', 'Volume')];
      },
      function () { return [null, null, null, null, null, null, ADD]; }),

    bank('Envelopes',
      function (S) { return { type: 'env', cols: [2, 5], env: envKey(S) }; },
      function (S) {
        var e = envKey(S), amp = e === 'amp', view = amp ? S.wtui.ampView : S.wtui.modView, a, d, r;
        if (view === 'slope') {
          // Env 3 + Slope'ta script with_name('Attack') kullanır (Ableton tutarsızlığı); gerçek cihazdaki gibi.
          a = slot(e + 'ASl', e === 'e3' ? 'Attack' : 'Attack Slope');
          d = slot(e + 'DSl', 'Decay Slope');
          r = slot(e + 'RSl', 'Release Slope');
        } else if (view === 'value' && !amp) {
          a = slot(e + 'Init', 'Initial'); d = slot(e + 'Peak', 'Peak'); r = slot(e + 'Fin', 'Final');
        } else {
          a = slot(e + 'A', 'Attack'); d = slot(e + 'D', 'Decay'); r = slot(e + 'R', 'Release');
        }
        return [vslot('env', 'Envelopes'), vslot(amp ? 'ampView' : 'modView', 'Envelope View'),
          a, d, slot(e + 'S', 'Sustain'), r, slot(e + 'Loop', 'Loop Mode'), null];
      },
      function () { return [null, null, null, null, null, null, ADD]; }),

    bank('LFOs',
      function (S) { return { type: 'lfo', cols: [0, 3], lfo: lfoN(S) }; },
      function (S, tr) {
        var l = 'l' + lfoN(S);
        return [vslot('lfo', 'LFO'), slot(l + 'Shape', 'Type'), slot(l + 'Shp', 'Shape'),
          slot(ival(tr, l + 'Sync') ? l + 'SRate' : l + 'Rate', 'Rate'),
          slot(l + 'Amt', 'Amount'), slot(l + 'Att', 'Attack'), slot(l + 'Phase', 'Phase Offset'), slot(l + 'Retrig', 'Retrigger')];
      },
      function (S) { return [null, null, OPT['sync' + lfoN(S)], null, null, null, ADD]; }),

    bank('Matrix',
      function () { return null; },
      function (S, tr) {
        var k = modTarget(S, tr), first = vslot('modTarget', 'Mod Target');
        if (!k) return [first, null, null, null, null, null, null, null];
        return [first, targetSlot(k), null, amt(SRC.AMP_ENV, 'Amp Envelope'), amt(SRC.ENV2, 'Envelope 2'),
          amt(SRC.ENV3, 'Envelope 3'), amt(SRC.LFO1, 'LFO 1'), amt(SRC.LFO2, 'LFO 2')];
      },
      function () { return [OPT.back, null].concat(OPT.goTo); }),

    bank('MIDI & MPE',
      function () { return null; },
      function (S, tr) {
        var k = modTarget(S, tr), mpe = S.wtui.expr !== 'monopoly', first = vslot('modTarget', 'Mod Target');
        if (!k) return [first, null, null, null, null, null, null, null];
        return [first, targetSlot(k), amt(SRC.VEL, 'Velocity'), amt(SRC.KEY, 'Key'),
          mpe ? amt(SRC.NOTE_PB, 'Note PB') : amt(SRC.PB, 'PB Range'), amt(SRC.PRESS, 'Pressure'),
          mpe ? amt(SRC.SLIDE, 'Slide') : amt(SRC.MW, 'Mod Wheel'), amt(SRC.RAND, 'Random')];
      },
      function () { return [OPT.back, null, null, OPT.expr, null, null, null]; })
  ];

  // ---------------------------------------------------------------- slot düzeyi API (LCD + modes)
  // Ekranın bir sütun için ihtiyaç duyduğu her şey. list/index: enum ve seçiciler (liste/ikon görünümü).
  function slotView(S, tr, s) {
    if (!s) return null;
    var view = { label: s.label, text: '', value: 0, norm: 0, bipolar: false, list: null, index: -1,
      disabled: !!s.dis, modulatable: false };
    if (s.v) {
      var V = VIRTUAL[s.v];
      view.v = s.v;
      view.label = s.label || V.label;
      view.value = V.get(S, tr, s);
      view.text = V.fmt(S, tr, view.value, s);
      view.bipolar = !!V.bipolar;
      view.modulatable = !!V.modKey;
      if (V.values) {
        view.list = V.values;
        view.index = view.value;
        view.norm = V.values.length > 1 ? view.value / (V.values.length - 1) : 0;
      } else if (V.norm) view.norm = V.norm(S, tr, s);
      return view;
    }
    var p = PARAMS[IDX[s.k]], v = tr.p[IDX[s.k]];
    view.k = s.k;
    view.label = s.label || p.name;
    view.value = v;
    view.text = fmt(p, v, tr);
    view.modulatable = p.mod > 0;
    if (p.curve === 'enum' || p.curve === 'bool') {
      view.list = enumValues(p, tr);
      view.index = clamp(Math.round(v) - p.min, 0, view.list.length - 1);
      view.norm = view.list.length > 1 ? view.index / (view.list.length - 1) : 0;
    } else {
      view.norm = toNorm(p, v);
      view.bipolar = p.min < 0 && p.min === -p.max;
    }
    return view;
  }

  // Encoder dönüşü. Gri (dis) slot'lar da çevrilebilir: Live'da kapalı osilatörün ayarı değişebilir.
  function slotTurn(S, tr, s, turn, steps, fine, opts) {
    if (!s) return [];
    if (s.v) {
      var V = VIRTUAL[s.v], cur = V.get(S, tr, s), nv = V.step(S, tr, turn, steps, fine, s);
      return nv === cur ? [] : V.set(S, tr, nv, s, opts);
    }
    var p = PARAMS[IDX[s.k]], v = step(p, tr.p[IDX[s.k]], turn, steps, fine);
    if (p.en === 'Tab') v = Math.min(v, tabLimit(tr, s.k));
    return commit(S, tr, planParam(tr, p, v), opts);
  }
  // Kategori değişince tablo kategorinin ilk tablosuna döner (VARSAYIM).
  function planParam(tr, p, v) {
    var out = chP(tr, p.k, v, []);
    if (p.en === 'Cat' && out.length) chP(tr, p.k.replace('Cat', 'Tab'), 0, out);
    return out;
  }

  // Delete + encoder'a dokunma: varsayılana dön. Seçiciler ve Mod Target'ın varsayılanı yok.
  function slotReset(S, tr, s, opts) {
    if (!s) return [];
    if (s.v) {
      var V = VIRTUAL[s.v];
      return V.def === undefined ? [] : V.set(S, tr, V.def, s, opts);
    }
    var p = PARAMS[IDX[s.k]];
    return commit(S, tr, planParam(tr, p, p.def), opts);
  }

  // ---------------------------------------------------------------- presetler
  function db(x) { return Math.pow(10, x / 20); }
  var SAW = 2 / 3;   // Temel Şekiller'de saf testere karesi (42/63); şartnamedeki '.66'

  // §12. Yazılmayan her parametre varsayılandır; mods DEFAULT_MODS'un üstüne yazılır. Değerler VARSAYIM.
  var PRESETS = {
    init: { name: { tr: `Init`, en: `Init` }, params: {}, mods: {} },
    'saw-lead': { name: { tr: `Süper Testere`, en: `Super Saw` },
      params: { o1Pos: SAW, uniMode: 1, uniVoices: 5, uniAmt: 0.35, f1Freq: 6000, ampA: 0.005, ampD: 0.6, ampS: db(-3), ampR: 0.3 },
      mods: {} },
    'deep-bass': { name: { tr: `Derin Bas`, en: `Deep Bass` },
      params: { mono: 1, glide: 0.04, o1Pos: SAW, subOn: 1, subOct: 1, subGain: db(-3), f1Slope: 1, f1Freq: 400, f1Res: 0.3,
        e2D: 0.25, e2S: 0, ampD: 0.3, ampS: db(-6), ampR: 0.1 },
      mods: { f1Freq: { 1: 0.4 } } },
    pluck: { name: { tr: `Pluck`, en: `Pluck` },
      params: { o1Cat: 1, o1Tab: 0, o1Pos: 0.3, f1Freq: 1200, e2D: 0.18, e2S: 0, ampD: 0.4, ampS: 0 },
      mods: { f1Freq: { 1: 0.6 } } },
    // Taban pos .5: LFO ±.4 tüm ünlüleri (A→U) simetrik tarar.
    'pos-pad': { name: { tr: `Pozisyon Pad`, en: `Position Pad` },
      params: { o1Cat: 2, o1Pos: 0.5, l1Rate: 0.12, uniMode: 2, uniVoices: 4, ampA: 0.8, ampR: 1.8, f1Freq: 3000 },
      mods: { o1Pos: { 3: 0.4 } } },
    // Faz 2'de tablo 8 (Sync Tarama). Sinüs LP'de duyulmaz: testere + 800 Hz taban.
    wobble: { name: { tr: `Wobble Bas`, en: `Wobble Bass` },
      params: { o1Pos: SAW, mono: 1, l1Sync: 1, l1SRate: 6 /* 1/8 */, f1Slope: 1, f1Freq: 800 },
      mods: { f1Freq: { 3: 0.5 } } },
    'fm-bell': { name: { tr: `FM Çan`, en: `FM Bell` },
      params: { o1Fx: 1, o1Fx1: 0.5, o1Fx2: 0.35, ampD: 1.2, ampS: 0, ampR: 1 },
      mods: {} },
    organ: { name: { tr: `Organ`, en: `Organ` },
      params: { o1Cat: 1, o1Tab: 2, o1Pos: 0.5, ampS: 1, l1Rate: 5.5 },
      mods: { PITCH: { 3: 0.003 } } },
    'vocal-lead': { name: { tr: `Vokal Lead`, en: `Vocal Lead` },
      params: { o1Cat: 2 },
      mods: { o1Pos: { 9: 1, 1: 0.3 } } },
    'fold-bass': { name: { tr: `Katlanmış Bas`, en: `Folded Bass` },
      params: { o1Tab: 2, o1Fx: 3, o1Fx2: 0.4, mono: 1 },
      mods: {} },
    // Faz 2'de tablo 10 (Gürültü Spektrumu).
    'noise-atmo': { name: { tr: `Atmosfer`, en: `Atmosphere` },
      params: { o1Cat: 1, o1Pos: 0.5, f1Type: 1, f1Freq: 300, l1Rate: 0.05, ampA: 2, ampR: 3 },
      mods: { o1Pos: { 3: 0.5 } } },
    acid: { name: { tr: `Acid`, en: `Acid` },
      params: { o1Pos: SAW, f1Slope: 1, f1Freq: 400, f1Res: 0.9, e2D: 0.15, e2S: 0, mono: 1, glide: 0.06 },
      mods: { f1Freq: { 1: 0.5 } } }
  };

  function defaults() {
    var a = new Float32Array(PARAMS.length);
    for (var i = 0; i < PARAMS.length; i++) a[i] = PARAMS[i].def;
    return a;
  }

  function copyMods(from, to) {
    for (var k in from) {
      var row = to[k] || (to[k] = {});
      for (var s in from[k]) row[s] = from[k][s];
    }
  }

  // tr.p ve tr.mods'u yerinde yeniden kurar (başka modüllerin tuttuğu referanslar geçerli kalır).
  // Store'dan geçmez: çağıran motoru (P3.wt.applyPreset) ve ekranı kendisi günceller.
  function applyPreset(tr, id) {
    var pr = PRESETS[id];
    if (!pr) { console.warn(`[p3] bilinmeyen preset: ${id}`); id = 'init'; pr = PRESETS.init; }
    var p = tr.p instanceof Float32Array && tr.p.length === PARAMS.length ? tr.p : (tr.p = new Float32Array(PARAMS.length));
    for (var i = 0; i < PARAMS.length; i++) p[i] = PARAMS[i].def;
    for (var k in pr.params) p[IDX[k]] = pr.params[k];
    if (!tr.mods || typeof tr.mods !== 'object') tr.mods = {};
    for (var t in tr.mods) delete tr.mods[t];
    copyMods(DEFAULT_MODS, tr.mods);
    copyMods(pr.mods, tr.mods);
    tr.preset = id;
    return tr;
  }

  // ---------------------------------------------------------------- ortak şekil formülleri (UI + worklet)
  // Zarf segmenti (sartname §8): yükselen; düşen segment 1 − envCurve(x, s). s>0 başta hızlı.
  function envCurve(x, s) {
    x = clamp(x, 0, 1);
    return s > 0 ? 1 - Math.pow(1 - x, 1 + 4 * s) : s < 0 ? Math.pow(x, 1 - 4 * s) : x;
  }

  // Sine/Saw faz eğmesi (sartname §8).
  function skew(ph, s) { return s >= 0 ? Math.pow(ph, 1 + 3 * s) : 1 - Math.pow(1 - ph, 1 - 3 * s); }
  // VARSAYIM: triangle sinüsle aynı hizada başlar (φ=0'da 0'dan yukarı); d kadar yükselir, 1−d kadar iner.
  function triangle(ph, d) {
    var q = ph + d / 2;
    q -= Math.floor(q);
    return q < d ? 2 * q / d - 1 : 1 - 2 * (q - d) / (1 - d);
  }
  // Döngü indeksinden deterministik 0..1 (mulberry32 çıkış fonksiyonu).
  function hash01(n) {
    var t = (n | 0) + 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // −1..1 (Amount uygulanmamış). phase: döngü konumu; tam kısmı Random'da döngü indeksidir.
  // u: Random için −1..1 örnek (worklet kendi PRNG'sini verir); yoksa döngü indeksinden türetilir.
  function lfoShape(shape, shaping, phase, u) {
    var s = clamp(shaping, -1, 1), ph = phase - Math.floor(phase);
    switch (Math.round(shape)) {
      case 1: return triangle(ph, 0.5 + 0.49 * s);
      case 2: return 1 - 2 * skew(ph, s);                // Saw aşağı iner
      case 3: return ph < 0.5 + 0.49 * s ? 1 : -1;        // Square: PW
      case 4:                                             // Random: döngü başına S&H, s>0 uçlara iter
        if (u === undefined) u = hash01(Math.floor(phase)) * 2 - 1;
        return (u < 0 ? -1 : 1) * Math.pow(Math.abs(u), Math.pow(2, -2 * s));
      default: return Math.sin(2 * Math.PI * skew(ph, s));
    }
  }

  P3.wtp = {
    PARAMS: PARAMS, IDX: IDX, ENUMS: ENUMS, SRATE_BARS: SRATE_BARS, CATS: CATS, TABLES: TABLES,
    SOURCES: SOURCES, SRC: SRC, BANKS: BANKS, VIRTUAL: VIRTUAL,
    DEFAULT_MODS: DEFAULT_MODS, PRESETS: PRESETS,
    tableId: tableId, tablesOf: tablesOf, tableName: tableName, audibleTable: audibleTable,
    toNorm: toNorm, fromNorm: fromNorm, step: step, fmt: fmt, enumValues: enumValues,
    defaults: defaults, applyPreset: applyPreset, lfoShape: lfoShape, envCurve: envCurve,
    slotView: slotView, slotTurn: slotTurn, slotReset: slotReset, setBank: setBank,
    modTarget: modTarget, targetName: targetName
  };
})();
