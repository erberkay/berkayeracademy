/* Push 3 Laboratuvarı — ekran (p3-lcd.js)
 *
 * 960×160 mantıksal LCD'yi #p3LcdCanvas'a çizer: cihaz zinciri ve bank görünümü (Wavetable bankaları,
 * değer halkaları, enum ve ikon listeleri, dört görselleştirme), Drum Rack sayfası, Scale ve Learn
 * katmanları, bu fazda olmayan görünümler ve popup katmanı. Parametre değerini bilen modül olduğu için
 * encoder slider'larının ARIA değerlerini ve #p3LcdLive özetini de bu dosya yazar (README §H10).
 * Sözleşme: docs/push3/README.md §G6, §H2, §H10, §H13–15; yerleşim sartname-ekran.md; banka ve
 * görselleştirme sütunları dogrulanmis-wavetable.md §C–E. Banka içeriği P3.wtp'den gelir (BANKS,
 * slotView, fmt); bu dosya hiçbir parametre adını ya da biçimini kendisi üretmez.
 *
 * Çizim politikası (sartname-ekran §9): olaylar yalnız invalidate() der; çizim tek rAF'te ve en çok
 * 30 fps'tir (durum olaylarıyla gelen çizimler dahil). Statikken döngü dönmez. Yalnız üç durum kendini
 * yeniden planlar: nota çalarken canlı Position (P3.wt.meter), popup'ın kapanış anı ve henüz gelmemiş
 * tablo verisi. Bu yoklamalar ekranda gerçekten bir şey değişmedikçe çizmez. Fontlar hazır olmadan
 * çizilmez (en çok FONT_WAIT_MS beklenir). Canvas'ın arka tamponunu P3.dev.align() kurar ve 'layout'
 * yayar; bu modül ölçeği her çizimde canvas boyutundan okur.
 *
 * SAPMA / EKLEME:
 * - r7 taban çizgisi 153 (çip y+13; r0'daki 2/15 ile aynı iç boşluk). Şartnamedeki 155 ile çip (140–157)
 *   içinde alt boşluk 2 px kalıyor ve r0 ile tutarsız görünüyordu.
 * - Görselleştirme altında olmayan enum sütunları: r2'de liste, halka yok. İkon listelerinde (filtre tipi,
 *   LFO şekli, Loop, Routing) seçili değerin adı r3'te küçük yazılır; ikon tek başına öğretici değil.
 *   Liste, seçili öğeyle biten ve sütuna sığan en uzun diziden başlar (seçili öğe hep görünür). Sağda
 *   kesilen öğeden 3 harften azı kalacaksa o öğe hiç çizilmez ('P' gibi kalıntı okunmuyor).
 *   İkon aralığı 6 px (5 filtre ikonu 104 px'e tam sığar), metin aralığı 8 px (şartname).
 * - Listesi ve halka normu olmayan sanal değer (Mod Target) r2'de küçük metin olarak çizilir.
 * - On/Off parametreleri 'Off On' metin listesidir ('activate' ikonu yerine). Osilatör ikonları kendi
 *   çizimimiz: kutu içinde 1 / 2 / S / M. Filter Switch option'ı 'Filter 1  Filter 2' yazar.
 * - Toggle option: ad track renginde, durum kelimesi On'da beyaz. Switch: seçili kelime beyaz, diğeri track
 *   renginde. Etkin olmayan action (dokunulan parametre modüle edilemiyorken Add to Matrix) gri.
 * - Wavetable: AdjustingPosition Table ve Category'ye dokunmayı da kapsar. Komşu kareler (±0.06, 3+3)
 *   hafif çapraz kaydırmayla 3B istif olarak çizilir. Position işareti görselleştirmenin altında ince bir
 *   iz + 2 px çentik. Tablo verisi yoksa düz çizgi çizilir ve veri gelene dek DISP_RETRY_MS'de bir bakılır
 *   (motorun ayrı bir olay yayması gerekmez).
 * - Filtre eğrisi motorun gerçek sayısal yanıtıdır: worklet'teki Simper SVF katsayıları (k = 2 − 1.98q;
 *   24 dB'de 1/0.5412 ve 1/(1.3066 + q·23.69)) ve bilineer frekans eşlemesi (tan(πf/fs)/tan(πfc/fs)),
 *   fc worklet gibi min(20 kHz, 0.45·fs)'e kırpılır. Yalnız fc'de değil tüm eksende worklet ile aynıdır
 *   (P3.lcd.filterResponse; fs verilmezse analog w = f/fc). Drive gösterilmez. Serial: açık filtrelerin
 *   çarpımı + seçili olmayanın kendi eğrisi 1 px %40; Parallel/Split: iki ayrı eğri. Kapalı seçili filtre gri.
 * - Envelope: genişlikler t^(1/3) ile alana sığdırılır (göreli), kenarlarda 4 px pay. Dokunulan yokken tüm
 *   öğeler 2 px ve tam opak; dokununca şartnamedeki vurgu tablosu.
 * - LFO: 1 px sıfır çizgisi; Random periyot başına 8 deterministik basamak (lfoShape(4, shaping, basamak));
 *   Attack, worklet gibi doğrusal açılma. Mod Time hem periyodu hem Attack'ı aynı oranda ölçeklediği için
 *   çizimi değiştirmez.
 * - Drum Rack (§H14): 4×4 ad ızgarası sütun 0–3'te, r3–r6'da; fiziksel pad'lerle aynı yerleşim (sol alt =
 *   bank'ın ilk pad'i). Sesi olmayan (boş ya da yüklenemeyen) pad soluk.
 * - Scale: ızgara kaydırma durumu (c0) bu modülde tutulur; görünüm durumudur, undo'ya girmez.
 * - Learn: tek renkli (Scale gibi). Bölüm listesi P3.tut.CURRICULUM (dizi ya da {chapters}); ilerleme
 *   P3.save 'tutorial' kaydından (sartname-ogretici §3 biçimi). İsteğe bağlı durum alanları S.learnPage ve
 *   S.learnSel (sayı; yoksa sayfa, seçili bölümün sayfasıdır; seçili = kayıttaki güncel bölüm). Upper k'nın
 *   açacağı bölüm: P3.lcd.learnChapterAt(k). Faz 2 bölümleri gri ve '(yakında)'.
 * - 'Basic audio' rozeti ve ses ipucu r6'nın sağ altında. 'fallback' sesli sayılır (ipucu yok, rozet var);
 *   'failed' için ayrı metin; Seviye 1 (pasif) ve menüde ipucu yok.
 * - Faz 1'de olmayan overlay/view değerleri için 'unsupported' sayfası (ad + 'Not in this simulator').
 * - ARIA: boş slot'ta aria-label kayıttaki ad ('Encoder 3'), değer metni 'boş'. aria-valuenow 0..100
 *   (hotspot'ların min/max'ı). Volume −70..+6 dB, Tempo 20..999 BPM, Swing 0..100 % üzerinden. Volume
 *   hedefi 'track' (Main Track) için S.vol.track okunur, yoksa 0 dB (VARSAYIM).
 * - #p3LcdLive: açılıştaki ilk çizim duyurulmaz; sonraki sayfa/bank değişimlerinde son durum en çok
 *   500 ms'de bir yazılır.
 * - Popup: sub verilirse iki satır (ana metin taban 82, alt satır 104, gri 13 px). 'restore'da temizlenir.
 * - Ek API: render() (anında çizim; test ve selftest), filterResponse(fp, f, fs), learnChapterAt(k),
 *   text.volume(S) / text.swingTempo(S) (popup metinleriyle aynı biçim: 'Main Output: -10.0 dB').
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  // ---------------------------------------------------------------- sabitler
  var W = 960, H = 160;
  var FRAME_MS = 1000 / 30;       // çizim sınırı
  var FONT_WAIT_MS = 2500;        // VARSAYIM: font bu sürede gelmezse sistem fontuyla çizilir
  var METER_HOLD_MS = 300;        // nota olayından sonra meter en az bu kadar izlenir (ilk mesaj gecikir)
  var DISP_RETRY_MS = 400;        // tablo verisi yokken yeniden bakma aralığı
  var LIVE_MS = 500;              // #p3LcdLive en sık bu aralıkla yazılır
  var FS_DEF = 48000;             // VARSAYIM: ses bağlamı yokken filtre eğrisinin örnekleme hızı
  var PHASE = 1;                  // bu fazın müfredat bölümleri Learn'de açılır

  var FAM = '"Instrument Sans", system-ui, sans-serif';
  var F_LABEL = '600 12px ' + FAM;    // r0/r7 etiketleri, çipler, Scale ızgarası
  var F_NAME = '500 13px ' + FAM;     // parametre adı (r1)
  var F_SMALL = '600 13px ' + FAM;    // küçük değer ve listeler (r2)
  var F_BIG = '500 26px ' + FAM;      // büyük değer, sayfa başlıkları
  var F_UNIT = '500 13px ' + FAM;     // büyük değerin birimi
  var F_POPUP = '500 28px ' + FAM;
  var F_TINY = '600 11px ' + FAM;     // In Key / Chromatic, ses ipucu
  var F_LAYOUT = '600 15px ' + FAM;   // Scale: seçili Layout
  var F_BADGE = '600 10px ' + FAM;
  var F_ICON = '700 8px ' + FAM;      // osilatör ikonundaki harf

  // Izgara (sartname-ekran §0): sütun k'nın metin başlangıcı ve ışık sağ ucu, satır taban çizgileri.
  function COL(k) { return 121 * k + 14; }
  function COLR(k) { return 121 * k + 100; }
  var TEXT_W = 104;                                  // sütun genişliği; taşan metin sert kesilir
  var CHIP_TEXT_W = 96;                              // çip kutusunun içinde kalan genişlik
  var BASE = [15, 34, 54, 74, 94, 114, 134, 153];   // r0..r7 (r7 için bkz. SAPMA)
  var VIS_TOP = 61, VIS_BOT = 139;
  var WAVE_Y = 100, WAVE_AMP = 34, WAVE_PTS = 160, DISP_N = 256;
  var STACK_N = 3, STACK_STEP = 0.06, STACK_DX = 5, STACK_DY = 3;
  var ICON_Y = 45, ICON_W = 16, ICON_GAP = 6, TEXT_GAP = 8;
  var DEG = Math.PI / 180;
  // Halka: altta 65° boşluk, 295° tarama. Unipolar a0'dan saat yönünde, bipolar tepeden (270°) iki yana.
  var RING_DX = 21, RING_CY = 97, RING_R = 21;
  var A0 = 122.5 * DEG, SWEEP = 295 * DEG, TOP = 270 * DEG, HALF = 147.5 * DEG;

  // Filtre ekseni: 20 Hz – 20 kHz log, 96 nokta; y = 84 − 1.1·dB (sartname-ekran §4).
  var FILT_FREQS = [];
  for (var fi = 0; fi < 96; fi++) FILT_FREQS.push(20 * Math.pow(1000, fi / 95));

  var ICON_KIND = { Type: 'filter', Shape: 'lfo', Loop: 'loop', route: 'route' };
  var OSC_GLYPH = ['1', '2', 'S', 'M'];
  var SWITCH_WORDS = { 'Filter Switch': ['Filter 1', 'Filter 2'] };
  var VOL_LABEL = { main: 'Main Output', phones: 'Headphones', track: 'Main Track', cue: 'Cue' };
  var UNSUP_TITLE = { mix: 'Mix', clip: 'Clip', sessionScreen: 'Session', fixedLength: 'Fixed Length',
    quantize: 'Quantize', metronome: 'Metronome', setup: 'Setup', swap: 'Swap', add: 'Add', sets: 'Sets' };

  // Learn r0 kısaltmaları (bölümde `short` yoksa). VARSAYIM: kendi kısaltmalarımız.
  var LEARN_SHORT = {
    baslarken: `Başlarken`, padler: `Pad'ler`, scale: `Scale`, dizilim: `Dizilim`, osilator: `Osilatör`,
    'filtre-env': `Filtre + Env`, modulasyon: `Modülasyon`, drum: `Drum`,
    'repeat-accent': `Repeat`, kayit: `Kayıt`, session: `Session`, final: `Final`
  };

  // Dokunulan envelope parametresinin vurguladığı öğeler (sartname-ekran §4). a/d/s/r: segment,
  // L: çizgi, N: düğüm, iN: başlangıç düğümü.
  var ENV_FOCUS = { A: ['aL', 'aN', 'dL'], D: ['dL', 'dN', 'sL'], S: ['dL', 'dN', 'sL', 'sN', 'rL'], R: ['rL', 'rN'],
    Init: ['iN', 'aL'], Peak: ['aL', 'aN', 'dL'], Fin: ['rL', 'rN'], ASl: ['aL'], DSl: ['dL'], RSl: ['rL'] };

  // ---------------------------------------------------------------- küçük yardımcılar
  function C() { return P3.K.C; }
  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
  function clamp(v, lo, hi) { return v > lo ? (v < hi ? v : hi) : lo; }   // NaN → lo
  function clamp01(v) { return clamp(v, 0, 1); }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function selIndex(S) { return (S.sel && S.sel.track) || 0; }
  function track(S) { var ts = S.tracks || []; return ts[selIndex(S)] || ts[0] || null; }
  function fixed(x, d) { var s = x.toFixed(d); return Number(s) === 0 ? (0).toFixed(d) : s; }   // '-0.0' yazma

  // ---------------------------------------------------------------- canvas yardımcıları
  var g = null;                 // o an çizilen bağlam
  var curFont = '';
  var widths = {}, widthN = 0;  // ölçüm önbelleği (font|metin → genişlik); font gelince boşalır

  function use(ctx) { if (g !== ctx) { g = ctx; curFont = ''; } }
  function font(f) { if (curFont !== f) { g.font = f; curFont = f; } }

  function measure(s, f) {
    var key = f + '|' + s, w = widths[key];
    if (w === undefined) {
      font(f);
      w = g.measureText(s).width || 0;
      if (++widthN > 4000) { widths = {}; widthN = 0; }
      widths[key] = w;
    }
    return w;
  }

  // Sütunda sert kesme (sartname §0): "…" yok, sığan en uzun önek (M3'teki "1-Instrumen" gibi).
  function fit(s, f, maxW) {
    if (measure(s, f) <= maxW) return s;
    var lo = 0, hi = s.length - 1;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (measure(s.slice(0, mid), f) <= maxW) lo = mid; else hi = mid - 1;
    }
    return s.slice(0, lo).replace(/\s+$/, '');
  }

  // Metni çizer, çizilen (kesilmiş) metnin genişliğini döner.
  function put(s, x, y, color, f, maxW) {
    if (s === null || s === undefined || s === '') return 0;
    s = String(s);
    if (maxW !== undefined) {
      if (maxW <= 0) return 0;
      s = fit(s, f, maxW);
      if (!s) return 0;
    }
    font(f);
    g.fillStyle = color;
    g.fillText(s, x, y);
    return measure(s, f);
  }

  function putRight(s, xr, y, color, f) { return put(s, xr - measure(String(s), f), y, color, f); }

  function line(x0, y0, x1, y1) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }

  // Seçili etiket: dolu kutu, koyu yazı (r = 0 üst, 7 alt satır).
  function chip(k, r, s, fill, ink, maxW) {
    g.fillStyle = fill;
    g.fillRect(121 * k + 9, r === 7 ? 140 : 2, 105, 17);
    return put(s, COL(k), BASE[r], ink, F_LABEL, maxW || CHIP_TEXT_W);
  }

  // Kayıt için arm'lı track: adın önünde 5 px daire.
  function armDot(cx, cy, color) {
    g.strokeStyle = color;
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(cx, cy, 2.5, 0, 2 * Math.PI);
    g.stroke();
  }

  // ✓ vektörle: Instrument Sans'ta bu glif yok, sistem fontuna düşmesin.
  function check(x, base, color) {
    g.strokeStyle = color;
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x + 0.5, base - 4);
    g.lineTo(x + 3, base - 1.5);
    g.lineTo(x + 8, base - 8);
    g.stroke();
    g.lineCap = 'butt';
  }

  // ---------------------------------------------------------------- dış veri (motor, kayıt)
  function tableDisp(id) {
    try {
      var d = P3.wt && typeof P3.wt.tableDisp === 'function' ? P3.wt.tableDisp(id) : null;
      return d && d.length >= DISP_N ? d : null;
    } catch (e) { return null; }
  }

  function meterOf(S) {
    try { return P3.wt && typeof P3.wt.meter === 'function' ? P3.wt.meter(selIndex(S)) : null; } catch (e) { return null; }
  }

  function sampleRate() {
    var c = P3.audio && P3.audio.ctx;
    return (c && c.sampleRate) || FS_DEF;
  }

  // ---------------------------------------------------------------- filtre yanıtı (worklet ile aynı)
  // Tek SVF kademesi: y = mv·low + mk·(k·band) + mx·x → H(s) = (mv + mk·k·s + mx·(s²+ks+1)) / (s²+ks+1).
  function stage(w, k, m) {
    var dr = 1 - w * w, di = k * w;
    var nr = m[0] + m[2] * dr, ni = di * (m[1] + m[2]);
    return Math.sqrt((nr * nr + ni * ni) / (dr * dr + di * di));
  }

  var MORPH_SEQ = [0, 1, 2, 3, 0];   // Morph sırası LP → BP → HP → Notch → LP (0 LP, 1 BP, 2 HP, 3 Notch)
  var TYPE_W = [0, 2, 1, 3];         // Type enum (Lowpass, Highpass, Bandpass, Notch) → ağırlık indeksi

  // Çıkış karışımı [mv, mk, mx]; Morph komşu tipler arasında karmaşık (fazlı) karışımdır, worklet gibi.
  function mixOf(type, morph) {
    var w = [0, 0, 0, 0];
    if (type === 4) {
      var x = clamp01(morph) * 4, seg = Math.min(3, Math.floor(x)), t = x - seg;
      w[MORPH_SEQ[seg]] += 1 - t;
      w[MORPH_SEQ[seg + 1]] += t;
    } else w[TYPE_W[clamp(type, 0, 3)]] = 1;
    return [w[0] - w[2], w[1] - w[2] - w[3], w[2] + w[3]];
  }

  function fcOf(fp, fs) { return clamp(num(fp.freq, 20000), 20, fs ? Math.min(20000, 0.45 * fs) : 20000); }

  // |H(f)|, fp = {type, slope, res, morph, freq}. fs verilirse worklet'in dijital yanıtı (TPT/bilineer).
  function filterResponse(fp, f, fs) {
    var fc = fcOf(fp, fs);
    var w = fs ? Math.tan(Math.PI * Math.min(f, 0.4999 * fs) / fs) / Math.tan(Math.PI * fc / fs) : f / fc;
    var q = clamp(num(fp.res, 0), 0, 1.25) / 1.25, m = mixOf(Math.round(num(fp.type, 0)), num(fp.morph, 0));
    if (num(fp.slope, 0) >= 0.5) return stage(w, 1 / 0.5412, m) * stage(w, 1 / (1.3066 + q * (25 - 1.3066)), m);
    return stage(w, 2 - 1.98 * q, m);
  }

  function fparams(tr, n) {
    var I = P3.wtp.IDX, p = tr.p, f = 'f' + n;
    return { on: p[I[f + 'On']] > 0.5, type: p[I[f + 'Type']], slope: p[I[f + 'Slope']], res: p[I[f + 'Res']],
      morph: p[I[f + 'Morph']], freq: p[I[f + 'Freq']] };
  }

  // ---------------------------------------------------------------- slot bileşenleri
  function ring(k, norm, bipolar, color) {
    var cx = COL(k) + RING_DX, a, b;
    g.lineCap = 'butt';
    g.lineWidth = 1.5;
    g.strokeStyle = C().lcdTrack;
    g.beginPath();
    g.arc(cx, RING_CY, RING_R, A0, A0 + SWEEP);
    g.stroke();
    norm = clamp01(norm);
    if (bipolar) { a = TOP; b = TOP + HALF * (2 * norm - 1); } else { a = A0; b = A0 + SWEEP * norm; }
    if (Math.abs(b - a) < 0.5 * DEG) return;
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    g.strokeStyle = color;
    g.beginPath();
    g.arc(cx, RING_CY, RING_R, Math.min(a, b), Math.max(a, b));
    g.stroke();
    g.lineCap = 'butt';
  }

  // '20.5 kHz' → büyük sayı + küçük birim, aynı renk (arastirma-ekran §3.2). Birimsiz değer tek parça.
  function bigValue(k, s, color) {
    var m = /^(.*\S)\s+([^\s\d][^\s]*)$/.exec(s), x = COL(k);
    var w = put(m ? m[1] : s, x, 68, color, F_BIG, TEXT_W);
    if (m && w + 4 < TEXT_W) put(m[2], x + w + 4, 68, color, F_UNIT, TEXT_W - w - 4);
  }

  function listKind(S, view) {
    if (view.v === 'osc') return S.wtui.bank === 0 && (S.wtui.osc === '1' || S.wtui.osc === '2') ? 'text' : 'osc';
    if (!view.k) return 'text';
    var p = P3.wtp.PARAMS[P3.wtp.IDX[view.k]];
    return (p && ICON_KIND[p.en]) || 'text';
  }

  // r2'de yatay liste: seçili öğe renkli, diğerleri koyu gri; sütunun sağında kesilir.
  function enumList(k, view, color, kind) {
    var items = view.list, sel = clamp(view.index | 0, 0, items.length - 1), x0 = COL(k);
    var gap = kind === 'text' ? TEXT_GAP : ICON_GAP, dim = C().lcdTrack, w = [], i;
    for (i = 0; i < items.length; i++) w.push(kind === 'text' ? measure(String(items[i]), F_SMALL) : ICON_W);
    var s = sel, used = w[sel];
    while (s > 0 && used + gap + w[s - 1] <= TEXT_W) { s--; used += gap + w[s]; }
    for (var x = x0, j = s; j < items.length; j++) {
      var room = x0 + TEXT_W - x, c = j === sel ? color : dim;
      if (room <= 0) break;
      if (kind === 'text') {
        var s1 = String(items[j]), whole = w[j] <= room;
        // Kesilen son öğeden 3 harften azı kalacaksa çizilmez: 'P' gibi tek harflik kalıntı okunmaz.
        if (!whole && j !== sel && fit(s1, F_SMALL, room).length < 3) break;
        put(s1, x, BASE[2], c, F_SMALL, room);
        if (!whole) break;
      } else {
        if (w[j] > room) break;
        icon(kind, j, x, ICON_Y, c);
      }
      x += w[j] + gap;
    }
  }

  // ---------------------------------------------------------------- ikonlar (16×10, kendi çizimimiz)
  function icon(kind, i, x, y, color) {
    g.strokeStyle = color;
    if (kind === 'osc') { iconOsc(i, x, y, color); return; }
    g.lineWidth = kind === 'route' ? 1 : kind === 'loop' ? 1.25 : 1.5;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    if (kind === 'filter') iconFilter(i, x, y);
    else if (kind === 'lfo') iconLfo(i, x, y);
    else if (kind === 'loop') iconLoop(i, x, y);
    else iconRoute(i, x, y);
    g.stroke();
    g.lineCap = 'butt';
  }

  // Lowpass, Highpass, Bandpass, Notch, Morph (LP + HP üst üste).
  function iconFilter(i, x, y) {
    var t = y + 2.5, b = y + 9.5;
    if (i === 0 || i === 4) { g.moveTo(x, t); g.lineTo(x + 7, t); g.quadraticCurveTo(x + 12, t, x + 15.5, b); }
    if (i === 1 || i === 4) { g.moveTo(x + 0.5, b); g.quadraticCurveTo(x + 4, t, x + 9, t); g.lineTo(x + 16, t); }
    if (i === 2) { g.moveTo(x + 0.5, b); g.quadraticCurveTo(x + 5, t - 1, x + 8, t - 1); g.quadraticCurveTo(x + 11, t - 1, x + 15.5, b); }
    if (i === 3) {
      g.moveTo(x, t); g.lineTo(x + 5, t); g.quadraticCurveTo(x + 7.5, t, x + 8, b);
      g.quadraticCurveTo(x + 8.5, t, x + 11, t); g.lineTo(x + 16, t);
    }
  }

  // Sine, Triangle, Saw (aşağı), Square, Random — lfoShape ile aynı yönler (ilk yarı yukarı).
  function iconLfo(i, x, y) {
    var m = y + 5, a = 4, j;
    if (i === 0) { g.moveTo(x, m); for (j = 1; j <= 16; j++) g.lineTo(x + j, m - a * Math.sin(2 * Math.PI * j / 16)); }
    else if (i === 1) { g.moveTo(x, m); g.lineTo(x + 4, m - a); g.lineTo(x + 12, m + a); g.lineTo(x + 16, m); }
    else if (i === 2) { g.moveTo(x, m - a); g.lineTo(x + 8, m + a); g.lineTo(x + 8, m - a); g.lineTo(x + 16, m + a); }
    else if (i === 3) {
      g.moveTo(x, m + a); g.lineTo(x, m - a); g.lineTo(x + 8, m - a); g.lineTo(x + 8, m + a);
      g.lineTo(x + 16, m + a); g.lineTo(x + 16, m - a);
    } else {
      var st = [1, -3, 3.5, -1, 2, -2.5], sw = 16 / st.length;
      g.moveTo(x, m + st[0]);
      for (j = 0; j < st.length; j++) { if (j) g.lineTo(x + j * sw, m + st[j]); g.lineTo(x + (j + 1) * sw, m + st[j]); }
    }
  }

  function arrow(ex, ey, ang) {   // ang: ilerleme yönü
    g.moveTo(ex + 3 * Math.cos(ang + 2.5), ey + 3 * Math.sin(ang + 2.5));
    g.lineTo(ex, ey);
    g.lineTo(ex + 3 * Math.cos(ang - 2.5), ey + 3 * Math.sin(ang - 2.5));
  }

  // None (sona kadar →|), Trigger (|→ bir tur), Loop (dönen ok).
  function iconLoop(i, x, y) {
    var m = y + 5;
    if (i === 0) { g.moveTo(x + 1, m); g.lineTo(x + 13, m); g.moveTo(x + 14.5, y + 1.5); g.lineTo(x + 14.5, y + 8.5); return; }
    if (i === 1) {
      g.moveTo(x + 1.5, y + 1.5); g.lineTo(x + 1.5, y + 8.5);
      g.moveTo(x + 1.5, m); g.lineTo(x + 14.5, m);
      arrow(x + 14.5, m, 0);
      return;
    }
    var e = 1.75 * Math.PI;
    g.arc(x + 8, m, 4, 0.3 * Math.PI, e);
    arrow(x + 8 + 4 * Math.cos(e), m + 4 * Math.sin(e), e + Math.PI / 2);
  }

  // Serial (F1 → F2), Parallel (tek giriş ikiye), Split (Osc 1 → F1, Osc 2 → F2).
  function iconRoute(i, x, y) {
    if (i === 0) {
      g.rect(x + 0.75, y + 2.75, 5.5, 4.5);
      g.rect(x + 9.75, y + 2.75, 5.5, 4.5);
      g.moveTo(x + 6.25, y + 5); g.lineTo(x + 9.75, y + 5);
      return;
    }
    g.rect(x + 5.25, y + 0.75, 5.5, 3.5);
    g.rect(x + 5.25, y + 5.75, 5.5, 3.5);
    g.moveTo(x + 10.75, y + 2.5); g.lineTo(x + 13, y + 2.5); g.lineTo(x + 13, y + 7.5); g.lineTo(x + 10.75, y + 7.5);
    g.moveTo(x + 13, y + 5); g.lineTo(x + 16, y + 5);
    if (i === 1) {
      g.moveTo(x, y + 5); g.lineTo(x + 3, y + 5);
      g.moveTo(x + 5.25, y + 2.5); g.lineTo(x + 3, y + 2.5); g.lineTo(x + 3, y + 7.5); g.lineTo(x + 5.25, y + 7.5);
    } else {
      g.moveTo(x, y + 2.5); g.lineTo(x + 5.25, y + 2.5);
      g.moveTo(x, y + 7.5); g.lineTo(x + 5.25, y + 7.5);
    }
  }

  function iconOsc(i, x, y, color) {
    var s = OSC_GLYPH[i] || '?';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, 15, 9);
    put(s, x + 8 - measure(s, F_ICON) / 2, y + 8, color, F_ICON);
  }

  // ---------------------------------------------------------------- bank içeriği
  function bankOf(S) {
    var B = P3.wtp.BANKS;
    return B[clamp(Math.round(num(S.wtui && S.wtui.bank, 0)), 0, B.length - 1)];
  }

  // Seçili bankın 8 slot'u, görünümleri ve görselleştirmeleri (§H2: vis + vis.next).
  function slotModel(S, tr) {
    var wtp = P3.wtp, b = bankOf(S), defs = b.slots(S, tr) || [], vis = b.vis(S, tr);
    var visList = [], shrunk = [], views = [], k, c;
    if (vis) { visList.push(vis); if (vis.next) visList.push(vis.next); }
    visList.forEach(function (v) { for (c = v.cols[0]; c <= v.cols[1]; c++) shrunk[c] = true; });
    for (k = 0; k < 8; k++) views[k] = defs[k] ? wtp.slotView(S, tr, defs[k]) : null;
    return { bank: b, defs: defs, views: views, visList: visList, shrunk: shrunk };
  }

  // Listesi ve halka normu olmayan sanal değer (Mod Target): düz metin.
  function textual(view) {
    return !!(view.v && !view.list && !(P3.wtp.VIRTUAL[view.v] && P3.wtp.VIRTUAL[view.v].norm));
  }

  function drawSlot(S, k, view, shrunk, accent, touched) {
    var K = C(), dis = view.disabled, col = dis ? K.lcdDisabled : accent;
    put(view.label, COL(k), BASE[1], dis ? K.lcdDisabled : touched ? K.lcdWhite : K.lcdName, F_NAME, TEXT_W);
    if (view.list) {
      var kind = listKind(S, view);
      enumList(k, view, col, kind);
      if (!shrunk && kind !== 'text' && kind !== 'osc') put(view.text, COL(k), BASE[3], col, F_SMALL, TEXT_W);
      return;
    }
    if (shrunk || textual(view)) { put(view.text, COL(k), BASE[2], col, F_SMALL, TEXT_W); return; }
    bigValue(k, view.text, col);
    ring(k, view.norm, view.bipolar, col);
  }

  function bankBody(S, tr) {
    var m = slotModel(S, tr), t = S.wtui.touched, k;
    for (k = 0; k < 8; k++) if (m.views[k]) drawSlot(S, k, m.views[k], !!m.shrunk[k], tr.color, t === k);
    var td = t >= 0 && t < 8 ? m.defs[t] || null : null;
    m.visList.forEach(function (v) { drawVis(S, tr, v, tr.color, td); });
  }

  function trackRow(S) {
    var K = C(), ts = S.tracks || [], sel = selIndex(S);
    for (var k = 0; k < 8 && k < ts.length; k++) {
      var t = ts[k], x = COL(k), ink = t.color;
      if (k === sel) { g.fillStyle = t.color; g.fillRect(121 * k + 9, 140, 105, 17); ink = K.lcdBg; }
      if (t.arm) { armDot(x + 2.5, BASE[7] - 4, ink); x += 9; }
      put(t.name, x, BASE[7], ink, F_LABEL, COL(k) + CHIP_TEXT_W - x);
    }
  }

  function bankTabs(S, tr) {
    var B = P3.wtp.BANKS, cur = bankOf(S);
    for (var k = 0; k < 8 && k < B.length; k++) {
      if (B[k] === cur) chip(k, 7, B[k].name, tr.color, C().lcdBg);
      else put(B[k].name, COL(k), BASE[7], tr.color, F_LABEL, TEXT_W);
    }
  }

  // Bank görünümü r0: option j → üst düğme j+2 → sütun j+1.
  function optionsRow(S, tr) {
    var K = C(), opts = bankOf(S).options(S, tr) || [], accent = tr.color;
    for (var j = 0; j < 7; j++) {
      var o = opts[j], x = COL(j + 1), w;
      if (!o) continue;
      if (o.kind === 'toggle') {
        var on = !!o.get(S, tr);
        w = put(o.label, x, BASE[0], accent, F_LABEL, TEXT_W);
        put(on ? 'On' : 'Off', x + w + 4, BASE[0], on ? K.lcdWhite : accent, F_LABEL, TEXT_W - w - 4);
      } else if (o.kind === 'switch') {
        var words = SWITCH_WORDS[o.label] || o.values || [], sel = o.get(S, tr), xx = x;
        for (var i = 0; i < words.length && xx < x + TEXT_W; i++) {
          var s1 = String(words[i]);
          w = put(s1, xx, BASE[0], i === sel ? K.lcdWhite : accent, F_LABEL, x + TEXT_W - xx);
          if (w < measure(s1, F_LABEL) - 0.01) break;
          xx += w + TEXT_GAP;
        }
      } else {
        put(o.label, x, BASE[0], !o.enabled || o.enabled(S, tr) ? accent : K.lcdDisabled, F_LABEL, TEXT_W);
      }
    }
  }

  // ---------------------------------------------------------------- görselleştirmeler (y 61–139)
  var VIS = {};

  function drawVis(S, tr, v, accent, td) {
    var fn = VIS[v.type];
    if (!fn) return;
    var box = { x0: COL(v.cols[0]), x1: COLR(v.cols[1]) };
    g.save();
    g.beginPath();
    g.rect(box.x0 - 2, VIS_TOP, box.x1 - box.x0 + 4, VIS_BOT - VIS_TOP + 1);
    g.clip();
    try { fn(S, tr, v, box, accent, td); } finally {
      g.restore();
      curFont = '';   // restore fontu da geri alır
    }
  }

  // Nota çalarken worklet'in modüle ettiği konum (meter), yoksa taban Position.
  function livePos(S, tr, n) {
    var m = meterOf(S), v = m && m.voices > 0 ? m['pos' + n] : undefined;
    return clamp01(typeof v === 'number' && isFinite(v) ? v : tr.p[P3.wtp.IDX['o' + n + 'Pos']]);
  }

  // Tek kare: disp içinden, kareler ve örnekler arası doğrusal, 160 nokta (bir periyot).
  function waveFrame(disp, F, pos, box, color, lw, alpha, dx, dy) {
    var fp = pos * (F - 1), f0 = Math.floor(fp), f1 = Math.min(F - 1, f0 + 1), fr = fp - f0;
    var b0 = f0 * DISP_N, b1 = f1 * DISP_N, span = box.x1 - box.x0;
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = lw;
    g.lineJoin = 'round';
    g.beginPath();
    for (var i = 0; i < WAVE_PTS; i++) {
      var u = i * DISP_N / (WAVE_PTS - 1), j = Math.floor(u), t = u - j, j0 = j % DISP_N, j1 = (j + 1) % DISP_N;
      var a = disp[b0 + j0] + (disp[b0 + j1] - disp[b0 + j0]) * t;
      var b = disp[b1 + j0] + (disp[b1 + j1] - disp[b1 + j0]) * t;
      var s = clamp(a + (b - a) * fr, -1, 1);
      var x = box.x0 + span * i / (WAVE_PTS - 1) + dx, y = WAVE_Y - WAVE_AMP * s + dy;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 1;
  }

  // Position'ın tablo içindeki yeri: altta ince iz + çentik.
  function posMarker(box, pos, color) {
    g.lineWidth = 1;
    g.strokeStyle = C().lcdTrack;
    line(box.x0, VIS_BOT - 1.5, box.x1, VIS_BOT - 1.5);
    g.fillStyle = color;
    g.fillRect(box.x0 + (box.x1 - box.x0) * pos - 1, VIS_BOT - 4, 2, 4);
  }

  VIS.wavetable = function (S, tr, v, box, accent, td) {
    var wtp = P3.wtp, I = wtp.IDX, p = tr.p, n = v.osc === 2 ? 2 : 1, o = 'o' + n;
    var col = p[I[o + 'On']] > 0.5 ? accent : C().lcdDisabled;
    // Faz 2 tabloları Temel Şekiller olarak çalar (README A3): duyulanı göster.
    var id = wtp.audibleTable(wtp.tableId(p[I[o + 'Cat']], p[I[o + 'Tab']]));
    var disp = tableDisp(id), pos = livePos(S, tr, n);
    watch.osc.push(n);
    if (!disp) {
      watch.disp.push(id);
      g.lineWidth = 1;
      g.strokeStyle = C().lcdTrack;
      line(box.x0, WAVE_Y + 0.5, box.x1, WAVE_Y + 0.5);
    } else {
      var F = Math.floor(disp.length / DISP_N);
      // AdjustingPosition: komşu kareler geriye doğru (yüksek konum sağ üstte) soluk bir istif.
      if (td && td.k && /^o[12](Pos|Tab|Cat)$/.test(td.k)) {
        for (var d = STACK_N; d >= -STACK_N; d--) {
          var q = pos + d * STACK_STEP;
          if (d && q >= 0 && q <= 1) waveFrame(disp, F, q, box, col, 1, 0.35, d * STACK_DX, -d * STACK_DY);
        }
      }
      waveFrame(disp, F, pos, box, col, 2, 1, 0, 0);
    }
    posMarker(box, pos, col);
  };

  function fx(box, f) { return box.x0 + (box.x1 - box.x0) * Math.log(f / 20) / Math.log(1000); }
  function fy(mag) { return clamp(84 - 1.1 * 20 * Math.log10(Math.max(mag, 1e-9)), VIS_TOP, VIS_BOT); }

  function fcurve(mags, box, color, lw, alpha) {
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = lw;
    g.lineJoin = 'round';
    g.beginPath();
    for (var i = 0; i < mags.length; i++) {
      var x = box.x0 + (box.x1 - box.x0) * i / (mags.length - 1), y = fy(mags[i]);
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 1;
  }

  // fc düğümü: dolu = seçili filtre, boş = diğeri ya da kapalı (içi zeminle doldurulur, eğri görünmez).
  function fnode(fc, mag, box, color, filled, alpha) {
    var x = clamp(fx(box, fc), box.x0, box.x1), y = clamp(fy(mag), VIS_TOP + 4, VIS_BOT - 4);
    g.globalAlpha = alpha;
    g.beginPath();
    g.arc(x, y, 4, 0, 2 * Math.PI);
    g.fillStyle = filled ? color : C().lcdBg;
    g.fill();
    if (!filled) { g.lineWidth = 1.5; g.strokeStyle = color; g.stroke(); }
    g.globalAlpha = 1;
  }

  VIS.filter = function (S, tr, v, box, accent, td) {
    var K = C(), sel = v.flt === 2 ? 2 : 1, fs = sampleRate(), route = Math.round(num(tr.p[P3.wtp.IDX.route], 0));
    var a = fparams(tr, sel), b = fparams(tr, 3 - sel), fa = fcOf(a, fs), fb = fcOf(b, fs);
    var adjusting = !!(td && ((td.k && /^f[12](Type|Freq|Res|Morph)$/.test(td.k)) || td.v === 'flt'));
    var lw = adjusting ? 2.5 : 2;
    var ra = FILT_FREQS.map(function (f) { return filterResponse(a, f, fs); });
    var rb = b.on ? FILT_FREQS.map(function (f) { return filterResponse(b, f, fs); }) : null;
    var atA = filterResponse(a, fa, fs), bAtB = b.on ? filterResponse(b, fb, fs) : 1;
    if (route === 0) {
      // Serial: duyulan yanıt açık filtrelerin çarpımı; kapalı filtre sesi olduğu gibi geçirir.
      var main = FILT_FREQS.map(function (f, j) { return (a.on ? ra[j] : 1) * (rb ? rb[j] : 1); });
      if (a.on && rb) { fcurve(rb, box, accent, 1, 0.4); fnode(fb, bAtB, box, accent, false, 0.4); }
      if (!a.on) fcurve(ra, box, K.lcdDisabled, 1, 1);
      fcurve(main, box, a.on || rb ? accent : K.lcdDisabled, lw, 1);
      if (a.on) fnode(fa, atA * (rb ? filterResponse(b, fa, fs) : 1), box, accent, true, 1);
      else {
        fnode(fa, atA, box, K.lcdDisabled, false, 1);
        if (rb) fnode(fb, bAtB, box, accent, false, 1);
      }
      return;
    }
    // Parallel / Split: her filtre kendi dalında; iki eğri ayrı.
    if (rb) { fcurve(rb, box, accent, 1, 0.4); fnode(fb, bAtB, box, accent, false, 0.4); }
    fcurve(ra, box, a.on ? accent : K.lcdDisabled, lw, 1);
    fnode(fa, atA, box, a.on ? accent : K.lcdDisabled, a.on, 1);
  };

  VIS.env = function (S, tr, v, box, accent, td) {
    var wtp = P3.wtp, I = wtp.IDX, p = tr.p, e = v.env === 'e2' || v.env === 'e3' ? v.env : 'amp', amp = e === 'amp';
    function val(s, d) { var i = I[e + s]; return i === undefined ? d : num(p[i], d); }
    var A = Math.max(0, val('A', 0)), D = Math.max(0, val('D', 0)), R = Math.max(0, val('R', 0));
    var sus = clamp01(val('S', 0)), ini = amp ? 0 : clamp01(val('Init', 0));
    var pk = amp ? 1 : clamp01(val('Peak', 1)), fin = amp ? 0 : clamp01(val('Fin', 0));
    var suf = td && td.k && td.k.indexOf(e) === 0 ? td.k.slice(e.length) : '', focus = ENV_FOCUS[suf] || null;
    // Sustain sabit 0.18W; A, D, R kalan alanı t^(1/3) oranında paylaşır. Düğümler için kenarlarda 4 px.
    var x0 = box.x0 + 4, span = box.x1 - box.x0 - 8, wS = 0.18 * span, rest = span - wS;
    var cA = Math.cbrt(A), cD = Math.cbrt(D), cR = Math.cbrt(R), tot = cA + cD + cR;
    var wA = tot > 0 ? rest * cA / tot : rest / 3, wD = tot > 0 ? rest * cD / tot : rest / 3;
    var xs = [x0, x0 + wA, x0 + wA + wD, x0 + wA + wD + wS, x0 + span];
    function ey(l) { return 135 - 69 * l; }
    function style(id) {
      if (!focus) return { lw: 2, a: 1, fill: false };
      return focus.indexOf(id) >= 0 ? { lw: 2.5, a: 1, fill: true } : { lw: 1.5, a: 0.55, fill: false };
    }
    function seg(id, xa, xb, la, lb, s) {
      var st = style(id);
      g.globalAlpha = st.a;
      g.lineWidth = st.lw;
      g.strokeStyle = accent;
      g.lineJoin = 'round';
      g.beginPath();
      for (var i = 0; i < 24; i++) {
        var u = i / 23, x = xa + (xb - xa) * u, y = ey(la + (lb - la) * wtp.envCurve(u, s));
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
    function node(id, x, l) {
      var st = style(id);
      g.globalAlpha = st.a;
      g.beginPath();
      g.arc(x, ey(l), 3, 0, 2 * Math.PI);
      g.fillStyle = st.fill ? accent : C().lcdBg;
      g.fill();
      if (!st.fill) { g.lineWidth = 1.5; g.strokeStyle = accent; g.stroke(); }
    }
    seg('aL', xs[0], xs[1], ini, pk, val('ASl', 0));
    seg('dL', xs[1], xs[2], pk, sus, val('DSl', 0.5));
    seg('sL', xs[2], xs[3], sus, sus, 0);
    seg('rL', xs[3], xs[4], sus, fin, val('RSl', 0.5));
    if (!amp) node('iN', xs[0], ini);
    node('aN', xs[1], pk);
    node('dN', xs[2], sus);
    node('sN', xs[3], sus);
    node('rN', xs[4], fin);
    g.globalAlpha = 1;
  };

  // Bir LFO periyodu (s). Mod Time periyodu ve Attack'ı aynı oranda ölçeklediği için katılmaz.
  function lfoPeriod(S, p, I, l) {
    if (num(p[I[l + 'Sync']], 0) >= 0.5) {
      var SB = P3.wtp.SRATE_BARS, bars = SB[clamp(Math.round(num(p[I[l + 'SRate']], 15)), 0, SB.length - 1)];
      return bars * 4 * 60 / ((S.transport && S.transport.bpm) || 120);
    }
    return 1 / Math.max(0.01, num(p[I[l + 'Rate']], 1));
  }

  VIS.lfo = function (S, tr, v, box, accent, td) {
    var wtp = P3.wtp, I = wtp.IDX, p = tr.p, l = 'l' + (v.lfo === 2 ? 2 : 1);
    var shape = Math.round(num(p[I[l + 'Shape']], 0)), shp = num(p[I[l + 'Shp']], 0);
    var amt = clamp01(num(p[I[l + 'Amt']], 1)), ph = num(p[I[l + 'Phase']], 0) / 360;
    var att = Math.max(0, num(p[I[l + 'Att']], 0)), T = lfoPeriod(S, p, I, l);
    var adjusting = !!(td && ((td.k && td.k.indexOf(l) === 0) || td.v === 'lfo'));
    var span = box.x1 - box.x0, n = Math.max(2, Math.round(span));
    g.lineWidth = 1;
    g.strokeStyle = C().lcdTrack;
    line(box.x0, WAVE_Y + 0.5, box.x1, WAVE_Y + 0.5);
    g.lineWidth = adjusting ? 2.5 : 2;
    g.strokeStyle = accent;
    g.lineJoin = 'round';
    g.beginPath();
    for (var i = 0; i <= n; i++) {
      var u = 2 * i / n;                                   // 0..2 periyot
      var fade = att > 0 ? Math.min(1, u * T / att) : 1;   // Attack: doğrusal açılma (worklet gibi)
      // VARSAYIM (sartname-ekran §4): Random periyot başına 8 deterministik basamak.
      var s = shape === 4 ? wtp.lfoShape(4, shp, Math.floor((u + ph) * 8)) : wtp.lfoShape(shape, shp, u + ph);
      var x = box.x0 + span * i / n, y = WAVE_Y - WAVE_AMP * amt * fade * clamp(num(s, 0), -1, 1);
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  };

  // ---------------------------------------------------------------- sayfalar
  function pageName(S) {
    if (S.overlay === 'scale') return 'scale';
    if (S.overlay === 'learn') return 'learn';
    if (S.overlay) return 'unsupported';
    if (S.view && S.view !== 'device') return 'unsupported';
    var tr = track(S);
    return S.bankView && tr && tr.kind === 'synth' ? 'bank' : 'device';
  }

  function unsupportedName(S) { return S.overlay || S.view || ''; }

  // Zincir görünümü: r0 cihaz çipi, r1–r6 seçili bank, r7 track'ler. Drum track'te Drum Rack sayfası.
  function pageDevice(ctx, S) {
    use(ctx);
    var tr = track(S);
    if (!tr) return;
    if (tr.kind === 'drum') { drumPage(S, tr); return; }
    chip(0, 0, 'Wavetable', tr.color, C().lcdBg);
    if (P3.wtp && tr.p) bankBody(S, tr);
    trackRow(S);
  }

  // Bank görünümü: r0 '< Wavetable' + option'lar, r7 bank sekmeleri.
  function pageBank(ctx, S) {
    use(ctx);
    var tr = track(S);
    if (!tr || tr.kind !== 'synth' || !P3.wtp) { pageDevice(ctx, S); return; }
    put('< Wavetable', COL(0), BASE[0], tr.color, F_LABEL, TEXT_W);
    optionsRow(S, tr);
    bankBody(S, tr);
    bankTabs(S, tr);
  }

  // §H14: 4×4 pad adı ızgarası, fiziksel drum pad'leriyle aynı yerde (sol alt = bank'ın ilk pad'i).
  function drumPage(S, tr) {
    var K = C(), kit = P3.drums && P3.drums.KIT, bank = Math.round(num(tr.bank, 0));
    chip(0, 0, 'Drum Rack', tr.color, K.lcdBg);
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        var pad = bank + y * 4 + x, slot = kit && pad >= 0 && pad < kit.length ? kit[pad] : null;
        var named = !!(slot && slot.name), sound = named && (!P3.drums.hasSound || P3.drums.hasSound(pad));
        var col = pad === tr.selPad ? tr.color : sound ? K.lcdName : K.lcdMono;
        put(named ? slot.name : '—', COL(x), BASE[6 - y], col, F_SMALL, TEXT_W);   // §H15: boş pad '—'
      }
    }
    trackRow(S);
  }

  var scaleC0 = 0;   // gam ızgarasında görünen ilk sütun

  // Scale menüsü (tek renkli, sartname-ekran §6).
  function pageScale(ctx, S) {
    use(ctx);
    var K = C(), sc = S.scale, SC = P3.scale, R = SC.ROOT_NOTES, N = SC.NOTE_NAMES, k, i;
    for (k = 1; k <= 6; k++) {
      put(N[R[k - 1]], COL(k), BASE[0], R[k - 1] === sc.root ? K.lcdWhite : K.lcdMono, F_LABEL, TEXT_W);
      put(N[R[k + 5]], COL(k), BASE[7], R[k + 5] === sc.root ? K.lcdWhite : K.lcdMono, F_LABEL, TEXT_W);
    }
    put('In Key', COL(0), BASE[7], sc.inKey ? K.lcdWhite : K.lcdMono, F_TINY, 40);
    put('Chromatic', COL(0) + 42, BASE[7], sc.inKey ? K.lcdMono : K.lcdWhite, F_TINY, 62);
    put(sc.fixed ? 'Fixed On' : 'Fixed Off', COL(7), BASE[7], sc.fixed ? K.lcdWhite : K.lcdMono, F_LABEL, TEXT_W);

    put('Layout', COL(0), BASE[1], K.lcdName, F_NAME, TEXT_W);
    for (i = 0; i < SC.LAYOUTS.length; i++) {
      var on = i === sc.layoutIdx;
      put(SC.LAYOUTS[i].name, COL(0), BASE[2 + i], on ? K.lcdWhite : K.lcdMono, on ? F_LAYOUT : F_SMALL, TEXT_W);
    }

    // 4 satır × 6 görünür sütun, liste sütun sütun dolar; seçili sütun görünür kalacak kadar kayar.
    var n = SC.SCALES.length, cols = Math.ceil(n / 4), sel = clamp(Math.round(num(sc.idx, 0)), 0, n - 1);
    var sc0 = Math.floor(sel / 4);
    scaleC0 = clamp(clamp(scaleC0, sc0 - 5, sc0), 0, Math.max(0, cols - 6));
    for (var c = scaleC0; c < scaleC0 + 6 && c < cols; c++) {
      for (i = 0; i < 4; i++) {
        var idx = c * 4 + i;
        if (idx >= n) break;
        var cx = 121 * (c - scaleC0 + 1) + 9, cy = 41 + 20 * i;
        if (idx === sel) { g.fillStyle = K.lcdWhite; g.fillRect(cx, cy, 105, 18); }
        put(SC.SCALES[idx][0], cx + 5, cy + 13, idx === sel ? K.lcdBg : K.lcdName, F_LABEL, 95);
      }
    }
  }

  // ---------------------------------------------------------------- Learn
  function curriculum() {
    var c = P3.tut && P3.tut.CURRICULUM;
    var list = Array.isArray(c) ? c : (c && Array.isArray(c.chapters) ? c.chapters : null);
    return list && list.length ? list : null;
  }

  // Bölümler + ilerleme (P3.save 'tutorial': {current:{ch}, steps:{'bolum/adim':{done|skipped}}, chapters}).
  function learnModel(S) {
    var chs = curriculum();
    if (!chs) return null;
    var sv = P3.save && typeof P3.save.get === 'function' ? P3.save.get('tutorial') : null;
    sv = sv && typeof sv === 'object' ? sv : {};
    var steps = sv.steps || {}, chd = sv.chapters || {}, cur = sv.current && sv.current.ch;
    var list = chs.map(function (ch, i) {
      var slug = String(ch.id || ch.slug || i), phase = num(ch.phase, 1), avail = phase <= PHASE;
      var st = (ch.steps || []).filter(function (s) { return !avail || num(s.phase, phase) <= PHASE; });
      var done = st.filter(function (s) {
        var r = steps[slug + '/' + s.id];
        return !!(r && (r.done || r.skipped));
      }).length;
      var title = P3.t(ch.title) || slug;
      return { i: i, slug: slug, avail: avail, title: title,
        short: ch.short ? P3.t(ch.short) : (LEARN_SHORT[slug] || title),
        done: done, total: st.length, complete: !!(chd[slug] && chd[slug].done) || (st.length > 0 && done === st.length) };
    });
    var sel = typeof S.learnSel === 'number' && list[S.learnSel] ? S.learnSel : -1, i;
    for (i = 0; sel < 0 && i < list.length; i++) if (list[i].slug === cur) sel = i;
    for (i = 0; sel < 0 && i < list.length; i++) if (list[i].avail && !list[i].complete) sel = i;
    if (sel < 0) sel = 0;
    var pages = Math.ceil(list.length / 8);
    var page = typeof S.learnPage === 'number' ? clamp(Math.round(S.learnPage), 0, pages - 1) : Math.floor(sel / 8);
    return { list: list, sel: sel, page: page, pages: pages };
  }

  // Learn sayfası (kendi tasarımımız, sartname-ekran §8): r0 bölüm kısaltmaları, ortada seçili bölüm.
  function pageLearn(ctx, S) {
    use(ctx);
    var K = C(), L = learnModel(S);
    if (!L) { put('Learn', COL(0), 72, K.lcdWhite, F_BIG, 930); return; }
    for (var k = 0; k < 8; k++) {
      var ch = L.list[L.page * 8 + k];
      if (!ch) continue;
      var x = COL(k), ink = ch.avail ? K.lcdWhite : K.lcdDisabled;
      if (ch.i === L.sel) { g.fillStyle = ch.avail ? K.lcdWhite : K.lcdMono; g.fillRect(121 * k + 9, 2, 105, 17); ink = K.lcdBg; }
      if (ch.complete) { check(x, BASE[0], ink); x += 11; }
      put(ch.short, x, BASE[0], ink, F_LABEL, COL(k) + CHIP_TEXT_W - x);
    }
    var cur = L.list[L.sel];
    put(cur.avail ? cur.title : `${cur.title} (yakında)`, COL(0), 72, cur.avail ? K.lcdWhite : K.lcdMono, F_BIG, 930);
    if (cur.total) put(`${cur.done}/${cur.total}`, COL(0), 96, K.lcdName, F_SMALL, 930);
    put(`Bölümü açmak için üstündeki düğmeye bas`, COL(0), BASE[7], K.lcdMono, F_LABEL, 700);
    if (L.pages > 1) putRight(`${L.page + 1}/${L.pages}`, COLR(7), BASE[7], K.lcdMono, F_LABEL);
  }

  function learnChapterAt(k) {
    var S = P3.S, L = S ? learnModel(S) : null, ch = L ? L.list[L.page * 8 + (k - 1)] : null;
    return ch && k >= 1 && k <= 8 ? ch.slug : null;
  }

  // Faz 1'de olmayan görünüm/overlay (Mix, Clip, Fixed Length…): modes popup'ı da gösterir.
  function pageUnsupported(ctx, S) {
    use(ctx);
    var K = C(), name = unsupportedName(S);
    put(UNSUP_TITLE[name] || name, COL(0), 72, K.lcdWhite, F_BIG, 930);
    put('Not in this simulator', COL(0), 96, K.lcdName, F_SMALL, 930);
  }

  var pages = { device: pageDevice, bank: pageBank, scale: pageScale, learn: pageLearn, unsupported: pageUnsupported };

  // ---------------------------------------------------------------- katmanlar
  // Ses durumu r6'nın sağ altında: PeriodicWave yolu rozeti ya da sesi açma ipucu (VARSAYIM).
  function statusLayer(S) {
    var K = C(), app = S.app || {}, a = app.audio;
    if (a === 'fallback') {
      var w = measure('Basic audio', F_BADGE) + 8, x = COLR(7) - w;
      g.lineWidth = 1;
      g.strokeStyle = K.lcdMono;
      g.strokeRect(x + 0.5, 126.5, w - 1, 12);
      put('Basic audio', x + 4, 136, K.lcdName, F_BADGE);
    } else if (a !== 'running' && app.mode !== 'level1' && app.mode !== 'menu') {
      putRight(a === 'failed' ? `Ses başlatılamadı` : `Ses kapalı — bir pad'e dokun`, COLR(7), 136, K.lcdName, F_TINY);
    }
  }

  // Popup (sartname-ekran §7): sol-orta siyah kutu, 1 px beyaz kenar, 28 px metin. true = çizildi.
  function popupLayer(S, t) {
    var p = S.popup;
    if (!p || !(p.until > t) || !p.text) return false;
    var K = C(), main = String(p.text), sub = p.sub ? String(p.sub) : '';
    var tw = Math.min(888, measure(main, F_POPUP)), sw = sub ? Math.min(888, measure(sub, F_SMALL)) : 0;
    var w = Math.min(936, Math.max(tw, sw) + 48);
    g.fillStyle = K.lcdBg;
    g.fillRect(12, 46, w, 68);
    g.lineWidth = 1;
    g.strokeStyle = K.lcdWhite;
    g.strokeRect(12.5, 46.5, w - 1, 67);
    put(main, 36, sub ? 82 : 90, K.lcdWhite, F_POPUP, 888);
    if (sub) put(sub, 36, 104, K.lcdName, F_SMALL, 888);
    return true;
  }

  function clearPopup(S) {
    if (!S || !S.popup) return;
    if (P3.store && P3.store.S === S) P3.store.set('popup', null, { silent: true });
    else S.popup = null;
  }

  // Popup'ı yazar (S.popup, sessiz: undo ve 'state' olayı yok). Süre son çağrıdan itibaren sayılır.
  function popup(text, sub, ms) {
    var S = P3.S;
    if (!S || text === null || text === undefined || text === '') return;
    var val = { text: String(text), sub: sub === null || sub === undefined ? '' : String(sub),
      until: now() + (ms > 0 ? ms : P3.K.POPUP_MS) };
    if (P3.store && P3.store.S === S) P3.store.set('popup', val, { silent: true });
    else S.popup = val;
    invalidate();
  }

  // ---------------------------------------------------------------- metinler (popup + ARIA)
  function volumeParts(S) {
    var v = S.vol || {}, t = VOL_LABEL[v.target] ? v.target : 'main', db = num(v[t], t === 'track' ? 0 : -10);
    return [VOL_LABEL[t], db < -70 ? '-inf dB' : fixed(db, 1) + ' dB', db];
  }

  function swingTempoParts(S) {
    var tr = S.transport || {};
    if (S.swingTempo === 'swing') { var sw = clamp(num(tr.swing, 0), 0, 100); return ['Swing Amount', Math.round(sw) + '%', sw / 100]; }
    var bpm = num(tr.bpm, 120);
    return ['Tempo', bpm.toFixed(2) + ' BPM', (bpm - 20) / 979];
  }

  // ---------------------------------------------------------------- erişilebilirlik
  var ariaDone = {};   // id:öznitelik → son yazılan değer

  function setAttr(el, id, name, v) {
    var key = id + ':' + name;
    v = String(v);
    if (ariaDone[key] === v) return;
    ariaDone[key] = v;
    el.setAttribute(name, v);
  }

  // Encoder k'nın ekranda karşılığı: {label, text, now 0..100} ya da null.
  function encInfo(S) {
    var out = [null, null, null, null, null, null, null, null], name = pageName(S), tr = track(S), k;
    if (name === 'scale' && P3.scale) {
      var SC = P3.scale, sc = S.scale, nl = SC.LAYOUTS.length, n = SC.SCALES.length;
      var li = clamp(Math.round(num(sc.layoutIdx, 0)), 0, nl - 1), idx = clamp(Math.round(num(sc.idx, 0)), 0, n - 1);
      out[0] = { label: 'Layout', text: SC.LAYOUTS[li].name, now: Math.round(100 * li / (nl - 1)) };
      for (k = 1; k <= 6; k++) out[k] = { label: 'Scale', text: SC.SCALES[idx][0], now: Math.round(100 * idx / (n - 1)) };
    } else if ((name === 'device' || name === 'bank') && tr && tr.kind === 'synth' && tr.p && P3.wtp) {
      var m = slotModel(S, tr);
      for (k = 0; k < 8; k++) {
        var v = m.views[k];
        if (v) out[k] = { label: v.label, text: v.text, now: Math.round(100 * clamp01(v.norm)) };
      }
    }
    return out;
  }

  // §H10: slider değerleri (enc1..8, volume, swingTempo). Değişmeyen öznitelik yeniden yazılmaz.
  function aria(S) {
    var dev = P3.dev;
    if (!dev || typeof dev.hotspotEl !== 'function') return;
    var info = encInfo(S), el, id;
    for (var k = 0; k < 8; k++) {
      id = 'enc' + (k + 1);
      el = dev.hotspotEl(id);
      if (!el) continue;
      var e = info[k], c = dev.CONTROLS && dev.CONTROLS[id];
      setAttr(el, id, 'aria-label', e ? e.label : (c ? c.label : 'Encoder ' + (k + 1)));
      setAttr(el, id, 'aria-valuenow', e ? e.now : 0);
      setAttr(el, id, 'aria-valuetext', e ? e.label + ' ' + e.text : `boş`);
    }
    var vp = volumeParts(S), sp = swingTempoParts(S);
    if ((el = dev.hotspotEl('volume'))) {
      setAttr(el, 'volume', 'aria-valuenow', Math.round(100 * (clamp(vp[2], -70, 6) + 70) / 76));
      setAttr(el, 'volume', 'aria-valuetext', vp[0] + ' ' + vp[1]);
    }
    if ((el = dev.hotspotEl('swingTempo'))) {
      setAttr(el, 'swingTempo', 'aria-valuenow', Math.round(100 * clamp01(sp[2])));
      setAttr(el, 'swingTempo', 'aria-valuetext', sp[0] + ' ' + sp[1]);
    }
  }

  // #p3LcdLive metni: ekranda ne olduğunun kısa özeti (sayfa + bank + değerler).
  function summary(S) {
    S = S || P3.S;
    if (!S) return '';
    var name = pageName(S), tr = track(S);
    if (name === 'scale') {
      var sc = S.scale, SC = P3.scale, lay = SC.LAYOUTS[clamp(Math.round(num(sc.layoutIdx, 0)), 0, SC.LAYOUTS.length - 1)];
      return `Scale: ${SC.scaleName(sc)}, ${sc.inKey ? 'In Key' : 'Chromatic'}, Layout ${lay.name}, Fixed ${sc.fixed ? 'On' : 'Off'}`;
    }
    if (name === 'learn') {
      var L = learnModel(S), cur = L && L.list[L.sel];
      return cur ? `Learn: ${L.list.length} bölüm. Seçili: ${cur.title}${cur.total ? ` (${cur.done}/${cur.total})` : ''}` : 'Learn';
    }
    if (name === 'unsupported') return `${UNSUP_TITLE[unsupportedName(S)] || unsupportedName(S)}: Not in this simulator`;
    if (!tr) return '';
    if (tr.kind === 'drum') {
      var kit = P3.drums && P3.drums.KIT, slot = kit && kit[tr.selPad];
      var pn = P3.scale ? P3.scale.noteName(36 + num(tr.selPad, 0)) : '';
      return `${tr.name} · Drum Rack · seçili pad ${slot && slot.name ? slot.name : '—'} (${pn})`;
    }
    if (!P3.wtp || !tr.p) return `${tr.name} · Wavetable`;
    var m = slotModel(S, tr), vals = m.views.filter(Boolean).map(function (v) { return v.label + ' ' + v.text; }).join(', ');
    return `${tr.name} · Wavetable${name === 'bank' ? ` · bank görünümü` : ''} · ${m.bank.name}: ${vals}`;
  }

  function pageKey(S) {
    var name = pageName(S), w = S.wtui || {}, tr = track(S);
    if (name === 'scale') return name;
    if (name === 'learn') { var L = learnModel(S); return name + '|' + (L ? L.page + ':' + L.sel : ''); }
    if (name === 'unsupported') return name + '|' + unsupportedName(S);
    return [name, selIndex(S), tr && tr.kind, w.bank, w.osc, w.flt, w.env, w.lfo, w.ampView, w.modView, w.expr].join('|');
  }

  var liveEl = null, liveKey = null, liveTimer = 0, liveAt = -1e9;

  // Sayfa/bank değişince özet; en çok LIVE_MS'de bir, bekleyen yazım son durumu okur.
  function announce(S) {
    var key = pageKey(S);
    if (key === liveKey) return;
    var first = liveKey === null;
    liveKey = key;
    if (first || !liveEl || liveTimer) return;
    var wait = liveAt + LIVE_MS - now();
    if (wait > 0) liveTimer = setTimeout(flushLive, wait); else flushLive();
  }

  function flushLive() {
    liveTimer = 0;
    liveAt = now();
    var s = summary();
    if (liveEl && liveEl.textContent !== s) liveEl.textContent = s;
  }

  // ---------------------------------------------------------------- çizim döngüsü
  var cv = null, ctx0 = null, inited = false, fontsReady = false, fontsAsked = false;
  var raf = 0, timer = 0, timerAt = 0, dirty = false, lastDraw = -1e9, meterHold = 0;
  // Son çizimin neyi beklediği: eksik tablo verisi, canlı Position'lı osilatörler, popup bitişi.
  var watch = { disp: [], osc: [], key: 'base', popupUntil: 0 };

  function meterKey(S) {
    var m = meterOf(S);
    if (!m || !(m.voices > 0)) return 'base';
    return watch.osc.map(function (n) { return Math.round(num(m['pos' + n], 0) * 4096); }).join(',');
  }

  function reqFrame() {
    raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(frame) : setTimeout(frame, 16);
  }

  // En erken çizim: şimdi + delay, ama son çizimden en az FRAME_MS sonra. Bekleyen daha erken bir
  // uyanma varsa korunur; daha geç olanı öne çekilir.
  function schedule(delay) {
    if (raf) return;
    var t = now(), at = Math.max(lastDraw + FRAME_MS, t + (delay > 0 ? delay : 0));
    if (timer) {
      if (timerAt <= at) return;
      clearTimeout(timer);
      timer = 0;
    }
    if (at - t <= 1) { reqFrame(); return; }
    timerAt = at;
    timer = setTimeout(function () { timer = 0; reqFrame(); }, at - t);
  }

  function invalidate() { dirty = true; schedule(0); }

  // Yoklamanın çizim gerektirip gerektirmediği (ekranda gerçekten değişen bir şey var mı).
  function changed(S, t) {
    if (watch.popupUntil && watch.popupUntil <= t) return true;
    for (var i = 0; i < watch.disp.length; i++) if (tableDisp(watch.disp[i])) return true;
    return watch.osc.length > 0 && meterKey(S) !== watch.key;
  }

  function rewatch(t) {
    if (watch.popupUntil > t) schedule(watch.popupUntil - t + 1);
    if (watch.disp.length) schedule(DISP_RETRY_MS);
    if (watch.osc.length && (meterHold > t || watch.key !== 'base')) schedule(FRAME_MS);
  }

  function frame() {
    raf = 0;
    var S = P3.S;
    if (!S) return;
    if (!fontsReady) {   // fontlar gelince waitFonts invalidate eder; ARIA beklemez
      if (dirty) accessibility(S);
      return;
    }
    var t = now();
    if (dirty || changed(S, t)) {
      dirty = false;
      lastDraw = t;
      render();
    }
    rewatch(now());
  }

  function accessibility(S) {
    aria(S);
    announce(S);
  }

  // Anında tam çizim (döngü dışında da çağrılabilir: test, selftest).
  function render() {
    var S = P3.S;
    if (!S) return;
    var t = now();
    if (S.popup && !(S.popup.until > t)) clearPopup(S);
    watch = { disp: [], osc: [], key: 'base', popupUntil: 0 };
    if (ctx0 && cv) {
      use(ctx0);
      curFont = '';   // canvas boyutu değişince bağlam durumu (font dahil) sıfırlanır
      g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
      g.globalAlpha = 1;
      g.textBaseline = 'alphabetic';
      g.textAlign = 'left';
      g.lineCap = 'butt';
      g.lineJoin = 'round';
      g.fillStyle = C().lcdBg;
      g.fillRect(0, 0, W, H);
      try {
        pages[pageName(S)](g, S);
        use(ctx0);
        statusLayer(S);
        if (popupLayer(S, t)) watch.popupUntil = S.popup.until;
      } catch (e) {
        console.warn(`[p3] lcd çizim hatası:`, e);
      }
      if (watch.osc.length) watch.key = meterKey(S);
    }
    accessibility(S);
  }

  // İlk çizimden önce Instrument Sans beklenir (sartname-ekran §0); gelmezse FONT_WAIT_MS sonra çizilir.
  function waitFonts() {
    if (fontsAsked) return;
    fontsAsked = true;
    var fs = typeof document !== 'undefined' ? document.fonts : null;
    if (!fs || typeof fs.load !== 'function') { fontsReady = true; return; }
    var done = false;
    function ready() {
      if (done) return;
      done = true;
      fontsReady = true;
      widths = {}; widthN = 0;
      invalidate();
    }
    try {
      Promise.all([fs.load('600 13px "Instrument Sans"'), fs.load('500 26px "Instrument Sans"')]).then(ready, ready);
    } catch (e) { ready(); return; }
    setTimeout(ready, FONT_WAIT_MS);
    // Zaman aşımından sonra gelen font genişlikleri değiştirir: ölçümler yeniden yapılır.
    if (typeof fs.addEventListener === 'function') {
      fs.addEventListener('loadingdone', function () { widths = {}; widthN = 0; invalidate(); });
    }
  }

  // ---------------------------------------------------------------- olaylar
  function onState(e) {
    var head = String((e && e.path) || '*').split('.')[0];
    if (head === 'held' || head === 'strip' || head === 'popup') return;   // ekranda karşılığı yok
    invalidate();
  }

  function onIn(ev) { if (ev && ev.k === 'enc' && typeof ev.touch === 'boolean') invalidate(); }

  // Nota başlayınca canlı Position izlenir; worklet'in ilk meter mesajı biraz sonra gelir.
  function onNote(e) {
    if (!e || !e.on) return;
    meterHold = now() + METER_HOLD_MS;
    if (watch.osc.length) schedule(FRAME_MS);
  }

  // Canvas'ın arka tamponunu P3.dev.align() kurar; cihaz modülü yoksa (bağımsız kullanım) burada.
  function sizeBuffer() {
    if (!cv || typeof cv.getBoundingClientRect !== 'function') return;
    var r = cv.getBoundingClientRect(), dpr = Math.min(2, (typeof window.devicePixelRatio === 'number' && window.devicePixelRatio) || 1);
    if (!(r.width > 0 && r.height > 0)) return;
    var bw = Math.round(r.width * dpr), bh = Math.round(r.height * dpr);
    if (cv.width !== bw) cv.width = bw;
    if (cv.height !== bh) cv.height = bh;
  }

  function init(canvas) {
    var doc = typeof document !== 'undefined' ? document : null;
    cv = canvas || (doc ? doc.getElementById('p3LcdCanvas') : null);
    ctx0 = cv && typeof cv.getContext === 'function' ? cv.getContext('2d') : null;
    liveEl = doc ? doc.getElementById('p3LcdLive') : null;
    if (!(P3.dev && typeof P3.dev.align === 'function')) sizeBuffer();
    if (!inited) {
      inited = true;
      var bus = P3.bus;
      bus.on('state', onState);
      bus.on('in', onIn);
      bus.on('note', onNote);
      bus.on('restore', function () { clearPopup(P3.S); invalidate(); });
      ['layout', 'lang', 'transport', 'drums', 'overlay', 'mode'].forEach(function (ty) { bus.on(ty, invalidate); });
      waitFonts();
    }
    invalidate();
    return P3.lcd;
  }

  P3.lcd = {
    init: init,
    invalidate: invalidate,
    popup: popup,
    pages: pages,
    summary: function () { return summary(P3.S); },
    render: render,
    filterResponse: filterResponse,
    learnChapterAt: learnChapterAt,
    text: {
      volume: function (S) { var p = volumeParts(S || P3.S); return p[0] + ': ' + p[1]; },
      swingTempo: function (S) { var p = swingTempoParts(S || P3.S); return p[0] + ': ' + p[1]; }
    }
  };
})();
