// trial-intro.js — deneme dersi / sistem tanıtımı video dizileri (window.beIntro).
// Tam ekran koyu katmanda SEQ'teki dizi sırayla sesli oynar; biter, "Geç"e ya da Esc'ye basılınca:
//  - trial  deneme dersi çağrısı (TRIGGERS)  deneme-dersi 10 sn → sistem-tanitim 60 sn → tıklanan öğe
//  - buy    ders/paket satın alma düğmesi    sistem-tanitim → tıklanan öğe
//  - first  Ders Paneli'ne bu cihazda ilk giriş (<body data-be-intro-first>, localStorage
//           'be-intro-first')  deneme-dersi → sistem-tanitim → katman kapanır
//  - replay [data-be-intro-replay] düğmesi    sistem-tanitim, her tıklamada
// "Tıklanan öğe": aynı öğeye yeniden tıklanır (bağlantı gider, düğme formunu açar) — form ve
// rezervasyon mantığına dokunmaz. Oturumda her video bir kez (sessionStorage 'be-intro-seen' =
// izlenen adımlar): paketten sonra deneme çağrısı yalnız deneme-dersi'ni oynatır; hepsi izlendiyse
// tıklama doğrudan geçer. prefers-reduced-motion açıksa yalnız replay oynar. Ses engellenirse
// sessiz oynar ve "Sesi aç" görünür; sessiz de olmazsa doğrudan devam eder; yüklenemeyen adım
// atlanır (webm çözülemezse önce mp4 denenir). Dışarıdan duraklatılırsa (kulaklık, arama) "Oynat"
// görünür; sekme görünür olunca kendiliğinden sürer.
// İki <video> üst üste durur: sıradaki adım, önceki oynarken arkadaki öğeye önden yüklenir ve
// ilk karesi gelince öne alınır (videolar #0b0b0e'den başlayıp ona söndüğü için geçiş görünmez;
// dizi iki adımlık olduğu için arkadaki öğe hiçbir zaman ekrandaki değildir).
// İkinci öğe ilk tıklamada play()/pause() ile "kutsanır": Safari sonraki sesli oynatmaya izin verir.
// Stil: ui.css "Deneme dersi tanıtım katmanı".
(function () {
  'use strict';
  var BASE = '/assets/media/deneme-dersi/';
  // Her adım için klasörde <ad>-web.(webm|mp4), <ad>-mobil.(webm|mp4), <ad>-(web|mobil)-poster.jpg;
  // dosyası olmayan adım atlanır. poster:false → afiş başta gösterilmez (sistem-tanitim afişi kapanış karesi).
  var STEPS = { 'deneme-dersi': { poster: true }, 'sistem-tanitim': { poster: false } };
  var SEQ = {
    trial: ['deneme-dersi', 'sistem-tanitim'],
    buy: ['sistem-tanitim'],
    first: ['deneme-dersi', 'sistem-tanitim'],
    replay: ['sistem-tanitim']
  };
  // Deneme dersi çağrıları: sayfa CTA'ları (data-deneme-dersi), kabuktaki "Ücretsiz deneme",
  // Ders Paneli'ndeki deneme kartı; ilk kez gelen için "Deneme Dersi" etiketli gezinme öğeleri.
  // Satın alma: Ders Paneli'ndeki "Kampanyalı paket" kartı ve "Yeni talep" düğmesi (data-be-buy).
  var TRIGGERS = [
    { sel: '[data-deneme-dersi], .be-cta, #trialPanel', seq: 'trial' },
    { sel: '#packagePanel, [data-be-buy]', seq: 'buy' }
  ];
  var NAV_TRIGGERS = 'a[data-be-trial-key]';
  var REPLAY = '[data-be-intro-replay]';
  var SEEN_KEY = 'be-intro-seen', FIRST_KEY = 'be-intro-first';
  var START_MS = 8000; // görünür sekmede bu sürede oynamaya başlamayan adım atlanır (yavaş bağlantı)
  var FADE_MS = 250, LEAVE_MS = 4000;

  var html = document.documentElement;
  var seenMem = {}, firstMem = false, layer = null, videos = [], skip = null, unmute = null, resume = null, leaveTimer = 0;
  var run = null; // { target, back, steps, idx, done, muted, timer }

  function noop() {}
  function seenSteps() {
    var o = {};
    Object.keys(seenMem).forEach(function (k) { o[k] = 1; });
    try { (window.sessionStorage.getItem(SEEN_KEY) || '').split(',').forEach(function (n) { if (STEPS[n]) o[n] = 1; }); } catch (e) { /* noop */ }
    return o;
  }
  // dizinin bu oturumda henüz izlenmemiş adımları
  function unseen(names) { var s = seenSteps(); return names.filter(function (n) { return !s[n]; }); }
  function markSeen(names) {
    names.forEach(function (n) { seenMem[n] = true; });
    firstMem = true;
    try { window.sessionStorage.setItem(SEEN_KEY, Object.keys(seenSteps()).join(',')); } catch (e) { /* noop */ }
    try { window.localStorage.setItem(FIRST_KEY, '1'); } catch (e) { /* noop */ }
  }
  function firstDone() {
    if (firstMem) return true;
    try { return window.localStorage.getItem(FIRST_KEY) === '1'; } catch (e) { return true; } // depo yoksa her girişte oynatma
  }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function isEn() { return (html.lang || '').indexOf('en') === 0; }
  function active() { return !!(run && !run.done); }

  // { el, seq } — tıklanan deneme/satın alma çağrısı
  function triggerOf(el) {
    if (!el || !el.closest) return null;
    for (var i = 0; i < TRIGGERS.length; i++) {
      var t = el.closest(TRIGGERS[i].sel);
      if (t) return { el: t, seq: TRIGGERS[i].seq };
    }
    var n = html.classList.contains('be-trial') ? el.closest(NAV_TRIGGERS) : null;
    return n ? { el: n, seq: 'trial' } : null;
  }

  function source(name) {
    var variant = window.matchMedia('(max-width: 768px)').matches ? 'mobil' : 'web';
    var probe = videos[0] || document.createElement('video');
    var webm = probe.canPlayType('video/webm; codecs="vp9, opus"') === 'probably';
    var conf = STEPS[name] || {};
    return {
      src: BASE + name + '-' + variant + (webm ? '.webm' : '.mp4'),
      poster: conf.poster ? BASE + name + '-' + variant + '-poster.jpg' : ''
    };
  }

  // Dosya var mı? Hosting'in "**" yeniden yazımı eksik dosyada index.html (200) döndürür,
  // bu yüzden tür de denetlenir. Ağ hatasında null: yine denenir, error olayı yakalar.
  function exists(url) {
    if (!window.fetch) return Promise.resolve(null);
    return fetch(url, { method: 'HEAD' }).then(function (r) {
      return r.ok && /^video\//.test(r.headers.get('content-type') || '');
    }).catch(function () { return null; });
  }

  function makeVideo() {
    var v = document.createElement('video');
    v.className = 'be-intro-video';
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('disablepictureinpicture', '');
    v.setAttribute('disableremoteplayback', '');
    v.preload = 'auto';
    v.addEventListener('playing', function () { onPlaying(v); });
    v.addEventListener('ended', function () { var i = stepOf(v); if (run && i === run.idx) next(i); });
    v.addEventListener('error', function () { onError(v); });
    v.addEventListener('pause', function () { onPause(v); });
    return v;
  }

  function button(cls, iconId) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost ' + cls;
    b.hidden = true;
    b.innerHTML = '<svg class="icon" aria-hidden="true"><use href="/assets/img/icons.svg#' + iconId + '"/></svg><span></span>';
    return b;
  }

  function build() {
    if (layer) return;
    layer = document.createElement('div');
    layer.className = 'be-intro';
    layer.hidden = true;
    layer.setAttribute('role', 'dialog');
    videos = [makeVideo(), makeVideo()];
    var bar = document.createElement('div');
    bar.className = 'be-intro-bar';
    resume = button('be-intro-resume', 'i-play');
    unmute = button('be-intro-unmute', 'i-headphones');
    skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'btn btn-ghost be-intro-skip';
    bar.appendChild(resume);
    bar.appendChild(unmute);
    bar.appendChild(skip);
    layer.appendChild(videos[0]);
    layer.appendChild(videos[1]);
    layer.appendChild(bar);
    document.body.appendChild(layer);
    skip.addEventListener('click', function () { finish(); });
    unmute.addEventListener('click', onUnmute);
    resume.addEventListener('click', onResume);
  }

  // Kaynak yokken ya da yüklüyken jest içinde play()+pause(): Safari sonraki sesli oynatmaya izin verir.
  function bless(v) {
    v.muted = false;
    try {
      var p = v.play(); if (p && p.catch) p.catch(noop);
      v.pause();
      if (v.currentSrc) v.currentTime = 0;
    } catch (e) { /* noop */ }
  }

  function curVideo() {
    var s = active() && run.steps[run.idx];
    return s && s.loaded ? s.video : null;
  }

  // Ses engellenip sessiz oynuyorsa: kullanıcının dokunuşuyla sesi aç (bu jest öğeleri de kutsar).
  function onUnmute() {
    var r = run;
    if (!active()) return;
    r.muted = false;
    var cur = curVideo();
    videos.forEach(function (v) { if (v !== cur) bless(v); });
    unmute.hidden = true;
    skip.focus({ preventScroll: true });
    if (!cur) return;
    // tarayıcı sesi yine açtırmazsa (Chrome sesi açılan videoyu durdurur) sessize dönüp devam et
    var remute = function () {
      if (run !== r || r.done || !cur.paused || cur.ended) return;
      r.muted = true;
      cur.muted = true;
      unmute.hidden = false;
      cur.play().catch(noop);
    };
    cur.muted = false;
    if (cur.paused) cur.play().catch(remute);
    setTimeout(remute, 0);
  }

  // Dışarıdan duraklatıldıysa (kulaklık çıktı, arama, kilit ekranı) dokunuşla sürdür.
  function onResume() {
    var r = run, cur = curVideo();
    if (!cur) return;
    resume.hidden = true;
    skip.focus({ preventScroll: true });
    cur.play().catch(function (err) {
      if (run !== r || r.done) return;
      if (err && err.name === 'NotAllowedError' && !cur.muted) {
        r.muted = true; cur.muted = true; unmute.hidden = false;
        cur.play().catch(function () { resume.hidden = false; });
      } else resume.hidden = false;
    });
  }
  function onPause(v) {
    if (!active() || v !== curVideo() || v.ended || !v.classList.contains('is-cur')) return;
    resume.hidden = false;
  }
  function onVisible() {
    var cur = curVideo();
    if (document.hidden || !cur || !cur.paused || cur.ended) return;
    cur.play().then(function () { resume.hidden = true; }, noop);
  }

  // Bu öğe şu an hangi adımı taşıyor (oynayan ya da önden yüklenen)?
  function stepOf(v) {
    if (!active()) return -1;
    for (var i = Math.max(run.idx, 0); i < run.steps.length && i <= run.idx + 1; i++) {
      if (run.steps[i].video === v && run.steps[i].loaded) return i;
    }
    return -1;
  }

  function show(v) {
    videos.forEach(function (x) { x.classList.toggle('is-cur', x === v); });
  }

  // Odak katmanda kalır: Tab görünür düğmeler arasında döner, dışarı kayan odak (arkada açılan
  // pencerelerin focus()'u) "Geç"e geri alınır; tuşlar sayfanın kendi tuzaklarına ulaşmaz.
  function onKey(e) {
    if (!active()) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); finish(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      var list = [resume, unmute, skip].filter(function (b) { return !b.hidden; });
      var k = list.indexOf(document.activeElement);
      list[(k + (e.shiftKey ? list.length - 1 : 1)) % list.length].focus({ preventScroll: true });
    }
  }
  function onFocusIn(e) {
    if (active() && layer && !layer.contains(e.target)) skip.focus({ preventScroll: true });
  }

  // names: oynatılacak adımlar · target: bitince yeniden tıklanacak öğe (yoksa katman kapanır) · back: odağın döneceği öğe
  function start(names, target, back) {
    build();
    markSeen(names);
    clearTimeout(leaveTimer);
    var steps = names.map(function (name, i) {
      var s = source(name);
      return {
        src: s.src, poster: s.poster, video: videos[i % 2], loaded: false, bad: false,
        check: i === 0 ? null : exists(s.src) // ilk adım beklemeden oynar (tıklama jesti korunur)
      };
    });
    run = { target: target, back: back || null, steps: steps, idx: -1, done: false, muted: false, timer: 0 };
    // Arkadaki öğeyi jest içinde kutsa (kaynak yokken play()+pause(): yükleme başlatmaz).
    videos.forEach(function (v) { if (v !== steps[0].video) bless(v); });
    layer.setAttribute('aria-label', names[0] === 'deneme-dersi' ? (isEn() ? 'Trial Lesson' : `Deneme Dersi`) : (isEn() ? 'Intro video' : `Tanıtım videosu`));
    skip.textContent = isEn() ? 'Skip' : `Geç`;
    unmute.lastChild.textContent = isEn() ? 'Unmute' : `Sesi aç`;
    resume.setAttribute('aria-label', isEn() ? 'Play' : `Oynat`);
    unmute.hidden = resume.hidden = true;
    show(steps[0].video);
    layer.hidden = false;
    layer.setAttribute('aria-modal', 'true'); // yalnız açıkken (panel turu açık pencere bekler)
    html.classList.add('be-intro-open');
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocusIn, true);
    void layer.offsetWidth; // görünür hâle gelişi işlensin: opaklık geçişi çalışır
    layer.classList.add('is-on');
    skip.focus({ preventScroll: true });
    play(0);
  }

  function load(s) {
    var v = s.video;
    if (s.poster) v.poster = s.poster; else v.removeAttribute('poster');
    v.src = s.src;
    s.loaded = true;
  }

  // Sıradaki adımı arkadaki öğeye önden yükle (dosya yoksa adımı işaretle).
  function preload(j) {
    var r = run;
    if (!active() || j >= r.steps.length) return;
    var s = r.steps[j];
    if (s.loaded || s.bad) return;
    (s.check || Promise.resolve(null)).then(function (ok) {
      if (run !== r || r.done || s.loaded || s.bad) return;
      if (ok === false) { s.bad = true; return; }
      load(s);
    });
  }

  function play(i) {
    var r = run;
    if (!active()) return;
    if (i >= r.steps.length) { finish(); return; }
    r.idx = i;
    var s = r.steps[i];
    if (s.bad) { next(i); return; }
    clearTimeout(r.timer);
    r.timer = setTimeout(function () { stall(r, i); }, START_MS);
    if (s.loaded || !s.check) { if (!s.loaded) load(s); begin(r, i, s); return; }
    s.check.then(function (ok) {
      if (run !== r || r.done || r.idx !== i) return;
      if (ok === false) { s.bad = true; next(i); return; }
      if (!s.loaded) load(s);
      begin(r, i, s);
    });
  }

  // Adım zamanında başlamadı: indirmeyi durdur (sonradan sesli başlamasın), sıradakine geç.
  // Sekme görünmezken tarayıcı oynatmayı bekletir; o sürede sayılmaz.
  function stall(r, i) {
    if (run !== r || r.done || r.idx !== i) return;
    if (document.hidden) { r.timer = setTimeout(function () { stall(r, i); }, START_MS); return; }
    var s = r.steps[i], v = s.video;
    s.bad = true;
    s.loaded = false;
    v.pause();
    v.removeAttribute('src');
    try { v.load(); } catch (e) { /* noop */ }
    next(i);
  }

  function begin(r, i, s) {
    var v = s.video;
    v.muted = r.muted;
    unmute.hidden = !r.muted;
    var p = v.play();
    if (p && p.catch) {
      p.catch(function (err) {
        if (run !== r || r.done || r.idx !== i) return;
        if (err && err.name === 'NotAllowedError') {
          if (v.muted) { finish(); return; }
          // tarayıcı sesi engelledi: sessiz dene, o da olmazsa devam et
          r.muted = true;
          v.muted = true;
          unmute.hidden = false;
          v.play().catch(function () { if (run === r && r.idx === i) finish(); });
        } else if (err && err.name !== 'AbortError') {
          next(i);
        }
      });
    }
  }

  function onPlaying(v) {
    var r = run, i = stepOf(v);
    if (!r || i !== r.idx) return;
    clearTimeout(r.timer);
    resume.hidden = true;
    if (!v.classList.contains('is-cur')) {
      // ilk karesi ekrana gelince öne al; önceki öğe o ana dek son (koyu) karesini gösterir
      var shown = false, swap = function () {
        if (shown || run !== r || r.done || r.idx !== i) return;
        shown = true;
        show(v);
        videos.forEach(function (x) { if (x !== v) x.pause(); });
      };
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(swap);
      setTimeout(swap, 200);
    }
    preload(i + 1);
  }

  function onError(v) {
    var r = run, i = stepOf(v);
    if (!r || i < 0) return;
    var s = r.steps[i];
    if (/\.webm$/.test(s.src)) {
      // VP9/Opus çözülemedi: aynı adımın mp4'ünü dene (eksik dosyada o da hata verir → atlanır)
      s.src = s.src.replace(/\.webm$/, '.mp4');
      load(s);
      if (i === r.idx) begin(r, i, s);
      return;
    }
    if (i === r.idx) next(i);
    else s.bad = true; // önden yüklenirken bozuk çıktı: sırası gelince atlanır
  }

  function next(from) {
    if (!active() || run.idx !== from) return;
    play(from + 1);
  }

  function stopVideos() {
    videos.forEach(function (v) {
      v.pause();
      v.removeAttribute('src');
      v.removeAttribute('poster');
      v.classList.remove('is-cur');
      try { v.load(); } catch (e) { /* noop */ }
    });
  }

  function detach() {
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('focusin', onFocusIn, true);
  }

  function hide() {
    layer.classList.remove('is-on');
    layer.removeAttribute('aria-modal');
    html.classList.remove('be-intro-open');
    setTimeout(function () { if (!active()) layer.hidden = true; }, FADE_MS);
  }

  // Bağlantı başka bir sayfaya gidiyorsa katman koyu kalır (eski sayfa bir an görünmesin).
  function leavesPage(t) {
    if (!t || t.tagName !== 'A' || !t.href) return false;
    try {
      var u = new URL(t.href, location.href);
      return u.origin !== location.origin || u.pathname !== location.pathname || u.search !== location.search;
    } catch (e) { return false; }
  }

  function finish() {
    var r = run;
    if (!active()) return;
    r.done = true;
    clearTimeout(r.timer);
    detach();
    stopVideos();
    var t = r.target;
    if (!t) {
      // ilk giriş / yeniden oynatma: yalnız katman kapanır
      hide();
      var b = r.back && r.back.isConnected ? r.back : null;
      if (b) b.focus({ preventScroll: true });
      return;
    }
    if (!t.isConnected && t.id) t = document.getElementById(t.id) || t;
    if (leavesPage(t)) {
      proceed(t);
      // gezinme olmazsa (iptal, aynı belge) katmanı yine de kaldır
      leaveTimer = setTimeout(function () { if (!active()) hide(); }, LEAVE_MS);
    } else {
      hide();
      proceed(t);
    }
  }

  function proceed(t) {
    if (t.tagName === 'A' && !t.isConnected) { if (t.href) location.assign(t.href); return; }
    t.click(); // adımlar izlendi sayıldı: dinleyici bu tıklamayı geçirir
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (active()) return;
    var rp = e.target && e.target.closest ? e.target.closest(REPLAY) : null;
    if (rp) { e.preventDefault(); start(SEQ.replay, null, rp); return; } // açık istek: hareket azaltmada da oynar
    var t = triggerOf(e.target);
    if (!t || reduced()) return;
    var names = unseen(SEQ[t.seq]);
    if (!names.length) return;
    var el = t.el;
    if (el.tagName === 'A' && ((el.target && el.target !== '_self') || el.hasAttribute('download'))) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    start(names, el, el);
  }, true);

  // Ders Paneli'ne bu cihazda ilk giriş: dizi kendiliğinden (jest yok → çoğu tarayıcıda sessiz + "Sesi aç").
  // Arka plan sekmesinde açıldıysa görünür olana dek bekler (görülmeden harcanmasın).
  function firstVisit() {
    if (!document.body || !document.body.hasAttribute('data-be-intro-first')) return;
    if (reduced() || firstDone() || active()) return;
    if (document.hidden) {
      document.addEventListener('visibilitychange', function again() {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', again);
        firstVisit();
      });
      return;
    }
    var names = unseen(SEQ.first);
    if (names.length) start(names, null, null);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', firstVisit);
  else firstVisit();
  document.addEventListener('visibilitychange', onVisible);

  // İlk kare beklemesin: çağrının üzerine gelinince ilk adımın afişini önceden al (küçük jpg).
  var warmed = false;
  function warm(e) {
    var t = warmed || reduced() ? null : triggerOf(e.target);
    var names = t ? unseen(SEQ[t.seq]) : [];
    if (!names.length) return;
    warmed = true;
    var p = source(names[0]).poster;
    if (p) new Image().src = p;
  }
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm);

  // Geri tuşuyla önbellekten dönülürse açık kalan katmanı kapat.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted || !layer) return;
    clearTimeout(leaveTimer);
    if (layer.hidden) return;
    if (run) { run.done = true; clearTimeout(run.timer); }
    detach();
    stopVideos();
    layer.classList.remove('is-on');
    layer.removeAttribute('aria-modal');
    html.classList.remove('be-intro-open');
    layer.hidden = true;
  });

  window.beIntro = {
    steps: STEPS, seq: SEQ,
    isSeen: function (name) { return !unseen([name]).length; },
    replay: function () { if (!active()) start(SEQ.replay, null, document.activeElement); }
  };
})();
