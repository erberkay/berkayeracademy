// Apply saved theme/font preferences ASAP to avoid flash
(function() {
  var theme = localStorage.getItem('site-theme') || 'dark';
  var fontClear = localStorage.getItem('site-font-clear') === '1';
  if (theme === 'light') document.documentElement.classList.add('theme-light');
  if (fontClear) document.documentElement.classList.add('font-clear');
})();
