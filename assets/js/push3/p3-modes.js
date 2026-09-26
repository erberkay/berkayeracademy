/* Push 3 Laboratuvarı — durum makinesi (p3-modes.js)
 *
 * p3-input'un olaylarını (bus 'in' → P3.app.gate → P3.modes.dispatch) Push 3 davranışına çevirir:
 * buton sınıfları (sartname-mimari §6), modifier kombinasyonları, Scale ve Learn overlay'leri, Device
 * zincir/bank görünümü ve encoder yönlendirmesi, 64 Notes ve Drum Loop Selector pad'leri, Volume,
 * Swing & Tempo, Jog ve Touch Strip. Sözleşme: docs/push3/README.md §G10, §A5, §A11, §A17, §H ve
 * Dalga 2 ortak sözleşmesi; davranış: dogrulanmis-donanim.md, sartname-kontrol-haritasi.md,
 * sartname-scale-note.md (§4 Scale menüsü, §6 drum), dogrulanmis-wavetable.md §C.
 *
 * Modül 'in' olayına kendisi abone olmaz (gate p3-app'te). Pad notaları store'dan geçmez: doğrudan
 * P3.wt / P3.drums'a gider, ardından bus 'note' yayınlanır. Diğer her değişiklik P3.store.set/tx ile
 * yazılır; LED, LCD, motor ve öğretici 'state' olayından güncellenir.
 *
 * SAPMA / EKLEME:
 * - Basılı tutma S.held'de ({t0, used}, store'a sessiz yazılır). Basılı bir düğme varken başka bir kontrol
 *   gelirse (düğme/pad basışı, encoder dokunuşu/dönüşü, strip dokunuşu) basılı olanların hepsi `used` olur;
 *   modTap düğmeleri (Mute, Solo, Stop Clip, Delete) ancak kısa ve `used` değilken tek başına çalışır.
 * - Encoder dokunuşu: S.wtui.touched 'state' olayıyla yazılır (görev metnindeki "silent" yerine: LCD, LED
 *   halkası ve öğretici koşulu ek bir çağrı gerekmeden güncellenir). Fareyle dokunuş = hover olduğundan
 *   bırakılan dokunuş 2 sn geçerli kalır (imleç upper8 = Add to Matrix'e gidebilsin) ve bu sürede yol
 *   üstünde geçilen başka bir encoder dokunuşu ancak 150 ms üstünde durulursa devralır. Bank, track ya da
 *   overlay değişince bırakılmış dokunuş silinir.
 * - Enc1..8 dokunuşunda popup yok: LCD dokunulan sütunun adını beyaz çizer; popup görselleştirmeyi örterdi
 *   (dogrulanmis-donanim: dokunmanın ekranda değer gösterdiği doğrulanamadı). Volume dokunma popup'ı da
 *   Swing & Tempo gibi 400 ms gecikmeli (fare geçerken titremesin); çevirmede popup hemen çıkar.
 * - Undo: cihaz parametreleri (k slotları, Osc Pitch, matris miktarları) encoder dokunuşu boyunca tek kayıt
 *   (merge 'encN'), etiketi slot adı. Seçiciler (Oscillator, Filter, Envelopes, LFO, View, Mod Target),
 *   Filter Switch / Expression Mode ve Add to Matrix / Back / Go to görünüm durumudur, undo'ya girmez.
 *   Scale değişikliği ('Scale') yalnız ayarı kaydeder; yeniden hizalanan pos'lar undo'suz yazılır ve Scale
 *   undo/redo'sunda o anki pos eski ↔ yeni ayarla yeniden hizalanır (aradaki Octave hareketleri korunur).
 *   Scale menüsündeki encoder ve jog dönüşleri dokunuş boyunca birleşir. Mute ('Mute'), Solo ('Solo'), clip silme ('Delete Clip') undo'lu.
 *   Octave, bank, sayfa, grid, seçim, volume ve tempo undo'suz (Live'da da geçmişe girmez).
 * - Stop Clip / Shift+Stop Clip (§I5): P3.seq.stopClip(seçili track) / P3.seq.stopAllClips(); clip bir sonraki
 *   bar'da durur (kuantizasyon ve çalan notaların kapanması seq'te). Popup yok (gerçek cihaz gibi).
 *   Delete tek başına: P3.seq.deleteClip(track, slot), yoksa tx 'Delete Clip' (clips.slot = null).
 *   Seçili clip = çalan slot, yoksa 0 (VARSAYIM, p3-leds ile aynı).
 * - Loop pad: tek dokunuş P3.seq.setLoopPage(track, page) (bırakınca); bas-tut + ikinci pad ve çift
 *   dokunuş (500 ms) P3.seq.setLoopRange(track, a, b) (çift dokunuşta a = b).
 * - Page ◀▶ (drum) görünen sayfayı değiştirir ve P3.seq.setFollow(track, false); Page'i HOLD_MS'den uzun
 *   tutmak setFollow(track, true) (P3 kılavuzu 7.3.1: basılı tutmak auto-follow'u geri açar).
 * - Mute/Solo/Stop Clip + alt ekran düğmesi o track'e uygulanır (kılavuz §17; Seviye 2 "Mute + lower2").
 *   Delete + alt ekran düğmesi (track silme) işlevsiz. Mute/Solo/Stop Clip/Delete + üst ekran düğmesi
 *   (cihazı kapatma / silme, dogrulanmis-donanim §5) Faz 1'de işlevsiz: üst düğme kendi işini yapmaz. Mute/Solo + drum pad (kılavuz; Faz 1 listesinde
 *   yok ama p3-leds ve p3-seq t.padMute / t.padSolo'yu zaten okuyor): pad susturulur / exclusive solo,
 *   undo 'Mute' / 'Solo'; susturulan pad canlı çalmada da sessiz. Delete/Select + step işlevsiz (Faz 2).
 * - Desteklenmeyen kontrol popup'ı: metin 'Not in this simulator', alt satır kontrolün adı; açıklama bus
 *   'feedback'. Layout (kısmi): düzen adı + 'Other layouts: coming soon'. Main Track §H13. Metronome (§I9):
 *   HOLD_MS (300 ms) ve üstü basılı tutmak aç/kapa YAPMAZ; popup 'Metronome' / 'Settings: coming soon' +
 *   Faz 2 menü açıklaması (P3.K.UNSUPPORTED.metronome, yoksa kendi metnimiz). Kısa basış aç/kapa. Scale
 *   menüsü dışında D-pad okları popup + açıklama (Session, Faz 2); orta düğme UNSUPPORTED.dpadC.
 * - Delete + drum pad (§I10): pad'in clip'teki notaları silinir; notası yoksa LCD popup 'No notes'.
 * - Volume: 'track' hedefi Main Track'tir, S.vol.track'te tutulur (initState'te yok, varsayılan 0 dB; motor
 *   mixBus'a uygular, §I8). Headphones değeri tutulur ama ses değişmez; popup alt satırı P3.lcd.text.volumeSub
 *   ('Browser: single output').
 *   −inf = −71 (−70'in altı; P3.u.dbToGain 0 verir, JSON'a yazılabilir). Sıfırlama (Delete + dokunma /
 *   klavye Delete): P3.K.VOL_DEF (Main, Headphones −6 dB, Cue −10 dB, Main Track 0 dB); Tempo 120 BPM, Swing %0.
 * - Scene düğmeleri: Repeat açıkken tekrar hızı (repeat.rate), drum track'te step çözünürlüğü (grid; görünen
 *   sayfa aynı zaman konumunda kalır). Synth track'te Repeat kapalıyken (Repeat Faz 2) popup 'Not in this
 *   simulator' + UNSUPPORTED.repeat açıklaması; repeat.rate yazılmaz.
 * - Jog: Scale menüsünde gam ±1, Learn'de bölüm sayfası, bank görünümünde bank ±1; sola itme overlay'i
 *   kapatır ya da bank görünümünden çıkar. Basma ve sağa itme Faz 1'de işlevsiz.
 * - Track değişince bank görünümü kapanır (VARSAYIM: bank görünümü cihaza ait). Drum track'te upper1
 *   işlevsiz (§H14: Drum Rack sayfasında bank yok).
 * - Overlay açılışı P3.panic('overlay') (A11) ve bus 'overlay' {name, prev} yayar; kapanış kesmez.
 * - Drum strip: strip Drum Rack'in −36…76 bank aralığını gösterir (p3-leds noktası); dokunulan konuma
 *   16'şar (Shift ile 4'er) pad adımıyla gidilir. Octave ve strip bank popup'ı 'E2 - G3' (görünen 16 pad).
 * - Select + drum pad popup'ı 'G♭1 Closed Hat' (nota adı + kit adı, boş pad '—').
 * - Pitch bend 30 ms'lik dönüşü 4 adımda gönderilir (worklet PB'yi yumuşatmıyor).
 * - Kayıt: nota basılınca recordNote(track, midi, vel, onT) (açık), bırakınca recordNote(…, onT, offT).
 *   Drum vuruşları da yazılır. Zaman P3.audio.toCtxTime(ev.t), yoksa ctx.currentTime.
 * - Learn: upper k → bus 'learn' {chapter: P3.lcd.learnChapterAt(k)} (LCD'de o düğmenin üstündeki bölümün
 *   slug'ı; LCD yoksa sıra k−1; boş düğmede olay yok). Page ◀▶ ve jog S.learnPage'i ±1 değiştirir (§I14:
 *   sessiz ve undo'suz yazılır, ardından P3.lcd.invalidate()); Learn açılırken S.learnPage ve S.learnSel
 *   silinir (LCD güncel bölümü ve onun sayfasını açar). Jog sola itme kapatır.
 * - Ek API: openOverlay(name), selectTrack(i), applyPreset(i, id) (öğretici emu ve taskbar preset'i için).
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  // ---------------------------------------------------------------- sabitler
  var NOT_HERE = 'Not in this simulator';
  var TOUCH_GRACE_MS = 2000, DWELL_MS = 150;
  var PB_RETURN_MS = 30, PB_RETURN_STEPS = 4;
  var VOL_MIN = -70, VOL_INF = -71, VOL_MAX = 6;
  // Varsayılan seviyeler P3.K.VOL_DEF'ten (initState ile aynı); yoksa bu yedek.
  var VOL_DEF_FB = { main: -6, phones: -6, track: 0, cue: -10 };
  function volDef(tg) { var d = (P3.K && P3.K.VOL_DEF) || VOL_DEF_FB; return typeof d[tg] === 'number' ? d[tg] : VOL_DEF_FB[tg]; }
  var VOL_TARGETS = ['main', 'phones', 'track', 'cue'];
  var VOL_LABEL = { main: 'Main Output', phones: 'Headphones', track: 'Main Track', cue: 'Cue' };
  var BPM_MIN = 20, BPM_MAX = 999, BPM_DEF = 120;
  var DRUM_BANK_MIN = -36, DRUM_BANK_MAX = 76, DRUM_OCT = 16;   // p3-scale ve p3-leds ile aynı aralık
  var LAYOUT_NAME = { synth: 'Melodic: 64 Notes', drum: 'Drums: Loop Selector' };
  var DPAD_STEP = { dpadUp: -1, dpadDown: 1, dpadLeft: -4, dpadRight: 4 };
  var DIR_ID = {
    dpad: { up: 'dpadUp', down: 'dpadDown', left: 'dpadLeft', right: 'dpadRight', center: 'dpadC' },
    octpage: { up: 'octaveUp', down: 'octaveDown', left: 'pageLeft', right: 'pageRight' }
  };

  // UNSUPPORTED'da karşılığı olmayan kısmi durumların açıklaması (#p3Feedback).
  var TEXT = {
    // §I9: P3.K.UNSUPPORTED.metronome yoksa kullanılır.
    metroMenu: { tr: `Basılı tutunca metronom ayarları açılır (yakında).` },
    dpad: { tr: `D-pad: Session'da clip ızgarasını bir track ya da bir scene kaydırır (yakında). Scale menüsü açıkken oklar gam listesinde gezinir.` }
  };

  // ---------------------------------------------------------------- modül durumu
  var inited = false;
  var live = {};            // src → çalan canlı nota {track, midi, vel, x, y, drum, onT}
  var phys = {};            // encoder n → fiziksel dokunuş (hover, klavye odağı, parmak)
  var dwellT = {};          // encoder n → dokunuşu devralmayı bekleyen zamanlayıcı
  var graceT = null;        // bırakılmış dokunuşu silecek zamanlayıcı
  var popT = {};            // volume / swingTempo → gecikmeli dokunma popup'ı
  var metroT = null;        // Metronome basılı tutma (menü) zamanlayıcısı
  var pbT = null;           // pitch bend dönüş rampası
  var strip = null;         // süren Touch Strip hareketi
  var loopHold = null;      // basılı loop pad'i {track, page, src, used}
  var loopTap = null;       // son tek dokunuş {track, page, t}: çift dokunuş için
  var accentPrev = false;   // Accent basılmadan önceki durum (latchMom)
  var scaleByPress = false; // Scale overlay'i bu basışla mı açıldı (momentary kapanış)
  var mergeSeq = 0;         // buton işlemlerinin undo birleştirme anahtarı

  // ---------------------------------------------------------------- yardımcılar
  function now() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function trunc(v) { return v < 0 ? Math.ceil(v) : Math.floor(v); }
  function fn(o, name) { return !!o && typeof o[name] === 'function'; }
  function set(path, value, opts) { return P3.store.set(path, value, opts); }
  function selIndex() { var s = P3.S.sel; return (s && s.track) || 0; }
  function track(i) { return P3.S.tracks[i === undefined ? selIndex() : i]; }
  function isDrum(t) { return !!t && t.kind === 'drum'; }
  // Encoder'lar yalnız parametreleri kurulmuş synth track'te çalışır (store.init p'yi wtp.defaults ile doldurur).
  function isSynth(t) { return !!t && t.kind === 'synth' && !!P3.wtp && !!t.p && t.p.length === P3.wtp.PARAMS.length; }
  function curSlot(t) { return t.playing >= 0 ? t.playing : 0; }
  function recording() { var tr = P3.S.transport; return !!tr && (tr.rec === 'rec' || tr.rec === 'overdub'); }
  function popup(text, sub) { if (fn(P3.lcd, 'popup')) P3.lcd.popup(text, sub); }
  function feedback(o) { if (o) P3.bus.emit('feedback', { text: P3.t(o) }); }
  function controlLabel(id) {
    var c = P3.dev && P3.dev.CONTROLS && P3.dev.CONTROLS[id];
    return c ? c.label : id;
  }
  function unsupported(id) { popup(NOT_HERE, controlLabel(id)); feedback(P3.K.UNSUPPORTED[id]); }

  // ---------------------------------------------------------------- basılı tutma (S.held)
  // Store'a sessiz yazılır: LED'ler basılı düğmeyi 'in' olayından ve isHeld'den bilir.
  function heldOf(id) { var S = P3.S; return S && S.held ? S.held[id] : undefined; }
  function isHeld(id) { return !!heldOf(id); }
  function heldIds() { var S = P3.S; return S && S.held ? Object.keys(S.held) : []; }
  function hold(id) {
    if (!P3.S.held || typeof P3.S.held !== 'object') set('held', {}, { silent: true });
    set('held.' + id, { t0: now(), used: false }, { silent: true });
  }
  function unhold(id) {
    var h = heldOf(id);
    if (h) set('held.' + id, undefined, { silent: true });
    return h;
  }
  // Basılı düğmeler bu olayla bir kombinasyonun parçası oldu: tek başına işlevleri artık çalışmaz.
  function useHeld(except) {
    var h = P3.S.held;
    if (h) for (var id in h) if (id !== except && h[id]) h[id].used = true;
  }

  // ---------------------------------------------------------------- overlay, track, bank
  function openOverlay(name) {
    var S = P3.S, prev = S.overlay || null;
    name = name || null;
    if (prev === name) return false;
    if (name === 'learn') {   // §I14: LCD güncel bölümü ve onun sayfasını açar
      if (S.learnPage !== undefined) set('learnPage', undefined, { silent: true });
      if (S.learnSel !== undefined) set('learnSel', undefined, { silent: true });
    }
    set('overlay', name);
    releaseTouch();
    P3.bus.emit('overlay', { name: name, prev: prev });
    if (name) P3.panic('overlay');   // A11: overlay açılışı asılı notaları keser
    return true;
  }

  function selectTrack(i) {
    var S = P3.S;
    if (!S.tracks[i] || selIndex() === i) return false;
    set('sel.track', i);
    if (S.bankView) set('bankView', false);
    releaseTouch();
    return true;
  }

  function goBank(i) {
    var S = P3.S;
    i = clamp(i, 0, P3.wtp.BANKS.length - 1);
    if (i === S.wtui.bank) return;
    P3.wtp.setBank(S, i);
    releaseTouch();
  }

  // ---------------------------------------------------------------- encoder dokunuşu (S.wtui.touched)
  function setTouched(i) {
    clearTimeout(graceT);
    graceT = null;
    if (P3.S.wtui && P3.S.wtui.touched !== i) set('wtui.touched', i);
  }

  function physFirst() { for (var n = 1; n <= 8; n++) if (phys[n]) return n; return 0; }

  // Bırakılmış dokunuş bir süre geçerli kalır; süre dolunca silinir ve undo birleştirmesi kapanır.
  function armGrace(n) {
    clearTimeout(graceT);
    graceT = setTimeout(function () {
      graceT = null;
      P3.store.endMerge('enc' + n);
      if (P3.S && P3.S.wtui.touched === n - 1 && !phys[n]) set('wtui.touched', -1);
    }, TOUCH_GRACE_MS);
  }

  function touchOn(n) {
    phys[n] = true;
    if (P3.S.overlay) return;   // overlay sayfalarında dokunulan sütun gösterilmez
    var cur = P3.S.wtui.touched;
    if (cur >= 0 && cur !== n - 1 && !phys[cur + 1]) {
      // Önceki dokunuş bırakıldı ama hâlâ geçerli: imleç yolda olabilir, üstünde durulursa devralınır.
      clearTimeout(dwellT[n]);
      dwellT[n] = setTimeout(function () {
        dwellT[n] = null;
        if (phys[n] && !P3.S.overlay) setTouched(n - 1);
      }, DWELL_MS);
      return;
    }
    setTouched(n - 1);
  }

  function touchOff(n) {
    phys[n] = false;
    clearTimeout(dwellT[n]);
    dwellT[n] = null;
    P3.store.endMerge('enc' + n);
    P3.store.endMerge('scale:enc' + n);
    if (P3.S.wtui.touched !== n - 1) return;
    var other = physFirst();
    if (other) setTouched(other - 1);
    else armGrace(n);
  }

  // Dönüş kesin niyettir: dokunuş beklemeden o encoder'a geçer (klavye odağı dokunuş vermeyebilir).
  function touchByTurn(n) {
    clearTimeout(dwellT[n]);
    dwellT[n] = null;
    setTouched(n - 1);
    if (!phys[n]) armGrace(n);
  }

  // Görünüm değişti (bank, track, overlay): bırakılmış dokunuş artık başka bir parametreyi gösterir.
  function releaseTouch() {
    var w = P3.S.wtui;
    if (w && w.touched >= 0 && !phys[w.touched + 1]) setTouched(-1);
  }

  // ---------------------------------------------------------------- Scale
  function scaleCopy(sc) { return { root: sc.root, idx: sc.idx, inKey: sc.inKey, fixed: sc.fixed, layoutIdx: sc.layoutIdx }; }

  // Kök, gam, In Key ya da Fixed değişince synth track'lerin konumu aynı "oktav + derece" yerinde kalacak
  // şekilde yeniden hizalanır (sartname-scale-note §4). Undo kaydında yalnız ayar vardır: konum undo'suz
  // yazılır, undo/redo'da onScaleHistory o anki konumu yeniden hizalar (arada yapılan Octave kaybolmaz).
  function realignPos(before, after) {
    P3.S.tracks.forEach(function (t, i) {
      if (t.kind === 'synth' && typeof t.pos === 'number') set('tracks.' + i + '.pos', P3.scale.realign(before, after, t.pos));
    });
  }

  function setScale(key, value, merge) {
    var S = P3.S, before = scaleCopy(S.scale), after = scaleCopy(S.scale);
    if (before[key] === value) return false;
    after[key] = value;
    set('scale.' + key, value, { undo: 'Scale', merge: merge || 'scale#' + (++mergeSeq) });
    realignPos(before, after);
    return true;
  }

  // bus 'undo'/'redo': kayıtta scale.* değiştiyse (ve konumu kayıt kendisi geri yüklemiyorsa) pad konumu
  // uygulamadan önceki ayardan şimdikine hizalanır.
  function onScaleHistory(undo, ev) {
    var ch = ev && ev.changes, S = P3.S, sc = [], i, m;
    if (!Array.isArray(ch) || !S || !S.scale) return;
    for (i = 0; i < ch.length; i++) {
      if (/^tracks\.\d+\.pos$/.test(ch[i].path)) return;
      m = /^scale\.(\w+)$/.exec(ch[i].path);
      if (m) sc.push([m[1], undo ? ch[i].next : ch[i].prev]);
    }
    if (!sc.length) return;
    var before = scaleCopy(S.scale), after = scaleCopy(S.scale);
    sc.forEach(function (c) { before[c[0]] = c[1]; });
    realignPos(before, after);
  }

  function scaleIdx(d, merge) {
    setScale('idx', clamp(P3.S.scale.idx + d, 0, P3.scale.SCALES.length - 1), merge);
  }

  // Scale menüsü: Enc1 düzen (4ths/3rds/Sequential, sınırlı), Enc2..7 gam listesi; Enc8 boş.
  function scaleEnc(n, steps) {
    if (n === 1) setScale('layoutIdx', clamp(P3.S.scale.layoutIdx + steps, 0, P3.scale.LAYOUTS.length - 1), 'scale:enc1');
    else if (n <= 7) scaleIdx(steps, 'scale:enc' + n);
  }

  // ---------------------------------------------------------------- pad'ler
  function velOf(ev) {
    if (P3.S.accent && P3.S.accent.on) return 127;   // A6: Accent açıkken her nota 127
    return clamp(Math.round(typeof ev.vel === 'number' ? ev.vel : P3.K.kbVel), 1, 127);
  }

  // Kayıt notası dokunuş anına yerleşsin diye olay zamanı ses bağlamı zamanına çevrilir.
  function ctxTime(t) {
    var A = P3.audio;
    if (!A || !A.ctx) return null;
    if (typeof t === 'number' && fn(A, 'toCtxTime')) {
      var c = A.toCtxTime(t);
      if (typeof c === 'number' && isFinite(c)) return c;
    }
    return A.ctx.currentTime;
  }

  function noteOn(ev, i, midi, vel, pad) {
    var drum = pad !== undefined;
    if (drum) { if (fn(P3.drums, 'trigger') && padAudible(track(i), pad)) P3.drums.trigger(pad, vel); }
    else if (fn(P3.wt, 'noteOn')) P3.wt.noteOn(i, 'p:' + ev.src, midi, vel);
    var n = live[ev.src] = { track: i, midi: midi, vel: vel, x: ev.x, y: ev.y, drum: drum, onT: null };
    // Kayıtta nota açık kalır; süresi bırakınca ikinci recordNote çağrısıyla kapanır.
    if (recording() && fn(P3.seq, 'recordNote')) {
      n.onT = ctxTime(ev.t);
      if (n.onT !== null) P3.seq.recordNote(i, midi, vel, n.onT);
    }
    P3.bus.emit('note', { track: i, note: midi, vel: vel, on: true, src: ev.src, x: ev.x, y: ev.y });
  }

  // A11: nota basıldığı perdede kapanır; arada octave/scale değişse de yeni perde tetiklenmez.
  function noteOff(src, t) {
    var n = live[src];
    if (!n) return;
    delete live[src];
    if (!n.drum && fn(P3.wt, 'noteOff')) P3.wt.noteOff(n.track, 'p:' + src);
    if (n.onT !== null && fn(P3.seq, 'recordNote')) {
      var off = ctxTime(t);
      P3.seq.recordNote(n.track, n.midi, n.vel, n.onT, off === null ? n.onT : Math.max(off, n.onT));
    }
    P3.bus.emit('note', { track: n.track, note: n.midi, vel: 0, on: false, src: src, x: n.x, y: n.y });
  }

  function releaseLive() { Object.keys(live).forEach(function (src) { noteOff(src, now()); }); }

  function padDown(ev) {
    var i = selIndex(), t = track();
    noteOff(ev.src, ev.t);   // aynı kaynaktan kapanmamış nota (MIDI / klavye tekrarı) önce kapanır
    if (!t) return;
    if (isDrum(t)) { drumDown(ev, i, t); return; }
    // Faz 1'de tek pad modu var (Session desteklenmiyor); synth track 64 Notes çalar.
    var m = P3.scale.padNote(P3.S.scale, t.pos, ev.x, ev.y);
    if (m !== null) noteOn(ev, i, m, velOf(ev));
  }

  function padUp(ev) {
    noteOff(ev.src, ev.t);
    loopUp(ev);
  }

  // Ses kimliği olayın kaynağıdır (§H4); kaynaksız olay (test, öğretici) konumdan kimlik alır.
  function padEv(ev) {
    var e = { x: ev.x | 0, y: ev.y | 0, vel: ev.vel, t: ev.t, src: ev.src || 'xy:' + ev.x + ',' + ev.y };
    if (!ev.down) { padUp(e); return; }
    useHeld();
    padDown(e);
  }

  // Drum Loop Selector (sartname-scale-note §6): sol alt 4×4 drum pad, üst 4 satır step, sağ alt loop.
  function drumDown(ev, i, t) {
    var c = P3.scale.drumCell(ev.x, ev.y, t);
    if (c.k === 'drum') drumPad(ev, i, t, c.pad);
    else if (c.k === 'step') drumStep(i, t, c.step);
    else if (c.k === 'loop') loopDown(ev, i, c.page);
  }

  function padName(pad) {
    var k = P3.drums && P3.drums.KIT ? P3.drums.KIT[pad] : null;
    return P3.scale.noteName(36 + pad) + ' ' + (k && k.name ? k.name : '—');
  }

  // Susturulmuş ya da başka bir pad solodayken pad sessizdir; p3-seq clip çalarken aynı kuralı uygular.
  function padAudible(t, pad) {
    if (t.padMute && t.padMute[pad]) return false;
    if (t.padSolo) for (var k in t.padSolo) if (t.padSolo[k]) return !!t.padSolo[pad];
    return true;
  }

  // Mute/Solo + drum pad: Drum Rack zincirini susturur / solo yapar (P3 kılavuzu). Alanlar p3-leds ve
  // p3-seq ile ortak; nesne bütün olarak yazılır (tek 'state' yolu, undo'lu). Pad solosu da exclusive.
  function togglePadMute(i, t, pad) {
    var m = {}, k;
    for (k in t.padMute || {}) if (t.padMute[k]) m[k] = true;
    if (m[pad]) delete m[pad];
    else m[pad] = true;
    set('tracks.' + i + '.padMute', m, { undo: 'Mute' });
  }

  function togglePadSolo(i, t, pad) {
    var s = {};
    if (!(t.padSolo && t.padSolo[pad])) s[pad] = true;
    set('tracks.' + i + '.padSolo', s, { undo: 'Solo' });
  }

  function drumPad(ev, i, t, pad) {
    if (isHeld('delete')) {
      // §I10: notası olmayan pad'de popup (gerçek cihaz pad'in sesini siler; burada yok).
      if (fn(P3.seq, 'deletePadNotes') && !P3.seq.deletePadNotes(i, pad)) popup('No notes');
      return;
    }
    if (isHeld('mute')) { togglePadMute(i, t, pad); return; }
    if (isHeld('solo')) { togglePadSolo(i, t, pad); return; }
    if (t.selPad !== pad) set('tracks.' + i + '.selPad', pad);
    if (isHeld('select')) { popup(padName(pad)); return; }   // Select + pad: çalmadan seç (§H14)
    noteOn(ev, i, 36 + pad, velOf(ev), pad);
  }

  function drumStep(i, t, step) {
    if (isHeld('mute')) {
      if (fn(P3.seq, 'stepMute')) P3.seq.stepMute(i, step);
      return;
    }
    if (isHeld('delete') || isHeld('select')) return;   // Faz 2 step kombinasyonları: yanlışlıkla nota eklenmesin
    if (fn(P3.seq, 'stepToggle')) P3.seq.stepToggle(i, step, t.selPad);
  }

  // p3-seq: setLoopPage tek dokunuş (görünüm o sayfaya; loop dışındaysa loop o sayfa), setLoopRange
  // açık aralık (bas-tut + ikinci pad; çift dokunuşta a = b).
  function setLoop(i, a, b) {
    if (b !== undefined && fn(P3.seq, 'setLoopRange')) P3.seq.setLoopRange(i, a, b);
    else if (fn(P3.seq, 'setLoopPage')) P3.seq.setLoopPage(i, a);
  }

  // Loop pad'i basılıyken ikinci bir loop pad'i: loop o iki sayfa arası (P3 kılavuzu 6.1).
  function loopDown(ev, i, page) {
    if (isHeld('delete')) return;   // Delete + loop pad (sayfayı temizle) Faz 2
    var h = loopHold;
    if (h && h.track === i && h.src !== ev.src) {
      h.used = true;
      setLoop(i, Math.min(h.page, page), Math.max(h.page, page));
      return;
    }
    loopHold = { track: i, page: page, src: ev.src, used: false };
  }

  // Aralık seçmeyen bırakış bir dokunuştur; aynı pad'e DOUBLE_MS içinde ikinci dokunuş loop'u o sayfa yapar.
  function loopUp(ev) {
    var h = loopHold;
    if (!h || h.src !== ev.src) return;
    loopHold = null;
    if (h.used) return;
    var t = typeof ev.t === 'number' ? ev.t : now();
    var dbl = !!loopTap && loopTap.track === h.track && loopTap.page === h.page && t - loopTap.t < P3.K.DOUBLE_MS;
    loopTap = dbl ? null : { track: h.track, page: h.page, t: t };
    if (dbl) setLoop(h.track, h.page, h.page);
    else setLoop(h.track, h.page);
  }

  // ---------------------------------------------------------------- track işlevleri
  function toggleMute(i) {
    var t = track(i);
    if (t) set('tracks.' + i + '.mute', !t.mute, { undo: 'Mute' });
  }

  // Exclusive Solo varsayılan açık (P3 kılavuzu): solo alan track dışındakilerin solosu kalkar.
  function toggleSolo(i) {
    var ts = P3.S.tracks;
    if (!ts[i]) return;
    var on = !ts[i].solo;
    P3.store.tx('Solo', function () {
      ts.forEach(function (t, j) { set('tracks.' + j + '.solo', j === i ? on : false); });
    });
  }

  // Clip durdurma seq'in işidir (§I5: bir sonraki bar'da durur, çalan seq notaları kapanır).
  function stopClip(i) {
    if (track(i) && fn(P3.seq, 'stopClip')) P3.seq.stopClip(i);
  }

  function stopAllClips() {
    if (fn(P3.seq, 'stopAllClips')) P3.seq.stopAllClips();
    else if (fn(P3.seq, 'stopClip')) P3.S.tracks.forEach(function (t, i) { P3.seq.stopClip(i); });
  }

  // Delete tek başına: seçili track'in seçili clip'i silinir (P3 kılavuzu §17).
  function deleteClip() {
    var i = selIndex(), t = track();
    if (!t || !t.clips) return;
    var slot = curSlot(t);
    if (!t.clips[slot]) return;
    if (fn(P3.seq, 'deleteClip')) { P3.seq.deleteClip(i, slot); return; }
    P3.store.tx('Delete Clip', function () {
      if (t.playing === slot) set('tracks.' + i + '.playing', -1);
      set('tracks.' + i + '.clips.' + slot, null);
    });
  }

  // ---------------------------------------------------------------- ekran düğmeleri
  function modHeld() { return isHeld('mute') || isHeld('solo') || isHeld('stopClip') || isHeld('delete'); }

  function upper(k) {
    var S = P3.S, t = track();
    if (S.overlay === 'scale') {
      if (k >= 2 && k <= 7) setScale('root', P3.scale.ROOT_NOTES[k - 2]);
      return;
    }
    if (S.overlay === 'learn') { learnOpen(k); return; }
    // Mute/Solo/Stop Clip/Delete + üst ekran düğmesi cihaza uygulanır (kapatma / silme; Faz 1'de yok):
    // üst düğme kendi işini (bank görünümü, seçenek) yapmaz (lower() ile aynı kapı).
    if (modHeld()) return;
    if (!isSynth(t)) return;
    if (k === 1) {
      set('bankView', !S.bankView);
      releaseTouch();
    } else if (S.bankView) {
      option(t, k - 2);
    }
  }

  function lower(k) {
    var S = P3.S, i = k - 1;
    if (S.overlay === 'scale') {
      if (k === 1) setScale('inKey', !S.scale.inKey);
      else if (k === 8) setScale('fixed', !S.scale.fixed);
      else setScale('root', P3.scale.ROOT_NOTES[k + 4]);
      return;
    }
    if (S.overlay) return;
    // Modifier + alt ekran düğmesi: işlev o track'e uygulanır (dogrulanmis-donanim §5).
    if (isHeld('mute')) { toggleMute(i); return; }
    if (isHeld('solo')) { toggleSolo(i); return; }
    if (isHeld('stopClip')) { stopClip(i); return; }
    if (isHeld('delete')) return;
    if (S.bankView && isSynth(track())) goBank(i);
    else selectTrack(i);
  }

  // Filter Switch ve Expression Mode S.wtui'deki seçicilerdir; virtualSwitch değer listesini
  // VIRTUAL'daki seçiciyle paylaşır.
  function viewSwitch(o) {
    var V = P3.wtp.VIRTUAL;
    for (var n in V) if (V[n].values && V[n].values === o.values) return true;
    return false;
  }

  // Bank görünümünde üst düğme 2..8 (dogrulanmis-wavetable §C). Switch her basışta sıradaki değere geçer.
  function option(t, idx) {
    var S = P3.S, b = P3.wtp.BANKS[S.wtui.bank], o = b ? b.options(S, t)[idx] : null;
    if (!o) return;
    if (o.kind === 'toggle') {
      o.set(S, t, !o.get(S, t), { undo: o.label });
    } else if (o.kind === 'switch') {
      o.set(S, t, (o.get(S, t) + 1) % o.values.length, viewSwitch(o) ? undefined : { undo: o.label });
    } else if (!o.enabled || o.enabled(S, t)) {
      var bank = S.wtui.bank;
      o.run(S, t);
      if (S.wtui.bank !== bank) releaseTouch();
    }
  }

  // Repeat açıkken tekrar hızı, drum track'te step çözünürlüğü. 64 Notes'ta Repeat kapalıyken scene'in işi
  // tekrar hızıdır; Repeat Faz 2 olduğundan desteklenmeyen kontrol gibi popup + açıklama, duruma yazılmaz.
  function scene(k) {
    var i = selIndex(), t = track(), g = k - 1;
    if (!t) return;
    if (t.repeat && t.repeat.on) { set('tracks.' + i + '.repeat.rate', g); return; }
    if (!isDrum(t)) { popup(NOT_HERE, controlLabel('scene' + k)); feedback(P3.K.UNSUPPORTED.repeat); return; }
    if (t.grid === g) return;
    // Sayfa uzunluğu çözünürlükle değişir; görünen sayfa aynı zaman konumunda kalır.
    var sc = P3.scale, page = Math.floor(t.page * sc.pageBeats(t) / sc.pageBeats({ grid: g }) + 1e-9);
    set('tracks.' + i + '.grid', g);
    set('tracks.' + i + '.page', page);
  }

  // ---------------------------------------------------------------- Octave, Page, D-pad
  function setPos(i, pos) {
    var S = P3.S, t = S.tracks[i];
    if (pos === t.pos) return;
    set('tracks.' + i + '.pos', pos);
    popup(P3.scale.rangeText(S.scale, t));
  }

  function setDrumBank(i, bank) {
    var t = track(i), name = P3.scale.noteName;
    if (!t || bank === t.bank) return;
    set('tracks.' + i + '.bank', bank);
    popup(name(36 + bank) + ' - ' + name(51 + bank));
  }

  // Melodik: oktav, Shift ile gamda bir nota. Drum: ±16 pad, Shift ile bir satır (P3 kılavuzu).
  function octave(up) {
    var S = P3.S, i = selIndex(), t = track(), sc = P3.scale, shift = isHeld('shift');
    if (!t) return;
    if (isDrum(t)) {
      var d = { bank: t.bank };
      if (shift) sc.drumBankShift(d, up ? sc.DRUM_ROW : -sc.DRUM_ROW);
      else if (up) sc.drumBankUp(d);
      else sc.drumBankDown(d);
      setDrumBank(i, d.bank);
      return;
    }
    var p = { pos: t.pos };
    if (shift) sc.shiftStep(S.scale, p, up ? 1 : -1);
    else if (up) sc.octUp(S.scale, p);
    else sc.octDown(S.scale, p);
    setPos(i, p.pos);
  }

  // Sequencer sayfası (drum): elle seçilen sayfa auto-follow'u kapatır, Page'i basılı tutmak geri açar
  // (P3 kılavuzu 7.3.1). 64 Notes'ta sayfa yok. Learn sayfasında bölüm sayfaları arasında gezinir.
  function page(d) {
    var S = P3.S, i = selIndex(), t = track();
    if (S.overlay === 'learn') { learnPage(d); return; }
    if (!isDrum(t)) return;
    var np = t.page + d, clip = t.clips && t.clips[curSlot(t)];
    if (np < 0) return;
    if (d > 0 && !(clip && np * P3.scale.pageBeats(t) < clip.len - 1e-9)) return;
    set('tracks.' + i + '.page', np);
    if (fn(P3.seq, 'setFollow')) P3.seq.setFollow(i, false);
  }

  function pageHeld(h, long) {
    if (long && isDrum(track()) && !P3.S.overlay && fn(P3.seq, 'setFollow')) P3.seq.setFollow(selIndex(), true);
  }

  // ---------------------------------------------------------------- Learn
  // Bölüm listesi p3-tutorial'ın (P3.tut.CURRICULUM: dizi ya da {chapters}); LCD 8'erli sayfalar çizer.
  function learnChapters() {
    var c = P3.tut && P3.tut.CURRICULUM;
    return Array.isArray(c) ? c : (c && Array.isArray(c.chapters) ? c.chapters : []);
  }

  // Upper k'nın açacağı bölüm LCD'de görünen sayfaya bağlıdır: LCD sorulur, yoksa sıra (k − 1).
  function learnOpen(k) {
    var ch = fn(P3.lcd, 'learnChapterAt') ? P3.lcd.learnChapterAt(k) : k - 1;
    if (ch !== null && ch !== undefined) P3.bus.emit('learn', { chapter: ch });
  }

  // S.learnPage yoksa LCD güncel bölümün sayfasını gösterir; o sayfa upper1'in bölümünden bulunur.
  function learnPage(d) {
    var list = learnChapters(), pages = Math.ceil(list.length / 8), cur = P3.S.learnPage, first, i;
    if (pages < 2) return;
    if (typeof cur !== 'number') {
      cur = 0;
      first = fn(P3.lcd, 'learnChapterAt') ? P3.lcd.learnChapterAt(1) : null;
      for (i = 0; i < list.length; i++) if (String(list[i].id || list[i].slug || i) === first) cur = Math.floor(i / 8);
    }
    var next = clamp(cur + d, 0, pages - 1);
    if (next === P3.S.learnPage) return;
    set('learnPage', next, { silent: true });   // §I14: görünüm durumu, undo'suz ve olaysız
    if (fn(P3.lcd, 'invalidate')) P3.lcd.invalidate();
    // Olaysız yazıldığından LED'ler de elle yenilenir (boş bölüm sütunu ve uç sayfada Page ışığı söner).
    if (fn(P3.leds, 'invalidate')) P3.leds.invalidate(['upper*', 'pageLeft', 'pageRight']);
  }

  // Scale menüsünde ↑ −1, ↓ +1, ← −4, → +4 (sınırlı). Menü dışında Session gezinmesi (Faz 2).
  function dpadArrow(id) {
    if (P3.S.overlay === 'scale') { scaleIdx(DPAD_STEP[id]); return; }
    popup(NOT_HERE, 'D-pad');
    feedback(TEXT.dpad);
  }

  // ---------------------------------------------------------------- düğme sınıfları
  var DOWN = {}, UP = {};

  // modTap (sartname-mimari §6): kısa ve kombinasyonsuz basış tek başına işlevi yapar.
  function alone(f) { return function (h, long) { if (!h.used && !long) f(); }; }
  UP.mute = alone(function () { toggleMute(selIndex()); });
  UP.solo = alone(function () { toggleSolo(selIndex()); });
  UP.stopClip = alone(function () { stopClip(selIndex()); });
  UP['delete'] = alone(deleteClip);
  DOWN.stopClip = function () {
    if (!isHeld('shift')) return;
    heldOf('stopClip').used = true;   // Shift + Stop Clip: tüm clip'ler; bırakış ayrıca durdurmaz
    stopAllClips();
  };

  // latchMom: kısa basış kalıcı açar/kapatır, basılı tutmak yalnız basılıyken açar.
  DOWN.accent = function () { accentPrev = !!P3.S.accent.on; set('accent.on', true); };
  UP.accent = function (h, long) { set('accent.on', long ? accentPrev : !accentPrev); };

  // overlay: basış aç/kapa; bu basışla açılıp HOLD_MS'den uzun tutulduysa bırakınca kapanır.
  DOWN.scale = function () {
    scaleByPress = P3.S.overlay !== 'scale';
    openOverlay(scaleByPress ? 'scale' : null);
  };
  UP.scale = function (h, long) {
    if (long && scaleByPress && P3.S.overlay === 'scale') openOverlay(null);
    scaleByPress = false;
  };

  // toggleMenu (§I9): kısa basış aç/kapa. HOLD_MS ve üstü basılı tutma menüyü açar (Faz 2): aç/kapa yok,
  // yalnız açıklama. Zamanlayıcı basılıyken gösterir; bırakış zamanlayıcıdan önce gelirse (dt ≥ HOLD_MS)
  // açıklama bırakışta gösterilir.
  function metroMenu() {
    popup('Metronome', 'Settings: coming soon');
    feedback(P3.K.UNSUPPORTED.metronome || TEXT.metroMenu);
  }
  DOWN.metronome = function () {
    clearTimeout(metroT);
    metroT = setTimeout(function () {
      metroT = null;
      if (isHeld('metronome')) metroMenu();
    }, P3.K.HOLD_MS);
  };
  UP.metronome = function (h, long) {
    var pending = metroT !== null;
    clearTimeout(metroT);
    metroT = null;
    if (!long) setMetronome(!P3.S.transport.metro);
    else if (pending) metroMenu();
  };

  // action: işlev basışta çalışır.
  DOWN.play = function () { if (fn(P3.seq, 'toggle')) P3.seq.toggle(); };
  DOWN.record = function () { if (fn(P3.seq, 'recPress')) P3.seq.recPress(); };
  DOWN.tapTempo = function () { if (fn(P3.seq, 'tap')) P3.seq.tap(); };
  // Shift + Undo = Redo. Yığın boşken düğme sönük ve işlevsiz (p3-leds).
  DOWN.undo = function () {
    var st = P3.store, redo = isHeld('shift'), label = redo ? st.redoLabel() : st.undoLabel();
    if (redo ? st.redo() : st.undo()) popup(redo ? 'Redo' : 'Undo', label || '');
  };
  DOWN.device = function () { openOverlay(null); set('view', 'device'); };
  DOWN.learn = function () { openOverlay(P3.S.overlay === 'learn' ? null : 'learn'); };
  DOWN.note = function () { set('pad', 'note'); };
  // Kısmi destek (UNSUPPORTED partial): Faz 1'de tek düzen var; gerçek cihazın düzen bildirimi + açıklama.
  DOWN.layout = function () {
    popup(LAYOUT_NAME[isDrum(track()) ? 'drum' : 'synth'], 'Other layouts: coming soon');
    feedback(P3.K.UNSUPPORTED.layout);
  };
  DOWN.mainTrack = function () { popup('Main Track', NOT_HERE); feedback(P3.K.UNSUPPORTED.mainTrack); };   // §H13
  DOWN.octaveUp = function () { octave(true); };
  DOWN.octaveDown = function () { octave(false); };
  DOWN.pageLeft = function () { page(-1); };
  DOWN.pageRight = function () { page(1); };
  UP.pageLeft = UP.pageRight = pageHeld;
  DOWN.dpadUp = DOWN.dpadDown = DOWN.dpadLeft = DOWN.dpadRight = dpadArrow;

  (function () {
    function on(f, k) { return function () { f(k); }; }
    for (var k = 1; k <= 8; k++) {
      DOWN['upper' + k] = on(upper, k);
      DOWN['lower' + k] = on(lower, k);
      DOWN['scene' + k] = on(scene, k);
    }
  })();

  function button(id, ev) {
    if (!id || id === 'lcd') return;   // LCD tıklaması yalnız Seviye 1'in bulma görevi içindir
    if (id === 'escape') {             // panic ve bırakmaları p3-input yaptı
      if (ev.down) openOverlay(null);
      return;
    }
    if (ev.down) {
      useHeld(id);
      hold(id);
      if (DOWN[id]) DOWN[id](id, ev);
      else if (P3.K.UNSUPPORTED[id]) unsupported(id);   // A17: sessiz kalmaz
      return;
    }
    var h = unhold(id);
    if (!h || !UP[id]) return;   // reset'te bırakılmış ya da bırakışta işi yok
    UP[id](h, (typeof ev.dt === 'number' ? ev.dt : now() - h.t0) >= P3.K.HOLD_MS);
  }

  // ---------------------------------------------------------------- Volume, Swing & Tempo, Jog
  // Transport alanlarının sahibi p3-seq (zamanlamayı yeniden kurar); yoksa (test, erken açılış) store'a yazılır.
  function setBpm(v) { if (fn(P3.seq, 'setBpm')) P3.seq.setBpm(v); else set('transport.bpm', v); }
  function setSwing(v) { if (fn(P3.seq, 'setSwing')) P3.seq.setSwing(v); else set('transport.swing', v); }
  function setMetronome(on) { if (fn(P3.seq, 'metronome')) P3.seq.metronome(on); else set('transport.metro', on); }

  function delayedPopup(id, on, show) {
    clearTimeout(popT[id]);
    popT[id] = on ? setTimeout(function () { popT[id] = null; show(); }, P3.K.TOUCH_POPUP_MS) : null;
  }

  function volTarget() { var tg = P3.S.vol.target; return VOL_LABEL[tg] ? tg : 'main'; }
  function volOf(tg) { var v = P3.S.vol[tg]; return typeof v === 'number' ? v : volDef(tg); }
  function fmtDb(db) { return db < VOL_MIN ? '-inf dB' : (Math.round(db * 10) / 10 || 0).toFixed(1) + ' dB'; }
  // §I8: Headphones hedefinde alt satır 'Browser: single output' (metin P3.lcd.text'ten; ARIA ile aynı).
  function volumePopup() {
    var tg = volTarget(), T = P3.lcd && P3.lcd.text;
    var sub = T && typeof T.volumeSub === 'function' ? T.volumeSub(P3.S) : '';
    popup(VOL_LABEL[tg] + ': ' + fmtDb(volOf(tg)), sub || undefined);
  }

  // −70 dB'in altı −inf: aşağı inerken −70'ten sonra −inf'e düşer, yukarı dönüş −70'ten başlar.
  function volStep(db, steps, fine) {
    if (!(db >= VOL_MIN)) return steps > 0 ? VOL_MIN : VOL_INF;
    var v = Math.round((db + steps * (fine ? 0.1 : 1)) * 10) / 10;
    return v < VOL_MIN ? VOL_INF : Math.min(v, VOL_MAX);
  }

  // Volume: çevir ±1 dB (Shift ±0.1); bas: Main → Headphones → Main Track → Cue; dokun: seçili hedef.
  function volumeEnc(ev) {
    var tg = volTarget(), v;
    if (ev.touch !== undefined) { delayedPopup('volume', ev.touch, volumePopup); return; }
    if (ev.press) {
      set('vol.target', VOL_TARGETS[(VOL_TARGETS.indexOf(tg) + 1) % VOL_TARGETS.length]);
      volumePopup();
      return;
    }
    if (ev.reset) v = volDef(tg);
    else if (ev.steps) v = volStep(volOf(tg), ev.steps, ev.fine);
    else return;
    delayedPopup('volume', false);
    set('vol.' + tg, v);
    volumePopup();
  }

  function tempoPopup() {
    var S = P3.S, tr = S.transport;
    popup(S.swingTempo === 'swing' ? 'Swing Amount: ' + Math.round(tr.swing) + '%' : 'Tempo: ' + (+tr.bpm).toFixed(2) + ' BPM');
  }

  // Tempo ±1 BPM (Shift ±0.1), 20–999; Swing ±%1 (Shift'te de), 0–100; bas: Tempo ⇄ Swing (P3 §17).
  function swingTempoEnc(ev) {
    var S = P3.S, tr = S.transport, swing = S.swingTempo === 'swing', v;
    if (ev.touch !== undefined) { delayedPopup('swingTempo', ev.touch, tempoPopup); return; }
    if (ev.press) {
      set('swingTempo', swing ? 'tempo' : 'swing');
      tempoPopup();
      return;
    }
    if (ev.reset) v = swing ? 0 : BPM_DEF;
    else if (!ev.steps) return;
    else if (swing) v = clamp(Math.round(tr.swing) + ev.steps, 0, 100);
    else v = clamp(Math.round((tr.bpm + ev.steps * (ev.fine ? 0.1 : 1)) * 100) / 100, BPM_MIN, BPM_MAX);
    if (swing) setSwing(v);
    else setBpm(v);
    delayedPopup('swingTempo', false);
    tempoPopup();
  }

  // Jog: çevir = liste/bank gezinme, sola itme = geri (P3 kılavuzu). Basma ve sağa itme Faz 1'de işlevsiz.
  function jogEnc(ev) {
    var S = P3.S;
    if (ev.touch === false) { P3.store.endMerge('scale:jog'); return; }
    if (ev.nudge === 'left') {
      if (S.overlay) openOverlay(null);
      else if (S.bankView) { set('bankView', false); releaseTouch(); }
      return;
    }
    if (!ev.steps) return;
    if (S.overlay === 'scale') scaleIdx(ev.steps, 'scale:jog');
    else if (S.overlay === 'learn') learnPage(ev.steps);
    else if (!S.overlay && S.bankView && isSynth(track())) goBank(S.wtui.bank + ev.steps);
  }

  // ---------------------------------------------------------------- Enc1..8
  function slotOf(t, n) {
    if (!isSynth(t)) return null;   // Drum Rack sayfasında encoder'lar boş (§H14)
    var S = P3.S, b = P3.wtp.BANKS[S.wtui.bank];
    return b ? b.slots(S, t)[n - 1] : null;
  }

  // Seçiciler (varsayılanı olmayan sanal slotlar) görünüm durumudur: undo'ya girmez.
  function undoOpts(s, merge) {
    if (s.v && P3.wtp.VIRTUAL[s.v].def === undefined) return undefined;
    return merge ? { undo: s.label, merge: merge } : { undo: s.label };
  }

  function deviceEnc(n, ev) {
    var S = P3.S;
    if (!S.wtui) return;
    if (ev.touch === true) { touchOn(n); return; }
    if (ev.touch === false) { touchOff(n); return; }
    if (S.overlay === 'scale') { if (ev.steps) scaleEnc(n, ev.steps); return; }
    if (S.overlay) return;   // Learn sayfasında encoder'ların işi yok
    var t = track(), s = slotOf(t, n);
    if (!s) return;          // boş slot ya da Main + Filter 2'de Enc4 (A5)
    // Çift tık ya da Delete + dokunma: varsayılana dön (dogrulanmis-wavetable §C).
    if (ev.reset) { P3.wtp.slotReset(S, t, s, undoOpts(s)); return; }
    if (!ev.turn && !ev.steps) return;
    touchByTurn(n);
    P3.wtp.slotTurn(S, t, s, ev.turn || 0, ev.steps || 0, !!ev.fine, undoOpts(s, 'enc' + n));
  }

  function encoder(ev) {
    var id = ev.id, m;
    if (ev.touch !== false) useHeld();   // touch:false bir bırakıştır, kombinasyon değildir
    if (id === 'volume') volumeEnc(ev);
    else if (id === 'swingTempo') swingTempoEnc(ev);
    else if (id === 'jog') jogEnc(ev);
    else if ((m = /^enc([1-8])$/.exec(id))) deviceEnc(+m[1], ev);
  }

  // ---------------------------------------------------------------- Touch Strip
  function cancelPbReturn() {
    clearTimeout(pbT);
    pbT = null;
  }

  // Bırakınca pitch bend 30 ms'de merkeze döner; worklet PB'yi yumuşatmadığı için adım adım gönderilir.
  function pbReturn(i) {
    var from = P3.S.strip.pb || 0, k = 0;
    set('strip.pb', 0);
    if (!fn(P3.wt, 'pb')) return;
    if (!from) { P3.wt.pb(i, 0); return; }
    (function stepBack() {
      k++;
      P3.wt.pb(i, from * (1 - k / PB_RETURN_STEPS));
      pbT = k < PB_RETURN_STEPS ? setTimeout(stepBack, PB_RETURN_MS / (PB_RETURN_STEPS - 1)) : null;
    })();
  }

  function stripStart(v) {
    var S = P3.S, i = selIndex(), t = track(), g;
    if (!t) return null;
    if (isDrum(t)) {
      g = { kind: 'bank', track: i };
    } else if (isHeld('select')) {
      // Select + dokunma: Pitch Bend ⇄ Mod Wheel (P3 s.140); bu dokunuş değer göndermez.
      var mode = S.strip.mode === 'mod' ? 'pb' : 'mod';
      set('strip.mode', mode);
      popup(mode === 'mod' ? 'Mod Wheel' : 'Pitch Bend');
      return { kind: 'none' };
    } else if (isHeld('shift')) {
      g = { kind: 'oct', track: i, v0: v, pos0: t.pos, n: 0 };
    } else {
      g = { kind: S.strip.mode === 'mod' ? 'mod' : 'pb', track: i };
    }
    stripMove(g, v);
    return g;
  }

  function stripMove(g, v) {
    var S = P3.S, t = track(g.track);
    v = clamp(+v || 0, 0, 1);
    if (!t) return;
    if (g.kind === 'pb') {
      var pb = Math.round((v * 2 - 1) * 1000) / 1000;
      if (fn(P3.wt, 'pb')) P3.wt.pb(g.track, pb);
      set('strip.pb', pb);
    } else if (g.kind === 'mod') {
      if (fn(P3.wt, 'mw')) P3.wt.mw(g.track, v);
      set('strip.mod', v);
    } else if (g.kind === 'oct') {
      // Shift + kaydırma: yüksekliğin her 1/8'i bir oktav (VARSAYIM, sartname-scale-note §3). Başlangıç
      // konumundan sayılır: parmak geri dönünce konum da tam geri döner.
      var n = trunc((v - g.v0) * 8);
      if (n === g.n) return;
      g.n = n;
      var p = { pos: g.pos0 };
      for (var k = 0; k < Math.abs(n); k++) {
        if (n > 0) P3.scale.octUp(S.scale, p);
        else P3.scale.octDown(S.scale, p);
      }
      setPos(g.track, p.pos);
    } else if (g.kind === 'bank') {
      // Strip Drum Rack'in bank aralığını gösterir; dokunulan yere 16'şar (Shift ile 4'er) pad adımıyla gidilir.
      var step = isHeld('shift') ? P3.scale.DRUM_ROW : DRUM_OCT;
      var target = DRUM_BANK_MIN + v * (DRUM_BANK_MAX - DRUM_BANK_MIN);
      setDrumBank(g.track, clamp(t.bank + Math.round((target - t.bank) / step) * step, DRUM_BANK_MIN, DRUM_BANK_MAX));
    }
  }

  function stripEv(ev) {
    if (ev.down) {
      useHeld();
      cancelPbReturn();
      strip = stripStart(ev.v);
      return;
    }
    if (!strip) return;
    if (ev.up) {
      var g = strip;
      strip = null;
      if (g.kind === 'pb') pbReturn(g.track);
      return;
    }
    stripMove(strip, ev.v);
  }

  // ---------------------------------------------------------------- preset
  // Preset değişimi tek undo kaydıdır (§H3): p, mods ve preset adı yeni nesnelerle yazılır; motor
  // 'tracks.i.p' / 'tracks.i.mods' yolunu görünce track'i baştan kurar.
  function applyPreset(i, id) {
    var t = P3.S && P3.S.tracks[i];
    if (!t || t.kind !== 'synth' || !P3.wtp) return false;
    var fresh = { p: null, mods: {} };
    P3.wtp.applyPreset(fresh, id);
    P3.store.tx('Preset', function () {
      set('tracks.' + i + '.p', fresh.p);
      set('tracks.' + i + '.mods', fresh.mods);
      set('tracks.' + i + '.preset', fresh.preset);
    });
    return true;
  }

  // ---------------------------------------------------------------- yaşam döngüsü
  function clearTimers() {
    clearTimeout(graceT);
    clearTimeout(metroT);
    cancelPbReturn();
    graceT = metroT = null;
    Object.keys(dwellT).forEach(function (n) { clearTimeout(dwellT[n]); });
    Object.keys(popT).forEach(function (k) { clearTimeout(popT[k]); });
    dwellT = {};
    popT = {};
  }

  function clearGestures() {
    phys = {};
    strip = null;
    loopHold = null;
    loopTap = null;
    scaleByPress = false;
  }

  // Ses motorları panic'te kendi seslerini keser; burada kayıt notaları kapanır ve LED/öğretici için
  // note-off yayınlanır. Worklet panic'te PB'yi sıfırlar: süren bükme de biter.
  function onPanic() {
    releaseLive();
    loopHold = null;
    cancelPbReturn();
    if (strip && strip.kind === 'pb') strip = null;
    if (P3.S && P3.S.strip && P3.S.strip.pb) set('strip.pb', 0);
  }

  // Geri yüklenen durumun basılı tutma ve dokunuş alanları eski oturumdan gelebilir.
  function onRestore() {
    releaseLive();
    clearTimers();
    clearGestures();
    set('held', {}, { silent: true });
    if (P3.S.wtui) set('wtui.touched', -1, { silent: true });
  }

  function init() {
    if (inited) return P3.modes;
    inited = true;
    P3.bus.on('panic', onPanic);
    P3.bus.on('restore', onRestore);
    P3.bus.on('undo', function (ev) { onScaleHistory(true, ev); });
    P3.bus.on('redo', function (ev) { onScaleHistory(false, ev); });
    return P3.modes;
  }

  // Mod değişimi (p3-app startMode): overlay kapanır, basılı durumlar temizlenir, asılı notalar kesilir.
  function reset() {
    var S = P3.S;
    clearTimers();
    if (S) {
      releaseLive();
      if (isHeld('accent')) set('accent.on', accentPrev);   // momentary Accent basılıyken kesildi
      set('held', {}, { silent: true });
      if (S.wtui && S.wtui.touched !== -1) set('wtui.touched', -1);
      if (S.strip && S.strip.pb) set('strip.pb', 0);
      if (S.overlay) {
        var prev = S.overlay;
        set('overlay', null);
        P3.bus.emit('overlay', { name: null, prev: prev });
      }
    }
    clearGestures();
    P3.panic('mode');
  }

  function dispatch(ev) {
    if (!ev || !P3.S || !P3.store || P3.store.S !== P3.S) return;
    switch (ev.k) {
      case 'btn':
        button(ev.id, ev);
        break;
      case 'dpad':
      case 'octpage':
        button(ev.id || (DIR_ID[ev.k] || {})[ev.dir], ev);
        break;
      case 'pad':
        padEv(ev);
        break;
      case 'enc':
        encoder(ev);
        break;
      case 'strip':
        stripEv(ev);
        break;
    }
  }

  P3.modes = {
    init: init,
    reset: reset,
    dispatch: dispatch,
    isHeld: isHeld,
    heldIds: heldIds,
    applyPreset: applyPreset,
    openOverlay: openOverlay,
    selectTrack: selectTrack
  };
})();
