// Shared shell: theme, top bar + hamburger drawer.
// Loaded in <head> by every page. The first block runs immediately so the
// saved theme applies before paint; the rest waits for the DOM.
(function() {
  var theme = localStorage.getItem('site-theme') || 'dark';
  var fontClear = localStorage.getItem('site-font-clear') === '1';
  if (theme === 'light') document.documentElement.classList.add('theme-light');
  if (fontClear) document.documentElement.classList.add('font-clear');

  var html = document.documentElement;

  // ── Theme switch (Koyu / Açık) — same storage key + class as profile settings
  function label(mode) {
    var t = window._i18n && window._i18n.t;
    if (mode === 'dark') return (t && t('ui_theme_dark') !== 'ui_theme_dark') ? t('ui_theme_dark') : 'Koyu';
    return (t && t('ui_theme_light') !== 'ui_theme_light') ? t('ui_theme_light') : 'Açık';
  }
  function setTheme(mode) {
    localStorage.setItem('site-theme', mode);
    html.classList.toggle('theme-light', mode === 'light');
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.toggle('lang-active', b.getAttribute('data-theme') === mode);
    });
  }
  function buildThemeSwitch() {
    var wrap = document.createElement('span'); wrap.className = 'theme-switch';
    ['dark', 'light'].forEach(function (mode) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'lang-btn theme-btn'; b.setAttribute('data-theme', mode);
      b.setAttribute('aria-label', mode === 'dark' ? 'Koyu tema' : 'Açık tema');
      b.textContent = label(mode);
      if ((localStorage.getItem('site-theme') || 'dark') === mode) b.classList.add('lang-active');
      b.addEventListener('click', function () { setTheme(mode); });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function buildLangButtons() {
    var wrap = document.createElement('div'); wrap.className = 'lnav-lang';
    ['tr', 'en'].forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'lang-btn'; b.setAttribute('data-lang', l); b.textContent = l.toUpperCase();
      b.addEventListener('click', function () { if (window._i18n && window._i18n.setLang) window._i18n.setLang(l); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  // ── Drawer: on phones/tablets the existing .left-nav slides in from the
  //    left. Pages without a .left-nav (lesson page) get one generated from
  //    their bottom nav so the same CSS applies.
  function ensureLeftNav() {
    var nav = document.querySelector('.left-nav');
    if (nav) return nav;
    var bottom = document.querySelector('.bottom-nav');
    nav = document.createElement('nav'); nav.className = 'left-nav left-nav--generated';
    var brand = document.createElement('a'); brand.className = 'lnav-brand'; brand.href = '/'; brand.textContent = 'BERKAY ER ACADEMY';
    var items = document.createElement('div'); items.className = 'lnav-items';
    var home = document.createElement('a'); home.className = 'lnav-item'; home.href = '/'; home.setAttribute('data-page', 'index');
    home.innerHTML = '<span class="lnav-icon"></span><span>Ana Sayfa</span>';
    items.appendChild(home);
    if (bottom) {
      bottom.querySelectorAll('a').forEach(function (a) {
        var c = a.cloneNode(true);
        c.className = 'lnav-item' + (a.classList.contains('active') ? ' active' : '');
        c.removeAttribute('id');
        c.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
        var ic = c.querySelector('.bnav-icon, .bnav-profile-av');
        if (ic) ic.className = ic.classList.contains('bnav-profile-av') ? 'lnav-profile-av' : 'lnav-icon';
        var lb = c.querySelector('.bnav-label'); if (lb) lb.className = '';
        if (a.style.display === 'none') c.style.display = 'none';
        items.appendChild(c);
      });
    }
    var foot = document.createElement('div'); foot.className = 'lnav-foot';
    foot.appendChild(buildLangButtons());
    nav.appendChild(brand); nav.appendChild(items); nav.appendChild(foot);
    document.body.appendChild(nav);
    return nav;
  }
  function setDrawer(open) {
    html.classList.toggle('drawer-open', open);
    document.querySelectorAll('.hamburger').forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    if (open) {
      var first = document.querySelector('.left-nav .lnav-item');
      if (first) first.focus({ preventScroll: true });
    }
  }
  function buildHamburger() {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'hamburger'; b.setAttribute('aria-label', 'Menü'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<span></span><span></span><span></span>';
    b.addEventListener('click', function () { setDrawer(!html.classList.contains('drawer-open')); });
    return b;
  }
  function buildTopBar() {
    var topnav = document.querySelector('.topnav');
    if (topnav) {                       // app pages already have a page header bar
      if (!topnav.querySelector('.hamburger')) topnav.appendChild(buildHamburger());
      return;
    }
    if (document.querySelector('.topbar')) return;
    var bar = document.createElement('header'); bar.className = 'topbar';
    var brand = document.createElement('a'); brand.className = 'topbar-brand'; brand.href = '/'; brand.innerHTML = 'BERKAY ER<span class="topbar-brand-tail"> ACADEMY</span>';
    bar.appendChild(brand); bar.appendChild(buildHamburger());
    document.body.insertBefore(bar, document.body.firstChild);
    html.classList.add('has-topbar');
  }
  function buildDrawerClose(nav) {
    if (nav.querySelector('.drawer-close')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'drawer-close'; b.setAttribute('aria-label', 'Menüyü kapat');
    b.innerHTML = '<span></span><span></span>';
    b.addEventListener('click', function () { setDrawer(false); });
    nav.insertBefore(b, nav.firstChild);
  }
  function buildBackdrop() {
    if (document.querySelector('.drawer-backdrop')) return;
    var d = document.createElement('div'); d.className = 'drawer-backdrop';
    d.addEventListener('click', function () { setDrawer(false); });
    document.body.appendChild(d);
  }

  function init() {
    buildDrawerClose(ensureLeftNav());
    buildTopBar();
    buildBackdrop();
    document.querySelectorAll('.lnav-lang, .mobile-lang-toggle').forEach(function (host) {
      if (!host.querySelector('.theme-switch')) host.appendChild(buildThemeSwitch());
    });
    document.addEventListener('click', function (e) {
      if (html.classList.contains('drawer-open') && e.target.closest('.left-nav a')) setDrawer(false);
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (m) { if (m.matches) setDrawer(false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
