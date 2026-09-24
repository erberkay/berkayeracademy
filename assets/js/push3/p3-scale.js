/* assets/js/push3/p3-scale.js — Note/Scale ve Drum Loop Selector matematiği (README §G2).
   Saf fonksiyonlar: DOM yok, ses yok, P3 dışında bağımlılık yok. Yüklenirken yalnız P3.scale'i tanımlar.
   Kaynak: docs/push3/sartname-scale-note.md + dogrulanmis-scale.md (formüller Live 12 pushbase
   instrument_component.py / slide.py / melodic_pattern.py'den türetilmiş, Push 3 kılavuzuyla tutarlı).

   S = P3.S.scale  { root 0..11, idx 0..34, inKey, fixed, layoutIdx 0..2 }   (global, Live 12 Song scale)
   t = track        { pos }  melodik;  { grid, page, loopOff, bank }  drum
   Pad koordinatı: x 0..7 soldan, y 0..7 ALTTAN.

   SAPMA / EKLEME (şartnameye göre):
   - octUp / octDown / shiftStep / drumBank* t'yi yerinde değiştirir (şartname §3) ve yeni değeri döndürür.
     Gidilecek yer yoksa (canUp/canDown false) hiçbir şey yapmaz. Şartnamedeki çıplak min()/clamp(),
     realign sonrası pos > posCount−L iken "yukarı"ya basınca konumu aşağı çekebiliyordu.
   - realign: sonuç 0'ın altına düşerse 0'a sabitlenir (ör. Fixed açılırken pos < P_old) ve üst taşmada
     tek 'if' yerine 'while' ile L düşülür. Chromatic + Fixed'de octave sınırının üstündeki bir konumdan
     (≤138, yalnız realign ile oluşur) kökü A♭–B olan In Key'e geçişte tek çıkarma yetmiyor
     (138 → 80.5 → 73.5 ≥ 70). Test sözleşmesi 0 ≤ pos < posCount istiyor.
   - rangeText README §G2'deki biçimi izler ('C1 - C5'); şartnamedeki 'Play C1 to C5' Push 2 metnidir.
     Aralık sol alt + sağ üst pad yerine ızgaradaki en düşük/en yüksek geçerli notadan hesaplanır:
     Sequential'da sağ sütunlar boş kalabiliyor ve 127 sınırında sağ üst pad geçersiz olabiliyor.
   - Drum bank LED'i (drumCanUp/Down) "bir adım daha kayabilir mi" demektir (bank < 76 / bank > −36).
     Şartnamedeki "bank+16 ≤ 76" kuralı, clamp'lı Octave ▲ hâlâ hareket ettirirken LED'i söndürüyordu;
     melodik canUp ile aynı mantığa getirildi.
   - EKLEME: DRUM_ROW (4) dışa açıldı; Shift+Octave / Shift+strip drumBankShift(t, ±DRUM_ROW) çağırır.
   - A() ve pcs() önbellekli; döndürdükleri dizi ve Set SALT OKUNUR. */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  // ── Sabitler ────────────────────────────────────────────────────────────
  // Nota adları Push gibi bemollü; 60 = C3 (Live/Push oktav numaralandırması).
  var NOTE_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

  // Kök düğmeleri: upper2..7 = indeks 0..5 (C G D A E B), lower2..7 = indeks 6..11 (F B♭ E♭ A♭ D♭ G♭).
  var ROOT_NOTES = [0, 7, 2, 9, 4, 11, 5, 10, 3, 8, 1, 6];

  // iv: In Key satır adımı (gam derecesi). Sequential'da null → satır adımı gam uzunluğu.
  var LAYOUTS = [{ name: '4ths', iv: 3 }, { name: '3rds', iv: 2 }, { name: 'Sequential', iv: null }];

  // Chromatic'te In Key satır adımının yarım ton karşılığı: 4ths → 5, 3rds → 4.
  var CHROMA = [0, 2, 4, 5, 7, 9, 10, 11];

  // Live 12 sırası (Song.get_all_scales_ordered). 25–35'in aralıkları Live ile çalışma anında
  // karşılaştırılmış üçüncü taraf referanstan; Live 9'un 6 notalı 'Pelog'u kullanılmaz.
  var SCALES = [
    ['Major', [0, 2, 4, 5, 7, 9, 11]],
    ['Minor', [0, 2, 3, 5, 7, 8, 10]],
    ['Dorian', [0, 2, 3, 5, 7, 9, 10]],
    ['Mixolydian', [0, 2, 4, 5, 7, 9, 10]],
    ['Lydian', [0, 2, 4, 6, 7, 9, 11]],
    ['Phrygian', [0, 1, 3, 5, 7, 8, 10]],
    ['Locrian', [0, 1, 3, 5, 6, 8, 10]],
    ['Whole Tone', [0, 2, 4, 6, 8, 10]],
    ['Half-whole Dim.', [0, 1, 3, 4, 6, 7, 9, 10]],
    ['Whole-half Dim.', [0, 2, 3, 5, 6, 8, 9, 11]],
    ['Minor Blues', [0, 3, 5, 6, 7, 10]],
    ['Minor Pentatonic', [0, 3, 5, 7, 10]],
    ['Major Pentatonic', [0, 2, 4, 7, 9]],
    ['Harmonic Minor', [0, 2, 3, 5, 7, 8, 11]],
    ['Harmonic Major', [0, 2, 4, 5, 7, 8, 11]],
    ['Dorian #4', [0, 2, 3, 6, 7, 9, 10]],
    ['Phrygian Dominant', [0, 1, 4, 5, 7, 8, 10]],
    ['Melodic Minor', [0, 2, 3, 5, 7, 9, 11]],
    ['Lydian Augmented', [0, 2, 4, 6, 8, 9, 11]],
    ['Lydian Dominant', [0, 2, 4, 6, 7, 9, 10]],
    ['Super Locrian', [0, 1, 3, 4, 6, 8, 10]],
    ['8-Tone Spanish', [0, 1, 3, 4, 5, 6, 8, 10]],
    ['Bhairav', [0, 1, 4, 5, 7, 8, 11]],
    ['Hungarian Minor', [0, 2, 3, 6, 7, 8, 11]],
    ['Hirajoshi', [0, 2, 3, 7, 8]],
    ['In-Sen', [0, 1, 5, 7, 10]],
    ['Iwato', [0, 1, 5, 6, 10]],
    ['Kumoi', [0, 2, 3, 7, 9]],
    ['Pelog Selisir', [0, 1, 3, 7, 8]],
    ['Pelog Tembung', [0, 1, 5, 7, 8]],
    ['Messiaen 3', [0, 2, 3, 4, 6, 7, 8, 10, 11]],
    ['Messiaen 4', [0, 1, 2, 5, 6, 7, 8, 11]],
    ['Messiaen 5', [0, 1, 5, 6, 7, 11]],
    ['Messiaen 6', [0, 2, 4, 5, 6, 8, 10, 11]],
    ['Messiaen 7', [0, 1, 2, 3, 5, 6, 7, 8, 9, 11]]
  ];

  // Step çözünürlükleri; indeks = scene düğmesi − 1 (yukarıdan). b = step uzunluğu (beat), tr = triplet.
  var GRID = [
    { n: '1/32t', b: 1 / 12, tr: 1 }, { n: '1/32', b: 1 / 8 }, { n: '1/16t', b: 1 / 6, tr: 1 }, { n: '1/16', b: 1 / 4 },
    { n: '1/8t', b: 1 / 3, tr: 1 }, { n: '1/8', b: 1 / 2 }, { n: '1/4t', b: 2 / 3, tr: 1 }, { n: '1/4', b: 1 }
  ];
  var GRID_DEF = 3;     // 1/16 [P3]
  var REPEAT_DEF = 5;   // VARSAYIM: 1/8 — Push 2 script varsayılanı, Push 3 için doğrulanmadı.
  var CLIP_LEN = [2, 4, 4, 8, 8, 16, 16, 32];   // ilk step girilince açılan clip (beat); indeks = grid

  // Drum Rack 128 pad; görünen 16 pad'in sol altı = 36 + bank. −36 → nota 0, 76 → sağ üst 127.
  var DRUM_BANK_MIN = -36, DRUM_BANK_MAX = 76;
  var DRUM_OCT = 16, DRUM_ROW = 4;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function noteName(m) {
    if (m === null || m === undefined) return '';
    return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 2);
  }

  // ── Gam tabloları (önbellekli) ──────────────────────────────────────────
  // Pad başına çağrıldıkları için Set ve nota dizisi her (kök, gam, In Key) için bir kez kurulur.
  // En fazla 35 × 12 × 2 kayıt olur, sınırlıdır.
  var cache = {};
  function tab(S) {
    var key = S.root + '|' + S.idx + '|' + (S.inKey ? 1 : 0);
    var c = cache[key];
    if (c) return c;
    var ivs = SCALES[S.idx][1], set = new Set(), a = [], i, m;
    for (i = 0; i < ivs.length; i++) set.add((ivs[i] + S.root) % 12);
    // 200: Chromatic'te en büyük indeks 138 + 7 + 8·7 = 201'e varır; 127'yi aşan her şey zaten null döner.
    for (m = 0; m < 200; m++) if (!S.inKey || set.has(m % 12)) a.push(m);
    var sorted = Array.from(set).sort(function (p, q) { return p - q; });
    c = cache[key] = { pcs: set, A: a, f: S.inKey ? sorted.indexOf(S.root) : S.root };
    return c;
  }

  function iv(S) { return SCALES[S.idx][1]; }
  function n(S) { return SCALES[S.idx][1].length; }
  function L(S) { return S.inKey ? n(S) : 12; }                        // page_length: bir oktavdaki konum sayısı
  function pcs(S) { return tab(S).pcs; }
  function P(S) { return S.fixed ? 0 : tab(S).f; }                     // page_offset: kökün oktav içindeki konumu
  function posCount(S) { return S.inKey ? P(S) + n(S) * (S.root < 8 ? 11 : 10) : 139; }
  function R(S) {                                                       // bir üst satıra geçişte atlanan konum
    var v = LAYOUTS[S.layoutIdx].iv;
    return v === null ? (S.inKey ? n(S) : 8) : (S.inKey ? v : CHROMA[v]);
  }
  // VARSAYIM (koddan, doğrulanamadı): Sequential + In Key satır genişliği n+1 olduğundan satırın son pad'i
  // üst satırın ilk pad'iyle aynı notadır (kök tekrarı). Live 12 "Using Push 2" metni "no duplicated notes"
  // diyor; Push 3 kılavuzu sessiz. 5 notalı gamda sütun 6–7, 6 notalıda sütun 7 boş kalır; 8 notalıda
  // tekrar olmaz. 9–10 notalı gamlarda (Messiaen 3, 7) W > 8 olduğundan her satırda 1–2 derece
  // görünmez — kod da böyle davranır.
  function W(S) { return (LAYOUTS[S.layoutIdx].iv === null && S.inKey) ? n(S) + 1 : 8; }
  function A(S) { return tab(S).A; }

  // ── Pad → MIDI ──────────────────────────────────────────────────────────
  // A[pos + x + R·y]: koddaki 12·floor(i/n) + N[i mod n] formülünün cebirsel sadeleştirmesi.
  // pos realign sonrası kesirli olabilir; kod gibi kullanırken yuvarlanır.
  function padNote(S, pos, x, y) {
    if (x >= W(S)) return null;
    var m = tab(S).A[Math.round(pos) + x + R(S) * y];
    return (m === undefined || m > 127) ? null : m;
  }

  // 'out' yalnız Chromatic'te çıkar: pad sönük görünür ama çalar.
  function padClass(S, m) {
    if (m === null || m === undefined) return 'none';
    var pc = m % 12;
    return pc === S.root ? 'root' : (tab(S).pcs.has(pc) ? 'scale' : 'out');
  }

  // Sol alt pad: Fixed Off → C1 oktavındaki kök; Fixed On → C1 (36) veya üstündeki ilk gam notası.
  // VARSAYIM (koddan): kılavuz "C yoksa C'ye en yakın nota" diyor; aşağıdaki nota daha yakınsa
  // (ör. E Minor Pentatonic: kılavuz B0 = 35, kod D1 = 38) ayrışır. Emülatör kodu izler (yukarı yönlü).
  function defaultPos(S) { return 3 * L(S) + P(S); }

  // Kök / gam / In Key / Fixed değişince konum, aynı "oktav + derece" yerinde kalacak şekilde ölçeklenir.
  function realign(Sold, Snew, pos) {
    var p = P(Snew) + (pos - P(Sold)) * L(Snew) / L(Sold);
    var pc = posCount(Snew), l = L(Snew);
    while (p >= pc) p -= l;   // kodda tek 'if'; bkz. dosya başı SAPMA
    return p < 0 ? 0 : p;
  }

  // ── Oktav (slide.py) ────────────────────────────────────────────────────
  // Octave ▲▼ konumu sayfa (oktav) sınırına hizalar; Shift+Octave tek konum kaydırır.
  function rem(S, p) { var l = L(S); return ((p - P(S)) % l + l) % l; }
  function canUp(S, t) { return t.pos < posCount(S) - L(S); }
  function canDown(S, t) { return t.pos > 0; }                          // [P3] ek oktav yoksa LED söner
  function octUp(S, t) {
    if (canUp(S, t)) t.pos = Math.min(t.pos + (L(S) - rem(S, t.pos)), posCount(S) - L(S));
    return t.pos;
  }
  function octDown(S, t) {
    if (canDown(S, t)) { var r = rem(S, t.pos); t.pos = Math.max(t.pos - (r === 0 ? L(S) : r), 0); }
    return t.pos;
  }
  function shiftStep(S, t, d) {
    if ((d > 0 && canUp(S, t)) || (d < 0 && canDown(S, t))) t.pos = clamp(t.pos + d, 0, posCount(S) - L(S));
    return t.pos;
  }

  // Octave sonrası popup metni. VARSAYIM: Push 3'teki metin doğrulanamadı (Push 2: 'Play C1 to C5').
  function rangeText(S, t) {
    var lo = null, hi = null, x, y, m;
    for (y = 0; y < 8; y++) {
      for (x = 0; x < 8; x++) {
        m = padNote(S, t.pos, x, y);
        if (m === null) continue;
        if (lo === null || m < lo) lo = m;
        if (hi === null || m > hi) hi = m;
      }
    }
    return lo === null ? '' : noteName(lo) + ' - ' + noteName(hi);
  }

  // ── Drum: Loop Selector düzeni ─────────────────────────────────────────
  // Üst 4 satır step, sol alt 4×4 drum pad (nota = 36 + pad), sağ alt 4×4 loop pad.
  // Triplet'te satır başına 6 step; sağdaki 2 sütun kullanılmaz.
  function drumCell(x, y, t) {
    var g = GRID[t.grid], spp = g.tr ? 24 : 32;
    if (y >= 4) {
      if (g.tr && x >= 6) return { k: 'none' };
      return { k: 'step', step: t.page * spp + (7 - y) * (g.tr ? 6 : 8) + x };
    }
    if (x < 4) return { k: 'drum', pad: t.bank + y * 4 + x };
    // VARSAYIM (Push 2 script'i, güven orta): loop pad'leri sol üstten sağa, satır satır okunur.
    // Dönen 'page' loop pad birimindedir (loopPadBeats), sequencer sayfası (pageBeats) değildir.
    return { k: 'loop', page: t.loopOff + (3 - y) * 4 + (x - 4) };
  }
  function pageBeats(t) { var g = GRID[t.grid]; return (g.tr ? 24 : 32) * g.b; }
  // Bir loop pad = sayfa, en az 1/16 nota, en çok 1 bar (4/4) → 1/32t dışında her çözünürlükte 1 bar.
  function loopPadBeats(t) { return clamp(pageBeats(t), 0.25, 4); }

  // Octave ±16 pad (4 satır), Shift+Octave veya Shift+strip ±4 pad (1 satır) [P3].
  function drumCanUp(t) { return t.bank < DRUM_BANK_MAX; }
  function drumCanDown(t) { return t.bank > DRUM_BANK_MIN; }
  function drumBankShift(t, d) { t.bank = clamp(t.bank + d, DRUM_BANK_MIN, DRUM_BANK_MAX); return t.bank; }
  function drumBankUp(t) { return drumBankShift(t, DRUM_OCT); }
  function drumBankDown(t) { return drumBankShift(t, -DRUM_OCT); }

  // ── Adlar ───────────────────────────────────────────────────────────────
  function rootName(S) { return NOTE_NAMES[S.root]; }
  function scaleName(S) { return NOTE_NAMES[S.root] + ' ' + SCALES[S.idx][0]; }   // 'D Minor'

  P3.scale = {
    NOTE_NAMES: NOTE_NAMES, ROOT_NOTES: ROOT_NOTES, LAYOUTS: LAYOUTS, SCALES: SCALES,
    GRID: GRID, GRID_DEF: GRID_DEF, REPEAT_DEF: REPEAT_DEF, CLIP_LEN: CLIP_LEN,
    DRUM_ROW: DRUM_ROW,
    noteName: noteName, iv: iv, n: n, L: L, pcs: pcs, P: P, posCount: posCount, R: R, W: W, A: A,
    padNote: padNote, padClass: padClass,
    defaultPos: defaultPos, realign: realign, octUp: octUp, octDown: octDown, shiftStep: shiftStep,
    canUp: canUp, canDown: canDown, rangeText: rangeText,
    drumCell: drumCell, pageBeats: pageBeats, loopPadBeats: loopPadBeats,
    drumBankUp: drumBankUp, drumBankDown: drumBankDown, drumBankShift: drumBankShift,
    drumCanUp: drumCanUp, drumCanDown: drumCanDown,
    scaleName: scaleName, rootName: rootName
  };
})();
