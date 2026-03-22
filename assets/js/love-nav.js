// love-nav.js — shows the secret love button only for specific user + admin
(function () {
  var LOVE_EMAIL  = 'elifaras12@gmail.com';
  var ADMIN_EMAIL = 'berkayer032@gmail.com';

  function applyLove(show) {
    var lnav = document.getElementById('lnavLoveBtn');
    var bnav = document.getElementById('bnavLoveBtn');
    if (lnav) lnav.style.display = show ? 'flex' : 'none';
    if (bnav) bnav.style.display = show ? 'flex' : 'none';
  }

  function tryHook() {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      firebase.auth().onAuthStateChanged(function (user) {
        var show = !!user && (user.email === LOVE_EMAIL || user.email === ADMIN_EMAIL);
        applyLove(show);
      });
    } else {
      setTimeout(tryHook, 150);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryHook);
  } else {
    tryHook();
  }
})();
