// trial-intro.js — "deneme dersi" tanıtım animasyonu (window.beIntro).
// Bir deneme dersi çağrısına (TRIGGERS) oturumdaki ilk tıklamada tam ekran koyu katmanda
// oynatma listesini sesli oynatır; video biter, "Geç"e basılır ya da Esc'ye basılınca tıklanan
// öğenin normal işine devam eder (aynı öğeye yeniden tıklar: bağlantı gider, düğme formunu açar).
// Form ve rezervasyon mantığına dokunmaz. Oturumda bir kez (sessionStorage 'be-intro-seen');
// prefers-reduced-motion açıksa hiç oynamaz. Ses engellenirse sessiz, o da olmazsa ya da dosya
// yüklenemezse doğrudan devam eder. Stil: ui.css "Deneme dersi tanıtım katmanı".
(function () {
  'use strict';
  var BASE = '/assets/media/deneme-dersi/';
  // Sırayla oynar; dosyası olmayan adım atlanır. Her adım için klasörde
  // <ad>-web.(webm|mp4), <ad>-mobil.(webm|mp4), <ad>-(web|mobil)-poster.jpg bulunur.
  var PLAYLIST = ['deneme-dersi', 'sistem-tanitim'];
  // Deneme dersi çağrıları: sayfa CTA'ları (data-deneme-dersi), kabuktaki "Ücretsiz deneme",
  // Ders Paneli'ndeki deneme kartı; ilk kez gelen için "Deneme Dersi" etiketli gezinme öğeleri.
  var TRIGGERS = '[data-deneme-dersi], .be-cta, #trialPanel';
  var NAV_TRIGGERS = 'a[data-be-trial-key]';
  var SEEN_KEY = 'be-intro-seen';
  var START_MS = 8000; // bu sürede oynamaya başlamayan adım atlanır (yavaş bağlantı)
  var FADE_MS = 250;

  var html = document.documentElement;
  var seenMem = false, layer = null, video = null, skip = null;
  var run = null; // { target, steps, idx, done, muted, timer }

  function seen() {
    if (seenMem) return true;
    try { return window.sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    seenMem = true;
    try { window.sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* noop */ }
  }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function isEn() { return (html.lang || '').indexOf('en') === 0; }

  function triggerOf(el) {
    if (!el || !el.closest) return null;
    return el.closest(TRIGGERS) || (html.classList.contains('be-trial') ? el.closest(NAV_TRIGGERS) : null);
  }

  function source(name) {
    var variant = window.matchMedia('(max-width: 768px)').matches ? 'mobil' : 'web';
    var probe = video || document.createElement('video');
    var webm = probe.canPlayType('video/webm; codecs="vp9, opus"') === 'probably';
    return { src: BASE + name + '-' + variant + (webm ? '.webm' : '.mp4'), poster: BASE + name + '-' + variant + '-poster.jpg' };
  }

  // Dosya var mı? Hosting'in "**" yeniden yazımı eksik dosyada index.html (200) döndürür,
  // bu yüzden tür de denetlenir. Ağ hatasında null: yine denenir, error olayı yakalar.
  function exists(url) {
    if (!window.fetch) return Promise.resolve(null);
    return fetch(url, { method: 'HEAD' }).then(function (r) {
      return r.ok && /^video\//.test(r.headers.get('content-type') || '');
    }).catch(function () { return null; });
  }

  function build() {
    if (layer) return;
    layer = document.createElement('div');
    layer.className = 'be-intro';
    layer.hidden = true;
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    video = document.createElement('video');
    video.className = 'be-intro-video';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('disablepictureinpicture', '');
    video.setAttribute('disableremoteplayback', '');
    video.preload = 'auto';
    skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'btn btn-ghost be-intro-skip';
    layer.appendChild(video);
    layer.appendChild(skip);
    document.body.appendChild(layer);

    video.addEventListener('playing', function () { if (run) clearTimeout(run.timer); });
    video.addEventListener('ended', function () { if (run) next(run.idx); });
    video.addEventListener('error', function () { if (run) next(run.idx); });
    skip.addEventListener('click', function () { finish(); });
  }

  function onKey(e) {
    if (!run || run.done) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); finish(); }
    else if (e.key === 'Tab') { e.preventDefault(); skip.focus({ preventScroll: true }); }
  }

  function start(target) {
    build();
    markSeen();
    var steps = PLAYLIST.map(function (name, i) {
      var s = source(name);
      s.check = i === 0 ? null : exists(s.src); // ilk adım beklemeden oynar (tıklama jesti korunur)
      return s;
    });
    run = { target: target, steps: steps, idx: -1, done: false, muted: false, timer: 0 };
    layer.setAttribute('aria-label', isEn() ? 'Trial Lesson' : `Deneme Dersi`);
    skip.textContent = isEn() ? 'Skip' : `Geç`;
    layer.hidden = false;
    html.classList.add('be-intro-open');
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(function () { layer.classList.add('is-on'); });
    skip.focus({ preventScroll: true });
    play(0);
  }

  function play(i) {
    var r = run;
    if (!r || r.done) return;
    if (i >= r.steps.length) { finish(); return; }
    r.idx = i;
    var s = r.steps[i];
    if (s.check) {
      s.check.then(function (ok) {
        if (run !== r || r.done || r.idx !== i) return;
        if (ok === false) next(i); else load(r, i, s);
      });
    } else {
      load(r, i, s);
    }
  }

  function load(r, i, s) {
    clearTimeout(r.timer);
    r.timer = setTimeout(function () { next(i); }, START_MS);
    video.poster = s.poster;
    video.src = s.src;
    video.muted = r.muted;
    var p = video.play();
    if (p && p.catch) {
      p.catch(function (err) {
        if (run !== r || r.done || r.idx !== i) return;
        if (err && err.name === 'NotAllowedError') {
          if (video.muted) { finish(); return; }
          // tarayıcı sesi engelledi: sessiz dene, o da olmazsa devam et
          r.muted = true;
          video.muted = true;
          video.play().catch(function () { if (run === r && r.idx === i) finish(); });
        } else if (err && err.name !== 'AbortError') {
          next(i);
        }
      });
    }
  }

  function next(from) {
    if (!run || run.done || run.idx !== from) return;
    play(from + 1);
  }

  function stopVideo() {
    video.pause();
    video.removeAttribute('src');
    video.removeAttribute('poster');
    try { video.load(); } catch (e) { /* noop */ }
  }

  function hide() {
    layer.classList.remove('is-on');
    html.classList.remove('be-intro-open');
    setTimeout(function () { if (!run || run.done) layer.hidden = true; }, FADE_MS);
  }

  // Bağlantı başka bir sayfaya gidiyorsa katman koyu kalır (eski sayfa bir an görünmesin).
  function leavesPage(t) {
    if (t.tagName !== 'A' || !t.href) return false;
    try {
      var u = new URL(t.href, location.href);
      return u.origin !== location.origin || u.pathname !== location.pathname || u.search !== location.search;
    } catch (e) { return false; }
  }

  function finish() {
    var r = run;
    if (!r || r.done) return;
    r.done = true;
    clearTimeout(r.timer);
    document.removeEventListener('keydown', onKey, true);
    stopVideo();
    var t = r.target;
    if (!t.isConnected && t.id) t = document.getElementById(t.id) || t;
    if (leavesPage(t)) {
      proceed(t);
      // gezinme olmazsa (iptal, aynı belge) katmanı yine de kaldır
      setTimeout(hide, 4000);
    } else {
      hide();
      proceed(t);
    }
  }

  function proceed(t) {
    if (t.tagName === 'A' && !t.isConnected) { if (t.href) location.assign(t.href); return; }
    t.click(); // markSeen() yapıldı: dinleyici bu tıklamayı geçirir
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = triggerOf(e.target);
    if (!t || (run && !run.done) || seen() || reduced()) return;
    if (t.tagName === 'A' && ((t.target && t.target !== '_self') || t.hasAttribute('download'))) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    start(t);
  }, true);

  // İlk kare beklemesin: çağrının üzerine gelinince afişi önceden al (küçük jpg).
  var warmed = false;
  function warm(e) {
    if (warmed || seen() || reduced() || !triggerOf(e.target)) return;
    warmed = true;
    new Image().src = source(PLAYLIST[0]).poster;
  }
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm);

  // Geri tuşuyla önbellekten dönülürse açık kalan katmanı kapat.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && layer && !layer.hidden) { if (run) run.done = true; layer.classList.remove('is-on'); html.classList.remove('be-intro-open'); layer.hidden = true; }
  });

  window.beIntro = { playlist: PLAYLIST, isSeen: seen };
})();
