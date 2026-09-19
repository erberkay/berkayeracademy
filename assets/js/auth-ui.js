/* assets/js/auth-ui.js — shared sign-in modal: Google + e-posta/şifre.
   Plain <script> (never type="module"), loaded in <head> BEFORE the Firebase SDK,
   so firebase.auth() is only touched inside functions. API: window.bkAuth
     openLogin({ mode:'signin'|'signup'|'reset', error }) → Promise<user|null>
     signInGoogle() · handleRedirectResult() · isEmbeddedBrowser() · errorMessage(err)
   Markup uses ui.css components only (.modal* .btn* .input .field-label .eyebrow .toast). */
(function () {
  'use strict';

  var SPRITE = '/assets/img/icons.svg';

  // In-app browsers (WebViews). Google refuses OAuth there (403 disallowed_useragent)
  // and their partitioned storage breaks the redirect handler.
  var EMBEDDED_UA = /FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram|Barcelona|TikTok|musical_ly|BytedanceWebview|LinkedInApp|\bLine\/|MicroMessenger|Snapchat|Twitter|Pinterest|KAKAOTALK|; wv\)/i;

  var STR = {
    title_signin:  { tr: `Giriş Yap`, en: `Sign in` },
    title_signup:  { tr: `Hesap Oluştur`, en: `Create account` },
    title_reset:   { tr: `Şifre Sıfırla`, en: `Reset password` },
    close:         { tr: `Kapat`, en: `Close` },
    google:        { tr: `Google ile devam et`, en: `Continue with Google` },
    or_email:      { tr: `veya e-posta ile`, en: `or with email` },
    or:            { tr: `veya`, en: `or` },
    name:          { tr: `Ad Soyad`, en: `Full name` },
    email:         { tr: `E-posta`, en: `Email` },
    password:      { tr: `Şifre`, en: `Password` },
    pw_hint:       { tr: `En az 6 karakter`, en: `At least 6 characters` },
    submit_signin: { tr: `Giriş Yap`, en: `Sign in` },
    submit_signup: { tr: `Hesap Oluştur`, en: `Create account` },
    submit_reset:  { tr: `Sıfırlama bağlantısı gönder`, en: `Send reset link` },
    forgot:        { tr: `Şifremi unuttum`, en: `Forgot password` },
    to_signup:     { tr: `Kayıt ol`, en: `Sign up` },
    to_signin:     { tr: `Hesabım var, giriş yap`, en: `I have an account` },
    back:          { tr: `Girişe dön`, en: `Back to sign in` },
    reset_intro:   { tr: `Hesabının e-posta adresini yaz, şifreni sıfırlaman için bir bağlantı gönderelim. Daha önce yalnızca Google ile giriş yaptıysan da bu yolla aynı adrese bir şifre belirleyebilirsin.`,
                     en: `Enter your account email and we'll send you a link to reset your password. If you've only used Google so far, this also lets you set a password for that address.` },
    reset_sent:    { tr: `Bu adrese kayıtlı bir hesap varsa sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.`,
                     en: `If an account exists for this address, a reset link is on its way. Check your inbox and spam folder.` },
    name_required: { tr: `Adını yaz.`, en: `Enter your name.` },
    signup_ok:     { tr: `Hesabın oluşturuldu. Hoş geldin!`, en: `Account created. Welcome!` },
    unavailable:   { tr: `Giriş şu an kullanılamıyor. Sayfayı yenileyip tekrar dene.`, en: `Sign-in is unavailable right now. Reload the page and try again.` },
    generic:       { tr: `Giriş sırasında bir hata oluştu.`, en: `Something went wrong while signing in.` },
    wv_title:      { tr: `Uygulama içi tarayıcıdasın.`, en: `You're in an in-app browser.` },
    wv_body:       { tr: `Google; Instagram, Facebook, TikTok gibi uygulamaların içindeki tarayıcılarda güvenlik nedeniyle girişe izin vermiyor. Aşağıdan e-posta ile giriş yapabilir ya da sayfayı Safari/Chrome'da açıp Google ile devam edebilirsin.`,
                     en: `Google blocks sign-in inside apps like Instagram, Facebook and TikTok for security reasons. Sign in with email below, or open this page in Safari/Chrome and continue with Google there.` },
    wv_howto:      { tr: `Sağ üstteki ••• (veya ⋮) menüsünden “Tarayıcıda aç”ı seçebilirsin.`, en: `You can also tap the ••• (or ⋮) menu at the top right and choose “Open in browser”.` },
    wv_google_err: { tr: `Google bu uygulama içi tarayıcıda girişe izin vermiyor. E-posta ile giriş yap ya da sayfayı Safari/Chrome'da aç.`,
                     en: `Google doesn't allow sign-in in this in-app browser. Sign in with email, or open the page in Safari/Chrome.` },
    copy_link:     { tr: `Bağlantıyı kopyala`, en: `Copy link` },
    copied:        { tr: `Bağlantı kopyalandı. Safari veya Chrome'a yapıştır.`, en: `Link copied. Paste it into Safari or Chrome.` },
    copy_fail:     { tr: `Kopyalanamadı. Adres:`, en: `Couldn't copy. Address:` },
    open_safari:   { tr: `Safari'de aç`, en: `Open in Safari` },
    open_chrome:   { tr: `Chrome'da aç`, en: `Open in Chrome` }
  };

  var BAD_LOGIN = { tr: `E-posta veya şifre hatalı. Daha önce Google ile giriş yaptıysan “Google ile devam et”i kullan ya da “Şifremi unuttum” ile bu adrese şifre belirle.`,
                    en: `Wrong email or password. If you signed in with Google before, use “Continue with Google”, or set a password for this address via “Forgot password”.` };
  var CONFIG_ERR = { tr: `Giriş yapılandırmasında bir sorun var. Lütfen bizimle iletişime geç.`,
                     en: `There's a problem with the sign-in setup. Please contact us.` };
  var CANCELLED = { tr: `Giriş iptal edildi.`, en: `Sign-in was cancelled.` };
  var SESSION = { tr: `Oturumunun süresi doldu. Tekrar giriş yap.`, en: `Your session expired. Please sign in again.` };

  var ERR = {
    'bk/unavailable':                    STR.unavailable,
    'auth/invalid-email':                { tr: `Geçerli bir e-posta adresi gir.`, en: `Enter a valid email address.` },
    'auth/missing-email':                { tr: `E-posta adresini yaz.`, en: `Enter your email address.` },
    'auth/missing-password':             { tr: `Şifreni yaz.`, en: `Enter your password.` },
    'auth/weak-password':                { tr: `Şifre en az 6 karakter olmalı.`, en: `Password must be at least 6 characters.` },
    'auth/invalid-password':             { tr: `Şifre en az 6 karakter olmalı.`, en: `Password must be at least 6 characters.` },
    'auth/password-does-not-meet-requirements': { tr: `Şifre gereksinimleri karşılamıyor. Daha uzun ve harf/rakam içeren bir şifre dene.`, en: `Password doesn't meet the requirements. Try a longer one with letters and numbers.` },
    'auth/email-already-in-use':         { tr: `Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene; daha önce Google ile girdiysen “Google ile devam et”i kullan.`,
                                           en: `An account with this email already exists. Try signing in; if you used Google before, choose “Continue with Google”.` },
    'auth/invalid-credential':           BAD_LOGIN,
    'auth/invalid-login-credentials':    BAD_LOGIN,
    'auth/wrong-password':               BAD_LOGIN,
    'auth/user-not-found':               { tr: `Bu e-posta ile kayıtlı bir hesap yok. “Kayıt ol” ile yeni hesap oluşturabilirsin.`, en: `No account uses this email. Choose “Sign up” to create one.` },
    'auth/user-disabled':                { tr: `Bu hesap devre dışı bırakılmış. Destek için bizimle iletişime geç.`, en: `This account has been disabled. Contact us for help.` },
    'auth/user-mismatch':                { tr: `Bu bilgiler oturumdaki hesaba ait değil.`, en: `These credentials belong to a different account.` },
    'auth/too-many-requests':            { tr: `Çok fazla deneme yapıldı. Birkaç dakika bekleyip tekrar dene.`, en: `Too many attempts. Wait a few minutes and try again.` },
    'auth/quota-exceeded':               { tr: `Şu an çok fazla istek var. Biraz sonra tekrar dene.`, en: `Too many requests right now. Try again shortly.` },
    'auth/network-request-failed':       { tr: `Bağlantı hatası. İnternet bağlantını kontrol edip tekrar dene.`, en: `Network error. Check your connection and try again.` },
    'auth/timeout':                      { tr: `İşlem zaman aşımına uğradı. Tekrar dene.`, en: `The request timed out. Try again.` },
    'auth/operation-not-allowed':        { tr: `Bu giriş yöntemi şu an kapalı. Google ile dene ya da bizimle iletişime geç.`, en: `This sign-in method is turned off. Try Google or contact us.` },
    'auth/admin-restricted-operation':   { tr: `Bu işlem şu an kapalı.`, en: `This action is currently disabled.` },
    'auth/popup-blocked':                { tr: `Tarayıcın giriş penceresini engelledi. Açılır pencerelere izin verip tekrar dene ya da e-posta ile giriş yap.`, en: `Your browser blocked the sign-in window. Allow pop-ups and retry, or sign in with email.` },
    'auth/popup-closed-by-user':         { tr: `Giriş penceresi kapatıldı.`, en: `The sign-in window was closed.` },
    'auth/cancelled-popup-request':      { tr: `Başka bir giriş penceresi zaten açık.`, en: `Another sign-in window is already open.` },
    'auth/user-cancelled':               CANCELLED,
    'auth/redirect-cancelled-by-user':   CANCELLED,
    'auth/redirect-operation-pending':   { tr: `Devam eden bir giriş işlemi var. Birkaç saniye bekle.`, en: `A sign-in is already in progress. Wait a few seconds.` },
    'auth/account-exists-with-different-credential': { tr: `Bu e-posta başka bir giriş yöntemiyle kayıtlı. O yöntemle giriş yap.`, en: `This email is registered with a different sign-in method. Use that one.` },
    'auth/credential-already-in-use':    { tr: `Bu giriş bilgisi başka bir hesaba bağlı.`, en: `This credential is already linked to another account.` },
    'auth/email-change-needs-verification': { tr: `Önce e-posta adresini doğrulaman gerekiyor.`, en: `You need to verify your email first.` },
    'auth/requires-recent-login':        { tr: `Bu işlem için yeniden giriş yapman gerekiyor.`, en: `Please sign in again to do this.` },
    'auth/user-token-expired':           SESSION,
    'auth/invalid-user-token':           SESSION,
    'auth/null-user':                    SESSION,
    'auth/unauthorized-domain':          { tr: `Bu adres üzerinden giriş yapılamıyor. Lütfen berkayeracademy.com üzerinden dene.`, en: `Sign-in isn't allowed from this address. Please use berkayeracademy.com.` },
    'auth/operation-not-supported-in-this-environment': { tr: `Bu tarayıcı Google girişini desteklemiyor. E-posta ile giriş yap ya da sayfayı Safari/Chrome'da aç.`, en: `This browser doesn't support Google sign-in. Use email, or open the page in Safari/Chrome.` },
    'auth/web-storage-unsupported':      { tr: `Tarayıcın depolamayı engelliyor (gizli mod ya da çerez ayarları). Ayarı değiştir ya da başka bir tarayıcı dene.`, en: `Your browser blocks storage (private mode or cookie settings). Change it or try another browser.` },
    'auth/internal-error':               { tr: `Beklenmeyen bir hata oluştu. Sayfayı yenileyip tekrar dene.`, en: `Unexpected error. Reload the page and try again.` },
    'auth/expired-action-code':          { tr: `Bağlantının süresi dolmuş. Yeni bir bağlantı iste.`, en: `This link has expired. Request a new one.` },
    'auth/invalid-action-code':          { tr: `Bağlantı geçersiz ya da daha önce kullanılmış.`, en: `This link is invalid or was already used.` },
    'auth/missing-or-invalid-nonce':     { tr: `Giriş isteği doğrulanamadı. Tekrar dene.`, en: `The sign-in request couldn't be verified. Try again.` },
    'auth/invalid-api-key':              CONFIG_ERR,
    'auth/app-not-authorized':           CONFIG_ERR,
    'auth/app-deleted':                  CONFIG_ERR,
    'auth/argument-error':               CONFIG_ERR,
    'auth/invalid-oauth-client-id':      CONFIG_ERR,
    'auth/invalid-oauth-provider':       CONFIG_ERR,
    'auth/auth-domain-config-required':  CONFIG_ERR,
    'auth/invalid-continue-uri':         CONFIG_ERR,
    'auth/unauthorized-continue-uri':    CONFIG_ERR,
    'auth/missing-continue-uri':         CONFIG_ERR,
    'auth/invalid-tenant-id':            CONFIG_ERR
  };

  // ── helpers ─────────────────────────────────────────────────────────
  function lang() {
    var l = null;
    try { l = (window._i18n && window._i18n.getLang) ? window._i18n.getLang() : localStorage.getItem('_lang'); } catch (e) {}
    return l === 'en' ? 'en' : 'tr';
  }
  function t(key) { var e = STR[key]; return e ? (e[lang()] || e.tr) : key; }

  function errorMessage(err) {
    if (typeof err === 'string') return err;
    var code = (err && err.code) || '';
    var e = ERR[code] || (/requests-from-referer|api-key/.test(code) ? CONFIG_ERR : null);
    if (e) return e[lang()] || e.tr;
    return t('generic') + (code ? ' (' + code.replace(/^auth\//, '') + ')' : '');
  }

  function isEmbeddedBrowser() {
    var ua = navigator.userAgent || '';
    if (EMBEDDED_UA.test(ua)) return true;
    // Bare iOS WKWebView: no Safari token (home-screen web apps excepted)
    return /iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua) && !navigator.standalone;
  }

  function getAuth() {
    try {
      if (window.firebase && firebase.apps && firebase.apps.length && typeof firebase.auth === 'function') {
        var auth = firebase.auth();
        auth.languageCode = lang();
        return auth;
      }
    } catch (e) { console.warn('[bkAuth] auth unavailable:', e); }
    return null;
  }

  function ready(fn) {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      el.setAttribute(k, v === true ? '' : v);
    });
    (Array.isArray(kids) ? kids : [kids]).forEach(function (k) {
      if (k == null || k === false) return;
      el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
    });
    return el;
  }

  function icon(name) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(NS, 'use');
    use.setAttribute('href', SPRITE + '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  function field(id, label, input) {
    return h('div', { class: 'field' }, [h('label', { class: 'field-label', for: id }, label), input]);
  }

  function toast(msg, kind) {
    ready(function () {
      var wrap = document.getElementById('bkAuthToasts');
      if (!wrap) {
        wrap = h('div', { id: 'bkAuthToasts', class: 'toast-wrap', 'aria-live': 'polite' });
        document.body.appendChild(wrap);
      }
      var el = h('div', { class: 'toast' + (kind ? ' ' + kind : ''), role: kind === 'err' ? 'alert' : 'status' }, msg);
      wrap.appendChild(el);
      setTimeout(function () {
        el.remove();
        if (!wrap.children.length) wrap.remove();
      }, kind === 'err' ? 8000 : 4500);
    });
  }

  // ── modal ───────────────────────────────────────────────────────────
  var M = null; // { overlay, dialog, mode, resolvers, prevFocus, email, busy, errBox, okBox }

  function onKey(e) {
    if (!M) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); return; }
    if (e.key !== 'Tab') return;
    var f = [].filter.call(M.dialog.querySelectorAll('button, a[href], input'), function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], cur = document.activeElement;
    if (!M.dialog.contains(cur)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  }

  function build() {
    var overlay = h('div', { class: 'modal-overlay', id: 'bkAuthOverlay' });
    var dialog = h('div', { class: 'modal modal-sm', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bkAuthTitle', tabindex: '-1' });
    overlay.appendChild(dialog);
    var downOnOverlay = false;
    overlay.addEventListener('mousedown', function (e) { downOnOverlay = e.target === overlay; });
    overlay.addEventListener('click', function (e) { if (downOnOverlay && e.target === overlay) close(null); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    M.overlay = overlay;
    M.dialog = dialog;
  }

  function close(user) {
    if (!M) return;
    var m = M;
    M = null;
    document.removeEventListener('keydown', onKey, true);
    m.overlay.remove();
    if (m.prevFocus && m.prevFocus.focus && document.contains(m.prevFocus)) {
      try { m.prevFocus.focus(); } catch (e) {}
    }
    m.resolvers.forEach(function (r) { r(user || null); });
  }

  function setBusy(on) {
    if (!M) return;
    M.busy = on;
    M.dialog.setAttribute('aria-busy', on ? 'true' : 'false');
    [].forEach.call(M.dialog.querySelectorAll('button'), function (b) {
      if (!b.classList.contains('modal-close')) b.disabled = on;
    });
  }

  function hideMsgs() {
    if (!M) return;
    M.errBox.hidden = true;
    if (M.okBox) M.okBox.hidden = true;
  }

  // Error goes into the open modal; with no modal it becomes a toast.
  function report(err, focusEl) {
    var msg = errorMessage(err);
    if (!M) { toast(msg, 'err'); return; }
    M.errBox.textContent = msg;
    M.errBox.hidden = false;
    try { M.errBox.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    if (focusEl) focusEl.focus();
  }

  function run(fn) {
    if (!M || M.busy) return;
    hideMsgs();
    setBusy(true);
    var p;
    try { p = Promise.resolve(fn()); } catch (e) { p = Promise.reject(e); }
    p.then(function () { setBusy(false); }, function (err) {
      setBusy(false);
      console.warn('[bkAuth]', err);
      report(err);
    });
  }

  function browserLink() {
    var ua = navigator.userAgent || '';
    var href = location.href.split('#')[0];
    if (/Android/i.test(ua)) {
      return { label: t('open_chrome'), url: 'intent://' + href.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end' };
    }
    if (/iPhone|iPad|iPod/i.test(ua)) return { label: t('open_safari'), url: 'x-safari-' + href };
    return null;
  }

  function copyLink() {
    var url = location.href;
    function done() { toast(t('copied'), 'ok'); }
    function fallback() {
      var ta = h('textarea', { class: 'sr-only', readonly: true });
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { ta.setSelectionRange(0, url.length); } catch (e) {}
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (ok) done(); else toast(t('copy_fail') + ' ' + url, 'info');
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, fallback);
    else fallback();
  }

  function webviewBlock() {
    var copyBtn = h('button', { type: 'button', class: 'btn btn-ghost' }, [icon('copy'), t('copy_link')]);
    copyBtn.onclick = copyLink;
    var link = browserLink();
    var openBtn = link ? h('a', { class: 'btn btn-ghost', href: link.url }, [icon('external'), link.label]) : null;
    return [
      h('div', { class: 'toast info field' }, [h('strong', null, t('wv_title')), ' ', t('wv_body'), h('br'), t('wv_howto')]),
      h('div', { class: 'btn-row field' }, [copyBtn, openBtn])
    ];
  }

  function render(mode, opts) {
    opts = opts || {};
    var wv = isEmbeddedBrowser();
    var googleFirst = !wv && mode === 'signin';
    var d = M.dialog;
    d.textContent = '';
    M.mode = mode;

    var closeBtn = h('button', { type: 'button', class: 'modal-close', 'aria-label': t('close') }, icon('x'));
    closeBtn.onclick = function () { close(null); };
    var body = h('div', { class: 'modal-body' });
    M.errBox = h('div', { class: 'toast err field', role: 'alert', hidden: true });
    M.okBox = h('div', { class: 'toast ok field', role: 'status', hidden: true });

    // email form
    var form = h('form', { novalidate: true });
    var nameIn = null, pwIn = null;
    if (mode === 'signup') {
      nameIn = h('input', { id: 'bkAuthName', class: 'input', type: 'text', autocomplete: 'name', autocapitalize: 'words', maxlength: '60', required: true });
      form.appendChild(field('bkAuthName', t('name'), nameIn));
    }
    var emailIn = h('input', { id: 'bkAuthEmail', class: 'input', type: 'email', inputmode: 'email', autocomplete: mode === 'reset' ? 'email' : 'username', autocapitalize: 'none', spellcheck: 'false', required: true });
    emailIn.value = M.email || '';
    emailIn.addEventListener('input', function () { if (M) M.email = emailIn.value.trim(); });
    form.appendChild(field('bkAuthEmail', t('email'), emailIn));
    if (mode !== 'reset') {
      pwIn = h('input', { id: 'bkAuthPw', class: 'input', type: 'password', autocomplete: mode === 'signup' ? 'new-password' : 'current-password', minlength: '6', required: true, placeholder: mode === 'signup' ? t('pw_hint') : null });
      form.appendChild(field('bkAuthPw', t('password'), pwIn));
    }
    var submit = h('button', { type: 'submit', class: 'btn btn-block ' + (googleFirst ? 'btn-ghost' : 'btn-primary') }, t('submit_' + mode));
    // in-app browser: Google sits below the form, so the submit needs the .field gap
    form.appendChild(wv && mode !== 'reset' ? h('div', { class: 'field' }, submit) : submit);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!M || M.busy) return;
      hideMsgs();
      var email = emailIn.value.trim();
      M.email = email;
      if (!email) return report({ code: 'auth/missing-email' }, emailIn);
      if (mode === 'reset') {
        return run(function () {
          return sendReset(email).then(function () {
            if (!M) return;
            M.okBox.textContent = t('reset_sent');
            M.okBox.hidden = false;
          });
        });
      }
      var pw = pwIn.value;
      if (!pw) return report({ code: 'auth/missing-password' }, pwIn);
      if (mode === 'signup') {
        var name = nameIn.value.trim().replace(/\s+/g, ' ');
        if (!name) return report(t('name_required'), nameIn);
        if (pw.length < 6) return report({ code: 'auth/weak-password' }, pwIn);
        return run(function () { return signUpEmail(name, email, pw); });
      }
      run(function () { return signInEmail(email, pw); });
    });

    // Google
    var gBtn = null;
    if (mode !== 'reset') {
      gBtn = h('button', { type: 'button', class: 'btn btn-block ' + (googleFirst ? 'btn-primary' : 'btn-ghost') }, t('google'));
      gBtn.onclick = function () { signInGoogle(); };
    }

    // secondary actions
    function modeBtn(label, target) {
      var b = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, label);
      b.onclick = function () { if (M && !M.busy) render(target, { focusInput: true }); };
      return b;
    }
    var actions = h('div', { class: 'modal-actions' },
      mode === 'signin' ? [modeBtn(t('forgot'), 'reset'), modeBtn(t('to_signup'), 'signup')]
      : mode === 'signup' ? [modeBtn(t('to_signin'), 'signin')]
      : [modeBtn(t('back'), 'signin')]);

    if (mode === 'reset') {
      body.appendChild(h('p', { class: 'field' }, t('reset_intro')));
      body.append(M.errBox, M.okBox, form);
    } else if (wv) {
      webviewBlock().forEach(function (n) { body.appendChild(n); });
      body.append(M.errBox, form, h('div', { class: 'eyebrow field' }, t('or')), gBtn);
    } else {
      body.append(M.errBox, h('div', { class: 'field' }, gBtn), h('div', { class: 'eyebrow field' }, t('or_email')), form);
    }

    d.append(closeBtn, h('div', { class: 'modal-title', id: 'bkAuthTitle' }, t('title_' + mode)), body, actions);

    if (opts.error) report(opts.error);
    var target = opts.focusInput ? (nameIn || emailIn) : (googleFirst ? gBtn : d);
    try { target.focus(); } catch (e) {}
  }

  function openLogin(opts) {
    opts = opts || {};
    var auth = getAuth();
    if (!auth) { toast(t('unavailable'), 'err'); return Promise.resolve(null); }
    if (auth.currentUser && !opts.error) return Promise.resolve(auth.currentUser);
    return new Promise(function (resolve) {
      ready(function () {
        if (M) M.resolvers.push(resolve);
        else { M = { resolvers: [resolve], prevFocus: document.activeElement, email: '' }; build(); }
        render(opts.mode || 'signin', opts);
      });
    });
  }

  // ── auth flows ──────────────────────────────────────────────────────
  function signInEmail(email, pw) {
    var auth = getAuth();
    if (!auth) return Promise.reject({ code: 'bk/unavailable' });
    return auth.signInWithEmailAndPassword(email, pw).then(function (cred) {
      close(cred.user);
      return cred.user;
    });
  }

  function saveUserDoc(user, name, email) {
    if (typeof firebase.firestore !== 'function') return Promise.resolve(); // page without Firestore SDK
    var fs = firebase.firestore;
    return fs().collection('users').doc(user.uid).set({
      displayName: name,
      email: user.email || email,
      joinedAt: fs.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  function signUpEmail(name, email, pw) {
    var auth = getAuth();
    if (!auth) return Promise.reject({ code: 'bk/unavailable' });
    return auth.createUserWithEmailAndPassword(email, pw).then(function (cred) {
      var user = cred.user;
      return user.updateProfile({ displayName: name })
        .then(function () { return saveUserDoc(user, name, email); })
        .catch(function (e) { console.warn('[bkAuth] profile save failed:', e); }) // account exists either way
        .then(function () {
          close(user);
          toast(t('signup_ok'), 'ok');
          return user;
        });
    });
  }

  function sendReset(email) {
    var auth = getAuth();
    if (!auth) return Promise.reject({ code: 'bk/unavailable' });
    return auth.sendPasswordResetEmail(email, { url: location.origin + location.pathname }).catch(function (e) {
      // continue URL rejected (e.g. unlisted host) — send the plain link instead
      if (e && /continue-uri|unauthorized-domain/.test(e.code || '')) return auth.sendPasswordResetEmail(email);
      throw e;
    });
  }

  // Popup first. Redirect only when the popup itself was blocked / failed
  // internally, and never inside an in-app browser (Google rejects it there).
  function signInGoogle() {
    var auth = getAuth();
    if (!auth) { report({ code: 'bk/unavailable' }); return Promise.resolve(null); }
    var provider = new firebase.auth.GoogleAuthProvider();
    var wv = isEmbeddedBrowser();
    if (M) { hideMsgs(); setBusy(true); }
    return auth.signInWithPopup(provider).then(function (cred) {
      setBusy(false);
      close(cred.user);
      return cred.user;
    }, function (err) {
      setBusy(false);
      var code = (err && err.code) || '';
      if (wv) { console.warn('[bkAuth] google (in-app browser):', err); report(t('wv_google_err')); return null; }
      if (code === 'auth/popup-blocked' || code === 'auth/internal-error') {
        return auth.signInWithRedirect(provider).then(function () { return null; }, function (e2) {
          console.warn('[bkAuth] redirect:', e2);
          report(e2);
          return null;
        });
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
      console.warn('[bkAuth] google:', err);
      report(err);
      return null;
    });
  }

  // Surfaces a failed redirect sign-in by reopening the modal with the error.
  function handleRedirectResult() {
    var auth = getAuth();
    if (!auth) return Promise.resolve(null);
    return auth.getRedirectResult().catch(function (err) {
      if (err && err.code === 'auth/no-auth-event') return null;
      console.warn('[bkAuth] redirect sign-in failed:', err);
      openLogin({ error: err });
      return null;
    });
  }

  window.bkAuth = {
    openLogin: openLogin,
    closeLogin: function () { close(null); },
    signInGoogle: signInGoogle,
    handleRedirectResult: handleRedirectResult,
    isEmbeddedBrowser: isEmbeddedBrowser,
    errorMessage: errorMessage
  };
})();
