/* p3-wt-tables.worker.js — Push 3 Laboratuvarı: prosedürel wavetable + mip üretimi.
 *
 * Kaynak: docs/push3/README.md §G7, sartname-ses-motoru.md §4, §6 (Sub), §11;
 * dogrulanmis-dsp-web.md §3–§5; arastirma-dsp.md §2–§4.
 *
 * İki kullanım:
 *  1) Worker:   onmessage {t:'gen', id, profile:'hq'|'std'|'eco'}
 *               → postMessage({t:'tdata', id, F, N0, profile, levels:[{len,H,base}], buf, disp}, [buf.buffer, disp.buffer])
 *               Hata: {t:'terr', id, msg}.
 *  2) Ana thread (Worker açılamazsa): self.P3TableGen.generate(id, profile) aynı nesneyi döndürür;
 *     generateAsync(id, profile, cb) aynı işi setTimeout(0) dilimleriyle yapar (README §A13).
 *
 * Tablo kimlikleri: 0..11 (sartname §11) ve 'sub' (Sub osilatörü, 16 Tone karesi).
 *
 * Bellek yerleşimi (sartname §4): L = 0..10 seviye, her seviyede F kare, her kare len+3 örnek:
 *   [s(len−1) | s0 … s(len−1) | s0, s1]
 *   levels[L].base = seviyenin buf içindeki başlangıcı (levelBase[L]).
 *   Karenin i. örneği: buf[levels[L].base + f·(len+3) + 1 + i]  (−1 ve len, len+1 koruma örnekleri).
 *   H_L = min(1024 >> L, len_L/2 − 1). std/hq: len hep 2048. eco: 2048, 1024, 512, 256, 256…
 * Normalizasyon: her karenin L0 tepesi 0.9; aynı katsayı karenin tüm seviyelerine uygulanır
 * (seviye geçişinde ses seviyesi sıçramasın).
 * disp: Float32Array(F·256) — her karenin L0'ından 256 nokta, tepe = 1 (buf / 0.9). LCD çizimi için.
 *
 * SAPMA/EKLEME (rapora da yazıldı):
 *  - Pulse (1): doğrulanmış formülün işareti ters çevrildi (s_k, c_k × −1). Böylece w = 0.5 karesi
 *    Temel Şekiller'in kare dalgasıyla aynı fazda başlar (+sin konvansiyonu, morph'ta faz iptali olmaz).
 *  - Sinüs Katlama (2): g = 0 karesi sessiz olurdu; limit alınır (saf sinüs).
 *  - Harmonik Tarama (3), Tek↔Çift (4), Rezonans (11): 1/k genlikleri Temel testere ile aynı
 *    işaret düzeniyle ((−1)^(k+1)) kullanılır; t = 0'da yükselen sıfır geçişi.
 *  - FM (7), Sync (8) ve Bitcrush (9): 8× oversample + FFT yerine kapalı form katsayılar (tam
 *    band-limited, kesme artığı alias yok, daha ucuz). Sub şartnamedeki gibi 8× örnekleme + FFT.
 *  - Normalizasyon tüm tablolarda kare başına (sartname §4); araştırmadaki "tablo geneli" seçeneği kullanılmadı.
 *  - disp uzunluğu F·256'dır: 0..11 için 64·256, 'sub' için 16·256.
 *  - Çıktıya `profile` alanı eklendi. Ek API: generateAsync(), coefs() (PeriodicWave fallback'i ve testler için).
 *  - hq ve std aynı veriyi üretir; fark yalnız worklet'teki okuma ve mip seçimindedir.
 */
