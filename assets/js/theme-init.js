// Apply saved theme/font preferences ASAP to avoid flash
(function() {
  var theme = localStorage.getItem('site-theme') || 'dark';
  var fontClear = localStorage.getItem('site-font-clear') === '1';
  if (theme === 'light') document.documentElement.classList.add('theme-light');
  if (fontClear) document.documentElement.classList.add('font-clear');

  // Visible dark/light switch — injected next to the TR/EN toggles so every
  // page gets it without touching nav markup. Uses the same class/storage key
  // as the profile settings panel, so both stay in sync.
  function label(mode) {
    var t = window._i18n && window._i18n.t;
    if (mode === 'dark') return (t && t('ui_theme_dark') !== 'ui_theme_dark') ? t('ui_theme_dark') : 'Koyu';
    return (t && t('ui_theme_light') !== 'ui_theme_light') ? t('ui_theme_light') : 'Açık';
  }
  function setTheme(mode) {
    localStorage.setItem('site-theme', mode);
    document.documentElement.classList.toggle('theme-light', mode === 'light');
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.toggle('lang-active', b.getAttribute('data-theme') === mode);
    });
  }
  function build() {
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
  function inject() {
    document.querySelectorAll('.lnav-lang, .mobile-lang-toggle').forEach(function (host) {
      if (host.querySelector('.theme-switch')) return;
      host.appendChild(build());
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
