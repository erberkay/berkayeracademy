/* Push 3 Laboratuvarı — öğretici (p3-tutorial.js)
 *
 * Öğretici motoru ve müfredat (P3.tut). Sözleşme: docs/push3/README.md §G13, §F (tek müfredat kaynağı),
 * §A15, §I; motor ve adım şeması sartname-ogretici.md §3–§5. Adım metinleri mufredat.md'den alındı ve
 * gerçek emülatör davranışına (p3-modes, p3-seq, p3-wt-params, p3-leds) göre düzeltildi.
 *
 * Akış: start(bölüm, adım) → bölümün setup(emu)'su → adımın stepSetup(emu)'su → rt → her 'in', 'state',
 * 'note', 'transport' ve 'step' olayında rAF'te en çok karede bir check(S, rt). Olaylar rt'ye anında
 * yazılır (sıra kaybolmasın); koşul kare başına bir kez değerlendirilir.
 * Kilit: P3.app.allow(step.allow) + P3.leds.setDisabled(tamamlayan). İpucu: 8 sn hareketsizlik ya da
 * 2 yanlış kontrol → hints[0]; 20 sn ya da 4 yanlış → P3.leds.setTarget(targets) (+ varsa hints[1]).
 * Başarı: hedefte P3.leds.flash + .p3-hl.correct ve success metni; action 1200 ms sonra kendiliğinden
 * ilerler, concept Devam ister, free 'Bitirdim →' ister. İlerleme P3.save 'tutorial' (sartname-ogretici §3).
 *
 * Koşullar yalnız gerçek S yollarını okur: S.scale.*, S.overlay, S.bankView, S.wtui.*, S.strip.*, S.vol.main,
 * S.sel.track, S.app.audio, tracks[0].p[P3.wtp.IDX.k], tracks[0].mods (kaynak indeksi P3.wtp.SOURCES sırası:
 * 3 = LFO 1, 9 = Mod Wheel), tracks[1].selPad ve tracks[1].clips[0].notes {t (beat), p (36 + pad), d, v, m}.
 * Her adımın stepSetup'ı kendi hedefini sıfırlar: setup + stepSetup sonrası check her zaman false'tur.
 *
 * SAPMA / EKLEME:
 * - CURRICULUM bölüm dizisidir: {id, phase, title, short, summary, estMin, setup(emu), steps}. Faz 2
 *   bölümleri yalnız başlık/özet taşır (phase 2, steps []); LCD Learn ve İçindekiler '(yakında)' gösterir.
 * - Adım şemasına isteğe bağlı alanlar: anchor (coach balonunun demir noktası), autoMs (action'da ilerleme
 *   gecikmesi; Learn adımında 3 sn, Learn sayfası görülebilsin); targets S → dizi döndüren fonksiyon olabilir.
 * - Aynı konudaki adımlar birleştirildi (görev kuralı): Device + bank görünümü tek adım; kick seçme +
 *   kick {0,4,8,12} tek adım; Delete + pad ve Undo tek adım. Faz 1 toplamı 8 bölüm, 52 adım.
 * - Olaylar: start() bus '*' aboneliği kurar, stop() kaldırır. onEvent(type, payload) herkese açıktır; aynı
 *   payload nesnesi iki kez gelirse (hem bus hem app iletirse) ikincisi yok sayılır.
 * - rt ek alanları: n (olay sıra numarası), turns, steps, vals/last (yol başına 'state' geçmişi),
 *   heldChange (değişiklik nota basılıyken mi oldu), mods (basıştaki modifier'lar). Sıralama
 *   performance.now yerine olay sıra numarasıyla yapılır (aynı ms'deki olaylar karışmasın).
 * - emu sözleşmedekiler (load, set, openOverlay, select, resetTrack) + e.S (emülatör durumu) + preset'tir.
 *   setup/stepSetup'lar yalnız load/set/openOverlay/select ve e.S kullanır (scaleTo, bankTo, paramsTo…
 *   yardımcıları {yol: değer} haritası kurar); p3-selftest'in ayrık test emu'su da aynı kurulumu üretir.
 *   emu.set: prefs.* yazımı adım süresince geçerlidir (çıkışta geri alınır), strip.pb/mod motora da iletilir.
 *   emu.load('tutorial-base') P3.store.restore ile yapılır; S.app, S.prefs ve S.vol korunur (öğrencinin
 *   ayarladığı ses seviyesi bölümden bölüme sıfırlanmasın), vol.target 'main' olur.
 * - P3.tut.makeRt(S): verilen durumdan kurulum anındaki rt (p3-selftest'in check(setup) testi için).
 * - Hedef çerçevesi (setTarget) yalnız 2. kademede çizilir; coach balonu adım başında (prefs.hints açıksa)
 *   `do` metniyle hedefe demirlenir, 1. kademede ipucu balona eklenir (balon kapalıysa bus 'feedback').
 * - Yanlış kontrol: hedef olmayan bir kontrole basış/dönüş. İzinli pad'ler (deneme alanı), Play, Volume ve
 *   encoder'a dokunmak (fareyle üstünden geçmek) sayılmaz; aynı encoder'ın ardışık dönüşleri bir kez sayılır.
 * - Velocity adımı prefs.velMode'u adım süresince 'position' yapar, çıkışta eski değer geri yazılır. Eşik
 *   |Δvel| ≥ 30 (mufredat 40): klavyede Shift (70) ile normal (100) arası da yetsin.
 * - Akor adımı: üç nota birlikte basılıyken ya da fareyle son üç nota 2 sn içinde çalınınca tamamlanır.
 *   Metin düzeltmesi: şekil ızgaranın her yerinde "majör" değil, gamdaki yerine göre majör ya da minör
 *   üçlü verir (kılavuz "triads" der; In Key'de şekil gam derecelerine göre değişir).
 * - Add to Matrix adımında LFO 1 miktarı |a| ≥ 0.3 (§F "≠ 0" yerine mufredat.md 5.7): küçük miktar duyulmaz.
 * - Wavetable Position'ın gri görünmesi yanlıştı (mufredat 4.5): kapalı osilatörde yalnız Category, Table,
 *   Effect Type ve Pitch gri olur (p3-wt-params dis bayrağı).
 * - Sub eşiği -3 dB (0.708): varsayılan Sub Gain -6 dB (0.501) olduğundan ≥0.5 kurulumda doğru olurdu.
 * - "Encoder ile ses duyuldu" koşulları: değişiklik bir nota basılıyken olduysa ya da son değişiklikten
 *   sonra bir nota çalındıysa sağlanır; yalnız fare kullanan öğrenci de adımı bitirebilsin.
 * - Kilit mesajı ve kapı yardımcıları: P3.tut.isAllowed(ev) (app gate'inin kullanabileceği kural),
 *   P3.tut.blockedText(ev) (`Bu adımda … ile ilgileniyoruz.`). Öğretici kilit için kendisi feedback yaymaz.
 *   P3.app.allow varsa LED karartmasını (setDisabled) app yapar; yoksa öğretici tamamlayanı kendisi yazar.
 * - App ile: her adımda P3.app.setHash('ogretici/<bölüm>/<adım>') (yenilenen sayfa aynı adımdan açılır);
 *   telefonda adımın hedefleri çalma görünümünde görünmüyorsa P3.app.setView ile geçici görünüm (controls /
 *   padsStrip / full), hedefler sığınca P3.app.setView(null). resetProgress() app'in sıfırlamasından sonra çağrılır.
 * - Ek API: hint() (ipucunu bir kademe ilerletir; #p3HintBtn için), evaluate() (bekleyen koşulu hemen
 *   değerlendirir; test/selftest), current() (etkin bölüm/adım durumu), free() ('Serbest Çal'da aç':
 *   P3.tut.handoff = {keep:true} yazar ve #serbest'e geçer; app bu işareti görünce seti korumalı).
 * - Odak: adım değişince odak #p3TutTitle'a yalnız odak panelde ya da body'deyse taşınır. Sahne
 *   odaktayken (klavyeyle pad çalınıyor) taşınmaz, yoksa klavye kısayolları kesilirdi; duyuru #p3TaskText'ten.
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  // ---------------------------------------------------------------- sabitler
  var CV = 1;                       // müfredat sürümü (kayıttaki cv)
  var PHASE = 1;                    // bu fazın bölümleri açılır; sonrakiler '(yakında)'
  var AUTO_MS = 1200, FLASH_MS = 400;
  var HINT1_IDLE_MS = 8000, HINT2_MS = 20000, HINT1_WRONG = 2, HINT2_WRONG = 4;
  var CHORD_MS = 2000;              // fareyle akor: üç nota bu süre içinde
  var NOTES_MAX = 32, PRESSES_MAX = 16, STEPS_MAX = 32, VALS_MAX = 2000, SEEN_MAX = 8;
  var STEP_B = 0.25;                // drum bölümünde grid 1/16: bir adım = 0.25 beat
  var COACH_MIN_W = 560;            // coach balonu için en dar sahne (CSS px)
  var PANEL_IDS = ['p3TutPrev', 'p3TutSkip', 'p3TutToc', 'p3TutFree', 'p3TutNext', 'p3CoachClose'];
  // Kapının her zaman geçirdiği kontroller (sartname-ogretici §4): transport, ses ve panik.
  var ALWAYS = { play: true, volume: true, escape: true, lcd: true };
  var DIR_ID = {
    dpad: { up: 'dpadUp', down: 'dpadDown', left: 'dpadLeft', right: 'dpadRight', center: 'dpadC' },
    octpage: { up: 'octaveUp', down: 'octaveDown', left: 'pageLeft', right: 'pageRight' }
  };
  var C_MAJOR = { root: 0, idx: 0, inKey: true, fixed: false, layoutIdx: 0 };
  var D_MINOR = { root: 2, idx: 1, inKey: true, fixed: false, layoutIdx: 0 };
  var KICK = { 0: [0, 4, 8, 12] }, SNARE_STEPS = [4, 12], HATS = [0, 2, 4, 6, 8, 10, 12, 14];

  // ---------------------------------------------------------------- küçük yardımcılar
  function now() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function fn(o, k) { return !!o && typeof o[k] === 'function'; }
  function clone(v) { return P3.u && P3.u.deepClone ? P3.u.deepClone(v) : JSON.parse(JSON.stringify(v)); }
  function T(o) {
    if (o == null) return '';
    if (typeof o !== 'object') return String(o);
    return P3.t ? P3.t(o) : (o.tr || '');
  }
  function tx(s) { return { tr: s }; }
  function warn(msg, e) { console.warn(`[p3] öğretici: ${msg}`, e || ''); }
  function push(list, item, max) { list.push(item); if (list.length > max) list.splice(0, list.length - max); }

  // Store'a olaylı ama undo'suz yazar (LED, LCD ve motor 'state' olayından güncellenir).
  function put(path, v) { return !!P3.store && !!P3.S && P3.store.set(path, v); }
  function idx(k) { return P3.wtp.IDX[k]; }
  function def(k) { return P3.wtp.PARAMS[idx(k)].def; }
  function pPath(k, i) { return 'tracks.' + (i || 0) + '.p.' + idx(k); }
  function pv(s, k, i) { var t = s && s.tracks && s.tracks[i || 0]; return t && t.p ? t.p[idx(k)] : NaN; }
  function osc(s) { return s.wtui && s.wtui.osc === '2' ? '2' : '1'; }

  // ---------------------------------------------------------------- drum clip yardımcıları
  function clipOf(s, i) { var t = s && s.tracks && s.tracks[i]; return (t && t.clips && t.clips[0]) || null; }
  function notesOf(c, pad) { return c && c.notes ? c.notes.filter(function (n) { return n.p === 36 + pad; }) : []; }
  function padNotes(s, pad) { return notesOf(clipOf(s, 1), pad); }
  function hasBeats(s, pad, list) {
    var ns = padNotes(s, pad);
    return list.every(function (b) { return ns.some(function (n) { return Math.abs(n.t - b) < 1e-6; }); });
  }
  function beatCount(s, pad) {
    var seen = {};
    padNotes(s, pad).forEach(function (n) { seen[Math.round(n.t * 1e6)] = true; });
    return Object.keys(seen).length;
  }
  function beats(steps) { return steps.map(function (st) { return st * STEP_B; }); }
  // Sequencer'ın ilk sayfasında adım → pad (üst 4 satır, soldan sağa, yukarıdan aşağı).
  function stepPad(st) { return { pad: [st % 8, 7 - Math.floor(st / 8)] }; }

  // Drum clip'ini öğrencinin notalarını koruyarak adımın ön koşuluna getirir (yeni nesne döner).
  function drumClip(S, o) {
    var cur = clipOf(S, 1), c = cur ? clone(cur) : { len: 8, loop: [0, 8], notes: [] }, pad;
    c.notes = c.notes || [];
    (o.clear || []).forEach(function (p) { c.notes = c.notes.filter(function (n) { return n.p !== 36 + p; }); });
    for (pad in o.ensure || {}) {
      if (!own(o.ensure, pad)) continue;
      o.ensure[pad].forEach(function (st) {
        var b = st * STEP_B, p = 36 + (+pad);
        if (!c.notes.some(function (n) { return n.p === p && Math.abs(n.t - b) < 1e-6; })) c.notes.push({ t: b, p: p, d: STEP_B, v: 100, m: false });
      });
    }
    (o.unmute || []).forEach(function (p) { c.notes.forEach(function (n) { if (n.p === 36 + p) n.m = false; }); });
    if (!(c.len >= 8)) { c.len = 8; c.loop = [0, 8]; }
    c.notes.sort(function (a, b) { return a.t - b.t || a.p - b.p; });
    return c;
  }

  // ---------------------------------------------------------------- rt sorguları (check'ler kullanır)
  function ons(rt, track) {
    return rt.notes.filter(function (n) { return n.on && n.live && (track == null || n.track === track); });
  }
  function lastOns(rt, k, track) { var a = ons(rt, track); return a.slice(Math.max(0, a.length - k)); }
  function playedAt(rt, x, y, note, track) {
    return ons(rt, track).some(function (n) { return n.x === x && n.y === y && (note == null || n.note === note); });
  }
  function lastAt(rt, x, y, track) {
    var a = ons(rt, track);
    for (var i = a.length - 1; i >= 0; i--) if (a[i].x === x && a[i].y === y) return a[i];
    return null;
  }
  function heldNotes(track) {
    var out = [];
    for (var k in held) if (own(held, k) && (track == null || held[k].track === track)) out.push(held[k].note);
    return out;
  }
  function pressed(rt, id, f) { return rt.presses.some(function (p) { return p.ok && p.id === id && (!f || f(p)); }); }
  function lastSeq(rt, paths) {
    var m = -1;
    paths.forEach(function (p) { if (own(rt.last, p) && rt.last[p] > m) m = rt.last[p]; });
    return m;
  }
  function noteAfter(rt, paths, track) {
    var m = lastSeq(rt, paths);
    return m >= 0 && ons(rt, track).some(function (n) { return n.n > m; });
  }
  function offAfter(rt, paths, track) {
    var m = lastSeq(rt, paths);
    return m >= 0 && rt.notes.some(function (n) { return !n.on && n.live && n.n > m && (track == null || n.track === track); });
  }
  // Değişiklik duyuldu mu: bir nota basılıyken oldu ya da son değişiklikten sonra nota çalındı.
  function heard(rt, paths, track) {
    return paths.some(function (p) { return !!rt.heldChange[p]; }) || noteAfter(rt, paths, track);
  }
  // Yolun sıra numarası `from`'dan sonraki değerlerinin (ve ilk değişikliğin önceki değerinin) max/min oranı.
  function span(rt, path, from) {
    var lo = Infinity, hi = -Infinity;
    (rt.vals[path] || []).forEach(function (e) {
      if (e.n <= from) return;
      [e.prev, e.v].forEach(function (x) {
        if (typeof x === 'number' && x > 0) { if (x < lo) lo = x; if (x > hi) hi = x; }
      });
    });
    return hi > 0 && lo < Infinity ? hi / lo : 1;
  }
  function firstSeq(rt, path, pred) {
    var v = rt.vals[path] || [];
    for (var i = 0; i < v.length; i++) if (pred(v[i].v)) return v[i].n;
    return -1;
  }
  function audioOn(s) { var a = s.app && s.app.audio; return a === 'running' || a === 'fallback'; }

  // ---------------------------------------------------------------- emu (öğreticinin emülatör API'si)
  var temp = null;   // adım süresince değiştirilen tercihler: anahtar → eski değer

  function expressionReset() {
    if (fn(P3.wt, 'pb')) P3.wt.pb(0, 0);
    if (fn(P3.wt, 'mw')) P3.wt.mw(0, 0);
  }

  function restoreTemp() {
    if (!temp) return;
    var t = temp;
    temp = null;
    for (var k in t) if (own(t, k)) put('prefs.' + k, t[k]);
  }

  function keepPref(k) {
    var p = P3.S && P3.S.prefs;
    if (!p) return;
    if (!temp) temp = {};
    if (!own(temp, k)) temp[k] = p[k];
  }

  // Sözleşme (README §G13): load, set, openOverlay, select (+ resetTrack); S = emülatörün durumu.
  var emu = {
    get S() { return P3.S; },
    // 'tutorial-base' (sartname-ogretici §5): 120 BPM, swing 0, Wavetable init + boş Drums, C Major In Key
    // 4ths, pos 21, Repeat 1/8, view device, transport duruk. Başka bir id Wavetable preset'idir (track 0).
    load: function (id) {
      var S0 = P3.S;
      if (!S0 || !P3.store) return false;
      if (id && id !== 'tutorial-base') return emu.preset(id, 0);
      var fresh = P3.initState();
      fresh.app = clone(S0.app);
      fresh.prefs = clone(S0.prefs);
      fresh.vol = clone(S0.vol);
      fresh.vol.target = 'main';
      P3.store.restore(fresh);
      P3.panic('tutorial');
      expressionReset();   // motor Mod Wheel / pitch bend'i 'state'ten okumaz
      return true;
    },
    preset: function (id, i) {
      i = i || 0;
      var t = P3.S && P3.S.tracks[i];
      if (!t || t.kind !== 'synth' || !P3.wtp || !P3.wtp.PRESETS[id]) return false;
      var fresh = { p: null, mods: {} };
      P3.wtp.applyPreset(fresh, id);
      put('tracks.' + i + '.p', fresh.p);
      put('tracks.' + i + '.mods', fresh.mods);
      put('tracks.' + i + '.preset', fresh.preset);
      return true;
    },
    // Undo'suz, olaylı yazım. prefs.* yolları adım süresince geçerlidir (adımdan çıkınca eski değer geri
    // yazılır: öğretici öğrencinin tercihini kalıcı değiştirmez). strip.pb / strip.mod motora da iletilir
    // (motor pitch bend ve Mod Wheel'i 'state'ten okumaz).
    set: function (o) {
      for (var k in o) {
        if (!own(o, k)) continue;
        if (k.indexOf('prefs.') === 0) keepPref(k.slice(6));
        put(k, o[k]);
        if (k === 'strip.pb' && fn(P3.wt, 'pb')) P3.wt.pb(0, +o[k] || 0);
        else if (k === 'strip.mod' && fn(P3.wt, 'mw')) P3.wt.mw(0, +o[k] || 0);
      }
    },
    openOverlay: function (name) {
      name = name || null;
      if (fn(P3.modes, 'openOverlay')) { P3.modes.openOverlay(name); return; }
      var prev = P3.S.overlay || null;
      if (prev === name) return;
      put('overlay', name);
      P3.bus.emit('overlay', { name: name, prev: prev });
    },
    select: function (i) {
      if (fn(P3.modes, 'selectTrack')) { P3.modes.selectTrack(i); return; }
      if (put('sel.track', i)) put('bankView', false);
    },
    resetTrack: function (i) {
      var t = P3.S && P3.S.tracks[i];
      if (!t) return;
      if (t.kind === 'synth') emu.preset('init', i);
      put('tracks.' + i + '.clips', [null, null, null, null, null, null, null, null]);
      put('tracks.' + i + '.playing', -1);
      if (t.kind === 'drum') {
        put('tracks.' + i + '.selPad', 0);
        put('tracks.' + i + '.bank', 0);
        put('tracks.' + i + '.page', 0);
        put('tracks.' + i + '.grid', P3.scale.GRID_DEF);
        put('tracks.' + i + '.padMute', undefined);
        put('tracks.' + i + '.padSolo', undefined);
      }
    }
  };

  // ---------------------------------------------------------------- kurulum yardımcıları
  // setup/stepSetup'lar yalnız emu sözleşmesini (load, set, openOverlay, select ve e.S) kullanır; böylece
  // p3-selftest'in ayrık bir durum üzerinde çalışan test emu'su da aynı kurulumu üretir. Yardımcılar
  // {yol: değer} haritası kurup e.set'e verir.
  function each(o, f) { for (var k in o) if (own(o, k)) f(k, o[k]); }
  function setMap(e, build) { var m = {}; build(m); e.set(m); }

  // Scale (tam tanım) + synth konumu varsayılana (sol alt pad = kök, C1 oktavı), oct kadar oktav yukarı.
  function scaleTo(e, o) {
    var sc = { root: o.root, idx: o.idx, inKey: o.inKey, fixed: o.fixed, layoutIdx: o.layoutIdx };
    var L = P3.scale.L(sc), top = P3.scale.posCount(sc) - L;
    setMap(e, function (m) {
      each(sc, function (k, v) { m['scale.' + k] = v; });
      m['tracks.0.pos'] = Math.max(0, Math.min(P3.scale.defaultPos(sc) + (o.oct || 0) * L, top));
    });
  }
  function paramsTo(e, o) { setMap(e, function (m) { each(o, function (k, v) { m[pPath(k)] = v; }); }); }
  function uiTo(e, o) { setMap(e, function (m) { each(o, function (k, v) { m['wtui.' + k] = v; }); }); }
  // Bank görünümü, bank ve osilatör; bırakılmış encoder dokunuşu silinir (modes bank değişiminde de yapar).
  function bankTo(e, view, bank, oscSel) {
    setMap(e, function (m) {
      m.bankView = !!view;
      m['wtui.touched'] = -1;
      if (bank != null) m['wtui.bank'] = bank;
      if (oscSel) m['wtui.osc'] = oscSel;
    });
  }
  // Matris miktarı (src = P3.wtp.SOURCES indeksi); 0 anahtarı siler, olmayan satırı boşuna açmaz.
  function modTo(e, k, src, amt) {
    var mods = e.S.tracks[0].mods || {}, path = 'tracks.0.mods.' + k;
    if (!mods[k] && !amt) return;
    setMap(e, function (m) {
      if (!mods[k]) m[path] = {};
      m[path + '.' + src] = amt ? amt : undefined;
    });
  }
  function clipTo(e, c) { e.set({ 'tracks.1.clips.0': c }); }
  function stopTo(e) { e.set({ 'transport.playing': false }); }
  function stripTo(e) { e.set({ 'strip.mode': 'pb', 'strip.pb': 0, 'strip.mod': 0 }); }
  function prefTo(e, k, v) { setMap(e, function (m) { m['prefs.' + k] = v; }); }

  // Ortak ön koşullar.
  function synth(e) { e.select(0); e.openOverlay(null); }
  function drum(e) {
    e.openOverlay(null);
    e.select(1);
    e.set({ 'tracks.1.grid': 3, 'tracks.1.bank': 0, 'tracks.1.page': 0 });
  }
  function envBank(e) { synth(e); bankTo(e, true, 4, '1'); uiTo(e, { env: 'amp', ampView: 'time' }); }
  function never() { return false; }

  // ---------------------------------------------------------------- müfredat (README §F)
  var CURRICULUM = [
    {
      id: 'baslarken', phase: 1, estMin: 3,
      title: tx(`Başlarken: Ses, Ekran ve Learn`), short: tx(`Başlarken`),
      summary: tx(`Sesi aç, Volume encoder'ını ve ekranın üstündeki encoder'ları tanı, dersleri açan Learn düğmesini bul.`),
      setup: function (e) { e.load('tutorial-base'); },
      steps: [
        {
          id: 'ses-ac', kind: 'action',
          title: tx(`Sesi aç`),
          body: tx(`Push 3 kendi başına çalan bir enstrüman. Burada ses tarayıcından gelir; kulaklık takarsan en iyisini duyarsın. İlk sesi çıkarmak için bir pad'e dokunman yeterli.`),
          do: tx(`Kulaklığını tak ve herhangi bir pad'e dokun.`),
          listen: tx(`Pad'e dokununca bir nota duyarsın. Ekranda “Tap a pad to enable audio” yazıyorsa bir kez daha dokun.`),
          targets: ['pads'], allow: ['pads'],
          stepSetup: function (e) { synth(e); },
          check: function (S, rt) { return audioOn(S) && ons(rt).length > 0; },
          success: tx(`Ses açık: ilk notanı çaldın.`),
          hints: [tx(`Ses gelmiyorsa telefonun sessiz modunu kapat, cihazın sesini aç ve bir pad'e yeniden dokun.`),
            tx(`Hâlâ ses yoksa bu adımı atlayabilirsin; pad'ler ve ekran yine çalışır.`)]
        },
        {
          id: 'volume-dokun', kind: 'action',
          title: tx(`Volume encoder'ına dokun`),
          body: tx(`Push'un encoder'ları dokunmayı algılar. Ekranın solundaki büyük Volume encoder'ına dokununca ekranda hangi çıkışı ayarladığın görünür: Main Output, yani ana çıkış.`),
          do: tx(`Ekranın solundaki büyük Volume encoder'ına sadece dokun, çevirme.`),
          listen: tx(`Ekranda “Main Output: -6.0 dB” gibi bir yazı belirir. Fareyle encoder'ın üstüne gelmek de dokunmak sayılır.`),
          targets: ['volume'], allow: ['volume', 'pads'],
          stepSetup: function (e) { synth(e); e.set({ 'vol.target': 'main' }); },
          check: function (S, rt) {
            return pressed(rt, 'volume', function (p) { return p.touch || p.press; }) || (rt.turns.volume || 0) > 0;
          },
          success: tx(`Dokunmak yeter: Push dokunduğun kontrolün ayarını ekranda gösterir.`),
          hints: [tx(`Volume, ekranın solundaki büyük yuvarlak düğme; Undo ve Save'in hemen solunda.`)]
        },
        {
          id: 'volume-cevir', kind: 'action',
          title: tx(`Sesi ayarla`),
          body: tx(`Volume'u çevirince ses her tıkta 1 dB değişir. Shift'i basılı tutarsan 0.1 dB'lik adımlarla ince ayar yaparsın. Kulağını yormayacak bir seviye bul; derslerin geri kalanında da böyle kalsın.`),
          do: tx(`Volume encoder'ını çevirip sesi en az 3 dB değiştir.`),
          listen: tx(`Farkı duymak için arada bir pad çal. Ekrandaki dB değeri her tıkta güncellenir.`),
          targets: ['volume'], allow: ['volume', 'shift', 'pads'],
          stepSetup: function (e) { synth(e); e.set({ 'vol.target': 'main' }); },
          check: function (S, rt) { return Math.abs(S.vol.main - rt.base.vol.main) >= 3; },
          success: tx(`Ses seviyen ayarlandı.`),
          hints: [tx(`Encoder'ı fareyle yukarı ya da aşağı sürükle veya fare tekerleğini çevir.`),
            tx(`Ekranda Main Output yazmıyorsa Volume'a basarak hedefi değiştirmiş olabilirsin; Main Output görünene kadar yeniden bas.`)]
        },
        {
          id: 'encoder-ekran', kind: 'action',
          title: tx(`Encoder'lar ve ekran`),
          body: tx(`Ekranın üstündeki 8 encoder, ekranda altlarında gördüğün 8 parametreyi kontrol eder. Birine dokununca o parametre ekranda öne çıkar; böylece çevirmeden önce neyi değiştireceğini görürsün.`),
          do: tx(`Ekranın üstündeki 8 encoder'dan herhangi birine dokun.`),
          listen: tx(`Dokunduğun encoder'ın parametresi ekranda vurgulanır.`),
          targets: ['enc*'], anchor: 'enc4', allow: ['enc*', 'pads'],
          stepSetup: function (e) { synth(e); },
          check: function (S, rt) {
            var re = /^enc[1-8]$/;
            return rt.presses.some(function (p) { return p.ok && p.touch && re.test(p.id); }) ||
              Object.keys(rt.turns).some(function (id) { return re.test(id); });
          },
          success: tx(`Encoder'a dokunmak, onun parametresini seçmek demek.`),
          hints: [tx(`Encoder'lar ekranın hemen üstündeki 8 yuvarlak düğme.`)]
        },
        {
          id: 'learn', kind: 'action',
          title: tx(`Learn düğmesi`),
          body: tx(`Learn, gerçek Push 3'te dersleri açan düğmedir. Burada da bu öğreticinin bölümlerini listeler: bir bölümün üstündeki ekran düğmesine basınca o bölüm başlar.`),
          do: tx(`Sol üstteki Learn düğmesine bas.`),
          listen: tx(`Ekranda bölümler listelenir; bitirdiklerinin yanında ✓ görünür.`),
          targets: ['learn'], allow: ['learn', 'upper*'], autoMs: 3000,   // Learn sayfası görülebilsin
          stepSetup: function (e) { synth(e); },
          check: function (S) { return S.overlay === 'learn'; },
          success: tx(`Dersler her zaman Learn'den açılır. Sıradaki bölüm: Pad'ler.`),
          hints: [tx(`Learn, ekranın sol üstündeki dört küçük düğmenin üçüncüsü (ampul simgeli).`)]
        }
      ]
    },

    {
      id: 'padler', phase: 1, estMin: 5,
      title: tx(`Pad'ler ve Note Mode`), short: tx(`Pad'ler`),
      summary: tx(`Note Mode'a geç, 64 pad'in nasıl dizildiğini ve ızgaranın her yerinde çalışan akor şeklini öğren.`),
      setup: function (e) { e.load('tutorial-base'); },
      steps: [
        {
          id: 'note-modu', kind: 'action',
          title: tx(`Note Mode`),
          body: tx(`Note Mode'da pad'ler bir enstrüman gibi çalar: 64 pad, notaların bir ızgaraya dizildiği bir klavye olur. Session Mode'da ise pad'ler clip başlatır; o bölüm bu simülatörde yakında geliyor.`),
          do: tx(`Sağ taraftaki Note düğmesine bas: Session D-pad'in hemen altındaki, ızgara simgeli düğme.`),
          listen: tx(`Note düğmesi yanar; pad'ler seçili track'in notalarıyla aydınlanır.`),
          targets: ['note'], allow: ['note', 'pads'],
          stepSetup: function (e) { synth(e); },
          check: function (S, rt) { return S.pad === 'note' && pressed(rt, 'note'); },
          success: tx(`Note Mode açık.`),
          hints: [tx(`Note, sağdaki artı biçimli D-pad'in hemen altında, solda.`)]
        },
        {
          id: 'ilk-nota', kind: 'action',
          title: tx(`İlk nota`),
          body: tx(`Varsayılan dizilimde sol alt pad her zaman kök notadır. Şu an kök C, yani bu pad C1 (MIDI 36).`),
          do: tx(`Sol alttaki pad'e bas.`),
          listen: tx(`Bastığın pad yeşil yanar; bırakınca eski rengine döner.`),
          targets: [{ pad: [0, 0] }], allow: ['pads'],
          stepSetup: function (e) { synth(e); scaleTo(e, C_MAJOR); },
          check: function (S, rt) { return playedAt(rt, 0, 0, 36, 0); },
          success: tx(`Bu C1.`),
          hints: [tx(`En alt sıranın en solundaki pad.`)]
        },
        {
          id: 'kok-renk', kind: 'action',
          title: tx(`Kök notanın rengi`),
          body: tx(`Track renginde (mavi) yanan pad'ler kök notadır, şu an C. Beyaz pad'ler gamdaki diğer notalar. Gam dışındaki notalar ızgarada hiç yok; buna In Key denir.`),
          do: tx(`Mavi yanan 3 farklı pad'e bas.`),
          listen: tx(`Hepsi C çalar; aynı nota ızgarada birden çok yerde bulunabilir.`),
          targets: [{ pad: [0, 0] }, { pad: [7, 0] }, { pad: [4, 1] }], allow: ['pads'],
          stepSetup: function (e) { synth(e); scaleTo(e, C_MAJOR); },
          check: function (S, rt) {
            var seen = {};
            ons(rt, 0).forEach(function (n) { if (n.note % 12 === S.scale.root) seen[n.x + ',' + n.y] = true; });
            return Object.keys(seen).length >= 3;
          },
          success: tx(`Kök notaları buldun.`),
          hints: [tx(`Alt sırada iki mavi pad var: en soldaki ve en sağdaki.`)]
        },
        {
          id: 'saga-gam', kind: 'action',
          title: tx(`Sağa doğru gam`),
          body: tx(`Bir sırada sağa gitmek, gamdaki bir sonraki notaya geçmek demek. Alt sıra C'den C'ye bütün C Major gamını çalar.`),
          do: tx(`En alt sıradaki 8 pad'i soldan sağa sırayla çal.`),
          listen: tx(`Do, re, mi, fa, sol, la, si, do.`),
          targets: [0, 1, 2, 3, 4, 5, 6, 7].map(function (x) { return { pad: [x, 0] }; }), anchor: { pad: [0, 0] },
          allow: ['pads'],
          stepSetup: function (e) { synth(e); scaleTo(e, C_MAJOR); },
          check: function (S, rt) {
            return lastOns(rt, 8, 0).map(function (n) { return n.note; }).join(',') === '36,38,40,41,43,45,47,48';
          },
          success: tx(`C Major gamını çaldın.`),
          hints: [tx(`Arada başka bir pad'e basarsan sayım bozulur; alt sırayı baştan, soldan sağa çal.`),
            tx(`Fareyle alt sıranın üstünde soldan sağa sürüklemek de olur.`)]
        },
        {
          id: 'yukari-dortlu', kind: 'action',
          title: tx(`Bir sıra yukarı: dörtlü`),
          body: tx(`Bir sıra yukarı çıkmak dörtlü (4ths) yukarı çıkmak demek: C'den F'ye. Push'un varsayılan dizilimi budur; bu yüzden aynı şekiller ızgaranın her yerinde çalışır.`),
          do: tx(`Sol alt pad'e, sonra hemen üstündeki pad'e bas.`),
          listen: tx(`İkinci nota F, ilkinden dört nota yukarıda.`),
          targets: [{ pad: [0, 0] }, { pad: [0, 1] }], allow: ['pads'],
          stepSetup: function (e) { synth(e); scaleTo(e, C_MAJOR); },
          check: function (S, rt) {
            var p = lastOns(rt, 2, 0);
            return p.length === 2 && p[0].x === 0 && p[0].y === 0 && p[0].note === 36 &&
              p[1].x === 0 && p[1].y === 1 && p[1].note === 41;
          },
          success: tx(`C'den F'ye: bir dörtlü.`),
          hints: [tx(`Önce en sol alttaki pad, sonra onun tam üstündeki.`)]
        },
        {
          id: 'ilk-akor', kind: 'action',
          title: tx(`İlk akor`),
          body: tx(`Sol alt pad, onun iki sağındaki ve bir yukarı-bir sağındaki pad birlikte C majör akorunu çalar. Bu üçgen şekli ızgaranın her yerinde bir akor verir; gamdaki yerine göre majör ya da minör olur.`),
          do: tx(`Üç pad'e aynı anda bas ve basılı tut: sol alt pad, onun iki sağındaki ve bir yukarı-bir sağındaki.`),
          listen: tx(`C, E ve G birlikte: C majör. Fareyle üçüne 2 saniye içinde sırayla da basabilirsin; klavyede üç tuşu birlikte basılı tut (varsayılan düzende Z, C ve S).`),
          targets: [{ pad: [0, 0] }, { pad: [2, 0] }, { pad: [1, 1] }], allow: ['pads'],
          stepSetup: function (e) { synth(e); scaleTo(e, C_MAJOR); },
          check: function (S, rt) {
            var h = heldNotes(0);
            if ([36, 40, 43].every(function (m) { return h.indexOf(m) >= 0; })) return true;
            var p = lastOns(rt, 3, 0);
            return p.length === 3 && p[2].t - p[0].t <= CHORD_MS &&
              p.map(function (n) { return n.note; }).sort(function (a, b) { return a - b; }).join(',') === '36,40,43';
          },
          success: tx(`C majör akorunu çaldın.`),
          hints: [tx(`Şekil: sol alt, onun iki sağı ve bu ikisinin arasının bir üstü.`)]
        },
        {
          id: 'velocity', kind: 'action', optional: true,
          title: tx(`Vuruş gücü (velocity)`),
          body: tx(`Gerçek Push'ta pad'ler ne kadar sert vurduğunu ölçer; buna velocity denir ve sesin gücünü belirler. Bu adımda pad'in neresine dokunduğun velocity sayılır: üst kenara yakın güçlü, alt kenara yakın hafif.`),
          do: tx(`Bir pad'in alt kenarına yakın hafifçe, sonra üst kenarına yakın güçlüce vur.`),
          listen: tx(`İkinci nota daha güçlü çıkar. Klavyede Shift basılıyken çaldığın notalar da daha hafiftir.`),
          targets: ['pads'], allow: ['pads', 'shift'],
          stepSetup: function (e) { synth(e); prefTo(e, 'velMode', 'position'); },
          check: function (S, rt) {
            var a = ons(rt, 0);
            for (var i = 1; i < a.length; i++) if (Math.abs(a[i].vel - a[i - 1].vel) >= 30) return true;
            return false;
          },
          success: tx(`Hafif ve güçlü vuruşun farkını duydun.`),
          hints: [tx(`Pad'in en altına tıkla, sonra en üstüne: iki notanın gücü farklı olur.`)]
        }
      ]
    },

    {
      id: 'scale', phase: 1, estMin: 5,
      title: tx(`Scale ve Kök Nota`), short: tx(`Scale`),
      summary: tx(`Scale menüsünden kök notayı ve gamı değiştir; In Key, Chromatic ve Fixed arasındaki farkı duy.`),
      setup: function (e) { e.load('tutorial-base'); },
      steps: [
        {
          id: 'scale-ac', kind: 'action',
          title: tx(`Scale menüsü`),
          body: tx(`Scale düğmesi ekranda kök notaları ve gam listesini açar. Kısa basınca menü açılır ya da kapanır; basılı tutarsan yalnız basılı tuttuğun sürece açık kalır.`),
          do: tx(`Scale düğmesine bas.`),
          listen: tx(`Ekranda kök notalar ve gam listesi belirir.`),
          targets: ['scale'], allow: ['scale', 'pads'],
          stepSetup: function (e) { synth(e); scaleTo(e, C_MAJOR); },
          check: function (S) { return S.overlay === 'scale'; },
          success: tx(`Scale menüsü açık.`),
          hints: [tx(`Scale, sağ taraftaki Note düğmesinin hemen altında.`)]
        },
        {
          id: 'kok-d', kind: 'action',
          title: tx(`Kök notayı D yap`),
          body: tx(`Üst ve alt sıradaki ekran düğmeleri 12 kök notayı gösterir: üstte C, G, D, A, E, B; altta F, B♭, E♭, A♭, D♭, G♭. Bu sıra beşliler çemberidir. Seçtiğin kök bütün pad dizilimini yeniden kurar.`),
          do: tx(`Ekranın üstündeki sırada D düğmesine bas (soldan 4.).`),
          listen: tx(`Seçili kökün ışığı beyaz yanar; mavi pad'ler artık D.`),
          targets: ['upper4'], allow: ['upper*', 'lower*', 'enc*', 'dpad', 'scale', 'pads'],
          stepSetup: function (e) { e.select(0); scaleTo(e, C_MAJOR); e.openOverlay('scale'); },
          check: function (S) { return S.scale.root === 2; },
          success: tx(`Kök nota D.`),
          hints: [tx(`Üst sıra soldan: boş, C, G, D… D dördüncü düğme.`)]
        },
        {
          id: 'minor-sec', kind: 'action',
          title: tx(`Gamı Minor yap`),
          body: tx(`Gam listesi Major, Minor, Dorian, Mixolydian… diye 35 gama kadar gider. Encoder 2–7 listede birer adım gezer; Session D-pad'de yukarı ve aşağı bir adım, sağ ve sol dört adım atlar.`),
          do: tx(`Encoder 2'yi bir tık çevirerek gamı Minor yap. İstersen D-pad'in aşağı okunu da kullanabilirsin.`),
          listen: tx(`Gam listesinde Minor seçilir; pad'ler D Minor'a göre yeniden dizilir.`),
          targets: ['enc2', 'dpadDown'], anchor: 'enc2', allow: ['enc*', 'dpad', 'jog', 'upper*', 'lower*', 'scale', 'pads'],
          stepSetup: function (e) {
            e.select(0);
            scaleTo(e, { root: 2, idx: 0, inKey: true, fixed: false, layoutIdx: 0 });
            e.openOverlay('scale');
          },
          check: function (S) { return S.scale.root === 2 && S.scale.idx === 1; },
          success: tx(`Artık D Minor.`),
          hints: [tx(`Minor listede Major'ın hemen altında: tek adım yeter.`),
            tx(`Kök değiştiyse üst sıradaki D düğmesine yeniden bas.`)]
        },
        {
          id: 'd-minor-cal', kind: 'action',
          title: tx(`D Minor çal`),
          body: tx(`Fixed kapalıyken sol alt pad her zaman kök notadır, şu an D1. Pad renkleri de yeni köke göre değişti.`),
          do: tx(`Scale'e yeniden basıp menüyü kapat, sonra sol alt pad'i çal.`),
          listen: tx(`Sol alt pad artık D çalar.`),
          targets: ['scale', { pad: [0, 0] }], allow: ['scale', 'pads'],
          stepSetup: function (e) { e.select(0); scaleTo(e, D_MINOR); e.openOverlay('scale'); },
          check: function (S, rt) { return S.overlay === null && playedAt(rt, 0, 0, 38, 0); },
          success: tx(`D Minor'dasın.`),
          hints: [tx(`Menüyü kapatmak için Scale'e bir kez daha bas.`)]
        },
        {
          id: 'chromatic', kind: 'action',
          title: tx(`Chromatic ve In Key`),
          body: tx(`Chromatic'te 12 notanın hepsi ızgarada olur: gam dışındaki pad'ler sönük görünür ama çalar. In Key yalnız gamdaki notaları gösterir; böylece yanlış nota çalmak imkânsızlaşır.`),
          do: tx(`Scale menüsünü aç, alt sıranın en solundaki düğmeyle Chromatic'e geç ve sönük bir pad çal. Sonra aynı düğmeyle In Key'e dön.`),
          listen: tx(`Sönük pad'ler D Minor'da olmayan notalar; kulağa “yanlış” gelebilirler.`),
          targets: ['scale', 'lower1'], allow: ['scale', 'lower1', 'pads'],
          stepSetup: function (e) { synth(e); scaleTo(e, D_MINOR); },
          check: function (S, rt) {
            var set = P3.scale.pcs(rt.base.scale);
            return S.scale.inKey === true && ons(rt, 0).some(function (n) { return !set.has(n.note % 12); });
          },
          success: tx(`In Key ile Chromatic arasındaki farkı gördün.`),
          hints: [tx(`In Key / Chromatic, Scale menüsünde alt sıranın en solundaki düğme.`),
            tx(`Chromatic'teyken ışığı sönük bir pad çal, sonra aynı düğmeye yeniden bas.`)]
        },
        {
          id: 'fixed', kind: 'action',
          title: tx(`Fixed`),
          body: tx(`Fixed açıkken sol alt pad kökten bağımsız olarak C'ye sabitlenir (gamda C yoksa C'ye yakın bir gam notasına); kök değişince pad'ler kaymaz. D Minor'da C notası da olduğu için sol alt pad C1 olur.`),
          do: tx(`Scale menüsünde alt sıranın en sağındaki düğmeyle Fixed'i aç. Menüyü kapat ve sol alt pad'i çal.`),
          listen: tx(`Sol alt pad artık C çalar; D'ler ızgarada başka yerlere kaydı.`),
          targets: ['lower8', 'scale', { pad: [0, 0] }], allow: ['scale', 'lower8', 'pads'],
          stepSetup: function (e) { e.select(0); scaleTo(e, D_MINOR); e.openOverlay('scale'); },
          check: function (S, rt) { return S.scale.fixed === true && S.overlay === null && playedAt(rt, 0, 0, 36, 0); },
          success: tx(`Fixed açık: sol alt pad hep C.`),
          hints: [tx(`Fixed, Scale menüsünde alt sıranın en sağındaki düğme.`)]
        }
      ]
    },

    {
      id: 'dizilim', phase: 1, estMin: 4,
      title: tx(`Dizilim, Oktav ve Touch Strip`), short: tx(`Dizilim`),
      summary: tx(`4ths, 3rds ve Sequential dizilimlerini karşılaştır, Octave düğmeleriyle ızgarayı kaydır, Touch Strip ile pitch bend yap.`),
      setup: function (e) { e.load('tutorial-base'); scaleTo(e, D_MINOR); },
      steps: [
        {
          id: '3rds', kind: 'action',
          title: tx(`3rds dizilimi`),
          body: tx(`Dizilim ayarı Scale menüsünde, en soldaki encoder'dadır: 4ths, 3rds ve Sequential. 3rds'te bir sıra yukarısı bir üçlü: D'den F'ye. Akorların notaları dikeyde üst üste gelir.`),
          do: tx(`Scale menüsünü aç, Encoder 1'i çevirip 3rds'i seç. Sonra sol alt pad'i ve hemen üstündekini sırayla çal.`),
          listen: tx(`Üstteki pad artık F çalar.`),
          targets: ['scale', 'enc1', { pad: [0, 0] }, { pad: [0, 1] }], allow: ['scale', 'enc1', 'pads'],
          stepSetup: function (e) { synth(e); scaleTo(e, D_MINOR); },
          check: function (S, rt) {
            if (S.scale.layoutIdx !== 1) return false;
            var p = lastOns(rt, 2, 0), pos = S.tracks[0].pos, sc = P3.scale;
            return p.length === 2 && p[0].x === 0 && p[0].y === 0 && p[1].x === 0 && p[1].y === 1 &&
              p[0].note === sc.padNote(S.scale, pos, 0, 0) && p[1].note === sc.padNote(S.scale, pos, 0, 1);
          },
          success: tx(`3rds: bir sıra yukarısı bir üçlü.`),
          hints: [tx(`Önce Scale'e bas; dizilim ekranın en solundaki sütunda, Encoder 1 ile değişir.`)]
        },
        {
          id: 'sequential', kind: 'action',
          title: tx(`Sequential dizilimi`),
          body: tx(`Sequential'da notalar piyano gibi satır satır sıralanır: her sıra alttakinin devamıdır. İkinci sıranın ilk pad'i, sol alt pad'in tam bir oktav üstüdür.`),
          do: tx(`Encoder 1'i bir tık daha çevirip Sequential'ı seç. Sonra sol alt pad'i ve hemen üstündekini çal.`),
          listen: tx(`İki nota aynı isimde: D1 ve D2.`),
          targets: ['enc1', { pad: [0, 0] }, { pad: [0, 1] }], allow: ['scale', 'enc1', 'pads'],
          stepSetup: function (e) {
            e.select(0);
            scaleTo(e, { root: 2, idx: 1, inKey: true, fixed: false, layoutIdx: 1 });
            e.openOverlay('scale');
          },
          // README §F: (0,1) − (0,0) === 12; kök tekrar etse de etmese de yalnız Sequential'da doğru.
          check: function (S, rt) {
            var a = lastAt(rt, 0, 0, 0), b = lastAt(rt, 0, 1, 0);
            return S.scale.layoutIdx === 2 && !!a && !!b && b.note - a.note === 12;
          },
          success: tx(`Sequential: satırlar oktav oktav ilerler.`),
          hints: [tx(`Encoder 1'in sırası: 4ths, 3rds, Sequential.`)]
        },
        {
          id: '4ths-geri', kind: 'action',
          title: tx(`4ths'e dön`),
          body: tx(`4ths, Push'un varsayılanıdır: aynı akor ve gam şekli ızgaranın her yerinde çalışır. Dikkat: dizilim Layout düğmesinde değil, Scale menüsündedir. Layout düğmesi 64 Notes ile sequencer görünümleri arasında geçiş yapar.`),
          do: tx(`Encoder 1 ile yeniden 4ths'e dön ve Scale'e basıp menüyü kapat.`),
          listen: tx(`Pad'ler ilk dizilime döner.`),
          targets: ['enc1', 'scale'], allow: ['scale', 'enc1', 'pads'],
          stepSetup: function (e) {
            e.select(0);
            scaleTo(e, { root: 2, idx: 1, inKey: true, fixed: false, layoutIdx: 2 });
            e.openOverlay('scale');
          },
          check: function (S) { return S.scale.layoutIdx === 0 && S.overlay === null; },
          success: tx(`Yeniden 4ths.`),
          hints: [tx(`Encoder 1'i geri çevir: Sequential, 3rds, 4ths.`)]
        },
        {
          id: 'oktav-yukari', kind: 'action',
          title: tx(`Octave Up`),
          body: tx(`Octave düğmeleri bütün ızgarayı bir oktav kaydırır; ekranda pad'lerin yeni nota aralığı görünür. Daha yukarı gidilemeyince Octave Up'ın ışığı söner.`),
          do: tx(`Octave Up'a bir kez bas.`),
          listen: tx(`Sol alt pad artık D2; her şey bir oktav tizleşti.`),
          targets: ['octaveUp'], allow: ['octaveUp', 'octaveDown', 'pads'],
          stepSetup: function (e) { synth(e); scaleTo(e, D_MINOR); },
          check: function (S, rt) {
            var sc = P3.scale, b = rt.base;
            return sc.padNote(S.scale, S.tracks[0].pos, 0, 0) === sc.padNote(b.scale, b.tracks[0].pos, 0, 0) + 12;
          },
          success: tx(`Bir oktav yukarı.`),
          hints: [tx(`Octave Up, sağ alttaki kare bölgenin üst üçgeni.`)]
        },
        {
          id: 'oktav-asagi', kind: 'action',
          title: tx(`Octave Down`),
          body: tx(`Octave Down ızgarayı bir oktav aşağı kaydırır. Shift basılıyken Octave'a basarsan ızgara oktav oktav değil, gamda bir nota kayar.`),
          do: tx(`Octave Down'a iki kez bas.`),
          listen: tx(`Sol alt pad artık D0; notalar kalınlaştı.`),
          targets: ['octaveDown'], allow: ['octaveUp', 'octaveDown', 'pads'],
          stepSetup: function (e) {
            synth(e);
            scaleTo(e, { root: 2, idx: 1, inKey: true, fixed: false, layoutIdx: 0, oct: 1 });
          },
          check: function (S, rt) {
            var sc = P3.scale, b = rt.base;
            return sc.padNote(S.scale, S.tracks[0].pos, 0, 0) === sc.padNote(b.scale, b.tracks[0].pos, 0, 0) - 24;
          },
          success: tx(`İki oktav aşağı indin.`),
          hints: [tx(`Octave Down, Octave Up'ın hemen altındaki üçgen.`)]
        },
        {
          id: 'pitch-bend', kind: 'action',
          title: tx(`Touch Strip ile pitch bend`),
          body: tx(`Touch Strip varsayılan olarak pitch bend yapar: parmağını kaydırdıkça çalan nota tizleşir ya da pesleşir, bırakınca merkeze döner. Select'i basılı tutup strip'e dokunursan Mod Wheel'e geçer.`),
          do: tx(`Bir pad'i basılı tutarken Touch Strip'te parmağını yukarı ya da aşağı kaydır.`),
          listen: tx(`Nota kayar, bırakınca yerine döner. Fareyle yapıyorsan pad'i klavyeden basılı tut, strip'i fareyle sürükle.`),
          targets: ['strip', 'pads'], anchor: 'strip', allow: ['strip', 'pads'],
          stepSetup: function (e) { synth(e); stripTo(e); },
          check: function (S) {
            return heldNotes(0).length > 0 && S.strip.mode === 'pb' && Math.abs(S.strip.pb) >= 0.5;
          },
          success: tx(`Pitch bend yaptın.`),
          hints: [tx(`Touch Strip, pad'lerin solundaki ince dikey şerit.`),
            tx(`Strip'in ucuna yakın kaydır: yarıdan fazla bükmek gerekiyor.`)]
        }
      ]
    },

    {
      id: 'osilator', phase: 1, estMin: 7,
      title: tx(`Wavetable Osilatörleri`), short: tx(`Osilatör`),
      summary: tx(`Device görünümünde Wavetable synth'in kalbini keşfet: Position ile dalgayı gezdir, tablo değiştir, ikinci osilatörü ve Sub'ı ekle, osilatör efektini dene.`),
      setup: function (e) { e.load('tutorial-base'); },
      steps: [
        {
          id: 'device', kind: 'action',
          title: tx(`Device ve bankalar`),
          body: tx(`Device düğmesi seçili track'teki enstrümanı ekrana getirir: burada Wavetable. Ekranın üst sırasındaki ilk düğme cihaz adının üstündedir; ona basınca alt sırada Wavetable'ın 8 bankası belirir: Main, Oscillators, Filters, Global, Envelopes, LFOs, Matrix ve MIDI & MPE.`),
          do: tx(`Device düğmesine bas, sonra ekranın üst sırasındaki ilk düğmeye bas.`),
          listen: tx(`Ekranda Main bankası: Oscillator, Table, Position, Filter Type, Frequency, Resonance, Mod Time ve Mod Amt.`),
          targets: ['device', 'upper1'], allow: ['device', 'upper1', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, false, 0, '1'); },
          check: function (S, rt) { return S.bankView === true && pressed(rt, 'device'); },
          success: tx(`Wavetable'ın bankaları açık.`),
          hints: [tx(`Device, ekranın sağ üstündeki dört düğmenin ilki.`),
            tx(`Sonra ekranın üst sırasında en soldaki düğmeye bas.`)]
        },
        {
          id: 'position', kind: 'action',
          title: tx(`Position`),
          body: tx(`Wavetable sentezinde ses, bir tablodaki dalgalar arasında gezinerek değişir. Position, tablonun neresinde durduğunu seçer. Ekrandaki dalga çizimi de Position ile birlikte değişir.`),
          do: tx(`Bir pad'i basılı tut ve Encoder 3 (Position) ile dalgayı gezdir.`),
          listen: tx(`Nota aynı kalır, ses rengi değişir: sinüsten üçgene, testereye ve kareye.`),
          targets: ['enc3', 'pads'], anchor: 'enc3', allow: ['enc3', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, true, 0, '1'); paramsTo(e, { o1Pos: 0 }); },
          check: function (S, rt) {
            return Math.abs(pv(S, 'o1Pos') - pv(rt.base, 'o1Pos')) >= 0.3 && heard(rt, [pPath('o1Pos')], 0);
          },
          success: tx(`İşte wavetable sentezi.`),
          hints: [tx(`Position'ı en az üçte bir oranında değiştir; farkı duymak için arada nota çal.`),
            tx(`Fareyle: pad'i klavyede basılı tut, encoder'ı fareyle sürükle.`)]
        },
        {
          id: 'table', kind: 'action',
          title: tx(`Table`),
          body: tx(`Her tablo ayrı bir dalga ailesidir. Tablolar kategorilere ayrılır; kategoriler arasında Oscillators bankasından geçersin.`),
          do: tx(`Encoder 2 (Table) ile başka bir tablo seç ve bir nota çal.`),
          listen: tx(`Aynı Position'da bambaşka bir ses rengi duyarsın.`),
          targets: ['enc2', 'pads'], anchor: 'enc2', allow: ['enc2', 'enc3', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, true, 0, '1'); paramsTo(e, { o1Cat: 0, o1Tab: 0 }); },
          check: function (S, rt) {
            var w = P3.wtp, b = rt.base;
            return w.tableId(pv(S, 'o1Cat'), pv(S, 'o1Tab')) !== w.tableId(pv(b, 'o1Cat'), pv(b, 'o1Tab')) &&
              noteAfter(rt, [pPath('o1Cat'), pPath('o1Tab')], 0);
          },
          success: tx(`Yeni bir tablo seçtin.`),
          hints: [tx(`Encoder 2'yi bir tık çevir, sonra bir pad çal.`)]
        },
        {
          id: 'osc2', kind: 'action',
          title: tx(`Osc 2`),
          body: tx(`Wavetable'da iki osilatör var. Encoder 1 (Oscillator) hangisini düzenlediğini seçer: 1, 2, S (Sub) ya da Mix. Üst sıradaki Osc düğmesi seçili osilatörü açar ya da kapatır; kapalı osilatörün Table gibi ayarları ekranda gri görünür.`),
          do: tx(`Encoder 1 ile 2'yi seç, sonra üst sırada soldan 2. düğmeyle (Osc) Osc 2'yi aç.`),
          listen: tx(`İki osilatör artık birlikte çalar.`),
          targets: ['enc1', 'upper2'], allow: ['enc1', 'upper2', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, true, 0, '1'); paramsTo(e, { o2On: 0 }); },
          check: function (S, rt) {
            return S.wtui.osc === '2' && pv(S, 'o2On') > 0.5 && !(pv(rt.base, 'o2On') > 0.5);
          },
          success: tx(`Osc 2 açık.`),
          hints: [tx(`Önce Encoder 1: Oscillator 2 olmalı. Sonra üst sıradaki 2. düğme.`)]
        },
        {
          id: 'oscillators-bank', kind: 'action',
          title: tx(`Oscillators bankası`),
          body: tx(`Alt sıradaki düğmeler bankaları seçer. Oscillators bankasında seçili osilatörün bütün ayarları var: Category, Table, Position, Pitch, Effect Type ve efektin iki parametresi.`),
          do: tx(`Alt sıradan Oscillators bankasını seç (soldan 2.).`),
          listen: tx(`Ekranın alt sırasında Oscillators sekmesi seçili görünür.`),
          targets: ['lower2'], allow: ['lower*', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, true, 0, '2'); paramsTo(e, { o2On: 1 }); },
          check: function (S) { return S.bankView === true && S.wtui.bank === 1; },
          success: tx(`Oscillators bankası açık.`),
          hints: [tx(`Alt sıranın soldan ikinci düğmesi.`)]
        },
        {
          id: 'detune', kind: 'action',
          title: tx(`Pitch ve detune`),
          body: tx(`Encoder 5 (Pitch) seçili osilatörün perdesini değiştirir: normal çevirince yarım ses adımlarla, Shift basılıyken ince ayarla. İki osilatör arasındaki küçük bir fark (detune) sesi genişletir; 7 yarım ses bir beşli, 12 yarım ses bir oktav katmanı ekler.`),
          do: tx(`Encoder 5 (Pitch) ile Osc 2'nin perdesini kaydır ve bir nota çal.`),
          listen: tx(`İki osilatör artık farklı perdelerde birlikte çalar.`),
          targets: ['enc5', 'pads'], anchor: 'enc5', allow: ['enc5', 'shift', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, true, 1, '2'); paramsTo(e, { o2On: 1, o2Transp: 0, o2Det: 0 }); },
          check: function (S, rt) {
            var b = rt.base, moved = Math.abs(pv(S, 'o2Transp') - pv(b, 'o2Transp')) >= 1 ||
              Math.abs(pv(S, 'o2Det') - pv(b, 'o2Det')) >= 0.05;
            return moved && heard(rt, [pPath('o2Transp'), pPath('o2Det')], 0);
          },
          success: tx(`Osc 2 artık farklı bir perdede.`),
          hints: [tx(`Encoder 5'i birkaç tık çevir, sonra bir pad çal. Shift ile ince ayar yaparsın.`)]
        },
        {
          id: 'effect', kind: 'action',
          title: tx(`Osilatör efekti`),
          body: tx(`Osilatör efektleri dalgayı büker. Classic'te Pulse Width ve Sync, Modern'de Warp ve Fold, FM'de Pitch ve Amount var. Efekt tipini değiştirsen de ayarların kaybolmaz.`),
          do: tx(`Encoder 6 (Effect Type) ile Classic'i seç, Encoder 7 (Pulse Width) ile en az %20'ye çıkar ve bir nota çal.`),
          listen: tx(`Pulse Width arttıkça ses incelir, genizden gelir gibi olur.`),
          targets: ['enc6', 'enc7', 'pads'], anchor: 'enc6', allow: ['enc6', 'enc7', 'enc8', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, true, 1, '2'); paramsTo(e, { o2On: 1, o2Fx: 0, o2Fx1: 0 }); },
          check: function (S, rt) {
            var n = osc(S);
            return pv(S, 'o' + n + 'Fx') === 2 && pv(S, 'o' + n + 'Fx1') >= 0.2 && heard(rt, [pPath('o' + n + 'Fx1')], 0);
          },
          success: tx(`Classic efekt açık.`),
          hints: [tx(`Effect Type listesi: None, FM, Classic, Modern. Classic üçüncüsü.`)]
        },
        {
          id: 'sub', kind: 'action',
          title: tx(`Sub osilatörü`),
          body: tx(`Sub, bir oktav aşağıya sade bir dalga ekleyip sesi kalınlaştırır. Tone %0'da saf sinüstür; Octave ile 0, -1 ya da -2 oktav seçilir.`),
          do: tx(`Encoder 1 ile S'yi seç. Üst sırada soldan 2. düğmeyle (Sub) Sub'ı aç ve Encoder 2 (Gain) ile -3 dB'nin üstüne çıkar.`),
          listen: tx(`Notaların altında kalın, yumuşak bir taban belirir.`),
          targets: ['enc1', 'upper2', 'enc2', 'pads'], allow: ['enc1', 'upper2', 'enc2', 'enc3', 'enc4', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, true, 1, '2'); paramsTo(e, { subOn: 0, subGain: def('subGain') }); },
          check: function (S, rt) {
            return S.wtui.osc === 'S' && pv(S, 'subOn') > 0.5 && pv(S, 'subGain') >= 0.708 &&
              heard(rt, [pPath('subOn'), pPath('subGain')], 0);
          },
          success: tx(`Sub açık, ses kalınlaştı.`),
          hints: [tx(`Oscillator sırası: 1, 2, S, Mix. S üçüncüsü.`),
            tx(`Gain'i -3 dB'nin üstüne çıkar; değer ekranda dB olarak görünür.`)]
        }
      ]
    },

    {
      id: 'filtre-env', phase: 1, estMin: 7,
      title: tx(`Filtre ve Envelope`), short: tx(`Filtre + Env`),
      summary: tx(`Filtreyle sesin parlaklığını, envelope ile zaman içindeki şeklini kontrol et; sonunda kısa bir pluck sesi kur.`),
      setup: function (e) { e.load('tutorial-base'); bankTo(e, true, 0, '1'); },
      steps: [
        {
          id: 'cutoff', kind: 'action',
          title: tx(`Frequency (cutoff)`),
          body: tx(`Filtre sesin bir kısmını keser. Lowpass filtrede Frequency (cutoff) düştükçe tizler kesilir ve ses boğuklaşır. Ekrandaki filtre eğrisi de değerle birlikte kayar.`),
          do: tx(`Bir pad'i basılı tutarken Encoder 5 (Frequency) ile filtreyi kapat ve aç.`),
          listen: tx(`Ses parlaktan boğuğa, sonra yeniden parlağa gider.`),
          targets: ['enc5', 'pads'], anchor: 'enc5', allow: ['enc5', 'pads'],
          stepSetup: function (e) {
            synth(e);
            bankTo(e, true, 0, '1');
            uiTo(e, { flt: 1 });
            paramsTo(e, { f1Type: 0, f1Freq: def('f1Freq'), f1Res: 0 });
          },
          check: function (S, rt) {
            var p = pPath('f1Freq');
            return span(rt, p, rt.n0) >= 4 && heard(rt, [p], 0);
          },
          success: tx(`Filtreyi gezdirdin.`),
          hints: [tx(`Frequency'yi en az iki oktav oynat: örneğin 20 kHz'ten 5 kHz'in altına.`)]
        },
        {
          id: 'resonance', kind: 'action',
          title: tx(`Resonance`),
          body: tx(`Resonance, cutoff noktasının hemen çevresini öne çıkarır. Frequency'yi gezdirince tanıdık “vuuu” sesi duyulur.`),
          do: tx(`Encoder 6 (Resonance) ile %50'nin üstüne çık, sonra Encoder 5 ile Frequency'yi yeniden gezdir.`),
          listen: tx(`Filtre gezinirken ıslığa benzer bir tepe duyulur.`),
          targets: ['enc6', 'enc5', 'pads'], anchor: 'enc6', allow: ['enc5', 'enc6', 'pads'],
          stepSetup: function (e) {
            synth(e);
            bankTo(e, true, 0, '1');
            uiTo(e, { flt: 1 });
            paramsTo(e, { f1Type: 0, f1Freq: 1200, f1Res: 0 });
          },
          check: function (S, rt) {
            if (!(pv(S, 'f1Res') >= 0.5)) return false;
            var fp = pPath('f1Freq'), from = firstSeq(rt, pPath('f1Res'), function (v) { return v >= 0.5; });
            return from >= 0 && span(rt, fp, from) >= 2 && heard(rt, [fp], 0);
          },
          success: tx(`Rezonanslı filtre taraması.`),
          hints: [tx(`Önce Resonance: ekranda en az %50 görünmeli. Sonra Frequency'yi en az bir oktav oynat.`)]
        },
        {
          id: 'filter-type', kind: 'action',
          title: tx(`Filtre tipi`),
          body: tx(`Highpass, Lowpass'in tersini yapar: basları keser ve sesi inceltir. Wavetable'ın filtre tipleri Lowpass, Highpass, Bandpass, Notch ve Morph. Filters bankasında filtrenin bütün ayarları var.`),
          do: tx(`Alt sıradan Filters bankasını seç (soldan 3.). Encoder 3 (Type) ile Highpass'e geç, bir nota çal, sonra yeniden Lowpass'e dön.`),
          listen: tx(`Highpass'te ses incelir ve hafifler.`),
          targets: ['lower3', 'enc3', 'pads'], allow: ['lower*', 'enc3', 'pads'],
          stepSetup: function (e) {
            synth(e);
            bankTo(e, true, 0, '1');
            uiTo(e, { flt: 1 });
            paramsTo(e, { f1Type: 0, f1Freq: 1000, f1Res: 0 });
          },
          check: function (S, rt) {
            var tp = pPath('f1Type');
            if (pv(S, 'f1Type') === 1 && (heldNotes(0).length > 0 || noteAfter(rt, [tp], 0))) rt.flags.hp = true;
            return !!rt.flags.hp && S.wtui.bank === 2 && pv(S, 'f1Type') === 0;
          },
          success: tx(`Highpass ile Lowpass'i karşılaştırdın.`),
          hints: [tx(`Filters, alt sıranın soldan üçüncü düğmesi. Type listesi: Lowpass, Highpass, Bandpass, Notch, Morph.`),
            tx(`Highpass'teyken bir pad çalmayı unutma, sonra Lowpass'e dön.`)]
        },
        {
          id: 'envelopes-bank', kind: 'action',
          title: tx(`Envelopes bankası`),
          body: tx(`Envelope (zarf), bir sesin zaman içindeki şeklidir: Attack, Decay, Sustain ve Release. Envelopes bankasında Encoder 1 ile Amp, Env 2 ve Env 3 arasında geçersin; Amp zarfı sesin seviyesini şekillendirir.`),
          do: tx(`Alt sıradan Envelopes bankasını seç (soldan 5.). Amp seçili kalsın.`),
          listen: tx(`Ekranda zarfın eğrisi görünür.`),
          targets: ['lower5'], allow: ['lower*', 'pads'],
          stepSetup: function (e) {
            synth(e);
            bankTo(e, true, 2, '1');
            uiTo(e, { env: 'amp', ampView: 'time' });
            paramsTo(e, { f1Type: 0 });
          },
          check: function (S) { return S.wtui.bank === 4 && S.wtui.env === 'amp'; },
          success: tx(`Envelopes bankası açık.`),
          hints: [tx(`Alt sıranın soldan beşinci düğmesi.`)]
        },
        {
          id: 'attack', kind: 'action',
          title: tx(`Attack`),
          body: tx(`Attack, sesin sıfırdan tam seviyeye çıkma süresidir. Uzun attack yavaşça açılan yumuşak pad sesleri verir. Ekranda dokunduğun envelope parçası vurgulanır.`),
          do: tx(`Encoder 3 (Attack) ile en az 500 ms yap ve bir nota çal.`),
          listen: tx(`Ses yavaşça açılır.`),
          targets: ['enc3', 'pads'], anchor: 'enc3', allow: ['enc3', 'pads'],
          stepSetup: function (e) {
            envBank(e);
            paramsTo(e, { ampA: def('ampA'), f1Type: 0, f1Freq: def('f1Freq'), f1Res: 0 });
          },
          check: function (S, rt) { return pv(S, 'ampA') >= 0.5 && noteAfter(rt, [pPath('ampA')], 0); },
          success: tx(`Yavaş açılan bir ses kurdun.`),
          hints: [tx(`Attack'ı ekranda en az 500 ms görene kadar artır, sonra bir pad çal.`)]
        },
        {
          id: 'release', kind: 'action',
          title: tx(`Release`),
          body: tx(`Release, pad'i bıraktıktan sonra sesin sönme süresidir. Uzun release notaların birbirine karışmasını sağlar.`),
          do: tx(`Encoder 6 (Release) ile en az 1 saniye yap. Bir nota çal, bırak ve sönüşünü dinle.`),
          listen: tx(`Pad'i bıraktıktan sonra ses yavaşça kaybolur.`),
          targets: ['enc6', 'pads'], anchor: 'enc6', allow: ['enc6', 'enc3', 'pads'],
          stepSetup: function (e) { envBank(e); paramsTo(e, { ampR: def('ampR') }); },
          check: function (S, rt) { return pv(S, 'ampR') >= 1 && offAfter(rt, [pPath('ampR')], 0); },
          success: tx(`Uzun bir kuyruk kurdun.`),
          hints: [tx(`Release en az 1.00 s olmalı; sonra bir pad çal ve bırak.`)]
        },
        {
          id: 'pluck', kind: 'action',
          title: tx(`Pluck sesi`),
          body: tx(`Kısa attack, kısa decay ve sıfır sustain: nota hemen vurur ve hemen söner. Pluck'lar ve pek çok bas sesi böyle kurulur.`),
          do: tx(`Attack'ı 10 ms'ye kadar, Decay'i (Encoder 4) 300 ms'ye kadar kısalt, Sustain'i (Encoder 5) en alta indir. Sonra birkaç nota çal.`),
          listen: tx(`Her nota kısa bir “pling” gibi çalar.`),
          targets: ['enc3', 'enc4', 'enc5', 'pads'], anchor: 'enc4', allow: ['enc3', 'enc4', 'enc5', 'enc6', 'shift', 'pads'],
          stepSetup: function (e) { envBank(e); paramsTo(e, { ampA: 0.5, ampD: def('ampD'), ampS: def('ampS'), ampR: 1 }); },
          check: function (S, rt) {
            return pv(S, 'ampA') <= 0.01 && pv(S, 'ampD') <= 0.3 && pv(S, 'ampS') <= 0.01 &&
              noteAfter(rt, [pPath('ampA'), pPath('ampD'), pPath('ampS')], 0);
          },
          success: tx(`Pluck hazır.`),
          hints: [tx(`Sustain'i tamamen kıs: ekranda -inf dB görünmeli.`),
            tx(`Attack en çok 10 ms, Decay en çok 300 ms, Sustain en altta; sonra bir pad çal.`)]
        }
      ]
    },

    {
      id: 'modulasyon', phase: 1, estMin: 7,
      title: tx(`Modülasyon: LFO ve Matrix`), short: tx(`Modülasyon`),
      summary: tx(`Wavetable'ın özü: Position'ı Mod Wheel ve LFO ile hareket ettir, Mod Matrix'i kullan, Unison ile sesi genişlet.`),
      setup: function (e) { e.load('tutorial-base'); bankTo(e, true, 0, '1'); },
      steps: [
        {
          id: 'wavetable-nedir', kind: 'concept',
          title: tx(`Wavetable nedir?`),
          body: tx(`Wavetable, arka arkaya dizilmiş tek periyotluk dalgalardan (kare, frame) oluşan bir tablodur. Temel Şekiller tablosunda 64 kare var: sinüsten başlayıp üçgene, testereye ve kareye doğru yavaşça değişir. Position bu karelerden hangisinin çalınacağını seçer; iki kare arasındaysa ikisi karıştırılır. Ekrandaki dalga o anki kareyi, arkasındaki soluk çizgiler komşu kareleri gösterir.`),
          do: tx(`Ekrandaki dalgaya bak, istersen Encoder 3 ile Position'ı gezdir; hazır olunca Devam'a bas.`),
          listen: tx(`Neden cızırtı yok? Her tablo, üst harmonikleri giderek budanmış birkaç kopya halinde saklanır (mip-map). Tiz notalarda bu kopyalardan biri çalınır; böylece duyulabilir aralığın üstündeki harmonikler geri katlanıp (aliasing) tuhaf tonlar üretmez.`),
          targets: [], allow: ['enc3', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, true, 0, '1'); },
          check: never,
          success: tx(`Wavetable'ın mantığı bu.`),
          hints: []
        },
        {
          id: 'mod-wheel', kind: 'action',
          title: tx(`Touch Strip ile Mod Wheel`),
          body: tx(`Touch Strip'i Mod Wheel olarak da kullanabilirsin: Select'i basılı tutup strip'e dokununca mod geçer. Bu modda strip bıraktığın yerde kalır. Wavetable'ın başlangıç ayarında Mod Wheel, Osc 1'in Position'ını tarar.`),
          do: tx(`Select'i basılı tutup Touch Strip'e dokun. Sonra bir nota çalarken strip'i yukarı kaydır.`),
          listen: tx(`Strip yükseldikçe dalga sinüsten kareye doğru değişir.`),
          targets: ['select', 'strip'], anchor: 'strip', allow: ['select', 'strip', 'pads'],
          stepSetup: function (e) { synth(e); stripTo(e); bankTo(e, true, 0, '1'); paramsTo(e, { o1Pos: 0 }); },
          check: function (S, rt) { return S.strip.mode === 'mod' && S.strip.mod >= 0.5 && heard(rt, ['strip.mod'], 0); },
          success: tx(`Mod Wheel ile Position'ı taradın.`),
          hints: [tx(`Önce Select basılıyken strip'e bir kez dokun: ekranda Mod Wheel yazar.`),
            tx(`Sonra strip'i yarının üstüne kaydır ve bir nota çal.`)]
        },
        {
          id: 'lfos-bank', kind: 'action',
          title: tx(`LFOs bankası`),
          body: tx(`LFO kendi başına ses çıkarmaz: tekrar tekrar salınan yavaş bir kontrol dalgasıdır. Type şeklini, Rate hızını, Amount derinliğini belirler. Ekrandaki eğri seçili şekli gösterir.`),
          do: tx(`Alt sıradan LFOs bankasını seç (soldan 6.) ve Encoder 2 (Type) ile LFO 1'in şeklini değiştir.`),
          listen: tx(`Ekrandaki eğri yeni şekle döner: Sine, Triangle, Saw, Square ya da Random.`),
          targets: ['lower6', 'enc2'], allow: ['lower*', 'enc2', 'pads'],
          stepSetup: function (e) {
            synth(e);
            stripTo(e);
            bankTo(e, true, 0, '1');
            uiTo(e, { lfo: 1 });
            paramsTo(e, { l1Shape: 0 });
          },
          check: function (S, rt) { return S.wtui.bank === 5 && pv(S, 'l1Shape') !== pv(rt.base, 'l1Shape'); },
          success: tx(`LFO 1 hazır; şimdi onu bir parametreye bağlayalım.`),
          hints: [tx(`LFOs, alt sıranın soldan altıncı düğmesi.`)]
        },
        {
          id: 'add-to-matrix', kind: 'action',
          title: tx(`Add to Matrix`),
          body: tx(`Add to Matrix, dokunduğun parametreyi modülasyon matrisine ekler ve Matrix bankasını açar. Matrix'te Encoder 4–8 sırasıyla Amp Envelope, Envelope 2, Envelope 3, LFO 1 ve LFO 2'nin o parametreye etkisini ayarlar. Back seni önceki bankaya döndürür.`),
          do: tx(`Encoder 3'e (Position) dokun, hemen ardından üst sıranın en sağındaki Add to Matrix düğmesine bas. Açılan Matrix'te Encoder 7 (LFO 1) ile miktarı en az %30 yap ve bir nota çal.`),
          listen: tx(`Position artık kendi kendine salınır: ses ritmik olarak renk değiştirir.`),
          targets: ['enc3', 'upper8', 'enc7', 'pads'], anchor: 'upper8',
          allow: ['enc3', 'enc7', 'upper8', 'upper2', 'lower1', 'pads'],
          stepSetup: function (e) {
            synth(e);
            stripTo(e);
            bankTo(e, true, 0, '1');
            uiTo(e, { target: null, touched: -1 });
            modTo(e, 'o1Pos', P3.wtp.SRC.LFO1, 0);
          },
          check: function (S, rt) {
            var t = S.tracks[0], row = t.mods && t.mods.o1Pos, lfo = P3.wtp.SRC.LFO1;
            return P3.wtp.modTarget(S, t) === 'o1Pos' && !!row && Math.abs(row[lfo] || 0) >= 0.3 &&
              heard(rt, ['tracks.0.mods.o1Pos.' + lfo], 0);
          },
          success: tx(`LFO 1 artık Position'ı hareket ettiriyor.`),
          hints: [tx(`Add to Matrix yalnız bir encoder'a dokunurken çalışır. Fareyle: Encoder 3'ün üstünde dur, 2 saniye içinde Add to Matrix'e tıkla.`),
            tx(`Matrix'te Encoder 7'nin adı LFO 1: onu en az %30'a çevir.`)]
        },
        {
          id: 'mod-amt', kind: 'action',
          title: tx(`Mod Amt`),
          body: tx(`Main bankındaki Mod Amt, matristeki bütün modülasyon miktarlarını birlikte ölçekler: %0'da hiçbiri çalışmaz, %200'de etkileri iki katına çıkar. Yanındaki Mod Time ise zarfların ve LFO'ların hızını birlikte değiştirir.`),
          do: tx(`Encoder 8 (Mod Amt) ile modülasyonun toplam miktarını değiştir ve bir nota çal.`),
          listen: tx(`LFO'nun salınımı Mod Amt ile birlikte derinleşir ya da kaybolur.`),
          targets: ['enc8', 'pads'], anchor: 'enc8', allow: ['enc8', 'enc7', 'pads'],
          stepSetup: function (e) {
            synth(e);
            stripTo(e);
            bankTo(e, true, 0, '1');
            paramsTo(e, { modAmt: def('modAmt') });
            var row = e.S.tracks[0].mods.o1Pos, lfo = P3.wtp.SRC.LFO1;
            if (!row || Math.abs(row[lfo] || 0) < 0.3) modTo(e, 'o1Pos', lfo, 0.5);
          },
          check: function (S, rt) {
            return Math.abs(pv(S, 'modAmt') - pv(rt.base, 'modAmt')) >= 0.3 && heard(rt, [pPath('modAmt')], 0);
          },
          success: tx(`Bütün modülasyonu tek düğmeyle ölçekledin.`),
          hints: [tx(`Mod Amt, Main bankında en sağdaki parametre.`)]
        },
        {
          id: 'unison', kind: 'action',
          title: tx(`Unison`),
          body: tx(`Unison her notayı birkaç ses halinde, hafifçe farklı perdelerde çalar; ses genişler ve kalınlaşır. Unison Voices kaç ses çalınacağını, Unison Amount aralarındaki farkı belirler.`),
          do: tx(`Alt sıradan Global bankasını seç (soldan 4.). Encoder 3 (Unison Mode) ile Classic'i seç, Encoder 5 (Unison Amount) ile en az %50 yap ve bir nota çal.`),
          listen: tx(`Tek nota bir koro gibi genişler. Değişikliği yeni çaldığın notada duyarsın.`),
          targets: ['lower4', 'enc3', 'enc5', 'pads'], allow: ['lower*', 'enc3', 'enc4', 'enc5', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, true, 0, '1'); paramsTo(e, { uniMode: 0, uniAmt: def('uniAmt') }); },
          check: function (S, rt) {
            return pv(S, 'uniMode') === 1 && pv(S, 'uniAmt') >= 0.5 && noteAfter(rt, [pPath('uniMode'), pPath('uniAmt')], 0);
          },
          success: tx(`Unison açık: ses genişledi.`),
          hints: [tx(`Global, alt sıranın soldan dördüncü düğmesi. Unison Mode listesi: None, Classic, …`)]
        }
      ]
    },

    {
      id: 'drum', phase: 1, estMin: 7,
      title: tx(`Davul ve Step Sequencer`), short: tx(`Drum`),
      summary: tx(`Drums track'inde Loop Selector dizilimiyle 2 ölçülük bir beat programla: kick, snare, hi-hat, adım susturma, silme ve geri alma.`),
      setup: function (e) { e.load('tutorial-base'); },
      steps: [
        {
          id: 'drum-track', kind: 'action',
          title: tx(`Drums track'i`),
          body: tx(`Alt sıradaki ekran düğmeleri track'leri seçer. Drums seçilince pad'ler üç bölgeye ayrılır: sol alt 4x4 davul pad'leri, üst 4 sıra 32 adımlık step sequencer, sağ alt 4x4 loop uzunluğu.`),
          do: tx(`Alt ekran sırasından Drums track'ini seç (soldan 2.).`),
          listen: tx(`Ses atanmış pad'ler track renginde (turuncu), boş pad'ler gri yanar; seçili pad beyazdır.`),
          targets: ['lower2'], allow: ['lower*', 'pads'],
          stepSetup: function (e) { synth(e); bankTo(e, false); },
          check: function (S) { return S.sel.track === 1; },
          success: tx(`Drums seçili.`),
          hints: [tx(`Alt sıranın soldan ikinci düğmesi; ekranda Drums yazar.`)]
        },
        {
          id: 'kick', kind: 'action',
          title: tx(`Kick`),
          body: tx(`Step sequencer'da her pad bir adımdır; bir adıma basmak seçili davul sesini o adıma yazar. Kick seçili: sol alt pad beyaz. İlk adımı eklediğin anda çalma başlar. Her adım 1/16 uzunluğunda, yani 32 adım 2 ölçü eder.`),
          do: tx(`Üst bölgede 1, 5, 9 ve 13. adımlara bas: üst sıranın 1. ve 5. pad'i, ikinci sıranın 1. ve 5. pad'i.`),
          listen: tx(`Dört vuruşluk düz bir kick. Yeşil ilerleyen pad çalma imleci (playhead).`),
          targets: KICK[0].map(stepPad), allow: ['pads'],
          stepSetup: function (e) {
            drum(e);
            stopTo(e);
            clipTo(e, null);
            e.set({ 'tracks.1.selPad': 0 });
          },
          check: function (S) { return hasBeats(S, 0, beats(KICK[0])); },
          success: tx(`Kick hazır.`),
          hints: [tx(`Adımlar üst 4 sırada: en üst sıra 1–8, ikinci sıra 9–16.`),
            tx(`Yanlış adıma bastıysan aynı pad'e yeniden basıp sil.`)]
        },
        {
          id: 'snare', kind: 'action',
          title: tx(`Snare`),
          body: tx(`Bir davul pad'ine basınca o ses çalar ve seçilir. Adımlar yalnız seçili sesin notalarını gösterir; kick adımları kaybolmaz, yalnız görünmez olur.`),
          do: tx(`Snare pad'ine bas (sol alt bölgede alt sıranın 3. pad'i), sonra 5. ve 13. adımlara koy.`),
          listen: tx(`Kick ve snare birlikte: klasik bir beat. Çalmıyorsa Play'e bas.`),
          targets: [{ pad: [2, 0] }, stepPad(4), stepPad(12)], allow: ['pads'],
          stepSetup: function (e) {
            drum(e);
            clipTo(e, drumClip(e.S, { clear: [2], ensure: KICK }));
            e.set({ 'tracks.1.selPad': 0 });
          },
          check: function (S) { return S.tracks[1].selPad === 2 && hasBeats(S, 2, beats(SNARE_STEPS)); },
          success: tx(`Snare eklendi.`),
          hints: [tx(`Snare, en alt sıranın soldan üçüncü pad'i.`),
            tx(`5. adım üst sıranın 5. pad'i, 13. adım ikinci sıranın 5. pad'i.`)]
        },
        {
          id: 'select-hat', kind: 'action',
          title: tx(`Sessizce seç: Select`),
          body: tx(`Select basılıyken bir davul pad'ine basmak onu çalmadan seçer. Beat çalarken sessizce ses değiştirmek için kullanışlıdır. Ekranda seçtiğin sesin adı görünür.`),
          do: tx(`Select'i basılı tut ve Closed Hat pad'ine bas (sol alt bölgede ikinci sıranın 3. pad'i).`),
          listen: tx(`Pad ses çıkarmadan beyaz yanar; ekranda Closed Hat yazar.`),
          targets: ['select', { pad: [2, 1] }], allow: ['select', 'pads'],
          stepSetup: function (e) {
            drum(e);
            clipTo(e, drumClip(e.S, { ensure: { 0: KICK[0], 2: SNARE_STEPS } }));
            e.set({ 'tracks.1.selPad': 2 });
          },
          check: function (S, rt) {
            return S.tracks[1].selPad === 6 && rt.presses.some(function (p) {
              return p.ok && p.id === 'pads' && p.x === 2 && p.y === 1 && !!p.mods.select;
            });
          },
          success: tx(`Closed Hat sessizce seçildi.`),
          hints: [tx(`Select, sağ alt köşede Shift'in yanında.`),
            tx(`Closed Hat, sol alt bölgenin ikinci sırasındaki üçüncü pad.`)]
        },
        {
          id: 'hat-8', kind: 'action',
          title: tx(`Hi-hat`),
          body: tx(`Hi-hat'i iki adımda bir koymak beate sekizlik bir akış verir.`),
          do: tx(`Hi-hat'i iki adımda bir koy (1, 3, 5, 7…). En az 6 adım olsun.`),
          listen: tx(`Artık kick, snare ve hi-hat'li tam bir ritim var.`),
          targets: HATS.map(stepPad), anchor: stepPad(0), allow: ['pads'],
          stepSetup: function (e) {
            drum(e);
            clipTo(e, drumClip(e.S, { clear: [6], ensure: { 0: KICK[0], 2: SNARE_STEPS } }));
            e.set({ 'tracks.1.selPad': 6 });
          },
          check: function (S) { return beatCount(S, 6) >= 6; },
          success: tx(`Beat tamam.`),
          hints: [tx(`Closed Hat seçili kalmalı; üst bölgedeki adımlara bas.`)]
        },
        {
          id: 'step-mute', kind: 'action',
          title: tx(`Adımı sustur`),
          body: tx(`Mute basılıyken bir adıma dokunmak o adımı silmeden susturur. Aynı kombinasyonla yeniden açabilirsin.`),
          do: tx(`Mute'u basılı tut ve hi-hat adımlarından birine dokun.`),
          listen: tx(`Susturulan adım daha açık renkte görünür ve çalmaz.`),
          targets: function (S) {
            var hats = padNotes(S, 6).sort(function (a, b) { return a.t - b.t; }), st = hats.length ? Math.round(hats[0].t / STEP_B) : 0;
            return ['mute', stepPad(st >= 0 && st < 32 ? st : 0)];
          },
          allow: ['mute', 'pads'],
          stepSetup: function (e) {
            drum(e);
            var o = { ensure: { 0: KICK[0], 2: SNARE_STEPS }, unmute: [6] };
            if (beatCount(e.S, 6) < 6) { o.clear = [6]; o.ensure[6] = HATS; }
            clipTo(e, drumClip(e.S, o));
            e.set({ 'tracks.1.selPad': 6, 'tracks.1.mute': false });
          },
          check: function (S) { return padNotes(S, 6).some(function (n) { return !!n.m; }); },
          success: tx(`Adım susturuldu.`),
          hints: [tx(`Mute, sol tarafta ikinci sıranın üçüncü düğmesi.`),
            tx(`Mute'a tek başına basarsan bütün track susar; o zaman bir kez daha bas.`)]
        },
        {
          id: 'delete-pad', kind: 'action',
          title: tx(`Delete ve Undo`),
          body: tx(`Delete basılıyken bir davul pad'ine basmak, o sesin clip'teki bütün notalarını siler. Undo son işlemi geri alır; Shift ile Undo ise Redo yapar. Gerçek Push'ta notası olmayan bir pad'e Delete ile basarsan o pad'deki ses silinir, dikkatli ol.`),
          do: tx(`Delete'i basılı tut ve Snare pad'ine bas. Sonra Undo'ya basıp snare'i geri getir.`),
          listen: tx(`Snare önce kaybolur, Undo ile geri gelir.`),
          targets: ['delete', { pad: [2, 0] }, 'undo'], anchor: 'delete', allow: ['delete', 'undo', 'pads'],
          stepSetup: function (e) {
            drum(e);
            clipTo(e, drumClip(e.S, { ensure: { 0: KICK[0], 2: SNARE_STEPS } }));
            e.set({ 'tracks.1.selPad': 6 });
          },
          check: function (S, rt) {
            var n0 = notesOf(clipOf(rt.base, 1), 2).length;
            if (!n0 || padNotes(S, 2).length !== n0) return false;
            return (rt.vals['tracks.1.clips.0'] || []).some(function (e) { return !!e.v && notesOf(e.v, 2).length === 0; });
          },
          success: tx(`Silmeyi ve geri almayı öğrendin.`),
          hints: [tx(`Delete, sağda Convert'in yanında; Undo, sol üstte Volume'un sağında.`),
            tx(`Delete'e tek başına basarsan bütün clip silinir; Undo ile geri alabilirsin.`)]
        }
      ]
    },

    // Faz 2: yalnız başlık ve özet; Learn ve İçindekiler '(yakında)' gösterir.
    {
      id: 'repeat-accent', phase: 2, estMin: 4, setup: null, steps: [],
      title: tx(`Repeat, Accent ve Swing`), short: tx(`Repeat`),
      summary: tx(`Note Repeat ile hi-hat ruloları çal, Accent ile tam güçte vur, Swing ile ritme groove kat.`)
    },
    {
      id: 'kayit', phase: 2, estMin: 7, setup: null, steps: [],
      title: tx(`Kayıt ve Clip`), short: tx(`Kayıt`),
      summary: tx(`Metronome ve Tap Tempo ile tempoyu tut, bir melodi kaydet, üstüne ekle, Quantize ile hizala ve Capture ile kaçırdığın fikri yakala.`)
    },
    {
      id: 'session', phase: 2, estMin: 4, setup: null, steps: [],
      title: tx(`Session: Clip ve Sahneler`), short: tx(`Session`),
      summary: tx(`Session Mode'da clip'leri ve sahneleri başlatıp durdur; bir şarkıyı parça parça kurmanın mantığını gör.`)
    },
    {
      id: 'final', phase: 2, estMin: 5, setup: null, steps: [],
      title: tx(`Mini Proje: İlk Döngün`), short: tx(`Final`),
      summary: tx(`Davul ve Wavetable ile kendi döngünü kur: en az üç davul sesi ve sekiz notalık bir melodi birlikte çalsın.`)
    }
  ];

  // ---------------------------------------------------------------- müfredat sorguları
  function available(ch) { return !!ch && (ch.phase || 1) <= PHASE && ch.steps.length > 0; }
  function chapterIndex(slug) {
    for (var i = 0; i < CURRICULUM.length; i++) if (CURRICULUM[i].id === slug) return i;
    return -1;
  }
  function stepIndex(ch, slug) {
    if (!ch || slug == null) return -1;
    for (var i = 0; i < ch.steps.length; i++) if (ch.steps[i].id === slug) return i;
    return -1;
  }
  function nextAvailable(ci) { for (var i = ci + 1; i < CURRICULUM.length; i++) if (available(CURRICULUM[i])) return i; return -1; }
  function prevAvailable(ci) { for (var i = ci - 1; i >= 0; i--) if (available(CURRICULUM[i])) return i; return -1; }
  function firstAvailable() { return nextAvailable(-1); }
  function lastAvailable() { return prevAvailable(CURRICULUM.length); }
  function targetsOf(stp) {
    var t = stp && stp.targets;
    if (typeof t === 'function') { try { t = t(P3.S); } catch (e) { t = []; } }
    return Array.isArray(t) ? t : [];
  }
  function expand(list) {
    return P3.dev && fn(P3.dev, 'expand') ? P3.dev.expand(list) : [].concat(list || []).filter(function (x) { return typeof x === 'string'; });
  }

  // ---------------------------------------------------------------- ilerleme kaydı (sartname-ogretici §3)
  function saved() {
    var s = P3.save && fn(P3.save, 'get') ? P3.save.get('tutorial') : null;
    return s && typeof s === 'object' && !Array.isArray(s) ? s : {};
  }
  function recOf(sv, ch, stp) { var st = sv.steps; return st && typeof st === 'object' ? st[ch.id + '/' + stp.id] || null : null; }
  function stepDone(sv, ch, stp) { var r = recOf(sv, ch, stp); return !!(r && (r.done || r.skipped)); }
  function chapterComplete(sv, ch) {
    if (!available(ch)) return false;
    var c = sv.chapters && sv.chapters[ch.id];
    if (c && c.done) return true;
    return ch.steps.every(function (s) { return s.optional || stepDone(sv, ch, s); });
  }
  function firstOpenStep(sv, ch) {
    for (var i = 0; i < ch.steps.length; i++) if (!stepDone(sv, ch, ch.steps[i])) return i;
    return -1;
  }

  function persist(mut) {
    if (!P3.save || !fn(P3.save, 'patch')) return;
    var sv = clone(saved());
    if (!sv.steps || typeof sv.steps !== 'object') sv.steps = {};
    if (!sv.chapters || typeof sv.chapters !== 'object') sv.chapters = {};
    if (sv.completedAt === undefined) sv.completedAt = null;
    if (sv.badge === undefined) sv.badge = false;
    sv.cv = CV;
    mut(sv);
    P3.save.patch('tutorial', sv);
  }

  function markChapter(sv, ch) {
    var skipped = 0;
    var all = ch.steps.every(function (s) {
      var r = recOf(sv, ch, s);
      if (r && r.skipped && !r.done) skipped++;
      return s.optional || !!(r && (r.done || r.skipped));
    });
    if (all) {
      var prev = sv.chapters[ch.id];
      sv.chapters[ch.id] = { done: prev && prev.done ? prev.done : Date.now(), skipped: skipped };
    }
    var every = CURRICULUM.filter(available).every(function (c) { return sv.chapters[c.id] && sv.chapters[c.id].done; });
    if (every && !sv.completedAt) { sv.completedAt = Date.now(); sv.badge = true; }
  }

  function markStep(kind) {
    var ch = run.ch, stp = run.step;
    if (!ch || !stp) return;
    persist(function (sv) {
      var key = ch.id + '/' + stp.id, r = sv.steps[key];
      if (kind === 'done') sv.steps[key] = { done: Date.now() };
      else if (!(r && r.done)) sv.steps[key] = { skipped: Date.now() };
      sv.current = { ch: ch.id, st: stp.id };
      markChapter(sv, ch);
    });
  }

  // Devam noktası: kayıttaki adım (bittiyse bir sonraki), yoksa ilk bitmemiş adım.
  function resumePoint(sv) {
    var cur = sv.current, ci = cur ? chapterIndex(cur.ch) : -1, si, ch;
    if (ci >= 0 && available(CURRICULUM[ci])) {
      ch = CURRICULUM[ci];
      si = stepIndex(ch, cur.st);
      if (si >= 0 && !stepDone(sv, ch, ch.steps[si])) return { ci: ci, si: si };
      if (si >= 0 && si + 1 < ch.steps.length) return { ci: ci, si: si + 1 };
      if (si < 0) { si = firstOpenStep(sv, ch); if (si >= 0) return { ci: ci, si: si }; }
    }
    for (var i = 0; i < CURRICULUM.length; i++) {
      if (!available(CURRICULUM[i])) continue;
      si = firstOpenStep(sv, CURRICULUM[i]);
      if (si >= 0) return { ci: i, si: si };
    }
    return { ci: firstAvailable(), si: 0 };
  }

  function progress() {
    var sv = saved(), total = 0, done = 0, skipped = 0, minutes = 0, list = [];
    CURRICULUM.forEach(function (ch, i) {
      var avail = available(ch), n = 0, d = 0, s = 0;
      if (avail) {
        ch.steps.forEach(function (stp) {
          var r = recOf(sv, ch, stp);
          n++;
          if (r && r.done) d++;
          else if (r && r.skipped) s++;
        });
        minutes += ch.estMin || 0;
      }
      total += n; done += d; skipped += s;
      list.push({ id: ch.id, index: i + 1, title: T(ch.title), phase: ch.phase || 1, available: avail,
        total: n, done: d, skipped: s, complete: chapterComplete(sv, ch) });
    });
    var avail = list.filter(function (c) { return c.available; });
    var r = resumePoint(sv), rch = CURRICULUM[r.ci];
    return {
      total: total, done: done, skipped: skipped,
      pct: total ? Math.round(100 * (done + skipped) / total) : 0,
      chapters: list, available: avail.length, minutes: minutes,
      started: !!sv.current || done + skipped > 0,
      completed: avail.length > 0 && avail.every(function (c) { return c.complete; }),
      completedAt: sv.completedAt || null,
      current: sv.current || null,
      resume: rch ? { ch: rch.id, st: rch.steps[r.si] ? rch.steps[r.si].id : null, index: r.ci + 1, title: T(rch.title) } : null
    };
  }

  // ---------------------------------------------------------------- motor durumu
  var run = {
    on: false, ci: -1, si: -1, ch: null, step: null, status: 'idle', rt: null,
    stepT0: 0, lastAct: 0, level: 0, wrong: 0, wrongEnc: null,
    autoT: null, hintT: null, correctT: null, correct: [], coachClosed: false, checkWarned: false,
    allow: {}, targetIds: {}, targetPads: false, winShown: false
  };
  var held = {};          // canlı (seq dışı) basılı notalar: src → {track, note}
  var seqN = 0;           // olay sıra numarası
  var seen = [];          // son işlenen (type, payload): bus ve app aynı olayı verirse bir kez işlenir
  var unsub = null, schedule = null, bound = [], tocBound = [], winBound = [], tocReturn = null;

  function anyHeld() { for (var k in held) if (own(held, k)) return true; return false; }
  function heldMods() {
    var h = P3.S && P3.S.held, out = {};
    if (h) for (var k in h) if (own(h, k) && h[k]) out[k] = true;
    return out;
  }

  function newRt(S) {
    return {
      base: clone(S || P3.S), notes: [], presses: [], steps: [], turns: {}, vals: {}, last: {}, heldChange: {},
      flags: {}, held: new Set(heldNotes()), t0: now(), n0: seqN
    };
  }

  // ---------------------------------------------------------------- kapı: izin ve hedef
  function ctlId(ev) {
    if (!ev || typeof ev !== 'object') return null;
    if (ev.k === 'pad') return 'pads';
    if (ev.k === 'strip') return 'strip';
    if (ev.k === 'dpad' || ev.k === 'octpage') return ev.id || (DIR_ID[ev.k] || {})[ev.dir] || null;
    return ev.id || null;
  }
  // Bırakışlar her zaman geçer (README §I2): basılı kalan kontrol asılı kalmasın.
  function isRelease(ev) {
    if (ev.k === 'btn' || ev.k === 'dpad' || ev.k === 'octpage' || ev.k === 'pad') return ev.down === false;
    if (ev.k === 'enc') return ev.touch === false;
    if (ev.k === 'strip') return !ev.down;
    return false;
  }
  function allowedId(id) { return !run.on || !id || !!ALWAYS[id] || !!run.allow[id]; }
  function isAllowed(ev) {
    if (!run.on || !ev) return true;
    var id = ctlId(ev);
    return !id || isRelease(ev) || allowedId(id);
  }
  function isTarget(id) { return id === 'pads' ? run.targetPads : !!run.targetIds[id]; }

  function buildGate(stp) {
    var allow = {}, tIds = {}, tPads = false;
    expand(stp.allow || []).forEach(function (id) { allow[id] = true; });
    targetsOf(stp).forEach(function (t) {
      if (t && t.pad) { tPads = true; return; }
      expand([t]).forEach(function (id) { tIds[id] = true; if (id === 'pads') tPads = true; });
    });
    run.allow = allow; run.targetIds = tIds; run.targetPads = tPads;
  }

  function disabledFor(stp) {
    var dev = P3.dev, out = [];
    if (!dev || !dev.CONTROLS) return out;
    for (var id in dev.CONTROLS) if (own(dev.CONTROLS, id) && !ALWAYS[id] && !run.allow[id]) out.push(id);
    return out;
  }

  // Kilit mesajı için hedefin okunur adı (kontrol adları cihazdaki gibi İngilizce kalır).
  var GROUP_NAME = { 'enc*': `encoder'lar`, 'upper*': `üst ekran düğmeleri`, 'lower*': `alt ekran düğmeleri`,
    'scene*': `scene düğmeleri`, dpad: 'D-pad', octpage: 'Octave / Page', pads: `pad'ler` };
  function nameOf(t) {
    var m;
    if (t && t.pad) return GROUP_NAME.pads;
    if (typeof t !== 'string') return '';
    if (own(GROUP_NAME, t)) return GROUP_NAME[t];
    if ((m = /^upper(\d)$/.exec(t))) return `üst sıradaki ${m[1]}. ekran düğmesi`;
    if ((m = /^lower(\d)$/.exec(t))) return `alt sıradaki ${m[1]}. ekran düğmesi`;
    if ((m = /^enc(\d)$/.exec(t))) return `Encoder ${m[1]}`;
    var c = P3.dev && P3.dev.CONTROLS && P3.dev.CONTROLS[t];
    return c ? c.label : t;
  }
  function targetName() {
    if (!run.step) return '';
    var names = [];
    targetsOf(run.step).forEach(function (t) {
      var n = nameOf(t);
      if (n && names.indexOf(n) < 0) names.push(n);
    });
    return names.slice(0, 2).join(` ve `);
  }
  function blockedText(ev) {
    var n = targetName();
    return n ? `Bu adımda ${n} ile ilgileniyoruz.` : `Bu adımda bu kontrol kullanılmıyor.`;
  }

  // ---------------------------------------------------------------- olay kaydı
  function noteHeld(p) {
    if (!p || p.src === 'seq' || p.src == null) return;
    if (p.on) held[p.src] = { track: p.track, note: p.note };
    else delete held[p.src];
  }

  function recIn(rt, ev, n, t) {
    var id = ctlId(ev);
    run.lastAct = t;
    if (!id || id === 'lcd' || id === 'escape') { armHints(); return; }
    if (ev.k === 'enc' && (ev.turn || ev.steps)) {
      rt.turns[id] = (rt.turns[id] || 0) + 1;
      if (run.status === 'active' && !ALWAYS[id] && !isTarget(id) && run.wrongEnc !== id) { run.wrongEnc = id; wrongOne(); }
      armHints();
      return;
    }
    var down = (ev.k === 'enc') ? (ev.touch === true || ev.press === true || ev.reset === true) : ev.down === true;
    if (!down) { armHints(); return; }
    var ok = allowedId(id);
    push(rt.presses, { n: n, t: t, k: ev.k, id: id, x: ev.x, y: ev.y, touch: ev.touch === true, press: !!ev.press, ok: ok, mods: heldMods() }, PRESSES_MAX);
    if (ev.k !== 'enc' || !ev.touch) run.wrongEnc = null;
    // Yanlış kontrol: hedef olmayan basış. İzinli pad'ler deneme alanıdır; encoder'a dokunmak (hover) sayılmaz.
    if (run.status === 'active' && !ALWAYS[id] && !isTarget(id) && !(ev.k === 'enc' && ev.touch) &&
      !(id === 'pads' && run.allow.pads)) wrongOne();
    armHints();
  }

  function recState(rt, e, n) {
    if (!e || typeof e.path !== 'string' || e.path === '*') return;
    var list = rt.vals[e.path] || (rt.vals[e.path] = []), h = anyHeld();
    push(list, { n: n, v: e.value, prev: e.prev, held: h }, VALS_MAX);
    rt.last[e.path] = n;
    if (h) rt.heldChange[e.path] = true;
  }

  function record(type, p) {
    if (type === 'note') noteHeld(p);
    var rt = run.rt;
    if (!rt || !p) return;
    var n = ++seqN, t = now();
    if (type === 'in') recIn(rt, p, n, t);
    else if (type === 'note') {
      push(rt.notes, { n: n, t: t, track: p.track, note: p.note, vel: p.vel, on: !!p.on, src: p.src,
        x: p.x, y: p.y, live: p.src !== 'seq' }, NOTES_MAX);
      rt.held = new Set(heldNotes());
    } else if (type === 'state') recState(rt, p, n);
    else if (type === 'step') push(rt.steps, { n: n, t: t, track: p.track, step: p.step, pad: p.pad, op: p.op }, STEPS_MAX);
  }

  var CHECK_TYPES = { 'in': true, state: true, note: true, transport: true, step: true };

  function onEvent(type, p) {
    if (!run.on) return;
    if (CHECK_TYPES[type] && p && typeof p === 'object') {
      for (var i = 0; i < seen.length; i++) if (seen[i].p === p && seen[i].type === type) return;
      push(seen, { type: type, p: p }, SEEN_MAX);
    }
    if (CHECK_TYPES[type]) {
      record(type, p);
      if (run.status === 'active' && schedule) schedule();
      if (type === 'state' && p && p.path === 'prefs.hints') { coachShow(); armHints(); }
    } else if (type === 'layout') coachShow();   // ilk çizimde geometri yoksa balon burada görünür olur
    else if (type === 'lang') { render(); if (tocOpen()) buildToc(); }
  }

  // ---------------------------------------------------------------- değerlendirme
  function evaluate() {
    if (schedule && schedule.cancel) schedule.cancel();
    if (!run.on || run.status !== 'active' || !run.rt || !run.step) return false;
    var stp = run.step, ok = false;
    if (stp.kind === 'concept' || typeof stp.check !== 'function') return false;
    try { ok = !!stp.check(P3.S, run.rt); }
    catch (e) {
      if (!run.checkWarned) { run.checkWarned = true; warn(`koşul hatası (${run.ch.id}/${stp.id})`, e); }
    }
    if (ok) success();
    return ok;
  }

  function success() {
    var stp = run.step;
    if (run.status !== 'active') return;
    clearTimeout(run.hintT);
    run.hintT = null;
    if (stp.kind === 'free') {   // 'Bitirdim →' etkinleşir; ilerlemek öğrencinin kararı
      run.status = 'ready';
      render();
      return;
    }
    run.status = 'success';
    markStep('done');
    celebrate();
    render();
    if (stp.kind === 'action') {
      clearTimeout(run.autoT);
      run.autoT = setTimeout(function () { run.autoT = null; if (run.on && run.status === 'success') advance(); },
        stp.autoMs > 0 ? stp.autoMs : AUTO_MS);
    }
  }

  // Hedefte kısa beyaz yanma (LED) ve hotspot'ta .p3-hl.correct.
  function celebrate() {
    var ts = targetsOf(run.step);
    if (fn(P3.leds, 'setTarget')) P3.leds.setTarget([]);
    if (fn(P3.leds, 'flash') && ts.length) P3.leds.flash(ts, FLASH_MS);
    clearCorrect();
    if (P3.dev && fn(P3.dev, 'hotspotEl')) {
      expand(ts.filter(function (t) { return typeof t === 'string'; })).forEach(function (id) {
        if (id === 'pads') return;
        var el = P3.dev.hotspotEl(id), hl = el && el.querySelector ? el.querySelector('.p3-hl') : null;
        if (hl) { hl.classList.add('correct'); run.correct.push(hl); }
      });
    }
    if (run.correct.length) run.correctT = setTimeout(clearCorrect, FLASH_MS);
  }
  function clearCorrect() {
    clearTimeout(run.correctT);
    run.correctT = null;
    run.correct.forEach(function (hl) { hl.classList.remove('correct'); });
    run.correct = [];
  }

  // ---------------------------------------------------------------- ipuçları
  function hintsOn() { var p = P3.S && P3.S.prefs; return !p || p.hints !== false; }

  function armHints() {
    clearTimeout(run.hintT);
    run.hintT = null;
    if (!run.on || run.status !== 'active' || !run.step || run.step.kind === 'concept' || !hintsOn() || run.level >= 2) return;
    var due = Infinity, t = now();
    if (run.level < 1) due = Math.min(due, run.lastAct + HINT1_IDLE_MS);
    if (run.level < 2) due = Math.min(due, run.stepT0 + HINT2_MS);
    if (due === Infinity) return;
    run.hintT = setTimeout(hintTick, Math.max(0, due - t) + 5);
  }
  function hintTick() {
    run.hintT = null;
    if (!run.on || run.status !== 'active') return;
    var t = now();
    // İçindekiler ya da bitiş kartı açıkken öğrenci adımda beklemiyor: süre sayılmaz.
    if (tocOpen() || run.winShown) { run.lastAct = t; run.stepT0 = Math.max(run.stepT0, t - HINT2_MS + HINT1_IDLE_MS); armHints(); return; }
    if (run.level < 2 && t - run.stepT0 >= HINT2_MS) setLevel(2);
    else if (run.level < 1 && t - run.lastAct >= HINT1_IDLE_MS) setLevel(1);
    armHints();
  }
  function wrongOne() {
    run.wrong++;
    if (!hintsOn()) return;
    if (run.wrong >= HINT2_WRONG) setLevel(2);
    else if (run.wrong >= HINT1_WRONG) setLevel(1);
  }
  function hintText() {
    var h = run.step && run.step.hints || [];
    return T(h[run.level >= 2 && h[1] ? 1 : 0]);
  }
  function setLevel(l) {
    if (!run.on || run.status !== 'active' || l <= run.level) return;
    var concept = run.step.kind === 'concept';
    run.level = Math.min(2, l);
    var h = hintText();
    if (!concept && run.level >= 2 && fn(P3.leds, 'setTarget')) P3.leds.setTarget(targetsOf(run.step));
    if (!coachShow() && h) P3.bus.emit('feedback', { text: `İpucu: ${h}` });
    armHints();
  }
  function hint() {
    if (!run.on || run.status !== 'active' || run.step.kind === 'concept') return false;
    var l = run.level;
    setLevel(l + 1);
    return run.level > l;
  }

  // ---------------------------------------------------------------- DOM
  function $(id) { return typeof document !== 'undefined' && document.getElementById ? document.getElementById(id) : null; }
  function setText(id, s) { var el = $(id); if (el && el.textContent !== s) el.textContent = s; return el; }
  function on(el, type, f, list) { if (!el || !el.addEventListener) return; el.addEventListener(type, f); list.push([el, type, f]); }
  function offAll(list) { list.forEach(function (b) { b[0].removeEventListener(b[1], b[2]); }); list.length = 0; }

  function isLastStep() {
    return run.ci === lastAvailable() && run.ch && run.si === run.ch.steps.length - 1;
  }

  function render() {
    if (!run.on || !run.step) return;
    var ch = run.ch, stp = run.step, sv = saved(), done = stepDone(sv, ch, stp), n = ch.steps.length;
    setText('p3TutTitle', T(stp.title) + (stp.optional ? ` (İleri)` : ''));
    setText('p3TutBody', T(stp.body));
    setText('p3TutListen', T(stp.listen));
    var pg = setText('p3Progress', `Bölüm ${run.ci + 1} · ${run.si + 1}/${n}`);
    if (pg) pg.title = T(ch.title);
    var ok = run.status === 'success' || run.status === 'ready';
    setText('p3TaskText', run.status === 'done' ? `Öğreticinin sonuna geldin.` : ok ? `✓ ${T(stp.success)}` : T(stp.do));
    var prev = $('p3TutPrev'), skip = $('p3TutSkip'), next = $('p3TutNext');
    if (prev) prev.disabled = run.ci === firstAvailable() && run.si === 0;
    if (skip) skip.disabled = run.status === 'success';
    if (next) {
      var label = null, enabled = true;
      if (stp.kind === 'concept') label = isLastStep() ? `Bitir →` : `Devam →`;
      else if (stp.kind === 'free') { label = `Bitirdim →`; enabled = run.status === 'ready' || done; }
      else if (done || run.status === 'success' || run.status === 'done') label = isLastStep() ? `Bitir →` : `Sonraki →`;
      next.hidden = !label;
      if (label) { next.textContent = label; next.disabled = !enabled; }
    }
    coachShow();
  }

  function focusTitle() {
    var el = $('p3TutTitle'), panel = $('p3TutPanel');
    if (!el || typeof document === 'undefined') return;
    var a = document.activeElement;
    if (a && a !== document.body && !(panel && panel.contains(a))) return;   // sahne odağını koru
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  // Coach balonu: `do` metni hedefe demirli; 1. kademede ipucu eklenir. true = gösteriliyor.
  function anchorOf(stp) {
    if (stp.anchor) return stp.anchor;
    var ts = targetsOf(stp);
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i];
      if (t && t.pad) return t;
      if (typeof t !== 'string') continue;
      if (P3.dev && P3.dev.GROUPS && P3.dev.GROUPS[t]) return t;
      var ids = expand([t]);
      if (ids.length) return ids[0];
    }
    return null;
  }
  function coachShow() {
    var el = $('p3Coach'), txt = $('p3CoachText');
    if (!el || !txt) return false;
    var stp = run.step, anchor = stp && anchorOf(stp), frame = el.parentNode;
    // Dar sahnede (telefon) balon pad'lerin büyük kısmını örterdi: görev metni taskbar'da, ipucu #p3Feedback'te.
    var want = run.on && !!anchor && run.status === 'active' && !run.coachClosed && stp.kind !== 'concept' &&
      (hintsOn() || run.level > 0) && !!frame && frame.clientWidth >= COACH_MIN_W;
    if (!want) { el.hidden = true; return false; }
    var h = run.level > 0 ? hintText() : '';
    txt.textContent = T(stp.do);
    if (h && typeof document !== 'undefined') {
      txt.appendChild(document.createElement('br'));
      var b = document.createElement('strong');
      b.textContent = `İpucu: `;
      txt.appendChild(b);
      txt.appendChild(document.createTextNode(h));
    }
    el.hidden = false;
    if (!placeCoach()) { el.hidden = true; return false; }
    return true;
  }
  function overlap(a, b) {
    if (!a || !b) return 0;
    var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  }
  function within(v, lo, hi) { return hi < lo ? lo : v < lo ? lo : v > hi ? hi : v; }

  // Balon hedefin üstüne, soluna, sağına ya da altına oturur ve çerçeve içinde kalır. Aday puanı: hedefi
  // örtmek çok, LCD'yi örtmek orta, izinli pad ızgarasını (hedef dışı pad'ler dahil) örtmek az ceza;
  // eşitlikte hedefe yakın olan.
  // false = konum yok (hedef görünür alanın dışında ya da sahne gizli).
  function placeCoach() {
    var el = $('p3Coach');
    if (!el || el.hidden || !run.step || !P3.dev || !fn(P3.dev, 'controlRect')) return false;
    var frame = el.offsetParent || el.parentNode, fw = frame ? frame.clientWidth : 0, fh = frame ? frame.clientHeight : 0;
    if (!fw || !fh) return false;
    var r = unionRect(), w = el.offsetWidth, h = el.offsetHeight, gap = 10, m = 4;
    if (!r || r.x + r.w < 0 || r.y + r.h < 0 || r.x > fw || r.y > fh) return false;
    var lcd = P3.dev.controlRect('lcd'), pads = run.allow.pads ? P3.dev.controlRect('pads') : null;
    var cx = r.x + r.w / 2, cy = r.y + r.h / 2, best = null;
    [[cx - w / 2, r.y - h - gap], [r.x - w - gap, cy - h / 2], [r.x + r.w + gap, cy - h / 2], [cx - w / 2, r.y + r.h + gap]]
      .forEach(function (c, i) {
        var box = { x: within(c[0], m, fw - w - m), y: within(c[1], m, fh - h - m), w: w, h: h };
        var s = 10 * overlap(box, r) + 3 * overlap(box, lcd) + overlap(box, pads) +
          Math.abs(box.x + w / 2 - cx) + Math.abs(box.y + h / 2 - cy) + i;
        if (!best || s < best.s) best = { s: s, x: box.x, y: box.y };
      });
    el.style.left = Math.round(best.x) + 'px';
    el.style.top = Math.round(best.y) + 'px';
    return true;
  }
  // Demir noktası: adımın anchor'ı; pad hedeflerinde bütün hedef pad'lerin birleşimi (balon onları örtmesin).
  function unionRect() {
    var stp = run.step, a = anchorOf(stp), list = [a];
    if (a && a.pad) list = targetsOf(stp).filter(function (t) { return t && t.pad; });
    var box = null;
    list.forEach(function (t) {
      var r = t ? P3.dev.controlRect(t) : null;
      if (!r || !(r.w > 0)) return;
      if (!box) box = { x: r.x, y: r.y, x2: r.x + r.w, y2: r.y + r.h };
      else { box.x = Math.min(box.x, r.x); box.y = Math.min(box.y, r.y); box.x2 = Math.max(box.x2, r.x + r.w); box.y2 = Math.max(box.y2, r.y + r.h); }
    });
    return box ? { x: box.x, y: box.y, w: box.x2 - box.x, h: box.y2 - box.y } : null;
  }
  function closeCoach() {
    run.coachClosed = true;
    var el = $('p3Coach');
    if (el) el.hidden = true;
  }

  function bindPanel() {
    offAll(bound);
    var acts = { p3TutPrev: prev, p3TutSkip: skip, p3TutToc: toc, p3TutFree: free, p3TutNext: next, p3CoachClose: closeCoach };
    PANEL_IDS.forEach(function (id) { on($(id), 'click', function (e) { if (e && e.preventDefault) e.preventDefault(); acts[id](); }, bound); });
  }

  // ---------------------------------------------------------------- İçindekiler (#p3Toc)
  function tocOpen() { var ov = $('p3Toc'); return !!ov && !ov.hidden; }

  // Satırlar menü kartlarının mevcut düzenini kullanır (.card + .p3-mode-card, ui.css .card-title); kabukta
  // öğreticiye özel CSS gerekmez. Faz 2 bölümü buton değildir (odak ve hover almaz), aria-disabled taşır.
  function tocRow(tag, cls, parts) {
    var el = document.createElement(tag);
    el.className = cls;
    parts.forEach(function (p) {
      var s = document.createElement(tag === 'button' ? 'span' : 'div');
      s.className = p[0];
      s.textContent = p[1];
      el.appendChild(s);
    });
    return el;
  }

  function buildToc() {
    var list = $('p3TocList');
    if (!list || typeof document === 'undefined') return null;
    var sv = saved(), first = null, curBtn = null;
    while (list.firstChild) list.removeChild(list.firstChild);
    CURRICULUM.forEach(function (ch, i) {
      var li = document.createElement('li'), avail = available(ch), isCur = run.on && run.ci === i;
      var n = ch.steps.length, d = ch.steps.filter(function (s) { return stepDone(sv, ch, s); }).length, complete = chapterComplete(sv, ch);
      var meta = !avail ? `Bölüm ${i + 1} · (yakında)`
        : `Bölüm ${i + 1} · ${d}/${n} adım` + (complete ? ` · tamamlandı ✓` : '') + (isCur ? ` · şu an` : '');
      var parts = avail ? [['p3-mode-meta', meta], ['card-title', T(ch.title)], ['p3-mode-desc', T(ch.summary)]]
        : [['p3-mode-meta', meta], ['p3-mode-desc', `${T(ch.title)}: ${T(ch.summary)}`]];
      var el;
      if (avail) {
        el = tocRow('button', 'card p3-mode-card p3-toc-item' + (complete ? ' is-done' : ''), parts);
        el.type = 'button';
        el.setAttribute('aria-label', `${i + 1}. ${T(ch.title)}, ` + (complete ? `tamamlandı` : `${d}/${n} adım`));
        if (!first) first = el;
        if (isCur) { el.setAttribute('aria-current', 'step'); curBtn = el; }
        on(el, 'click', function () { closeToc(); start(ch.id); }, tocBound);
      } else {
        el = tocRow('div', 'card p3-toc-item is-soon', parts);
        el.setAttribute('aria-disabled', 'true');
      }
      el.setAttribute('data-ch', ch.id);
      li.appendChild(el);
      list.appendChild(li);
    });
    return curBtn || first;
  }

  function toc() {
    var ov = $('p3Toc');
    if (!ov) return false;
    offAll(tocBound);
    var focus = buildToc();
    tocReturn = typeof document !== 'undefined' ? document.activeElement : null;
    ov.hidden = false;
    on($('p3TocClose'), 'click', closeToc, tocBound);
    on(ov, 'click', function (e) { if (e.target === ov) closeToc(); }, tocBound);
    on(ov, 'keydown', tocKey, tocBound);
    if (focus) try { focus.focus({ preventScroll: true }); } catch (e) { focus.focus(); }
    return true;
  }
  // Escape kapatır; Tab modalın içinde döner.
  function tocKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeToc(); return; }
    if (e.key !== 'Tab') return;
    var ov = $('p3Toc'), els = ov ? Array.prototype.filter.call(ov.querySelectorAll('button'), function (b) { return !b.disabled; }) : [];
    if (!els.length) return;
    var i = els.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); els[els.length - 1].focus(); }
    else if (!e.shiftKey && i === els.length - 1) { e.preventDefault(); els[0].focus(); }
  }
  function closeToc() {
    var ov = $('p3Toc');
    offAll(tocBound);
    if (ov) ov.hidden = true;
    var r = tocReturn;
    tocReturn = null;
    if (r && r.focus && typeof document !== 'undefined' && document.body.contains(r)) try { r.focus({ preventScroll: true }); } catch (e) { r.focus(); }
  }

  // ---------------------------------------------------------------- bitiş kartı (#p3Win)
  function showWin() {
    var win = $('p3Win');
    if (!win) return false;
    var p = progress(), all = p.completed;
    var missing = p.chapters.filter(function (c) { return c.available && !c.complete; })[0] || null;
    setText('p3WinTitle', all ? `Push 3 Öğretici ✓` : `Bölüm tamamlandı`);
    setText('p3WinText', all
      ? `${p.available} bölümün hepsini bitirdin: pad'lerle nota çalmak, Scale menüsü, Wavetable ile ses tasarımı ve davul programlama artık elinde. Repeat, kayıt ve Session bölümleri yakında geliyor.`
      : `Öğreticinin sonuna geldin. Bitmemiş bölüm: “${missing ? missing.title : ''}”. İstersen oraya dönebilir ya da Serbest Çal'da denemeye başlayabilirsin.`);
    var a = $('p3WinPrimary'), b = $('p3WinSecondary');
    offAll(winBound);
    if (a) { a.textContent = `Serbest Çal'a geç`; a.hidden = false; on(a, 'click', function () { hideWin(); free(); }, winBound); }
    if (b) {
      b.hidden = false;
      if (!all && missing) {
        b.textContent = `Eksik bölüme git`;
        on(b, 'click', function () { hideWin(); start(missing.id); }, winBound);
      } else {
        b.textContent = `İçindekiler`;
        on(b, 'click', function () { hideWin(); toc(); }, winBound);
      }
    }
    on(win, 'keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); hideWin(); } }, winBound);
    win.hidden = false;
    run.winShown = true;
    if (a) try { a.focus({ preventScroll: true }); } catch (e) { a.focus(); }
    return true;
  }
  function hideWin() {
    offAll(winBound);
    var win = $('p3Win');
    if (win && run.winShown) win.hidden = true;
    run.winShown = false;
  }

  // ---------------------------------------------------------------- görünüm (telefon)
  // Telefonda çalma görünümü (pads/padsStrip) encoder'ları ve ekranı göstermez. Adımın hedeflerinden biri
  // görünmüyorsa hepsini gösteren en dar görünüme geçilir (P3.app.setView, geçici); hedefler öğrencinin
  // kendi görünümüne sığınca oraya dönülür. Masaüstünde (full) hiç değişmez.
  var tempView = null, homeView = null;

  function viewBox(name) {
    var v = P3.dev.VIEWS && P3.dev.VIEWS[name], a = v ? String(v).split(/\s+/).map(Number) : null;
    return a && a.length === 4 ? { x: a[0], y: a[1], w: a[2], h: a[3] } : null;
  }
  // Hedefin merkezi görünümün içinde mi (isabet kutuları görsel kontrolden büyük olabilir: encoder 150×120).
  function shows(name, ts) {
    var b = viewBox(name);
    return !!b && ts.every(function (t) {
      var ids = t && t.pad ? [t] : (P3.dev.GROUPS && P3.dev.GROUPS[t] ? [t] : expand([t]));
      return ids.every(function (id) {
        var r = P3.dev.svgRect(id), cx = r ? r.x + r.w / 2 : 0, cy = r ? r.y + r.h / 2 : 0;
        return !r || (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h);
      });
    });
  }
  function fitView(stp) {
    var app = P3.app, dev = P3.dev, ts = targetsOf(stp), order = ['controls', 'padsStrip', 'full'];
    if (!app || !fn(app, 'setView') || !dev || !dev.VIEWS || !fn(dev, 'svgRect') || !ts.length) return;
    if (tempView && dev.view !== tempView) tempView = null;   // öğrenci görünümü kendisi değiştirdi
    var home = tempView ? homeView : dev.view;
    if (shows(home, ts)) {
      if (tempView) { tempView = null; app.setView(null); }
      return;
    }
    if (tempView && shows(tempView, ts)) return;
    for (var i = 0; i < order.length; i++) {
      if (!shows(order[i], ts)) continue;
      if (!tempView) homeView = dev.view;
      if (app.setView(order[i])) tempView = order[i];
      return;
    }
  }

  // ---------------------------------------------------------------- gezinme
  function clearStepTimers() {
    clearTimeout(run.autoT);
    clearTimeout(run.hintT);
    run.autoT = run.hintT = null;
  }

  function leaveStep() {
    clearStepTimers();
    clearCorrect();
    restoreTemp();
    run.rt = null;
    if (fn(P3.leds, 'setTarget')) P3.leds.setTarget([]);
  }

  function enterChapter(ci, si) {
    leaveStep();
    run.ci = ci;
    run.ch = CURRICULUM[ci];
    run.status = 'setup';
    try { if (run.ch.setup) run.ch.setup(emu); } catch (e) { warn(`bölüm kurulumu (${run.ch.id})`, e); }
    enterStep(Math.max(0, Math.min(si || 0, run.ch.steps.length - 1)));
  }

  function enterStep(si) {
    leaveStep();
    var stp = run.ch.steps[si];
    run.si = si;
    run.step = stp;
    run.status = 'setup';
    try { if (stp.stepSetup) stp.stepSetup(emu); } catch (e) { warn(`adım kurulumu (${run.ch.id}/${stp.id})`, e); }
    run.rt = newRt();
    run.status = 'active';
    run.stepT0 = run.lastAct = now();
    run.level = 0;
    run.wrong = 0;
    run.wrongEnc = null;
    run.coachClosed = false;
    run.checkWarned = false;
    seen.length = 0;
    buildGate(stp);
    // Kilit: app.allow kapıyı ve LED karartmasını birlikte kurar; app yoksa karartma burada yapılır.
    if (P3.app && fn(P3.app, 'allow')) P3.app.allow((stp.allow || []).slice());
    else if (fn(P3.leds, 'setDisabled')) P3.leds.setDisabled(disabledFor(stp));
    persist(function (sv) { sv.current = { ch: run.ch.id, st: stp.id }; });
    if (P3.app && fn(P3.app, 'setHash')) P3.app.setHash('ogretici/' + run.ch.id + '/' + stp.id);
    fitView(stp);
    render();
    focusTitle();
    armHints();
    if (schedule) schedule();
  }

  function advance() {
    if (!run.on || !run.ch) return;
    if (run.si + 1 < run.ch.steps.length) { enterStep(run.si + 1); return; }
    persist(function (sv) { markChapter(sv, run.ch); });
    var nci = nextAvailable(run.ci);
    if (nci >= 0) enterChapter(nci, 0);
    else finish();
  }

  function finish() {
    leaveStep();
    run.status = 'done';
    persist(function (sv) { if (run.ch) markChapter(sv, run.ch); });
    render();
    showWin();
  }

  function begin() {
    run.on = true;
    held = {};
    seen.length = 0;
    if (!schedule) schedule = P3.u && fn(P3.u, 'rafThrottle') ? P3.u.rafThrottle(evaluate) : function () { setTimeout(evaluate, 16); };
    if (!unsub && P3.bus) unsub = P3.bus.on('*', onEvent);
    var panel = $('p3TutPanel');
    if (panel) panel.hidden = false;
    bindPanel();
  }

  function start(slug, stepSlug) {
    if (!P3.S || !P3.store || P3.store.S !== P3.S) { warn(`store hazır değil`); return false; }
    var sv = saved(), ci = chapterIndex(slug), si = -1, note = null, r;
    if (ci >= 0 && !available(CURRICULUM[ci])) {
      note = `“${T(CURRICULUM[ci].title)}” bölümü yakında geliyor.`;
      ci = -1;
    }
    if (ci < 0) {
      r = resumePoint(sv);
      ci = r.ci;
      si = r.si;
    } else {
      var ch = CURRICULUM[ci];
      si = stepIndex(ch, stepSlug);
      if (si < 0 && sv.current && sv.current.ch === ch.id) si = stepIndex(ch, sv.current.st);
      if (si < 0) si = firstOpenStep(sv, ch);
      if (si < 0) si = 0;
    }
    if (ci < 0) return false;
    hideWin();
    if (!run.on) begin();
    enterChapter(ci, si);
    if (note && P3.bus) P3.bus.emit('feedback', { text: note });
    return true;
  }

  function stop() {
    if (!run.on) return;
    leaveStep();
    run.on = false;
    run.status = 'idle';
    run.step = null;
    run.ch = null;
    run.ci = run.si = -1;
    if (schedule && schedule.cancel) schedule.cancel();
    if (unsub) { unsub(); unsub = null; }
    offAll(bound);
    if (tocOpen()) closeToc();
    hideWin();
    var panel = $('p3TutPanel'), coach = $('p3Coach');
    if (panel) panel.hidden = true;
    if (coach) coach.hidden = true;
    if (P3.app && fn(P3.app, 'allow')) P3.app.allow(null);
    else if (fn(P3.leds, 'setDisabled')) P3.leds.setDisabled([]);
    if (tempView) { tempView = null; if (P3.app && fn(P3.app, 'setView')) P3.app.setView(null); }
    if (P3.save && fn(P3.save, 'flush')) P3.save.flush();
  }

  // İlerleme sıfırlandı (app: P3.save.reset sonrası). Bellekte kayıt tutulmaz; açık panel yeniden çizilir.
  function resetProgress() {
    P3.tut.handoff = null;
    if (run.on) { render(); if (tocOpen()) buildToc(); }
    return true;
  }

  // Concept adımında Devam, free adımında Bitirdim; action adımında (bitmiş ya da atlanmış) sonraki adım.
  function next() {
    if (!run.on || !run.step) return false;
    var stp = run.step, sv = saved();
    if (run.status === 'done') { showWin(); return true; }
    if (stp.kind === 'concept' && run.status === 'active') markStep('done');
    else if (stp.kind === 'free') {
      if (run.status !== 'ready' && !stepDone(sv, run.ch, stp)) return false;
      markStep('done');
    }
    advance();
    return true;
  }

  function prev() {
    if (!run.on || !run.ch) return false;
    if (run.si > 0 && run.status !== 'done') { enterStep(run.si - 1); return true; }
    if (run.status === 'done') { enterStep(run.si); return true; }
    var pci = prevAvailable(run.ci);
    if (pci < 0) return false;
    enterChapter(pci, CURRICULUM[pci].steps.length - 1);
    return true;
  }

  function skip() {
    if (!run.on || !run.step || run.status === 'success' || run.status === 'setup') return false;
    if (run.status !== 'done') markStep('skipped');
    advance();
    return true;
  }

  // 'Serbest Çal'da aç': ses ve set korunarak #serbest'e geçilir; app handoff.keep'i görünce serbest
  // modun kayıtlı snapshot'ını yüklememeli (sartname-ogretici §4).
  function free() {
    P3.tut.handoff = { keep: true, t: Date.now() };
    if (typeof location !== 'undefined') location.hash = '#serbest';
    return true;
  }

  function current() {
    return {
      on: run.on, ch: run.ch ? run.ch.id : null, st: run.step ? run.step.id : null, ci: run.ci, si: run.si,
      kind: run.step ? run.step.kind : null, status: run.status, level: run.level, wrong: run.wrong,
      allow: run.step ? (run.step.allow || []).slice() : [], targets: run.step ? targetsOf(run.step) : [], rt: run.rt
    };
  }

  P3.tut = {
    VERSION: CV,
    PHASE: PHASE,
    CURRICULUM: CURRICULUM,
    emu: emu,
    start: start,
    stop: stop,
    next: next,
    prev: prev,
    skip: skip,
    toc: toc,
    onEvent: onEvent,
    progress: progress,
    // EKLEME
    hint: hint,
    evaluate: evaluate,
    current: current,
    free: free,
    isAllowed: isAllowed,
    blockedText: blockedText,
    resetProgress: resetProgress,
    makeRt: function (S) { return newRt(S); },
    handoff: null
  };
})();
