/* p3-seq.js — Push 3 Laboratuvarı: transport, zamanlayıcı, clip/step modeli ve kayıt
 *
 * Sözleşme: docs/push3/README.md §G9, §A8 (kayıt), §A12 (arka plan sekmesi), §D (clip), §H.
 * Zaman tabanı: müzikal konum beat (1 beat = çeyrek nota), ses zamanı AudioContext.currentTime (s).
 * Tempo bölütleri (segs) sayesinde tempo değişince beat konumu sıçramaz: yeni tempo, zaten planlanmış
 * olayların bittiği noktadan (lookahead ufku) başlar.
 * Zamanlayıcı Lab'deki desen: 25 ms'de bir uyanır, 100 ms ilerisini planlar (setInterval; rAF değil,
 * çünkü rAF arka planda tamamen durur). Görsel olaylar ('note', 'tick') rAF'te, ses zamanına hizalı.
 * Clip değişiklikleri yalnız P3.store üzerinden yapılır: clip kopyalanır, değiştirilir ve
 * 'tracks.i.clips.0' yoluna bütün olarak yazılır (undo'lu). Store'daki clip yerinde değiştirilmez.
 *
 * SAPMA / EKLEME (sözleşmede olmayan ya da belirsiz yerler):
 * - S.transport.rec'e 'pending' durumu eklendi (§D: idle|rec|play|overdub). Transport çalarken boş
 *   slota kayıt bir sonraki bar'ı bekler; bu sırada Record LED'i yanıp söner (p3-leds WAIT_STATES).
 *   'pending'de Record'a tekrar basmak bekleyen kaydı iptal eder (VARSAYIM).
 * - Record FSM (§A8) seçili track'in slot 0'ına bakar: clip varsa Record doğrudan overdub açar
 *   (Live Session Record davranışı; aksi hâlde kayıt mevcut pattern'i silerdi), yoksa yeni clip
 *   kaydı başlar. Böylece idle→rec→play→overdub↔play zinciri korunur, 'play'de başka bir track
 *   seçiliyse ve clip'i yoksa Record o track'e yeni kayıt başlatır.
 * - Kayıt yalnız 'rec' durumunda kaydedilen track'e, 'overdub'da slot 0'ında clip olan (arm'lı)
 *   track'e yazılır. Arm Faz 1'de hep açık; t.arm === false ise yazılmaz.
 * - Fixed Length kapalı kayıtta clip uzunluğu kayıt sürerken bar bar büyür (LED'ler notaları
 *   görsün diye), kayıt bitince yukarı tam bar'a yuvarlanır. VARSAYIM: bar çizgisinden sonraki
 *   REC_GRACE (1/16 nota) içinde basılırsa aşağı yuvarlanır ve o arada girilen notalar döngü
 *   başına sarılır (geç basılan Record fazladan boş bar üretmesin).
 * - Kayıt sürerken ('rec') kaydedilen clip çalınmaz (notalar zaten canlı duyuldu); 'play'e geçince
 *   kayıt başladığı bar'dan itibaren döngüye girer (launch fazı seq içinde tutulur, play() sıfırlar).
 * - Bir kayıt geçişinin tüm yazıları tek undo kaydında birleşir (store merge anahtarı); araya başka
 *   bir undo'lu işlem girerse sonraki notalar yeni kayıt açar. Etiketler 'Record' / 'Overdub'.
 * - recordNote: offAt verilmeyen çağrı notayı açar (geçici süre REC_OPEN_D), offAt'li ikinci çağrı
 *   aynı track+perdedeki açık notayı kapatır. İkisi birden verilirse tam nota eklenir. Overdub aynı
 *   yere (±1e-6 beat) aynı perdeyi ikinci kez yazmaz; başka birleştirme/kırpma yapılmaz.
 * - 'step' olayı {track, step, pad, op:'add'|'del'|'mute'|'unmute'} step DÜZENLEMESİNDE yayınlanır;
 *   playhead için 'tick' yeterli (ortak sözleşme). 'transport' yüküne swing ve metro eklendi.
 * - Stop: açık synth notaları kapatılır. İleriye planlanmış (≤100 ms) drum vuruşu varsa
 *   P3.drums.panic() çağrılır; drums API'si yalnız geleceği iptal edemediği için o an çalan drum
 *   kuyrukları da 10 ms'de kısılır (hayalet vuruştan iyidir). Engel kalkınca daraltılmalı.
 * - Drum track'te t.padMute[pad] / t.padSolo[pad] (p3-leds'in okuduğu alanlar) çalmayı da etkiler.
 * - Auto-follow: çalarken drum track'in görünen sayfası (tracks.i.page) çalan sayfayı izler;
 *   t.follow === false iken izlemez. setLoopPage (loop içine tek dokunuş) izlemeyi kapatır,
 *   setLoopRange açar; Page ◀▶ için modes setFollow() çağırır.
 * - Loop Selector: setLoopPage(track, page) tek dokunuş, setLoopRange(track, a, b) bas-tut + dokun
 *   ve çift dokunuş (a === b). Loop clip uzunluğunu aşarsa clip uzatılır.
 * - AudioContext yoksa ya da 'running' değilse transport performance.now saatine düşer (LED'ler ve
 *   ekran çalışır, ses planlanmaz); ses bağlamı çalışır hâle gelince saat ona devredilir.
 * - Faz 1'de tracks[i].playing yazılmaz: çalan clip her track'in slot 0'ıdır (Session Faz 2).
 * - Swing yalnız değer olarak saklanır (Faz 1; sartname-scale-note §9). Count-in, Fixed Length,
 *   Repeat, Quantize Faz 2.
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  var TICK_MS = 25;            // zamanlayıcı uyanma aralığı
  var LOOKAHEAD_S = 0.1;       // planlama ufku
  var START_S = 0.05;          // play → beat 0 gecikmesi: ilk vuruş da zamanında planlanabilsin
  var LATE_S = 0.05;           // bu kadar geciken olay hemen çalar; daha geç kalan atlanır (§A12)
  var BAR = 4;                 // Faz 1: 4/4 sabit
  var BPM_MIN = 20, BPM_MAX = 999;
  var TAP_RESET_MS = 2000;     // VARSAYIM (arastirma-modlar §6.7): 2 sn boşluk seriyi sıfırlar
  var TAP_KEEP = 5;            // 5 dokunuş = son 4 aralık
  var TAP_START = 4;           // 4/4'te 4. dokunuş çalmayı başlatır [P3 17]
  var STEP_VEL = 100, ACCENT_VEL = 127;
  var REC_GRACE = 0.25;        // VARSAYIM: bar çizgisinden sonra bu kadar içinde durdurmak aşağı yuvarlar
  var REC_OPEN_D = 0.25;       // bırakılmamış kayıt notasının geçici süresi (beat)
  var MIN_D = 1 / 64;          // en kısa nota süresi (beat)
  var SEG_KEEP_S = 10;         // geçmiş tempo bölütleri: recordNote biraz geçmişten zaman verebilir
  var EPS = 1e-9;
  // Metronom, Classic ses (sartname-ses-motoru §13): 1 kHz sinüs, 30 ms üstel sönüm, downbeat ×1.5.
  var METRO_HZ = 1000, METRO_DOWN = 1.5, METRO_DUR = 0.03, METRO_GAIN = 0.5;   // seviye VARSAYIM

  var inited = false;
  var playing = false;
  var clockCtx = null;         // çalarken kullanılan AudioContext; null → performance.now saati
  var segs = [];               // tempo bölütleri [{t, b, bpm}], t'ye göre artan
  var bpm = 120;
  var schedBeat = 0;           // bu beat'e kadar (hariç) her şey planlandı
  var timer = null, frameId = 0, frameIsRaf = false;
  var launch = [];             // track → clip döngüsünün başladığı song beat'i
  var open = [];               // çalan seq notaları {track, id, off:beat, on:s, vis}
  var vis = [];                // görsel 'note' kuyruğu {on, off, st:0|1, e}
  var lastDrumAt = -1;         // planlanan son drum vuruşunun zamanı (stop'ta gelecek var mı)
  var seqId = 0, recSeq = 0;
  var rec = { track: -1, start: 0, prev: 'idle', key: '', label: 'Record' };
  var recOpen = [];            // açık kayıt notaları {track, p, onAt, onB, t}
  var selfWrite = 0;

  // ---------------------------------------------------------------- yardımcılar
  function S() { return P3.S; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function mod(n, m) { return ((n % m) + m) % m; }
  function clone(o) { return P3.u.deepClone(o); }
  function grid(t) { return P3.scale.GRID[t.grid == null ? P3.scale.GRID_DEF : t.grid]; }
  function track(i) { var s = S(); return s && s.tracks ? s.tracks[i] || null : null; }
  function vel127(v) { return clamp(Math.round(typeof v === 'number' && v === v ? v : STEP_VEL), 1, 127); }
  function clampBpm(v) { return clamp(Math.round((+v || 120) * 100) / 100, BPM_MIN, BPM_MAX); }
  function recState() { var s = S(); return (s && s.transport && s.transport.rec) || 'idle'; }

  function audioCtx() { return (P3.audio && P3.audio.ctx) || null; }
  function perfMs() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  function now() {
    var c = playing ? clockCtx : audioCtx();
    return c ? c.currentTime : perfMs() / 1000;
  }

  // Kendi yazdığımız transport değerleri state dinleyicisinde dış değişiklik sanılmasın.
  function write(path, value, opts) {
    selfWrite++;
    try { return P3.store.set(path, value, opts); } finally { selfWrite--; }
  }
  function setRec(v) { if (recState() !== v) write('transport.rec', v); }

  function emitTransport() {
    var T = S().transport;
    P3.bus.emit('transport', { playing: playing, rec: recState(), bpm: bpm, swing: T.swing, metro: !!T.metro });
  }

  function reqFrame(fn) {
    if (typeof requestAnimationFrame === 'function') { frameIsRaf = true; return requestAnimationFrame(fn); }
    frameIsRaf = false;
    return setTimeout(fn, 16);
  }
  function cancelFrame() {
    if (!frameId) return;
    if (frameIsRaf) cancelAnimationFrame(frameId); else clearTimeout(frameId);
    frameId = 0;
  }

  // ---------------------------------------------------------------- tempo haritası
  function segAtTime(t) {
    for (var i = segs.length - 1; i > 0; i--) if (t >= segs[i].t) return segs[i];
    return segs[0];
  }
  function segAtBeat(b) {
    for (var i = segs.length - 1; i > 0; i--) if (b >= segs[i].b) return segs[i];
    return segs[0];
  }
  // Durukken harita "şimdi çalmaya başlasaydı" varsayımıyla kurulur.
  function timeToBeat(t) {
    if (!segs.length) return (t - now()) * bpm / 60;
    var s = segAtTime(t);
    return s.b + (t - s.t) * s.bpm / 60;
  }
  function beatToTime(b) {
    if (!segs.length) return now() + b * 60 / bpm;
    var s = segAtBeat(b);
    return s.t + (b - s.b) * 60 / s.bpm;
  }

  // Yeni tempo planlanmış olayların bittiği yerden başlar: ufka kadar olan olaylar eski tempoda
  // planlandı, sonrası yenisinde. Böylece beat sürekli kalır ve hiçbir olay iki kez planlanmaz.
  function retempo(v) {
    bpm = v;
    if (!playing || !segs.length) return;
    var n = now(), b = Math.max(schedBeat, timeToBeat(n)), t = beatToTime(b), last = segs[segs.length - 1];
    if (Math.abs(last.t - t) < EPS) last.bpm = v;
    else segs.push({ t: t, b: b, bpm: v });
    while (segs.length > 1 && segs[1].t < n - SEG_KEEP_S) segs.shift();
  }

  // Ses bağlamı çalma sırasında açıldıysa saat ona devredilir (o ana kadar ses planlanmadı).
  function adoptClock() {
    if (clockCtx) return;
    var c = audioCtx();
    if (!c || c.state !== 'running') return;
    var b = timeToBeat(perfMs() / 1000);
    clockCtx = c;
    segs = [{ t: c.currentTime, b: b, bpm: bpm }];
    schedBeat = Math.max(schedBeat, b);
    flushAllVis();
    open = [];
  }

  // ---------------------------------------------------------------- clip yardımcıları
  function clipPath(i, slot) { return 'tracks.' + i + '.clips.' + (slot || 0); }
  function clip(i, slot) {
    var t = track(i);
    return (t && t.clips && t.clips[slot || 0]) || null;
  }
  function newClip(len) { return { len: len, loop: [0, len], notes: [] }; }
  function loopOf(c) {
    var l = c.loop;
    return (l && l.length === 2 && l[1] > l[0]) ? l : [0, c.len || 0];
  }
  function sortNotes(notes) { notes.sort(function (a, b) { return a.t - b.t || a.p - b.p; }); }
  function writeClip(i, c, label, merge) {
    return P3.store.set(clipPath(i, 0), c, merge ? { undo: label, merge: merge } : { undo: label });
  }
  // Clip içindeki konum (beat) ya da -1. Kaydedilen clip ilk geçişte açık uçludur.
  function clipPos(i, c, b) {
    if (recState() === 'rec' && rec.track === i) { var r = b - rec.start; return r >= 0 ? r : -1; }
    var lp = loopOf(c), L = lp[1] - lp[0], base = launch[i] || 0;
    if (!(L > 0) || b < base) return -1;
    return lp[0] + mod(b - base, L);
  }
  function stepNotes(c, p, b0, b1) {
    var out = [];
    (c.notes || []).forEach(function (n, k) { if (n.p === p && n.t >= b0 - EPS && n.t < b1 - EPS) out.push(k); });
    return out;
  }
  function padSilenced(t, pad) {
    if (t.padMute && t.padMute[pad]) return true;
    if (!t.padSolo) return false;
    for (var k in t.padSolo) if (t.padSolo[k]) return !t.padSolo[pad];
    return false;
  }

  // ---------------------------------------------------------------- görsel kuyruk
  // 'note' olayı ses duyulduğu anda yayınlanır. Hiç görünmeden geçen (gizli sekme) notalar atlanır;
  // 'on'u yayınlanmış her notanın 'off'u da yayınlanır (p3-leds sayaç tutar).
  function emitNote(e, on) {
    P3.bus.emit('note', { track: e.track, note: e.note, vel: e.vel, on: on, src: 'seq' });
  }
  function flushVis(n) {
    for (var k = 0; k < vis.length;) {
      var v = vis[k];
      if (v.st === 0 && v.on <= n) {
        if (v.off <= n) { vis.splice(k, 1); continue; }
        v.st = 1;
        emitNote(v.e, true);
      }
      if (v.st === 1 && v.off <= n) { emitNote(v.e, false); vis.splice(k, 1); continue; }
      k++;
    }
  }
  function flushAllVis() {
    var q = vis;
    vis = [];
    q.forEach(function (v) { if (v.st === 1) emitNote(v.e, false); });
  }

  // ---------------------------------------------------------------- planlama
  function metroRange(b0, b1, n) {
    var c = clockCtx;
    if (!c) return;
    for (var k = Math.ceil(b0); k < b1; k++) {
      if (k >= 0) click(c, Math.max(beatToTime(k), n), k % BAR === 0);
    }
  }

  function click(c, at, down) {
    var a = P3.audio, out = a.metroOut || (a.master && a.master.cue) || c.destination;
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.value = METRO_HZ * (down ? METRO_DOWN : 1);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(METRO_GAIN, at + 0.001);
    g.gain.exponentialRampToValueAtTime(METRO_GAIN * 0.001, at + METRO_DUR);
    o.connect(g);
    g.connect(out);
    o.start(at);
    o.stop(at + METRO_DUR + 0.005);
    o.onended = function () { try { g.disconnect(); } catch (e) { /* zaten kopuk */ } };
  }

  // [b0, b1) aralığındaki clip notaları. Her aday beat aynı formülle hesaplanıp aynı sınırla
  // karşılaştırılır; ardışık aralıklar bir bölüntü olduğundan hiçbir nota iki kez planlanmaz.
  function trackRange(i, t, b0, b1, n) {
    var c = t.clips && t.clips[0];
    if (!c || !c.notes || !c.notes.length) return;
    if (recState() === 'rec' && rec.track === i) return;
    var lp = loopOf(c), L = lp[1] - lp[0], base = launch[i] || 0;
    if (!(L > 0)) return;
    for (var j = 0; j < c.notes.length; j++) {
      var note = c.notes[j];
      if (note.m || note.t < lp[0] - EPS || note.t >= lp[1] - EPS) continue;
      var off = base + (note.t - lp[0]);
      // Loop sonunda nota kesilir (Live'daki gibi).
      var d = Math.max(MIN_D, Math.min(note.d || MIN_D, lp[1] - note.t));
      for (var k = Math.floor((b0 - off) / L); ; k++) {
        var b = off + k * L;
        if (b >= b1) break;
        if (b >= b0 && b >= base - EPS) fire(i, t, note, b, d, n);
      }
    }
  }

  function fire(i, t, note, b, d, n) {
    var when = Math.max(beatToTime(b), n);
    var o = { track: i, id: null, off: b + d, on: when, vis: null };
    if (t.kind === 'drum') {
      var pad = note.p - 36;
      if (padSilenced(t, pad)) return;
      if (clockCtx && P3.drums) P3.drums.trigger(pad, note.v, when);
      if (when > lastDrumAt) lastDrumAt = when;
    } else {
      o.id = 'seq:' + (++seqId);
      if (clockCtx && P3.wt) P3.wt.noteOn(i, o.id, note.p, note.v, when);
    }
    o.vis = { on: when, off: Infinity, st: 0, e: { track: i, note: note.p, vel: note.v } };
    vis.push(o.vis);
    open.push(o);
  }

  // Note-off'lar asla atlanmaz: ufka giren her açık nota kapanır (gerekirse hemen).
  function endVoice(o, at) {
    if (o.id && clockCtx && P3.wt) P3.wt.noteOff(o.track, o.id, at);
    if (o.vis) o.vis.off = at;
  }
  function closeOffs(to, n) {
    for (var k = 0; k < open.length;) {
      var o = open[k];
      if (o.off < to) { endVoice(o, Math.max(beatToTime(o.off), n, o.on)); open.splice(k, 1); } else k++;
    }
  }
  function endTrackVoices(i, n) {
    for (var k = 0; k < open.length;) {
      if (open[k].track === i) { endVoice(open[k], Math.max(n, open[k].on)); open.splice(k, 1); } else k++;
    }
  }

  function tick() {
    if (!playing) return;
    adoptClock();
    var n = now(), s = S();
    var from = schedBeat;
    // §A12: arka planda zamanlayıcı seyrekleşir; görünür olunca beat saatten okunur ve kaçırılan
    // olaylar çalınmaz (hepsi aynı anda patlamasın).
    if (beatToTime(from) < n - LATE_S) from = timeToBeat(n);
    var to = timeToBeat(n + LOOKAHEAD_S);
    if (to > from) {
      if (s.transport.metro) metroRange(from, to, n);
      for (var i = 0; i < s.tracks.length; i++) trackRange(i, s.tracks[i], from, to, n);
    }
    schedBeat = Math.max(schedBeat, from, to);
    closeOffs(to, n);
    recUpdate(timeToBeat(n));
    flushVis(n);
  }

  function frame() {
    frameId = 0;
    if (!playing) return;
    var n = now(), b = timeToBeat(n);
    flushVis(n);
    recUpdate(b);
    follow(b);
    P3.bus.emit('tick', { beat: Math.max(0, b) });
    frameId = reqFrame(frame);
  }

  // Görünen drum sayfası çalan sayfayı izler (auto-follow).
  function follow(b) {
    var s = S();
    for (var i = 0; i < s.tracks.length; i++) {
      var t = s.tracks[i];
      if (t.kind !== 'drum' || t.follow === false) continue;
      var c = t.clips && t.clips[0];
      if (!c) continue;
      var pos = clipPos(i, c, b);
      if (pos < 0) continue;
      var pg = Math.floor(pos / P3.scale.pageBeats(t) + EPS);
      if (pg !== t.page) P3.store.set('tracks.' + i + '.page', pg);
    }
  }

  // ---------------------------------------------------------------- transport
  function play() {
    var s = S();
    if (!s) return false;
    if (playing) return true;
    var c = audioCtx();
    bpm = clampBpm(s.transport.bpm);
    playing = true;
    clockCtx = c && c.state === 'running' ? c : null;
    open = []; vis = []; launch = []; lastDrumAt = -1;
    segs = [{ t: now() + START_S, b: 0, bpm: bpm }];
    schedBeat = 0;
    write('transport.playing', true);
    timer = setInterval(tick, TICK_MS);
    tick();
    frameId = reqFrame(frame);
    emitTransport();
    return true;
  }

  function halt(n) {
    playing = false;
    if (timer !== null) { clearInterval(timer); timer = null; }
    cancelFrame();
    open.forEach(function (o) { endVoice(o, Math.max(n, o.on)); });
    open = [];
    if (lastDrumAt > n && clockCtx && P3.drums && typeof P3.drums.panic === 'function') P3.drums.panic();
    flushAllVis();
    segs = []; schedBeat = 0; clockCtx = null; lastDrumAt = -1;
  }

  // Durdurmak her kaydı bitirir (arastirma-modlar §6.2).
  function stop() {
    var s = S();
    if (!s) return false;
    var st = recState();
    if (!playing) { if (st !== 'idle') { setRec('idle'); emitTransport(); } return false; }
    var n = now();
    if (st === 'rec') finishRec(); else closeRecOpen(n);
    halt(n);
    setRec('idle');
    write('transport.playing', false);
    emitTransport();
    return true;
  }

  function toggle() { return playing ? (stop(), false) : play(); }
  function isPlaying() { return playing; }
  function beatNow() { return playing ? Math.max(0, timeToBeat(now())) : 0; }

  function setBpm(v) {
    var s = S();
    if (!s) return bpm;
    v = clampBpm(v);
    write('transport.bpm', v);
    if (v !== bpm) { retempo(v); emitTransport(); }
    return bpm;
  }

  function setSwing(pct) {
    var v = clamp(Math.round(+pct || 0), 0, 100);
    if (write('transport.swing', v)) emitTransport();
    return v;
  }

  function metronome(on) {
    var s = S();
    var v = on === undefined ? !s.transport.metro : !!on;
    if (write('transport.metro', v)) emitTransport();
    return v;
  }

  // VARSAYIM (algoritma yayınlanmamış, arastirma-modlar §6.7): son 4 aralığın ortalaması,
  // 2 sn'den uzun boşluk seriyi sıfırlar, serinin 4. dokunuşu duruk transport'u başlatır.
  function tap(tMs) {
    var s = S();
    if (!s) return bpm;
    var t = typeof tMs === 'number' ? tMs : perfMs();
    var a = (s.transport.tapTimes || []).slice();
    if (a.length && (t - a[a.length - 1] > TAP_RESET_MS || t <= a[a.length - 1])) a = [];
    a.push(t);
    if (a.length > TAP_KEEP) a = a.slice(a.length - TAP_KEEP);
    write('transport.tapTimes', a, { silent: true });
    if (a.length >= 2) setBpm(60000 / ((a[a.length - 1] - a[0]) / (a.length - 1)));
    if (a.length === TAP_START && !playing) play();
    return bpm;
  }

  // ---------------------------------------------------------------- kayıt
  function recPress() {
    var s = S();
    if (!s) return 'idle';
    var st = recState(), sel = (s.sel && s.sel.track) || 0;
    if (st === 'rec') { finishRec(); setRec('play'); }
    else if (st === 'overdub') { closeRecOpen(now()); setRec('play'); }
    else if (st === 'pending') setRec(playing ? rec.prev : 'idle');   // VARSAYIM: bekleyen kaydı iptal
    else {
      rec.prev = st;
      rec.track = sel;
      rec.key = 'rec:' + (++recSeq);
      if (clip(sel, 0)) {
        rec.label = 'Overdub';
        if (!playing) play();
        setRec('overdub');
      } else if (!playing) {
        // §A8: durukken kayıt beat 0'dan (count-in Faz 2).
        play();
        rec.start = 0;
        setRec('pending');
        beginRec();
      } else {
        // §A8: çalarken bir sonraki bar'dan (launch quantization 1 bar, VARSAYIM).
        rec.start = (Math.floor(timeToBeat(now()) / BAR + EPS) + 1) * BAR;
        setRec('pending');
      }
    }
    emitTransport();
    return recState();
  }

  // Bekleyen kayıt bar'a varınca clip açılır. O arada track'e clip girdiyse (step) overdub olur.
  function beginRec() {
    var i = rec.track;
    if (clip(i, 0)) { rec.label = 'Overdub'; setRec('overdub'); return; }
    rec.label = 'Record';
    writeClip(i, newClip(BAR), rec.label, rec.key);
    setRec('rec');
  }

  function recUpdate(b) {
    var st = recState();
    if (st === 'pending') { if (b >= rec.start - EPS) { beginRec(); emitTransport(); } return; }
    if (st !== 'rec') return;
    var c = clip(rec.track, 0);
    if (!c) { recOpen = []; setRec('play'); emitTransport(); return; }   // clip silindi / geri alındı
    var pos = b - rec.start;
    if (pos < c.len - EPS) return;
    var c2 = clone(c);
    c2.len = (Math.floor(pos / BAR + EPS) + 1) * BAR;
    c2.loop = [0, c2.len];
    writeClip(rec.track, c2, rec.label, rec.key);
  }

  // Kayıt biter: uzunluk yukarı tam bar'a yuvarlanır, clip kayıt başladığı bar'dan döngüye girer.
  function finishRec() {
    var n = now();
    closeRecOpen(n);
    var i = rec.track, c = clip(i, 0);
    if (!c) return;
    var bars = Math.max(1, Math.ceil((timeToBeat(n) - rec.start - REC_GRACE) / BAR - EPS));
    var len = bars * BAR, c2 = clone(c);
    c2.notes.forEach(function (x) { if (x.t >= len - EPS) x.t = mod(x.t, len); });
    sortNotes(c2.notes);
    c2.len = len;
    c2.loop = [0, len];
    writeClip(i, c2, rec.label, rec.key);
    launch[i] = rec.start;
  }

  function findRecOpen(i, p, onAt) {
    var best = -1, bd = Infinity;
    for (var k = 0; k < recOpen.length; k++) {
      var o = recOpen[k];
      if (o.track !== i || o.p !== p) continue;
      var d = onAt == null ? 0 : Math.abs(o.onAt - onAt);
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  // Açık notanın süresini yazar. Kayıt clip'i büyürken kırpılmaz, döngüdeki clip'te loop sonunda kesilir.
  function closeRecNote(o, offAt) {
    var c = clip(o.track, 0);
    if (!c) return false;
    var k = -1;
    for (var j = 0; j < c.notes.length; j++) if (c.notes[j].p === o.p && c.notes[j].t === o.t) { k = j; break; }
    if (k < 0) return false;
    var d = Math.max(MIN_D, timeToBeat(offAt) - o.onB);
    if (!(recState() === 'rec' && rec.track === o.track)) d = Math.max(MIN_D, Math.min(d, loopOf(c)[1] - o.t));
    var c2 = clone(c);
    c2.notes[k].d = d;
    writeClip(o.track, c2, rec.label, rec.key);
    return true;
  }

  function closeRecOpen(n) {
    var q = recOpen;
    recOpen = [];
    q.forEach(function (o) { closeRecNote(o, n); });
  }

  function addRecNote(i, p, v, onAt, offAt) {
    if (!playing) return false;
    var onB = timeToBeat(onAt);
    if (recState() === 'pending' && onB >= rec.start - EPS) beginRec();
    var st = recState(), t = track(i), c = clip(i, 0);
    if ((st !== 'rec' && st !== 'overdub') || !t || t.arm === false || !c) return false;
    var c2 = clone(c), ct, cap = Infinity;
    if (st === 'rec') {
      if (i !== rec.track) return false;
      ct = onB - rec.start;
      if (ct < -EPS) return false;   // bar'dan önce basılan nota kayda girmez
      ct = Math.max(0, ct);
      if (ct >= c2.len - EPS) { c2.len = (Math.floor(ct / BAR + EPS) + 1) * BAR; c2.loop = [0, c2.len]; }
    } else {
      var lp = loopOf(c), L = lp[1] - lp[0];
      if (!(L > 0)) return false;
      ct = lp[0] + mod(onB - (launch[i] || 0), L);
      if (ct >= lp[1] - EPS) ct = lp[0];
      cap = lp[1] - ct;
    }
    var d = offAt == null ? REC_OPEN_D : timeToBeat(offAt) - onB;
    d = Math.max(MIN_D, Math.min(d, cap));
    c2.notes = c2.notes.filter(function (x) { return !(x.p === p && Math.abs(x.t - ct) < 1e-6); });
    c2.notes.push({ t: ct, p: p, d: d, v: vel127(v), m: false });
    sortNotes(c2.notes);
    writeClip(i, c2, rec.label, rec.key);
    if (offAt == null) recOpen.push({ track: i, p: p, onAt: onAt, onB: onB, t: ct });
    return true;
  }

  // modes: note-on'da offAt'siz, note-off'ta offAt'li çağırır. Zamanlar ctx saniyesi.
  function recordNote(i, midi, vel, onAt, offAt) {
    if (!S()) return false;
    if (offAt != null) {
      var k = findRecOpen(i, midi, onAt);
      if (k >= 0) return closeRecNote(recOpen.splice(k, 1)[0], offAt);
      return onAt == null ? false : addRecNote(i, midi, vel, onAt, offAt);
    }
    return addRecNote(i, midi, vel, onAt == null ? now() : onAt, null);
  }

  // ---------------------------------------------------------------- clip ve step işlemleri
  function ensureClip(i, slot, lenBeats) {
    var t = track(i);
    if (!t) return null;
    slot = slot || 0;
    var c = clip(i, slot);
    if (c) return c;
    var len = lenBeats > 0 ? lenBeats : P3.scale.CLIP_LEN[t.grid == null ? P3.scale.GRID_DEF : t.grid];
    P3.store.set(clipPath(i, slot), newClip(len), { undo: 'Clip' });
    if (slot === 0) launch[i] = 0;
    return clip(i, slot);
  }

  // Boş step → seçili pad'in notası (vel 100, Accent'te 127, süre 1 step); dolu step → silinir.
  // İlk step clip'i CLIP_LEN[grid] uzunluğunda açar ve çalmayı başlatır (sartname-scale-note §6).
  function stepToggle(i, step, pad) {
    var t = track(i);
    if (!t || t.kind !== 'drum' || !(step >= 0)) return null;
    if (pad == null) pad = t.selPad;
    var g = grid(t), b0 = step * g.b, p = 36 + pad, s = S(), fresh = !clip(i, 0), op;
    P3.store.tx('Step', function () {
      var c = clone(ensureClip(i, 0));
      var hit = stepNotes(c, p, b0, b0 + g.b);
      if (hit.length) {
        c.notes = c.notes.filter(function (x, k) { return hit.indexOf(k) < 0; });
        op = 'del';
      } else {
        c.notes.push({ t: b0, p: p, d: g.b, v: s.accent && s.accent.on ? ACCENT_VEL : STEP_VEL, m: false });
        sortNotes(c.notes);
        op = 'add';
      }
      P3.store.set(clipPath(i, 0), c);
    });
    if (fresh && !playing) play();
    P3.bus.emit('step', { track: i, step: step, pad: pad, op: op });
    return op;
  }

  // Mute + step: step'teki notalar devre dışı kalır / geri gelir. Boş step'te bir şey olmaz.
  function stepMute(i, step, pad) {
    var t = track(i), c = clip(i, 0);
    if (!t || t.kind !== 'drum' || !c) return null;
    if (pad == null) pad = t.selPad;
    var g = grid(t), hit = stepNotes(c, 36 + pad, step * g.b, (step + 1) * g.b);
    if (!hit.length) return null;
    var c2 = clone(c), mute = !hit.every(function (k) { return c.notes[k].m; });
    hit.forEach(function (k) { c2.notes[k].m = mute; });
    writeClip(i, c2, 'Step Mute');
    P3.bus.emit('step', { track: i, step: step, pad: pad, op: mute ? 'mute' : 'unmute' });
    return mute;
  }

  // Delete + drum pad: pad'in bu clip'teki tüm notaları. Silinen nota sayısını döner (0 → modes karar verir).
  function deletePadNotes(i, pad) {
    var c = clip(i, 0);
    if (!c) return 0;
    var p = 36 + pad, keep = c.notes.filter(function (x) { return x.p !== p; }), n = c.notes.length - keep.length;
    if (!n) return 0;
    var c2 = clone(c);
    c2.notes = clone(keep);
    writeClip(i, c2, 'Delete Notes');
    return n;
  }

  // Delete tek başına: seçili clip silinir (arastirma-modlar §4.4).
  function deleteClip(i, slot) {
    slot = slot || 0;
    if (!clip(i, slot)) return false;
    P3.store.set(clipPath(i, slot), null, { undo: 'Delete Clip' });
    return true;
  }

  function pageOf(t, beat) { return Math.floor(beat / P3.scale.pageBeats(t) + EPS); }

  // Loop pad'ine tek dokunuş: clip yoksa (pad+1) loop pad'i uzunluğunda clip açılır; loop içindeyse
  // yalnız görünüm o sayfaya kilitlenir (auto-follow kapanır); loop dışındaysa loop o sayfa olur.
  function setLoopPage(i, page) {
    var t = track(i);
    if (!t || t.kind !== 'drum' || !(page >= 0)) return null;
    var lb = P3.scale.loopPadBeats(t), a = page * lb, b = a + lb, c = clip(i, 0), res;
    if (!c) {
      P3.store.tx('Loop', function () {
        ensureClip(i, 0, b);
        P3.store.set('tracks.' + i + '.page', pageOf(t, a));
      });
      return 'new';
    }
    var lp = loopOf(c);
    if (a >= lp[0] - EPS && b <= lp[1] + EPS) {
      P3.store.set('tracks.' + i + '.page', pageOf(t, a));
      P3.store.set('tracks.' + i + '.follow', false);
      return 'view';
    }
    res = setLoop(i, a, b);
    return res ? 'loop' : null;
  }

  // Bas-tut + başka loop pad'ine dokun (ya da çift dokunuş, a === b): loop tam o aralık olur.
  function setLoopRange(i, pageA, pageB) {
    var t = track(i);
    if (!t || t.kind !== 'drum' || !(pageA >= 0) || !(pageB >= 0)) return false;
    var lb = P3.scale.loopPadBeats(t);
    return setLoop(i, Math.min(pageA, pageB) * lb, (Math.max(pageA, pageB) + 1) * lb);
  }

  function setLoop(i, a, b) {
    var t = track(i);
    P3.store.tx('Loop', function () {
      var c = clone(ensureClip(i, 0, b));
      c.loop = [a, b];
      if (c.len < b) c.len = b;
      P3.store.set(clipPath(i, 0), c);
      P3.store.set('tracks.' + i + '.page', pageOf(t, a));
    });
    if (t.follow === false) P3.store.set('tracks.' + i + '.follow', true);
    return true;
  }

  function setFollow(i, on) {
    if (track(i)) P3.store.set('tracks.' + i + '.follow', !!on);
  }

  function playhead(i) {
    if (!playing) return -1;
    var c = clip(i, 0);
    if (!c) return -1;
    var b = timeToBeat(now());
    return b < 0 ? -1 : clipPos(i, c, b);
  }

  function recording() {
    return { state: recState(), track: rec.track, start: rec.start };
  }

  // ---------------------------------------------------------------- dış değişiklikler
  function onState(e) {
    if (!e || selfWrite) return;
    var s = S(), path = String(e.path);
    if (path === '*') {
      // Anlık görüntü transport'u başlatmaz; çalıyorsak durur (kayıt da biter).
      if (playing) halt(now());
      recOpen = [];
      bpm = clampBpm(s.transport.bpm);
      write('transport.bpm', bpm);
      write('transport.playing', false);
      write('transport.rec', 'idle');
      emitTransport();
      return;
    }
    if (path === 'transport.playing') { if (!!e.value !== playing) { if (e.value) play(); else stop(); } return; }
    if (path === 'transport.bpm') {
      var v = clampBpm(e.value);
      if (v !== e.value) write('transport.bpm', v);
      if (v !== bpm) { retempo(v); emitTransport(); }
      return;
    }
    var m = /^tracks\.(\d+)\.clips\.0$/.exec(path);
    if (m && !e.value && playing) endTrackVoices(+m[1], now());
  }

  function onPanic() { closeRecOpen(now()); }

  function onVisible() {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && playing) tick();
  }

  function init() {
    var s = S();
    if (!inited) {
      inited = true;
      P3.bus.on('state', onState);
      P3.bus.on('panic', onPanic);
      if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', onVisible);
    }
    if (s && !playing) {
      bpm = clampBpm(s.transport.bpm);
      write('transport.bpm', bpm);
      write('transport.playing', false);
      write('transport.rec', 'idle');
    }
    return P3.seq;
  }

  P3.seq = {
    init: init, play: play, stop: stop, toggle: toggle, isPlaying: isPlaying,
    beatNow: beatNow, beatToTime: beatToTime, timeToBeat: timeToBeat,
    tap: tap, setBpm: setBpm, setSwing: setSwing, metronome: metronome,
    recPress: recPress, recordNote: recordNote, recording: recording,
    clip: clip, ensureClip: ensureClip, deleteClip: deleteClip,
    stepToggle: stepToggle, stepMute: stepMute, deletePadNotes: deletePadNotes,
    setLoopPage: setLoopPage, setLoopRange: setLoopRange, setFollow: setFollow,
    playhead: playhead,
    BAR: BAR
  };
})();
