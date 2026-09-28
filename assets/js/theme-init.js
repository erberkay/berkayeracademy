// theme-init.js — ortak kabuk (yeni tasarım, yalnız koyu tema).
// Her sayfanın <head>'inde yüklenir. Sayfada yalnız iki yer tutucu durur:
//   <header class="be-header" id="beHeader" data-be-page="forum"><div id="authBar"></div></header>
//   <footer class="be-footer" id="beFooter" data-be-footer="compact"></footer>
// Bu betik masaüstü başlığı, mobil üst çubuğu, tam ekran çekmeceyi, alt sekme
// çubuğunu ve footer'ı üretir. #authBar'ı sayfanın kendi JS'i doldurur
// (updateAuthBar); burada yalnız başlıktaki yerine konur ve görünümü tamamlanır.
// Ayrıntı: scratchpad/tasarim/TASARIM.md §6–7, CLAUDE.md "Shared assets".
(function () {
  var html = document.documentElement;
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* noop */ } }

  // ── Boyamadan önce: tema yok (yalnız koyu). Eski 'site-theme' yok sayılır.
  html.classList.remove('theme-light');
  html.classList.add('be-js');
  if (lsGet('site-font-clear') === '1') html.classList.add('font-clear');

  // ── Oturum ipucu (oturum çözülene dek; kişisel veri yok — yalnız '1'/'0' ve piksel genişliği):
  // son ziyarette girişliyse "Ücretsiz deneme" CTA'sı baştan gizli (be-auth-guess), deneme adayıysa
  // etiketler baştan "Deneme" (be-trial; trial-nav gerçek durumu yazar). syncAuthUi ipucunu günceller.
  var AUTH_HINT = lsGet('be-auth');
  if (AUTH_HINT === '1') {
    html.classList.add('be-auth-guess');
    if (lsGet('be-trial-last') === '1') html.classList.add('be-trial');
  }

  // ── Kabuk metinleri: i18n.js'te anahtar varsa o, yoksa buradaki yedek [tr, en].
  var T = {
    nav_home: [`Ana Sayfa`, 'Home'],
    nav_egitim: [`Eğitim`, 'Education'],
    nav_egitmen: [`Eğitmen`, 'Instructor'],
    nav_forum: ['Forum', 'Forum'],
    nav_members: [`Üyeler`, 'Members'],
    nav_lab: ['Lab', 'Lab'],
    nav_sss: ['SSS', 'FAQ'],
    nav_lessons: ['Ders Paneli', 'Lessons'],
    nav_trial_lesson: ['Deneme Dersi', 'Trial Lesson'],
    nav_profile: ['Profil', 'Profile'],
    ui_signout: [`Çıkış Yap`, 'Sign Out'],
    ui_notifications: ['Bildirimler', 'Notifications'],
    prof_notif_del: ['Bildirimi sil', 'Delete notification'],
    be_brand: ['BERKAY ER ACADEMY', 'BERKAY ER ACADEMY'],
    be_home_aria: [`Berkay Er Academy — ana sayfa`, 'Berkay Er Academy — home'],
    be_nav_main: [`Ana menü`, 'Main menu'],
    be_nav_tabs: [`Alt menü`, 'Bottom menu'],
    be_menu: [`Menü`, 'Menu'],
    be_menu_open: [`Menüyü aç`, 'Open menu'],
    be_menu_close: [`Menüyü kapat`, 'Close menu'],
    be_lang: ['Dil', 'Language'],
    be_cta_trial: [`Ücretsiz deneme`, 'Free trial'],
    be_tab_lessons: ['Dersler', 'Lessons'],
    be_tab_trial: ['Deneme', 'Trial'],
    be_skip: [`İçeriğe geç`, 'Skip to content'],
    be_lab_title: ['Ableton Lab', 'Ableton Lab'],
    be_open_profile: [`Profilini aç`, 'Open your profile'],
    be_ft_desc: [`Ableton Live ile elektronik müzik prodüksiyonu, DJ, Hybrid ve Live Set eğitimi.`, 'Electronic music production, DJ, Hybrid and Live Set training with Ableton Live.'],
    be_ft_academy: [`Akademi`, 'Academy'],
    be_ft_community: ['Topluluk', 'Community'],
    be_ft_follow: ['Takip et', 'Follow'],
    be_ft_copy: ['© Berkay Er Academy', '© Berkay Er Academy'],
    be_ft_copy_full: ['© Berkay Er Academy · berkayeracademy.com', '© Berkay Er Academy · berkayeracademy.com'],
    // büyük harfle yazılı: CSS uppercase tr dilinde 'Live' → 'LİVE' yapardı
    be_ft_trademark: [`ABLETON, LIVE VE PUSH, ABLETON AG'NİN TİCARİ MARKALARIDIR`, 'ABLETON, LIVE AND PUSH ARE TRADEMARKS OF ABLETON AG'],
    be_ft_social: ['Sosyal medya', 'Social media'],
    be_wa_fab: [`WhatsApp ile iletişime geç`, 'Contact us on WhatsApp']
  };
  function lang() {
    var i = window._i18n;
    if (i && typeof i.getLang === 'function') return i.getLang();
    return lsGet('_lang') === 'en' ? 'en' : 'tr';
  }
  function t(key) {
    var i = window._i18n;
    if (i && typeof i.t === 'function') { var v = i.t(key); if (v && v !== key) return v; }
    var e = T[key];
    return e ? (lang() === 'en' ? e[1] : e[0]) : key;
  }

  // ── Gezinme tanımı (tek kaynak)
  var NAV = [
    { id: 'index', href: '/', key: 'nav_home' },
    { id: 'egitim', href: '/egitim', key: 'nav_egitim' },
    { id: 'egitmen', href: '/egitmen', key: 'nav_egitmen' },
    { id: 'forum', href: '/forum', key: 'nav_forum' },
    { id: 'members', href: '/members', key: 'nav_members' },
    { id: 'ableton-lab', href: '/ableton-lab', key: 'nav_lab' },
    { id: 'sss', href: '/sss', key: 'nav_sss' },
    { id: 'booking', href: '/booking', key: 'nav_lessons', trial: 'nav_trial_lesson' }
  ];
  var ICON = {
    edu: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    bars: '<path d="M6 20V10M12 20V4M18 20v-7"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 8h16M4 16h16"/>'
  };
  function svg(name, cls, w) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.6) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICON[name] + '</svg>';
  }
  var TABS = [
    { id: 'egitim', href: '/egitim', key: 'nav_egitim', icon: 'edu' },
    { id: 'forum', href: '/forum', key: 'nav_forum', icon: 'chat' },
    { id: 'ableton-lab', href: '/ableton-lab', key: 'nav_lab', icon: 'bars' },
    { id: 'booking', href: '/booking', key: 'be_tab_lessons', trial: 'be_tab_trial', icon: 'cal' },
    { id: 'profile', href: '/profile', key: 'nav_profile', icon: 'user', profile: true }
  ];
  // sayfa → vurgulanan gezinme / sekme öğesi
  var NAV_OF = { post: 'forum', 'new-post': 'forum', 'ders-ableton': 'egitim', 'ders-push3': 'egitim', site_1: 'ableton-lab' };
  var TAB_OF = { members: 'forum', post: 'forum', 'new-post': 'forum', 'ders-ableton': 'egitim', 'ders-push3': 'egitim', site_1: 'ableton-lab' };

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  // metin anahtarlı öğe (dil değişince refresh() yeniden yazar)
  function tx(tag, key, attrs) {
    var e = el(tag, attrs);
    e.setAttribute('data-be-t', key);
    e.setAttribute('data-i18n', key);
    e.textContent = t(key);
    return e;
  }
  function trialize(e, key, trialKey) {
    if (!trialKey) return e;
    e.setAttribute('data-be-booking', '');
    e.setAttribute('data-be-trial-key', trialKey);
    return e;
  }

  var state = { page: '', header: null, drawer: null, menuBtn: null, tabbar: null, built: false, lastFocus: null, authW: null };

  // ── Başlık ───────────────────────────────────────────────────────────
  function langGroup(extraCls) {
    var g = el('div', { 'class': 'be-lang' + (extraCls ? ' ' + extraCls : ''), role: 'group', 'data-be-aria': 'be_lang', 'aria-label': t('be_lang') });
    ['tr', 'en'].forEach(function (l) {
      var b = el('button', { type: 'button', 'class': 'lang-btn', 'data-lang': l, 'aria-pressed': lang() === l ? 'true' : 'false' }, l.toUpperCase());
      if (lang() === l) b.classList.add('lang-active');
      b.addEventListener('click', function () {
        if (window._i18n && window._i18n.setLang) window._i18n.setLang(l);
        else { try { localStorage.setItem('_lang', l); } catch (e) {} refresh(); }
      });
      g.appendChild(b);
    });
    return g;
  }

  function buildHeader(h) {
    if (h.hasAttribute('data-be-built')) return;
    var page = h.getAttribute('data-be-page') || '';
    state.page = page; state.header = h;
    var navId = NAV_OF[page] || page;
    var auth = h.querySelector('#authBar') || document.getElementById('authBar') || el('div', { id: 'authBar' });
    var slots = [].slice.call(h.querySelectorAll('[data-be-slot]'));

    // marka (+ mobil sayfa etiketi)
    var brand = el('a', { 'class': 'be-brand', href: '/', 'data-be-aria': 'be_home_aria', 'aria-label': t('be_home_aria') });
    var mark = el('span', { 'class': 'be-mark', 'aria-hidden': 'true' });
    mark.appendChild(el('span', { 'class': 'be-mark-strip be-ember' }));
    mark.appendChild(el('span', { 'class': 'be-mark-txt' }, 'BE'));
    brand.appendChild(mark);
    brand.appendChild(el('span', { 'class': 'be-brand-text', 'aria-hidden': 'true' }, 'BERKAY ER ACADEMY'));
    var labelKey = h.getAttribute('data-be-label');
    if (!labelKey) {
      if (page === 'index' || !page) labelKey = 'be_brand';
      else if (page === 'ableton-lab' || page === 'site_1') labelKey = 'be_lab_title';
      else { NAV.forEach(function (n) { if (n.id === navId) labelKey = n.key; }); if (page === 'profile') labelKey = 'nav_profile'; }
    }
    var label = tx('span', labelKey || 'be_brand', { 'class': 'be-brand-label', 'aria-hidden': 'true', id: 'beLabel' });
    if (NAV.some(function (n) { return n.id === navId && n.trial; }) && labelKey === 'nav_lessons') trialize(label, 'nav_lessons', 'nav_trial_lesson');
    brand.appendChild(label);

    // mobil geri bağlantısı
    var back = null;
    if (h.hasAttribute('data-be-back')) {
      back = el('a', { 'class': 'be-back', href: h.getAttribute('data-be-back') || '/' });
      back.appendChild(el('span', { 'aria-hidden': 'true' }, '←'));
      back.appendChild(tx('span', h.getAttribute('data-be-back-label') || 'nav_home'));
    }

    // masaüstü gezinme
    var nav = el('nav', { 'class': 'be-nav', 'data-be-aria': 'be_nav_main', 'aria-label': t('be_nav_main') });
    NAV.forEach(function (n) {
      var a = tx('a', n.key, { href: n.href, 'data-be-nav': n.id });
      trialize(a, n.key, n.trial);
      if (n.id === navId) a.setAttribute('aria-current', n.id === page ? 'page' : 'true');
      nav.appendChild(a);
    });

    // eylemler
    var actions = el('div', { 'class': 'be-actions' });
    actions.appendChild(langGroup());
    slots.forEach(function (s) { s.classList.add('be-slot'); actions.appendChild(s); });
    actions.appendChild(auth);
    if (h.getAttribute('data-be-cta') !== 'off') {
      var cta = tx('a', 'be_cta_trial', { href: '/booking', 'class': 'btn btn-primary be-cta' });
      actions.appendChild(cta);
    }
    var menu = el('button', { type: 'button', 'class': 'be-menu-btn', 'aria-expanded': 'false', 'aria-controls': 'beDrawer', 'data-be-aria': 'be_menu_open', 'aria-label': t('be_menu_open') });
    menu.innerHTML = svg('menu', 'be-ico-open', 1.8) + svg('x', 'be-ico-close', 1.8);
    menu.addEventListener('click', function () { setDrawer(!html.classList.contains('be-drawer-open')); });
    actions.appendChild(menu);
    state.menuBtn = menu;

    // oturum çözülürken #authBar'a bu sayfada son ölçülen genişliği ayır (masaüstü gezinmesi kaymasın)
    if (AUTH_HINT !== null) {
      state.authW = lsGet('be-auth-w:' + page);
      if (state.authW && /^\d{1,4}$/.test(state.authW) && !auth.firstChild) {
        h.style.setProperty('--be-auth-w', state.authW + 'px');
        h.classList.add('be-auth-pending');
      }
    }

    h.textContent = '';
    h.appendChild(brand);
    if (back) h.appendChild(back);
    h.appendChild(nav);
    h.appendChild(actions);
    h.setAttribute('data-be-built', '');

    if (h.getAttribute('data-be-tabs') !== 'off') html.classList.add('be-has-tabs');

    // içeriğe geç
    if (!document.querySelector('.be-skip')) {
      var skip = tx('a', 'be_skip', { 'class': 'be-skip', href: '#beMain' });
      h.parentNode.insertBefore(skip, h);
    }
    watchAuth(auth);
  }

  // ── Çekmece (mobil) ──────────────────────────────────────────────────
  function buildDrawer() {
    if (state.drawer || !state.header) return state.drawer;
    var navId = NAV_OF[state.page] || state.page;
    var d = el('nav', { 'class': 'be-drawer', id: 'beDrawer', 'data-be-aria': 'be_menu', 'aria-label': t('be_menu'), hidden: true });
    var links = el('div', { 'class': 'be-drawer-links' });
    NAV.forEach(function (n) {
      var a = tx('a', n.key, { 'class': 'be-drawer-link', href: n.href, 'data-be-nav': n.id });
      trialize(a, n.key, n.trial);
      if (n.id === navId) a.setAttribute('aria-current', n.id === state.page ? 'page' : 'true');
      links.appendChild(a);
    });
    var foot = el('div', { 'class': 'be-drawer-foot' });
    foot.appendChild(langGroup('be-lang--lg'));
    var prof = el('a', { 'class': 'be-drawer-profile', href: '/profile' });
    prof.appendChild(tx('span', 'nav_profile'));
    prof.appendChild(el('span', { 'aria-hidden': 'true' }, '→'));
    if (state.page === 'profile') prof.setAttribute('aria-current', 'page');
    var acts = el('div', { 'class': 'be-drawer-actions' });
    acts.appendChild(prof);
    // çıkış: sayfanın #authBar'daki kendi çıkış düğmesine yönlendirir (mobilde başlıkta gizli)
    var out = tx('button', 'ui_signout', { type: 'button', 'class': 'be-drawer-signout' });
    out.addEventListener('click', function () {
      var b = document.querySelector('#authBar .auth-out-btn');
      setDrawer(false, true);
      if (b) b.click();
    });
    acts.appendChild(out);
    foot.appendChild(acts);
    d.appendChild(links); d.appendChild(foot);
    d.addEventListener('click', function (e) { if (e.target.closest('a')) setDrawer(false, true); });
    state.header.parentNode.insertBefore(d, state.header.nextSibling);
    state.drawer = d;
    return d;
  }
  function focusables(root) {
    return [].filter.call(root.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'), function (x) { return x.offsetParent !== null; });
  }
  function setDrawer(open, fromLink) {
    var d = buildDrawer();
    if (!d || !state.menuBtn) return;
    if (open === html.classList.contains('be-drawer-open')) return;
    d.hidden = !open;
    html.classList.toggle('be-drawer-open', open);
    state.menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    state.menuBtn.setAttribute('data-be-aria', open ? 'be_menu_close' : 'be_menu_open');
    state.menuBtn.setAttribute('aria-label', t(open ? 'be_menu_close' : 'be_menu_open'));
    if (open) {
      var f = d.querySelector('[aria-current]') || d.querySelector('a');
      if (f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
    } else if (!fromLink) {
      try { state.menuBtn.focus({ preventScroll: true }); } catch (e) {}
    }
  }
  function onKey(e) {
    if (!html.classList.contains('be-drawer-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); setDrawer(false); return; }
    if (e.key !== 'Tab') return;
    // odak tuzağı: menü düğmesi + çekmece
    var f = [state.menuBtn].concat(focusables(state.drawer));
    var first = f[0], last = f[f.length - 1], cur = document.activeElement;
    if (f.indexOf(cur) < 0) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  }

  // ── Alt sekme çubuğu (mobil) ─────────────────────────────────────────
  function buildTabbar() {
    if (state.tabbar || !state.header || state.header.getAttribute('data-be-tabs') === 'off') return;
    var tabId = TAB_OF[state.page] || state.page;
    var bar = el('nav', { 'class': 'be-tabbar', 'data-be-aria': 'be_nav_tabs', 'aria-label': t('be_nav_tabs') });
    TABS.forEach(function (tb) {
      var a = el('a', { 'class': 'be-tabbar-item', href: tb.href, 'data-be-tab': tb.id });
      if (tb.profile) {
        var av = el('span', { 'class': 'be-tabbar-av', id: 'beTabAv' });
        av.innerHTML = svg('user');
        a.appendChild(av);
      } else {
        a.insertAdjacentHTML('beforeend', svg(tb.icon));
      }
      var lb = tx('span', tb.key);
      if (tb.trial) { trialize(a, tb.key, tb.trial); trialize(lb, tb.key, tb.trial); }
      a.appendChild(lb);
      if (tb.id === tabId) a.setAttribute('aria-current', tb.id === state.page ? 'page' : 'true');
      bar.appendChild(a);
    });
    document.body.appendChild(bar);
    state.tabbar = bar;
    syncAuthUi();
  }

  // ── Footer ───────────────────────────────────────────────────────────
  var SOCIAL = [
    { href: 'https://instagram.com/erberkay', text: '@erberkay' },
    { href: 'https://instagram.com/berkael.ofc', text: '@berkael.ofc' },
    { href: 'https://open.spotify.com/artist/1nKRMPT4vVYiFLHoB9483s', text: 'Spotify' }
  ];
  function ext(a) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); return a; }
  function buildFooter() {
    var f = document.getElementById('beFooter');
    if (!f || f.hasAttribute('data-be-built')) return;
    var mode = f.getAttribute('data-be-footer') || 'compact';
    f.textContent = '';
    if (mode === 'full') {
      f.classList.add('be-footer--full');
      var top = el('div', { 'class': 'be-footer-top' });
      var about = el('div', { 'class': 'be-footer-about' });
      about.appendChild(el('span', { 'class': 'be-footer-brand' }, 'BERKAY ER ACADEMY'));
      about.appendChild(tx('p', 'be_ft_desc', { 'class': 'be-footer-desc' }));
      var cols = el('div', { 'class': 'be-footer-cols' });
      function col(key, items) {
        var c = el('div', { 'class': 'be-footer-col' });
        c.appendChild(tx('h2', key));
        items.forEach(function (it) { c.appendChild(it); });
        return c;
      }
      cols.appendChild(col('be_ft_academy', [
        tx('a', 'nav_egitim', { href: '/egitim' }), tx('a', 'nav_egitmen', { href: '/egitmen' }),
        tx('a', 'nav_sss', { href: '/sss' }), trialize(tx('a', 'nav_lessons', { href: '/booking' }), 'nav_lessons', 'nav_trial_lesson')
      ]));
      cols.appendChild(col('be_ft_community', [
        tx('a', 'nav_forum', { href: '/forum' }), tx('a', 'nav_members', { href: '/members' }),
        tx('a', 'be_lab_title', { href: '/ableton-lab' })
      ]));
      cols.appendChild(col('be_ft_follow', SOCIAL.map(function (s) { return ext(el('a', { href: s.href }, s.text)); })));
      top.appendChild(about); top.appendChild(cols);
      var bar = el('div', { 'class': 'be-footer-bar' });
      bar.appendChild(tx('span', 'be_ft_copy_full'));
      var eq = el('div', { 'class': 'be-eq', 'aria-hidden': 'true' });
      for (var i = 0; i < 5; i++) eq.appendChild(el('i'));
      bar.appendChild(eq);
      f.appendChild(top); f.appendChild(bar);
    } else {
      var b = el('div', { 'class': 'be-footer-bar' });
      b.appendChild(tx('span', 'be_ft_copy'));
      var note = f.getAttribute('data-be-note');
      if (note) b.appendChild(tx('span', note, { 'class': 'be-footer-note' }));
      else {
        var s = el('div', { 'class': 'be-footer-social', role: 'group', 'data-be-aria': 'be_ft_social', 'aria-label': t('be_ft_social') });
        // büyük harf JS'te (dil bağımsız): CSS uppercase tr'de 'Spotify' → 'SPOTİFY' yapardı
        SOCIAL.forEach(function (x) { s.appendChild(ext(el('a', { href: x.href }, x.text.toUpperCase()))); });
        b.appendChild(s);
      }
      f.appendChild(b);
    }
    f.setAttribute('data-be-built', '');
  }

  // ── Auth bar: sayfa JS'inin yazdığı markup'ı tamamla ────────────────
  function initialOf(s) { s = (s || '').trim(); return s ? s.charAt(0).toLocaleUpperCase('tr') : '•'; }
  function enhanceAuth(bar) {
    var wrap = bar.querySelector('.auth-user-wrap');
    if (wrap && !wrap.hasAttribute('data-be-done')) {
      wrap.setAttribute('data-be-done', '');
      var img = wrap.querySelector('.auth-avatar');
      var name = wrap.querySelector('.auth-name');
      var src = img && img.getAttribute('src');
      if (img && src && src.trim()) wrap.classList.add('be-has-photo');
      if (img) img.addEventListener('error', function () { wrap.classList.remove('be-has-photo'); });
      var ini = el('span', { 'class': 'be-ava-initial' }, initialOf(name && name.textContent));
      if (img) img.parentNode.insertBefore(ini, img.nextSibling); else wrap.insertBefore(ini, wrap.firstChild);
      // profil: sayfanın kendi tıklama işleyicisi (profile?uid=…) varsa o, yoksa /profile (kendi profili)
      var own = function (x) { return x && typeof x.onclick === 'function' ? x : null; };
      var openProfile = function () { var x = own(img) || own(name); if (x) x.click(); else location.href = '/profile'; };
      ini.addEventListener('click', openProfile);
      if (img && !own(img)) img.addEventListener('click', openProfile);
      if (name && !own(name)) name.addEventListener('click', openProfile);
      // klavye yolu: görünen avatar (fotoğraf ya da baş harf) her genişlikte profil bağlantısı;
      // ad yalnız fareyle (dar başlıkta gizlenir — tek sekme durağı avatarda kalır)
      [img, ini].forEach(function (x) {
        if (!x) return;
        x.setAttribute('tabindex', '0');
        x.setAttribute('role', 'link');
        x.setAttribute('data-be-aria', 'be_open_profile');
        x.setAttribute('aria-label', t('be_open_profile'));
        x.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); openProfile(); } });
      });
      var out = wrap.querySelector('.auth-out-btn');
      if (out) {
        var lbl = out.getAttribute('aria-label') || out.getAttribute('title') || out.textContent.trim();
        if (!lbl || lbl === '✕' || lbl === '×') lbl = t('ui_signout');
        out.setAttribute('aria-label', lbl);
        out.setAttribute('title', lbl);
        out.innerHTML = svg('x', '', 1.8);
        out.setAttribute('type', 'button');
      }
    }
    var bell = bar.querySelector('.notif-bell');
    if (bell && !bell.hasAttribute('data-be-done')) {
      bell.setAttribute('data-be-done', '');
      bell.setAttribute('type', 'button');
      if (!bell.querySelector('svg')) bell.innerHTML = svg('bell', '', 1.6);
      if (!bell.getAttribute('aria-label')) bell.setAttribute('aria-label', bell.getAttribute('title') || t('ui_notifications'));
      bell.setAttribute('aria-haspopup', 'true');
      bell.setAttribute('aria-expanded', 'false');
      var panel = bell.parentNode && bell.parentNode.querySelector('.notif-panel');
      if (panel && window.MutationObserver) {
        new MutationObserver(function () { bell.setAttribute('aria-expanded', panel.classList.contains('open') ? 'true' : 'false'); })
          .observe(panel, { attributes: true, attributeFilter: ['class'] });
      }
    }
    // bildirim silme düğmeleri ('×') — adı olmayanlara erişilebilir ad
    [].forEach.call(bar.querySelectorAll('.notif-del-btn:not([aria-label])'), function (b) {
      b.setAttribute('type', 'button');
      b.setAttribute('data-be-aria', 'prof_notif_del');
      b.setAttribute('aria-label', t('prof_notif_del'));
      if (!b.getAttribute('title')) b.setAttribute('title', t('prof_notif_del'));
    });
    var sign = bar.querySelector('.auth-sign-btn');
    if (sign && !sign.hasAttribute('data-be-done')) {
      sign.setAttribute('data-be-done', '');
      sign.setAttribute('type', 'button');
      if (!sign.getAttribute('title')) sign.setAttribute('title', sign.textContent.trim());
    }
    syncAuthUi();
  }
  function syncAuthUi() {
    var bar = document.getElementById('authBar');
    if (!bar) return;
    var wrap = bar.querySelector('.auth-user-wrap');
    var signedIn = !!wrap, signedOut = !!bar.querySelector('.auth-sign-btn');
    if (signedIn || signedOut) {
      html.classList.toggle('be-authed', signedIn);
      authSettled();
      if (AUTH_HINT !== (signedIn ? '1' : '0')) { AUTH_HINT = signedIn ? '1' : '0'; lsSet('be-auth', AUTH_HINT); }
    }
    fitHeader();
    var av = document.getElementById('beTabAv');
    if (!av) return;
    var img = wrap && wrap.classList.contains('be-has-photo') && wrap.querySelector('.auth-avatar');
    var src = img && img.getAttribute('src');
    var cur = av.querySelector('img');
    if (src) {
      if (!cur || cur.getAttribute('src') !== src) {
        av.textContent = '';
        var i = el('img', { src: src, alt: '' });
        i.addEventListener('error', function () { av.innerHTML = svg('user'); });
        av.appendChild(i);
      }
    } else if (cur || !av.querySelector('svg')) {
      av.innerHTML = svg('user');
    }
  }
  // oturum çözüldü (ya da zaman aşımı): ipucu sınıflarını kaldır
  function authSettled() {
    html.classList.remove('be-auth-guess');
    if (state.header) state.header.classList.remove('be-auth-pending');
  }

  // ── Başlık sığdırma (≥1280): içerik sağ dolguyu aşarsa kademeli sıkıştır ──────────
  // be-fit-1 marka yazısını, be-fit-2 ayrıca adı gizler + aralıkları daraltır (themes.css).
  // ≤1279'daki dar masaüstü kuralları CSS'te; orada sınıf verilmez.
  var mqFit = window.matchMedia ? window.matchMedia('(min-width: 1280px)') : null;
  function fitHeader() {
    var h = state.header;
    if (!h || !h.hasAttribute('data-be-built')) return;
    h.classList.remove('be-fit-1', 'be-fit-2');
    if (mqFit && mqFit.matches && !html.classList.contains('be-hide-header')) {
      var acts = h.querySelector('.be-actions');
      var over = function () {
        var r = h.getBoundingClientRect();
        var pr = parseFloat(window.getComputedStyle(h).paddingRight) || 0;
        return !!acts && acts.getBoundingClientRect().right > r.right - pr + 1;
      };
      if (over()) { h.classList.add('be-fit-1'); if (over()) h.classList.add('be-fit-2'); }
    }
    saveAuthW();
  }
  // bu sayfadaki son #authBar genişliği (bir sonraki yüklemede ayrılır) — yalnız masaüstü
  function saveAuthW() {
    var bar = document.getElementById('authBar');
    if (!state.page || !bar || !bar.firstElementChild || window.innerWidth <= 1024 || !state.header.contains(bar)) return;
    var w = String(Math.round(bar.getBoundingClientRect().width));
    if (w !== '0' && w !== state.authW) { state.authW = w; lsSet('be-auth-w:' + state.page, w); }
  }

  function watchAuth(bar) {
    enhanceAuth(bar);
    if (window.MutationObserver) new MutationObserver(function () { enhanceAuth(bar); }).observe(bar, { childList: true, subtree: true });
  }

  // ── Metin/erişilebilirlik yenileme (dil ve durum değişince) ─────────
  function refresh() {
    var trial = html.classList.contains('be-trial');
    [].forEach.call(document.querySelectorAll('[data-be-t]'), function (e) {
      var key = (trial && e.hasAttribute('data-be-trial-key')) ? e.getAttribute('data-be-trial-key') : e.getAttribute('data-be-t');
      if (e.getAttribute('data-i18n') !== key) e.setAttribute('data-i18n', key);
      var v = t(key);
      if (e.textContent !== v) e.textContent = v;
    });
    [].forEach.call(document.querySelectorAll('[data-be-booking]'), function (e) { e.classList.toggle('be-trial', trial); });
    [].forEach.call(document.querySelectorAll('[data-be-aria]'), function (e) {
      var v = t(e.getAttribute('data-be-aria'));
      if (e.getAttribute('aria-label') !== v) e.setAttribute('aria-label', v);
    });
    var l = lang();
    [].forEach.call(document.querySelectorAll('.be-lang .lang-btn'), function (b) {
      var on = b.getAttribute('data-lang') === l;
      b.classList.toggle('lang-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    fitHeader();
  }

  // ── Ekran dışındaki ağır animasyonları duraklat ──────────────────────
  var io = null;
  function observeAnim(root) {
    if (!('IntersectionObserver' in window)) return;
    if (!io) io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('be-paused', !en.isIntersecting); });
    }, { rootMargin: '80px' });
    [].forEach.call((root || document).querySelectorAll('.be-marq, .be-spin, .be-drift, .be-eq, .be-playhead, .be-bob'), function (x) {
      if (!x.hasAttribute('data-be-io')) { x.setAttribute('data-be-io', ''); io.observe(x); }
    });
  }

  function skipTarget() {
    var h = state.header;
    var m = document.querySelector('main');
    // <main> yoksa başlıktan sonraki ilk İÇERİK öğesi: betik/stil, çekmece, gizli ve
    // akış dışı (fixed/absolute ilerleme çubuğu, dekor) ya da boş öğeler atlanır
    function skip(x) {
      if (x.matches('script, style, link, template, .be-drawer, .be-skip, .be-tabbar, [hidden], [aria-hidden="true"]')) return true;
      var cs = window.getComputedStyle ? getComputedStyle(x) : null;
      return !!cs && (cs.display === 'none' || cs.position === 'fixed' || cs.position === 'absolute' || x.offsetHeight === 0);
    }
    if (!m && h) { m = h.nextElementSibling; while (m && skip(m)) m = m.nextElementSibling; }
    if (!m) return;
    if (!m.id) m.id = 'beMain';
    if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1');
    var s = document.querySelector('.be-skip');
    if (s) s.setAttribute('href', '#' + m.id);
  }

  // ── Kurulum: başlık ayrıştırılır ayrıştırılmaz, gerisi DOM hazır olunca
  function tryHeader() {
    if (state.built) return true;
    var h = document.getElementById('beHeader');
    if (!h) return false;
    if (!h.nextSibling && document.readyState === 'loading') return false; // henüz kapanmadı
    state.built = true;
    try { buildHeader(h); } catch (e) { h.setAttribute('data-be-built', ''); console.warn('[shell]', e); }
    return true;
  }
  var mo = null;
  if (window.MutationObserver) {
    mo = new MutationObserver(function () { if (tryHeader() && mo) { mo.disconnect(); mo = null; } });
    mo.observe(html, { childList: true, subtree: true });
  }
  function init() {
    if (mo) { mo.disconnect(); mo = null; }
    tryHeader();
    try { buildDrawer(); buildTabbar(); buildFooter(); skipTarget(); } catch (e) { console.warn('[shell]', e); }
    refresh();
    observeAnim(document);
    document.addEventListener('keydown', onKey, true);
    var rz = false;
    window.addEventListener('resize', function () {
      if (rz) return; rz = true;
      (window.requestAnimationFrame || setTimeout)(function () { rz = false; fitHeader(); });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeader, function () {});
    // sayfa #authBar'ı hiç doldurmazsa (SDK yüklenemedi vb.) ipucu sonsuza dek CTA'yı gizlemesin
    setTimeout(authSettled, 6000);
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 1025px)');
      var close = function (m) { if (m.matches) setDrawer(false, true); };
      if (mq.addEventListener) mq.addEventListener('change', close); else if (mq.addListener) mq.addListener(close);
    }
    if (window.MutationObserver) {
      var pend = false;
      new MutationObserver(function () {
        if (pend) return; pend = true;
        (window.requestAnimationFrame || setTimeout)(function () { pend = false; refresh(); });
      }).observe(html, { attributes: true, attributeFilter: ['lang', 'class'] });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ── Sayfalar için küçük API ─────────────────────────────────────────
  function parts(p) { return [].concat(p || []); }
  window.beShell = {
    t: t,
    refresh: refresh,
    observeAnim: observeAnim,
    closeDrawer: function () { setDrawer(false, true); },
    hide: function (p) { parts(p).forEach(function (x) { html.classList.add('be-hide-' + x); }); },
    show: function (p) { parts(p).forEach(function (x) { html.classList.remove('be-hide-' + x); }); },
    setLabel: function (text) {
      var l = document.getElementById('beLabel');
      if (!l) return;
      l.removeAttribute('data-be-t'); l.removeAttribute('data-i18n'); l.removeAttribute('data-be-booking');
      l.textContent = text || '';
    }
  };
})();
