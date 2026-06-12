// love-nav.js — shared nav side-effects:
//  1) secret love button visibility (specific users + admin)
//  2) booking nav label flips to "Deneme Dersi" + blinks for users who
//     haven't bought a lesson yet (no reservations doc, or only cancelled
//     lessons in it).
(function () {
  var LOVE_EMAIL  = 'elifaras12@gmail.com';
  var ADMIN_EMAIL = 'berkayer032@gmail.com';
  var BORA_EMAIL  = 'bora1881aras@gmail.com';

  // Inject blink keyframes once. The animation runs on the nav item itself,
  // tinting it gold so the trial CTA stands out without screaming.
  if (!document.getElementById('navTrialBlinkStyles')) {
    var st = document.createElement('style');
    st.id = 'navTrialBlinkStyles';
    st.textContent =
      '@keyframes navTrialBlink { 0%,100%{color:#e8b84b;text-shadow:0 0 8px rgba(232,184,75,.45);} 50%{color:#fff5d2;text-shadow:0 0 14px rgba(232,184,75,.85);} }' +
      '.nav-trial-blink { animation: navTrialBlink 1.4s ease-in-out infinite; color:#e8b84b !important; font-weight:700; }' +
      '.nav-trial-blink .bnav-icon, .nav-trial-blink .lnav-icon { animation: navTrialBlink 1.4s ease-in-out infinite; }';
    document.head.appendChild(st);
  }

  function applyLove(show) {
    var lnav = document.getElementById('lnavLoveBtn');
    var bnav = document.getElementById('bnavLoveBtn');
    if (lnav) lnav.style.display = show ? 'flex' : 'none';
    if (bnav) bnav.style.display = show ? 'flex' : 'none';
  }

  // True if the user has at least one non-cancelled lesson in their
  // reservations doc. No doc, empty lessons, or all cancelled → first-timer.
  function isFirstTimer(resDocSnap) {
    if (!resDocSnap || !resDocSnap.exists) return true;
    var data = resDocSnap.data() || {};
    var lessons = data.lessons || [];
    if (!lessons.length) return true;
    return !lessons.some(function (l) { return l && l.status !== 'cancelled'; });
  }

  function applyTrialNav(firstTimer) {
    var ids = ['bnavAdminItem', 'lnavAdminItem'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      // The label lives in a child <span data-i18n=...>.
      var span = el.querySelector('[data-i18n]');
      if (!span) return;
      var desired = firstTimer ? 'nav_trial_lesson' : 'nav_lessons';
      if (span.getAttribute('data-i18n') !== desired) {
        span.setAttribute('data-i18n', desired);
      }
      el.classList.toggle('nav-trial-blink', !!firstTimer);
    });
    // Re-translate so the swap is visible immediately.
    if (window._i18n && typeof window._i18n.apply === 'function') {
      try { window._i18n.apply(); } catch (e) { /* noop */ }
    }
  }

  function syncTrialNav(user) {
    // Signed-out visitors don't see the booking nav item at all — leave it.
    if (!user) { applyTrialNav(false); return; }
    if (user.email === ADMIN_EMAIL) { applyTrialNav(false); return; }
    if (typeof firebase === 'undefined' || !firebase.firestore) return;
    firebase.firestore().collection('reservations').doc(user.uid).get()
      .then(function (snap) { applyTrialNav(isFirstTimer(snap)); })
      .catch(function () { /* rule denial or offline — leave default */ });
  }

  function tryHook() {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      firebase.auth().onAuthStateChanged(function (user) {
        var show = !!user && (user.email === LOVE_EMAIL || user.email === ADMIN_EMAIL || user.email === BORA_EMAIL);
        applyLove(show);
        syncTrialNav(user);
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
