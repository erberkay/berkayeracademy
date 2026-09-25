/* Push 3 Laboratuvarı — ses motoru (p3-wt-engine.js)
 *
 * P3.audio: AudioContext kilidi (README A10), master zinciri, track zincirleri, görünürlük (A12), profil ve
 * CPU koruması (sartname-ses-motoru §10, A9). P3.wt: synth track başına bir AudioWorkletNode ('p3-wavetable'),
 * parametre/matris/nota mesajları, tablo üretimi (Worker) ve LRU, PeriodicWave fallback'i (§14).
 * Sözleşme: README §G7, §A9, §A10, §A12, §A13, §H3, §H6, §H7; sartname-ses-motoru §1, §4, §9, §10, §14.
 * Dosya yalnız tanım yapar; her şey P3.audio.unlock() → init() ile kurulur.
 *
 * Ses grafiği:
 *   worklet / drum sesleri → trackInput(i) = gain(dB) → StereoPanner → mute → mixBus
 *   mixBus → drive(×¼) → softClip (WaveShaper, §H7) → main(Main dB) → destination
 *   metroOut → cue(Cue dB) → destination
 *
 * Worklet protokolü koddan doğrulandı (p3-wt-worklet.js başlığı): ilk mesaj
 * {t:'init', params:[{k,min,max,curve,mod}], def, mods, bpm, profile}; 'p' indeksleri init'teki sıradır
 * (burada P3.wtp.PARAMS sırası). Tablo verisi {t:'tdata', id, F, levels, buf} worklet'in global Map'ine
 * yazılır: aynı AudioContext'teki bütün node'lar paylaşır, bu yüzden tablo bir kez ve tek node'a gönderilir.
 *
 * SAPMA/EKLEME (sözleşmede olmayan ya da belirsiz olan yerler):
 * - softClip eğrisi [−4, 4] girişini kapsar: WaveShaper ±1 dışını uç değere kırptığından önüne ×¼ kazançlı
 *   bir 'drive' düğümü konur ve eğri f(4u) olarak yazılır. f: |x| < 0.7 doğrusal, üstü tanh diz (worklet'le
 *   aynı biçim); tavan 1.0.
 * - Headphones (S.vol.phones) ayrı bir çıkış bulunmadığından sese etki etmez (sartname §1 tek çıkış VARSAYIMI).
 * - tracks.i.vol dB, tracks.i.pan −1..1 kabul edilir (VARSAYIM: Mix modu Faz 2'de kesinleşir).
 * - Matris değişikliği ('tracks.i.mods…' yolları) tek tek 'm' yerine rAF'te {t:'init', mods} ile bütün
 *   olarak gönderilir; worklet init'i params'sız da kabul eder ve matrisi baştan kurar. P3.wt.setMod ise
 *   doğrudan {t:'m'} gönderir.
 * - Cat/Tab/On değişiklikleri de rAF'te toplanır: kategori değişince Tab da sıfırlandığından ara tablo
 *   üretilmez. Faz 2 tabloları P3.wtp.audibleTable ile Temel Şekiller'e düşer; tableDisp de aynı eşlemeyi
 *   kullanır (ekrandaki dalga duyulanla aynı olsun).
 * - Tablo verisi worklet'e aktarılır (Transferable) ve ana thread'de tutulmaz; yalnız disp (64 KB) saklanır.
 *   Worklet bir tabloyu kaybederse {t:'need'} gelir ve tablo yeniden üretilir. eco ile std/hq farklı mip
 *   uzunlukları kullanır: sınıf değişince yüklü tablolar (ve 'sub') düşürülüp yeni sınıfta üretilir.
 * - Worklet henüz kurulmadan gelen tablo sonuçları node kurulunca gönderilmek üzere bekletilir.
 * - Tablo, yalnız bir osilatör onu kullanıyorsa ya da worklet istediyse kurulur; LCD'nin tableDisp isteği
 *   yalnız disp üretir (LRU çalkalanmasın). LRU sayımına 'sub' girmez; kullanılan tablolar düşürülmez.
 * - CPU ölçümü worklet'te 32 blokta bir yenilenir, meter 12 blokta bir gelir: aynı cpu değeri tekrar
 *   sayılmaz. Kademe düştükten sonra 2 sn yeni ölçüm beklenir. Kademeler: hq → std → eco → poly 6 → poly 4
 *   (ses tavanı worklet'e {t:'profile', p, cap} ile). Toplam ses bütçesi synth track sayısına bölünür.
 * - S.prefs.quality: 'auto' | 'hq' | 'std' | 'eco'. auto: mobil UA veya hardwareConcurrency ≤ 4 → eco,
 *   değilse std. Tercih değişince CPU kademeleri sıfırlanır. Etkin profil S.app.profile'a yazılır.
 * - processorerror: node yeniden kurulur (tablolar global Map'te kalır, eksikse 'need' ile gelir) ve toast
 *   gösterilir; 3 hatadan sonra PeriodicWave yoluna geçilir.
 * - Fallback (§14) sadeleştirildi: filtre zinciri Serial kabul edilir, Mono = tek ses (legato/glide yok),
 *   matris yalnız Velocity → Amp, PB ve Note PB aralıkları için okunur; Pan, FX, unison, Env2/3, LFO yok.
 *   PeriodicWave katsayıları ana thread'de P3TableGen.coefs'ten (en çok 256 harmonik); o yüklenene dek
 *   Worker'ın disp verisinden (127 harmonik), o da yoksa sinüs.
 * - bus 'table' {id}: bir tablonun disp verisi hazır olunca (LCD yeniden çizsin diye). P3.lcd.invalidate de çağrılır.
 * - Ek API: P3.wt.press(i, v) (kanal basıncı), P3.audio.trackInput(i), P3.audio.metroOut, P3.audio.ready.
 * - P3.wt.setTable(i, osc, id) Cat/Tab'ı store'a yazar ('Table' undo'su); motor 'state' olayından izler.
 * - Görünürlük: gizlenince main 20 ms'de 0'a iner, görünür olunca geri gelir ve askıdaki context resume
 *   edilir. Panic p3-input'tadır (visibilitychange/blur/pagehide).
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  var BASE = '/assets/js/push3/';
  var WORKLET_FILE = 'p3-wt-worklet.js', WORKER_FILE = 'p3-wt-tables.worker.js';
  var PROC = 'p3-wavetable';
  var BUDGET = { hq: 16, std: 16, eco: 10 };       // README A9: tüm synth track'lerinde toplam ses
  var LRU_MAX = { hq: 6, std: 6, eco: 4 };         // sartname §4
  var CPU_LIMIT = 0.7, CPU_RUNS = 3, CPU_HOLD_MS = 2000;
  var HIDE_S = 0.02;                               // A12: master 20 ms'de 0
  var MAX_ERRORS = 3;
  var CLIP_N = 8192, CLIP_RANGE = 4, KNEE = 0.7;
  var POLY = [2, 3, 4, 5, 6, 7, 8, 16];
  var FB_MAX = 8;                                  // VARSAYIM: fallback'te ses başına ~6 düğüm; 8 ses yeter
  var FB_HARM = 256, WAVE_MS = 66;                 // §14: Position değişince en çok 15 Hz yeniden üretim
  var FB_CACHE = 256;

  var A, WT;
  function noop() {}

  // ---------------------------------------------------------------- yardımcılar
  function st() { return P3.store && P3.store.S; }
  function tracks() { var s = st(); return (s && s.tracks) || []; }
  function trackAt(i) { return tracks()[i] || null; }
  function isSynth(i) { var t = trackAt(i); return !!(t && t.kind === 'synth'); }
  function version() { return (P3.K && P3.K.V) || '0'; }
  function url(file) { return BASE + file + '?v=' + version(); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function dbGain(db) { return P3.u.dbToGain(+db); }
  function nowMs() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function toast(text) { P3.bus.emit('toast', { text: text }); }
  function IDX() { return P3.wtp.IDX; }
  function pv(tr, k) {
    var i = IDX()[k];
    return tr && tr.p && tr.p.length > i ? tr.p[i] : P3.wtp.PARAMS[i].def;
  }
  function modAmt(tr, tgt, src, def) {
    var row = tr && tr.mods && tr.mods[tgt];
    return row && row[src] !== undefined ? +row[src] : def;
  }
  function idxOf(k) { return typeof k === 'number' ? k : IDX()[k]; }
  function audible(tr, osc) {
    var w = P3.wtp, o = 'o' + osc;
    return w.audibleTable(w.tableId(pv(tr, o + 'Cat'), pv(tr, o + 'Tab')));
  }
  function tableClass(profile) { return profile === 'eco' ? 'eco' : 'std'; }   // hq ve std aynı veriyi kullanır
  function curClass() { return tableClass(A.profile); }

  // AudioParam'ı tıksız değiştirir.
  function glide(param, v, tc) {
    var c = A.ctx;
    if (!c) { param.value = v; return; }
    var t = c.currentTime;
    try { param.cancelScheduledValues(t); param.setTargetAtTime(v, t, tc || 0.01); } catch (e) { param.value = v; }
  }
  // O anki değerde dondurur (cancelAndHoldAtTime yoksa son bilinen değerle).
  function hold(param, t) {
    if (typeof param.cancelAndHoldAtTime === 'function') { param.cancelAndHoldAtTime(t); return; }
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
  }

  // ---------------------------------------------------------------- durum
  function setAudioState(s) {
    A.state = s;
    var S = st();
    if (S && S.app && S.app.audio !== s) P3.store.set('app.audio', s);
  }
  function syncAudioState() {
    var c = A.ctx;
    if (!c) return;
    var s = c.state;
    if (s === 'running') setAudioState(WT.onFallback ? 'fallback' : 'running');
    else if (s === 'closed') setAudioState('off');
    else setAudioState(s === 'interrupted' ? 'interrupted' : 'suspended');
    if (s === 'running') applyMain(false);
  }

  // ---------------------------------------------------------------- kilit (A10)
  var silentEl = null;

  // 100 ms'lik 8 bit sessiz WAV; iOS'ta sessiz tuşu aşmak için medya oturumunu 'playback'e çevirir.
  function silentWav() {
    var n = 800, b = new Uint8Array(44 + n), dv = new DataView(b.buffer), i;
    function s4(o, s) { for (var k = 0; k < 4; k++) b[o + k] = s.charCodeAt(k); }
    s4(0, 'RIFF'); dv.setUint32(4, 36 + n, true); s4(8, 'WAVE'); s4(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
    s4(36, 'data'); dv.setUint32(40, n, true);
    for (i = 44; i < b.length; i++) b[i] = 128;
    var bin = '';
    for (i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(bin);
  }

  function silentLoop() {
    if (silentEl || typeof Audio === 'undefined') return;
    try {
      silentEl = new Audio();
      silentEl.setAttribute('playsinline', '');
      silentEl.setAttribute('x-webkit-airplay', 'deny');
      silentEl.loop = true;
      silentEl.src = silentWav();
      var p = silentEl.play();
      if (p && p.catch) p.catch(noop);
    } catch (e) { console.warn('[p3] sessiz ses döngüsü başlatılamadı', e); }
  }

  function createContext() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { setAudioState('failed'); return false; }
    var c;
    try { c = new AC({ latencyHint: 'interactive' }); } catch (e) {
      try { c = new AC(); } catch (e2) { console.warn('[p3] AudioContext açılamadı', e2); setAudioState('failed'); return false; }
    }
    A.ctx = c;
    if (c.addEventListener) c.addEventListener('statechange', syncAudioState);
    else c.onstatechange = syncAudioState;
    return true;
  }

  // Kullanıcı etkileşiminin içinde çağrılır: audioSession ve resume() senkron kısımda kalmalı.
  function unlock() {
    var nav = typeof navigator !== 'undefined' ? navigator : null;
    var session = !!(nav && nav.audioSession);
    if (session) { try { nav.audioSession.type = 'playback'; } catch (e) { /* salt okunur olabilir */ } }
    else if (P3.u.isIOS()) silentLoop();
    if (!A.ctx && !createContext()) return Promise.resolve(false);
    var c = A.ctx, r = null;
    try { r = c.resume ? c.resume() : null; } catch (e) { r = null; }
    var ip = init();
    return Promise.resolve(r).catch(noop).then(function () { return ip; }).then(function () {
      syncAudioState();
      return c.state === 'running';
    });
  }

  // ---------------------------------------------------------------- master ve track zincirleri
  var chains = [], hidden = false;

  // §H7: |x| < 0.7 doğrusal, üstü tanh diz; giriş [−4, 4] (önündeki ×¼ ile).
  function clipCurve() {
    var c = new Float32Array(CLIP_N);
    for (var i = 0; i < CLIP_N; i++) {
      var x = (i / (CLIP_N - 1) * 2 - 1) * CLIP_RANGE, a = Math.abs(x);
      var y = a <= KNEE ? a : KNEE + (1 - KNEE) * Math.tanh((a - KNEE) / (1 - KNEE));
      c[i] = x < 0 ? -y : y;
    }
    return c;
  }

  function buildMaster() {
    var c = A.ctx, m = A.master;
    m.mixBus = c.createGain();
    m.drive = c.createGain(); m.drive.gain.value = 1 / CLIP_RANGE;
    m.softClip = c.createWaveShaper();
    m.softClip.curve = clipCurve();
    m.softClip.oversample = '2x';
    m.main = c.createGain(); m.main.gain.value = 0;
    m.cue = c.createGain();
    A.metroOut = c.createGain();
    m.mixBus.connect(m.drive); m.drive.connect(m.softClip); m.softClip.connect(m.main); m.main.connect(c.destination);
    A.metroOut.connect(m.cue); m.cue.connect(c.destination);
  }

  function chain(i) {
    if (chains[i]) return chains[i];
    var c = A.ctx;
    if (!c || !A.master.mixBus || !trackAt(i)) return null;
    var g = c.createGain(), mute = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) { g.connect(pan); pan.connect(mute); } else g.connect(mute);
    mute.connect(A.master.mixBus);
    return (chains[i] = { gain: g, pan: pan, mute: mute });
  }

  function trackInput(i) { var ch = chain(i); return ch ? ch.gain : null; }

  var mainDb = -10;
  function applyMain(fade) {
    var p = A.master.main;
    if (!p || !A.ctx) return;
    var target = hidden ? 0 : dbGain(mainDb), t = A.ctx.currentTime;
    if (fade) {
      try { hold(p.gain, t); p.gain.linearRampToValueAtTime(target, t + HIDE_S); } catch (e) { p.gain.value = target; }
    } else glide(p.gain, target);
  }
  function setMainDb(db) { mainDb = +db; applyMain(false); }
  function setCueDb(db) { if (A.master.cue) glide(A.master.cue.gain, dbGain(db)); }
  function setTrackDb(i, db) { var ch = chain(i); if (ch) glide(ch.gain.gain, dbGain(db)); }
  function setTrackPan(i, v) { var ch = chain(i); if (ch && ch.pan) glide(ch.pan.pan, clamp(+v || 0, -1, 1)); }
  function setTrackMute(i, on) { var ch = chain(i); if (ch) glide(ch.mute.gain, on ? 0 : 1, 0.005); }

  function applyVolumes() {
    var S = st();
    if (!S || !S.vol) return;
    setMainDb(S.vol.main);
    setCueDb(S.vol.cue);
  }
  // Solo: herhangi bir track solo ise solo olmayanlar susar; mute her durumda susturur.
  function applyMix() {
    var list = tracks(), solo = list.some(function (t) { return t && t.solo; });
    list.forEach(function (t, i) {
      if (!t) return;
      setTrackDb(i, t.vol || 0);
      setTrackPan(i, t.pan || 0);
      setTrackMute(i, !!t.mute || (solo && !t.solo));
    });
  }

  function onVisibility() {
    var h = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (h === hidden) return;
    hidden = h;
    applyMain(true);
    var c = A.ctx;
    if (!h && c && c.state === 'suspended' && c.resume) { try { c.resume().catch(noop); } catch (e) { /* etkileşim gerekebilir */ } }
  }

  // ---------------------------------------------------------------- profil ve CPU koruması
  var lvl = { base: 'std', profile: 'std', poly: 16 }, cpuRuns = [], lastCpu = [], cpuHold = 0;

  function pickProfile() {
    var S = st(), q = S && S.prefs && S.prefs.quality;
    if (q === 'hq' || q === 'std' || q === 'eco') return q;
    var n = typeof navigator !== 'undefined' ? navigator : null;
    var cores = n && n.hardwareConcurrency;
    return P3.u.isMobile() || (cores && cores <= 4) ? 'eco' : 'std';
  }

  function synthCount() { return Math.max(1, tracks().filter(function (t) { return t && t.kind === 'synth'; }).length); }
  function trackCap() { return Math.max(1, Math.min(lvl.poly, Math.floor(BUDGET[lvl.profile] / synthCount()))); }

  // Etkin profili uygular; tablo sınıfı değiştiyse yüklü tablolar yeni sınıfta yeniden üretilir.
  function applyProfile() {
    var oldClass = curClass();
    A.profile = lvl.profile;
    var S = st();
    if (S && S.app && S.app.profile !== A.profile) P3.store.set('app.profile', A.profile);
    var cap = trackCap();
    eachWorklet(function (rec) { post(rec, { t: 'profile', p: A.profile, cap: cap }); });
    if (tableClass(A.profile) !== oldClass) switchClass();
  }

  function reprofile() {
    var p = pickProfile();
    lvl = { base: p, profile: p, poly: 16 };
    cpuRuns = []; lastCpu = [];
    applyProfile();
  }

  function degrade() {
    if (lvl.profile === 'hq') lvl.profile = 'std';
    else if (lvl.profile === 'std') lvl.profile = 'eco';
    else if (lvl.poly > 6) lvl.poly = 6;
    else if (lvl.poly > 4) lvl.poly = 4;
    else return false;
    cpuHold = nowMs() + CPU_HOLD_MS;
    applyProfile();
    toast(`Ses kalitesi CPU için düşürüldü`);
    return true;
  }

  // Worklet'in cpu ölçümü 32 blokta bir yenilenir; aynı değer yeni ölçüm sayılmaz.
  function checkCpu(i, cpu) {
    if (!(cpu >= 0) || cpu === lastCpu[i]) return;
    lastCpu[i] = cpu;
    if (nowMs() < cpuHold) return;
    if (cpu > CPU_LIMIT) {
      cpuRuns[i] = (cpuRuns[i] || 0) + 1;
      if (cpuRuns[i] >= CPU_RUNS) { cpuRuns = []; degrade(); }
    } else cpuRuns[i] = 0;
  }

  // ---------------------------------------------------------------- tablo üretimi (Worker → Blob → ana thread)
  var G = { mode: null, worker: null, got: false, pending: {}, failed: {}, queue: [], busy: false };
  var disp = {}, loaded = {}, want = {}, parked = {}, tick = 0, subLoaded = false;
  var tgenP = null;

  function fetchText(u) {
    if (typeof fetch !== 'function') return Promise.reject(new Error('fetch yok'));
    return fetch(u).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (t) {
      // Firebase '**' rewrite'ı yanlış yolda HTML döndürür (dogrulanmis-dsp-web §0).
      if (/^\s*</.test(t)) throw new Error('JS yerine HTML geldi');
      return t;
    });
  }
  function blobUrl(text) { return URL.createObjectURL(new Blob([text], { type: 'text/javascript' })); }

  // Worker açılamazsa üretici ana thread'e <script> olarak yüklenir (PeriodicWave katsayıları da buradan).
  function loadTableGen() {
    if (window.P3TableGen) return Promise.resolve(window.P3TableGen);
    if (tgenP) return tgenP;
    tgenP = new Promise(function (res, rej) {
      if (typeof document === 'undefined') { rej(new Error('document yok')); return; }
      var s = document.createElement('script');
      s.src = url(WORKER_FILE);
      s.onload = function () { if (window.P3TableGen) res(window.P3TableGen); else rej(new Error('P3TableGen yok')); };
      s.onerror = function () { rej(new Error('tablo üreticisi yüklenemedi')); };
      (document.head || document.documentElement).appendChild(s);
    });
    tgenP.catch(function () { tgenP = null; });
    return tgenP;
  }

  function genStart() {
    if (G.mode) return;
    if (typeof Worker === 'undefined') { genMain(); return; }
    var u = url(WORKER_FILE);
    if (!spawn(u, false)) spawnBlob(u);
  }

  function spawn(src, isBlob) {
    var w;
    try { w = new Worker(src); } catch (e) { return false; }
    G.worker = w; G.got = false; G.mode = 'worker';
    w.onmessage = function (e) { if (G.worker !== w) return; G.got = true; onGen(e.data); };
    w.onerror = function (e) {
      if (G.worker !== w) return;
      if (G.got) { console.warn('[p3] tablo Worker hatası', e && e.message); return; }
      // İlk yanıttan önceki hata = dosya yüklenemedi (404, HTML, CSP): sıradaki yola geç.
      if (e && e.preventDefault) e.preventDefault();
      try { w.terminate(); } catch (x) { /* zaten kapalı */ }
      G.worker = null; G.mode = 'starting';
      if (isBlob) genMain(); else spawnBlob(src);
    };
    redispatch();
    return true;
  }

  function spawnBlob(u) {
    G.mode = 'starting';
    fetchText(u).then(function (text) { if (!spawn(blobUrl(text), true)) genMain(); }, genMain);
  }

  function genMain() {
    G.mode = 'starting';
    loadTableGen().then(function () { G.mode = 'main'; redispatch(); }, function (e) {
      G.mode = 'failed';
      console.warn('[p3] wavetable tabloları üretilemiyor', e);
    });
  }

  function dispatch(job) {
    if (G.mode === 'worker') G.worker.postMessage({ t: 'gen', id: job.id, profile: job.profile });
    else if (G.mode === 'main') { G.queue.push(job); pump(); }
  }
  function redispatch() { for (var k in G.pending) dispatch(G.pending[k]); }

  // Ana thread üretimi: sırayla, generateAsync'in setTimeout(0) dilimleriyle (A13).
  function pump() {
    if (G.busy || !G.queue.length) return;
    var job = G.queue.shift();
    G.busy = true;
    window.P3TableGen.generateAsync(job.id, job.profile, function (err, r) {
      G.busy = false;
      onGen(err ? { t: 'terr', id: job.id, profile: job.profile, msg: String(err && err.message || err) } : r);
      pump();
    });
  }

  function request(id, cls) {
    var key = id + '|' + cls;
    if (G.pending[key] || G.failed[key]) return;   // başarısız üretim tekrar denenmez (LCD her karede sorar)
    var job = G.pending[key] = { id: id, profile: cls };
    if (!G.mode) genStart(); else dispatch(job);
  }

  function onGen(d) {
    if (!d) return;
    if (d.t === 'terr') {
      for (var k in G.pending) if (G.pending[k].id === d.id) { delete G.pending[k]; G.failed[k] = true; }
      console.warn('[p3] tablo üretilemedi:', d.id, d.msg);
      return;
    }
    if (d.t !== 'tdata') return;
    delete G.pending[d.id + '|' + d.profile];
    if (d.disp) {
      disp[d.id] = d.disp;
      P3.bus.emit('table', { id: d.id });
      if (P3.lcd && typeof P3.lcd.invalidate === 'function') P3.lcd.invalidate();
    }
    if (d.profile !== curClass() || WT.onFallback) return;   // eski sınıfın ya da fallback'in sonucu: yalnız disp
    install(d);
  }

  // Tablo verisini worklet'e aktarır. Node yoksa (worklet yükleniyor) bekletilir.
  function install(d) {
    if (d.id !== 'sub' && !want[d.id] && (!pinned()[d.id] || loaded[d.id] !== undefined)) return;
    var rec = firstWorklet();
    if (!rec) { parked[d.id] = d; return; }
    delete want[d.id];
    post(rec, { t: 'tdata', id: d.id, F: d.F, levels: d.levels, buf: d.buf }, [d.buf.buffer]);
    if (d.id === 'sub') { subLoaded = true; return; }
    loaded[d.id] = ++tick;
    evict();
  }

  function unpark() {
    for (var id in parked) { var d = parked[id]; delete parked[id]; if (d.profile === curClass()) install(d); }
  }

  function pinned() {
    var out = {};
    tracks().forEach(function (t, i) {
      if (!t || t.kind !== 'synth' || !nodes[i]) return;
      out[audible(t, 1)] = true; out[audible(t, 2)] = true;
    });
    return out;
  }

  function evict() {
    var max = LRU_MAX[A.profile] || 6, pin = pinned();
    for (;;) {
      var ids = Object.keys(loaded);
      if (ids.length <= max) return;
      var victim = null;
      ids.forEach(function (k) { if (!pin[k] && (victim === null || loaded[k] < loaded[victim])) victim = k; });
      if (victim === null) return;
      drop(+victim);
    }
  }

  function drop(id) {
    delete loaded[id];
    eachWorklet(function (rec) { post(rec, { t: 'drop', id: id }); });
  }

  function ensureTable(id) {
    if (loaded[id] !== undefined) { loaded[id] = ++tick; return; }
    want[id] = true;
    request(id, curClass());
  }

  function ensureSub() { if (!subLoaded && !WT.onFallback) request('sub', curClass()); }

  // eco ⇄ std/hq: mip uzunlukları farklı. Yüklü her şey düşer, kullanılanlar yeni sınıfta gelir.
  function switchClass() {
    Object.keys(loaded).forEach(function (id) { drop(+id); });
    if (subLoaded) { eachWorklet(function (rec) { post(rec, { t: 'drop', id: 'sub' }); }); subLoaded = false; }
    parked = {};
    if (!A.ready) return;
    ensureSub();
    tracks().forEach(function (t, i) { if (nodes[i] && nodes[i].kind === 'wl') selectTables(i, true); });
  }

  // ---------------------------------------------------------------- worklet node'ları
  var nodes = [], meters = [], pend = [], modsDirty = [], tabDirty = [], flushFn = null, errors = 0, paramMeta = null;

  function post(rec, msg, transfer) {
    try { rec.node.port.postMessage(msg, transfer || []); } catch (e) { console.warn('[p3] worklet mesajı gönderilemedi', msg && msg.t, e); }
  }
  function eachWorklet(fn) { nodes.forEach(function (r) { if (r && r.kind === 'wl') fn(r); }); }
  function firstWorklet() { for (var i = 0; i < nodes.length; i++) if (nodes[i] && nodes[i].kind === 'wl') return nodes[i]; return null; }

  function meta() {
    return paramMeta || (paramMeta = P3.wtp.PARAMS.map(function (p) {
      return { k: p.k, min: p.min, max: p.max, curve: p.curve, mod: p.mod };
    }));
  }

  function bpm() { var S = st(); return (S && S.transport && S.transport.bpm) || 120; }

  function makeWorklet(i) {
    var c = A.ctx, tr = trackAt(i), cap = trackCap(), node;
    try {
      node = new window.AudioWorkletNode(c, PROC, {
        numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
        processorOptions: { maxVoices: cap, spare: 4, profile: A.profile }
      });
    } catch (e) {
      console.warn('[p3] AudioWorkletNode kurulamadı', e);
      return null;
    }
    var rec = { kind: 'wl', node: node, i: i, tab: [-1, -1] };
    node.port.onmessage = function (e) { onNodeMsg(rec, e.data); };
    node.onprocessorerror = function () { onProcError(rec); };
    node.connect(trackInput(i));
    post(rec, { t: 'init', params: meta(), def: new Float32Array(tr.p), mods: tr.mods || {}, bpm: bpm(), profile: A.profile });
    post(rec, { t: 'profile', p: A.profile, cap: cap });
    return rec;
  }

  function ensureTrack(i) {
    if (nodes[i]) return nodes[i];
    if (!A.ctx || !A.ready || !isSynth(i) || !chain(i)) return null;
    var rec = WT.onFallback ? null : makeWorklet(i);
    if (!rec) rec = { kind: 'fb', i: i, fb: new Fb(i) };
    nodes[i] = rec;
    if (rec.kind === 'wl') {
      unpark();
      ensureSub();
      selectTables(i, true);
    }
    return rec;
  }

  function onNodeMsg(rec, d) {
    if (!d || nodes[rec.i] !== rec) return;
    if (d.t === 'meter') { meters[rec.i] = d; checkCpu(rec.i, +d.cpu); }
    else if (d.t === 'need') {
      delete loaded[d.id];   // motor yüklü sanıyordu ama worklet'te yok
      ensureTable(d.id);
    }
  }

  function onProcError(rec) {
    if (nodes[rec.i] !== rec) return;
    console.warn('[p3] worklet işlemci hatası, yeniden kuruluyor');
    try { rec.node.disconnect(); } catch (e) { /* kopuk */ }
    nodes[rec.i] = null;
    if (++errors > MAX_ERRORS) {
      fallback('processorerror');
      toast(`Ses motoru basit moda geçti`);
      return;
    }
    ensureTrack(rec.i);
    toast(`Ses motoru yeniden başlatıldı`);
  }

  // Osilatör tablolarını seçer; kullanılmayan (osilatörü kapalı) tablo üretilmez, açılınca 'need' ile gelir.
  function selectTables(i, force) {
    var rec = nodes[i], tr = trackAt(i);
    if (!rec || rec.kind !== 'wl' || !tr) return;
    for (var osc = 1; osc <= 2; osc++) {
      var id = audible(tr, osc);
      if (force || rec.tab[osc - 1] !== id) { post(rec, { t: 'tab', osc: osc, id: id }); rec.tab[osc - 1] = id; }
      if (pv(tr, 'o' + osc + 'On') >= 0.5) ensureTable(id);
    }
    evict();
  }

  // ---------------------------------------------------------------- toplu gönderim (rAF, ≤60 Hz)
  var TAB_KEYS = { o1Cat: 1, o1Tab: 1, o1On: 1, o2Cat: 1, o2Tab: 1, o2On: 1 };

  function schedule() {
    if (!flushFn) flushFn = P3.u.rafThrottle(flush);
    flushFn();
  }

  function queueParam(i, idx, v) {
    if (!(idx >= 0)) return;
    (pend[i] || (pend[i] = {}))[idx] = +v;
    if (TAB_KEYS[P3.wtp.PARAMS[idx].k]) tabDirty[i] = true;
    schedule();
  }

  function queueAll(i) {
    var tr = trackAt(i);
    if (!tr || !tr.p) return;
    var o = pend[i] = {};
    for (var k = 0; k < tr.p.length; k++) o[k] = tr.p[k];
    tabDirty[i] = true;
    schedule();
  }

  function flush() {
    var n = Math.max(pend.length, modsDirty.length, tabDirty.length);
    for (var i = 0; i < n; i++) {
      var rec = nodes[i], o = pend[i], tr = trackAt(i);
      pend[i] = null;
      if (rec && o) {
        var keys = Object.keys(o);
        if (keys.length) {
          if (rec.kind === 'wl') {
            var I = new Uint16Array(keys.length), V = new Float32Array(keys.length);
            keys.forEach(function (k, j) { I[j] = +k; V[j] = o[k]; });
            post(rec, { t: 'p', i: I, v: V }, [I.buffer, V.buffer]);
          } else rec.fb.params(keys.map(Number));
        }
      }
      if (rec && modsDirty[i] && rec.kind === 'wl' && tr) post(rec, { t: 'init', mods: tr.mods || {} });
      if (rec && tabDirty[i]) selectTables(i, false);
      modsDirty[i] = false; tabDirty[i] = false;
    }
  }

  // ---------------------------------------------------------------- store olayları (§H3)
  function syncTrack(i) {
    if (!isSynth(i)) return;
    queueAll(i);
    modsDirty[i] = true;
    schedule();
  }
  function syncAll() {
    tracks().forEach(function (t, i) { chain(i); syncTrack(i); });
    applyVolumes(); applyMix(); tempo(bpm());
    if (lvl.base !== pickProfile()) reprofile();   // CPU kademeleri yalnız tercih değişince sıfırlanır
  }

  function onState(ch) {
    if (!ch || !A.ready) return;
    var path = String(ch.path);
    if (path === '*') { syncAll(); return; }
    var q = path.split('.');
    switch (q[0]) {
      case 'tracks': {
        if (q.length < 3) { syncAll(); return; }
        var i = +q[1], f = q[2];
        if (f === 'p') {
          if (q.length === 3) queueAll(i);
          else queueParam(i, +q[3], ch.value);
        } else if (f === 'mods') {
          modsDirty[i] = true; schedule();
        } else if (f === 'vol' || f === 'pan' || f === 'mute' || f === 'solo') applyMix();
        return;
      }
      case 'vol': applyVolumes(); return;
      case 'transport': if (q.length === 1 || q[1] === 'bpm') tempo(bpm()); return;
      case 'prefs': if (q.length === 1 || q[1] === 'quality') reprofile(); return;
    }
  }

  var lastBpm = 0;
  function tempo(b) {
    b = +b;
    if (!(b > 0) || b === lastBpm) return;
    lastBpm = b;
    eachWorklet(function (rec) { post(rec, { t: 'tempo', bpm: b }); });
  }

  var offs = [];
  function listen() {
    if (offs.length) return;
    offs.push(P3.bus.on('state', onState));
    offs.push(P3.bus.on('transport', function (e) { if (e && e.bpm) tempo(e.bpm); }));
    offs.push(P3.bus.on('panic', function () { WT.panic(); }));
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', onVisibility);
      hidden = document.visibilityState === 'hidden';
      if (hidden) applyMain(false);
    }
  }

  // ---------------------------------------------------------------- worklet yükleme (A13) ve init
  var initP = null;

  function loadWorklet() {
    var c = A.ctx;
    var secure = typeof window.isSecureContext === 'undefined' || window.isSecureContext;
    if (!c.audioWorklet || typeof window.AudioWorkletNode !== 'function' || !secure) {
      return Promise.resolve(false);
    }
    var u = url(WORKLET_FILE);
    return c.audioWorklet.addModule(u).then(function () { return true; }, function (e) {
      console.warn('[p3] worklet yolu yüklenemedi, Blob deneniyor', e);
      return fetchText(u).then(function (text) {
        return c.audioWorklet.addModule(blobUrl(text)).then(function () { return true; });
      });
    }).catch(function (e) {
      console.warn('[p3] worklet yüklenemedi, basit sese geçiliyor', e);
      return false;
    });
  }

  function fallback(reason) {
    if (!WT.onFallback) console.warn('[p3] PeriodicWave fallback:', reason);
    WT.onFallback = true;
    nodes.forEach(function (rec, i) {
      if (!rec || rec.kind !== 'wl') return;
      try { rec.node.disconnect(); } catch (e) { /* kopuk */ }
      nodes[i] = null;
    });
    parked = {};
    loadTableGen().catch(noop);   // PeriodicWave katsayıları için
    if (A.ready) tracks().forEach(function (t, i) { if (t && t.kind === 'synth') ensureTrack(i); });
    syncAudioState();
  }

  function init() {
    if (initP) return initP;
    if (!A.ctx) return Promise.resolve(false);
    buildMaster();
    tracks().forEach(function (t, i) { chain(i); });
    lvl = { base: pickProfile(), profile: null, poly: 16 };
    lvl.profile = A.profile = lvl.base;
    var S = st();
    if (S && S.app && S.app.profile !== A.profile) P3.store.set('app.profile', A.profile);
    applyVolumes(); applyMix();
    listen();
    genStart();
    request('sub', curClass());
    if (P3.drums && typeof P3.drums.load === 'function') {
      Promise.resolve().then(function () { return P3.drums.load(); }).catch(function (e) { console.warn('[p3] drum kit yüklenemedi', e); });
    }
    initP = loadWorklet().then(function (ok) {
      if (!ok) fallback('worklet');
      A.ready = true;
      lastBpm = bpm();
      tracks().forEach(function (t, i) { if (t && t.kind === 'synth') ensureTrack(i); });
      syncAudioState();
      return true;
    });
    return initP;
  }

  // ---------------------------------------------------------------- zaman
  function latency() {
    var c = A.ctx;
    return { base: (c && c.baseLatency) || 0, output: (c && c.outputLatency) || 0 };
  }

  // performance.now() anını, o anda hoparlörden çıkan ctx zamanına çevirir (kayıt zamanlaması).
  function toCtxTime(perfMs) {
    var c = A.ctx;
    if (!c) return 0;
    var nowP = nowMs();
    if (perfMs == null) perfMs = nowP;
    if (typeof c.getOutputTimestamp === 'function') {
      var ts = c.getOutputTimestamp();
      if (ts && ts.performanceTime > 0 && ts.contextTime >= 0) return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
    }
    return c.currentTime - (nowP - perfMs) / 1000 - latency().base;
  }

  // ---------------------------------------------------------------- PeriodicWave fallback (§14)
  var waves = {}, waveCount = 0;

  function waveFor(id, frame) {
    var key = id + ':' + frame;
    if (waves[key]) return waves[key];
    var co = coefsFor(id, frame);
    if (!co) return null;
    if (waveCount >= FB_CACHE) { waves = {}; waveCount = 0; }
    waveCount++;
    return (waves[key] = A.ctx.createPeriodicWave(co.re, co.im));
  }

  function coefsFor(id, frame) {
    var H = FB_HARM, re, im, k, i;
    var TG = window.P3TableGen;
    if (TG && typeof TG.coefs === 'function') {
      var r = TG.coefs(id, frame);
      H = Math.min(H, r.c.length - 1);
      re = new Float32Array(H + 1); im = new Float32Array(H + 1);
      for (k = 1; k <= H; k++) { re[k] = r.c[k]; im[k] = r.s[k]; }
      return { re: re, im: im };
    }
    var d = disp[id];
    if (!d) return null;
    // disp: karede 256 nokta → DFT, 127 harmonik.
    var N = 256, o = frame * N;
    H = N / 2 - 1;
    re = new Float32Array(H + 1); im = new Float32Array(H + 1);
    for (k = 1; k <= H; k++) {
      var a = 0, b = 0, w = 2 * Math.PI * k / N;
      for (i = 0; i < N; i++) { a += d[o + i] * Math.cos(w * i); b += d[o + i] * Math.sin(w * i); }
      re[k] = 2 * a / N; im[k] = 2 * b / N;
    }
    return { re: re, im: im };
  }

  function frameOf(pos) { return Math.round(clamp(+pos || 0, 0, 1) * 63); }

  function Fb(i) { this.i = i; this.vs = []; this.pb = 0; this.press = 0; this.waveTimer = null; }

  Fb.prototype.tr = function () { return trackAt(this.i); };

  Fb.prototype.limit = function () {
    var tr = this.tr();
    if (pv(tr, 'mono') >= 0.5) return 1;   // VARSAYIM: fallback'te legato/glide yok
    return Math.max(1, Math.min(POLY[clamp(Math.round(pv(tr, 'polyIdx')), 0, 7)], trackCap(), FB_MAX));
  };

  Fb.prototype.cents = function (v) {
    var tr = this.tr();
    return (this.pb * modAmt(tr, 'PITCH', 7, 2 / 48) + v.nb * modAmt(tr, 'PITCH', 12, 1)) * 48 * 100;
  };

  Fb.prototype.level = function (vel) {
    var tr = this.tr(), a = clamp(Math.abs(modAmt(tr, 'AMP', 5, 0.5)), 0, 1);
    return 0.25 * pv(tr, 'vol') * (1 - a + a * vel / 127);
  };

  // Biquad: LP/HP'de Q dB cinsindendir, BP/Notch'ta doğrusal. Q, worklet'teki k = 2 − 1.98·(res/1.25) ile eşleşir.
  Fb.prototype.setFilter = function (b, pre, t) {
    var tr = this.tr(), type = clamp(Math.round(pv(tr, pre + 'Type')), 0, 4);
    var q = 1 / (2 - 1.98 * clamp(pv(tr, pre + 'Res') / 1.25, 0, 1));
    b.type = ['lowpass', 'highpass', 'bandpass', 'notch', 'lowpass'][type];   // Morph → LP (§14)
    var f = clamp(pv(tr, pre + 'Freq'), 20, Math.min(20000, 0.45 * A.ctx.sampleRate));
    var Q = type < 2 || type === 4 ? 20 * Math.log10(q) : q;
    if (t === undefined) { b.frequency.value = f; b.Q.value = Q; }
    else { glide(b.frequency, f, 0.01); glide(b.Q, Q, 0.01); }
  };

  Fb.prototype.prune = function (t) { this.vs = this.vs.filter(function (v) { return v.stop > t; }); };

  Fb.prototype.noteOn = function (id, midi, vel, at) {
    var c = A.ctx, tr = this.tr();
    if (!c || !tr) return;
    var t = Math.max(at == null ? c.currentTime : at, c.currentTime), self = this;
    this.prune(c.currentTime);
    this.vs.forEach(function (v) { if (!v.rel && v.id === id) self.fast(v, t); });   // aynı id: yeniden tetik
    var held = this.vs.filter(function (v) { return !v.rel; }), lim = this.limit();
    while (held.length >= lim) this.fast(held.shift(), t);

    var v = { id: id, n: midi, vel: vel, t0: t, rel: false, stop: Infinity, nb: 0, srcs: [], oscs: [], flt: [] };
    var env = v.env = c.createGain();
    env.gain.value = 0;
    env.connect(trackInput(this.i));
    var mix = v.mix = c.createGain();
    mix.gain.value = this.level(vel);
    var head = mix;
    ['f1', 'f2'].forEach(function (pre) {
      if (pv(tr, pre + 'On') < 0.5) return;
      var n = pv(tr, pre + 'Slope') >= 0.5 ? 2 : 1;
      for (var j = 0; j < n; j++) {
        var b = c.createBiquadFilter();
        self.setFilter(b, pre);
        head.connect(b); head = b;
        v.flt.push({ b: b, pre: pre });
      }
    });
    head.connect(env);

    var base = midi + pv(tr, 'transp');
    for (var osc = 1; osc <= 2; osc++) {
      var o = 'o' + osc;
      if (pv(tr, o + 'On') < 0.5) continue;
      var node = c.createOscillator(), g = c.createGain();
      this.shape(node, tr, osc);
      node.frequency.value = mtof(base + pv(tr, o + 'Transp') + pv(tr, o + 'Det'));
      node.detune.value = this.cents(v);
      g.gain.value = pv(tr, o + 'Gain');
      node.connect(g); g.connect(mix);
      v.oscs.push({ node: node, osc: osc, g: g });
      v.srcs.push(node);
    }
    if (pv(tr, 'subOn') >= 0.5) {
      var s = c.createOscillator(), sg = c.createGain();
      s.type = 'sine';
      s.frequency.value = mtof(base - 12 * clamp(Math.round(pv(tr, 'subOct')), 0, 2));
      s.detune.value = this.cents(v);
      sg.gain.value = pv(tr, 'subGain');
      s.connect(sg); sg.connect(mix);
      v.oscs.push({ node: s, osc: 0, g: sg });
      v.srcs.push(s);
    }

    // ADSR (Mod Time sürelere uygulanır). VARSAYIM: Slope'lar yok sayılır.
    var ts = Math.pow(2, 3 * clamp(pv(tr, 'modTime'), -1, 1));
    var a = Math.max(0.002, pv(tr, 'ampA') * ts), d = Math.max(0.002, pv(tr, 'ampD') * ts), sus = pv(tr, 'ampS');
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + a);
    env.gain.setTargetAtTime(sus, t + a, d / 4);
    if (!v.srcs.length) { env.disconnect(); return; }   // bütün kaynaklar kapalı
    v.srcs.forEach(function (n) { n.start(t); });
    v.srcs[0].onended = function () { try { env.disconnect(); } catch (e) { /* kopuk */ } };
    this.vs.push(v);
  };

  Fb.prototype.shape = function (node, tr, osc) {
    var w = waveFor(audible(tr, osc), frameOf(pv(tr, 'o' + osc + 'Pos')));
    if (w) node.setPeriodicWave(w); else node.type = 'sine';
  };

  Fb.prototype.end = function (v, t, tau, len) {
    if (v.rel && v.stop <= t + len) return;
    v.rel = true;
    try { hold(v.env.gain, t); v.env.gain.setTargetAtTime(0, t, tau); } catch (e) { /* ctx kapalı */ }
    v.stop = t + len;
    v.srcs.forEach(function (n) { try { n.stop(v.stop); } catch (e) { /* zaten durdu */ } });
  };
  Fb.prototype.fast = function (v, t) { this.end(v, t, 0.003, 0.03); };
  Fb.prototype.release = function (v, t) {
    var tr = this.tr(), ts = Math.pow(2, 3 * clamp(pv(tr, 'modTime'), -1, 1));
    var r = Math.max(0.003, pv(tr, 'ampR') * ts);
    this.end(v, t, r / 5, r * 1.5 + 0.05);
  };

  Fb.prototype.noteOff = function (id, at) {
    var c = A.ctx, self = this;
    if (!c) return;
    var t = Math.max(at == null ? c.currentTime : at, c.currentTime);
    this.vs.forEach(function (v) { if (!v.rel && v.id === id) self.release(v, t); });
  };

  Fb.prototype.bendAll = function () {
    var self = this;
    this.vs.forEach(function (v) { v.oscs.forEach(function (o) { glide(o.node.detune, self.cents(v), 0.005); }); });
  };
  Fb.prototype.setPb = function (x) { this.pb = clamp(+x || 0, -1, 1); this.bendAll(); };
  Fb.prototype.expr = function (id, e) {
    if (!e || !(e.bend === e.bend) || e.bend == null) return;
    this.vs.forEach(function (v) { if (!v.rel && v.id === id) v.nb = clamp(+e.bend, -1, 1); });
    this.bendAll();
  };

  // Canlı güncellenenler: Position/tablo (≤15 Hz), filtre, seviye. Diğerleri sonraki notada geçerli.
  Fb.prototype.params = function (idxs) {
    var P = P3.wtp.PARAMS, self = this, t = A.ctx.currentTime, wave = false, flt = false, lvlCh = false;
    idxs.forEach(function (i) {
      var k = P[i] && P[i].k;
      if (!k) return;
      if (/^o[12](Pos|Cat|Tab)$/.test(k)) wave = true;
      else if (/^f[12](Freq|Res|Type)$/.test(k)) flt = true;
      else if (k === 'vol' || /^o[12]Gain$/.test(k) || k === 'subGain') lvlCh = true;
    });
    if (flt) this.vs.forEach(function (v) { v.flt.forEach(function (f) { self.setFilter(f.b, f.pre, t); }); });
    if (lvlCh) {
      var tr = this.tr();
      this.vs.forEach(function (v) {
        glide(v.mix.gain, self.level(v.vel));
        v.oscs.forEach(function (o) { glide(o.g.gain, o.osc ? pv(tr, 'o' + o.osc + 'Gain') : pv(tr, 'subGain')); });
      });
    }
    if (wave && !this.waveTimer) {
      this.waveTimer = setTimeout(function () {
        self.waveTimer = null;
        var tr = self.tr();
        self.vs.forEach(function (v) { v.oscs.forEach(function (o) { if (o.osc) self.shape(o.node, tr, o.osc); }); });
      }, WAVE_MS);
    }
  };

  Fb.prototype.panic = function () {
    var c = A.ctx, self = this;
    if (!c) return;
    this.vs.forEach(function (v) { self.fast(v, c.currentTime); });
  };

  Fb.prototype.meter = function () {
    var tr = this.tr(), c = A.ctx, n = 0;
    this.vs.forEach(function (v) { if (!v.rel || (c && v.stop > c.currentTime)) n++; });
    return { voices: n, cpu: 0, pos1: pv(tr, 'o1Pos'), pos2: pv(tr, 'o2Pos'), l: 0, r: 0 };
  };

  // ---------------------------------------------------------------- nota yolu
  function rec(i) { return nodes[i] || ensureTrack(i); }
  function when(at) { return at == null ? A.ctx.currentTime : +at; }

  function noteOn(i, id, midi, vel, at) {
    var r = A.ctx && rec(i);
    if (!r) return false;
    if (r.kind === 'wl') post(r, { t: 'on', id: id, n: midi, v: vel == null ? 100 : vel, at: when(at) });
    else r.fb.noteOn(id, midi, vel == null ? 100 : vel, at);
    return true;
  }
  function noteOff(i, id, at) {
    var r = A.ctx && nodes[i];
    if (!r) return false;
    if (r.kind === 'wl') post(r, { t: 'off', id: id, at: when(at) });
    else r.fb.noteOff(id, at);
    return true;
  }
  function expr(i, id, e, at) {
    var r = A.ctx && nodes[i];
    if (!r || !e) return false;
    if (r.kind === 'wl') post(r, { t: 'x', id: id, bend: e.bend, slide: e.slide, press: e.press, at: when(at) });
    else r.fb.expr(id, e);
    return true;
  }
  function globalCtl(type) {
    return function (i, v, at) {
      var r = A.ctx && nodes[i];
      if (!r) return false;
      if (r.kind === 'wl') post(r, { t: type, v: +v, at: when(at) });
      else if (type === 'pb') r.fb.setPb(v);   // VARSAYIM: fallback'te Mod Wheel ve basınç yok
      return true;
    };
  }

  // ---------------------------------------------------------------- dış API
  A = P3.audio = {
    ctx: null, state: 'off', ready: false, profile: 'std',
    master: { mixBus: null, drive: null, softClip: null, main: null, cue: null },
    metroOut: null,
    unlock: unlock, init: init,
    trackInput: trackInput,
    setMainDb: setMainDb, setCueDb: setCueDb, setTrackDb: setTrackDb, setTrackPan: setTrackPan, setTrackMute: setTrackMute,
    latency: latency, toCtxTime: toCtxTime
  };

  WT = P3.wt = {
    onFallback: false,
    ensureTrack: ensureTrack,
    setParam: function (i, k, v) { if (A.ready && nodes[i]) queueParam(i, idxOf(k), v); },
    setMod: function (i, tgtK, srcIdx, amt) {
      var r = nodes[i];
      if (r && r.kind === 'wl') post(r, { t: 'm', tgt: tgtK, src: srcIdx | 0, amt: +amt || 0 });
    },
    // §H3: undo'lu tek kayıt; motor 'state' olayından tüm parametreleri ve matrisi yeniden gönderir.
    applyPreset: function (i, id) {
      var tr = trackAt(i);
      if (!tr || tr.kind !== 'synth') return false;
      var tmp = P3.wtp.applyPreset({ p: new Float32Array(P3.wtp.PARAMS.length), mods: {} }, id);
      if (P3.store && P3.store.S) {
        P3.store.tx('Preset', function () {
          P3.store.set('tracks.' + i + '.p', tmp.p);
          P3.store.set('tracks.' + i + '.mods', tmp.mods);
          P3.store.set('tracks.' + i + '.preset', tmp.preset);
        });
      } else { tr.p = tmp.p; tr.mods = tmp.mods; tr.preset = tmp.preset; syncTrack(i); }
      return true;
    },
    setTable: function (i, osc, tableId) {
      var tr = trackAt(i), t = P3.wtp.TABLES[tableId];
      if (!tr || tr.kind !== 'synth' || !t || (osc !== 1 && osc !== 2) || !P3.store.S) return false;
      var o = 'tracks.' + i + '.p.', I = IDX();
      P3.store.tx('Table', function () {
        P3.store.set(o + I['o' + osc + 'Cat'], t.cat);
        P3.store.set(o + I['o' + osc + 'Tab'], t.tab);
      });
      return true;
    },
    noteOn: noteOn, noteOff: noteOff, expr: expr,
    pb: globalCtl('pb'), mw: globalCtl('mw'), press: globalCtl('press'),
    tableDisp: function (tableId) {
      var id = P3.wtp.audibleTable(tableId);
      if (disp[id]) return disp[id];
      if (id !== undefined) request(id, curClass());
      return null;
    },
    meter: function (i) {
      var r = nodes[i];
      if (r && r.kind === 'fb') return r.fb.meter();
      return meters[i] || null;
    },
    panic: function () {
      nodes.forEach(function (r) {
        if (!r) return;
        if (r.kind === 'wl') post(r, { t: 'panic' }); else r.fb.panic();
      });
    }
  };
})();
