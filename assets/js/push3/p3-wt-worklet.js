/* Push 3 Laboratuvarı — Wavetable DSP (p3-wt-worklet.js)
 *
 * registerProcessor('p3-wavetable'): iki wavetable osilatörü + sub, iki Clean SVF filtre (12/24 dB,
 * LP/HP/BP/Notch/Morph, Drive), Serial/Parallel/Split, Amp/Env2/Env3, iki LFO, 13 kaynaklı matris,
 * Mod Time/Amt, unison (6 mod), Poly/Mono + Glide, voice stealing. Sözleşme: docs/push3/README.md §G7,
 * sartname-ses-motoru.md §1, §4–§10, dogrulanmis-dsp-web.md, dogrulanmis-wavetable.md §A.
 * AudioWorkletGlobalScope'ta çalışır (class/const serbest; DOM ve P3 yok). Tablolar bu scope'taki global
 * Map'te durur; aynı AudioContext'teki bütün node'lar paylaşır.
 *
 * Gerçek zaman kuralları: process() bellek ayırmaz (tamponlar kurucuda, blok üst sınırı 2048);
 * blok boyu her çağrıda outputs[0][0].length; zamanlı olaylar bloğu alt bloklara bölerek örnek doğruluğunda
 * uygulanır, alt bloklar 32 örneklik kontrol dilimleriyle işlenir; dilimler arasında doğrusal rampa;
 * her blok sonunda filtre durumları temizlenir (denormal/NaN); process() her zaman true döner.
 *
 * Protokol (ana thread → worklet; zamanlar ctx saniyesi, `at` yoksa/geçmişteyse hemen):
 *   {t:'init', params:[{k,min,max,curve,mod}], def, mods:{k:{srcIdx:amt}}, bpm, profile}   (ilk mesaj)
 *   {t:'p', i:Uint16Array, v:Float32Array}  gerçek birimler, indeksler init'teki params sırası
 *   {t:'m', tgt:k, src, amt}  {t:'on', id, n, v, at}  {t:'off', id, at}  {t:'x', id, bend, slide, press, at}
 *   {t:'pb'|'mw'|'press', v, at}  {t:'tempo', bpm}  {t:'tab', osc:1|2, id}  {t:'tdata', id, F, levels, buf}
 *   {t:'drop', id}  {t:'panic'}  {t:'profile', p, cap?}
 * Worklet → ana thread: {t:'meter', voices, cpu, pos1, pos2, l, r} (12 blokta bir), {t:'need', id}.
 *
 * SAPMA/EKLEME (sözleşmede olmayan ya da belirsiz olan yerler):
 * - İç parametre düzeni sartname §2 sırasıdır ama ana thread'in indeksleri 'init'teki adlarla (k) eşlenir;
 *   bilinmeyen adlar yok sayılır, init'te olmayan adlar buradaki varsayılanlarla çalışır. 'init' ve 'tdata'
 *   onmessage içinde doğrudan işlenir (yapısal, zamansız); 'init' gelmeden 'p' indeksleri iç düzen sayılır.
 * - 'p' kuyruğa değil, önceden ayrılmış bir ara belleğe yazılır (son değer kazanır, taşma olmaz); blok
 *   başında uygulanır. Zamanlı olaylar kuyruğu halka değil zamana göre sıralı tutulur, çünkü ileri tarihli
 *   (sequencer) ve anlık olaylar karışık gelir. 'panic' bekleyen bütün olayları da siler.
 * - Nota id'si sayı ya da string olabilir; string'ler onmessage'da negatif tamsayılara eşlenir.
 * - {t:'profile', p, cap}: opsiyonel cap = bu track'in ses tavanı (README A9 toplam ses bütçesi için).
 *   processorOptions.maxVoices da aynı tavandır (yoksa 16); Poly Voices 16 yalnız tavan 16 iken çalışır.
 *   Kuyruk slotu sayısı sabit 4'tür (spare yok sayılır). Etkin profil: taban 'eco' değilse Hi-Quality
 *   parametresi açıkken 'hq'.
 * - Çıkış sınırlayıcısı: tanh(1.2x)/1.2 yerine 0.7'nin altında tam doğrusal, üstünde tanh diz. tanh her
 *   seviyede 3. harmonik üretir (−35 dBFS sinüste ≈ −88 dB) ve Sub Tone %0 ölçütünü (< −90 dB) bozar.
 * - Bandpass çıkışı k·band (tepe 0 dB; Morph'taki normalizasyonla aynı), yüksek rezonansta patlama olmasın.
 * - Parallel'de kapalı filtre bypass olduğundan çıkış 0.5·(F1(x) + x) olur (kural birebir uygulandı).
 * - Aynı notaya yeniden basınca eski ses 3 ms'de söner, yeni ses zarflarına eskisinin o anki
 *   seviyesinden başlar (tık yok, seviye çukuru yok). Trigger döngüsünde note-off yok sayılır (VARSAYIM).
 * - Unison ses sayısı ve modu note-on'da sabitlenir (VARSAYIM); Amount canlıdır. eco: ≤4 ses ve toplam
 *   ≤48 unison-osilatör, hq/std: ≤8 ve ≤128. Shimmer/Noise'a ±0.02·A pozisyon titreşimi eklendi (araştırma §8.2).
 * - Classic PW = max(0, fx1); Modern Warp çift yönlü (d = 0.5 − 0.49·fx1), mip çarpanı 0.5/min(d, 1−d).
 *   EKLEME: PW/Warp sıkıştırması ve Fold kazancı perdeye göre tavanlanır (sıkıştırılmış dalganın temeli
 *   0.45·fs'i aşmasın); yalnız üst oktavlarda devreye girer ve en kaba katlanmayı önler (VARSAYIM).
 *   Fold %0'da tamamen bypass edilir (ADAA'nın yarım örnek gecikmesi yalnız katlama açıkken).
 * - Çarpımsal hedefte negatif miktar kaynağı ters çevirir (1 − u). Çift yönlü kaynaklar (LFO, Key, PB,
 *   Random, Note PB) çarpımsal hedefte (x+1)/2 ile 0..1'e taşınır.
 * - Sub perdesi sesin perdesini izler (nota + Transpose + PITCH), Osc 1'in Transp/Det'ini izlemez (VARSAYIM).
 *   Sub tablosu: Worker'dan tdata id 'sub' geldiyse o kullanılır; yoksa burada üretilir (16 Tone karesi,
 *   8 mip seviyesi, en çok 255. harmonik; üstü −150 dB'in altında). Sub'ın {t:'need'} isteği yoktur.
 * - Mono'da Glide legato'da ve release sırasında yeniden basışta da uygulanır; legato'da velocity güncellenir.
 * - Tablo değişimi anlıktır (Vital'deki 7 ms geçiş Faz 2). Kayıp tablo için {t:'need'} bir kez gönderilir,
 *   o osilatör tablo gelene kadar sessizdir.
 * - Filtre devreleri: Faz 1'de OSR/MS2/SMP/PRD Clean gibi çalışır (Drive kuralı yine devre ≠ Clean'e bakar).
 * - meter.l/r: son meter'dan beri çıkış tepe değeri; cpu: 32 bloğun işlem süresi / gerçek süre.
 */
'use strict';

// ------------------------------------------------------------------ sabitler
const CTRL = 32;                  // kontrol dilimi: Hi-Quality kapalı Wavetable gibi 32 örnek
const MAXB = 2048;                // blok üst sınırı (renderSizeHint 64..2048)
const MAXPOLY = 16, SPARE = 4;    // en çok 16 ses + 4 kuyruk (sönme) slotu
const UMAX = 8, NSRC = 13;
const QCAP = 1024, ES = 6;        // olay kuyruğu: 1024 × [tip, mutlak kare, a, b, c, d]
const FADE_S = 0.003;             // çalınan ses 3 ms'de söner
const VOICE_GAIN = 0.25;
const KNEE = 0.7;                 // sınırlayıcı bu seviyenin altında tam doğrusal
const METER_EVERY = 12, CPU_EVERY = 32;
const POLY_VALUES = [2, 3, 4, 5, 6, 7, 8, 16];
// LFO S. Rate adımları (bar): ENUMS.SRate ile aynı sıra. VARSAYIM: 22 adım, 15 = 1 bar.
const SYNC_BARS = [1 / 64, 1 / 48, 1 / 32, 1 / 24, 1 / 16, 1 / 12, 1 / 8, 1 / 6, 3 / 16, 1 / 4, 5 / 16, 1 / 3,
  3 / 8, 1 / 2, 3 / 4, 1, 1.5, 2, 3, 4, 6, 8];
const PR_HQ = 0, PR_STD = 1, PR_ECO = 2;
const UNI_MAX = [8, 8, 4], UNI_TOTAL = [128, 128, 48];

const EV_ON = 1, EV_OFF = 2, EV_X = 3, EV_PB = 4, EV_MW = 5, EV_PRESS = 6, EV_TEMPO = 7, EV_TAB = 8,
  EV_MOD = 9, EV_PANIC = 10, EV_PROFILE = 11;

// Matris kaynakları (sartname §5 sırası = P3.wtp.SOURCES)
const S_AMP = 0, S_ENV2 = 1, S_ENV3 = 2, S_LFO1 = 3, S_LFO2 = 4, S_VEL = 5, S_KEY = 6, S_PB = 7,
  S_PRESS = 8, S_MW = 9, S_RND = 10, S_SLIDE = 11, S_NPB = 12;
const BIPOLAR = new Uint8Array([0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1]);

