/* p3-drums.js — Push 3 Laboratuvarı: drum kit ('p3kit')
 *
 * Drum track'in ses kaynağı: gerçek bir Drum Rack gibi 16 pad'lik görünür bank,
 * 4 sample (Kick, Snare, Closed Hat, Open Hat) + 4 prosedürel ses (Rim, Clap,
 * Tom, Crash). Kalan 8 pad boştur ve sessiz kalır (README A7).
 *
 * Ses grafiği (sartname-ses-motoru §1):
 *   kaynak(lar) → [zarf] → voice.out (pad kazancı + choke rampası) → trackInput(1)
 *   trackInput yoksa P3.audio.master.mixBus'a, o da yoksa destination'a bağlanır.
 *   drumGain → pan → mute zinciri engine'e (p3-wt-engine.js) aittir.
 *
 * Zamanlama: tüm sesler ctx zamanıyla (`when`, saniye) planlanır; seq 100 ms ileriye
 * planladığı için choke ve panic "şu an" değil, verilen zamanda çalışır.
 *
 * SAPMA/EKLEME (README G8'e göre):
 *  - Lab'deki synthDrum yalnız Kick/Snare/Hat/Bass tarifi içeriyor; Rim, Clap, Tom,
 *    Crash orada yok. Bunlar aynı sentez fikriyle (osilatör + perde zarfı, gürültü +
 *    filtre, üstel sönüm) sıfırdan tasarlandı. Seviyeler VARSAYIM, kulakla ayarlanır.
 *  - Choke, Drum Rack'teki choke grubu gibi simetrik: aynı gruptaki bir pad çalınca
 *    gruptaki diğer pad'lerin sesleri susar. Closed Hat → Open Hat (sözleşme) bunun
 *    özel hali; Open Hat da Closed Hat'in kuyruğunu keser (duyulmaz, zararsız).
 *  - KIT slotlarına `note` (36 + pad) ve sample slotlarına `file` alanı eklendi.
 *    Boş slotun adı '' — LCD isterse nota adını gösterir.
 *  - hasSound(pad): slot doluysa ve sample'ı yüklenemediyse değilse true. Yükleme
 *    sürerken true döner ki pad LED'leri açılışta gri yanıp sönmesin.
 *  - load() bitince P3.bus.emit('drums', {ready:true, failed:[pad…]}) — LED/LCD
 *    başarısız pad'i griye çekebilsin diye.
 *  - panic() (bus 'panic' olayı da) ileriye planlanmış sesleri de iptal eder.
 *  - Aynı anda en fazla MAX_VOICES drum sesi; aşılırsa en eski ses choke edilir.
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  var DRUM_TRACK = 1;          // P3.K.TRACKS: id 1 = Drums
  var CHOKE_S = 0.010;         // choke/panic rampası (sözleşme: 10 ms)
  var MAX_VOICES = 24;         // VARSAYIM: repeat + uzun crash kuyruklarında CPU sınırı
  var NOISE_S = 2.5;           // paylaşılan gürültü tamponu; crash kuyruğundan uzun
  var SAMPLE_DIR = '/assets/audio/';

  // 16 slot, pad = nota − 36. Sample adları dosya adlarıyla birebir (boşluk ve parantez dahil).
  var SLOTS = {
    0:  { name: 'Kick',       kind: 'sample', file: 'Kick.wav' },
    1:  { name: 'Rim',        kind: 'synth' },
    2:  { name: 'Snare',      kind: 'sample', file: 'Snare.wav' },
    3:  { name: 'Clap',       kind: 'synth' },
    5:  { name: 'Tom',        kind: 'synth' },
    6:  { name: 'Closed Hat', kind: 'sample', file: 'Close Hat.wav' },
    10: { name: 'Open Hat',   kind: 'sample', file: 'Open Hat (1).wav' },
    13: { name: 'Crash',      kind: 'synth' }
  };

  // Choke grubu: pad → grup no. VARSAYIM: yalnız hi-hat'ler aynı grupta.
  var CHOKE_GROUP = { 6: 1, 10: 1 };

  var KIT = [];
  for (var i = 0; i < 16; i++) {
    var s = SLOTS[i];
    KIT.push(s
      ? (s.file ? { pad: i, note: 36 + i, name: s.name, kind: s.kind, file: s.file }
                : { pad: i, note: 36 + i, name: s.name, kind: s.kind })
      : { pad: i, note: 36 + i, name: '', kind: null });
  }

  var buffers = {};            // pad → AudioBuffer
  var failed = {};             // pad → true (yüklenemedi, sessiz)
  var noise = null;            // paylaşılan beyaz gürültü (mono)
  var voices = [];             // çalan veya planlanmış sesler
  var loading = null;          // load() tek sefer çalışsın
  var offPanic = null;

  function ctxNow() { return P3.audio && P3.audio.ctx; }

  function output(ctx) {
    var a = P3.audio;
    var node = typeof a.trackInput === 'function' ? a.trackInput(DRUM_TRACK) : null;
    return node || (a.master && a.master.mixBus) || ctx.destination;
  }

  // VARSAYIM (sartname-ses-motoru §13): doğrusal hız → kazanç.
  function padGain(vel) { return 0.8 * vel / 127; }

  // Safari'nin eski sürümleri decodeAudioData'yı yalnız callback'le destekler.
  function decode(ctx, ab) {
    return new Promise(function (res, rej) {
      var p = ctx.decodeAudioData(ab, res, rej);
      if (p && typeof p.then === 'function') p.then(res, rej);
    });
  }

  function loadSample(ctx, slot) {
    var url = SAMPLE_DIR + encodeURIComponent(slot.file);
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (ab) { return decode(ctx, ab); })
      .then(function (buf) { buffers[slot.pad] = buf; })
      .catch(function (err) {
        failed[slot.pad] = true;
        console.warn(`[p3] drum sample yüklenemedi, pad ${slot.pad} sessiz: ${url}`, err);
      });
  }

  // Tekrarlanabilir gürültü: her Clap/Crash aynı "sample" gibi duyulur, Drum Rack'teki gibi.
  function makeNoise(ctx) {
    var len = Math.floor(ctx.sampleRate * NOISE_S);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var rnd = (P3.u && P3.u.mulberry32) ? P3.u.mulberry32(0x70336b) : Math.random;
    for (var j = 0; j < len; j++) d[j] = rnd() * 2 - 1;
    return buf;
  }

  /* ---------- ses kaydı (voice) ---------- */

  function newVoice(ctx, pad, vel, when) {
    var out = ctx.createGain();
    var g = padGain(vel);
    out.gain.value = g;
    out.connect(output(ctx));
    var v = { pad: pad, t0: when, end: when, out: out, gain: g, srcs: [], live: 0, chokeAt: Infinity };
    voices.push(v);
    return v;
  }

  // Kaynağı sese bağlar ve planlar. stopAt yoksa (sample) tamponun sonunda kendiliğinden biter.
  // dest null ise kaynak zaten bağlanmıştır (osc() yardımcısı).
  function play(v, src, dest, startAt, stopAt, offset) {
    if (dest) src.connect(dest);
    if (offset) src.start(startAt, offset); else src.start(startAt);
    if (stopAt) src.stop(stopAt);
    var end = stopAt || (startAt + src.buffer.duration);
    if (end > v.end) v.end = end;
    v.srcs.push(src);
    v.live++;
    src.onended = function () { if (--v.live === 0) retire(v); };
  }

  function retire(v) {
    var k = voices.indexOf(v);
    if (k >= 0) voices.splice(k, 1);
    try { v.out.disconnect(); } catch (e) { /* zaten kopuk */ }
  }

  // onended gelmeyen (ör. start'tan önce durdurulan) sesleri listeden düşürür.
  function prune(now) {
    for (var k = voices.length - 1; k >= 0; k--) {
      if (voices[k].end + 0.05 < now) retire(voices[k]);
    }
  }

  // v'yi `when` anında 10 ms'de susturur. Daha erken planlanmış bir choke varsa dokunmaz;
  // daha geç planlanmışsa onu geri alıp öne çeker.
  function silence(v, when) {
    if (v.chokeAt <= when) return;
    var p = v.out.gain;
    p.cancelScheduledValues(when);
    p.setValueAtTime(v.gain, when);
    p.linearRampToValueAtTime(0, when + CHOKE_S);
    v.chokeAt = when;
    var stopAt = when + CHOKE_S + 0.002;
    for (var k = 0; k < v.srcs.length; k++) {
      // Eski Safari ikinci stop() çağrısında InvalidStateError atabilir.
      try { v.srcs[k].stop(Math.max(stopAt, 0)); } catch (e) { /* zaten durdu */ }
    }
    if (stopAt < v.end) v.end = stopAt;
  }

  function stealOldest(t) {
    for (var k = 0; k < voices.length; k++) {
      if (voices[k].chokeAt === Infinity) { silence(voices[k], t); return; }
    }
  }

  /* ---------- zarf yardımcıları ---------- */

  // 0 → peak (doğrusal atak, tık önler) → −60 dB (üstel sönüm). Bitiş zamanını döner.
  function decayEnv(param, t, peak, atk, dec) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + atk);
    param.exponentialRampToValueAtTime(peak * 0.001, t + atk + dec);
    return t + atk + dec;
  }

  function gainNode(ctx, dest) {
    var g = ctx.createGain();
    g.gain.value = 0;
    g.connect(dest);
    return g;
  }

  function filter(ctx, type, freq, q, dest) {
    var f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    f.connect(dest);
    return f;
  }

  function osc(ctx, type, freq, dest) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(dest);
    return o;
  }

  function noiseSrc(ctx) {
    var n = ctx.createBufferSource();
    n.buffer = noise;
    return n;
  }

  /* ---------- prosedürel sesler ----------
   * Hepsi voice.out'a bağlanır; tepe seviyesi ≈ sample'larla uyumlu olacak şekilde
   * (sample tepe ≈ 0 dBFS) ayarlanmıştır. Frekans ve sürelerin hepsi VARSAYIM.
   */
  var SYNTH = {
    // Rim: 808 tarzı iki rezonans tonu (≈ 480 Hz + 1.7 kHz) + kısa tahta tıkı.
    1: function (ctx, v, t) {
      var body = gainNode(ctx, filter(ctx, 'highpass', 300, 0.7, v.out));
      var end = decayEnv(body.gain, t, 0.45, 0.001, 0.055);
      play(v, osc(ctx, 'triangle', 480, body), null, t, end + 0.01);
      play(v, osc(ctx, 'sine', 1720, body), null, t, end + 0.01);
      var click = gainNode(ctx, filter(ctx, 'bandpass', 4000, 1.2, v.out));
      var cEnd = decayEnv(click.gain, t, 1.0, 0.0005, 0.012);
      play(v, noiseSrc(ctx), click, t, cEnd + 0.005, 0.37);
    },

    // Clap: bant geçiren gürültü; üç hızlı patlama (farklı eller) + kısa oda kuyruğu.
    3: function (ctx, v, t) {
      var g = gainNode(ctx, filter(ctx, 'bandpass', 1200, 1.1, filter(ctx, 'highpass', 500, 0.7, v.out)));
      var p = g.gain;
      var peak = 2.2;                         // bant geçiren filtre seviyeyi ≈ −12 dB düşürür
      p.setValueAtTime(0, t);
      for (var k = 0; k < 3; k++) {
        var tk = t + k * 0.011;
        p.setValueAtTime(peak, tk);
        p.exponentialRampToValueAtTime(peak * 0.12, tk + 0.009);
      }
      var tail = t + 0.033;
      p.setValueAtTime(peak * 0.85, tail);
      p.exponentialRampToValueAtTime(peak * 0.001, tail + 0.22);
      play(v, noiseSrc(ctx), g, t, tail + 0.23, 0.91);
    },

    // Tom (low tom): perdesi 170 → 95 Hz inen sinüs + çubuk tıkı.
    5: function (ctx, v, t) {
      var body = gainNode(ctx, v.out);
      var end = decayEnv(body.gain, t, 0.9, 0.002, 0.5);
      var o = osc(ctx, 'sine', 170, body);
      o.frequency.setValueAtTime(170, t);
      o.frequency.exponentialRampToValueAtTime(95, t + 0.18);
      play(v, o, null, t, end + 0.01);
      var click = gainNode(ctx, filter(ctx, 'bandpass', 1500, 0.8, v.out));
      var cEnd = decayEnv(click.gain, t, 0.5, 0.0005, 0.02);
      play(v, noiseSrc(ctx), click, t, cEnd + 0.005, 1.53);
    },

    // Crash: yüksek geçiren gürültü + 808 zili gibi altı kare dalganın metalik katmanı.
    // Önce hızlı düşüş (vuruş), sonra uzun kuyruk.
    13: function (ctx, v, t) {
      var n = gainNode(ctx, filter(ctx, 'highpass', 4500, 0.7, v.out));
      crashEnv(n.gain, t, 0.6);
      var metal = gainNode(ctx, filter(ctx, 'highpass', 6000, 0.7, filter(ctx, 'bandpass', 8000, 0.7, v.out)));
      var end = crashEnv(metal.gain, t, 0.2);
      var freqs = [205.3, 304.4, 369.6, 522.7, 540, 800];   // 808 zil osilatörleri
      var mix = ctx.createGain();
      mix.gain.value = 1 / freqs.length;
      mix.connect(metal);
      for (var k = 0; k < freqs.length; k++) play(v, osc(ctx, 'square', freqs[k], mix), null, t, end + 0.02);
      play(v, noiseSrc(ctx), n, t, end + 0.02, 0);
    }
  };

  function crashEnv(p, t, peak) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + 0.003);
    p.exponentialRampToValueAtTime(peak * 0.35, t + 0.12);
    p.exponentialRampToValueAtTime(peak * 0.001, t + 2.3);
    return t + 2.3;
  }

  /* ---------- dış API ---------- */

  function hasSound(pad) {
    var slot = KIT[pad];
    return !!(slot && slot.kind && !failed[pad]);
  }

  function choke(pad, when) {
    var ctx = ctxNow();
    if (!ctx) return;
    var t = Math.max(when === undefined ? 0 : when, ctx.currentTime);
    for (var k = voices.length - 1; k >= 0; k--) {
      var v = voices[k];
      // `when`'den sonra başlayacak sesler (seq'in ileriye planladıkları) etkilenmez.
      if (v.pad === pad && v.t0 <= t) silence(v, t);
    }
  }

  function trigger(pad, vel, when) {
    var ctx = ctxNow();
    if (!ctx || !hasSound(pad)) return false;
    var slot = KIT[pad];
    if (slot.kind === 'sample' && !buffers[pad]) return false;   // henüz yüklenmedi
    if (slot.kind === 'synth' && !noise) return false;           // load() çağrılmadı

    var now = ctx.currentTime;
    var t = Math.max(when === undefined ? now : when, now);
    var raw = typeof vel === 'number' ? vel : ((P3.K && P3.K.kbVel) || 100);
    var velo = Math.max(1, Math.min(127, Math.round(raw)));

    prune(now);
    var grp = CHOKE_GROUP[pad];
    if (grp) {
      for (var p in CHOKE_GROUP) {
        if (CHOKE_GROUP[p] === grp && +p !== pad) choke(+p, t);
      }
    }
    if (voices.length >= MAX_VOICES) stealOldest(t);

    var v = newVoice(ctx, pad, velo, t);
    if (slot.kind === 'sample') {
      var src = ctx.createBufferSource();
      src.buffer = buffers[pad];
      play(v, src, v.out, t);
    } else {
      SYNTH[pad](ctx, v, t);
    }
    return true;
  }

  function panic() {
    var ctx = ctxNow();
    if (!ctx) return;
    var t = ctx.currentTime;
    for (var k = voices.length - 1; k >= 0; k--) silence(voices[k], t);
  }

  function load() {
    if (loading) return loading;
    var ctx = ctxNow();
    if (!ctx) {
      console.warn(`[p3] drums.load: AudioContext hazır değil`);
      return Promise.resolve(false);
    }
    if (!offPanic && P3.bus) offPanic = P3.bus.on('panic', panic);
    noise = makeNoise(ctx);
    var jobs = [];
    for (var k = 0; k < KIT.length; k++) {
      if (KIT[k].kind === 'sample') jobs.push(loadSample(ctx, KIT[k]));
    }
    loading = Promise.all(jobs).then(function () {
      P3.drums.ready = true;
      var bad = [];
      for (var f in failed) bad.push(+f);
      if (P3.bus) P3.bus.emit('drums', { ready: true, failed: bad });
      return true;
    });
    return loading;
  }

  P3.drums = {
    KIT: KIT,
    ready: false,
    load: load,
    hasSound: hasSound,
    trigger: trigger,
    choke: choke,
    panic: panic
  };
})();