(function () {
  'use strict';

  var N0 = 2048;          // L0 kare boyu
  var K = N0 / 2 - 1;     // saklanan en yüksek harmonik (1023)
  var LEVELS = 11;        // L = 0..10
  var GUARD = 3;          // kare başına koruma örneği
  var PEAK = 0.9;
  var DISP_N = 256;
  var OS = 8 * N0;        // örnekleme yolunda 8× oversample (16384)
  var TWO_PI = 2 * Math.PI;

  // ---------- FFT (radix-2, yerinde, ölçeksiz) ----------
  // Boyut başına bit-ters indeks ve twiddle tablosu bir kez hesaplanır.
  var fftCache = {};
  function fftTables(n) {
    var T = fftCache[n];
    if (T) return T;
    var bits = Math.round(Math.log(n) / Math.LN2), rev = new Uint32Array(n);
    var cos = new Float64Array(n / 2), sin = new Float64Array(n / 2), i, r, b;
    for (i = 0; i < n; i++) {
      for (r = 0, b = 0; b < bits; b++) r = (r << 1) | ((i >>> b) & 1);
      rev[i] = r;
    }
    for (i = 0; i < n / 2; i++) { cos[i] = Math.cos(TWO_PI * i / n); sin[i] = Math.sin(TWO_PI * i / n); }
    T = fftCache[n] = { rev: rev, cos: cos, sin: sin };
    return T;
  }

  // inverse = true → e^{+i}, false → e^{−i}. 1/N ölçeği uygulanmaz; çağıran katsayıları buna göre koyar.
  function fft(re, im, inverse) {
    var n = re.length, T = fftTables(n), rev = T.rev, i, j, t;
    for (i = 0; i < n; i++) {
      j = rev[i];
      if (j > i) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    var sgn = inverse ? 1 : -1;
    for (var size = 2; size <= n; size <<= 1) {
      var half = size >> 1, step = n / size;
      for (i = 0; i < n; i += size) {
        for (j = 0; j < half; j++) {
          var wr = T.cos[j * step], wi = sgn * T.sin[j * step];
          var a = i + j, b = a + half;
          var xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr; im[b] = im[a] - xi;
          re[a] += xr; im[a] += xi;
        }
      }
    }
  }

  // Tek periyotluk fn(x), x ∈ [0,1) → c_k, s_k (k ≤ K). 8× örnekleme sayesinde k ≤ 1023 bandına
  // katlanan bileşen, yumuşak (sürekli) dalgalarda sayısal gürültü düzeyinde kalır.
  var osRe = null, osIm = null;
  function sampledCoefs(fn, c, s) {
    if (!osRe) { osRe = new Float64Array(OS); osIm = new Float64Array(OS); }
    for (var n = 0; n < OS; n++) { osRe[n] = fn(n / OS); osIm[n] = 0; }
    fft(osRe, osIm, false);
    for (var k = 1; k <= K; k++) { c[k] = 2 * osRe[k] / OS; s[k] = -2 * osIm[k] / OS; }
  }

  // ---------- Yardımcılar ----------
  function mulberry32(a) {   // P3.u.mulberry32 ile aynı; Worker P3'e erişemediği için kopya
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // J_0..J_nMax(z): Miller geri özyinelemesi, J_0 + 2ΣJ_2k = 1 ile normalize edilir.
  function besselJ(z, nMax, out) {
    var n;
    for (n = 0; n <= nMax; n++) out[n] = 0;
    if (z === 0) { out[0] = 1; return out; }
    var top = Math.max(nMax, Math.ceil(z));
    var m = 2 * Math.ceil((top + 16 + Math.sqrt(40 * top)) / 2);
    var jp1 = 0, j = 1e-30, sum = 0, jm1;
    for (var k = m; k > 0; k--) {
      jm1 = (2 * k / z) * j - jp1;      // J_{k−1}
      jp1 = j; j = jm1;
      if (k - 1 <= nMax) out[k - 1] = j;
      if (k - 1 > 0 && (k - 1) % 2 === 0) sum += 2 * j;
      if (Math.abs(j) > 1e250) {        // taşmayı önlemek için yeniden ölçekle
        j *= 1e-250; jp1 *= 1e-250; sum *= 1e-250;
        for (n = k - 1; n <= nMax; n++) out[n] *= 1e-250;
      }
    }
    sum += j;
    for (n = 0; n <= nMax; n++) out[n] /= sum;
    return out;
  }

  // Temel dalgaların Fourier katsayıları (dogrulanmis-dsp-web §5; hepsi +sin, t=0'da yükselen)
  function sawK(k) { return (2 / Math.PI) * (k % 2 ? 1 : -1) / k; }
  function triK(k) { return k % 2 ? (8 / (Math.PI * Math.PI)) * (((k - 1) / 2) % 2 ? -1 : 1) / (k * k) : 0; }
  function sqrK(k) { return k % 2 ? 4 / (Math.PI * k) : 0; }

  function ramp(j, F) { return j / (F - 1); }

  // ---------- Tablo tarifleri ----------
  // Her tarif: { F, init?() → durum, frame(j, c, s, durum) }. c, s sıfırlanmış Float64Array(K+1) gelir;
  // indeks = harmonik. init bir kez çalışır ve önbelleğe alınır (deterministik).
  // Bileşen: c_k·cos(2πkx) + s_k·sin(2πkx).

  // Organ kayıtları: drawbar sırası 16', 5⅓', 8', 4', 2⅔', 2', 1⅗', 1⅓', 1' → 16' temeline göre harmonik.
  var ORGAN_H = [1, 3, 2, 4, 6, 8, 10, 12, 16];
  // VARSAYIM: 8 kayıt koyudan parlağa sıralandı; kare 0 saf 16' (sinüs).
  var ORGAN_REG = ['800000000', '808000000', '838000000', '888000000',
                   '888600000', '888860400', '888888600', '888888888'];

  // Peterson & Barney (1952) erkek ortalaması F1/F2/F3 (Hz): A, E, I, O, U
  var VOWELS = [[730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410], [300, 870, 2240]];
  var VOWEL_G = [1, 0.5, 0.25], VOWEL_B = [80, 90, 120], VOWEL_F0 = 130.81;

  var bessel = new Float64Array(K + 2);

  var TABLES = {
    // 0 Temel Şekiller: sine → tri → saw → square; anahtar kareler 0, 21, 42, 63, aralar spektral karışım.
    0: { F: 64, frame: function (j, c, s) {
      var seg = Math.min(2, Math.floor(j / 21)), t = (j - 21 * seg) / 21;
      for (var k = 1; k <= K; k++) {
        var a = seg === 0 ? (k === 1 ? 1 : 0) : seg === 1 ? triK(k) : sawK(k);
        var b = seg === 0 ? triK(k) : seg === 1 ? sawK(k) : sqrK(k);
        s[k] = a + (b - a) * t;
      }
    } },

    // 1 Pulse: w 0.5 → 0.02. Pulse = r(t) − r(t−w) katsayılarının işareti çevrilmiş hali (bkz. SAPMA).
    1: { F: 64, frame: function (j, c, s) {
      var w = 0.5 - 0.48 * ramp(j, 64);
      for (var k = 1; k <= K; k++) {
        var g = 2 / (Math.PI * k), ph = TWO_PI * k * w;
        s[k] = g * (1 - Math.cos(ph));
        c[k] = g * Math.sin(ph);
      }
    } },

    // 2 Sinüs Katlama: sin(z·sinθ), z = πg/2, g 0 → 8. Jacobi–Anger: s_n = 2·J_n(z), yalnız tek n.
    2: { F: 64, frame: function (j, c, s) {
      var z = Math.PI * 8 * ramp(j, 64) / 2;
      if (z < 1e-9) { s[1] = 1; return; }                 // g → 0 limiti: saf sinüs
      var nMax = Math.min(K, Math.ceil(z) + 60);            // üstü < 1e−40
      besselJ(z, nMax, bessel);
      for (var n = 1; n <= nMax; n += 2) s[n] = 2 * bessel[n];
    } },

    // 3 Harmonik Tarama: f. karede ilk 1+f harmonik, 1/k.
    3: { F: 64, frame: function (j, c, s) {
      for (var k = 1; k <= j + 1; k++) s[k] = (k % 2 ? 1 : -1) / k;
    } },

    // 4 Tek↔Çift: tek harmonikler (1−t), çift harmonikler t, 1/k.
    4: { F: 64, frame: function (j, c, s) {
      var t = ramp(j, 64);
      for (var k = 1; k <= K; k++) s[k] = (k % 2 ? (1 - t) : -t) / k;
    } },

    // 5 Organ: 8 kayıt 64 kareye yayılır (anahtar kareler 0, 9, 18 … 63), drawbar düzeyi d/8.
    5: { F: 64, frame: function (j, c, s) {
      var x = j * (ORGAN_REG.length - 1) / 63, i = Math.min(ORGAN_REG.length - 2, Math.floor(x)), t = x - i;
      for (var d = 0; d < ORGAN_H.length; d++) {
        var a = +ORGAN_REG[i][d] / 8, b = +ORGAN_REG[i + 1][d] / 8;
        s[ORGAN_H[d]] += a + (b - a) * t;
      }
    } },

    // 6 Vokaller: A→E→I→O→U. Formantlar log-frekansta interpole; f0 = 130.81 Hz'de Lorentz tepeleri × k^−0.5.
    6: { F: 64, frame: function (j, c, s) {
      var x = j * 4 / 63, i = Math.min(3, Math.floor(x)), t = x - i, fm = [0, 0, 0], m, k;
      for (m = 0; m < 3; m++) fm[m] = VOWELS[i][m] * Math.pow(VOWELS[i + 1][m] / VOWELS[i][m], t);
      for (k = 1; k <= K; k++) {
        var f = k * VOWEL_F0, a = 0;
        for (m = 0; m < 3; m++) {
          var u = (f - fm[m]) / (VOWEL_B[m] / 2);
          a += VOWEL_G[m] / Math.sqrt(1 + u * u);
        }
        s[k] = a / Math.sqrt(k);
      }
    } },

    // 7 FM Tarama: sin(θ + β·sinθ), oran 1, indeks β 0 → 6 (VARSAYIM: doğrusal).
    // Jacobi–Anger kapalı formu: s_k = J_{k−1}(β) + (−1)^k·J_{k+1}(β). Şartnamedeki 8× örnekleme + FFT
    // ile aynı sonucu verir (test: 1e−15), ~6 kat daha hızlıdır.
    7: { F: 64, frame: function (j, c, s) {
      var beta = 6 * ramp(j, 64);
      if (beta === 0) { s[1] = 1; return; }
      var nMax = Math.min(K + 1, Math.ceil(beta) + 60);
      besselJ(beta, nMax, bessel);
      for (var k = 1; k < nMax; k++) s[k] = bessel[k - 1] + (k % 2 ? -1 : 1) * bessel[k + 1];
    } },

    // 8 Sync Tarama: y = sin(2πρ·x), x ∈ [0,1), ρ 1 → 8 (VARSAYIM: doğrusal).
    // Kapalı form (a = 2πρ, b = 2πk): s_k = S(a−b) − S(a+b), c_k = C(a−b) + C(a+b),
    // S(x) = sin x / x, C(x) = (1 − cos x) / x. DC atılır.
    8: { F: 64, frame: function (j, c, s) {
      var a = TWO_PI * (1 + 7 * ramp(j, 64));
      function S(x) { return Math.abs(x) < 1e-12 ? 1 : Math.sin(x) / x; }
      function C(x) { return Math.abs(x) < 1e-12 ? 0 : (1 - Math.cos(x)) / x; }
      for (var k = 1; k <= K; k++) {
        var b = TWO_PI * k;
        s[k] = S(a - b) - S(a + b);
        c[k] = C(a - b) + C(a + b);
      }
    } },

    // 9 Bitcrush: testere N seviyeye nicemlenir, N 64 → 2 (VARSAYIM: 6 → 1 bit, üstel, tamsayıya yuvarlı).
    // Kapalı form: N seviyeli merdiven = testere − (2/N)·(frac(N·v) − ½); bu terim testerenin N'in
    // katı olan harmoniklerini tam olarak siler. N = 2 → kare dalga.
    9: { F: 64, frame: function (j, c, s) {
      var N = Math.round(Math.pow(2, 6 - 5 * ramp(j, 64)));
      for (var k = 1; k <= K; k++) s[k] = k % N ? sawK(k) : 0;
    } },

    // 10 Gürültü Spektrumu: harmonik başına sabit rastgele faz (mulberry32(1234)), eğim −6 → 0 dB/okt.
    // Fazlar tüm karelerde aynı, böylece Position taramasında faz iptali olmaz.
    10: { F: 64, init: function () {
      var rnd = mulberry32(1234), ph = new Float64Array(K + 1);
      for (var k = 2; k <= K; k++) ph[k] = TWO_PI * rnd();   // VARSAYIM: temel +sin kalır (faz 0)
      return ph;
    }, frame: function (j, c, s, ph) {
      var alpha = 1 - ramp(j, 64);                          // A_k = k^−α; α = 1 → −6 dB/okt
      for (var k = 1; k <= K; k++) {
        var a = Math.pow(k, -alpha);
        s[k] = a * Math.cos(ph[k]);
        c[k] = a * Math.sin(ph[k]);
      }
    } },

    // 11 Rezonans Tarama: testere × (1 + (Q−1)·tepe), tepe merkezi harmonik 2 → 40 (üstel), Q 8.
    // VARSAYIM: tepe = bant geçiren genliği 1/√(1 + Q²(k/h − h/k)²); merkezde kazanç Q.
    11: { F: 64, frame: function (j, c, s) {
      var Q = 8, h = 2 * Math.pow(20, ramp(j, 64));
      for (var k = 1; k <= K; k++) {
        var u = Q * (k / h - h / k);
        s[k] = sawK(k) * (1 + (Q - 1) / Math.sqrt(1 + u * u));
      }
    } },

    // sub: Sub osilatörü, 16 Tone karesi. tone = 0 saf sinüs; değilse tanh(k·sin)/tanh(k), k = 10·tone.
    // Mip'li tablo olarak üretilir ki Tone yüksekken de aynı band-limited okuyucudan geçsin (sartname §6).
    sub: { F: 16, frame: function (j, c, s) {
      var kk = 10 * j / 15;
      if (kk < 0.01) { s[1] = 1; return; }                 // tone < 0.001
      var norm = 1 / Math.tanh(kk);
      sampledCoefs(function (x) { return Math.tanh(kk * Math.sin(TWO_PI * x)) * norm; }, c, s);
    } }
  };

  var initCache = {};
  function recipe(id) {
    var key = String(id), R = TABLES.hasOwnProperty(key) ? TABLES[key] : null;
    if (!R) throw new Error('unknown table id: ' + id);
    if (R.init && !initCache[key]) initCache[key] = R.init();
    return R;
  }

  function frameCoefs(id, j, c, s) {
    var R = recipe(id);
    c.fill(0); s.fill(0);
    R.frame(j, c, s, initCache[String(id)]);
  }

  // ---------- Seviyeler ve üretim ----------
  function levelLen(profile, L) { return profile === 'eco' ? Math.max(256, N0 >> L) : N0; }

  function layout(profile, F) {
    var levels = [], base = 0;
    for (var L = 0; L < LEVELS; L++) {
      var len = levelLen(profile, L);
      levels.push({ len: len, H: Math.min(1024 >> L, len / 2 - 1), base: base });
      base += F * (len + GUARD);
    }
    return { levels: levels, total: base };
  }

  function normProfile(p) { return p === 'hq' || p === 'eco' ? p : 'std'; }

  // Tek bir üretim işi; kareler tek tek işlenir (ana thread fallback'i dilimleyebilsin diye).
  function Job(id, profile) {
    var R = recipe(id);
    this.id = id;
    this.profile = normProfile(profile);
    this.F = R.F;
    var lay = layout(this.profile, R.F);
    this.levels = lay.levels;
    this.buf = new Float32Array(lay.total);
    this.disp = new Float32Array(R.F * DISP_N);
    this.c = new Float64Array(K + 1);
    this.s = new Float64Array(K + 1);
    this.work = {};   // len → {re, im}
    this.next = 0;
  }

  Job.prototype.frame = function (f) {
    frameCoefs(this.id, f, this.c, this.s);
    var gain = 0, c = this.c, s = this.s;
    for (var L = 0; L < LEVELS; L++) {
      var lv = this.levels[L], len = lv.len, H = lv.H, k, i;
      var w = this.work[len] || (this.work[len] = { re: new Float64Array(len), im: new Float64Array(len) });
      var re = w.re, im = w.im;
      re.fill(0); im.fill(0);
      // Yalnız pozitif bin'ler (c_k − i·s_k) doldurulur; ölçeksiz ters FFT'nin gerçel kısmı
      // Σ c_k cos + s_k sin verir — sartname'deki (len/2)(c_k − i·s_k) + 1/len ölçeğinin eşdeğeri.
      for (k = 1; k <= H; k++) { re[k] = c[k]; im[k] = -s[k]; }
      fft(re, im, true);
      if (L === 0) {
        var peak = 0;
        for (i = 0; i < len; i++) peak = Math.max(peak, Math.abs(re[i]));
        gain = peak > 1e-12 ? PEAK / peak : 0;
        var dstep = len / DISP_N, dbase = f * DISP_N;
        for (i = 0; i < DISP_N; i++) this.disp[dbase + i] = re[i * dstep] * gain / PEAK;
      }
      var o = lv.base + f * (len + GUARD), buf = this.buf;
      buf[o] = re[len - 1] * gain;
      for (i = 0; i < len; i++) buf[o + 1 + i] = re[i] * gain;
      buf[o + 1 + len] = re[0] * gain;
      buf[o + 2 + len] = re[1] * gain;
    }
  };

  Job.prototype.done = function () { return this.next >= this.F; };

  Job.prototype.step = function () { this.frame(this.next++); };

  Job.prototype.result = function () {
    return { t: 'tdata', id: this.id, F: this.F, N0: N0, profile: this.profile,
             levels: this.levels, buf: this.buf, disp: this.disp };
  };

  function generate(id, profile) {
    var job = new Job(id, profile);
    while (!job.done()) job.step();
    return job.result();
  }

  // Ana thread fallback: ~8 ms'lik dilimler, aralarda setTimeout(0). cb(err, result). Dönen fonksiyon iptal eder.
  function generateAsync(id, profile, cb) {
    var job, cancelled = false;
    try { job = new Job(id, profile); } catch (e) { setTimeout(function () { cb(e); }, 0); return function () {}; }
    function slice() {
      if (cancelled) return;
      try {
        var t0 = Date.now();
        while (!job.done() && Date.now() - t0 < 8) job.step();
      } catch (e) { cb(e); return; }
      if (job.done()) cb(null, job.result());
      else setTimeout(slice, 0);
    }
    setTimeout(slice, 0);
    return function () { cancelled = true; };
  }

  // Tek karenin ham katsayıları (normalize edilmemiş). PeriodicWave fallback'i: real = c, imag = s.
  function coefs(id, frame) {
    var c = new Float64Array(K + 1), s = new Float64Array(K + 1);
    frameCoefs(id, frame, c, s);
    return { c: c, s: s };
  }

  self.P3TableGen = {
    N0: N0, K: K, LEVELS: LEVELS, GUARD: GUARD,
    IDS: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 'sub'],
    generate: generate, generateAsync: generateAsync, coefs: coefs,
    layout: function (profile, F) { return layout(normProfile(profile), F || 64).levels; }
  };

  if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    self.onmessage = function (e) {
      var d = e.data || {};
      if (d.t !== 'gen') return;
      try {
        var r = generate(d.id, d.profile);
        self.postMessage(r, [r.buf.buffer, r.disp.buffer]);
      } catch (err) {
        self.postMessage({ t: 'terr', id: d.id, msg: String(err && err.message || err) });
      }
    };
  }
})();