// ------------------------------------------------------------------ parametre düzeni
// Buradaki min/max/def yalnız 'init' gelmeden önce ya da init'te eksik kalan adlar için kullanılır.
const C_LIN = 0, C_EXP = 1, C_TIME = 2, C_GAIN = 3, C_STEP = 4;
function curveCode(c) { return c === 'exp' ? C_EXP : c === 'time' ? C_TIME : c === 'gain' ? C_GAIN : c === 'lin' ? C_LIN : C_STEP; }
function P(k, min, max, def, curve, mod) { return { k: k, min: min, max: max, def: def, c: curveCode(curve), mod: mod || 0 }; }
function OSC(p, on, fx) {
  return [P(p + 'On', 0, 1, on, 'bool'), P(p + 'Cat', 0, 6, 0, 'enum'), P(p + 'Tab', 0, 15, 0, 'enum'),
    P(p + 'Pos', 0, 1, 0, 'lin', 1), P(p + 'Transp', -24, 24, 0, 'int', 1), P(p + 'Det', -0.5, 0.5, 0, 'lin', 1),
    P(p + 'Fx', 0, 3, fx, 'enum'), P(p + 'Fx1', -1, 1, 0, 'lin', 1), P(p + 'Fx2', 0, 1, 0, 'lin', 1),
    P(p + 'Pan', -1, 1, 0, 'lin', 1), P(p + 'Gain', 0, 1, 1, 'gain', 1)];
}
function FLT(p, on, type, freq) {
  return [P(p + 'On', 0, 1, on, 'bool'), P(p + 'Type', 0, 4, type, 'enum'), P(p + 'Circ', 0, 4, 0, 'enum'),
    P(p + 'CircB', 0, 1, 0, 'enum'), P(p + 'Slope', 0, 1, 0, 'enum'), P(p + 'Freq', 20, 20480, freq, 'exp', 1),
    P(p + 'Res', 0, 1.25, 0, 'lin', 1), P(p + 'Drive', 0, 24, 0, 'lin', 1), P(p + 'Morph', 0, 1, 0, 'lin', 1)];
}
function ENV(p, amp) {
  return [P(p + 'A', 0, 20, 0.001, 'time', 1), P(p + 'D', 0.0015, 20, 0.6, 'time', 1),
    amp ? P(p + 'S', 0, 1, 0.5011876, 'gain', 2) : P(p + 'S', 0, 1, 0.5, 'lin', 1), P(p + 'R', 0.0015, 20, 0.6, 'time', 1),
    P(p + 'ASl', -1, 1, 0, 'lin'), P(p + 'DSl', -1, 1, 0.5, 'lin'), P(p + 'RSl', -1, 1, 0.5, 'lin'), P(p + 'Loop', 0, 2, 0, 'enum')]
    .concat(amp ? [] : [P(p + 'Init', 0, 1, 0, 'lin', 2), P(p + 'Peak', 0, 1, 1, 'lin', 1), P(p + 'Fin', 0, 1, 0, 'lin', 1)]);
}
function LFO(p) {
  return [P(p + 'Shape', 0, 4, 0, 'enum'), P(p + 'Shp', -1, 1, 0, 'lin', 1), P(p + 'Amt', 0, 1, 1, 'lin', 2),
    P(p + 'Phase', 0, 360, 0, 'lin'), P(p + 'Sync', 0, 1, 0, 'enum'), P(p + 'Rate', 0.01, 30, 1, 'exp', 1),
    P(p + 'SRate', 0, 21, 15, 'enum'), P(p + 'Att', 0, 20, 0, 'time', 1), P(p + 'Retrig', 0, 1, 1, 'bool')];
}
const DEFS = [].concat(OSC('o1', 1, 3), OSC('o2', 0, 0),
  [P('subOn', 0, 1, 0, 'bool'), P('subGain', 0, 1, 0.5011875, 'gain', 1), P('subTone', 0, 1, 0, 'lin', 1), P('subOct', 0, 2, 1, 'enum')],
  FLT('f1', 1, 0, 20480), FLT('f2', 0, 1, 20), [P('route', 0, 2, 0, 'enum')],
  ENV('amp', 1), ENV('e2', 0), ENV('e3', 0), LFO('l1'), LFO('l2'),
  [P('modTime', -1, 1, 0, 'lin', 1), P('modAmt', 0, 2, 1, 'lin', 2), P('transp', -48, 48, 0, 'int', 1),
   P('glide', 0, 20, 0, 'time'), P('vol', 0, 1, 0.3548134, 'gain', 2), P('mono', 0, 1, 0, 'bool'),
   P('polyIdx', 0, 7, 6, 'enum'), P('uniMode', 0, 6, 0, 'enum'), P('uniVoices', 2, 8, 3, 'int'),
   P('uniAmt', 0, 1, 0.3, 'lin', 2), P('hq', 0, 1, 0, 'bool')],
  [P('AMP', 0, 1, 1, 'lin', 2), P('PITCH', -48, 48, 0, 'lin', 1)]);   // yalnız matris hedefi
const NP = DEFS.length;
const PIX = Object.create(null);
DEFS.forEach(function (d, i) { PIX[d.k] = i; });

// Blok başları + blok içi ofsetler (iç düzen sabit, sıcak döngüler sayısal indeksle okur)
const O1 = PIX.o1On, O2 = PIX.o2On;
const O_ON = 0, O_POS = 3, O_TR = 4, O_DET = 5, O_FX = 6, O_FX1 = 7, O_FX2 = 8, O_PAN = 9, O_GAIN = 10;
const F1 = PIX.f1On, F2 = PIX.f2On;
const F_ON = 0, F_TYPE = 1, F_CIRC = 2, F_CIRCB = 3, F_SLOPE = 4, F_FREQ = 5, F_RES = 6, F_DRIVE = 7, F_MORPH = 8;
const ENVB = [PIX.ampA, PIX.e2A, PIX.e3A];
const E_A = 0, E_D = 1, E_S = 2, E_R = 3, E_ASL = 4, E_DSL = 5, E_RSL = 6, E_LOOP = 7, E_INIT = 8, E_PEAK = 9, E_FIN = 10;
const LFOB = [PIX.l1Shape, PIX.l2Shape];
const L_SHAPE = 0, L_SHP = 1, L_AMT = 2, L_PHASE = 3, L_SYNC = 4, L_RATE = 5, L_SRATE = 6, L_ATT = 7, L_RETRIG = 8;
const P_SUBON = PIX.subOn, P_SUBGAIN = PIX.subGain, P_SUBTONE = PIX.subTone, P_SUBOCT = PIX.subOct,
  P_ROUTE = PIX.route, P_MODTIME = PIX.modTime, P_MODAMT = PIX.modAmt, P_TRANSP = PIX.transp,
  P_GLIDE = PIX.glide, P_VOL = PIX.vol, P_MONO = PIX.mono, P_POLY = PIX.polyIdx, P_UMODE = PIX.uniMode,
  P_UVOICES = PIX.uniVoices, P_UAMT = PIX.uniAmt, P_HQ = PIX.hq, P_AMP = PIX.AMP, P_PITCH = PIX.PITCH;
// Perde hedefleri normalize uzayda değil yarım tonla modüle edilir (sartname §5).
const PITCH_SCALE = new Float64Array(NP);   // 0 = normalize uzayda modüle edilir
PITCH_SCALE[P_PITCH] = 48;
PITCH_SCALE[O1 + O_TR] = 24; PITCH_SCALE[O1 + O_DET] = 24;
PITCH_SCALE[O2 + O_TR] = 24; PITCH_SCALE[O2 + O_DET] = 24;
const MORPH_IDX = [0, 1, 2, 3, 0];          // Morph sırası LP → BP → HP → Notch → LP (0 LP, 1 BP, 2 HP, 3 Notch)

// Başlangıç matrisi (Wavetable.adv; P3.wtp.DEFAULT_MODS ile aynı). 'init' gelince onunla değişir.
const DEFAULT_MODS = { o1Pos: { 9: 1, 11: 0.33 }, o1Fx1: { 8: 0.07 }, AMP: { 5: 0.5 }, PITCH: { 7: 2 / 48, 12: 1 } };

// ------------------------------------------------------------------ yardımcılar
function clamp(x, a, b) { return x > a ? (x < b ? x : b) : a; }   // NaN → a
function frac(x) { x -= Math.floor(x); return x < 1 ? x : 0; }    // −1e−17 gibi değerler 1.0'a yuvarlanmasın
function mtof(p) { return 440 * Math.pow(2, (p - 69) / 12); }
function toNorm(c, lo, hi, v) {
  switch (c) {
    case C_EXP: return v > lo ? clamp(Math.log(v / lo) / Math.log(hi / lo), 0, 1) : 0;
    case C_TIME: return v > lo ? clamp(Math.cbrt((v - lo) / (hi - lo)), 0, 1) : 0;
    case C_GAIN: return v > 0 ? clamp((20 * Math.log10(v) + 70) / 70, 0, 1) : 0;
    default: return clamp((v - lo) / (hi - lo), 0, 1);
  }
}
function fromNorm(c, lo, hi, n) {
  n = clamp(n, 0, 1);
  switch (c) {
    case C_EXP: return lo * Math.pow(hi / lo, n);
    case C_TIME: return lo + (hi - lo) * n * n * n;
    case C_GAIN: return n > 0 ? Math.pow(10, (70 * n - 70) / 20) : 0;
    default: return lo + (hi - lo) * n;
  }
}
// P3.wtp.lfoShape ile aynı formüller (UI çizimi ve ses aynı şekli versin). u: Random için −1..1 S&H değeri.
function skew(ph, s) { return s >= 0 ? Math.pow(ph, 1 + 3 * s) : 1 - Math.pow(1 - ph, 1 - 3 * s); }
function lfoShape(shape, s, ph, u) {
  switch (shape) {
    case 1: {
      const d = 0.5 + 0.49 * s, q = frac(ph + d / 2);
      return q < d ? 2 * q / d - 1 : 1 - 2 * (q - d) / (1 - d);
    }
    case 2: return 1 - 2 * skew(ph, s);
    case 3: return ph < 0.5 + 0.49 * s ? 1 : -1;
    case 4: return u;
    default: return Math.sin(2 * Math.PI * skew(ph, s));
  }
}

// ------------------------------------------------------------------ tablolar
// id → { F, nL, len, H, base, stride, fmx, buf }. fmx[L] relaxed (2/3·fs/H), fmx[nL+L] strict (0.5·fs/H).
// Kare yerleşimi [s(len−1) | s0 … s(len−1) | s0, s1]; karenin s0'ı = base[L] + f·stride[L] + 1.
const TABLES = new Map();
let SUB = null;

function makeTable(F, levels, buf) {
  const nL = levels ? levels.length : 0;
  if (!(F >= 1) || !nL || !buf) return null;
  const t = { F: F | 0, nL: nL, len: new Int32Array(nL), H: new Float64Array(nL), base: new Int32Array(nL),
    stride: new Int32Array(nL), fmx: new Float64Array(2 * nL), buf: buf };
  for (let L = 0; L < nL; L++) {
    const lv = levels[L], len = lv.len | 0, H = Math.max(1, +lv.H || 1), base = lv.base | 0;
    if (len < 4 || base < 0 || base + t.F * (len + 3) > buf.length) return null;
    t.len[L] = len; t.H[L] = H; t.base[L] = base + 1; t.stride[L] = len + 3;
    t.fmx[L] = (2 / 3) * sampleRate / H;
    t.fmx[nL + L] = 0.5 * sampleRate / H;
  }
  return t;
}

// Sub: tanh(k·sin)/tanh(k), k = 10·tone; Tone %0 saf sinüs (sartname §6). Tek harmonikler e^(−0.156·h)
// hızında söndüğü için (k = 10) 255. harmoniğin üstü −150 dB'in altındadır ve kesilir.
function buildSub() {
  const F = 16, N = 2048, HM = 255, NL = 8, PEAK = 0.9;
  const sn = new Float64Array(N);
  for (let i = 0; i < N; i++) sn[i] = Math.sin(2 * Math.PI * i / N);
  const co = new Float64Array(F * (HM + 1)), y = new Float64Array(N);
  co[1] = 1;
  for (let f = 1; f < F; f++) {
    const k = 10 * f / (F - 1), tk = Math.tanh(k);
    for (let i = 0; i < N; i++) y[i] = Math.tanh(k * sn[i]) / tk;
    for (let h = 1; h <= HM; h += 2) {
      let acc = 0;
      for (let i = 0, j = 0; i < N; i++, j = (j + h) & (N - 1)) acc += y[i] * sn[j];
      co[f * (HM + 1) + h] = 2 * acc / N;
    }
  }
  const levels = [];
  let total = 0;
  for (let L = 0; L < NL; L++) {
    const len = Math.max(512, N >> L);
    levels.push({ len: len, H: Math.max(1, HM >> L), base: total });
    total += F * (len + 3);
  }
  const buf = new Float32Array(total), w = new Float64Array(N);
  for (let f = 0; f < F; f++) {
    let gain = 1;
    for (let L = 0; L < NL; L++) {
      const len = levels[L].len, H = levels[L].H, st = N / len;
      w.fill(0, 0, len);
      for (let h = 1; h <= H; h += 2) {
        const c = co[f * (HM + 1) + h];
        if (c === 0) continue;
        for (let i = 0, j = 0; i < len; i++, j = (j + h * st) & (N - 1)) w[i] += c * sn[j];
      }
      if (L === 0) {   // tepe normalizasyonu L0'dan, bütün seviyelere aynı katsayı
        let pk = 0;
        for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(w[i]));
        gain = pk > 0 ? PEAK / pk : 1;
      }
      const o = levels[L].base + f * (len + 3);
      buf[o] = w[len - 1] * gain;
      for (let i = 0; i < len; i++) buf[o + 1 + i] = w[i] * gain;
      buf[o + 1 + len] = w[0] * gain;
      buf[o + 2 + len] = w[1] * gain;
    }
  }
  return makeTable(F, levels, buf);
}

