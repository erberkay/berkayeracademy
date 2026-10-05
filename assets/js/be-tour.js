/* be-tour.js — paylaşılan, bağımlılıksız "panel turu" (coach mark) bileşeni.
 * Görünüm ui.css'teki "Panel turu" bloğunda (.be-tour-*). Sayfa yüklenince hiçbir şey yapmaz;
 * yalnız window.beTour'u tanımlar. Metinler i18n.js'teki tour_* anahtarlarından (yoksa aşağıdaki
 * TR/EN yedek tablosundan) gelir; adım metinlerini çağıran sayfa verir.
 *
 * API
 *   var tour = beTour.create({
 *     id: 'bk-active',                       // tekil ad (aria id'leri)
 *     steps: [{
 *       id: 'week',                          // adım adı (iz değişince aynı adıma dönmek için)
 *       target: '#sel' | function () { return Element | Element[] | NodeList | null; },
 *                                            // dizi → görünür öğelerin hepsini kapsayan dikdörtgen
 *       title: 'Metin' | function () { return 'Metin'; },
 *       body:  'Metin' | function,           // düz metin; html:true ise sabit, güvenilir HTML (kullanıcı verisi ASLA)
 *       html: false,
 *       placement: 'auto' | 'bottom' | 'top' | 'left' | 'right',   // masaüstü tercihi; mobilde kart alta yapışır
 *       when: function () { return true; },  // false → adım atlanır
 *       onEnter: function (els, step) {},    // adıma girerken
 *       mobileOnly: false, desktopOnly: false
 *     }],
 *     mobileQuery: '(max-width:1024px)',     // eşleşirse mobil iz: kart altta, alt sekme çubuğunun üstünde
 *     returnFocus: Element | function,       // bitince odak (yoksa turu başlatırken odaklı öğe)
 *     onDone: function () {},                // "Bitir"
 *     onSkip: function () {},                // "Atla" / Esc
 *     onEnd: function (reason) {}            // her bitişte: 'done' | 'skip' | başka stop(reason)
 *   });
 *   tour.start(index?) → true | false (gösterilecek adım yoksa false)
 *   tour.stop(reason?) · tour.next() · tour.prev() · tour.refresh() (metni yeniden çiz, ör. dil değişince)
 *   tour.active (bool) · tour.index · tour.count · tour.mobile · tour.targets() (geçerli adımın hedef öğeleri)
 *   beTour.current → açık tur ya da null (aynı anda tek tur)
 *   Tur açıkken <html> .be-touring sınıfını taşır.
 *
 * Davranış
 *   - Hedefin çevresinde halka + hafif karartma (pointer-events:none → hedef ve sayfa tıklanabilir kalır).
 *   - Masaüstü: kart hedefin yanında (tercih → alt → üst → sağ → sol), hedefi örtmez; sayfa gerekirse kaydırılır.
 *   - Mobil iz: kart altta (sekme çubuğunun üstünde) sabit; hedef kalan boşluğa kaydırılır; sabit/alttaki
 *     hedeflerde (ör. WhatsApp düğmesi) kart üste geçer. Yatay kayan kaplardaki hedef görünür alana alınır.
 *   - Kaydırma/boyut değişince yeniden konumlanır; hedef kaybolursa (yeniden çizim) seçici yeniden çözülür,
 *     yine yoksa adım atlanır. Gizli/eksik hedefli adımlar baştan sayılmaz.
 *   - Esc kapatır (üstte aria-modal bir pencere ya da açık çekmece varken değil), ← / → kart içindeyken
 *     geri/ileri. Kart role=dialog (modal değil), adım değişimi aria-live ile duyurulur, bitince odak geri döner.
 *   - prefers-reduced-motion: kaydırma anında, geçişler ui.css'teki tek kuralla kapalı.
 */
