/* be-assistant-ui.js — Ders Paneli asistanının ARAYÜZÜ ve sayfa köprüsü.
   Motor: be-assistant.js (window.beAssistant), bilgi: be-assistant-kb.js (window.beAssistantKB).
   booking.html ana betiğinden SONRA yüklenir; sayfanın durumunu yalnız OKUR (_user, _bkWkCtx,
   _bkZoomLink, LESSON_PRICE, PACKAGES… — hepsi typeof korumalı). Sayfadan tek kanca:
   showView() → beAssistant.onView(id). Yazdığı tek yer: "Berkay'a ilet" → assistant_questions
   (öğrenci) ve admin kartındaki cevap → assistant_faq + assistant_questions güncellemesi.
   Öğrenilen cevaplar (assistant_faq) canlı dinlenir ve bilgi tabanına eklenir — kod değişmeden öğrenir.
   Görünür metinler bu dosyada TR/EN (S sözlüğü); KB cevapları be-assistant-kb.js'te. */
(function () {
  'use strict';
  var W = window;
  var A = W.beAssistant, KB = W.beAssistantKB;
  if (!A || !KB || typeof document === 'undefined') return;

  // ── Metinler ────────────────────────────────────────────────
  var S = {
    fab: [`Asistan`, `Assistant`],
    fabAria: [`Asistanı aç — panelle ilgili sorular`, `Open the assistant — questions about the panel`],
    title: [`Asistan`, `Assistant`],
    sub: [`Site içi · yapay zekâ servisi değil`, `Built-in · no external AI`],
    close: [`Asistanı kapat`, `Close the assistant`],
    ph: [`Sorunu yaz… (ör. kaç erteleme hakkım kaldı?)`, `Type your question… (e.g. how many credits do I have?)`],
    inLabel: [`Sorun`, `Your question`],
    send: [`Gönder`, `Send`],
    foot: [`Yazdıkların cihazında kalır; yalnız "Berkay'a ilet" dersen ona gönderilir.`, `What you type stays on your device; it's only sent if you press "Forward to Berkay".`],
    hello: [`Merhaba{n}! Ders panelinle ilgili sorularını yanıtlarım: ders saatin, erteleme hakların, ödeme, Zoom, kurallar… Aşağıdan seç ya da yaz.`, `Hi{n}! I answer questions about your lesson panel: your lesson times, credits, payment, Zoom, rules… Pick one below or type.`],
    helloOut: [`Merhaba! Ders paneliyle ilgili genel soruları yanıtlarım. Kendi derslerin, hakların ve ödemenle ilgili cevaplar için giriş yapman gerekiyor.`, `Hi! I answer general questions about the lesson panel. For answers about your own lessons, credits and payment, please sign in.`],
    chipsAria: [`Hızlı sorular`, `Quick questions`],
    you: [`Sen`, `You`],
    bot: [`Asistan`, `Assistant`],
    learned: [`Berkay Er'in cevabı`, `Berkay Er's answer`],
    unsure: [`Tam emin değilim — bunu mu demek istedin?`, `I'm not quite sure — did you mean one of these?`],
    guess: [`Şunu sorduğunu düşünüyorum:`, `I think you're asking:`],
    unknown: [`Bunu henüz bilmiyorum. İstersen sorunu Berkay Er'e iletebilirim; yanıtlayınca cevabı burada görürsün ve asistan da öğrenir. Acilse WhatsApp'tan yaz.`, `I don't know that one yet. I can forward your question to Berkay Er; when he answers you'll see it here and the assistant learns it too. If it's urgent, message on WhatsApp.`],
    unknownOut: [`Bunu bilmiyorum. Giriş yaparsan sorunu Berkay Er'e iletebilirim; acilse WhatsApp'tan yazabilirsin.`, `I don't know that one. Sign in to forward it to Berkay Er, or message on WhatsApp if it's urgent.`],
    needSignin: [`Bu senin ders bilgilerine bağlı — cevaplayabilmem için giriş yapman gerekiyor.`, `That depends on your own lesson data — please sign in so I can answer.`],
    forward: [`Berkay'a ilet`, `Forward to Berkay`],
    waAsk: [`WhatsApp'tan sor`, `Ask on WhatsApp`],
    fwdDone: [`İletildi. Berkay Er yanıtlayınca cevabı burada görürsün (asistanı açtığında).`, `Forwarded. When Berkay Er answers, you'll see it here (next time you open the assistant).`],
    fwdDup: [`Bu soruyu zaten ilettin; yanıt bekleniyor.`, `You already forwarded this; waiting for an answer.`],
    fwdWait: [`Az önce bir soru ilettin; yenisini göndermek için yarım dakika bekle.`, `You just forwarded a question; wait half a minute before sending another.`],
    fwdErr: [`İletilemedi ({c}). Bağlantını kontrol edip tekrar dene ya da WhatsApp'tan yaz.`, `Couldn't forward ({c}). Check your connection and retry, or message on WhatsApp.`],
    answered: [`Sorduğun "{q}" sorusunu Berkay Er yanıtladı:`, `Berkay Er answered your question "{q}":`],
    notHere: [`Bu bölüm şu an ekranda yok.`, `That section isn't on screen right now.`],
    noChange: [`Şu an saatini değiştirebileceğin bir ders yok (derse {h} saatten az kalmış, ders bir kez taşınmış, bekleyen erteleme var ya da ödeme onaylanmamış olabilir).`, `There's no lesson you can move right now (less than {h} hours left, already moved, a pending reschedule, or payment not confirmed).`],
    noResch: [`Şu an ertelenebilecek bir ders yok — nedeni ders satırındaki düğmenin yanında yazıyor.`, `No lesson can be rescheduled right now — the reason is shown next to the button on the lesson row.`],
    copied: [`Kopyalandı ✓`, `Copied ✓`],
    waText: [`Merhaba Berkay Hocam, panelde şunu sormak istiyorum: {q}`, `Hi Berkay, I have a question about the panel: {q}`],
    typing: [`Yazıyor…`, `Typing…`],
    adm: {
      title: [`Asistan soruları`, `Assistant questions`],
      desc: [`Öğrencilerin asistana sorup "Berkay'a ilet" dediği sorular. Cevabını yaz; asistan bu soruyu (ve örnek ifadeleri) öğrenir, öğrenciler hemen bu cevabı alır.`, `Questions students forwarded from the assistant. Write an answer; the assistant learns it (with the example phrasings) and students get it immediately.`],
      empty: [`Bekleyen asistan sorusu yok.`, `No pending assistant questions.`],
      answer: [`Cevapla ve öğret`, `Answer & teach`],
      del: [`Sil`, `Delete`],
      aLbl: [`Cevap (öğrenciye görünür)`, `Answer (shown to students)`],
      qLbl: [`Örnek sorular — her satıra bir ifade`, `Example questions — one per line`],
      qHelp: [`Aynı soruyu öğrencilerin nasıl sorabileceğini 2–5 farklı şekilde yazarsan asistan daha iyi tanır.`, `Writing 2–5 ways students might ask this helps the assistant recognise it.`],
      kLbl: [`Anahtar kelimeler (virgülle, isteğe bağlı)`, `Keywords (comma separated, optional)`],
      save: [`Kaydet ve öğret`, `Save & teach`],
      cancel: [`Vazgeç`, `Cancel`],
      saved: [`Kaydedildi — asistan artık bu soruyu biliyor.`, `Saved — the assistant knows this now.`],
      need: [`Cevap ve en az bir örnek soru gerekli.`, `An answer and at least one example question are required.`],
      err: [`Kaydedilemedi`, `Couldn't save`],
      faq: [`Öğrenilen cevaplar`, `Learned answers`],
      faqDel: [`Bu öğrenilmiş cevap silinsin mi?`, `Delete this learned answer?`],
      qDel: [`Bu soru silinsin mi?`, `Delete this question?`],
    },
  };
  var CHIPS = {
    signedout: [[`Deneme dersi ücretsiz mi?`, `Is the trial free?`], [`Dersler nasıl yapılıyor?`, `How are lessons held?`], [`Ders fiyatları ne kadar?`, `How much are lessons?`], [`Nasıl giriş yaparım?`, `How do I sign in?`], [`Hangi müzik türleri?`, `Which genres?`]],
    new: [[`Deneme dersi nedir?`, `What is the trial lesson?`], [`Deneme dersi nasıl alırım?`, `How do I book a trial?`], [`Paketler ve fiyatlar`, `Packages and prices`], [`Tek ders mi paket mi?`, `Single lesson or package?`], [`Seviye sınavı nedir?`, `What is the placement test?`]],
    request: [[`Hangi paketi seçmeliyim?`, `Which package should I pick?`], [`Gün ve saat nasıl seçilir?`, `How do I pick days and times?`], [`Fiyatlar ne kadar?`, `What are the prices?`], [`Erteleme hakkı nasıl hesaplanıyor?`, `How do credits work?`], [`Seviye sınavı nedir?`, `What is the placement test?`]],
    ended: [[`Paketimi nasıl yenilerim?`, `How do I renew?`], [`Kullanmadığım haklar ne olur?`, `What happens to unused credits?`], [`Fiyatlar ne kadar?`, `What are the prices?`], [`Ders onayı nedir?`, `What is lesson confirmation?`]],
    pending: [[`Talebim ne zaman onaylanır?`, `When will my request be approved?`], [`Talebimi değiştirebilir miyim?`, `Can I edit my request?`], [`Neden WhatsApp'tan yazmalıyım?`, `Why message on WhatsApp first?`], [`Seviye sınavı nedir?`, `What is the placement test?`], [`Ödemeyi nasıl yapacağım?`, `How will I pay?`]],
    rejected: [[`Talebim reddedildi, ne yapmalıyım?`, `My request was rejected — what now?`], [`Fiyatlar ne kadar?`, `What are the prices?`], [`Berkay'a nasıl ulaşırım?`, `How do I contact Berkay?`]],
    unpaid: [[`Nasıl ödeme yaparım?`, `How do I pay?`], [`IBAN bilgisi`, `IBAN details`], [`Ödemem ne zaman onaylanır?`, `When is my payment confirmed?`], [`Sıradaki dersim ne zaman?`, `When is my next lesson?`], [`Seviye sınavı nedir?`, `What is the placement test?`]],
    active: [[`Sıradaki dersim ne zaman?`, `When is my next lesson?`], [`Ders saatimi değiştirebilir miyim?`, `Can I change my lesson time?`], [`Kaç erteleme hakkım kaldı?`, `How many credits do I have?`], [`Derse nasıl katılırım?`, `How do I join the lesson?`], [`Paketim ne zaman bitiyor?`, `When does my package end?`], [`Hastayım, ne yapmalıyım?`, `I'm sick — what should I do?`]],
    trial: [[`Deneme dersim ne zaman?`, `When is my trial lesson?`], [`Derse nasıl katılırım?`, `How do I join?`], [`Deneme dersinden sonra ne olacak?`, `What happens after the trial?`], [`Saatini değiştirebilir miyim?`, `Can I change the time?`]],
  };

  function lang() { try { return W._i18n && W._i18n.getLang() === 'en' ? 'en' : 'tr'; } catch (_) { return 'tr'; } }
  function t(pair, l) { return pair[(l || lang()) === 'en' ? 1 : 0]; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(name) { return '<svg class="icon" aria-hidden="true"><use href="/assets/img/icons.svg#i-' + name + '"/></svg>'; }
  function reduced() { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } }
  function isSheet() { try { return W.matchMedia('(max-width:600px)').matches; } catch (_) { return false; } }
  // Sayfanın üst düzey let/const bağlarına (pencere özelliği olmayan) güvenli erişim. Klasik
  // betikler aynı genel sözcük ortamını paylaşır; ad sabit bir listeden gelir (kullanıcı girdisi değil).
  var _pvFn = {};
  function pv(name) {
    try {
      if (!/^[A-Za-z_$][\w$]*$/.test(name)) return undefined;
      var f = _pvFn[name] || (_pvFn[name] = new Function('return typeof ' + name + ' === "undefined" ? undefined : ' + name));
      return f();
    } catch (_) { return undefined; }
  }
  function pf(name) { var f = pv(name); return typeof f === 'function' ? f : null; }
  // Panel turu bu durumda açılabiliyor mu: sayfa "Panel turu" düğmesini yalnız turu olan durumda gösterir
  function hasTour() { var b = document.getElementById('bkTourBtn'); return !!(W.beTour && pf('bkTourStart') && b && !b.hidden); }

  // Güvenli işaretleme: önce kaçış, sonra **kalın**, "- " madde, paragraf, https bağlantısı
  function md(text) {
    var blocks = String(text || '').replace(/\r/g, '').split(/\n{2,}/);
    return blocks.map(function (b) {
      var lines = b.split('\n');
      var out = '', list = [];
      function inline(s) {
        return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/(^|[\s(])(https:\/\/[^\s<]+[^\s<.,;:!?)])/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
      }
      function flush() { if (list.length) { out += '<ul>' + list.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>'; list = []; } }
      var para = [];
      function flushP() { if (para.length) { out += '<p>' + para.map(inline).join('<br>') + '</p>'; para = []; } }
      lines.forEach(function (ln) {
        var m = ln.match(/^\s*[-•]\s+(.*)$/);
        if (m) { flushP(); list.push(m[1]); } else { flush(); if (ln.trim()) para.push(ln); }
      });
      flushP(); flush();
      return out;
    }).join('');
  }

  // ── Bağlam (yalnız okur) ─────────────────────────────────────
  var MONTHS = { tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  var DAYS = { tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
  function trStart(date, time) { return new Date(date + 'T' + time + ':00+03:00').getTime(); }
  // İstanbul saatine göre "Salı 7 Eki · 19:00"
  function fmtMs(ms, l) {
    var d = new Date(ms + 3 * 3600e3);
    var hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
    return DAYS[l][d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[l][d.getUTCMonth()] + ' · ' + hh + ':' + mm;
  }
  function fmtDate(ds, l) { var p = String(ds).split('-'); return +p[2] + ' ' + MONTHS[l][+p[1] - 1] + ' ' + p[0]; }
  function dur(ms, l) {
    var f = pf('bkDur'); if (f) return f(ms);
    var mins = Math.max(0, Math.round(ms / 60000)), d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
    if (d > 0) return l === 'en' ? d + 'd ' + h + 'h' : d + ' gün ' + h + ' sa';
    if (h > 0) return l === 'en' ? h + 'h ' + m + 'm' : h + ' sa ' + m + ' dk';
    return l === 'en' ? m + 'm' : m + ' dk';
  }
  function tl(n) { var f = pf('tlFmt'); return f ? f(n) : Math.round(n).toLocaleString('tr-TR') + ' TL'; }
  // booking.html'deki BK_BANK ({ bank, name, iban, ibanRaw }); eksik/boşsa null
  function bankInfo() {
    var b = pv('BK_BANK');
    if (!b || typeof b !== 'object') return null;
    var iban = String(b.iban || '').trim();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9 ]{10,}$/.test(iban)) return null;
    return { iban: iban, ibanRaw: String(b.ibanRaw || iban).replace(/\s+/g, ''), bank: String(b.bank || '').trim() || '—', name: String(b.name || '').trim() || '—' };
  }
  function num(name, fb) { var v = pv(name); return typeof v === 'number' ? v : fb; }

  var cache = { pt: undefined, ptFor: null, days: undefined, pend: undefined, pendFor: null };
  function curUser() {
    var u = pv('_user');
    if (u === undefined) { try { u = W.firebase && W.firebase.apps.length ? W.firebase.auth().currentUser : null; } catch (_) { u = null; } }
    return u || null;
  }
  function viewId() { var m = document.getElementById('bkMain'); return (m && m.dataset.view) || 'view-signin'; }
  function isAdminUser(u) { var e = pv('ADMIN_EMAIL') || 'berkayer032@gmail.com'; return !!(u && u.email === e); }

  function stateOf(u, view, wk) {
    if (!u) return 'signedout';
    if (view === 'view-dashboard' && wk && wk.res) return wk.isTrial ? 'trial' : wk.isPaid ? 'active' : 'unpaid';
    if (view === 'view-pending') { var box = document.getElementById('pendingStatusBox'); return box && box.querySelector('.bk-status--rejected') ? 'rejected' : 'pending'; }
    if (view === 'view-request') { var es = document.getElementById('reqEndedSlot'); return es && es.childElementCount ? 'ended' : 'request'; }
    if (view === 'view-access') return 'new';
    return 'new';
  }

  function buildContext() {
    var l = lang(), now = Date.now();
    var u = curUser(), view = viewId();
    var wk = pv('_bkWkCtx');
    var st = stateOf(u, view, wk);
    var F = KB.facts || {};
    var selfH = num('SELF_RESCHED_MIN_MS', F.selfChangeH * 3600e3) / 3600e3;
    var reschH = num('MIN_LEAD_MS', F.reschH * 3600e3) / 3600e3;
    var joinMin = num('BK_JOIN_MS', F.joinMin * 60e3) / 60e3;
    var cfmH = num('BK_CFM_WINDOW_MS', F.cfmH * 3600e3) / 3600e3;
    var flags = { signedIn: !!u, signedOut: !u, isEn: l === 'en', hasTour: hasTour(), tzDiff: new Date().getTimezoneOffset() !== -180 };
    flags['st_' + st] = true;
    var name = u ? ((u.displayName || '').trim() || (u.email || '').split('@')[0] || '') : '';
    var first = name.split(/\s+/)[0] || '';
    var vars = {
      name: first, name_comma: first ? ', ' + first : '',
      self_h: selfH, resch_h: reschH, join_min: joinMin, cfm_h: cfmH, lesson_min: F.lessonMin, late_min: F.lateMin, trial_days: F.trialMinDays,
      extra_price: tl(F.extraCreditPrice), wa_display: F.waDisplay,
    };
    // Banka / IBAN tek kaynaktan: booking.html → var BK_BANK. Yoksa IBAN'lı varyantlar atlanır
    // (yer tutucu dolmaz), cevap ödeme kartına yönlendirir; boş IBAN asla yazılmaz.
    var bank = bankInfo();
    if (bank) { vars.iban = bank.iban; vars.bank = bank.bank; vars.iban_name = bank.name; flags.bankInfo = true; }
    var price = pv('LESSON_PRICE'), single = pv('LESSON_PRICE_SINGLE');
    if (typeof price === 'number') vars.price = tl(price);
    if (typeof single === 'number') vars.price_single = tl(single);
    // Paket listesi (kampanyalar sayfanın kanonik fonksiyonlarından)
    try {
      var ap = pf('activePackages'), pp = pf('packagePrice'), pn = pf('pkgName');
      if (ap && pp) {
        var list = ap();
        if (list && list.length) {
          vars.packages = list.map(function (p) {
            var pr = pp(p);
            var nm = pn ? pn(p) : p.name;
            return l === 'en'
              ? '- **' + nm + '**: ' + p.months + ' mo · ' + p.weekly + '×/week · ' + pr.hours + ' lessons · **' + tl(pr.total) + '**' + (p.discount ? ' (' + p.discount + '% off)' : '')
              : '- **' + nm + '**: ' + p.months + ' ay · haftada ' + p.weekly + ' ders · ' + pr.hours + ' ders · **' + tl(pr.total) + '**' + (p.discount ? ' (%' + p.discount + ' indirim)' : '');
          }).join('\n');
          flags.packages = true;
          var ch = list.reduce(function (a, b) { return pp(b).perHour < pp(a).perHour ? b : a; });
          vars.cheapest = (pn ? pn(ch) : ch.name) + ' · ' + tl(pp(ch).perHour) + (l === 'en' ? ' per lesson' : ' / ders');
        }
      }
    } catch (_) {}
    if (cache.days && cache.days.length) { var dr = pf('bkDaysRange'); vars.open_days = dr ? dr(cache.days) : cache.days.join(', '); flags.openDays = true; }
    // Seviye sınavı
    var quiz = W.bkQuiz;
    if (quiz && quiz.questions) vars.pt_n = quiz.questions.length;
    if (u && cache.ptFor === u.uid) {
      if (cache.pt) {
        flags.ptDone = true;
        var lv = cache.pt, lvl = l === 'en' ? (lv.level_en || lv.level_tr || lv.level) : (lv.level_tr || lv.level_en || lv.level);
        if (!lvl && typeof lv.score === 'number' && quiz && quiz.levelFor) { var x = quiz.levelFor(lv.score); lvl = x && x[l]; }
        vars.level = lvl || '—';
        vars.score_txt = typeof lv.score === 'number' ? ' · ' + lv.score + '/100' : ' ';
      } else if (cache.pt === null) flags.ptMissing = true;
    }
    // Bekleyen / reddedilen talep
    if ((st === 'pending' || st === 'rejected') && cache.pend && cache.pendFor === (u && u.uid)) {
      var r = cache.pend;
      flags.pendTrial = r.lesson_type === 'trial';
      vars.pend_type = r.lesson_type === 'trial' ? (l === 'en' ? 'trial lesson' : 'deneme dersi') : r.lesson_type === 'single' ? (l === 'en' ? 'single lesson' : 'tek ders') : (l === 'en' ? 'package' : 'paket');
      if (r.trial_date && r.trial_time) vars.pend_when = fmtMs(trStart(r.trial_date, r.trial_time), l);
      else if (r.preferred_start_date) vars.pend_when = fmtDate(r.preferred_start_date, l);
    }
    // Rezervasyon (panel)
    if (wk && wk.res && (st === 'active' || st === 'unpaid' || st === 'trial')) {
      var res = wk.res;
      flags.dash = true; flags.paid = !!wk.isPaid; flags.paidOrTrial = !!(wk.isPaid || wk.isTrial);
      flags.payPending = !!res.payment_pending && !wk.isPaid;
      flags.needPhone = !res.student_phone;
      var dd = pf('dedupLessons');
      var lessons = (dd ? dd(res.lessons || []) : (res.lessons || [])).filter(function (x) { return x && x.date && x.time; });
      var live = lessons.filter(function (x) { return x.status !== 'cancelled'; });
      var upcoming = lessons.filter(function (x) { return (x.status === 'scheduled' || x.status === 'rescheduled') && trStart(x.date, x.time) + 3600e3 > now; })
        .sort(function (a, b) { return trStart(a.date, a.time) - trStart(b.date, b.time); });
      var today = new Date(now + 3 * 3600e3).toISOString().slice(0, 10);
      flags.frozen = lessons.some(function (x) { return x.status === 'frozen' && x.date >= today; });
      vars.left_count = upcoming.length;
      vars.done_count = lessons.filter(function (x) { return x.status === 'completed'; }).length;
      vars.total_count = live.length;
      var lastD = live.map(function (x) { return x.date; }).sort().pop();
      if (lastD) vars.end = fmtDate(lastD, l);
      var ds = document.getElementById('dashSub'); if (ds && ds.textContent.trim()) vars.plan = ds.textContent.trim();
      var rtp = pf('reservationTotalPrice'); if (rtp) { try { vars.total = tl(rtp(res)); } catch (_) {} }
      var trc = pf('totalRescheduleCredits');
      var credits = trc ? trc(res) : 0, pend = (wk.pendingSet && wk.pendingSet.size) || 0;
      vars.credits = credits; vars.credits_pending = pend; vars.credits_avail = Math.max(0, credits - pend); vars.pkg_months = res.duration_months || 1;
      flags.hasCredits = credits > 0; flags.creditsAvail = credits - pend > 0; flags.creditsInPending = pend > 0 && credits > 0;
      // Bu hafta
      var wd = pf('bkWeekDates'), td = pf('bkTrToday');
      var week = wd && td ? wd(td()) : [];
      var wl = lessons.filter(function (x) { return week.indexOf(x.date) >= 0 && x.status !== 'cancelled'; })
        .sort(function (a, b) { return trStart(a.date, a.time) - trStart(b.date, b.time); });
      var stl = { scheduled: ['planlandı', 'scheduled'], rescheduled: ['ertelendi', 'rescheduled'], completed: ['tamamlandı', 'completed'], frozen: ['donduruldu', 'frozen'], cancel_requested: ['iptal talebi', 'cancel requested'] };
      if (wl.length) { flags.weekAny = true; vars.week_list = wl.map(function (x) { var s2 = stl[x.status]; return '- **' + fmtMs(trStart(x.date, x.time), l) + '**' + (s2 ? ' (' + s2[l === 'en' ? 1 : 0] + ')' : ''); }).join('\n'); }
      // Onay bekleyen ders
      var cs = pf('bkCfmState');
      if (cs) flags.cfmOpen = lessons.some(function (x) { try { return cs(x, now) === 'open'; } catch (_) { return false; } });
      // Saati değiştirilebilir herhangi bir ders (sıradaki değilse de seçici açılabilir)
      var wsAny = pf('bkWkState');
      var anyL = wsAny ? upcoming.filter(function (x) { try { return wsAny(x, now, wk).actionable; } catch (_) { return false; } })[0] : null;
      flags.anyChange = !!anyL;
      // sıradaki ders taşınamıyorsa cevap, seçicinin açacağı dersi (ilk taşınabilir ders) adıyla söyler
      if (anyL) vars.change_any = fmtMs(trStart(anyL.date, anyL.time), l);
      // Sıradaki ders
      var nx = upcoming[0];
      vars.next_line = '';
      if (nx) {
        var ms = trStart(nx.date, nx.time);
        flags.hasNext = true;
        vars.next = fmtMs(ms, l);
        vars.next_in = ms > now ? dur(ms - now, l) : (l === 'en' ? 'now' : 'şimdi');
        vars.next_line = l === 'en' ? ' Your next lesson: **' + vars.next + '**.' : ' Sıradaki dersin: **' + vars.next + '**.';
        if (wk.isTrial) vars.trial = vars.next;
        flags.nextToday = nx.date === today;
        flags.joinOpen = ms - now <= joinMin * 60e3 && now < ms + 3600e3;
        flags.zoomLink = !!pv('_bkZoomLink');
        var key = nx.date + '_' + nx.time;
        var pendNext = !!(wk.pendingSet && wk.pendingSet.has && wk.pendingSet.has(key));
        var ws = pf('bkWkState');
        var s = null; try { s = ws ? ws(nx, now, wk) : null; } catch (_) {}
        if (s) {
          flags.canChange = !!s.actionable;
          flags.changeMoved = s.kind === 'moved';
          flags.changeLocked = s.kind === 'locked' || s.kind === 'join' || s.kind === 'live';
          flags.reschPendingNext = s.kind === 'resched' || pendNext;
        } else {
          var left = ms - now;
          flags.changeMoved = !!nx.self_changed;
          flags.changeLocked = left < selfH * 3600e3;
          flags.reschPendingNext = pendNext;
          flags.canChange = flags.paidOrTrial && !flags.changeMoved && !flags.changeLocked && !pendNext;
        }
        if (flags.canChange) { vars.change_until = fmtMs(ms - selfH * 3600e3, l); vars.change_left = dur(ms - selfH * 3600e3 - now, l); }
        flags.reschTooSoon = ms - now < reschH * 3600e3;
        flags.canResch = !!wk.isPaid && !wk.isTrial && nx.status === 'scheduled' && !pendNext && !flags.reschTooSoon && credits - pend > 0;
        if (!flags.reschTooSoon) vars.resch_until = fmtMs(ms - reschH * 3600e3, l);
      }
    }
    return { state: st, flags: flags, vars: vars, lang: l, user: u };
  }

  // Açılışta bir kez okunan veriler (yalnız okuma; sayfa zaten aynı belgeleri okur)
  function prefetch() {
    var u = curUser(); if (!u || !W.firebase) return Promise.resolve();
    var db; try { db = W.firebase.firestore(); } catch (_) { return Promise.resolve(); }
    var jobs = [];
    if (cache.ptFor !== u.uid) {
      var lo = pf('ptLoadOwn');
      jobs.push((lo ? lo() : db.collection('placement_tests').doc(u.uid).get().then(function (s) { return s.exists ? s.data() : null; }))
        .then(function (d) { cache.pt = d || null; cache.ptFor = u.uid; }).catch(function () {}));
    }
    if (cache.days === undefined) {
      jobs.push(db.collection('settings').doc('global').get().then(function (s) {
        var d = s.exists ? s.data().available_days : null; cache.days = Array.isArray(d) ? d : null;
      }).catch(function () { cache.days = null; }));
    }
    var lc = pf('loadCampaigns'); if (lc) { try { jobs.push(Promise.resolve(lc()).catch(function () {})); } catch (_) {} }
    var v = viewId();
    if ((v === 'view-pending') && cache.pendFor !== u.uid) {
      jobs.push(db.collection('lesson_requests').where('from_uid', '==', u.uid).get().then(function (qs) {
        var docs = qs.docs.map(function (d) { return d.data(); }).filter(function (d) { return ['pending', 'rejected'].indexOf(d.status) >= 0 && (!d.type || d.type === 'lesson' || d.lesson_type); })
          .sort(function (a, b) { return ((b.created_at && b.created_at.seconds) || 0) - ((a.created_at && a.created_at.seconds) || 0); });
        cache.pend = docs[0] || null; cache.pendFor = u.uid;
      }).catch(function () {}));
    }
    return Promise.all(jobs);
  }

  // ── Öğrenilen cevaplar (assistant_faq) ───────────────────────
  var faqDocs = [], kbAll = { intents: KB.intents, synonyms: KB.synonyms, combos: KB.combos, facts: KB.facts }, faqUnsub = null;
  function faqToIntent(id, d) {
    var q = Array.isArray(d.q) ? d.q : (d.q ? [String(d.q)] : []);
    q = q.map(function (s) { return String(s).trim(); }).filter(Boolean).slice(0, 30);
    if (!q.length || !d.a) return null;
    // raw: öğretmenin metni olduğu gibi gösterilir — içindeki {kelime} şablon sayılmaz (dolmazsa cevap boş kalırdı)
    return { id: 'faq:' + id, learned: true, raw: true, ex: { tr: q }, kw: Array.isArray(d.keywords) ? d.keywords.slice(0, 20).map(String) : [],
      a: { tr: String(d.a), en: String(d.a_en || d.a) }, actions: [] };
  }
  function rebuildKb() {
    var extra = faqDocs.map(function (x) { return faqToIntent(x.id, x.d); }).filter(Boolean);
    kbAll = { intents: KB.intents.concat(extra), synonyms: KB.synonyms, combos: KB.combos, facts: KB.facts };
  }
  function watchFaq() {
    if (faqUnsub || !W.firebase || !curUser()) return;
    try {
      faqUnsub = W.firebase.firestore().collection('assistant_faq').onSnapshot(function (qs) {
        faqDocs = qs.docs.map(function (d) { return { id: d.id, d: d.data() }; });
        rebuildKb();
        if (admEl) admRenderFaq();
      }, function () { faqUnsub = null; });
    } catch (_) { faqUnsub = null; }
  }
  function unwatchFaq() { if (faqUnsub) { try { faqUnsub(); } catch (_) {} faqUnsub = null; } faqDocs = []; rebuildKb(); }

  // ── DOM ──────────────────────────────────────────────────────
  var fab, panel, scrim, log, chipsEl, form, input, sendBtn, opened = false, lastFocus = null, conv = { last: null, lastText: '' };
  var forwarded = {}, lastFwdAt = 0;

  function build() {
    if (fab) return;
    fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'be-asst-fab'; fab.hidden = true;
    fab.setAttribute('aria-haspopup', 'dialog'); fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'beAsst');
    fab.innerHTML = icon('chat') + '<span class="be-asst-fab-t"></span><span class="be-asst-fab-dot" hidden></span>';
    fab.addEventListener('click', function () { open(); });
    scrim = document.createElement('div'); scrim.className = 'be-asst-scrim'; scrim.hidden = true;
    scrim.addEventListener('click', function () { close(); });
    panel = document.createElement('section');
    panel.id = 'beAsst'; panel.className = 'be-asst'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'beAsstT');
    panel.innerHTML =
      '<header class="be-asst-head"><span class="be-asst-mark" aria-hidden="true">BE</span>' +
      '<div class="be-asst-titles"><h2 class="be-asst-h" id="beAsstT"></h2><p class="be-asst-sub"></p></div>' +
      '<button type="button" class="be-asst-x">' + icon('x') + '</button></header>' +
      '<div class="be-asst-log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<div class="be-asst-chips" role="group"></div>' +
      '<form class="be-asst-form" autocomplete="off"><label class="sr-only" for="beAsstIn"></label>' +
      '<input id="beAsstIn" class="be-asst-in" type="text" maxlength="300" enterkeyhint="send" autocomplete="off">' +
      '<button type="submit" class="be-asst-send">' + icon('arrow-right') + '</button></form>' +
      '<p class="be-asst-foot"></p>';
    log = panel.querySelector('.be-asst-log'); chipsEl = panel.querySelector('.be-asst-chips');
    form = panel.querySelector('form'); input = panel.querySelector('input'); sendBtn = panel.querySelector('.be-asst-send');
    panel.querySelector('.be-asst-x').addEventListener('click', function () { close(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value.trim(); if (!v) return; input.value = ''; ask(v); });
    panel.addEventListener('keydown', onKey);
    document.body.append(scrim, panel, fab);
    paintStatic();
  }
  function paintStatic() {
    if (!fab) return;
    fab.querySelector('.be-asst-fab-t').textContent = t(S.fab);
    fab.setAttribute('aria-label', t(S.fabAria));
    panel.querySelector('#beAsstT').textContent = t(S.title);
    panel.querySelector('.be-asst-sub').textContent = t(S.sub);
    panel.querySelector('.be-asst-x').setAttribute('aria-label', t(S.close));
    panel.querySelector('label').textContent = t(S.inLabel);
    input.placeholder = t(S.ph);
    sendBtn.setAttribute('aria-label', t(S.send));
    chipsEl.setAttribute('aria-label', t(S.chipsAria));
    panel.querySelector('.be-asst-foot').textContent = t(S.foot);
  }

  // a[href]: ikonlardaki SVG <use href> odaklanamaz; görünürlük getClientRects ile (offsetParent SVG'de tanımsız)
  function focusables() {
    return Array.prototype.filter.call(panel.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.getClientRects().length > 0; });
  }
  // Telefonda alt sayfa açıkken arkadaki sayfa etkisiz (inert): Tab ve ekran okuyucu örtünün arkasına geçmez
  var inerted = [];
  function setInert(on) {
    if (on) {
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el === panel || el === scrim || el.inert || el.tagName === 'SCRIPT') return;
        el.inert = true; inerted.push(el);
      });
    } else { inerted.forEach(function (el) { el.inert = false; }); inerted = []; }
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab' && isSheet()) {
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  function onDocKey(e) { if (opened && e.key === 'Escape' && !panel.contains(document.activeElement) && !document.querySelector('.modal-overlay')) close(); }

  function open() {
    if (!panel || opened) return;
    // açık panel turu asistanın üstünde kalır (aynı katman): asistan açılınca tur kapanır
    try { if (W.beTour && W.beTour.current && W.beTour.current.active) W.beTour.current.stop('assistant'); } catch (_) {}
    opened = true; lastFocus = document.activeElement;
    var sheet = isSheet();
    // aria-modal yalnız telefonda ve yalnız açıkken: kapalı panelde kalırsa sayfa (tur, pencere sırası)
    // açık bir pencere var sanar
    if (sheet) panel.setAttribute('aria-modal', 'true'); else panel.removeAttribute('aria-modal');
    scrim.hidden = !sheet;
    panel.hidden = false; fab.hidden = true; fab.setAttribute('aria-expanded', 'true');
    if (sheet) { document.documentElement.style.overflow = 'hidden'; setInert(true); }
    document.addEventListener('keydown', onDocKey);
    if (!log.childElementCount) greet();
    prefetch().then(function () { renderChips(); checkAnswered(); });
    watchFaq();
    setTimeout(function () { input.focus({ preventScroll: true }); }, reduced() ? 0 : 60);
  }
  function close(noFocus) {
    if (!opened) return;
    opened = false;
    panel.removeAttribute('aria-modal'); setInert(false);
    panel.hidden = true; scrim.hidden = true; document.documentElement.style.overflow = '';
    fab.setAttribute('aria-expanded', 'false');
    syncVisibility();
    document.removeEventListener('keydown', onDocKey);
    if (!noFocus) { var target = (lastFocus && document.contains(lastFocus) && lastFocus !== document.body) ? lastFocus : fab; try { target.focus({ preventScroll: true }); } catch (_) {} }
  }

  function scrollLog() { log.scrollTop = log.scrollHeight; }
  function addMsg(kind, html, opts) {
    var o = opts || {};
    var m = document.createElement('div');
    m.className = 'be-asst-msg is-' + kind + (o.learned ? ' is-learned' : '');
    var who = kind === 'user' ? t(S.you) : o.learned ? t(S.learned) : t(S.bot);
    m.innerHTML = '<span class="be-asst-who">' + esc(who) + '</span><div class="be-asst-bubble">' + html + '</div>';
    log.append(m); scrollLog();
    return m;
  }
  function greet() {
    var ctx = buildContext();
    var hi = ctx.user ? t(S.hello).replace('{n}', ctx.vars.name ? ', ' + esc(ctx.vars.name) : '') : t(S.helloOut);
    addMsg('bot', md(hi));
    renderChips();
  }
  function renderChips() {
    if (!chipsEl) return;
    var ctx = buildContext();
    var list = CHIPS[ctx.state] || CHIPS.new;
    chipsEl.innerHTML = '';
    list.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'be-asst-chip'; b.textContent = t(c);
      b.addEventListener('click', function () { ask(b.textContent); });
      chipsEl.append(b);
    });
  }

  // ── Soru → cevap ─────────────────────────────────────────────
  function intentById(id) { for (var i = 0; i < kbAll.intents.length; i++) if (kbAll.intents[i].id === id) return kbAll.intents[i]; return null; }
  function ask(text) {
    var q = String(text).slice(0, 300);
    addMsg('user', esc(q));
    var ctx = buildContext();
    var ql = A.detectLang(q);
    var l = ql || ctx.lang;
    var r = A.match(q, kbAll, { state: ctx.state, last: conv.last });
    conv.lastText = q;
    if (r.intent && r.confident) { answer(intentById(r.intent), ctx, l, q); conv.last = { intent: r.intent }; return; }
    if (r.intent && r.score >= A.thresholds.hi && r.coverage >= A.thresholds.cov) {
      // Yakın iki niyet arasında kararsız: en olası cevap + altında "bunu mu demek istedin?"
      var alts = r.alternatives.filter(function (a) { return a.id !== r.intent; }).slice(0, 2);
      answer(intentById(r.intent), ctx, l, q, alts);
      conv.last = { intent: r.intent };
      return;
    }
    // Sorunun çoğu tanınmadı: tahmin yerine yalnız soruyla gerçekten örtüşen seçenekler + Berkay'a ilet;
    // örtüşen yoksa alakasız düğme göstermeden "bilmiyorum"
    var sug = r.suggestions || r.alternatives.slice(0, 3);
    if (r.intent && sug.length) { suggest(sug, ctx, l, q); return; }
    unknown(q, ctx, l);
  }
  function exampleLabel(it, l) {
    if (it.label && (it.label[l] || it.label.tr)) return it.label[l] || it.label.tr;
    var ex = it.ex || {};
    var arr = (l === 'en' && ex.en && ex.en.length ? ex.en : ex.tr) || [];
    // KB'de ilk örnekler ayarlamada eklenmiş olabilir: "?" ile biten, büyük harfle başlayan örnek tercih
    var pretty = arr.filter(function (s) { return /\?$/.test(s) && /^[A-ZÇĞİÖŞÜ]/.test(s); })[0]
      || arr.filter(function (s) { return /^[A-ZÇĞİÖŞÜ]/.test(s); })[0];
    return pretty || arr[0] || it.id;
  }
  function answer(it, ctx, l, q, alts) {
    if (!it) return unknown(q, ctx, l);
    if (!ctx.user && !it.pub && !it.learned) {
      var m0 = addMsg('bot', md(t(S.needSignin, l)));
      addActions(m0, [{ do: 'signin', label: { tr: `Giriş yap`, en: `Sign in` } }], ctx, l, q);
      return;
    }
    // Soruya bağlı bayrak: prodüksiyon sorusu (mix, kick…) → "Soru Sor"a yönlendiren varyant
    var qa = q ? A.analyze(q, kbAll) : null;
    ctx.flags.qProd = !!(qa && qa.tokens.indexOf('@produksiyon') >= 0);
    ctx.flags.qOneri = !!(qa && (qa.flags || []).indexOf('@oneri') >= 0);   // "en iyi …", "marka öner"
    var out = A.render(it, ctx, l);
    var m = addMsg('bot', md(out.text), { learned: !!it.learned });
    addActions(m, out.actions, ctx, l, q);
    if (alts && alts.length) {
      var box = document.createElement('div');
      box.innerHTML = '<span class="be-asst-alt-h">' + esc(t(S.unsure, l)) + '</span>';
      var row = document.createElement('div'); row.className = 'be-asst-chips';
      alts.forEach(function (a) {
        var ai = intentById(a.id); if (!ai) return;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'be-asst-chip'; b.textContent = exampleLabel(ai, l);
        b.addEventListener('click', function () { pick(ai); });
        row.append(b);
      });
      box.append(row); m.append(box); scrollLog();
    }
  }
  function pick(it) {
    var l = lang();
    addMsg('user', esc(exampleLabel(it, l)));
    var ctx = buildContext();
    answer(it, ctx, l, conv.lastText);
    conv.last = { intent: it.id };
  }
  function suggest(alts, ctx, l, q) {
    var m = addMsg('bot', md(t(S.unsure, l)));
    var row = document.createElement('div'); row.className = 'be-asst-chips';
    alts.forEach(function (a) {
      var ai = intentById(a.id); if (!ai) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'be-asst-chip'; b.textContent = exampleLabel(ai, l);
      b.addEventListener('click', function () { pick(ai); });
      row.append(b);
    });
    m.append(row);
    addActions(m, [{ do: 'forward', label: { tr: S.forward[0], en: S.forward[1] }, if: 'signedIn' }, { do: 'wa', ask: true, label: { tr: S.waAsk[0], en: S.waAsk[1] } }], ctx, l, q);
  }
  function unknown(q, ctx, l) {
    var m = addMsg('bot', md(t(ctx.user ? S.unknown : S.unknownOut, l)));
    addActions(m, [
      { do: 'forward', label: { tr: S.forward[0], en: S.forward[1] }, if: 'signedIn' },
      { do: 'wa', ask: true, label: { tr: S.waAsk[0], en: S.waAsk[1] } },
      { do: 'signin', label: { tr: `Giriş yap`, en: `Sign in` }, if: 'signedOut' },
    ], ctx, l, q);
    conv.last = null;
  }
  function flagsOk(cond, flags) {
    if (!cond) return true;
    return String(cond).split(/\s+/).filter(Boolean).every(function (f) { var n = f.charAt(0) === '!'; var v = !!flags[n ? f.slice(1) : f]; return n ? !v : v; });
  }
  function addActions(msgEl, actions, ctx, l, q) {
    var list = (actions || []).filter(function (a) { return flagsOk(a.if, ctx.flags); });
    if (!list.length) return;
    var row = document.createElement('div'); row.className = 'be-asst-acts';
    list.slice(0, 3).forEach(function (a, i) {
      var b = document.createElement('button'); b.type = 'button';
      b.className = 'btn ' + (i === 0 ? 'btn-light' : 'btn-subtle');
      b.textContent = (a.label && (a.label[l] || a.label.tr)) || a.do;
      b.addEventListener('click', function () { act(a, b, q); });
      row.append(b);
    });
    msgEl.append(row); scrollLog();
  }

  // ── Eylemler ─────────────────────────────────────────────────
  function visible(el) { return !!(el && el.getClientRects().length && !el.closest('[hidden]')); }
  function flash(el) {
    if (!el) return;
    var d = el.tagName === 'DETAILS' ? el : el.closest('details');
    if (d && !d.open) d.open = true;
    el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    el.classList.add('be-asst-flash');
    setTimeout(function () { el.classList.remove('be-asst-flash'); }, 2600);
    if (!el.matches('a,button,input,textarea,select,summary,[tabindex]')) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (_) {}
  }
  function say(pair) { if (!opened) open(); addMsg('bot', md(t(pair))); }
  function waHref() {
    var a = document.querySelector('.wa-fab');
    var h = a && a.getAttribute('href');
    return h && /^https:\/\/wa\.me\/\d+$/.test(h) ? h : 'https://wa.me/' + (KB.facts.wa || '');
  }
  function act(a, btn, q) {
    var ctx = buildContext();
    switch (a.do) {
      case 'scroll': {
        var el = document.querySelector(a.target);
        if (!visible(el)) return say(S.notHere);
        if (a.open) { var det = el.tagName === 'DETAILS' ? el : el.querySelector('details'); if (det) det.open = true; }
        close(true); flash(el); return;
      }
      case 'rules': {
        var h = document.querySelector('#bkSide [data-i18n="bk_rule_title"]');
        var d = h && h.closest('details');
        if (!visible(d)) return say(S.notHere);
        close(true); flash(d); return;
      }
      case 'qa': {
        var qa = document.getElementById('studentQACard');
        if (!visible(qa)) return say(S.notHere);
        close(true); flash(qa);
        var ti = document.getElementById('studentQAInput'); if (ti) setTimeout(function () { ti.focus({ preventScroll: true }); }, 400);
        return;
      }
      case 'selfchange': {
        var wk = pv('_bkWkCtx'), ws = pf('bkWkState'), go = pf('bkWkGoTo'), of = pf('bkWkOpenFor'), wd = pf('bkWeekDates'), td = pf('bkTrToday');
        if (!wk || !wk.res || !ws) return say(S.notHere);
        var now = Date.now();
        var dd = pf('dedupLessons');
        var ls = (dd ? dd(wk.res.lessons || []) : (wk.res.lessons || [])).filter(function (x) { return x.status === 'scheduled' || x.status === 'rescheduled'; })
          .sort(function (x, y) { return trStart(x.date, x.time) - trStart(y.date, y.time); });
        var target = ls.filter(function (x) { try { return ws(x, now, wk).actionable; } catch (_) { return false; } })[0];
        if (!target) { if (!opened) open(); addMsg('bot', md(t(S.noChange).replace('{h}', ctx.vars.self_h))); return; }
        close(true);
        var week = wd && td ? wd(td()) : [];
        if (week.indexOf(target.date) >= 0 && go) go(target.date + '_' + target.time);
        else if (of) of(target, 'row');
        return;
      }
      case 'resched': {
        var rb = Array.prototype.filter.call(document.querySelectorAll('#lessonList .bk-resched'), function (b) { return !b.disabled && visible(b); })[0];
        if (!rb) { if (!opened) open(); addMsg('bot', md(t(S.noResch))); return; }
        close(true); rb.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); rb.click(); return;
      }
      case 'extraCredit': {
        if (typeof W._openExtraCreditModal !== 'function') return say(S.notHere);
        close(true); W._openExtraCreditModal(); return;
      }
      case 'extraLesson': {
        var xb = document.querySelector('#extraLessonBox button');
        if (!visible(xb) || xb.disabled) return say(S.notHere);
        close(true); xb.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); xb.click(); return;
      }
      case 'placement': {
        var op = pf('openPlacementModal'); if (!op) return say(S.notHere);
        close(true); op(); return;
      }
      case 'trial': {
        var tp = document.getElementById('trialPanel'); if (!visible(tp)) return say(S.notHere);
        close(true); tp.click(); flash(document.getElementById('trialForm') || tp); return;
      }
      case 'packages': {
        if (!ctx.user) { close(true); if (W.bkAuth) W.bkAuth.openLogin(); return; }
        var pk = document.getElementById('packagePanel');
        if (visible(pk)) { close(true); pk.click(); setTimeout(function () { flash(document.getElementById('pkgTable')); }, 120); return; }
        var tb = document.getElementById('pkgTable');
        if (visible(tb)) { close(true); flash(tb); return; }
        return say(S.notHere);
      }
      case 'copyIban': {
        var bk = bankInfo(); if (!bk) return say(S.notHere);
        try { navigator.clipboard.writeText(bk.ibanRaw); } catch (_) {}
        btn.textContent = t(S.copied); return;
      }
      case 'wa': {
        var href = waHref();
        if (a.ask && q) href += '?text=' + encodeURIComponent(t(S.waText).replace('{q}', q));
        W.open(href, '_blank', 'noopener'); return;
      }
      case 'signin': { close(true); if (W.bkAuth && W.bkAuth.openLogin) W.bkAuth.openLogin(); return; }
      case 'url': { if (/^\/[a-z0-9-]*$/.test(a.href)) W.location.href = a.href; return; }
      case 'lang': { if (W._i18n && W._i18n.setLang) W._i18n.setLang(a.to); paintStatic(); renderChips(); return; }
      case 'tour': {
        // sayfanın tur başlatıcısı (booking.html bkTourStart → beTour.create); yoksa görünür "Panel turu" düğmesi
        var ts = pf('bkTourStart'), tb2 = document.getElementById('bkTourBtn');
        if (!W.beTour || (!ts && !visible(tb2))) return say(S.notHere);
        close(true);
        if (ts) ts(); else tb2.click();
        return;
      }
      case 'forward': return forward(q || conv.lastText, btn);
    }
  }

  // ── Berkay'a ilet (öğrenme döngüsü) ──────────────────────────
  function forward(text, btn) {
    var u = curUser(); var q = String(text || '').trim().slice(0, 500);
    if (!u || !q || !W.firebase) return;
    if (forwarded[q]) { addMsg('bot', md(t(S.fwdDup))); return; }
    if (Date.now() - lastFwdAt < 30e3) { addMsg('bot', md(t(S.fwdWait))); return; }
    if (btn) btn.disabled = true;
    var ctx = buildContext();
    // Soru + öğrencinin iletme sınırı belgesi tek toplu yazımda (kurallar: 30 sn'de bir, created_at = sunucu saati)
    var db = W.firebase.firestore(), ts = W.firebase.firestore.FieldValue.serverTimestamp();
    var batch = db.batch();
    batch.set(db.collection('assistant_limits').doc(u.uid), { last_at: ts });
    batch.set(db.collection('assistant_questions').doc(), {
      uid: u.uid,
      name: ((u.displayName || '').trim() || (u.email || '').split('@')[0] || '').slice(0, 80),
      text: q, state: ctx.state, lang: ctx.lang, answered: false,
      created_at: ts,
    });
    batch.commit().then(function () {
      forwarded[q] = 1; lastFwdAt = Date.now();
      addMsg('bot', md(t(S.fwdDone)));
    }).catch(function (e) {
      if (btn) btn.disabled = false;
      if (e && e.code === 'permission-denied') { addMsg('bot', md(t(S.fwdWait))); return; }   // başka sekmeden az önce iletildi
      var c = '#' + Math.random().toString(36).slice(2, 5).toUpperCase();
      try { console.warn('[asistan] ilet', c, e && (e.code || e.message)); } catch (_) {}
      addMsg('bot', md(t(S.fwdErr).replace('{c}', c)));
    });
  }
  // Öğrencinin ilettiği ve yanıtlanan soruları (görülmemişse) panelde gösterir
  function seenKey(u) { return 'be-asst-seen:' + u.uid; }
  function getSeen(u) { try { return JSON.parse(localStorage.getItem(seenKey(u)) || '[]'); } catch (_) { return []; } }
  function setSeen(u, arr) { try { localStorage.setItem(seenKey(u), JSON.stringify(arr.slice(-100))); } catch (_) {} }
  function checkAnswered() {
    var u = curUser(); if (!u || !W.firebase || isAdminUser(u)) return;
    W.firebase.firestore().collection('assistant_questions').where('uid', '==', u.uid).get().then(function (qs) {
      var seen = getSeen(u), news = [];
      qs.forEach(function (d) { var x = d.data(); if (x.answered && x.answer && seen.indexOf(d.id) < 0) news.push({ id: d.id, x: x }); });
      if (!news.length) { setDot(false); return; }
      if (!opened) { setDot(true); return; }
      news.forEach(function (n) {
        addMsg('bot', md(t(S.answered).replace('{q}', n.x.text.length > 80 ? n.x.text.slice(0, 80) + '…' : n.x.text) + '\n\n' + n.x.answer), { learned: true });
        seen.push(n.id);
      });
      setSeen(u, seen); setDot(false);
    }).catch(function () {});
  }
  function setDot(on) { var d = fab && fab.querySelector('.be-asst-fab-dot'); if (d) d.hidden = !on; }

  // ── Görünürlük ───────────────────────────────────────────────
  function syncVisibility() {
    if (!fab) return;
    var u = curUser();
    var view = viewId();
    var hide = isAdminUser(u) || !!pv('_bkAdminPreview') || view === 'view-admin';
    if (hide && opened) close(true);
    fab.hidden = hide || opened;
  }

  // ── Admin kartı ─────────────────────────────────────────────
  var admEl = null, admUnsub = null, admQs = [];
  function admMount() {
    var mount = document.getElementById('beAsstAdmin');
    if (!mount) return;
    admEl = mount;
    mount.hidden = false;
    var l = lang();
    mount.innerHTML =
      '<div class="be-asst-adm-head"><h2 class="adm-h2 adm-h2--sm" id="beAsstAdmT">' + esc(t(S.adm.title, l)) + '</h2><span class="adm-k adm-k--gold" id="beAsstAdmN"></span></div>' +
      '<p class="adm-desc">' + esc(t(S.adm.desc, l)) + '</p>' +
      '<div class="be-asst-adm-list" id="beAsstAdmList"></div>' +
      '<details class="be-asst-adm-faq"><summary>' + icon('chevron-down') + '<span>' + esc(t(S.adm.faq, l)) + ' (<span id="beAsstAdmFaqN">0</span>)</span></summary><div id="beAsstAdmFaq"></div></details>';
    if (!admUnsub && W.firebase) {
      admUnsub = W.firebase.firestore().collection('assistant_questions').where('answered', '==', false).onSnapshot(function (qs) {
        admQs = qs.docs.map(function (d) { return { id: d.id, x: d.data() }; })
          .sort(function (a, b) { return ((b.x.created_at && b.x.created_at.seconds) || 0) - ((a.x.created_at && a.x.created_at.seconds) || 0); });
        admRender();
      }, function (e) { var li = document.getElementById('beAsstAdmList'); if (li) li.innerHTML = '<div class="adm-empty is-err">' + esc(e && (e.code || e.message)) + '</div>'; });
    }
    admRender(); admRenderFaq();
  }
  // Yanıt bekleyen soru sayısı "WhatsApp & sorular" menü/sekme rozetine eklenir (booking.html admUpdateCounts)
  function admNavCount(k) {
    if (pv('_admAsstOpen') === undefined) return;
    W._admAsstOpen = k;
    var uc = pf('admUpdateCounts'); if (uc) { try { uc(); } catch (_) {} }
  }
  function admUnmount() {
    if (admUnsub) { try { admUnsub(); } catch (_) {} admUnsub = null; }
    admQs = []; admNavCount(0);
    if (admEl) { admEl.hidden = true; admEl.innerHTML = ''; admEl = null; }
  }
  var STATE_LBL = { active: ['aktif', 'active'], unpaid: ['ödeme bekliyor', 'unpaid'], trial: ['deneme', 'trial'], pending: ['talep bekliyor', 'pending'], rejected: ['reddedildi', 'rejected'], new: ['yeni', 'new'], request: ['talep formu', 'request form'], ended: ['paketi bitti', 'ended'], signedout: ['girişsiz', 'signed out'] };
  function admWhen(ts) { try { var d = ts && ts.toDate ? ts.toDate() : null; return d ? d.toLocaleString(lang() === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; } catch (_) { return ''; } }
  function admRender() {
    var list = document.getElementById('beAsstAdmList'); if (!list) return;
    var l = lang();
    var n = document.getElementById('beAsstAdmN'); if (n) n.textContent = admQs.length ? String(admQs.length) : '';
    admNavCount(admQs.length);
    if (!admQs.length) { list.innerHTML = '<div class="adm-empty">' + esc(t(S.adm.empty, l)) + '</div>'; return; }
    list.innerHTML = '';
    admQs.forEach(function (q, qi) {
      var x = q.x;
      // Form alanı id'leri satır sırasından üretilir — belge id'si (Firestore'dan gelir) asla HTML'e yazılmaz
      var fid = 'baR' + qi;
      var row = document.createElement('div'); row.className = 'be-asst-adm-q';
      var sl = Object.prototype.hasOwnProperty.call(STATE_LBL, x.state) ? STATE_LBL[x.state] : null;
      row.innerHTML = '<p class="be-asst-adm-qt"></p>' +
        '<div class="be-asst-adm-meta"><strong></strong>' + (sl ? '<span class="adm-chip adm-chip--info">' + esc(sl[l === 'en' ? 1 : 0]) + '</span>' : '') + '<span>' + esc(admWhen(x.created_at)) + '</span></div>' +
        '<div class="be-asst-adm-row"><button type="button" class="btn btn-sm btn-primary" data-a="open"></button><button type="button" class="btn btn-sm btn-danger" data-a="del"></button></div>' +
        '<form class="be-asst-adm-form" hidden>' +
          '<label class="field-label" for="' + fid + 'A"></label><textarea class="textarea" id="' + fid + 'A" rows="4" maxlength="2000" required></textarea>' +
          '<label class="field-label" for="' + fid + 'Q"></label><textarea class="textarea" id="' + fid + 'Q" rows="3" maxlength="1500"></textarea><p class="field-help"></p>' +
          '<label class="field-label" for="' + fid + 'K"></label><input class="input input-sm" id="' + fid + 'K" maxlength="200">' +
          '<div class="be-asst-adm-row"><button type="submit" class="btn btn-sm btn-primary"></button><button type="button" class="btn btn-sm btn-subtle" data-a="cancel"></button></div>' +
          '<p class="form-status" role="status"></p></form>';
      row.querySelector('.be-asst-adm-qt').textContent = x.text || '';
      row.querySelector('.be-asst-adm-meta strong').textContent = x.name || (x.uid || '').slice(0, 6);
      var bOpen = row.querySelector('[data-a="open"]'), bDel = row.querySelector('[data-a="del"]');
      bOpen.textContent = t(S.adm.answer, l); bDel.textContent = t(S.adm.del, l);
      var f = row.querySelector('form');
      var labels = f.querySelectorAll('label');
      labels[0].textContent = t(S.adm.aLbl, l); labels[1].textContent = t(S.adm.qLbl, l); labels[2].textContent = t(S.adm.kLbl, l);
      f.querySelector('.field-help').textContent = t(S.adm.qHelp, l);
      f.querySelector('[type="submit"]').textContent = t(S.adm.save, l);
      f.querySelector('[data-a="cancel"]').textContent = t(S.adm.cancel, l);
      f.querySelector('#' + fid + 'Q').value = x.text || '';
      bOpen.addEventListener('click', function () { f.hidden = false; bOpen.hidden = true; f.querySelector('textarea').focus(); });
      f.querySelector('[data-a="cancel"]').addEventListener('click', function () { f.hidden = true; bOpen.hidden = false; bOpen.focus(); });
      bDel.addEventListener('click', function () {
        if (!W.confirm(t(S.adm.qDel, l))) return;
        W.firebase.firestore().collection('assistant_questions').doc(q.id).delete().catch(function (e) { W.alert((e && (e.code || e.message)) || 'error'); });
      });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var aTxt = f.querySelector('#' + fid + 'A').value.trim();
        var qs = f.querySelector('#' + fid + 'Q').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 20);
        var kw = f.querySelector('#' + fid + 'K').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 20);
        var stEl = f.querySelector('.form-status');
        if (!aTxt || !qs.length) { stEl.textContent = t(S.adm.need, l); return; }
        var sb = f.querySelector('[type="submit"]'); sb.disabled = true;
        var fs = W.firebase.firestore(), batch = fs.batch();
        var faqRef = fs.collection('assistant_faq').doc();
        batch.set(faqRef, { q: qs, a: aTxt, keywords: kw, created_at: W.firebase.firestore.FieldValue.serverTimestamp(), source_qid: q.id });
        batch.update(fs.collection('assistant_questions').doc(q.id), { answered: true, answer: aTxt, faq_id: faqRef.id, answered_at: W.firebase.firestore.FieldValue.serverTimestamp() });
        batch.commit().then(function () {
          var tw = pf('toast'); if (tw) tw(t(S.adm.saved, l));
        }).catch(function (err) { sb.disabled = false; stEl.textContent = t(S.adm.err, l) + ': ' + ((err && (err.code || err.message)) || ''); });
      });
      list.append(row);
    });
  }
  function admRenderFaq() {
    var box = document.getElementById('beAsstAdmFaq'); if (!box) return;
    var l = lang();
    var n = document.getElementById('beAsstAdmFaqN'); if (n) n.textContent = String(faqDocs.length);
    box.innerHTML = '';
    faqDocs.forEach(function (f) {
      var it = document.createElement('div'); it.className = 'be-asst-adm-faq-i';
      it.innerHTML = '<div><strong></strong><span></span></div><button type="button" class="btn btn-sm btn-danger"></button>';
      it.querySelector('strong').textContent = (Array.isArray(f.d.q) ? f.d.q.join(' · ') : f.d.q || '').slice(0, 160);
      it.querySelector('span').textContent = String(f.d.a || '').slice(0, 240);
      var b = it.querySelector('button'); b.textContent = t(S.adm.del, l);
      b.addEventListener('click', function () {
        if (!W.confirm(t(S.adm.faqDel, l))) return;
        W.firebase.firestore().collection('assistant_faq').doc(f.id).delete().catch(function (e) { W.alert((e && (e.code || e.message)) || 'error'); });
      });
      box.append(it);
    });
  }

  // ── Kanca + yaşam döngüsü ────────────────────────────────────
  var lastUid = null;
  function onAuth(u) {
    var uid = u ? u.uid : null;
    if (uid !== lastUid) {
      lastUid = uid;
      cache = { pt: undefined, ptFor: null, days: cache.days, pend: undefined, pendFor: null };
      conv = { last: null, lastText: '' }; forwarded = {};
      if (log) { log.innerHTML = ''; if (opened) greet(); }
      unwatchFaq();
      admUnmount();
      setDot(false);
      if (u && !isAdminUser(u)) setTimeout(checkAnswered, 3000);
      // sayfanın kendi onAuthStateChanged'i bu dinleyiciden önce çalışıp görünümü açmış olabilir
      onView(viewId());
      return;
    }
    syncVisibility();
  }
  function onView(id) {
    var u = curUser();
    if (isAdminUser(u) && id === 'view-admin') { if (!admEl) admMount(); watchFaq(); }
    if (id === 'view-pending') { cache.pendFor = null; }
    syncVisibility();
    if (opened) renderChips();
  }

  function init() {
    build();
    try {
      if (W.firebase && W.firebase.apps && W.firebase.apps.length) W.firebase.auth().onAuthStateChanged(onAuth);
    } catch (_) {}
    syncVisibility();
    // Dil değişince sabit metinler + çipler (setLang sarmalayıcısı booking.html'de; burada da sarılır)
    if (W._i18n && W._i18n.setLang && !W._i18n._beAsst) {
      var orig = W._i18n.setLang;
      W._i18n.setLang = function (l) { var r = orig.apply(this, arguments); try { paintStatic(); if (opened) renderChips(); if (admEl) admMount(); } catch (_) {} return r; };
      W._i18n._beAsst = true;
    }
  }

  A.onView = onView;
  A.open = function () { open(); };
  A.close = function () { close(); };
  A.ask = function (q) { open(); ask(q); };
  A.context = buildContext;
  A._md = md;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