// Kare içi okuma: doğrusal (std/eco) ya da Niemitalo 4 noktalı Hermite (hq). b = karenin s0 indeksi.
function rd(T, b, len, ph, herm) {
  const x = ph * len, i = x | 0, f = x - i, k = b + i;
  if (!herm) { const a = T[k]; return a + (T[k + 1] - a) * f; }
  const ym = T[k - 1], y0 = T[k], y1 = T[k + 1], y2 = T[k + 2];
  const c1 = 0.5 * (y1 - ym), c2 = ym - 2.5 * y0 + 2 * y1 - 0.5 * y2, c3 = 0.5 * (y2 - ym) + 1.5 * (y0 - y1);
  return ((c3 * f + c2) * f + c1) * f + y0;
}
// Blok okuyucu: yb[i] = tablo(faz qb[i]); Position (kareler arası doğrusal) ve mip geçişi (L ile L+1
// arası w) dilim boyunca rampalı: başlangıç ve adımlar c.pos/c.dp/c.w/c.dw alanlarında. Örnek başına çağrı
// yerine blok halinde okunur ve double'lar argümanla geçmez: V8'de satır içine alınmayan çağrıya double
// argüman ya da dönüş değeri HeapNumber ayırır (process() içinde bellek ayırma yok kuralı).
function readBlock(c, qb, n, yb) {
  const T = c.T, F1 = c.F1, herm = c.herm, b0 = c.b0, s0 = c.s0, n0 = c.n0, b1 = c.b1, s1 = c.s1, n1 = c.n1;
  const dp = c.dp, dw = c.dw;
  let pos = c.pos, w = c.w;
  for (let i = 0; i < n; i++) {
    pos += dp; w += dw;
    const x = pos * F1, fi = x | 0, t = x - fi, fj = fi < F1 ? fi + 1 : fi, ph = qb[i];
    let y = rd(T, b0 + fi * s0, n0, ph, herm);
    if (t > 0) y += t * (rd(T, b0 + fj * s0, n0, ph, herm) - y);
    if (w > 0) {
      let z = rd(T, b1 + fi * s1, n1, ph, herm);
      if (t > 0) z += t * (rd(T, b1 + fj * s1, n1, ph, herm) - z);
      y += w * (z - y);
    }
    yb[i] = y;
  }
}
// Tek noktada okuma (yalnız dilim başında: Sync sıçraması). Değer c.y'ye yazılır.
function readAt(c, pos, w, ph) {
  const x = pos * c.F1, fi = x | 0, t = x - fi, fj = fi < c.F1 ? fi + 1 : fi;
  let y = rd(c.T, c.b0 + fi * c.s0, c.n0, ph, c.herm);
  if (t > 0) y += t * (rd(c.T, c.b0 + fj * c.s0, c.n0, ph, c.herm) - y);
  if (w > 0) {
    let z = rd(c.T, c.b1 + fi * c.s1, c.n1, ph, c.herm);
    if (t > 0) z += t * (rd(c.T, c.b1 + fj * c.s1, c.n1, ph, c.herm) - z);
    y += w * (z - y);
  }
  c.y = y;
}
// Mip seçimi (sartname §4): f ≤ fmax_L olan ilk seviye; üst yarım oktavda L+1'e geçiş ağırlığı.
function mipSel(tb, f, strict, out) {
  const nL = tb.nL, fm = tb.fmx, o = strict ? nL : 0;
  let L = 0;
  while (L < nL - 1 && f > fm[o + L]) L++;
  let w = 0;
  if (L < nL - 1 && f > 0) w = clamp((Math.log2(f / fm[o + L]) + 0.5) * 2, 0, 1);
  out.L = L; out.w = w;
}
function setReadCtx(c, tb, L, herm) {
  const L1 = L + 1 < tb.nL ? L + 1 : L;
  c.T = tb.buf; c.F1 = tb.F - 1; c.herm = herm;
  c.b0 = tb.base[L]; c.s0 = tb.stride[L]; c.n0 = tb.len[L];
  c.b1 = tb.base[L1]; c.s1 = tb.stride[L1]; c.n1 = tb.len[L1];
}
function warp(ph, d) { return ph < d ? 0.5 * ph / d : 0.5 + 0.5 * (ph - d) / (1 - d); }
// Sinüs katlayıcı, birinci derece antitürev (ADAA1, sartname §6), dilim üzerinde yerinde.
// st[j..j+2] = x₋₁, u₋₁, F1(u₋₁); u₋₁ NaN ise katlama yeni açılmıştır. Kuru yol x₋½ = (x + x₋₁)/2 ile
// ADAA'nın yarım örnek gecikmesine hizalanır. m = 2 (hq): yb'de örnek başına iki alt örnek, ortalaması alınır.
function foldBlock(os, j, yb, n, m) {
  const st = os.fz, dB = (os.B1 - os.B0) / n, gcap = os.gcap;
  let xm = st[j], um = st[j + 1], fm = st[j + 2], B = os.B0;
  for (let i = 0; i < n; i++) {
    B += dB;
    const gF = Math.min(1 + 7 * B, gcap), mix = B <= 0 ? 0 : B < 0.1 ? 10 * B : 1;
    let acc = 0;
    for (let k = 0; k < m; k++) {
      const x = yb[i * m + k], u = gF * x, f = -0.6366197723675814 * Math.cos(1.5707963267948966 * u);
      if (um !== um) { xm = x; um = u; fm = f; }
      const du = u - um;
      const y = du > 1e-5 || du < -1e-5 ? (f - fm) / du : Math.sin(0.7853981633974483 * (u + um));
      const half = 0.5 * (x + xm);
      acc += half + mix * (y - half);
      xm = x; um = u; fm = f;
    }
    yb[i] = m === 1 ? acc : 0.5 * acc;
  }
  st[j] = xm; st[j + 1] = um; st[j + 2] = fm;
}
function profCode(p) { return p === 'hq' || p === PR_HQ ? PR_HQ : p === 'eco' || p === PR_ECO ? PR_ECO : PR_STD; }
function num(x) { return x == null ? NaN : +x; }

// ------------------------------------------------------------------ zarf
// Segment başında başlangıç değeri (a) sabitlenir; x doğrusal zaman ilerlemesi, değer a + (b − a)·eğri(x).
// Eğri sartname §8: s>0 başta hızlı, s<0 önce düz, 0 doğrusal. Süre, hedef ve eğim her dilimde tazelenir
// (x korunur), böylece Mod Time ve Sustain modülasyonu segmenti kesmeden etkiler.
const ST_IDLE = 0, ST_A = 1, ST_D = 2, ST_S = 3, ST_R = 4;
function makeEnv() {
  return { stg: ST_IDLE, x: 0, v: 0, a: 0, b: 0, e: 1, sl: 0, dx: 0, held: false,
    tA: 0.001, tD: 0.6, tR: 0.6, sA: 0, sD: 0.5, sR: 0.5, loop: 0, pk: 1, sus: 0.5, fin: 0, ini: 0 };
}
function envSync(E) {
  let T;
  switch (E.stg) {
    case ST_A: E.b = E.pk; E.sl = E.sA; T = E.tA; break;
    case ST_D: E.b = E.sus; E.sl = E.sD; T = E.tD; break;
    case ST_R: E.b = E.fin; E.sl = E.sR; T = E.tR; break;
    default: return;
  }
  E.e = 1 + 4 * Math.abs(E.sl);
  E.dx = T > 0 ? 1 / (T * sampleRate) : 2;
}
function envSeg(E, stg) { E.stg = stg; E.x = 0; E.a = E.v; envSync(E); }
// k örnek ilerletir (Amp: her örnekte k = 1; Env2/3: dilim başına k = dilim boyu). Sonuç E.v'dedir
// (değer döndürülmez: satır içine alınmayan çağrıda double dönüşü V8'de bellek ayırır).
function envTick(E, k) {
  const st = E.stg;
  if (st === ST_S) { E.v = E.sus; return; }
  if (st === ST_IDLE) return;
  const x = E.x + E.dx * k;
  if (x >= 1) {
    E.v = E.b;
    if (st === ST_A) envSeg(E, ST_D);
    else if (st === ST_D) { if (E.loop === 0) { E.stg = ST_S; E.v = E.sus; } else envSeg(E, ST_R); }   // Trigger/Loop: D → R
    else if (E.loop === 2 && E.held) envSeg(E, ST_A);                                                  // Loop: tutuldukça başa
    else E.stg = ST_IDLE;
    return;
  }
  E.x = x;
  const s = E.sl;
  E.v = E.a + (E.b - E.a) * (s > 0 ? 1 - Math.pow(1 - x, E.e) : s < 0 ? Math.pow(x, E.e) : x);
}
// Note-off: o anki değerden Release. Trigger döngüsü note-off'u yok sayar, segmentlerini tamamlar (VARSAYIM).
function envRelease(E) {
  E.held = false;
  if (E.stg !== ST_IDLE && E.stg !== ST_R && E.loop !== 1) envSeg(E, ST_R);
}

// ------------------------------------------------------------------ ses nesneleri (kurucuda bir kez)
// Argüman yerine alanla taşınan double'lar (pc, ua, pstep, okuma bağlamının pos/dp/w/dw/y'si) ondalıklı
// başlatılır: V8 alanı baştan double temsille kurar, ilk ses bloklarında harita değişimi olmaz.
// Anlamlı değerler note-on'da ve kontrol diliminde yazılır.
function makeCtx() { return { T: null, F1: 0, herm: false, b0: 0, s0: 0, n0: 1, b1: 0, s1: 0, n1: 1, y: 0.5, pos: 0.5, dp: 0.5, w: 0.5, dw: 0.5 }; }
function makeOsc() {
  const f = function () { return new Float64Array(UMAX); };
  return {
    on: false, tb: null, fx: 0, n: 1, mode: 0,
    ph: f(), pm: f(), fz: new Float64Array(3 * UMAX),    // taşıyıcı ve FM modülatör fazları, Fold ADAA durumu
    e: f(), sp: f(), ru: f(), rv: f(),                   // unison yayılımı, pan, Random Note sayıları
    jt: f(), jc: f(), jn: f(),                           // Shimmer/Noise: hedef, o anki değer, kalan örnek
    inc0: f(), inc1: f(), pos0: f(), pos1: f(), gl0: f(), gl1: f(), gr0: f(), gr1: f(),
    dl: f(),                                             // Sync'te master sarmasındaki sıçrama (polyBLEP)
    L: 0, w0: 0, w1: 0, A0: 0, A1: 0, B0: 0, B1: 0, gcap: 8, c: makeCtx()
  };
}
function makeSub() { return { on: false, tb: null, ph: 0, inc0: 0, inc1: 0, pos0: 0, pos1: 0, g0: 0, g1: 0, L: 0, w0: 0, w1: 0, c: makeCtx() }; }
// c: [a1, a2, a3, k, b1, b2, b3, k2, mV2, mK, mX, gd] — iki kademenin katsayıları, çıkış karışımı, drive kazancı
function makeFlt() { return { on: false, type: -1, s24: false, drv: false, s: new Float64Array(8), c0: new Float64Array(12), c1: new Float64Array(12) }; }
function makeVoice() {
  return {
    st: 0,                 // 0 boş, 1 çalıyor, 2 sönüyor (çalınan ses; kuyruk slotu)
    id: -1, note: 60, vel: 100, held: false, age: 0, fade: 0, fadeN: 1,
    fresh: false, retrig: false, from: new Float64Array(3),   // ilk dilimde zarfların başlangıç değerleri
    pitch: 60, ptgt: 60, pstep: 0.5, pc: 60.5, ua: 0.5,       // Glide (yarım ton, doğrusal); dilimin perdesi, Unison Amount
    src: new Float64Array(NSRC), nb: 0, slide: 0, press: -1, rnd: 0,
    ev: new Float64Array(NP),                                 // bu dilimin modüle edilmiş değerleri
    env: [makeEnv(), makeEnv(), makeEnv()],
    lph: new Float64Array(2), lu: new Float64Array(2), lo: new Float64Array(2), lt: 0,
    o: [makeOsc(), makeOsc()], sub: makeSub(), fl: [makeFlt(), makeFlt()],
    g0: 0, g1: 0
  };
}

