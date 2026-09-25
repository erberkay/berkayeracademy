/* Push 3 Laboratuvarı — uygulama (p3-app.js)
 *
 * Tek giriş noktası P3.app.boot() (README §C, §I1): modülleri sırayla kurar, cihaz SVG'si yüklenince LED ve
 * girdi katmanlarını bağlar, bus 'in' → gate → P3.modes.dispatch yolunu açar ve router'ı başlatır. Router
 * `#ogretici[/bolum[/adim]]`, `#seviye-1`, `#seviye-2`, `#serbest` rotalarını açar; hash yoksa mod menüsü.
 * Burada ayrıca: mod yaşam döngüsü (startMode/stopMode), gate (öğretici kilidi, Seviye 1 yönlendirmesi),
 * taskbar, menü kartları ve ilerleme sıfırlama, ses kilidi (A10) ve bus'ın 'toast' / 'feedback' / 'learn' /
 * 'keys' olayları. Sözleşme: README §G14, §H16, §I1–§I4, §I11, §A10, §A17; sartname-ogretici §1–§3;
 * sartname-mobil-erisilebilirlik (görünüm seçimi).
 *
 * SAPMA / EKLEME:
 * - Her mod temiz bir durumdan başlar: öğretici ve seviyeler için initState (app ve prefs korunur), Serbest
 *   Çal için P3.save 'free.snapshot' (track presetleri/parametreleri/matrisi, clip'ler, scale, tempo, ses
 *   seviyeleri; ≤50 KB) ya da yoksa varsayılan (init preset, C Major, track 0). Kayıt Serbest Çal'dan
 *   çıkarken (önce transport durur: süren kayıt kapanır), sekme gizlenince ve durum değiştikten 1,5 sn sonra
 *   yazılır. 50 KB aşılırsa en büyük clip'ten başlayarak sığana dek clip'ler dışarıda kalır ve oturumda bir kez
 *   toast çıkar; yine sığmazsa önceki kayıt ezilmez. Parametre şeması değiştiyse (PARAMS imzası) kayıtlı
 *   değerler yerine kayıtlı preset uygulanır; bozuk kayıt yok sayılır. Öğretici, seviyeler ve kaydı olmayan
 *   Serbest Çal da ses seviyelerini (S.vol) önceki durumdan alır (hedef Main).
 * - {keep:true}: durum ve transport korunur ("Serbest Çal'da aç", sartname-ogretici §4). P3.app.go('free',
 *   {keep:true}) ya da öğreticinin P3.tut.handoff = {keep:true} işareti ile istenir; öğreticideyken app
 *   dışından gelen `#serbest` hash'i de böyle yorumlanır (VARSAYIM). Önceki Serbest Çal kaydında clip varsa
 *   yerine bu oturumun geçeceği toast ile söylenir.
 * - Gezinme: menü kartı pushState ile yeni giriş açar; taskbar anahtarı, Learn ve P3.app.go replaceState
 *   kullanır. "← Modlar" bu belgenin açtığı girişteyse history.back(), değilse hash'i temizler; böylece
 *   tarayıcının Geri'si oyundan menüye, menüden önceki sayfaya gider. P3.app.setHash(h) URL'yi rota
 *   çalıştırmadan eşitler (öğretici adım adresi için); app dışından gelen ve etkin öğretici adımıyla aynı
 *   olan hash yok sayılır.
 * - Gate (§I2): bırakış olayları her zaman geçer; kilitli bir encoder'a fare hover'ı (touch) sessizce
 *   yutulur, uyarı yalnız gerçek eylemde (basış, dönüş, strip/pad dokunuşu) çıkar. Engellenen eylem bus
 *   'gate' {ev, id} olarak yayınlanır; Faz 1'de dinleyicisi yok (uzantı noktası; öğretici yanlış kontrolü
 *   kendi 'in' kaydından sayar). Süren bir jestin (encoder dokunuşu, strip) sonraki olayları kilit adım içinde
 *   değişse de geçer. Ctrl/⌘+Shift+Z'nin geçici Shift'i (combo:true) Undo izinliyse geçer (Redo). allow() ek
 *   olarak 'drumPads', 'loopPads', 'steps' bölge adlarını ve '*' (her şey) desenini kabul eder; LCD hiç
 *   karartılmaz.
 * - allow(list, focus): focus uyarıdaki adı verir ({tr,en}, metin ya da hedef deseni/listesi); verilmezse
 *   öğreticinin P3.tut.blockedText(ev)'i (adım hedefinden), o da yoksa listeden türetilen ad kullanılır.
 * - Görünüm (VARSAYIM): prefs.view 'auto' iken telefonda (≤600 px genişlik ya da dokunmatik ve ≤600 px
 *   yükseklik) sahne yataysa padsStrip, dikeyse pads; 'pads' tercihi de aynı kuralla çözülür. Seviye 1 her
 *   zaman tam görünüm (sartname-mobil: telefonda tam görünüm yalnız Seviye 1). Seviye 2'de 'auto' da tam
 *   görünümdür: görevler pad dışı kontrollerde (Tap Tempo, Octave, Scale, Swing, Mute, Record); seçilmiş
 *   bir görünüm tercihi yine uygulanır. P3.app.setView(name) geçici görünüm verir (öğretici), setView(null)
 *   tercihe döner. Telefon kuralı (PHONE_MQ) sayfa CSS'indeki telefon kırılımıyla aynıdır (≤600 px).
 * - Tuş katmanı (§H16): #p3KeysBtn ve bus 'keys' (Shift+/) #p3KeysLayer'ı açar: pad ve düğmelerin üstünde
 *   klavye tuşu etiketleri (kullanıcının klavye düzeninden, navigator.keyboard varsa) ve kısa bir lejant.
 *   Seviye 1'de yok (cevabı verirdi). Tuş listesi P3.input.util.SHORTCUTS'tan (tek kaynak) okunur.
 * - Ses (§I11, A10): ipucu ve "Sesi yeniden başlat" çipi durum 500 ms sürünce görünür (kilit açılırken
 *   geçen 'suspended' yanıp sönmesin). Yedek dinleyiciler yalnız oyunda ve sesli modda unlock() çağırır;
 *   'failed' durumunu yalnız çip yeniden dener. #p3Feedback'te başka modülün (seviye/öğretici) yazdığı
 *   metnin üstüne yalnız yeni bir mesaj yazılır; ses ipucu boş alana düşer.
 * - Başkası P3.store.restore ile durumu değiştirirse (ör. öğretici tabanı) S.app (mod, ses, profil) ve
 *   kayıtlı tercihler (settings) geri yazılır.
 * - İpucu düğmesi: seviyelerde prefs.hints anahtarı (undo'suz; seviyeler okur, aria-pressed); öğreticide
 *   bir eylem: P3.tut.hint() ipucunu bir kademe açar (ipuçları kapalıysa önce açılır). Tercihler (hints,
 *   kbOn, view, kbWin, noteNames, quality) P3.save 'settings'e yazılır, sıfırlamada korunur. velMode kalıcı
 *   değil (yalnız öğreticinin geçici ayarı).
 * - Menü: Öğretici meta'sı, ilerlemesi ve devam noktası P3.tut.progress() (yoksa CURRICULUM + P3.save
 *   'tutorial', Faz 1 bölüm/adımları), seviyeler P3.levels.progress() (yoksa P3.save). İlk kez satırı hiç
 *   mod açılmamışken görünür. Başka sekme kaydı değiştirirse (storage olayı) menü yenilenir. Sıfırlama
 *   P3.tut.resetProgress()'i çağırır (seviyeler ilerlemeyi yalnız P3.save'den okur) ve bus 'progressReset'
 *   yayar (Faz 1'de dinleyicisi yok; uzantı noktası).
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  // ---------------------------------------------------------------- sabitler
  var PHASE = 1;   // Faz 1: phase > 1 olan bölüm ve adımlar "yakında"
  var HASH = { tutorial: 'ogretici', level1: 'seviye-1', level2: 'seviye-2', free: 'serbest' };
  var MODE_OF = { ogretici: 'tutorial', 'seviye-1': 'level1', 'seviye-2': 'level2', serbest: 'free' };

  // Taskbar araçları (sartname-ogretici §2). sound: ses ipucu ve "Sesi yeniden başlat" çipi.
  var TOOLS = {
    tutorial: { hint: true, view: true, keys: true, sound: true },
    level1: { hint: true },   // cihaz pasif ve sessiz, görünüm hep tam
    level2: { hint: true, view: true, keys: true, sound: true },
    free: { preset: true, kb: true, view: true, keys: true, sound: true }
  };

  // Kilitte de açık olanlar (sartname-ogretici §4). LCD bir kontrol değil; karartılırsa okunmaz.
  var ALWAYS = { play: true, volume: true, lcd: true };

  // VARSAYIM: Drum Loop Selector bölgeleri (sartname-scale-note §6, P3.scale.drumCell): sol alt 4×4 drum
  // pad'leri, sağ alt 4×4 loop pad'leri, üst 4 satır step'ler. y alttan.
  var REGIONS = {
    drumPads: function (x, y) { return x < 4 && y < 4; },
    loopPads: function (x, y) { return x >= 4 && y < 4; },
    steps: function (x, y) { return y >= 4; }
  };

  // Faz 2 bölümleri (README §A15): müfredatta yoksa da "yakında" denir.
  var FAZ2 = {
    'repeat-accent': tx(`Repeat ve Accent`, `Repeat and Accent`), kayit: tx(`Kayıt`, `Recording`),
    session: tx(`Session`, `Session`), final: tx(`Final`, `Final`)
  };

  // Kalıcı tercihler (P3.save 'settings') ve geçerlilik denetimleri. velMode burada değil: onu yalnız öğretici
  // geçici olarak yazar (kullanıcı arayüzü yok); kalıcı olsaydı adım sürerken kapanan sekme 'position'ı
  // kalıcı yapardı. Eski kayıtlardaki settings.velMode da bu yüzden yüklenmez.
  var PREFS = {
    hints: isBool, kbOn: isBool, noteNames: isBool,
    view: function (v) { return v === 'auto' || v === 'full' || v === 'pads' || v === 'padsStrip' || v === 'controls'; },
    kbWin: function (v) { return v === (v | 0) && v >= 0 && v <= 4; },
    quality: function (v) { return v === 'auto' || v === 'hq' || v === 'std' || v === 'eco'; }
  };

  var LOCK_MS = 2000;          // kilit uyarısı (sartname-ogretici §4: 2 sn)
  var SOUND_GRACE_MS = 500;    // ses durumu bu kadar sürmeden ipucu/çip gösterilmez
  var TOAST_MS = 4000, TOAST_MAX = 3;
  var AUTOSAVE_MS = 1500, RESIZE_MS = 150;
  var SNAP_MAX = 50000;        // sartname-ogretici §3: serbest mod kaydı ≤ 50 KB
  // ders-push3.html'deki telefon kuralıyla aynı (ui.css kırılımı: ≤600 px telefon, ≥601 px geniş).
  var PHONE_MQ = '(max-width: 600px), (max-height: 600px) and (pointer: coarse)';
  var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var GESTURES = ['pointerup', 'touchend', 'mousedown', 'keydown', 'click'];   // A10 yedek kilit

  // Tuş katmanının kaynağı p3-input'un tabloları (P3.input.util.SHORTCUTS / KB_ROWS). KB_ROWS yalnız p3-input
  // yoksa kullanılan yedektir.
  var KB_ROWS = [
    ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'],
    ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI'],
    ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'],
    ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma']
  ];
  var CODE_CHAR = {
    Comma: ',', Period: '.', Slash: '/', Backquote: '`', Backslash: '\\', Minus: '-', Equal: '=',
    BracketLeft: '[', BracketRight: ']'
  };
  var KEY_NAME = {
    Space: tx(`Boşluk`, `Space`), Enter: 'Enter', Backspace: '⌫', ShiftLeft: 'Shift', ShiftRight: 'Shift',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→'
  };

  // Kullanıcı metinleri. Faz 1 TR; EN varsa P3.t dile göre seçer.
  var TX = {
    title: {
      tutorial: tx(`Öğretici`, `Tutorial`), level1: tx(`Seviye 1 · Kontrolü Bul`, `Level 1 · Find the Control`),
      level2: tx(`Seviye 2 · Görevler`, `Level 2 · Tasks`), free: tx(`Serbest Çal`, `Free Play`)
    },
    freeTask: tx(`Serbest Çal: pad'lere dokun ya da bilgisayar klavyesiyle çal.`,
      `Free Play: tap the pads or play with your computer keyboard.`),
    loading: tx(`Yükleniyor…`, `Loading…`),
    devFail: tx(`Push 3 görseli yüklenemedi. Bağlantını kontrol edip sayfayı yenile.`,
      `The Push 3 image could not be loaded. Check your connection and reload the page.`),
    modFail: tx(`Bu mod yüklenemedi. Sayfayı yenilemeyi dene.`, `This mode could not be loaded. Try reloading the page.`),
    audioOff: tx(`Sesi açmak için bir pad'e dokun.`, `Tap a pad to turn the sound on.`),
    audioPaused: tx(`Ses duraklatıldı. Devam etmek için "Sesi yeniden başlat"a dokun.`,
      `Sound is paused. Tap "Restart sound" to continue.`),
    audioFailed: tx(`Ses başlatılamadı. "Sesi yeniden başlat"ı dene; olmazsa sayfayı yenile.`,
      `Sound could not start. Try "Restart sound"; if that fails, reload the page.`),
    audioStill: tx(`Ses hâlâ kapalı. Sayfayı yenilemeyi dene.`, `Sound is still off. Try reloading the page.`),
    hintHide: tx(`İpucunu gizle`, `Hide hints`), hintShow: tx(`İpucunu göster`, `Show hints`),
    hintAsk: tx(`Bir ipucu göster`, `Show a hint`), noHint: tx(`Şu an gösterilecek başka ipucu yok.`, `No more hints right now.`),
    keysShow: tx(`Klavye kısayollarını göster`, `Show keyboard shortcuts`),
    keysHide: tx(`Klavye kısayollarını gizle`, `Hide keyboard shortcuts`),
    resetDone: tx(`İlerleme sıfırlandı.`, `Progress reset.`),
    snapTrim: function (n) {
      return tx(`Kayıt tarayıcıya sığmıyor: en uzun ${n} clip kaydedilmedi. Diğerleri kaydedildi.`,
        `Your session is too big to store: the longest ${n} clip(s) were not saved. The rest were saved.`);
    },
    snapFull: tx(`Kayıt tarayıcıya sığmıyor; önceki kayıt korundu.`, `Your session is too big to store; the previous save was kept.`),
    freeReplace: tx(`Serbest Çal öğreticideki sesle açıldı; önceki Serbest Çal kaydının yerine bu oturum kaydedilecek.`,
      `Free Play opened with the tutorial's sound; this session will replace your previous Free Play save.`),
    locked: function (name) { return tx(`Bu adımda ${name} ile ilgileniyoruz.`, `This step is about ${name}.`); },
    soon: function (title) { return tx(`${title} bölümü yakında geliyor.`, `${title} is coming soon.`); },
    and: tx(`ve`, `and`),
    start: tx(`Başla`, `Start`), open: tx(`Aç`, `Open`), cont: tx(`Devam et`, `Continue`),
    tutCont: function (n, title) { return tx(`Devam et · Bölüm ${n}: ${title}`, `Continue · Chapter ${n}: ${title}`); },
    tutDone: tx(`Tamamlandı ✓ · Tekrar göz at`, `Completed ✓ · Review`),
    tutMeta: function (c, s, min) {
      return tx(`${c} bölüm · ${s} adım` + (min ? ` · ~${min} dk` : ''), `${c} chapters · ${s} steps` + (min ? ` · ~${min} min` : ''));
    },
    lvCont: function (i, n) { return tx(`Devam et · ${i}/${n}`, `Continue · ${i}/${n}`); },
    l1Best: function (t) { return tx(`En iyi süre ${t} · Tekrar oyna`, `Best time ${t} · Play again`); },
    l1Done: tx(`Tamamlandı ✓ · Tekrar oyna`, `Completed ✓ · Play again`),
    l2Done: tx(`Tamamlandı ✓`, `Completed ✓`),
    l1Meta: function (n) { return tx(`${n} kontrol · ~5 dk`, `${n} controls · ~5 min`); },
    l2Meta: function (n) { return tx(`${n} görev · ~5 dk`, `${n} tasks · ~5 min`); },
    keys: {
      title: tx(`Klavye`, `Keyboard`),
      rows: function (a, b) { return tx(`Pad satırlarını kaydır (şimdi ${a}–${b})`, `Shift the pad rows (now ${a}–${b})`); },
      vel: function (v) { return tx(`Velocity (şimdi ${v})`, `Velocity (now ${v})`); },
      soft: function (v) { return tx(`+ pad tuşu: yumuşak vuruş (${v})`, `+ pad key: soft hit (${v})`); },
      undo: tx(`Undo · Shift ile Redo`, `Undo · with Shift: Redo`),
      esc: tx(`Tüm sesleri kes`, `Stop all sounds`),
      toggle: tx(`Bu katmanı aç/kapat`, `Toggle this layer`),
      focus: tx(`Kısayollar cihaz odaktayken çalışır: önce cihaza bir kez dokun.`,
        `Shortcuts work while the device has focus: click it once first.`),
      off: tx(`"Klavyeyle çal" kapalı: pad tuşları ve tek tuş kısayolları çalışmaz.`,
        `"Play with keyboard" is off: pad keys and single-key shortcuts are disabled.`)
    },
    // Kilit uyarısındaki desen adları (kontrol adları cihazdaki gibi İngilizce, A16).
    names: {
      pads: tx(`pad'ler`, `the pads`), drumPads: tx(`davul pad'leri`, `the drum pads`), steps: tx(`step pad'leri`, `the step pads`),
      loopPads: tx(`loop pad'leri`, `the loop pads`), pad: tx(`işaretli pad`, `the marked pad`),
      'upper*': tx(`üst ekran düğmeleri`, `the upper display buttons`), 'lower*': tx(`alt ekran düğmeleri`, `the lower display buttons`),
      'enc*': tx(`encoder'lar`, `the encoders`), 'scene*': tx(`scene düğmeleri`, `the scene buttons`),
      dpad: tx(`D-pad`, `the D-pad`), 'dpad*': tx(`D-pad`, `the D-pad`), octpage: tx(`Octave ve Page düğmeleri`, `the Octave and Page buttons`),
      'octave*': tx(`Octave düğmeleri`, `the Octave buttons`), 'page*': tx(`Page düğmeleri`, `the Page buttons`),
      upper: function (n) { return tx(`${n}. üst ekran düğmesi`, `upper display button ${n}`); },
      lower: function (n) { return tx(`${n}. alt ekran düğmesi`, `lower display button ${n}`); },
      other: tx(`başka bir kontrol`, `another control`)
    }
  };

  // ---------------------------------------------------------------- modül durumu
  var booted = false, ready = false, devPromise = null, devFailed = false, inBound = false;
  var cur = null;            // etkin mod: 'tutorial' | 'level1' | 'level2' | 'free'; null = menü
  var token = '';            // bu belgenin pushState işareti
  var navVia = null;         // app'in başlattığı gezinme ({arg}); route() tüketir
  var lock = null;           // öğretici kilidi: {ids, pads[64], allPads, name}
  var through = {};          // geçen jestler: 'enc:<id>' (dokunuş sürüyor), 'strip'
  var fbMsg = null, fbWritten = '', fbTimer = null;
  var soundSince = 0, soundTimer = null, lastAudio = null;
  var keysOn = false, keysDom = null, layoutMap = null, layoutAsked = false;
  var appliedView = null, resizeTimer = null, autosaveTimer = null;
  var snapWarned = false;    // 50 KB aşım toast'ı Serbest Çal oturumunda bir kez
  var resetReturn = null;

  // ---------------------------------------------------------------- yardımcılar
  function tx(tr, en) { return { tr: tr, en: en }; }
  function isBool(v) { return typeof v === 'boolean'; }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function $(id) { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
  function fn(o, k) { return !!o && typeof o[k] === 'function'; }
  function noop() {}
  function now() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function show(id, on) { var e = $(id); if (e) e.hidden = !on; }
  function text(id, s) { var e = $(id); if (e && e.textContent !== s) e.textContent = s; }
  function each(list, f) { Array.prototype.forEach.call(list || [], f); }
  function closest(el, sel) { return el && typeof el.closest === 'function' ? el.closest(sel) : null; }
  function clone(v) { return P3.u.deepClone(v); }
  function St() { return P3.store ? P3.store.S : null; }
  function hintsOn() { var S = St(); return !(S && S.prefs && S.prefs.hints === false); }
  function kbOn() { var S = St(); return !(S && S.prefs && S.prefs.kbOn === false); }
  function audioState() {
    var S = St();
    return (S && S.app && S.app.audio) || (P3.audio && P3.audio.state) || 'off';
  }
  function isMac() {
    var n = typeof navigator !== 'undefined' ? navigator : null;
    return !!n && /Mac|iPhone|iPad/.test(n.platform || n.userAgent || '');
  }

  // Modül çağrısı: bir modülün hatası uygulamayı durdurmaz.
  function call(o, k) {
    if (!fn(o, k)) return undefined;
    try { return o[k].apply(o, Array.prototype.slice.call(arguments, 2)); } catch (e) { console.warn(`[p3] ${k} hatası:`, e); }
    return undefined;
  }

  // ---------------------------------------------------------------- toast ve geri bildirim
  function toast(msg, opts) {
    var wrap = $('p3Toast');
    msg = msg == null ? '' : String(msg);
    if (!wrap || !msg) return;
    opts = opts || {};
    for (var i = 0; i < wrap.children.length; i++) {
      var old = wrap.children[i];
      if (old.textContent === msg) { clearTimeout(old._p3t); old._p3t = setTimeout(dropToast.bind(null, old), opts.ms || TOAST_MS); return; }
    }
    var el = document.createElement('div');
    el.className = 'toast' + (opts.tone ? ' ' + opts.tone : '');
    el.textContent = msg;
    wrap.appendChild(el);
    while (wrap.children.length > TOAST_MAX) dropToast(wrap.children[0]);
    el._p3t = setTimeout(dropToast.bind(null, el), opts.ms || TOAST_MS);
  }
  function dropToast(el) {
    clearTimeout(el._p3t);
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  // #p3Feedback: geçici mesaj (süreli) > ses ipucu. Seviye ve öğretici bu alana doğrudan da yazar; onların
  // metninin üstüne yalnız yeni bir mesaj yazılır, süre dolunca ya da ses durumu değişince dokunulmaz.
  function feedback(msg, opts) {
    opts = opts || {};
    msg = msg == null ? '' : String(msg);
    clearTimeout(fbTimer);
    fbTimer = null;
    if (msg) {
      var ms = opts.ms > 0 ? opts.ms : clamp(1800 + msg.length * 45, 2500, 9000);
      fbMsg = { text: msg, tone: opts.tone === 'ok' || opts.tone === 'err' ? opts.tone : '', until: now() + ms };
      fbTimer = setTimeout(function () { fbTimer = null; fbMsg = null; writeFeedback(false); }, ms);
    } else fbMsg = null;
    writeFeedback(true);
  }

  function writeFeedback(force) {
    var el = $('p3Feedback');
    if (!el) return;
    if (!force && el.textContent && el.textContent !== fbWritten) return;
    var f = fbMsg && fbMsg.until > now() ? fbMsg : null;
    var msg = f ? f.text : soundHint(), tone = f ? f.tone : '';
    el.className = 'p3-game-feedback' + (tone ? ' ' + tone : '');
    if (el.textContent !== msg) el.textContent = msg;
    fbWritten = msg;
  }

  function resetFeedback() {
    var el = $('p3Feedback');
    clearTimeout(fbTimer);
    fbTimer = null;
    fbMsg = null;
    fbWritten = '';
    if (!el) return;
    el.hidden = false;
    el.className = 'p3-game-feedback';
    el.textContent = '';
  }

  // ---------------------------------------------------------------- ses (A10, §I11)
  function unlockAudio() {
    var a = P3.audio;
    if (!fn(a, 'unlock')) return null;
    try {
      var p = a.unlock();
      if (p && typeof p.then === 'function') p.then(updateSound, noop);
      return p;
    } catch (e) {
      console.warn(`[p3] ses kilidi açılamadı`, e);
      return null;
    }
  }

  // Yedek kilit: oyunda, sesli bir modda ilk etkileşim (pointerdown iOS'ta kilidi açmaz). 'failed'
  // durumunu yalnız çip yeniden dener; her tıkta yeni AudioContext denenmesin.
  function onGesture() {
    if (!cur || !TOOLS[cur].sound) return;
    var s = audioState();
    if (s === 'running' || s === 'fallback' || s === 'failed') return;
    unlockAudio();
  }

  function soundProblem() {
    var s = audioState();
    return s !== 'running' && s !== 'fallback';
  }

  function soundSettled() { return now() - soundSince >= SOUND_GRACE_MS; }

  function soundHint() {
    if (!cur || !TOOLS[cur].sound || !soundProblem() || !soundSettled()) return '';
    var s = audioState();
    return P3.t(s === 'failed' ? TX.audioFailed : s === 'off' ? TX.audioOff : TX.audioPaused);
  }

  function updateSound() {
    var s = audioState();
    var chip = !!cur && !!TOOLS[cur].sound && soundSettled() && (s === 'suspended' || s === 'interrupted' || s === 'failed');
    show('p3AudioBtn', chip);
    writeFeedback(false);
  }

  // Ses durumu değişince (ya da mod başında) ipucu ve çip SOUND_GRACE_MS sonra değerlendirilir.
  function soundChanged() {
    lastAudio = audioState();
    soundSince = now();
    clearTimeout(soundTimer);
    soundTimer = setTimeout(function () { soundTimer = null; updateSound(); }, SOUND_GRACE_MS + 20);
    updateSound();
  }

  function retryAudio() {
    var p = unlockAudio();
    if (!p || typeof p.then !== 'function') { toast(P3.t(TX.audioStill), { tone: 'err' }); return; }
    p.then(function (ok) {
      updateSound();
      if (!ok && soundProblem()) toast(P3.t(TX.audioStill), { tone: 'err' });
    }, function () { toast(P3.t(TX.audioStill), { tone: 'err' }); });
  }

  // ---------------------------------------------------------------- tercihler (P3.save 'settings')
  function loadSettings(emit) {
    var S = St(), st = P3.save.get('settings');
    if (!S || !S.prefs || !st || typeof st !== 'object') return;
    Object.keys(PREFS).forEach(function (k) {
      if (!(k in st) || !PREFS[k](st[k]) || S.prefs[k] === st[k]) return;
      P3.store.set('prefs.' + k, st[k], emit ? undefined : { silent: true });
    });
  }

  function currentSettings() {
    var S = St(), out = {};
    if (S && S.prefs) Object.keys(PREFS).forEach(function (k) { if (PREFS[k](S.prefs[k])) out[k] = S.prefs[k]; });
    return out;
  }

  // ---------------------------------------------------------------- durum: taban ve serbest mod kaydı
  // Taban: initState; app (mod, ses, profil), prefs ve ses seviyeleri korunur (öğreticinin emu.load'u gibi:
  // dinleme seviyesi mod ya da bölüm değişince habersiz −6 dB'ye dönmesin; hedef Main'e çekilir).
  // hydrate init presetini doldurur.
  function baseState() {
    var S = P3.initState(), old = St();
    if (old) {
      if (old.app) S.app = clone(old.app);
      if (old.prefs) S.prefs = clone(old.prefs);
      if (old.vol && typeof old.vol === 'object') {
        S.vol = clone(old.vol);
        S.vol.target = 'main';
      }
    }
    return S;
  }

  // PARAMS şemasının imzası: sıra ya da anahtarlar değişirse kayıtlı ham değerler kullanılmaz.
  function paramSig() {
    var P = P3.wtp && P3.wtp.PARAMS;
    if (!P) return '';
    var s = P.map(function (p) { return p.k; }).join(','), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + '.' + P.length;
  }

  function roundF(v) { v = +v; return isFinite(v) ? +v.toPrecision(7) : 0; }

  function buildSnapshot() {
    var S = St();
    if (!S || !S.tracks) return null;
    var w = S.wtui || {};
    var snap = {
      v: 1, sig: paramSig(), at: Date.now(),
      tracks: S.tracks.map(function (t) {
        var o = clone(t);
        if (o.p && ArrayBuffer.isView(o.p)) o.p = Array.prototype.map.call(o.p, roundF);
        delete o.playing;
        return o;
      }),
      scale: clone(S.scale), sel: { track: S.sel ? S.sel.track : 0 },
      transport: { bpm: S.transport.bpm, swing: S.transport.swing, metro: !!S.transport.metro },
      vol: clone(S.vol), swingTempo: S.swingTempo, accent: { on: !!(S.accent && S.accent.on) },
      strip: { mode: S.strip ? S.strip.mode : 'pb' },
      wtui: { bank: w.bank, osc: w.osc, flt: w.flt, env: w.env, lfo: w.lfo, ampView: w.ampView, modView: w.modView,
        expr: w.expr, target: w.target, prevBank: w.prevBank }
    };
    fitSnapshot(snap);
    return snap;
  }

  // 50 KB sınırı (sartname-ogretici §3): en büyük clip'ten başlayarak sığana dek clip'ler dışarıda kalır; kısa
  // clip'ler korunur. snap.trimmed = atılan clip sayısı; clip'ler atılsa da sığmıyorsa snap.over = true.
  function fitSnapshot(snap) {
    var size = JSON.stringify(snap).length;
    if (size <= SNAP_MAX) return;
    var list = [];
    snap.tracks.forEach(function (t, ti) {
      (t.clips || []).forEach(function (c, ci) { if (c) list.push({ ti: ti, ci: ci, n: JSON.stringify(c).length }); });
    });
    list.sort(function (a, b) { return b.n - a.n; });
    var trimmed = 0;
    for (var i = 0; i < list.length && size > SNAP_MAX; i++) {
      snap.tracks[list[i].ti].clips[list[i].ci] = null;
      trimmed++;
      size = JSON.stringify(snap).length;
    }
    snap.trimmed = trimmed;
    if (size > SNAP_MAX) snap.over = true;
    console.warn(`[p3] serbest mod kaydı 50 KB sınırını aştı; ${trimmed} clip kaydedilmedi`);
  }

  function saveFree() {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    if (cur !== 'free') return;
    var snap = buildSnapshot();
    if (!snap) return;
    if (snap.over) {   // clip'siz bile sığmıyor: önceki geçerli kayıt ezilmez
      if (!snapWarned) { snapWarned = true; toast(P3.t(TX.snapFull), { tone: 'err' }); }
      return;
    }
    if (snap.trimmed && !snapWarned) { snapWarned = true; toast(P3.t(TX.snapTrim(snap.trimmed)), { tone: 'err' }); }
    delete snap.trimmed;
    P3.save.patch('free.snapshot', snap);
  }

  function pickEnum(v, list, def) { return list.indexOf(v) >= 0 ? v : def; }
  function pickNum(v, lo, hi, def, int) {
    if (!isNum(v)) return def;
    v = clamp(v, lo, hi);
    return int ? Math.round(v) : v;
  }

  // Aynı türdeki ilkel alanlar kopyalanır (bozuk ya da eski kayıt taban değerlerini bozmaz).
  function mergePrims(dst, src) {
    if (!src || typeof src !== 'object') return dst;
    Object.keys(dst).forEach(function (k) {
      var b = dst[k], v = src[k];
      if (typeof b === 'number') { if (isNum(v)) dst[k] = v; }
      else if (typeof b === 'boolean' || typeof b === 'string') { if (typeof v === typeof b) dst[k] = v; }
    });
    return dst;
  }

  function cleanClip(c) {
    if (!c || typeof c !== 'object' || !(c.len > 0 && c.len <= 4096)) return null;
    var out = clone(c);
    out.len = +c.len;
    out.loop = Array.isArray(c.loop) && c.loop.length === 2 && isNum(c.loop[0]) && isNum(c.loop[1]) ? [+c.loop[0], +c.loop[1]] : [0, out.len];
    out.notes = (Array.isArray(c.notes) ? c.notes : []).filter(function (n) {
      return n && isNum(n.t) && isNum(n.p) && isNum(n.d) && n.d > 0;
    }).map(function (n) {
      return { t: +n.t, p: clamp(Math.round(n.p), 0, 127), d: +n.d, v: clamp(Math.round(isNum(n.v) ? n.v : 100), 1, 127), m: !!n.m };
    });
    return out;
  }

  function cleanMods(m) {
    var out = {};
    if (!m || typeof m !== 'object') return out;
    Object.keys(m).forEach(function (k) {
      var row = m[k];
      if (!row || typeof row !== 'object') return;
      var r = {};
      Object.keys(row).forEach(function (s) {
        if (/^\d+$/.test(s) && +s < 13 && isNum(row[s])) r[s] = clamp(row[s], -1, 1);
      });
      out[k] = r;
    });
    return out;
  }

  function boolMap(o) {
    var out = {};
    if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (o[k] === true) out[k] = true; });
    return out;
  }

  // Kayıtlı track'i taban track'in şemasına göre temizler. Kimlik alanları (id, ad, tür, renk) hep tabandan.
  function cleanTrack(base, src, sigOk) {
    var t = base;
    if (!src || typeof src !== 'object' || src.kind !== base.kind) return t;
    Object.keys(base).forEach(function (k) {
      if (/^(id|name|kind|color|playing|p|mods|clips)$/.test(k)) return;
      var b = base[k], v = src[k];
      if (typeof b === 'number') { if (isNum(v)) t[k] = v; }
      else if (typeof b === 'boolean' || typeof b === 'string') { if (typeof v === typeof b) t[k] = v; }
      else if (b && typeof b === 'object' && !Array.isArray(b)) mergePrims(b, v);
    });
    if (typeof src.follow === 'boolean') t.follow = src.follow;
    if (src.padMute) t.padMute = boolMap(src.padMute);
    if (src.padSolo) t.padSolo = boolMap(src.padSolo);
    if (Array.isArray(src.clips)) t.clips = t.clips.map(function (c, i) { return cleanClip(src.clips[i]); });
    if (base.kind === 'synth' && P3.wtp) {
      var P = P3.wtp.PARAMS, p = src.p, n = p && typeof p === 'object' ? (Array.isArray(p) ? p.length : Object.keys(p).length) : 0;
      if (sigOk && n === P.length) {
        var f = new Float32Array(n), okAll = true;
        for (var i = 0; i < n; i++) {
          if (!isNum(p[i])) { okAll = false; break; }
          f[i] = clamp(p[i], P[i].min, P[i].max);
        }
        if (okAll) { t.p = f; t.mods = cleanMods(src.mods); return t; }
      }
      // Şema değişmiş ya da değerler bozuk: kayıtlı preset uygulanır.
      var fresh = { p: null, mods: {} };
      P3.wtp.applyPreset(fresh, P3.wtp.PRESETS[t.preset] ? t.preset : 'init');
      t.p = fresh.p;
      t.mods = fresh.mods;
      t.preset = fresh.preset;
    }
    return t;
  }

  function applySnapshot(S, snap) {
    if (!snap || typeof snap !== 'object' || snap.v !== 1) return false;
    var sigOk = snap.sig === paramSig();
    if (Array.isArray(snap.tracks) && snap.tracks.length === S.tracks.length) {
      S.tracks = S.tracks.map(function (base, i) { return cleanTrack(base, snap.tracks[i], sigOk); });
    }
    var sc = snap.scale || {}, SC = P3.scale;
    S.scale.root = pickNum(sc.root, 0, 11, S.scale.root, true);
    S.scale.idx = pickNum(sc.idx, 0, SC ? SC.SCALES.length - 1 : 34, S.scale.idx, true);
    S.scale.layoutIdx = pickNum(sc.layoutIdx, 0, SC ? SC.LAYOUTS.length - 1 : 2, S.scale.layoutIdx, true);
    if (isBool(sc.inKey)) S.scale.inKey = sc.inKey;
    if (isBool(sc.fixed)) S.scale.fixed = sc.fixed;
    S.sel.track = pickNum(snap.sel && snap.sel.track, 0, S.tracks.length - 1, 0, true);
    var tr = snap.transport || {};
    S.transport.bpm = pickNum(tr.bpm, 20, 999, S.transport.bpm);
    S.transport.swing = pickNum(tr.swing, 0, 100, S.transport.swing, true);
    if (isBool(tr.metro)) S.transport.metro = tr.metro;
    var vol = snap.vol || {};
    S.vol.target = pickEnum(vol.target, ['main', 'phones', 'track', 'cue'], 'main');
    ['main', 'phones', 'cue', 'track'].forEach(function (k) { if (isNum(vol[k])) S.vol[k] = clamp(vol[k], -71, 6); });
    S.swingTempo = pickEnum(snap.swingTempo, ['tempo', 'swing'], 'tempo');
    if (snap.accent && isBool(snap.accent.on)) S.accent.on = snap.accent.on;
    if (snap.strip) S.strip.mode = pickEnum(snap.strip.mode, ['pb', 'mod'], 'pb');
    var w = snap.wtui || {}, W = S.wtui, nb = P3.wtp ? P3.wtp.BANKS.length - 1 : 7;
    W.bank = pickNum(w.bank, 0, nb, W.bank, true);
    W.prevBank = pickNum(w.prevBank, 0, nb, W.prevBank, true);
    W.osc = pickEnum(w.osc, ['1', '2', 'S', 'Mix'], W.osc);
    W.flt = pickEnum(w.flt, [1, 2], W.flt);
    W.env = pickEnum(w.env, ['amp', 'e2', 'e3'], W.env);
    W.lfo = pickEnum(w.lfo, [1, 2], W.lfo);
    W.ampView = pickEnum(w.ampView, ['time', 'slope'], W.ampView);
    W.modView = pickEnum(w.modView, ['time', 'slope', 'value'], W.modView);
    W.expr = pickEnum(w.expr, ['mpe', 'monopoly'], W.expr);
    if (w.target === null || (typeof w.target === 'string' && /^[A-Za-z0-9]+$/.test(w.target))) W.target = w.target;
    return true;
  }

  // Modun başlangıç durumu. Geri yükleme P3.store.restore ile: geçmiş silinir, modüller '*' ile senkronlanır.
  function prepareState(m) {
    var S = baseState();
    if (m === 'free') {
      var snap = P3.save.get('free.snapshot');
      if (snap) {
        try { applySnapshot(S, snap); } catch (e) {
          console.warn(`[p3] serbest mod kaydı okunamadı; varsayılan durum kullanılıyor`, e);
          P3.save.patch('free.snapshot', undefined);
          S = baseState();
        }
      }
    }
    P3.store.restore(S);
  }

  // Başka bir modül (ör. öğretici tabanı) durumu geri yüklerse uygulama alanları ve tercihler düzeltilir.
  function onRestore() {
    var S = St(), a = P3.audio;
    if (!S) return;
    if (!S.app || typeof S.app !== 'object') S.app = { mode: 'menu', audio: 'off', profile: 'std' };
    var want = { mode: cur || 'menu', audio: a && a.state ? a.state : S.app.audio, profile: a && a.profile ? a.profile : S.app.profile };
    Object.keys(want).forEach(function (k) { if (want[k] && S.app[k] !== want[k]) P3.store.set('app.' + k, want[k]); });
    loadSettings(true);
  }

  // ---------------------------------------------------------------- gezinme ve router
  function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return ''; } }

  function parseHash(h) {
    h = String(h || '').replace(/^#/, '');
    if (!h) return null;
    var parts = h.split('/').map(safeDecode), mode = MODE_OF[parts[0]];
    if (!mode) return null;
    var arg = {};
    if (mode === 'tutorial' && SLUG.test(parts[1] || '')) {
      arg.chapter = parts[1];
      if (SLUG.test(parts[2] || '')) arg.step = parts[2];
    }
    return { mode: mode, arg: arg };
  }

  function hashFor(m, arg) {
    var h = '#' + HASH[m];
    if (m === 'tutorial' && arg && arg.chapter && SLUG.test(arg.chapter)) {
      h += '/' + arg.chapter;
      if (arg.step && SLUG.test(arg.step)) h += '/' + arg.step;
    }
    return h;
  }

  function baseUrl() { return location.pathname + location.search; }

  // URL'yi rota çalıştırmadan eşitler (replaceState hashchange yaymaz).
  function syncHash(h) {
    h = h || '';
    if ((location.hash || '') === h) return;
    try { history.replaceState(history.state, '', baseUrl() + h); } catch (e) { /* URL eşitlenemedi; rota yine doğru */ }
  }

  // push: menüden moda geçiş (tarayıcının Geri'si menüye döner). Diğer geçişler girişi değiştirir.
  function nav(h, push, arg) {
    navVia = { arg: arg || null };
    try {
      if (push) history.pushState({ p3: token }, '', baseUrl() + h);
      else history.replaceState(history.state, '', baseUrl() + h);
    } catch (e) {
      if ((location.hash || '') !== h) { location.hash = h; return; }   // hashchange rota açar
    }
    route();
  }

  function go(m, arg) {
    if (!m || m === 'menu') { back(); return true; }
    if (!HASH[m]) return false;
    nav(hashFor(m, arg), false, arg);
    return true;
  }

  // "← Modlar": bu belgenin açtığı girişteysek bir geri, değilse (derin link) hash temizlenir.
  function back() {
    var st = history.state;
    if (st && st.p3 === token && location.hash) { history.back(); return; }
    nav('', false);
  }

  // Aynı moda app dışından gelen hash (ör. öğretici kendi adım adresini yazdı) modu yeniden başlatmaz.
  function sameTarget(r) {
    if (cur !== r.mode) return false;
    if (r.mode !== 'tutorial' || !r.arg.chapter) return true;
    var c = P3.save.get('tutorial.current');
    return !!c && c.ch === r.arg.chapter && (!r.arg.step || c.st === r.arg.step);
  }

  function route() {
    var r = parseHash(location.hash), via = navVia;
    navVia = null;
    if (!r) { toMenu(); return; }
    if (via && via.arg) for (var k in via.arg) r.arg[k] = via.arg[k];
    if (!ready) { loadDevice(); showLoading(r.mode); return; }
    // "Serbest Çal'da aç": öğretici P3.tut.handoff = {keep:true} yazıp #serbest'e geçer (ses ve set korunur).
    var ho = P3.tut && P3.tut.handoff;
    if (ho) P3.tut.handoff = null;
    if (!via) {
      if (sameTarget(r)) return;
      // VARSAYIM: işaret olmasa da öğreticiden dışarıdan gelen #serbest aynı anlamdadır.
      if (cur === 'tutorial' && r.mode === 'free') r.arg.keep = true;
    }
    if (ho && ho.keep && cur === 'tutorial' && r.mode === 'free') r.arg.keep = true;
    startMode(r.mode, r.arg, true);
  }

  // ---------------------------------------------------------------- ekranlar
  function showGame() {
    show('p3Modes', false);
    show('p3Game', true);
  }

  function toMenu() {
    var left = cur;
    if (cur) stopMode();
    if (P3.seq && fn(P3.seq, 'isPlaying') && P3.seq.isPlaying()) call(P3.seq, 'stop');
    setAppMode('menu');
    show('p3Game', false);
    show('p3Modes', true);
    menuRender();
    // Klavye kullanıcısı gizlenen oyunda kalmasın: bıraktığı modun kartına döner.
    var ae = document.activeElement, game = $('p3Game');
    if (left && (!ae || ae === document.body || (game && game.contains(ae)))) {
      var card = document.querySelector('.p3-mode-card[data-mode="' + left + '"]');
      if (card && fn(card, 'focus')) { try { card.focus({ preventScroll: true }); } catch (e) { card.focus(); } }
    }
  }

  // Cihaz yüklenene kadar oyun kabuğu "Yükleniyor…" gösterir.
  function showLoading(m) {
    showGame();
    segSync(m);
    ['p3HintBtn', 'p3PresetSel', 'p3KbToggle', 'p3KeysBtn', 'p3AudioBtn', 'p3ViewSeg', 'p3ExplainPanel', 'p3TutPanel'].forEach(function (id) { show(id, false); });
    text('p3Progress', '');
    text('p3TaskText', P3.t(devFailed ? TX.devFail : TX.loading));
  }

  function showDevError() {
    text('p3TaskText', P3.t(TX.devFail));
    feedback(P3.t(TX.devFail), { tone: 'err', ms: 60000 });
  }

  function setAppMode(m) {
    var S = St();
    if (S && S.app && S.app.mode !== m) P3.store.set('app.mode', m);
  }

  // ---------------------------------------------------------------- mod yaşam döngüsü
  function stopTransport() {
    if (P3.seq && fn(P3.seq, 'isPlaying') && P3.seq.isPlaying()) call(P3.seq, 'stop');
  }

  function stopMode(opts) {
    if (!cur) return;
    var m = cur;
    // Kayıt sürüyorsa önce durdur: finishRec'in kapattığı clip (yuvarlanmış uzunluk) kayda girsin.
    if (m === 'free') { stopTransport(); saveFree(); }
    if (m === 'tutorial') call(P3.tut, 'stop');
    else if (m === 'level1' || m === 'level2') call(P3.levels, 'stop');
    cur = null;
    lock = null;
    through = {};
    call(P3.leds, 'setDisabled', []);
    call(P3.leds, 'setTarget', []);
    setKeys(false);
    ['p3Win', 'p3Toc', 'p3Coach', 'p3ExplainPanel', 'p3TutPanel', 'p3AudioBtn'].forEach(function (id) { show(id, false); });
    resetFeedback();
    // quiet: startMode'un içinden; panic'i hemen ardından P3.modes.reset yapar, 'mode' olayını yeni mod yayar.
    if (opts && opts.quiet) return;
    P3.panic('mode');
    P3.bus.emit('mode', { mode: 'menu', prev: m });
  }

  function startMode(m, arg, fromRoute) {
    if (!HASH[m]) return false;
    arg = arg || {};
    if (!ready) { nav(hashFor(m, arg), false, arg); return false; }
    if (!fromRoute) syncHash(hashFor(m, arg));
    var prev = cur, keep = !!arg.keep && !!prev;
    if (cur) stopMode({ quiet: true });
    // Mod değişimi: overlay kapanır, basılı durumlar ve asılı notalar temizlenir (reset panic('mode') yapar).
    if (fn(P3.modes, 'reset')) call(P3.modes, 'reset'); else P3.panic('mode');
    cur = m;   // prepareState'in restore'u S.app.mode'u buna göre düzeltir (onRestore)
    if (!keep) {
      stopTransport();
      prepareState(m);
    }
    setAppMode(m);
    showGame();
    applyTaskbar(m);
    applyView(true);
    call(P3.dev, 'align');
    call(P3.input, 'focus');
    P3.bus.emit('mode', { mode: m, prev: prev || 'menu' });
    startModule(m, arg);
    P3.save.patch('lastMode', m);
    if (m === 'free') {
      snapWarned = false;
      // "Serbest Çal'da aç": ilk otomatik kayıt önceki oturumun kaydını ezer; clip'li bir kayıt varsa söylenir.
      if (keep && snapHasClips(P3.save.get('free.snapshot'))) toast(P3.t(TX.freeReplace), { ms: 6000 });
    }
    soundChanged();
    return true;
  }

  function snapHasClips(snap) {
    return !!(snap && Array.isArray(snap.tracks) && snap.tracks.some(function (t) {
      return t && Array.isArray(t.clips) && t.clips.some(function (c) { return !!c; });
    }));
  }

  function moduleFailed(e) {
    if (e) console.warn(`[p3] mod başlatılamadı`, e);
    text('p3TaskText', P3.t(TX.modFail));
    feedback(P3.t(TX.modFail), { tone: 'err', ms: 8000 });
  }

  function startModule(m, arg) {
    try {
      if (m === 'tutorial') startTutorial(arg);
      else if (m === 'level1' || m === 'level2') {
        if (!fn(P3.levels, 'start')) moduleFailed();
        else if (P3.levels.start(m === 'level1' ? 1 : 2) === false) moduleFailed();
      }
    } catch (e) { moduleFailed(e); }
  }

  function startTutorial(arg) {
    var ch = arg.chapter, c = ch ? chapterOf(ch) : null;
    if (ch && isSoon(ch, c)) {
      feedback(P3.t(TX.soon(chapterTitle(ch, c))), { ms: 4500 });
      ch = undefined;
      syncHash(hashFor('tutorial'));
    }
    if (!fn(P3.tut, 'start')) { moduleFailed(); return; }
    P3.tut.start(ch, ch ? arg.step : undefined);
  }

  // ---------------------------------------------------------------- müfredat (P3.tut.CURRICULUM)
  function curriculum() {
    var c = P3.tut && P3.tut.CURRICULUM;
    return Array.isArray(c) ? c : (c && Array.isArray(c.chapters) ? c.chapters : []);
  }
  function phaseOf(o, def) { var p = o ? +o.phase : NaN; return p > 0 ? p : def; }
  function slugOf(ch, i) { return String(ch.id || ch.slug || i); }
  function chapterOf(slug) {
    var list = curriculum();
    for (var i = 0; i < list.length; i++) if (slugOf(list[i], i) === slug) return list[i];
    return null;
  }
  function isSoon(slug, c) { return c ? phaseOf(c, 1) > PHASE : !!FAZ2[slug]; }
  function chapterTitle(slug, c) { return (c && P3.t(c.title)) || (FAZ2[slug] && P3.t(FAZ2[slug])) || slug; }

  // bus 'learn' {chapter}: slug ya da müfredat sırası (LCD yardımcısı yoksa). Faz 2 bölümü açılmaz.
  function onLearn(p) {
    if (!cur) return;
    var ch = p && p.chapter;
    if (typeof ch === 'number') { var c0 = curriculum()[ch]; ch = c0 ? slugOf(c0, ch) : null; }
    if (typeof ch !== 'string' || !SLUG.test(ch)) return;
    var c = chapterOf(ch);
    if (isSoon(ch, c)) { feedback(P3.t(TX.soon(chapterTitle(ch, c))), { ms: 4500 }); return; }
    go('tutorial', { chapter: ch });
  }

  // ---------------------------------------------------------------- gate (§I2) ve kilit
  function padIndex(x, y) { return x >= 0 && x < 8 && y >= 0 && y < 8 ? (7 - y) * 8 + x : -1; }

  function devExpand(p) { return P3.dev && fn(P3.dev, 'expand') ? P3.dev.expand([p]) : []; }

  function compile(list) {
    var L = { ids: {}, pads: [], allPads: false };
    [].concat(list || []).forEach(function (p) {
      if (p && typeof p === 'object' && Array.isArray(p.pad)) {
        var i = padIndex(p.pad[0], p.pad[1]);
        if (i >= 0) L.pads[i] = true;
        return;
      }
      if (typeof p !== 'string') return;
      if (REGIONS[p]) {
        for (var k = 0; k < 64; k++) if (REGIONS[p](k % 8, 7 - (k >> 3))) L.pads[k] = true;
        return;
      }
      if (p === '*') L.allPads = true;
      devExpand(p).forEach(function (id) {
        L.ids[id] = true;
        if (id === 'pads') L.allPads = true;
      });
    });
    return L;
  }

  // setDisabled listesi: kilitte açık olmayan her kontrol; pad'ler tek tek ya da bütün ızgara.
  function disabledFor(L) {
    var out = [];
    devExpand('*').forEach(function (id) {
      if (id !== 'pads' && !L.ids[id] && !ALWAYS[id]) out.push(id);
    });
    if (!L.allPads) {
      var any = false, k;
      for (k = 0; k < 64; k++) if (L.pads[k]) { any = true; break; }
      if (!any) out.push('pads');
      else for (k = 0; k < 64; k++) if (!L.pads[k]) out.push({ pad: [k % 8, 7 - (k >> 3)] });
    }
    return out;
  }

  function patternName(p) {
    var N = TX.names;
    if (p && typeof p === 'object' && p.pad) return P3.t(N.pad);
    if (typeof p !== 'string' || ALWAYS[p]) return '';
    if (N[p] && typeof N[p] === 'object') return P3.t(N[p]);
    var m = /^(upper|lower|enc)([1-8])$/.exec(p);
    if (m) return m[1] === 'enc' ? `Encoder ${m[2]}` : P3.t(N[m[1]](m[2]));
    var c = P3.dev && P3.dev.CONTROLS && P3.dev.CONTROLS[p];
    return c ? c.label : '';
  }

  function isPattern(s) {
    return !!(TX.names[s] || REGIONS[s] || (P3.dev && P3.dev.CONTROLS && P3.dev.CONTROLS[s]) ||
      (P3.dev && P3.dev.GROUPS && P3.dev.GROUPS[s]) || /\*$/.test(s));
  }

  // Uyarıdaki ad: focus ({tr,en} | metin | desen/liste) ya da allow listesinden en çok 3 ad.
  function focusName(focus, list) {
    if (focus && typeof focus === 'object' && !Array.isArray(focus) && !focus.pad) return P3.t(focus);
    if (typeof focus === 'string' && focus && !isPattern(focus)) return focus;
    var names = [];
    [].concat(focus != null ? focus : list || []).forEach(function (p) {
      var n = patternName(p);
      if (n && names.indexOf(n) < 0) names.push(n);
    });
    if (!names.length || names.length > 3) return P3.t(TX.names.other);
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' ' + P3.t(TX.and) + ' ' + names[names.length - 1];
  }

  // Süren jestler (through) korunur: adım değişirken sürüklenen encoder yarıda kesilip uyarı vermesin.
  function allow(list, focus) {
    if (list == null) {
      lock = null;
      call(P3.leds, 'setDisabled', []);
      return;
    }
    lock = compile(list);
    lock.name = focusName(focus, list);
    lock.named = focus != null;
    call(P3.leds, 'setDisabled', disabledFor(lock));
  }

  function leafOf(ev) {
    var g = P3.dev && P3.dev.GROUPS && P3.dev.GROUPS[ev.k];
    return g ? (ev.dir === 'center' ? g.center : g[ev.dir]) || null : null;
  }

  // Engellenen olay: yalnız gerçek eylem uyarır (fare hover'ı encoder'a touch verir; o sessiz yutulur).
  // Ad: allow'a verilen focus; yoksa öğreticinin adım hedefinden kurduğu metin; o da yoksa listeden.
  function block(ev, id) {
    P3.bus.emit('gate', { ev: ev, id: id });
    var msg = !lock.named && cur === 'tutorial' && fn(P3.tut, 'blockedText') ? call(P3.tut, 'blockedText', ev) : '';
    feedback(msg || P3.t(TX.locked(lock.name)), { ms: LOCK_MS });
    return false;
  }

  function lockGate(ev) {
    var id;
    switch (ev.k) {
      case 'btn':
      case 'dpad':
      case 'octpage':
        if (ev.down === false) return true;
        id = ev.id || leafOf(ev);
        if (id === 'escape' || ALWAYS[id] || lock.ids[id]) return true;
        if (id === 'shift' && ev.combo && lock.ids.undo) return true;   // Ctrl/⌘+Shift+Z = Shift+Undo (Redo)
        return block(ev, id);
      case 'pad':
        if (ev.down === false) return true;
        var i = padIndex(ev.x, ev.y);
        if (lock.allPads || lock.pads[i]) return true;
        return block(ev, { pad: [ev.x, ev.y] });
      case 'enc':
        id = ev.id;
        if (ev.touch === false) { delete through['enc:' + id]; return true; }
        if (ALWAYS[id] || lock.ids[id]) { if (ev.touch) through['enc:' + id] = true; return true; }
        if (ev.touch === true) return false;                        // hover / dokunuş: sessiz
        if (through['enc:' + id] && !ev.press && !ev.reset) return true;   // izinliyken başlayan dokunuş
        return block(ev, id);
      case 'strip':
        if (ev.up) { delete through.strip; return true; }
        if (ev.down) {
          if (lock.ids.strip) { through.strip = true; return true; }
          return block(ev, 'strip');
        }
        return !!through.strip;
    }
    return true;
  }

  // Menüde hiçbir şey geçmez; Seviye 1'de olaylar seviyeye gider (cihaz pasif); Seviye 2 ve Serbest'te
  // hepsi geçer; öğreticide allow kilidi.
  function gate(ev) {
    if (!ev || !ready || !cur) return false;
    if (cur === 'level1') {
      if (fn(P3.levels, 'onEvent')) call(P3.levels, 'onEvent', 'in', ev);
      return false;
    }
    if (cur !== 'tutorial' || !lock) return true;
    return lockGate(ev);
  }

  function onIn(ev) {
    if (P3.app.gate(ev) && fn(P3.modes, 'dispatch')) P3.modes.dispatch(ev);
  }

  // ---------------------------------------------------------------- taskbar
  function segSync(m) {
    var seg = $('p3ModeSeg');
    if (!seg) return;
    each(seg.querySelectorAll('[data-mode]'), function (b) {
      var on = b.getAttribute('data-mode') === m;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function applyTaskbar(m) {
    var T = TOOLS[m] || {};
    segSync(m);
    text('p3Progress', '');
    text('p3TaskText', P3.t(m === 'free' ? TX.freeTask : TX.title[m]));
    show('p3HintBtn', !!T.hint);
    show('p3PresetSel', !!T.preset);
    show('p3KbToggle', !!T.kb);
    show('p3KeysBtn', !!T.keys);
    show('p3ViewSeg', !!T.view);
    show('p3ExplainPanel', false);
    show('p3TutPanel', false);
    resetFeedback();
    syncHint();
    syncPresets();
    syncKb();
    syncKeysBtn();
    updateSound();
  }

  // Öğreticide düğme bir eylemdir (P3.tut.hint(): ipucunu bir kademe açar); seviyelerde prefs.hints
  // anahtarıdır (hedef vurgusu açık/kapalı).
  function tutHint() { return cur === 'tutorial' && fn(P3.tut, 'hint'); }

  function syncHint() {
    var b = $('p3HintBtn'), on = hintsOn(), label;
    if (!b) return;
    if (tutHint()) {
      b.removeAttribute('aria-pressed');
      label = P3.t(TX.hintAsk);
    } else {
      b.setAttribute('aria-pressed', String(on));
      label = P3.t(on ? TX.hintHide : TX.hintShow);
    }
    b.setAttribute('aria-label', label);
    b.title = label;
  }

  function onHint() {
    if (!St()) return;
    if (!tutHint()) { P3.store.set('prefs.hints', !hintsOn()); return; }
    if (!hintsOn()) P3.store.set('prefs.hints', true);   // ipucu isteyen öğrenci ipuçlarını da açmış olur
    if (!P3.tut.hint()) feedback(P3.t(TX.noHint), { ms: 2500 });
  }

  function fillPresets() {
    var sel = $('p3PresetSel'), PR = P3.wtp && P3.wtp.PRESETS;
    if (!sel || !PR) return;
    var ids = Object.keys(PR);
    while (sel.options.length > ids.length) sel.removeChild(sel.options[sel.options.length - 1]);
    ids.forEach(function (id, i) {
      var o = sel.options[i];
      if (!o) { o = document.createElement('option'); sel.appendChild(o); }
      o.value = id;
      o.textContent = P3.t(PR[id].name) || id;
    });
    syncPresets();
  }

  function syncPresets() {
    var sel = $('p3PresetSel'), S = St(), t = S && S.tracks && S.tracks[0];
    if (sel && t && t.preset && sel.value !== t.preset) sel.value = t.preset;
  }

  function syncKb() {
    var b = $('p3KbToggle');
    if (b) b.setAttribute('aria-checked', String(kbOn()));
  }

  function syncKeysBtn() {
    var b = $('p3KeysBtn');
    if (!b) return;
    b.setAttribute('aria-pressed', String(keysOn));
    b.title = P3.t(keysOn ? TX.keysHide : TX.keysShow) + ' (Shift + /)';
  }

  // ---------------------------------------------------------------- görünüm (sartname-mobil)
  function isPhone() {
    try { return !!(window.matchMedia && window.matchMedia(PHONE_MQ).matches); } catch (e) { return false; }
  }

  // VARSAYIM: çalma görünümü sahne yataysa strip'li (padsStrip), dikeyse pads (daha büyük pad).
  function playView() {
    var st = $('p3Stage'), w = st ? st.clientWidth : 0, h = st ? st.clientHeight : 0;
    if (!(w > 0 && h > 0)) { w = window.innerWidth || 0; h = window.innerHeight || 0; }
    return w > h ? 'padsStrip' : 'pads';
  }

  function resolveView() {
    if (cur === 'level1') return 'full';
    var S = St(), v = (S && S.prefs && S.prefs.view) || 'auto';
    // Seviye 2'nin görevleri pad dışı kontrollerde: çalma görünümü onları gizlerdi.
    if (v === 'auto') return isPhone() && cur !== 'level2' ? playView() : 'full';
    if (v === 'pads') return playView();
    return P3.dev && P3.dev.VIEWS && P3.dev.VIEWS[v] ? v : 'full';
  }

  // force: mod başı ve tercih değişimi. Boyut değişiminde yalnız çözüm değiştiyse uygulanır; böylece
  // öğreticinin geçici görünümü her yeniden boyutlanmada ezilmez.
  function applyView(force) {
    if (!ready || !cur || !fn(P3.dev, 'setView')) return;
    var v = resolveView();
    if (force || v !== appliedView) {
      appliedView = v;
      if (P3.dev.view !== v) P3.dev.setView(v);
    }
    syncViewSeg();
  }

  function syncViewSeg() {
    var seg = $('p3ViewSeg'), v = P3.dev && P3.dev.view, key = v === 'padsStrip' ? 'pads' : v;
    if (!seg) return;
    each(seg.querySelectorAll('[data-view]'), function (b) {
      var on = b.getAttribute('data-view') === key;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function setViewPref(v) {
    if (!PREFS.view(v) || !St()) return;
    if (!P3.store.set('prefs.view', v)) applyView(true);   // değişmediyse state olayı yok
  }

  function setView(name) {
    if (!name) { applyView(true); return true; }
    if (!fn(P3.dev, 'setView') || !P3.dev.setView(name)) return false;
    syncViewSeg();
    return true;
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resizeTimer = null; applyView(false); renderKeys(); }, RESIZE_MS);
  }

  // ---------------------------------------------------------------- tuş katmanı (§H16)
  function keyChar(code) {
    var c = layoutMap && fn(layoutMap, 'get') ? layoutMap.get(code) : null;
    if (c && String(c).trim()) return String(c).toUpperCase();
    var m = /^(?:Key|Digit)(.)$/.exec(code);
    return m ? m[1] : CODE_CHAR[code] || code;
  }

  function keyLabel(code) {
    var n = KEY_NAME[code];
    return n ? P3.t(n) : keyChar(code);
  }

  // Kullanıcının klavye düzeni (TR-Q'da Comma = Ö gibi); yalnız Chromium'da var, bir kez sorulur.
  function askLayout() {
    if (layoutAsked) return;
    layoutAsked = true;
    var kb = typeof navigator !== 'undefined' && navigator.keyboard;
    if (!kb || !fn(kb, 'getLayoutMap')) return;
    try {
      kb.getLayoutMap().then(function (map) { layoutMap = map; renderKeys(); }, noop);
    } catch (e) { /* izin yok */ }
  }

  function shortcutMap() {
    var u = P3.input && P3.input.util, src = (u && u.SHORTCUTS) || {}, byId = {};
    Object.keys(src).forEach(function (code) { if (!byId[src[code]]) byId[src[code]] = code; });
    return byId;
  }

  function setKeys(on) {
    on = !!on && !!cur && !!TOOLS[cur].keys;
    if (on === keysOn) { syncKeysBtn(); return; }
    keysOn = on;
    show('p3KeysLayer', on);
    syncKeysBtn();
    if (on) { askLayout(); renderKeys(); }
  }

  function buildKeysDom(layer) {
    var labels = document.createElement('div');
    labels.className = 'p3-keys-labels';
    labels.setAttribute('aria-hidden', 'true');
    var legend = document.createElement('div');
    legend.className = 'p3-keys-legend';
    legend.setAttribute('role', 'note');
    layer.appendChild(labels);
    layer.appendChild(legend);
    keysDom = { labels: labels, legend: legend, pool: [] };
  }

  function keyTags() {
    var tags = [], S = St(), w = S && S.prefs ? clamp(S.prefs.kbWin | 0, 0, 4) : 0;
    var rows = (P3.input && P3.input.util && P3.input.util.KB_ROWS) || KB_ROWS;
    rows.forEach(function (row, r) {
      row.forEach(function (code, c) { tags.push({ t: { pad: [c, w + 3 - r] }, text: keyChar(code), pad: true }); });
    });
    var byId = shortcutMap();
    Object.keys(byId).forEach(function (id) { tags.push({ t: id, text: keyLabel(byId[id]) }); });
    tags.push({ t: 'undo', text: isMac() ? '⌘Z' : 'Ctrl Z' });
    return tags;
  }

  function legendRows() {
    var K = TX.keys, S = St(), w = S && S.prefs ? clamp(S.prefs.kbWin | 0, 0, 4) : 0;
    var vel = fn(P3.input, 'kbVelocity') ? P3.input.kbVelocity() : P3.K.kbVel;
    return [
      [keyChar('BracketLeft') + ' ' + keyChar('BracketRight'), P3.t(K.rows(w + 1, w + 4))],
      [keyChar('Minus') + ' ' + keyChar('Equal'), P3.t(K.vel(vel))],
      ['Shift', P3.t(K.soft(P3.K.kbVelShift))],
      [isMac() ? '⌘Z' : 'Ctrl Z', P3.t(K.undo)],
      ['Esc', P3.t(K.esc)],
      ['Shift ' + keyChar('Slash'), P3.t(K.toggle)]
    ];
  }

  function renderLegend(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var title = document.createElement('p');
    title.className = 'p3-keys-legend-title';
    title.textContent = P3.t(TX.keys.title);
    el.appendChild(title);
    var dl = document.createElement('dl');
    legendRows().forEach(function (r) {
      var dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = r[0];
      dd.textContent = r[1];
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    el.appendChild(dl);
    var note = document.createElement('p');
    note.className = 'p3-keys-legend-note' + (kbOn() ? '' : ' off');
    note.textContent = P3.t(kbOn() ? TX.keys.focus : TX.keys.off);
    el.appendChild(note);
  }

  // Lejant tam görünümde soldaki boş şeride sığıyorsa oradadır (cihazı örtmez); sığmıyorsa Volume ve Undo'yu
  // örtmesin diye sağ üst köşeye (Device/Mix sırası) geçer.
  function placeLegend(el) {
    var hl = $('p3HotspotLayer'), W = hl ? hl.clientWidth : 0, H = hl ? hl.clientHeight : 0;
    var vb = String((P3.dev.VIEWS && P3.dev.VIEWS[P3.dev.view]) || P3.K.VB).split(' ').map(Number);
    var fits = false;
    if (P3.dev.view === 'full' && W > 0 && H > 0 && vb[2] > 0 && vb[3] > 0) {
      var side = (W - vb[2] * Math.min(W / vb[2], H / vb[3])) / 2;
      fits = side >= (el.offsetWidth || 290) + 16;
    }
    el.classList.toggle('p3-keys-legend-end', !fits);
  }

  // Etiketler cihazın üstünde, hotspot'larla aynı px uzayında (P3.dev.controlRect). Görünmeyen kontrolün
  // (pads/controls görünümünde kutu dışı) etiketi gizlenir. "Klavyeyle çal" kapalıyken tek tuşlar çalışmaz.
  function renderKeys() {
    var layer = $('p3KeysLayer');
    if (!keysOn || !layer || !P3.dev) return;
    if (!keysDom) buildKeysDom(layer);
    renderLegend(keysDom.legend);
    placeLegend(keysDom.legend);
    var tags = kbOn() ? keyTags() : [{ t: 'undo', text: isMac() ? '⌘Z' : 'Ctrl Z' }];
    var pool = keysDom.pool;
    while (pool.length < tags.length) {
      var e = document.createElement('span');
      keysDom.labels.appendChild(e);
      pool.push(e);
    }
    pool.forEach(function (el, i) {
      var g = tags[i], r = g && fn(P3.dev, 'controlRect') ? P3.dev.controlRect(g.t) : null;
      var hs = g && fn(P3.dev, 'hotspotEl') ? P3.dev.hotspotEl(g.t) : null;
      if (!r || !(r.w > 0) || (hs && hs.style && hs.style.visibility === 'hidden')) { el.hidden = true; return; }
      var fs = clamp(Math.round((g.pad ? r.h : Math.min(r.w, r.h)) * 0.24), 9, 13);
      el.hidden = false;
      el.className = 'p3-key' + (g.pad ? ' p3-key-pad' : '');
      el.textContent = g.text;
      el.style.left = Math.round(r.x + 3) + 'px';
      el.style.top = Math.round(r.y + 3) + 'px';
      el.style.fontSize = fs + 'px';
    });
  }

  // ---------------------------------------------------------------- menü (sartname-ogretici §1, §3)
  // Öğretici ilerlemesi: P3.tut.progress() (devam noktası dahil) varsa o, yoksa müfredat + P3.save'den.
  // → {count (Faz 1 bölüm), total (adım), min, pct, started, complete, at:{n, title} | null}
  function tutModel() {
    var p = fn(P3.tut, 'progress') ? call(P3.tut, 'progress') : null;
    if (p && isNum(p.total)) {
      return {
        count: isNum(p.available) ? p.available : curriculum().filter(function (c) { return phaseOf(c, 1) <= PHASE; }).length,
        total: p.total, min: isNum(p.minutes) ? p.minutes : 0,
        pct: isNum(p.pct) ? p.pct : 0, started: !!p.started, complete: !!(p.completed || p.completedAt),
        at: p.resume && p.resume.index ? { n: p.resume.index, title: p.resume.title || '' } : null
      };
    }
    var sv = P3.save.get('tutorial'), steps;
    sv = sv && typeof sv === 'object' ? sv : {};
    steps = sv.steps && typeof sv.steps === 'object' ? sv.steps : {};
    var M = { count: 0, total: 0, done: 0, min: 0, at: null }, list = [];
    curriculum().forEach(function (ch, i) {
      var cp = phaseOf(ch, 1);
      if (cp > PHASE) return;
      var slug = slugOf(ch, i), st = (ch.steps || []).filter(function (s) { return s && phaseOf(s, cp) <= PHASE; });
      var d = st.filter(function (s) { var r = steps[slug + '/' + s.id]; return !!(r && (r.done || r.skipped)); }).length;
      list.push({ slug: slug, n: list.length + 1, title: P3.t(ch.title) || slug, total: st.length, done: d });
      M.total += st.length;
      M.done += d;
      M.min += +ch.estMin > 0 ? +ch.estMin : 0;
    });
    var curCh = sv.current && sv.current.ch;
    list.forEach(function (c) { if (!M.at && c.slug === curCh) M.at = c; });
    list.forEach(function (c) { if (!M.at && c.done < c.total) M.at = c; });
    M.count = list.length;
    M.pct = M.total ? Math.round(M.done / M.total * 100) : 0;
    M.complete = !!sv.completedAt || (M.total > 0 && M.done >= M.total);
    M.started = M.done > 0 || !!curCh;
    return M;
  }

  function fmtTime(ms) {
    if (fn(P3.levels, 'fmtTime')) return P3.levels.fmtTime(ms);
    var s = Math.round(ms / 1000), m = Math.floor(s / 60);
    s -= m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function levelProgress(n) {
    var all = fn(P3.levels, 'progress') ? call(P3.levels, 'progress') : null, p = all && all['level' + n];
    if (p && isNum(p.total) && p.total > 0) return p;
    var L = P3.levels, list = L && (n === 1 ? L.TASKS : L.TASKS2);
    var total = Array.isArray(list) && list.length ? list.length : (n === 1 ? 27 : 6);
    var o = P3.save.get('level' + n);
    o = o && typeof o === 'object' ? o : {};
    return {
      idx: isNum(o.idx) ? clamp(Math.floor(o.idx), 0, total) : 0, total: total,
      completedAt: o.completedAt || null, bestMs: isNum(o.bestMs) ? o.bestMs : null
    };
  }

  function firstVisit() {
    var sv = P3.save.get('');
    return !(sv && (sv.lastMode || sv.tutorial || sv.level1 || sv.level2));
  }

  function tutCard() {
    var M = tutModel(), v = { pct: 0, first: firstVisit() };
    if (M.count) v.meta = P3.t(TX.tutMeta(M.count, M.total, M.min));
    if (M.complete) { v.cta = P3.t(TX.tutDone); v.pct = 100; }
    else if (M.started) {
      v.cta = P3.t(M.at ? TX.tutCont(M.at.n, M.at.title) : TX.cont);
      v.pct = M.pct;
    } else v.cta = P3.t(TX.start);
    return v;
  }

  // Devam eden tur (0 < idx < toplam) tamamlanmış bir eski turdan önce gelir.
  function levelCard(n) {
    var p = levelProgress(n), v = { meta: P3.t(n === 1 ? TX.l1Meta(p.total) : TX.l2Meta(p.total)) };
    if (p.idx > 0 && p.idx < p.total) {
      v.cta = P3.t(TX.lvCont(p.idx, p.total));
      v.pct = Math.round(p.idx / p.total * 100);
    } else if (p.completedAt || p.idx >= p.total) {
      v.cta = P3.t(n === 2 ? TX.l2Done : isNum(p.bestMs) ? TX.l1Best(fmtTime(p.bestMs)) : TX.l1Done);
      v.pct = 100;
    } else {
      v.cta = P3.t(TX.start);
      v.pct = 0;
    }
    return v;
  }

  function menuRender() {
    var grid = $('p3ModeGrid');
    if (!grid) return;
    each(grid.querySelectorAll('.p3-mode-card'), function (card) {
      var m = card.getAttribute('data-mode');
      var v = m === 'tutorial' ? tutCard() : m === 'level1' ? levelCard(1) : m === 'level2' ? levelCard(2) : m === 'free' ? { cta: P3.t(TX.open) } : null;
      if (!v) return;
      var cta = card.querySelector('.p3-mode-cta'), meta = card.querySelector('.p3-mode-meta');
      var fill = card.querySelector('.p3-mode-fill'), first = card.querySelector('.p3-mode-first');
      if (cta && cta.textContent !== v.cta) cta.textContent = v.cta;
      if (meta && v.meta && meta.textContent !== v.meta) meta.textContent = v.meta;
      if (fill && isNum(v.pct)) fill.style.width = clamp(v.pct, 0, 100) + '%';
      if (first) first.hidden = !v.first;
    });
  }

  function onCard(m) {
    if (!HASH[m]) return;
    unlockAudio();   // A10: kullanıcı etkileşiminin içinde, beklemeden
    nav(hashFor(m), true);
  }

  // ---------------------------------------------------------------- ilerlemeyi sıfırla
  function openReset() {
    var modal = $('p3ResetModal');
    if (!modal) return;
    resetReturn = document.activeElement;
    modal.hidden = false;
    var c = $('p3ResetCancel');
    if (c) c.focus();
  }

  function closeReset() {
    var modal = $('p3ResetModal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (resetReturn && fn(resetReturn, 'focus')) resetReturn.focus();
    resetReturn = null;
  }

  function confirmReset() {
    var keepSettings = currentSettings();
    P3.save.reset();
    P3.save.patch('settings', keepSettings);
    call(P3.tut, 'resetProgress');   // seviyelerin bellekte ilerlemesi yok: P3.save.reset yeter
    P3.bus.emit('progressReset', {});
    closeReset();
    menuRender();
    toast(P3.t(TX.resetDone), { tone: 'ok' });
  }

  // Modal içinde odak döngüsü ve Escape.
  function onResetKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeReset(); return; }
    if (e.key !== 'Tab') return;
    var a = $('p3ResetCancel'), b = $('p3ResetConfirm');
    if (!a || !b) return;
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
    else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
  }

  // ---------------------------------------------------------------- bus
  function onState(ch) {
    if (!ch) return;
    var path = String(ch.path), S = St(), all = path === '*';
    if ((all || path === 'app.audio') && audioState() !== lastAudio) soundChanged();
    var m = /^prefs\.(\w+)$/.exec(path);
    if (m && PREFS[m[1]] && S && PREFS[m[1]](S.prefs[m[1]])) P3.save.patch('settings.' + m[1], S.prefs[m[1]]);
    if (all || path === 'prefs.hints') syncHint();
    if (all || path === 'prefs.kbOn') { syncKb(); renderKeys(); }
    if (all || path === 'prefs.kbWin') renderKeys();
    if (path === 'prefs.view') applyView(true);
    if (all || /^tracks(\.0(\.preset)?)?$/.test(path)) syncPresets();
    if (cur === 'free' && !all && !/^(app|prefs|popup|held)\b/.test(path)) {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(saveFree, AUTOSAVE_MS);
    }
  }

  function onLang() {
    menuRender();
    syncHint();
    syncKeysBtn();
    fillPresets();
    if (cur === 'free') text('p3TaskText', P3.t(TX.freeTask));
    renderKeys();
    writeFeedback(false);
  }

  function bindBus() {
    var bus = P3.bus;
    bus.on('toast', function (p) { toast(p && p.text, p); });
    bus.on('feedback', function (p) { if (cur) feedback(p && p.text, p); });
    bus.on('learn', onLearn);
    bus.on('keys', function () { if (cur && TOOLS[cur].keys) setKeys(!keysOn); });
    bus.on('state', onState);
    bus.on('restore', onRestore);
    bus.on('layout', function () { syncViewSeg(); renderKeys(); });
    bus.on('lang', onLang);
  }

  // ---------------------------------------------------------------- DOM bağlantıları
  function on(id, type, f) { var e = $(id); if (e) e.addEventListener(type, f); }

  function bindUi() {
    var grid = $('p3ModeGrid');
    if (grid) grid.addEventListener('click', function (e) {
      var card = closest(e.target, '.p3-mode-card');
      if (card && grid.contains(card)) onCard(card.getAttribute('data-mode'));
    });
    on('p3ResetProgress', 'click', openReset);
    on('p3ResetCancel', 'click', closeReset);
    on('p3ResetConfirm', 'click', confirmReset);
    var rm = $('p3ResetModal');
    if (rm) {
      rm.addEventListener('click', function (e) { if (e.target === rm) closeReset(); });
      rm.addEventListener('keydown', onResetKey);
    }
    on('p3BackBtn', 'click', back);
    var seg = $('p3ModeSeg');
    if (seg) seg.addEventListener('click', function (e) {
      var b = closest(e.target, '[data-mode]'), m = b && b.getAttribute('data-mode');
      if (m && HASH[m] && m !== cur) go(m);
    });
    on('p3HintBtn', 'click', onHint);
    on('p3PresetSel', 'change', function (e) {
      var id = e.target && e.target.value;
      if (id && P3.wtp && P3.wtp.PRESETS[id]) call(P3.modes, 'applyPreset', 0, id);
    });
    on('p3KbToggle', 'click', function () { call(P3.input, 'setKeyboard', !kbOn()); });
    var vs = $('p3ViewSeg');
    if (vs) vs.addEventListener('click', function (e) {
      var b = closest(e.target, '[data-view]');
      if (b) setViewPref(b.getAttribute('data-view'));
    });
    on('p3KeysBtn', 'click', function () { setKeys(!keysOn); });
    on('p3AudioBtn', 'click', retryAudio);
  }

  function bindWindow() {
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', onResize);
    window.addEventListener('storage', function (e) {
      if (e && e.key === P3.K.SAVE_KEY && !cur) { P3.save.load(); menuRender(); }
    });
    // Serbest mod kaydı sekme kapanırken/gizlenirken de yazılır (P3.save kendi flush'ını da bağlar).
    window.addEventListener('pagehide', function () { if (cur === 'free') { saveFree(); P3.save.flush(); } });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && cur === 'free') { saveFree(); P3.save.flush(); }
    });
    GESTURES.forEach(function (t) { document.addEventListener(t, onGesture, { capture: true, passive: true }); });
  }

  // ---------------------------------------------------------------- cihaz yükleme ve boot
  function loadDevice() {
    if (devPromise) return devPromise;
    var p = null;
    try { p = fn(P3.dev, 'load') ? P3.dev.load() : null; } catch (e) { p = null; console.warn(`[p3] cihaz yüklenemedi`, e); }
    if (!p || typeof p.then !== 'function') { devFailed = true; showDevError(); return null; }
    devFailed = false;
    devPromise = p.then(function () {
      call(P3.leds, 'init');
      call(P3.input, 'init');
      if (!inBound) { P3.bus.on('in', onIn); inBound = true; }
      ready = true;
      route();
    }, function (e) {
      devPromise = null;   // sonraki gezinme yeniden dener
      devFailed = true;
      console.warn(`[p3] cihaz yüklenemedi`, e);
      var r = parseHash(location.hash);
      if (r) { showLoading(r.mode); showDevError(); }
    });
    return devPromise;
  }

  // ?p3debug=1 → p3-selftest.js (yalnız tanım + başlatıcı paneli). window.P3 zaten açık.
  function loadSelftest() {
    if (!/(?:^|[?&])p3debug=1(?:&|$)/.test(location.search || '')) return;
    var s = document.createElement('script');
    s.src = '/assets/js/push3/p3-selftest.js?v=' + P3.K.V;
    s.onerror = function () { console.warn(`[p3] p3-selftest.js yüklenemedi`); };
    document.body.appendChild(s);
  }

  // README §I1: store → seq → lcd → modes → dev.load → (çözülünce) leds → input → 'in' gate → router.
  function boot() {
    if (booted) return;
    if (!P3.store || !P3.bus || !P3.save) { console.warn(`[p3] p3-core yüklenmemiş; uygulama başlatılamadı`); return; }
    booted = true;
    token = 'p3' + Math.random().toString(36).slice(2);
    P3.save.load();
    P3.store.init();
    loadSettings(false);
    P3.save.patch('lastVisit', Date.now());
    call(P3.seq, 'init');
    call(P3.lcd, 'init');
    call(P3.modes, 'init');
    fillPresets();
    bindUi();
    bindBus();
    bindWindow();
    menuRender();
    var r = parseHash(location.hash);
    if (r) showLoading(r.mode);   // derin link: menü bir an görünmesin
    var p = loadDevice();
    if (p) p.then(loadSelftest, loadSelftest); else loadSelftest();
  }

  P3.app = {
    boot: boot,
    route: route,
    go: go,
    startMode: startMode,
    stopMode: stopMode,
    gate: gate,
    allow: allow,
    toast: toast,
    feedback: feedback,
    menuRender: menuRender,
    setView: setView,
    setHash: function (h) { syncHash(h ? (String(h).charAt(0) === '#' ? String(h) : '#' + h) : ''); },
    keys: setKeys,
    mode: function () { return cur || 'menu'; }
  };

  if (typeof document !== 'undefined' && fn(document, 'addEventListener')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();