(function () {
  'use strict';
  if (window.beTour) return;

  // VARSAYIM: i18n.js yüklü değilse (ya da anahtar yoksa) bu tablo kullanılır — i18n.js'teki tour_* ile aynı tutulur.
  var FB = {
    tr: {
      tour_next: `İleri`,
      tour_prev: `Geri`,
      tour_skip: `Atla`,
      tour_done: `Bitir`,
      tour_step: `{i} / {n}`,
      tour_sr_step: `Adım {i} / {n}`,
      tour_skip_aria: `Turu atla ve kapat`
    },
    en: {
      tour_next: `Next`,
      tour_prev: `Back`,
      tour_skip: `Skip`,
      tour_done: `Finish`,
      tour_step: `{i} / {n}`,
      tour_sr_step: `Step {i} of {n}`,
      tour_skip_aria: `Skip and close the tour`
    }
  };
  function lang() {
    try {
      var i = window._i18n;
      if (i && typeof i.getLang === 'function') return i.getLang() === 'en' ? 'en' : 'tr';
      return localStorage.getItem('_lang') === 'en' ? 'en' : 'tr';
    } catch (e) { return 'tr'; }
  }
  function L(key) {
    var i = window._i18n;
    if (i && typeof i.t === 'function') { var v = i.t(key); if (v && v !== key) return v; }
    return FB[lang()][key] || FB.tr[key] || key;
  }
  function val(v) { return typeof v === 'function' ? v() : v; }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function cssPx(name) {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return isFinite(v) ? v : 0;
  }
  function svgUse(id) {
    return '<svg class="icon" aria-hidden="true"><use href="/assets/img/icons.svg#' + id + '"/></svg>';
  }

  // ── hedef çözümü ──────────────────────────────────────────────────────
  function isShown(el) {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    var b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) return false;
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) return false;
    // Kapalı <details> içeriği (özet hariç) çizilmez ama bazı tarayıcılarda kutusu vardır
    for (var d = el.parentElement; d; d = d.parentElement) {
      if (d.tagName === 'DETAILS' && !d.open) {
        var sum = d.querySelector(':scope > summary');
        if (!sum || !sum.contains(el)) return false;
      }
    }
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.opacity !== '0';
  }
  function resolve(step) {
    var t;
    try { t = val(step.target); } catch (e) { t = null; }
    if (!t) return null;
    var list;
    if (typeof t === 'string') {
      var all = document.querySelectorAll(t);
      list = [];
      for (var k = 0; k < all.length; k++) if (isShown(all[k])) { list.push(all[k]); break; }
    } else if (t.nodeType === 1) list = [t];
    else list = Array.prototype.slice.call(t);
    var out = [];
    for (var j = 0; j < list.length; j++) if (list[j] && list[j].nodeType === 1 && isShown(list[j])) out.push(list[j]);
    return out.length ? out : null;
  }
  function unionRect(els) {
    var r = null;
    for (var i = 0; i < els.length; i++) {
      var b = els[i].getBoundingClientRect();
      if (b.width < 1 || b.height < 1) continue;
      if (!r) r = { top: b.top, left: b.left, right: b.right, bottom: b.bottom };
      else { r.top = Math.min(r.top, b.top); r.left = Math.min(r.left, b.left); r.right = Math.max(r.right, b.right); r.bottom = Math.max(r.bottom, b.bottom); }
    }
    if (r) { r.width = r.right - r.left; r.height = r.bottom - r.top; }
    return r;
  }
  // Hedef sabit ya da yapışkan bir kabın içindeyse sayfa kaydırması onu taşımaz
  function isPinned(el) {
    for (var n = el; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) {
      var p = getComputedStyle(n).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return false;
  }
  // Yatay/dikey kayan iç kaplarda hedefi görünür alana al (sayfa kaydırması ayrı yapılır)
  function revealInScrollers(el, smooth) {
    for (var sc = el.parentElement; sc && sc !== document.body && sc !== document.documentElement; sc = sc.parentElement) {
      var cs = getComputedStyle(sc);
      var sx = /(auto|scroll)/.test(cs.overflowX) && sc.scrollWidth > sc.clientWidth + 1;
      var sy = /(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 1;
      if (!sx && !sy) continue;
      var e = el.getBoundingClientRect(), s = sc.getBoundingClientRect();
      var dx = 0, dy = 0;
      if (sx) {
        if (e.width > s.width - 16 || e.left < s.left + 8) dx = e.left - s.left - 8;
        else if (e.right > s.right - 8) dx = e.right - s.right + 8;
      }
      if (sy) {
        if (e.height > s.height - 16 || e.top < s.top + 8) dy = e.top - s.top - 8;
        else if (e.bottom > s.bottom - 8) dy = e.bottom - s.bottom + 8;
      }
      if (dx || dy) {
        try { sc.scrollBy({ left: dx, top: dy, behavior: smooth ? 'smooth' : 'auto' }); }
        catch (x) { sc.scrollLeft += dx; sc.scrollTop += dy; }
      }
    }
  }
  // pad: hedefin çevresinde bırakılacak boşluk (halka + nefes payı)
  function overlap(a, b, pad) {
    var p = pad || 0;
    return !(a.right + p <= b.left || a.left - p >= b.right || a.bottom + p <= b.top || a.top - p >= b.bottom);
  }
  var PAD = 10;

  var current = null;
  var uid = 0;

  function create(opts) {
    var o = opts || {};
    var steps = (o.steps || []).slice();
    var mq = null;
    try { mq = window.matchMedia(o.mobileQuery || '(max-width:1024px)'); } catch (e) { mq = null; }
    var id = 'beTour' + (++uid);
    var api = { active: false, index: -1, count: 0, mobile: false };
    var plan = [];              // gösterilecek adımlar (iz + when + hedef var)
    var els = null;             // geçerli adımın hedefleri
    var ring = null, card = null, ui = {};
    var raf = 0, timer = 0, lockUntil = 0, dock = 'bottom', place = null, lastSig = '', userMoved = false, tries = 0;
    var opener = null;

    function isMobile() { return !!(mq && mq.matches); }
    function eligible(s) {
      if (s.mobileOnly && !api.mobile) return false;
      if (s.desktopOnly && api.mobile) return false;
      if (typeof s.when === 'function') { try { if (!s.when()) return false; } catch (e) { return false; } }
      return true;
    }
    function buildPlan() {
      api.mobile = isMobile();
      plan = steps.filter(function (s) { return eligible(s) && resolve(s); });
      api.count = plan.length;
    }

    // ── DOM ─────────────────────────────────────────────────────────────
    function build() {
      ring = document.createElement('div');
      ring.className = 'be-tour-ring';
      ring.setAttribute('aria-hidden', 'true');
      card = document.createElement('div');
      card.className = 'be-tour-card';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'false');
      card.setAttribute('aria-labelledby', id + 'T');
      card.setAttribute('aria-describedby', id + 'B');
      card.tabIndex = -1;
      card.innerHTML =
        '<div class="be-tour-top"><span class="be-tour-count" id="' + id + 'C"></span>' +
        '<span class="be-tour-bar" aria-hidden="true"><i></i></span></div>' +
        '<h2 class="be-tour-title" id="' + id + 'T"></h2>' +
        '<div class="be-tour-body" id="' + id + 'B"></div>' +
        '<div class="be-tour-actions">' +
          '<button type="button" class="btn be-tour-skip"></button>' +
          '<span class="be-tour-nav">' +
            '<button type="button" class="btn btn-ghost be-tour-prev">' + svgUse('i-arrow-left') + '<span></span></button>' +
            '<button type="button" class="btn btn-primary be-tour-next"><span></span>' + svgUse('i-arrow-right') + '</button>' +
          '</span>' +
        '</div>' +
        '<div class="sr-only" aria-live="polite" aria-atomic="true"></div>';
      ui.count = card.querySelector('.be-tour-count');
      ui.bar = card.querySelector('.be-tour-bar > i');
      ui.title = card.querySelector('.be-tour-title');
      ui.body = card.querySelector('.be-tour-body');
      ui.skip = card.querySelector('.be-tour-skip');
      ui.prev = card.querySelector('.be-tour-prev');
      ui.next = card.querySelector('.be-tour-next');
      ui.live = card.querySelector('[aria-live]');
      ui.skip.addEventListener('click', function () { stop('skip'); });
      ui.prev.addEventListener('click', function () { api.prev(); });
      ui.next.addEventListener('click', function () { api.next(); });
      document.body.appendChild(ring);
      document.body.appendChild(card);
    }

    function blocked() {
      if (document.documentElement.classList.contains('be-drawer-open')) return true;
      var m = document.querySelectorAll('[aria-modal="true"]');
      for (var i = 0; i < m.length; i++) if (m[i].getClientRects().length) return true;
      return false;
    }
    function onKey(e) {
      if (!api.active || e.defaultPrevented || blocked()) return;
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); stop('skip'); return; }
      if (!card.contains(document.activeElement)) return;
      var tg = document.activeElement && document.activeElement.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); api.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (api.index > 0) api.prev(); }
    }
    function onScroll() { schedule(); }
    // İz değişti (ör. tablet döndü): sayfa yeni yerleşimini kurana kadar bekle, sonra aynı adımdan devam et
    function onMq() { setTimeout(rebuild, 350); }
    function rebuild() {
      if (!api.active) return;
      var keep = plan[api.index] && plan[api.index].id;
      buildPlan();
      if (!plan.length) { stop('empty'); return; }
      var at = 0;
      for (var i = 0; i < plan.length; i++) if (plan[i].id === keep) { at = i; break; }
      show(at, 1);
    }
    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; position(); });
    }
    function tick() {
      if (!api.active) return;
      var s = plan[api.index];
      if (!s) return;
      var alive = els && els.every(function (x) { return isShown(x); });
      if (!alive) {
        els = resolve(s);
        if (!els) { drop(api.index, 1); return; }
      }
      var r = unionRect(els);
      var sig = r ? [r.top, r.left, r.width, r.height].map(Math.round).join(',') + '|' + card.offsetHeight : '';
      if (Date.now() < lockUntil) { if (sig !== lastSig) position(); return; }
      // Kaydırma bitti: içerik geç yüklenip hedefi kaydırdıysa (kullanıcı sayfayı kendisi kaydırmadıysa)
      // ve hedef artık karta denk geliyor ya da görünür alandan taşıyorsa yeniden göster (adım başına en çok 3 kez)
      if (!userMoved && tries < 3 && r && misplaced(r)) { tries++; reveal(s); return; }
      position();
    }
    function onUserScroll(e) {
      if (e.type === 'keydown') {
        if (card && card.contains(document.activeElement)) return;
        if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '].indexOf(e.key) < 0) return;
      }
      userMoved = true;
    }
    function misplaced(r) {
      var g = geom(), c = card.getBoundingClientRect();
      var top = els.every(isPinned) ? 0 : g.top;
      var vis = { top: Math.max(r.top, top), bottom: Math.min(r.bottom, g.vh), left: r.left, right: r.right };
      if (r.height <= g.vh - top - c.height - 2 * g.m && (r.top < top || r.bottom > g.vh)) return true;
      return vis.bottom > vis.top && overlap(vis, c, 2);
    }

    // ── adım gösterimi ──────────────────────────────────────────────────
    function drop(i, dir) {
      plan.splice(i, 1);
      api.count = plan.length;
      if (!plan.length) { stop('empty'); return; }
      if (dir < 0) show(Math.max(0, i - 1), -1);
      else if (i >= plan.length) stop('done');
      else show(i, 1);
    }
    function render() {
      var s = plan[api.index];
      if (!s) return;
      var n = plan.length, i = api.index + 1, last = api.index === n - 1;
      ui.count.textContent = L('tour_step').replace('{i}', i).replace('{n}', n);
      ui.bar.style.setProperty('--p', String(i / n));
      var title = String(val(s.title) || '');
      var body = String(val(s.body) || '');
      ui.title.textContent = title;
      if (s.html) ui.body.innerHTML = body; else ui.body.textContent = body;
      ui.skip.textContent = L('tour_skip');
      ui.skip.setAttribute('aria-label', L('tour_skip_aria'));
      ui.skip.hidden = last;
      ui.prev.querySelector('span').textContent = L('tour_prev');
      ui.prev.disabled = api.index === 0;
      ui.next.querySelector('span').textContent = last ? L('tour_done') : L('tour_next');
      ui.next.classList.toggle('is-last', last);
      card.setAttribute('data-step', s.id || String(api.index));
      if ((document.activeElement === ui.prev && ui.prev.disabled) || (document.activeElement === ui.skip && last)) ui.next.focus({ preventScroll: true });
      var plain = ui.body.textContent;
      ui.live.textContent = '';
      setTimeout(function () {
        if (ui.live) ui.live.textContent = L('tour_sr_step').replace('{i}', i).replace('{n}', n) + '. ' + title + '. ' + plain;
      }, 60);
    }
    function show(i, dir) {
      if (!api.active) return;
      if (i < 0) i = 0;
      if (i >= plan.length) { stop('done'); return; }
      var s = plan[i];
      if (!eligible(s)) { plan.splice(i, 1); api.count = plan.length; if (!plan.length) { stop('empty'); return; } show(dir < 0 ? i - 1 : i, dir); return; }
      var found = resolve(s);
      if (!found) { drop(i, dir); return; }
      api.index = i;
      els = found;
      userMoved = false; tries = 0;
      if (typeof s.onEnter === 'function') { try { s.onEnter(els, s); } catch (e) { /* sayfa kancası düşse de tur sürer */ } }
      els = resolve(s) || els;
      render();
      card.classList.remove('is-in');
      void card.offsetWidth;
      card.classList.add('is-in');
      reveal(s);
    }

    // ── kaydırma + konum ────────────────────────────────────────────────
    function geom() {
      var vw = document.documentElement.clientWidth, vh = window.innerHeight;
      return { vw: vw, vh: vh, top: cssPx('--be-sticky-top'), m: api.mobile ? 8 : 16, gap: 14 };
    }
    function scrollByY(dy) {
      if (Math.abs(dy) < 4) return;
      var maxY = document.documentElement.scrollHeight - window.innerHeight;
      var y = Math.max(0, Math.min(maxY, window.scrollY + dy));
      if (Math.abs(y - window.scrollY) < 2) return;
      window.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
      lockUntil = Date.now() + (reduced() ? 0 : 700);
    }
    function predicted(dy) {
      var maxY = document.documentElement.scrollHeight - window.innerHeight;
      var y = Math.max(0, Math.min(maxY, window.scrollY + dy));
      return y - window.scrollY;
    }
    // Yapışık kartın gerçek kutusu (alt boşluk CSS'te calc + env() — ölçmek en güvenlisi)
    function dockRect(which) {
      var wasTop = card.classList.contains('is-top');
      card.style.transform = '';
      card.classList.add('is-dock');
      card.classList.toggle('is-top', which === 'top');
      var b = card.getBoundingClientRect();
      card.classList.toggle('is-top', wasTop);
      return { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
    }
    function reveal(s) {
      var smooth = !reduced();
      els.forEach(function (x) { revealInScrollers(x, smooth); });
      var g = geom();
      card.classList.toggle('is-dock', api.mobile);
      var r = unionRect(els);
      if (!r) { position(); return; }
      var pinned = els.every(isPinned);
      if (api.mobile) {
        // Kart altta; hedef üstteki boş alana. Hedef karta denk geliyorsa kart üste geçer.
        var cb = dockRect('bottom'), ct = dockRect('top');
        var dyB = 0, dyT = 0;
        var freeB = { top: g.top + g.m, bottom: cb.top - g.m };
        var freeT = { top: ct.bottom + g.m, bottom: cb.bottom };
        var want = function (free) {
          var fh = free.bottom - free.top;
          var dest = r.height <= fh ? free.top + Math.max(0, (fh - r.height) / 3) : free.top;
          return r.top - dest;
        };
        if (!pinned) { dyB = predicted(want(freeB)); dyT = predicted(want(freeT)); }
        var rb = { top: r.top - dyB, bottom: r.bottom - dyB, left: r.left, right: r.right };
        var rt = { top: r.top - dyT, bottom: r.bottom - dyT, left: r.left, right: r.right };
        if (!overlap(rb, cb, PAD) || overlap(rt, ct, PAD)) { dock = 'bottom'; if (!pinned) scrollByY(dyB); }
        else { dock = 'top'; if (!pinned) scrollByY(dyT); }
        lockUntil = Math.max(lockUntil, Date.now() + 120);
      } else {
        place = choosePlace(s, r, g);
        if (!pinned) {
          var ch = card.offsetHeight, top, bottom;
          if (place === 'bottom') { top = r.top; bottom = r.bottom + g.gap + ch; }
          else if (place === 'top') { top = r.top - g.gap - ch; bottom = r.bottom; }
          else { top = r.top; bottom = r.bottom; }
          var avail = g.vh - g.top - 2 * g.m;
          if (top < g.top + g.m || bottom > g.vh - g.m) {
            var span = bottom - top;
            var dest = span <= avail ? g.top + g.m + (avail - span) / 2 : g.top + g.m;
            scrollByY(top - dest);
          }
        }
      }
      position();
    }
    function choosePlace(s, r, g) {
      var cw = card.offsetWidth, ch = card.offsetHeight;
      var avail = g.vh - g.top - 2 * g.m;
      var order = [];
      if (s.placement && s.placement !== 'auto') order.push(s.placement);
      ['bottom', 'top', 'right', 'left'].forEach(function (p) { if (order.indexOf(p) < 0) order.push(p); });
      for (var i = 0; i < order.length; i++) {
        var p = order[i];
        if ((p === 'bottom' || p === 'top') && r.height + g.gap + ch <= avail && cw <= g.vw - 2 * g.m) return p;
        if (p === 'right' && g.vw - r.right - g.gap - g.m >= cw && ch <= avail) return p;
        if (p === 'left' && r.left - g.gap - g.m >= cw && ch <= avail) return p;
      }
      return 'corner';
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function position() {
      if (!api.active || !els) return;
      var g = geom();
      var r = unionRect(els);
      if (!r) return;
      var pinned = els.every(isPinned);
      // halka: hedef + 6px, görünür alana kırpılmış (yapışkan başlığın altında kalan kısım çizilmez)
      var pad = 6, topClip = pinned ? 2 : g.top + 2;
      var rt = Math.max(r.top - pad, topClip), rb = Math.min(r.bottom + pad, g.vh - 2);
      var rl = Math.max(r.left - pad, 2), rr = Math.min(r.right + pad, g.vw - 2);
      var off = rb - rt < 8 || rr - rl < 8;
      ring.classList.toggle('is-off', off);
      if (!off) {
        ring.style.width = (rr - rl) + 'px';
        ring.style.height = (rb - rt) + 'px';
        ring.style.transform = 'translate(' + Math.round(rl) + 'px,' + Math.round(rt) + 'px)';
        var rad = parseFloat(getComputedStyle(els[0]).borderTopLeftRadius) || 0;
        ring.style.borderRadius = Math.round(Math.min(32, Math.max(10, rad + pad))) + 'px';
      }
      var cw = card.offsetWidth, ch = card.offsetHeight;
      if (api.mobile) {
        if (Date.now() >= lockUntil) {
          var cb = dockRect('bottom'), ct = dockRect('top');
          var rv = { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
          if (dock === 'bottom' && overlap(rv, cb, PAD) && !overlap(rv, ct, PAD)) dock = 'top';
          else if (dock === 'top' && overlap(rv, ct, PAD) && !overlap(rv, cb, PAD)) dock = 'bottom';
        }
        card.classList.add('is-dock');
        card.classList.toggle('is-top', dock === 'top');
        card.style.transform = '';
      } else {
        card.classList.remove('is-dock', 'is-top');
        var p = place || 'bottom', x, y;
        var visTop = Math.max(r.top, g.top + g.m), visBot = Math.min(r.bottom, g.vh - g.m);
        if (p === 'bottom' || p === 'top') {
          x = clamp(r.left + r.width / 2 - cw / 2, g.m, g.vw - cw - g.m);
          var below = r.bottom + g.gap, above = r.top - g.gap - ch;
          if (p === 'bottom') y = (below + ch > g.vh - g.m && above >= g.top + g.m) ? above : below;
          else y = (above < g.top + g.m && below + ch <= g.vh - g.m) ? below : above;
          y = clamp(y, g.top + g.m, g.vh - ch - g.m);
        } else if (p === 'right' || p === 'left') {
          x = p === 'right' ? r.right + g.gap : r.left - g.gap - cw;
          y = clamp((visTop + visBot) / 2 - ch / 2, g.top + g.m, g.vh - ch - g.m);
        } else {
          x = g.vw - cw - g.m; y = g.vh - ch - g.m;
        }
        card.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
      }
      lastSig = [r.top, r.left, r.width, r.height].map(Math.round).join(',') + '|' + ch;
    }

    // ── yaşam döngüsü ───────────────────────────────────────────────────
    function start(at) {
      if (current && current !== api && current.active) current.stop('replaced');
      if (api.active) stop('restart');
      buildPlan();
      if (!plan.length) return false;
      opener = document.activeElement;
      api.active = true;
      current = api;
      build();
      document.addEventListener('keydown', onKey);
      window.addEventListener('scroll', onScroll, { passive: true, capture: true });
      window.addEventListener('resize', onScroll, { passive: true });
      window.addEventListener('wheel', onUserScroll, { passive: true });
      window.addEventListener('touchmove', onUserScroll, { passive: true });
      document.addEventListener('keydown', onUserScroll);
      if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }
      timer = setInterval(tick, 400);
      document.documentElement.classList.add('be-touring');
      show(Math.max(0, Math.min(plan.length - 1, at | 0)), 1);
      setTimeout(function () { if (api.active && card) card.focus({ preventScroll: true }); }, 30);
      return true;
    }
    function stop(reason) {
      if (!api.active) return;
      api.active = false;
      if (current === api) current = null;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('wheel', onUserScroll);
      window.removeEventListener('touchmove', onUserScroll);
      document.removeEventListener('keydown', onUserScroll);
      if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq); }
      clearInterval(timer); timer = 0;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      var hadFocus = card && card.contains(document.activeElement);
      if (ring) ring.remove();
      if (card) card.remove();
      ring = card = null; ui = {}; els = null;
      document.documentElement.classList.remove('be-touring');
      if (hadFocus || document.activeElement === document.body) {
        var back = val(o.returnFocus);
        var f = (back && back.isConnected && isShown(back)) ? back : (opener && opener.isConnected && opener !== document.body ? opener : null);
        if (f && typeof f.focus === 'function') { try { f.focus({ preventScroll: true }); } catch (e) {} }
      }
      var r = reason || 'stop';
      try {
        if (r === 'done' && typeof o.onDone === 'function') o.onDone();
        if (r === 'skip' && typeof o.onSkip === 'function') o.onSkip();
      } finally {
        if (typeof o.onEnd === 'function') o.onEnd(r);
      }
    }

    api.start = start;
    api.stop = stop;
    api.next = function () {
      if (!api.active) return;
      if (api.index >= plan.length - 1) stop('done'); else show(api.index + 1, 1);
    };
    api.prev = function () { if (api.active && api.index > 0) show(api.index - 1, -1); };
    api.refresh = function () { if (api.active) { render(); position(); } };
    api.targets = function () { return els ? els.slice() : null; };
    return api;
  }

  window.beTour = {
    create: create,
    get current() { return current; }
  };
})();