// Clean SVF (Simper, sartname §7), stereo, yerinde. 24 dB'de ikinci kademe (Butterworth Q 0.5412 / 1.3066+).
// Çıkış y = mV2·low + mK·(k·band) + mX·x; katsayılar dilim boyunca doğrusal rampayla geçer.
function runFlt(F, bL, bR, n) {
  const c0 = F.c0, c1 = F.c1, s = F.s, inv = 1 / n, s24 = F.s24, drv = F.drv;
  let a1 = c0[0], a2 = c0[1], a3 = c0[2], k = c0[3], b1 = c0[4], b2 = c0[5], b3 = c0[6], k2 = c0[7];
  let mv = c0[8], mk = c0[9], mx = c0[10], gd = c0[11];
  const da1 = (c1[0] - a1) * inv, da2 = (c1[1] - a2) * inv, da3 = (c1[2] - a3) * inv, dk = (c1[3] - k) * inv;
  const db1 = (c1[4] - b1) * inv, db2 = (c1[5] - b2) * inv, db3 = (c1[6] - b3) * inv, dk2 = (c1[7] - k2) * inv;
  const dmv = (c1[8] - mv) * inv, dmk = (c1[9] - mk) * inv, dmx = (c1[10] - mx) * inv, dgd = (c1[11] - gd) * inv;
  let i1L = s[0], i2L = s[1], j1L = s[2], j2L = s[3], i1R = s[4], i2R = s[5], j1R = s[6], j2R = s[7];
  let v1, v2, v3;
  for (let i = 0; i < n; i++) {
    a1 += da1; a2 += da2; a3 += da3; k += dk; mv += dmv; mk += dmk; mx += dmx;
    let xl = bL[i], xr = bR[i];
    if (drv) { gd += dgd; xl = Math.tanh(gd * xl); xr = Math.tanh(gd * xr); }
    v3 = xl - i2L; v1 = a1 * i1L + a2 * v3; v2 = i2L + a2 * i1L + a3 * v3;
    i1L = 2 * v1 - i1L; i2L = 2 * v2 - i2L;
    let yl = mv * v2 + mk * k * v1 + mx * xl;
    v3 = xr - i2R; v1 = a1 * i1R + a2 * v3; v2 = i2R + a2 * i1R + a3 * v3;
    i1R = 2 * v1 - i1R; i2R = 2 * v2 - i2R;
    let yr = mv * v2 + mk * k * v1 + mx * xr;
    if (s24) {
      b1 += db1; b2 += db2; b3 += db3; k2 += dk2;
      v3 = yl - j2L; v1 = b1 * j1L + b2 * v3; v2 = j2L + b2 * j1L + b3 * v3;
      j1L = 2 * v1 - j1L; j2L = 2 * v2 - j2L;
      yl = mv * v2 + mk * k2 * v1 + mx * yl;
      v3 = yr - j2R; v1 = b1 * j1R + b2 * v3; v2 = j2R + b2 * j1R + b3 * v3;
      j1R = 2 * v1 - j1R; j2R = 2 * v2 - j2R;
      yr = mv * v2 + mk * k2 * v1 + mx * yr;
    }
    if (drv) { const pg = 1 / Math.sqrt(gd); yl *= pg; yr *= pg; }   // drive → filtre → ÷√g
    bL[i] = yl; bR[i] = yr;
  }
  s[0] = i1L; s[1] = i2L; s[2] = j1L; s[3] = j2L; s[4] = i1R; s[5] = i2R; s[6] = j1R; s[7] = j2R;
}

