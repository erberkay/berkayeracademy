// love-nav.js — kabuğun kişiye bağlı iki durumu (menüyü çizmez; theme-init.js çizer):
//  1) "Sana Olan Sevgim" bağlantıları yalnız belirli hesaplara + admin'e görünür
//     → <html class="be-love">; kabuktaki [data-be-love] öğeleri CSS ile açılır.
//  2) Henüz ders almamış kullanıcı (reservations dokümanı yok, ders listesi boş
//     ya da hepsi iptal) → <html class="be-trial">; kabuk "Ders Paneli / Dersler"
//     etiketlerini "Deneme Dersi / Deneme" yapar ve "Ücretsiz deneme" CTA'sını gösterir.
(function () {
  var LOVE_EMAIL  = 'elifaras12@gmail.com';
  var ADMIN_EMAIL = 'berkayer032@gmail.com';
  var BORA_EMAIL  = 'bora1881aras@gmail.com';
  var html = document.documentElement;

  function refreshShell() {
    if (window.beShell && typeof window.beShell.refresh === 'function') {
      try { window.beShell.refresh(); } catch (e) { /* noop */ }
    }
  }

  function applyLove(show) {
    html.classList.toggle('be-love', !!show);
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
    html.classList.toggle('be-trial', !!firstTimer);
    refreshShell();
  }

  // Firestore SDK'sı yüklenmeyen sayfalar (ders-ableton, ders-push3) için son bilinen
  // durum oturum boyunca saklanır (yalnız '1'/'0'; kişisel veri yok).
  function cacheKey(uid) { return 'be-trial:' + uid; }
  function cacheGet(uid) { try { return window.sessionStorage.getItem(cacheKey(uid)); } catch (e) { return null; } }
  function cacheSet(uid, v) { try { window.sessionStorage.setItem(cacheKey(uid), v ? '1' : '0'); } catch (e) { /* noop */ } }

  function syncTrialNav(user) {
    // Girişsiz ziyaretçi için "Ücretsiz deneme" CTA'sı zaten görünür; etiket "Ders Paneli" kalır.
    if (!user) { applyTrialNav(false); return; }
    if (user.email === ADMIN_EMAIL) { applyTrialNav(false); return; }
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      var c = cacheGet(user.uid);
      if (c !== null) applyTrialNav(c === '1');
      return;
    }
    firebase.firestore().collection('reservations').doc(user.uid).get()
      .then(function (snap) { var ft = isFirstTimer(snap); cacheSet(user.uid, ft); applyTrialNav(ft); })
      .catch(function () { /* kural reddi ya da çevrimdışı — varsayılan kalır */ });
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