// ------------------------------------------------------------------ işlemci
class P3Wavetable extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const po = (options && options.processorOptions) || {};
    if (!SUB) SUB = buildSub();
    // Parametreler: pv gerçek birim taban değer, pn normalize karşılığı; lo/hi/cv/md init ile güncellenir.
    this.pv = new Float64Array(NP); this.pn = new Float64Array(NP);
    this.lo = new Float64Array(NP); this.hi = new Float64Array(NP);
    this.cv = new Uint8Array(NP); this.md = new Uint8Array(NP);
    for (let i = 0; i < NP; i++) {
      const d = DEFS[i];
      this.pv[i] = d.def; this.lo[i] = d.min; this.hi[i] = d.max; this.cv[i] = d.c; this.md[i] = d.mod;
    }
    this.ps = new Float64Array(NP); this.pd = new Uint8Array(NP); this.pAny = false;   // 'p' ara belleği
    this.ext = new Int16Array(512);                // ana thread indeksi → iç indeks (−1: bilinmeyen ad)
    for (let i = 0; i < this.ext.length; i++) this.ext[i] = i < NP ? i : -1;
    this.mm = new Float64Array(NP * NSRC);         // matris: hedef × kaynak miktarı (−1..1)
    this.tl = new Int16Array(NP); this.tn = 0;     // miktarı olan hedefler
    this.setMods(DEFAULT_MODS);
    this.norms();
    // Zamanlı olaylar (mutlak kareye göre sıralı) ve string nota id'leri
    this.q = new Float64Array(QCAP * ES); this.qn = 0;
    this.ids = new Map(); this.idNext = 2;
    // Global kaynaklar, profil, tablolar
    this.pb = 0; this.mw = 0; this.press = 0; this.bpm = 120;
    this.base = profCode(po.profile);
    this.cap = clamp((po.maxVoices | 0) || MAXPOLY, 1, MAXPOLY);
    this.prof = PR_STD; this.limit = 8; this.route = 0;
    this.tabId = new Int32Array(2); this.tabRef = [null, null]; this.needSent = new Uint8Array(256);
    this.subRef = SUB;
    this.lfoFree = new Float64Array(2);
    this.seed = 0x5EED1234;
    // Ses havuzu: MAXPOLY + SPARE nesne; çalınan sesler sönerken kuyruk slotu gibi yer tutar.
    this.V = [];
    for (let i = 0; i < MAXPOLY + SPARE; i++) this.V.push(makeVoice());
    this.age = 0; this.mv = null;                  // mv: Mono sesi
    this.stk = new Float64Array(16 * 3); this.stkN = 0;   // Mono nota yığını: [id, nota, velocity]
    this.fadeN = Math.max(1, Math.round(FADE_S * sampleRate));
    // Dilim tamponları (osc1 L/R, osc2 L/R, sub) ve sağ kanal yedeği (tek kanallı çıkış olursa)
    this.bx = [];
    for (let i = 0; i < 5; i++) this.bx.push(new Float32Array(CTRL));
    this.scrR = new Float32Array(MAXB);
    this.qb = new Float64Array(2 * CTRL); this.yb = new Float64Array(2 * CTRL); this.bb = new Float64Array(CTRL);   // okuma fazı, okunan örnek (+PW kapısı), BLEP
    this.mipOut = { L: 0, w: 0 }; this.mix4 = new Float64Array(4);
    // Master: DC blocker durumu [xL, yL, xR, yR]
    this.dcR = 1 - 2 * Math.PI * 10 / sampleRate; this.dc = new Float64Array(4);
    // Ölçüm
    this.blk = 0; this.pkL = 0; this.pkR = 0; this.cpuAcc = 0; this.cpuN = 0; this.cpu = 0;
    this.meterMsg = { t: 'meter', voices: 0, cpu: 0, pos1: 0, pos2: 0, l: 0, r: 0 };
    this.needMsg = { t: 'need', id: 0 };
    this.clock = typeof performance !== 'undefined' && performance.now ? performance : Date;
    this.updateDerived();
    this.port.onmessage = (e) => this.onMsg(e.data);
  }

  rand() {   // mulberry32 (deterministik tohum: testler tekrarlanabilir)
    let t = (this.seed = (this.seed + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ---------------------------------------------------------------- mesajlar (ses thread'i, blok arası)
  onMsg(d) {
    if (!d) return;
    switch (d.t) {
      case 'p': {
        const I = d.i, V = d.v;
        if (!I || !V) return;
        const n = Math.min(I.length, V.length), ext = this.ext;
        for (let j = 0; j < n; j++) {
          const e = I[j], k = e >= 0 && e < ext.length ? ext[e] : -1;
          if (k >= 0 && V[j] === V[j]) { this.ps[k] = V[j]; this.pd[k] = 1; this.pAny = true; }
        }
        return;
      }
      case 'on': this.push(EV_ON, d.at, this.nid(d.id, false), +d.n, d.v == null ? 100 : +d.v, 0); return;
      case 'off': this.push(EV_OFF, d.at, this.nid(d.id, true), 0, 0, 0); return;
      case 'x': this.push(EV_X, d.at, this.nid(d.id, false), num(d.bend), num(d.slide), num(d.press)); return;
      case 'pb': this.push(EV_PB, d.at, +d.v, 0, 0, 0); return;
      case 'mw': this.push(EV_MW, d.at, +d.v, 0, 0, 0); return;
      case 'press': this.push(EV_PRESS, d.at, +d.v, 0, 0, 0); return;
      case 'tempo': this.push(EV_TEMPO, 0, +d.bpm, 0, 0, 0); return;
      case 'tab': this.push(EV_TAB, 0, d.osc | 0, d.id | 0, 0, 0); return;
      case 'm': {
        const t = typeof d.tgt === 'number' ? (d.tgt >= 0 && d.tgt < this.ext.length ? this.ext[d.tgt] : -1) : PIX[d.tgt];
        if (t !== undefined && t >= 0) this.push(EV_MOD, 0, t, d.src | 0, +d.amt || 0, 0);
        return;
      }
      case 'panic': this.qn = 0; this.push(EV_PANIC, 0, 0, 0, 0, 0); return;   // planlı notalar da düşer
      case 'profile': this.push(EV_PROFILE, 0, profCode(d.p), d.cap | 0, 0, 0); return;
      case 'tdata': this.install(d); return;
      case 'drop': TABLES.delete(d.id); if (typeof d.id === 'number') this.needSent[d.id & 255] = 0; return;
      case 'init': this.init(d); return;
    }
  }

  // Zamanlı olayı mutlak kareye göre sıralı yere koyar (aynı karede geliş sırası korunur). `at` yoksa −1: hemen.
  push(type, at, a, b, c, d) {
    if (this.qn >= QCAP) return;   // 1024 bekleyen olay pratikte oluşmaz; taşarsa yeni olay düşer
    const q = this.q, fr = at > 0 ? Math.round(at * sampleRate) : -1;
    let i = this.qn;
    while (i > 0 && q[(i - 1) * ES + 1] > fr) i--;
    if (i < this.qn) q.copyWithin((i + 1) * ES, i * ES, this.qn * ES);
    const o = i * ES;
    q[o] = type; q[o + 1] = fr; q[o + 2] = a; q[o + 3] = b; q[o + 4] = c; q[o + 5] = d;
    this.qn++;
  }

  // Sayı id'ler olduğu gibi; string id'ler (ör. 'p3', 'key:KeyA') −2, −3… tamsayılarına eşlenir.
  nid(id, release) {
    if (typeof id === 'number') return id;
    if (id == null) return -1;
    let v = this.ids.get(id);
    if (v === undefined) { v = -(this.idNext++); if (!release) this.ids.set(id, v); }
    else if (release) this.ids.delete(id);
    return v;
  }

  install(d) {
    let buf = d.buf;
    if (buf instanceof ArrayBuffer) buf = new Float32Array(buf);
    const t = buf instanceof Float32Array ? makeTable(d.F, d.levels, buf) : null;
    if (!t) { console.warn(`[p3] geçersiz tablo verisi: ${d.id}`); return; }
    TABLES.set(d.id, t);
    if (typeof d.id === 'number') this.needSent[d.id & 255] = 0;
  }

  init(d) {
    const list = d.params;
    if (Array.isArray(list)) {
      const ext = this.ext;
      ext.fill(-1);
      for (let j = 0; j < list.length && j < ext.length; j++) {
        const it = list[j], k = it ? PIX[it.k] : undefined;
        if (k === undefined) continue;
        ext[j] = k;
        if (isFinite(it.min) && isFinite(it.max) && +it.max > +it.min) { this.lo[k] = +it.min; this.hi[k] = +it.max; }
        if (typeof it.curve === 'string') this.cv[k] = curveCode(it.curve);
        if (it.mod === 0 || it.mod === 1 || it.mod === 2) this.md[k] = it.mod;
      }
      const def = d.def;
      if (def && def.length) {
        for (let j = 0; j < def.length && j < ext.length; j++) {
          const k = ext[j];
          if (k >= 0 && isFinite(def[j])) this.pv[k] = this.fit(k, def[j]);
        }
      }
    }
    if (d.mods && typeof d.mods === 'object') this.setMods(d.mods);
    if (isFinite(d.bpm) && d.bpm > 0) this.bpm = clamp(+d.bpm, 20, 999);
    if (typeof d.profile === 'string') this.base = profCode(d.profile);
    this.norms();
    this.rebuildTargets();
    this.updateDerived();
  }

  // ---------------------------------------------------------------- parametre ve matris
  fit(k, v) {
    v = clamp(+v, this.lo[k], this.hi[k]);
    return this.cv[k] === C_STEP ? Math.round(v) : v;
  }
  norms() { for (let k = 0; k < NP; k++) this.pn[k] = toNorm(this.cv[k], this.lo[k], this.hi[k], this.pv[k]); }
  setMods(obj) {
    this.mm.fill(0);
    for (const key in obj) {
      const t = PIX[key], row = obj[key];
      if (t === undefined || !row) continue;
      for (const s in row) {
        const si = +s;
        if (si >= 0 && si < NSRC) this.mm[t * NSRC + si] = clamp(+row[s], -1, 1);
      }
    }
    this.rebuildTargets();
  }
  rebuildTargets() {
    const md = this.md, mm = this.mm;
    let n = 0;
    for (let t = 0; t < NP; t++) {
      if (md[t] === 0) continue;
      for (let s = 0; s < NSRC; s++) if (mm[t * NSRC + s] !== 0) { this.tl[n++] = t; break; }
    }
    this.tn = n;
  }
  // Profil, polifoni sınırı ve routing yalnız taban değerlere bağlıdır (modüle edilemezler).
  updateDerived() {
    const pv = this.pv;
    this.prof = this.base === PR_ECO ? PR_ECO : this.base === PR_HQ || pv[P_HQ] >= 0.5 ? PR_HQ : PR_STD;
    let lim = POLY_VALUES[clamp(Math.round(pv[P_POLY]), 0, 7)];
    if (lim > 8 && !(this.prof === PR_HQ && Math.round(pv[P_UMODE]) === 0)) lim = 8;   // 16 yalnız hq + unison kapalı
    this.limit = Math.min(lim, this.cap);
    this.route = clamp(Math.round(pv[P_ROUTE]), 0, 2);
  }
  applyParams() {
    const pd = this.pd, ps = this.ps, pv = this.pv, wasMono = pv[P_MONO] >= 0.5;
    for (let k = 0; k < NP; k++) {
      if (!pd[k]) continue;
      pd[k] = 0;
      pv[k] = this.fit(k, ps[k]);
      this.pn[k] = toNorm(this.cv[k], this.lo[k], this.hi[k], pv[k]);
    }
    this.pAny = false;
    this.updateDerived();
    if ((pv[P_MONO] >= 0.5) !== wasMono) this.fadeAll();   // Poly ⇄ Mono: çalan sesler 3 ms'de söner
    this.trim();
  }
  // Modülasyon (sartname §5): toplamsal hedef normalize uzayda, çarpımsal hedef değerle çarpılır, perde
  // hedefleri yarım tonla. Mod Amt önce hesaplanır ve diğer bütün miktarları çarpar (kendi satırını değil).
  modulate(ev, src) {
    const tl = this.tl, n = this.tn;
    let M = ev[P_MODAMT];
    for (let j = 0; j < n; j++) if (tl[j] === P_MODAMT) { M = this.modOne(P_MODAMT, 1, src); break; }
    ev[P_MODAMT] = M;
    for (let j = 0; j < n; j++) { const t = tl[j]; if (t !== P_MODAMT) ev[t] = this.modOne(t, M, src); }
  }
  modOne(t, M, src) {
    const mm = this.mm, b = t * NSRC, v = this.pv[t];
    if (this.md[t] === 2) {
      let g = 1;
      for (let s = 0; s < NSRC; s++) {
        let a = mm[b + s];
        if (a === 0) continue;
        let u = clamp(BIPOLAR[s] ? (src[s] + 1) * 0.5 : src[s], 0, 1);
        if (a < 0) { a = -a; u = 1 - u; }
        a *= M;
        const f = 1 - a + a * u;
        g *= f > 0 ? f : 0;
      }
      return v * g;
    }
    let sum = 0;
    for (let s = 0; s < NSRC; s++) { const a = mm[b + s]; if (a !== 0) sum += a * src[s]; }
    sum *= M;
    const ps = PITCH_SCALE[t];
    return ps !== 0 ? v + sum * ps : fromNorm(this.cv[t], this.lo[t], this.hi[t], this.pn[t] + sum);
  }
  lfoRate(ev, b, ts) {
    const r = ev[b + L_SYNC] >= 0.5
      ? this.bpm / 60 / (SYNC_BARS[clamp(Math.round(ev[b + L_SRATE]), 0, 21)] * 4)
      : ev[b + L_RATE];
    return r / ts;
  }

  // ---------------------------------------------------------------- blok
  process(inputs, outputs) {
    const out = outputs[0], oL = out && out[0];
    if (!oL) return true;
    const n = oL.length, oR = out[1] || this.scrR;
    const t0 = this.clock.now();
    oL.fill(0); oR.fill(0, 0, n);
    if (this.pAny) this.applyParams();
    this.resolveTables();
    // Olay noktalarında alt bloklara bölünür, alt bloklar en çok 32 örneklik dilimlerle işlenir.
    const f0 = typeof currentFrame === 'number' ? currentFrame : Math.round(currentTime * sampleRate);
    const q = this.q;
    let s = 0, qi = 0;
    while (s < n) {
      while (qi < this.qn && q[qi * ES + 1] <= f0 + s) this.apply(qi++);
      let end = n;
      if (qi < this.qn) { const e = q[qi * ES + 1] - f0; if (e < end) end = e; }
      while (s < end) {
        const m = end - s < CTRL ? end - s : CTRL;
        this.slice(oL, oR, s, m);
        s += m;
      }
    }
    if (qi > 0) { q.copyWithin(0, qi * ES, this.qn * ES); this.qn -= qi; }
    this.master(oL, oR, n);
    this.clean();
    this.freeRun(n);
    this.stats(n, this.clock.now() - t0);
    return true;
  }

  slice(oL, oR, off, m) {
    const V = this.V;
    for (let i = 0; i < V.length; i++) {
      const v = V[i];
      if (v.st === 0) continue;
      this.ctl(v, m);
      this.render(v, oL, oR, off, m);
    }
  }

  apply(qi) {
    const q = this.q, o = qi * ES;
    switch (q[o]) {
      case EV_ON: this.noteOn(q[o + 2], q[o + 3], q[o + 4]); break;
      case EV_OFF: this.noteOff(q[o + 2]); break;
      case EV_X: this.expr(q[o + 2], q[o + 3], q[o + 4], q[o + 5]); break;
      case EV_PB: this.pb = clamp(q[o + 2], -1, 1); break;
      case EV_MW: this.mw = clamp(q[o + 2], 0, 1); break;
      case EV_PRESS: this.press = clamp(q[o + 2], 0, 1); break;
      case EV_TEMPO: if (q[o + 2] > 0) this.bpm = clamp(q[o + 2], 20, 999); break;
      case EV_TAB: this.tabId[q[o + 2] === 2 ? 1 : 0] = q[o + 3]; this.resolveTables(); break;
      case EV_MOD: {
        const t = q[o + 2], s = q[o + 3];
        if (this.md[t] !== 0 && s >= 0 && s < NSRC) { this.mm[t * NSRC + s] = clamp(q[o + 4], -1, 1); this.rebuildTargets(); }
        break;
      }
      case EV_PANIC: this.fadeAll(); this.pb = 0; this.press = 0; break;
      case EV_PROFILE:
        this.base = q[o + 2];
        if (q[o + 3] > 0) this.cap = clamp(q[o + 3], 1, MAXPOLY);
        this.updateDerived(); this.trim();
        break;
    }
  }

  // Tablo referansları her blok başında global Map'ten çözülür (drop edilen tablo o an düşer).
  // Sub: Worker'ın 'sub' tablosu geldiyse o, yoksa burada üretilen.
  resolveTables() {
    this.subRef = TABLES.get('sub') || SUB;
    for (let k = 0; k < 2; k++) {
      const id = this.tabId[k], t = TABLES.get(id), flag = id & 255;
      this.tabRef[k] = t || null;
      if (t) this.needSent[flag] = 0;
      else if (!this.needSent[flag] && this.pv[k ? O2 : O1] >= 0.5) {
        this.needSent[flag] = 1;
        this.needMsg.id = id;
        this.port.postMessage(this.needMsg);
      }
    }
  }

  // ---------------------------------------------------------------- ses havuzu
  alloc() {
    const V = this.V;
    let best = null;
    for (let i = 0; i < V.length; i++) {
      const v = V[i];
      if (v.st === 0) return v;
      if (v.st === 2 && (!best || v.fade < best.fade)) best = v;
    }
    if (!best) { best = V[0]; for (let i = 1; i < V.length; i++) if (V[i].age < best.age) best = V[i]; }
    this.kill(best);   // havuz doluysa sönmesi en çok ilerlemiş ses kesilir
    return best;
  }
  kill(v) { v.st = 0; v.id = -1; v.held = false; if (this.mv === v) this.mv = null; }
  steal(v) {         // 3 ms doğrusal sönme; nota bağı kopar, yeni olaylar bu sesi bulmaz
    v.st = 2; v.id = -1; v.held = false; v.fade = v.fadeN = this.fadeN;
    if (this.mv === v) this.mv = null;
  }
  // Çalma sırası (sartname §8): Release'teki en sessiz → en eski (en alt ve en üst tutulan nota korunur).
  victim() {
    const V = this.V;
    let best = null, lo = null, hi = null, held = 0;
    for (let i = 0; i < V.length; i++) {
      const v = V[i];
      if (v.st !== 1) continue;
      if (!v.held) { if (!best || v.env[0].v < best.env[0].v) best = v; continue; }
      held++;
      if (!lo || v.note < lo.note) lo = v;
      if (!hi || v.note > hi.note) hi = v;
    }
    if (best) return best;
    for (let i = 0; i < V.length; i++) {
      const v = V[i];
      if (v.st !== 1 || (held >= 3 && (v === lo || v === hi))) continue;
      if (!best || v.age < best.age) best = v;
    }
    return best;
  }
  active() { let n = 0; for (let i = 0; i < this.V.length; i++) if (this.V[i].st === 1) n++; return n; }
  trim() {
    let n = this.active();
    const lim = this.pv[P_MONO] >= 0.5 ? 1 : this.limit;
    while (n > lim) { const v = this.victim(); if (!v) break; this.steal(v); n--; }
  }
  fadeAll() {
    for (let i = 0; i < this.V.length; i++) if (this.V[i].st === 1) this.steal(this.V[i]);
    this.stkN = 0; this.mv = null;
  }
  // Çalan seslerin unison-osilatör toplamı. Osc açıklığı taban parametreden okunur: aynı blokta başlayan
  // seslerin ilk kontrol dilimi henüz çalışmamış olabilir.
  uniCount(ex) {
    const on1 = this.pv[O1] >= 0.5, on2 = this.pv[O2] >= 0.5;
    let n = 0;
    for (let i = 0; i < this.V.length; i++) {
      const v = this.V[i];
      if (v.st === 1 && v !== ex) n += (on1 ? v.o[0].n : 0) + (on2 ? v.o[1].n : 0);
    }
    return n;
  }

  // ---------------------------------------------------------------- notalar
  noteOn(id, n, vel) {
    n = clamp(Math.round(n), 0, 127); vel = clamp(vel, 1, 127);
    if (this.pv[P_MONO] >= 0.5) { this.monoOn(id, n, vel); return; }
    const V = this.V;
    let same = null, act = 0;
    for (let i = 0; i < V.length; i++) {
      const v = V[i];
      if (v.st !== 1) continue;
      act++;
      if (v.note === n && (!same || v.age > same.age)) same = v;
    }
    if (same) { this.steal(same); act--; }           // aynı nota: eski ses söner, yeni ses onun seviyesinden
    while (act >= this.limit) { const v = this.victim(); if (!v) break; this.steal(v); act--; }
    this.start(this.alloc(), id, n, vel, same);
  }
  noteOff(id) {
    if (this.pv[P_MONO] >= 0.5) { this.monoOff(id); return; }
    for (let i = 0; i < this.V.length; i++) { const v = this.V[i]; if (v.st === 1 && v.id === id) this.release(v); }
  }
  release(v) { v.held = false; for (let e = 0; e < 3; e++) envRelease(v.env[e]); }
  expr(id, bend, slide, press) {
    for (let i = 0; i < this.V.length; i++) {
      const v = this.V[i];
      if (v.st !== 1 || v.id !== id) continue;
      if (bend === bend) v.nb = clamp(bend, -1, 1);
      if (slide === slide) v.slide = clamp(slide, 0, 1);
      if (press === press) v.press = clamp(press, 0, 1);
    }
  }
  // Mono (sartname §8): son-nota yığını, legato zarflar; Glide yarım ton domeninde doğrusal.
  monoOn(id, n, vel) {
    const stk = this.stk;
    let top = this.stkN;
    if (top >= 16) { stk.copyWithin(0, 3, 48); top = 15; }   // yığın dolarsa en eski nota düşer
    stk[top * 3] = id; stk[top * 3 + 1] = n; stk[top * 3 + 2] = vel;
    this.stkN = top + 1;
    const v = this.mv;
    if (v && v.st === 1) {
      v.id = id; v.vel = vel;
      this.glideTo(v, n);
      if (top === 0) {   // basılı tuş yoktu (ses Release'teydi): zarflar o anki değerden yeniden başlar
        v.held = true; v.retrig = true;
        v.rnd = 2 * this.rand() - 1; v.nb = 0; v.slide = 0; v.press = -1;
        for (let e = 0; e < 3; e++) v.from[e] = v.env[e].v;
        this.lfoStart(v);
      }
      return;
    }
    const nv = this.alloc();
    this.start(nv, id, n, vel, null);
    this.mv = nv;
  }
  monoOff(id) {
    const stk = this.stk;
    let n = this.stkN, at = -1;
    for (let i = n - 1; i >= 0; i--) if (stk[i * 3] === id) { at = i; break; }
    if (at < 0) return;
    stk.copyWithin(at * 3, (at + 1) * 3, n * 3);
    this.stkN = --n;
    const v = this.mv;
    if (!v || v.st !== 1 || at !== n) return;   // bırakılan nota çalan (en üstteki) değildi
    if (n > 0) { v.id = stk[(n - 1) * 3]; this.glideTo(v, stk[(n - 1) * 3 + 1]); }   // legato: önceki notaya
    else this.release(v);
  }
  glideTo(v, n) {
    v.note = n; v.ptgt = n;
    const gt = this.pv[P_GLIDE];
    if (gt > 0.0005 && n !== v.pitch) v.pstep = (n - v.pitch) / (gt * sampleRate);
    else { v.pitch = n; v.pstep = 0; }
  }

  start(v, id, n, vel, inh) {
    const pv = this.pv;
    for (let e = 0; e < 3; e++) v.from[e] = inh ? inh.env[e].v : e === 0 ? 0 : NaN;   // NaN: Env2/3 Initial'dan
    v.st = 1; v.id = id; v.note = n; v.vel = vel; v.held = true; v.age = ++this.age;
    v.fresh = true; v.retrig = false; v.fade = 0;
    v.pitch = v.ptgt = n; v.pstep = 0;
    v.nb = 0; v.slide = 0; v.press = -1; v.rnd = 2 * this.rand() - 1;
    for (let e = 0; e < 3; e++) { v.env[e].stg = ST_IDLE; v.env[e].held = true; }
    this.lfoStart(v);
    // Unison: ses sayısı note-on'da sabitlenir; profil tavanı ve toplam unison-osilatör bütçesi (CPU)
    const mode = clamp(Math.round(pv[P_UMODE]), 0, 6);
    let nu = mode ? clamp(Math.round(pv[P_UVOICES]), 2, UNI_MAX[this.prof]) : 1;
    const oscs = (pv[O1] >= 0.5 ? 1 : 0) + (pv[O2] >= 0.5 ? 1 : 0);
    if (nu > 1 && oscs > 0) nu = clamp(Math.floor((UNI_TOTAL[this.prof] - this.uniCount(v)) / oscs), 1, nu);
    this.oscStart(v.o[0], mode, nu);
    this.oscStart(v.o[1], mode, nu);
    v.sub.on = false; v.sub.ph = 0;
    for (let k = 0; k < 2; k++) { v.fl[k].on = false; v.fl[k].s.fill(0); }
  }
  oscStart(os, mode, nu) {
    os.on = false; os.mode = mode; os.n = nu;   // on=false: ilk dilim rampasız başlar
    for (let i = 0; i < nu; i++) {
      const e = nu > 1 ? 2 * i / (nu - 1) - 1 : 0;
      os.e[i] = e;
      os.sp[i] = nu > 1 ? ((i & 1) ? 1 : -1) * Math.abs(e) : 0;   // dönüşümlü pan ±|e|
      os.ph[i] = nu > 1 && mode !== 4 ? this.rand() : 0;          // rastgele faz; Phase Sync ve tek ses 0'dan
      os.pm[i] = 0;
      os.fz[3 * i] = 0; os.fz[3 * i + 1] = NaN; os.fz[3 * i + 2] = 0;
      os.ru[i] = 2 * this.rand() - 1; os.rv[i] = 2 * this.rand() - 1;
      os.jt[i] = 0; os.jc[i] = 0; os.jn[i] = 0;
    }
  }
  // Retrigger açıksa faz 0'dan (Phase ofseti okumada eklenir), kapalıysa instance'ın serbest fazından.
  lfoStart(v) {
    for (let l = 0; l < 2; l++) {
      v.lph[l] = this.pv[LFOB[l] + L_RETRIG] >= 0.5 ? 0 : this.lfoFree[l];
      v.lu[l] = 2 * this.rand() - 1;
      v.lo[l] = 0;
    }
    v.lt = 0;
  }

  // ---------------------------------------------------------------- kontrol dilimi (sartname §5)
  // Kaynaklar dilim başındaki değerlerdir; türetilen her büyüklük önceki dilimin değerinden bu dilimin
  // sonuna doğrusal rampayla geçer (bir dilim = 0.67 ms gecikme, fermuar gürültüsü yok).
  ctl(v, n) {
    const ev = v.ev, src = v.src, env = v.env, first = v.fresh, fs = sampleRate;
    src[S_AMP] = env[0].v; src[S_ENV2] = env[1].v; src[S_ENV3] = env[2].v;
    src[S_LFO1] = v.lo[0]; src[S_LFO2] = v.lo[1];
    src[S_VEL] = v.vel / 127; src[S_KEY] = (v.note - 60) / 120; src[S_PB] = this.pb;
    src[S_PRESS] = v.press >= 0 ? v.press : this.press; src[S_MW] = this.mw; src[S_RND] = v.rnd;
    src[S_SLIDE] = v.slide; src[S_NPB] = v.nb;
    ev.set(this.pv);
    if (this.tn > 0) this.modulate(ev, src);
    // Mod Time: zarf süreleri × 2^(3·t), LFO hızları ÷ aynı çarpan
    const ts = Math.pow(2, 3 * clamp(ev[P_MODTIME], -1, 1));
    for (let e = 0; e < 3; e++) {
      const E = env[e], b = ENVB[e];
      E.tA = ev[b + E_A] * ts; E.tD = ev[b + E_D] * ts; E.tR = ev[b + E_R] * ts;
      E.sA = clamp(ev[b + E_ASL], -1, 1); E.sD = clamp(ev[b + E_DSL], -1, 1); E.sR = clamp(ev[b + E_RSL], -1, 1);
      E.loop = clamp(Math.round(ev[b + E_LOOP]), 0, 2);
      E.sus = clamp(ev[b + E_S], 0, 1);
      if (e === 0) { E.pk = 1; E.fin = 0; E.ini = 0; }
      else { E.pk = clamp(ev[b + E_PEAK], 0, 1); E.fin = clamp(ev[b + E_FIN], 0, 1); E.ini = clamp(ev[b + E_INIT], 0, 1); }
      if (first || v.retrig) {
        const f = v.from[e];
        E.v = f === f ? f : E.ini;
        E.held = true;
        envSeg(E, ST_A);
        if (!v.held) envRelease(E);   // aynı karede gelen note-off
      } else envSync(E);
      if (e > 0) envTick(E, n);        // Env2/3 dilim başına; Amp render'da örnek başına
    }
    v.retrig = false;
    // LFO'lar: bu dilimin sonundaki değer bir sonraki dilimin kaynağıdır.
    for (let l = 0; l < 2; l++) {
      const b = LFOB[l], s = clamp(ev[b + L_SHP], -1, 1);
      let ph = v.lph[l] + this.lfoRate(ev, b, ts) * n / fs;
      if (ph >= 1) { ph -= Math.floor(ph); v.lu[l] = 2 * this.rand() - 1; }   // Random: döngü başına S&H
      v.lph[l] = ph;
      const att = ev[b + L_ATT] * ts, fade = att > 0 ? Math.min(1, v.lt / att) : 1;
      const r = v.lu[l], u = (r < 0 ? -1 : 1) * Math.pow(Math.abs(r), Math.pow(2, -2 * s));
      v.lo[l] = lfoShape(clamp(Math.round(ev[b + L_SHAPE]), 0, 4), s, frac(ph + ev[b + L_PHASE] / 360), u)
        * clamp(ev[b + L_AMT], 0, 1) * fade;
    }
    v.lt += n / fs;
    // Perde: Glide + global Transpose + PITCH matrisi
    if (v.pstep !== 0) {
      v.pitch += v.pstep * n;
      if ((v.pstep > 0) === (v.pitch >= v.ptgt)) { v.pitch = v.ptgt; v.pstep = 0; }
    }
    // Perde ve Unison Amount ses nesnesinde taşınır (double argüman kutulanmasın diye)
    v.pc = v.pitch + ev[P_TRANSP] + ev[P_PITCH];
    v.ua = clamp(ev[P_UAMT], 0, 1);
    const herm = this.prof === PR_HQ;
    this.ctlOsc(v, 0, O1, n, first, herm);
    this.ctlOsc(v, 1, O2, n, first, herm);
    this.ctlSub(v, first, herm);
    this.ctlFlt(v.fl[0], F1, ev, first);
    this.ctlFlt(v.fl[1], F2, ev, first);
    const g = Math.max(0, ev[P_AMP] * ev[P_VOL] * VOICE_GAIN);
    v.g0 = first ? g : v.g1; v.g1 = g;
    v.fresh = false;
  }

  ctlOsc(v, k, base, n, first, herm) {
    const os = v.o[k], ev = v.ev, tb = this.tabRef[k], fs = sampleRate, p = v.pc, A = v.ua;
    if (ev[base + O_ON] < 0.5 || !tb) { os.on = false; return; }
    const fx = clamp(Math.round(ev[base + O_FX]), 0, 3);
    const init = first || !os.on || os.tb !== tb || os.fx !== fx;
    os.on = true; os.tb = tb; os.fx = fx;
    const f0 = mtof(p + ev[base + O_TR] + ev[base + O_DET]);
    const pos = clamp(ev[base + O_POS], 0, 1), pan = clamp(ev[base + O_PAN], -1, 1);
    const nu = os.n, mode = os.mode, g = Math.max(0, ev[base + O_GAIN]) / Math.sqrt(nu);
    // Shimmer: 50–150 ms'de bir yeni hedef, 20 ms yumuşatma; Noise: 1–3 ms'de bir (genlikler VARSAYIM)
    if (mode === 2 || mode === 3) {
      const sm = mode === 2 ? 1 - Math.exp(-n / (0.02 * fs)) : 1;
      for (let i = 0; i < nu; i++) {
        os.jn[i] -= n;
        if (os.jn[i] <= 0) {
          os.jt[i] = 2 * this.rand() - 1;
          os.jn[i] = (mode === 2 ? 0.05 + 0.1 * this.rand() : 0.001 + 0.002 * this.rand()) * fs;
        }
        os.jc[i] += (os.jt[i] - os.jc[i]) * sm;
      }
    }
    let rmax = 1;
    for (let i = 0; i < nu; i++) {
      const e = os.e[i];
      let ct = 0, po = 0;
      switch (mode) {   // sartname §8: detune cent, pozisyon ofseti
        case 1: case 4: ct = A * 50 * e; break;                               // Classic, Phase Sync
        case 2: ct = A * 30 * os.jc[i]; po = 0.02 * A * os.jc[i]; break;       // Shimmer
        case 3: ct = A * 15 * os.jc[i]; po = 0.02 * A * os.jc[i]; break;       // Noise
        case 5: ct = A * 5 * e; po = 0.5 * A * e; break;                        // Position Spread
        case 6: ct = A * 50 * os.ru[i]; po = 0.25 * A * os.rv[i]; break;        // Random Note
      }
      const r = ct === 0 ? 1 : Math.pow(2, ct / 1200);
      if (r > rmax) rmax = r;
      const inc = Math.min(0.5, f0 * r / fs), pp = clamp(pos + po, 0, 1);
      const a = (clamp(pan + os.sp[i], -1, 1) + 1) * Math.PI / 4;   // eşit güç
      if (!init) { os.inc0[i] = os.inc1[i]; os.pos0[i] = os.pos1[i]; os.gl0[i] = os.gl1[i]; os.gr0[i] = os.gr1[i]; }
      os.inc1[i] = inc; os.pos1[i] = pp; os.gl1[i] = g * Math.cos(a); os.gr1[i] = g * Math.sin(a);
      if (init) { os.inc0[i] = inc; os.pos0[i] = pp; os.gl0[i] = os.gl1[i]; os.gr0[i] = os.gr1[i]; }
    }
    // Efekt parametreleri ve mip için efektif en yüksek temel frekans çarpanı (sartname §6).
    // room: sıkıştırılmış dalganın temel bileşeni 0.45·fs'i aşmasın diye PW/Warp sıkıştırmasına ve Fold
    // kazancına perdeye bağlı tavan (VARSAYIM; yalnız üst oktavlarda devreye girer, aşırı katlanmayı önler).
    const x1 = clamp(ev[base + O_FX1], -1, 1), x2 = clamp(ev[base + O_FX2], 0, 1), room = 0.45 * fs / (f0 * rmax);
    let fa = 0, fb = 0, fmul = 1;
    os.gcap = 8;
    if (fx === 1) {          // FM: r = 2^(2·tune), β = 4π·amt²
      const r = Math.pow(2, 2 * x1), beta = 4 * Math.PI * x2 * x2;
      fa = r; fb = beta / (2 * Math.PI); fmul = Math.max(1, r) * (1 + 0.5 * beta);
    } else if (fx === 2) {   // Classic: PW penceresi w, Sync oranı ρ
      const w = room > 1 ? Math.min(0.98 * Math.max(0, x1), 1 - 1 / room) : 0, rho = Math.pow(2, 2 * x2);
      fa = w; fb = rho; fmul = rho / (1 - w);
    } else if (fx === 3) {   // Modern: Warp kırılma noktası d, Fold miktarı
      const dm = 0.5 / Math.max(1, room), d = clamp(0.5 - 0.49 * x1, dm, 1 - dm);
      fa = d; fb = x2; fmul = 0.5 / Math.min(d, 1 - d);
      os.gcap = Math.max(1, (room - 1) * 2 / Math.PI);   // sin(π/2·g·x) bant genişliği ≈ π/2·g + 1 harmonik
    }
    os.A0 = init ? fa : os.A1; os.B0 = init ? fb : os.B1; os.A1 = fa; os.B1 = fb;
    // Mip: en uçtaki unison sesi ve efekt çarpanıyla; seviye değişince ağırlık rampası sıfırlanır
    const prevL = os.L, mo = this.mipOut;
    mipSel(tb, f0 * rmax * fmul, herm, mo);
    os.L = mo.L;
    os.w0 = init || mo.L !== prevL ? mo.w : os.w1; os.w1 = mo.w;
    setReadCtx(os.c, tb, os.L, herm);
    // Sync: master sarmasındaki sıçrama Δ = y(0⁺) − y(1⁻); PW açıkken pencere sarmada kapalı, Δ = 0
    if (fx === 2 && fa < 1e-6 && fb > 1.0001) {
      const fr = frac(fb);
      for (let i = 0; i < nu; i++) {
        readAt(os.c, os.pos1[i], os.w1, 0);
        const y0 = os.c.y;
        readAt(os.c, os.pos1[i], os.w1, fr);
        os.dl[i] = y0 - os.c.y;
      }
    } else for (let i = 0; i < nu; i++) os.dl[i] = 0;
  }

  // Sub: sesin perdesi × 2^(−oktav); Tone karelere pozisyon olarak okunur. Merkez pan (eşit güç).
  ctlSub(v, first, herm) {
    const sb = v.sub, ev = v.ev, p = v.pc;
    if (ev[P_SUBON] < 0.5) { sb.on = false; return; }
    const init = first || !sb.on;
    sb.on = true;
    const f = mtof(p) * Math.pow(2, -clamp(Math.round(ev[P_SUBOCT]), 0, 2));
    const inc = Math.min(0.5, f / sampleRate), pos = clamp(ev[P_SUBTONE], 0, 1);
    const g = Math.max(0, ev[P_SUBGAIN]) * Math.SQRT1_2;
    sb.inc0 = init ? inc : sb.inc1; sb.pos0 = init ? pos : sb.pos1; sb.g0 = init ? g : sb.g1;
    sb.inc1 = inc; sb.pos1 = pos; sb.g1 = g;
    const prevL = sb.L, mo = this.mipOut;
    const tb = this.subRef;
    mipSel(tb, f, herm, mo);
    sb.L = mo.L;
    sb.w0 = init || mo.L !== prevL || sb.tb !== tb ? mo.w : sb.w1; sb.w1 = mo.w; sb.tb = tb;
    setReadCtx(sb.c, tb, sb.L, herm);
  }

  // Clean SVF katsayıları (sartname §7): g = tan(π·fc/fs), q = res/1.25, k = 2 − 1.98q; 24 dB: k1 = 1/0.5412,
  // k2 = 1/(1.3066 + q·(25 − 1.3066)). Morph LP→BP→HP→Notch→LP. Drive yalnız LP/HP/BP'de ve devre ≠ Clean.
  ctlFlt(F, base, ev, first) {
    if (ev[base + F_ON] < 0.5) { F.on = false; return; }
    const fs = sampleRate, type = clamp(Math.round(ev[base + F_TYPE]), 0, 4), s24 = ev[base + F_SLOPE] >= 0.5;
    const init = first || !F.on || F.type !== type || F.s24 !== s24;
    if (!F.on) F.s.fill(0);                                                  // yeni açılan filtre sıfırdan
    else if (s24 && !F.s24) { F.s[2] = F.s[3] = F.s[6] = F.s[7] = 0; }       // ikinci kademe yeni devrede
    F.on = true; F.type = type; F.s24 = s24;
    const fc = clamp(ev[base + F_FREQ], 20, Math.min(20000, 0.45 * fs));
    const q = clamp(ev[base + F_RES], 0, 1.25) / 1.25, g = Math.tan(Math.PI * fc / fs);
    const k1 = s24 ? 1 / 0.5412 : 2 - 1.98 * q, k2 = 1 / (1.3066 + q * (25 - 1.3066));
    const m = this.mix4;
    m.fill(0);
    if (type === 4) {
      const x = clamp(ev[base + F_MORPH], 0, 1) * 4, seg = Math.min(3, Math.floor(x)), t = x - seg;
      m[MORPH_IDX[seg]] += 1 - t; m[MORPH_IDX[seg + 1]] += t;
    } else m[type === 0 ? 0 : type === 1 ? 2 : type === 2 ? 1 : 3] = 1;
    const circ = Math.round(type <= 1 ? ev[base + F_CIRC] : ev[base + F_CIRCB]), drive = clamp(ev[base + F_DRIVE], 0, 24);
    const gd = type <= 2 && circ !== 0 && drive > 0.01 ? Math.pow(10, drive / 20) : 1;   // Faz 2: devre modelleri
    const c0 = F.c0, c1 = F.c1;
    if (!init) c0.set(c1);
    let a = 1 / (1 + g * (g + k1));
    c1[0] = a; c1[1] = g * a; c1[2] = g * g * a; c1[3] = k1;
    a = 1 / (1 + g * (g + k2));
    c1[4] = a; c1[5] = g * a; c1[6] = g * g * a; c1[7] = k2;
    c1[8] = m[0] - m[2]; c1[9] = m[1] - m[2] - m[3]; c1[10] = m[2] + m[3]; c1[11] = gd;
    if (init) c0.set(c1);
    F.drv = c0[11] > 1 || c1[11] > 1;
  }

  // ---------------------------------------------------------------- örnek döngüleri
  render(v, oL, oR, off, n) {
    const b = this.bx, x1L = b[0], x1R = b[1], x2L = b[2], x2R = b[3], sb = b[4];
    x1L.fill(0, 0, n); x1R.fill(0, 0, n); x2L.fill(0, 0, n); x2R.fill(0, 0, n); sb.fill(0, 0, n);
    if (v.o[0].on) this.runOsc(v.o[0], x1L, x1R, n);
    if (v.o[1].on) this.runOsc(v.o[1], x2L, x2R, n);
    if (v.sub.on) this.runSub(v.sub, sb, n);
    // Routing (sartname §7): kapalı filtre bypass olur, sesi kesmez.
    const f1 = v.fl[0], f2 = v.fl[1];
    if (this.route === 2) {            // Split: Osc 1 → F1, Osc 2 → F2, sub yarı yarıya
      for (let i = 0; i < n; i++) { const h = 0.5 * sb[i]; x1L[i] += h; x1R[i] += h; x2L[i] += h; x2R[i] += h; }
      if (f1.on) runFlt(f1, x1L, x1R, n);
      if (f2.on) runFlt(f2, x2L, x2R, n);
      for (let i = 0; i < n; i++) { x1L[i] += x2L[i]; x1R[i] += x2R[i]; }
    } else {
      for (let i = 0; i < n; i++) { x1L[i] += x2L[i] + sb[i]; x1R[i] += x2R[i] + sb[i]; }
      if (this.route === 1) {          // Parallel: 0.5·(F1 + F2)
        for (let i = 0; i < n; i++) { x2L[i] = x1L[i]; x2R[i] = x1R[i]; }
        if (f1.on) runFlt(f1, x1L, x1R, n);
        if (f2.on) runFlt(f2, x2L, x2R, n);
        for (let i = 0; i < n; i++) { x1L[i] = 0.5 * (x1L[i] + x2L[i]); x1R[i] = 0.5 * (x1R[i] + x2R[i]); }
      } else {                         // Serial: F1 → F2
        if (f1.on) runFlt(f1, x1L, x1R, n);
        if (f2.on) runFlt(f2, x1L, x1R, n);
      }
    }
    // × Amp zarfı (örnek başına) × AMP·Volume·0.25 (dilim rampası) × sönme
    const E = v.env[0], fading = v.st === 2;
    let g = v.g0;
    const dg = (v.g1 - g) / n;
    for (let i = 0; i < n; i++) {
      g += dg;
      envTick(E, 1);
      let s = E.v * g;
      if (fading) { s *= v.fade / v.fadeN; if (v.fade > 0) v.fade--; }
      oL[off + i] += x1L[i] * s; oR[off + i] += x1R[i] * s;
    }
    // Ses bitişi: sönme bitti, Amp zarfı tamamlandı ya da tuş bırakılmışken Release'te −80 dB altı
    if ((fading && v.fade <= 0) || E.stg === ST_IDLE || (E.stg === ST_R && !v.held && E.v < 1e-4)) this.kill(v);
  }

  // Osilatör dilimi, unison sesi başına üç geçiş: (1) okuma fazları + efektin faz işi, (2) blok okuma,
  // (3) efektin çıkış işi (PW kapısı + polyBLEP, Fold), ardından kazanç/pan rampasıyla toplama.
  runOsc(os, bL, bR, n) {
    const nu = os.n, fx = os.fx, inv = 1 / n, TAU = 2 * Math.PI, qb = this.qb, yb = this.yb, bb = this.bb;
    const dw = (os.w1 - os.w0) * inv, dA = (os.A1 - os.A0) * inv, dB = (os.B1 - os.B0) * inv;
    const folding = fx === 3 && (os.B0 > 0 || os.B1 > 0), m = folding && os.c.herm ? 2 : 1;   // hq: Fold 2×
    for (let u = 0; u < nu; u++) {
      let ph = os.ph[u], inc = os.inc0[u], A = os.A0, B = os.B0;
      const di = (os.inc1[u] - inc) * inv;
      if (fx === 0) {
        for (let i = 0; i < n; i++) { inc += di; qb[i] = ph; ph += inc; if (ph >= 1) ph -= 1; }
      } else if (fx === 1) {           // FM: gizli sinüs modülatörü (unison sesi başına), faz modülasyonu
        let pm = os.pm[u];
        for (let i = 0; i < n; i++) {
          inc += di; A += dA; B += dB;
          qb[i] = frac(ph + B * Math.sin(TAU * pm));
          pm += A * inc; if (pm >= 1) pm -= Math.floor(pm);
          ph += inc; if (ph >= 1) ph -= 1;
        }
        os.pm[u] = pm;
      } else if (fx === 2) {           // Classic: PW penceresi (kapı bb'de), gizli master ile Sync + polyBLEP
        const d = os.dl[u];
        for (let i = 0; i < n; i++) {
          inc += di; A += dA; B += dB;
          const uu = (ph - 0.5) / (1 - A);
          let q = 0, gate = 0, bl = 0;
          if (uu > -0.5 && uu < 0.5) { q = uu + 0.5; if (B > 1.0001) q = frac(q * B); gate = 1; }
          if (d !== 0) {
            if (ph < inc) { const x = ph / inc; bl = 0.5 * d * (2 * x - x * x - 1); }
            else if (ph > 1 - inc) { const x = (ph - 1) / inc; bl = 0.5 * d * (x * x + 2 * x + 1); }
          }
          qb[i] = q; yb[CTRL + i] = gate; bb[i] = bl;
          ph += inc; if (ph >= 1) ph -= 1;
        }
      } else {                         // Modern: Warp (iki parçalı faz eğme); hq katlamada yarım adım da okunur
        for (let i = 0; i < n; i++) {
          inc += di; A += dA;
          if (m === 2) qb[2 * i] = warp(frac(ph - 0.5 * inc), A);
          qb[m * i + m - 1] = warp(ph, A);
          ph += inc; if (ph >= 1) ph -= 1;
        }
      }
      os.ph[u] = ph;
      const c = os.c;
      c.pos = os.pos0[u]; c.dp = (os.pos1[u] - os.pos0[u]) * inv / m; c.w = os.w0; c.dw = dw / m;
      readBlock(c, qb, m * n, yb);
      if (fx === 2) for (let i = 0; i < n; i++) yb[i] = yb[CTRL + i] * yb[i] + bb[i];
      else if (folding) foldBlock(os, 3 * u, yb, n, m);
      let gl = os.gl0[u], gr = os.gr0[u];
      const dl = (os.gl1[u] - gl) * inv, dr = (os.gr1[u] - gr) * inv;
      for (let i = 0; i < n; i++) { gl += dl; gr += dr; const y = yb[i]; bL[i] += y * gl; bR[i] += y * gr; }
    }
    if (fx === 3 && !folding) for (let u = 0; u < nu; u++) os.fz[3 * u + 1] = NaN;   // katlama kapalı: ADAA durumu tazelensin
  }

  runSub(sb, out, n) {
    const inv = 1 / n, qb = this.qb, yb = this.yb;
    let ph = sb.ph, inc = sb.inc0, g = sb.g0;
    const di = (sb.inc1 - inc) * inv, dg = (sb.g1 - g) * inv;
    for (let i = 0; i < n; i++) { inc += di; qb[i] = ph; ph += inc; if (ph >= 1) ph -= 1; }
    sb.ph = ph;
    const c = sb.c;
    c.pos = sb.pos0; c.dp = (sb.pos1 - sb.pos0) * inv; c.w = sb.w0; c.dw = (sb.w1 - sb.w0) * inv;
    readBlock(c, qb, n, yb);
    for (let i = 0; i < n; i++) { g += dg; out[i] += yb[i] * g; }
  }

  // ---------------------------------------------------------------- master, bakım, ölçüm
  // DC blocker (R = 1 − 2π·10/fs) → sınırlayıcı. NaN çıkışa ve durumlara sızmaz.
  master(oL, oR, n) {
    const R = this.dcR, d = this.dc;
    let xl = d[0], yl = d[1], xr = d[2], yr = d[3], pl = this.pkL, pr = this.pkR;
    for (let i = 0; i < n; i++) {
      let a = oL[i], b = oR[i];
      if (a !== a) a = 0;
      if (b !== b) b = 0;
      yl = a - xl + R * yl; xl = a;
      yr = b - xr + R * yr; xr = b;
      // Sınırlayıcı: KNEE altında tam doğrusal, üstünde tanh diz (KNEE'de türev sürekli, tavan 1.0)
      let l = yl, r = yr;
      const al = l < 0 ? -l : l, ar = r < 0 ? -r : r;
      if (al > KNEE) { const y = KNEE + (1 - KNEE) * Math.tanh((al - KNEE) / (1 - KNEE)); l = l < 0 ? -y : y; }
      if (ar > KNEE) { const y = KNEE + (1 - KNEE) * Math.tanh((ar - KNEE) / (1 - KNEE)); r = r < 0 ? -y : y; }
      oL[i] = l; oR[i] = r;
      if (l > pl) pl = l; else if (-l > pl) pl = -l;
      if (r > pr) pr = r; else if (-r > pr) pr = -r;
    }
    d[0] = xl; d[1] = yl; d[2] = xr; d[3] = yr;
    this.pkL = pl; this.pkR = pr;
  }
  // Blok sonu: |s| < 1e−15 ve NaN filtre/DC durumları sıfırlanır; bozuk faz 0'a döner.
  clean() {
    const V = this.V;
    for (let i = 0; i < V.length; i++) {
      const v = V[i];
      if (v.st === 0) continue;
      for (let k = 0; k < 2; k++) {
        const s = v.fl[k].s;
        for (let j = 0; j < 8; j++) { const x = s[j]; if (!(x > 1e-15 || x < -1e-15)) s[j] = 0; }
        const ph = v.o[k].ph;
        for (let j = 0; j < UMAX; j++) if (!(ph[j] >= 0 && ph[j] < 1)) ph[j] = 0;
      }
      if (!(v.sub.ph >= 0 && v.sub.ph < 1)) v.sub.ph = 0;
    }
    const d = this.dc;
    for (let j = 0; j < 4; j++) { const x = d[j]; if (!(x > 1e-15 || x < -1e-15)) d[j] = 0; }
  }
  // Retrigger kapalı LFO'lar için instance'ın serbest fazı (modülasyonsuz hız).
  freeRun(n) {
    const pv = this.pv, ts = Math.pow(2, 3 * clamp(pv[P_MODTIME], -1, 1));
    for (let l = 0; l < 2; l++) this.lfoFree[l] = frac(this.lfoFree[l] + this.lfoRate(pv, LFOB[l], ts) * n / sampleRate);
  }
  stats(n, dt) {
    this.cpuAcc += dt;
    if (++this.cpuN >= CPU_EVERY) {
      this.cpu = this.cpuAcc / (this.cpuN * n / sampleRate * 1000);
      this.cpuAcc = 0; this.cpuN = 0;
    }
    if (++this.blk < METER_EVERY) return;
    this.blk = 0;
    const V = this.V, m = this.meterMsg;
    let cnt = 0, last = null;
    for (let i = 0; i < V.length; i++) {
      const v = V[i];
      if (v.st !== 1) continue;
      cnt++;
      if (!last || v.age > last.age) last = v;
    }
    const src = last ? last.ev : this.pv;   // LCD'deki Position çizgisi: son sesin modüle edilmiş konumu
    m.voices = cnt; m.cpu = this.cpu; m.pos1 = src[O1 + O_POS]; m.pos2 = src[O2 + O_POS];
    m.l = this.pkL; m.r = this.pkR;
    this.pkL = 0; this.pkR = 0;
    this.port.postMessage(m);
  }
}

registerProcessor('p3-wavetable', P3Wavetable);
