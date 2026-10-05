/* be-assistant.js — Ders Paneli asistanının MOTORU (saf fonksiyonlar, DOM/Firestore yok).
   Harici yapay zekâ / API / model yok: Türkçe normalleştirme + hafif ek ayıklayıcı (stemmer) +
   eş anlam haritası + yazım hatası toleransı (Damerau-Levenshtein) + TF-IDF ağırlıklı kelime
   ve karakter-üçlü (trigram) benzerliği. Bilgi tabanı be-assistant-kb.js'te (window.beAssistantKB),
   arayüz be-assistant-ui.js'te. Node'da test için: vm ile yüklenir, globalThis.beAssistant okunur.

   API (window.beAssistant):
     fold(s)                       → küçük harf + ASCII katlama ("Öğrenci" → "ogrenci")
     normalize(s)                  → fold + kesme işareti eki / noktalama temizliği
     stem(word)                    → kök ("erteleyebilir" → "ertel")
     analyze(text, kb?)            → { tokens:[kök + @kavram], words:[kök], norm }
     damerau(a, b, max)            → kısıtlı Damerau-Levenshtein uzaklığı (max'ı aşınca max+1)
     compile(intents, kb?)         → arama dizini (önbelleklenir)
     match(text, kb, ctx?)         → { intent, score, confident, alternatives:[{id,score}], followup }
     render(intent, ctx, lang)     → { text, actions }  (şablon doldurma; varyant seçimi)
     detectLang(text)              → 'tr' | 'en' | null
*/
(function (root) {
  'use strict';

  // ── 1. Normalleştirme ─────────────────────────────────────────
  var FOLD_MAP = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u', 'é': 'e', 'è': 'e', 'ä': 'a', 'ë': 'e' };
  // Türkçe büyük/küçük harf: I → ı, İ → i (toLowerCase 'İ'yi "i̇" yapar; nokta da silinir)
  function lowerTr(s) {
    return String(s == null ? '' : s).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase().replace(/̇/g, '');
  }
  function fold(s) {
    return lowerTr(s).replace(/[çğıöşüâîûéèäë]/g, function (c) { return FOLD_MAP[c]; });
  }
  // "Zoom'a", "Berkay’ın" → kesme işaretinden sonraki ek atılır; noktalama → boşluk
  // Konuşma dili / kısaltma → yazı dili ("nerde" → "nerede", "nası" → "nasil", "bi" → "bir")
  var COLLOQ = { nerde: 'nerede', nerden: 'nereden', nereye: 'nereye', nasi: 'nasil', bi: 'bir', biraz: 'biraz',
    napcam: 'ne yapacagim', napicam: 'ne yapacagim', napmam: 'ne yapmam', napmaliyim: 'ne yapmaliyim', nolur: 'ne olur', noluyor: 'ne oluyor',
    sa: 'saat', dk: 'dakika', tl: 'tl', hk: 'hakkinda', slm: 'selam', mrb: 'merhaba', tsk: 'tesekkur', msj: 'mesaj', wp: 'whatsapp',
    zman: 'zaman', zamn: 'zaman', simdi: 'simdi', yarin: 'yarin', bugun: 'bugun' };
  function normalize(s) {
    return fold(s)
      .replace(/[’'`´]\s*[a-z]+/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ').map(function (w) { return COLLOQ[w] || w; }).join(' ');
  }

  // Etkisiz kelimeler (katlanmış). Soru ekleri (mi/mu/misin…) ayrı yazılınca da buraya düşer.
  var STOP = {};
  ('ve veya ile bir bu su o ben sen biz siz onlar bana beni benim sana seni senin bize bizim size sizin ' +
   'icin gibi da de ki mi mu misin miyim misiniz miyiz musun muyum musunuz muyuz mudur midir muydu miydi miymis ' +
   'acaba lutfen hocam hoca abi abla kanka ya peki yani sey simdi tamam evet hayir ' +
   'olarak daha cok en hic her hep ise ama fakat ancak icin diye bile ' +
   'the a an is are am i me my mine to of in on at for do does did can could would should will be it this that ' +
   'please there you your yours we us our so and or but if with about').split(' ').forEach(function (w) { if (w) STOP[w] = 1; });
  // Takip sorusu işaretleri ("peki kaç tane?", "ya sonra?", "what about…")
  var FOLLOW_MARK = /^(peki|ya|o zaman|ayrica|bir de|and|what about|how about|so)\b/;
  // Yalnız bu genel soru kelimelerinden oluşan kısa soru ("ne zamana kadar?", "kaç tane?") önceki
  // konunun devamıdır
  var QWORDS = {};
  ('ne zaman nasil neden niye nere nerde kac tane kadar hangi kim sonra once peki ya ' +
   'when how why where what which many much then long').split(' ').forEach(function (w) { if (w) QWORDS[w] = 1; });
  // Selamlaşma / teşekkür: başka içerik yoksa "@selam" / "@tesekkur" belirteci olur, varsa atılır
  // ("merhaba, dersimi nasıl ertelerim" selamlaşma sayılmasın)
  var SOCIAL = [
    [/\b(merhaba(lar)?|selam(lar)?|slm|mrb|selamun aleykum|gunaydin|iyi (gunler|aksamlar|geceler|calismalar)|hello|hi|hey|good (morning|evening|afternoon)|nasilsin(iz)?|naber|how are you)\b/g, '@selam'],
    [/\b(tesekkur(ler|ederim| ederim)?|tsk(ler)?|sag ?ol(un|asin|asiniz)?|eyvallah|eline saglik|ellerine saglik|thanks?|thank you|cok yardimci oldun|super(sin)?|harikasin)\b/g, '@tesekkur'],
  ];

  // ── 2. Hafif Türkçe ek ayıklayıcı ─────────────────────────────
  // Kökler: bu kelimelere ulaşınca ayıklama durur (ör. "seviyem" → "seviye", "dersimi" → "ders").
  var ROOTS = {};
  ('ders paket hak kredi odeme ode zoom link iban deneme seviye sinav kural ucret fiyat ' +
   'saat gun hafta ay yil dakika plan talep onay itiraz kayit ableton lab serum preset sample plugin ' +
   'whatsapp telefon numara sifre giris hesap dil kamera ses mikrofon odev not hata sorun iptal ' +
   'dondur hasta mazeret gec hoca berkay asistan soru cevap katil gir link toplanti baglanti ' +
   'havale para tutar indirim kampanya tek aylik ek degis tasi kaydir hatirlat bildirim kurulum ' +
   'yukle kur indir surum versiyon bilgisayar mac windows tur muzik produksiyon sertifika forum ' +
   'uye profil video kayit sure bitis bas bit yeni yenile devam ara tatil geri iade devret ' +
   'program takvim liste kart istanbul yurt sur al ol ver gel yap kal cik ac bil gor yaz at gonder ' +
   'bul ogren calis sor oku izle kaydet').split(' ').forEach(function (w) { if (w) ROOTS[w] = 1; });

  var SUFFIXES = (
    'yabilirmiyim yebilirmiyim abilirmiyim ebilirmiyim yabiliyormuyum ' +
    'yacagim yecegim acagim ecegim yacagiz yecegiz yabilir yebilir abilir ebilir ' +
    'madim medim mamis memis miyorum muyorum miyor muyor masin mesin ' +
    'maliyim meliyim maliyiz meliyiz malisin melisin mali meli ' +
    'digim dugum tigim tugum diginiz digi dugu tigi tugu dikten ince inca unca unce ' +
    'irsem irsam ursam ursem arsam ersem sam sem ken yayim yeyim ayim eyim alim elim ' +
    'iyorum uyorum iyoruz uyoruz iyorsun uyorsun yorum yorsun iyor uyor yor ' +
    'yacak yecek acak ecek yacam yecem acam ecem yicem yicam icem icam ' +
    'larimi lerimi larim lerim lariniz leriniz larin lerin lari leri lar ler ' +
    'imizi inizi imiz iniz umuz unuz ' +
    'ndan nden dan den tan ten nda nde da de ta te ' +
    'yla yle ile nin nun yi yu ya ye ni nu na ne si su ' +
    'mak mek ma me dim dik tim tik dum duk tum tuk di ti du tu mis mus sin sun ' +
    'imi umu ini unu im um in un iz uz ir ur ki m n a e i u'
  ).split(' ').filter(Boolean).sort(function (a, b) { return b.length - a.length; });
  var SOFT = { b: 'p', d: 't', g: 'k' };
  // Geniş zaman (-ar/-er/-ir/-ur) yalnız köke götürüyorsa ayıklanır ("sürer" → "sur"; "gitar" değil)
  var ROOT_ONLY = ['ar', 'er', 'ir', 'ur', 'r'];

  function isRoot(w) { return ROOTS[w] === 1; }
  function stem(w) {
    w = String(w || '');
    if (w.length <= 3 || /\d/.test(w) || isRoot(w)) return w;
    for (var guard = 0; guard < 5; guard++) {
      var cut = false;
      // önce köke götüren ek ("dersi" → "ders", "paketim" → "paket"; "der"+"si" değil)
      for (var r = 0; r < SUFFIXES.length + ROOT_ONLY.length; r++) {
        var sr = r < SUFFIXES.length ? SUFFIXES[r] : ROOT_ONLY[r - SUFFIXES.length];
        if (w.length - sr.length >= 2 && w.slice(-sr.length) === sr) {
          var base = w.slice(0, -sr.length);
          if (isRoot(base)) return base;
          if (/([bcdfghjklmnprstvyz])\1$/.test(base) && isRoot(base.slice(0, -1))) return base.slice(0, -1);
          if (SOFT[base.slice(-1)] && isRoot(base.slice(0, -1) + SOFT[base.slice(-1)])) return base.slice(0, -1) + SOFT[base.slice(-1)];
        }
      }
      for (var i = 0; i < SUFFIXES.length; i++) {
        var s = SUFFIXES[i];
        // tek harfli ek yalnız uzun kelimeden; kök en az 3 harf kalır
        var min = s.length === 1 ? 4 : 3;
        if (w.length - s.length >= min && w.slice(-s.length) === s) {
          w = w.slice(0, -s.length);
          cut = true;
          break;
        }
      }
      if (!cut || isRoot(w)) break;
      // hakk → hak (ünsüz ikizleşmesi)
      if (/([bcdfghjklmnprstvyz])\1$/.test(w) && isRoot(w.slice(0, -1))) { w = w.slice(0, -1); break; }
    }
    if (!isRoot(w)) {
      if (/([bcdfghjklmnprstvyz])\1$/.test(w)) w = w.slice(0, -1);
      // ertele / erteli(yor) → ertel ; ünsüz yumuşaması kitab → kitap
      if (w.length >= 5 && /[aeiou]$/.test(w)) w = w.slice(0, -1);
      if (w.length >= 4 && SOFT[w.slice(-1)] && /[aeiou]/.test(w.slice(-2, -1))) w = w.slice(0, -1) + SOFT[w.slice(-1)];
    }
    return w;
  }

  // ── 3. Eş anlam / kavram haritası ─────────────────────────────
  // KB.synonyms: [[ "kavram", ["ifade", "çok kelimeli ifade", ...] ], ...]. Çok kelimeli ifadeler
  // normalleştirilmiş metinde aranır; tek kelimeler kök düzeyinde eşlenir. Eşleşen her ifade
  // metne "@kavram" belirteci ekler (orijinal kelimeler de kalır).
  var _synCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function synIndex(kb) {
    var list = (kb && kb.synonyms) || [];
    if (_synCache && _synCache.has(list)) return _synCache.get(list);
    var idx = { phrases: [], words: {} };
    list.forEach(function (row) {
      var concept = '@' + row[0];
      (row[1] || []).forEach(function (p) {
        var n = normalize(p);
        if (!n) return;
        if (n.indexOf(' ') >= 0) idx.phrases.push({ re: new RegExp('(^| )' + n.replace(/ /g, '[a-z]* ') + '[a-z]*( |$)'), c: concept });
        else {
          var k = stem(n);
          (idx.words[k] = idx.words[k] || []).push(concept);
          if (k !== n) (idx.words[n] = idx.words[n] || []).push(concept);
        }
      });
    });
    if (_synCache) _synCache.set(list, idx);
    return idx;
  }

  var NEG_TR = /[a-z](m[ai]yor|m[ai]d[iu]|[ae]m[ae]d[iu]|[ae]m[ai]yor|m[ai]y[ae]c[ae][kg]|m[ae]z\b|y[ae]m[ae]d|m[ai]yo\b)/;
  var NEG_EN = /\b(not|never|cannot|can'?t|don'?t|doesn'?t|won'?t|isn'?t|didn'?t)\b/;
  var ME_WORDS = { ben: 1, benim: 1, bende: 1, bana: 1, beni: 1, bendeki: 1, my: 1, mine: 1, me: 1, i: 1 };
  var ME_RE = /(?:[^aeiou](?:im|um|imi|umu|imin|umun|imde|umda|imden|umdan|ime|uma|imiz|umuz|imizi|imle|umla|imdeki)|[aeiou]m(?:i|u|in|un|de|da|den|dan|e|a)?|yim|yum|dim|dum|tim|tum)$/;
  var REQ = {};
  ('goster gosterir anlat anlatir acikla aciklar soyle soyler bilgi hakkinda detay detayli ozetle ' +
   'explain tell show info information').split(' ').forEach(function (w) { if (w) REQ[w] = 1; });
  var _qw = null;
  function qwStem() {
    if (!_qw) { _qw = {}; Object.keys(QWORDS).forEach(function (w) { _qw[w] = 1; _qw[stem(w)] = 1; }); }
    return _qw;
  }
  function analyze(text, kb) {
    var norm = normalize(text);
    var social = [];
    var core = norm;
    SOCIAL.forEach(function (sx) { if (sx[0].test(core)) { social.push(sx[1]); core = core.replace(sx[0], ' '); } sx[0].lastIndex = 0; });
    core = core.replace(/\s+/g, ' ').trim();
    var raw = core ? core.split(' ') : [];
    var words = [];
    var mine = false;
    raw.forEach(function (w) {
      // birinci tekil kişi ("dersim", "hakkım", "ödemem", "benim", "my"): kişisel soru işareti
      if (ME_WORDS[w]) mine = true;
      if (!w || STOP[w]) return;
      if (w.length >= 5 && ME_RE.test(w) && !ROOTS[w]) mine = true;
      // yapışık soru eki: "edebilirmiyim", "varmi" → "varmi" sonundaki mi/mu atılır
      var m = w.match(/^(.{3,}?)(mi|mu|misin|miyim|musun|muyum|miyiz|misiniz)$/);
      if (m && !isRoot(w)) w = m[1];
      var sw = stem(w);
      if (REQ[sw]) return;   // "göster", "anlat", "açıkla": isteğin kendisi, konu değil
      words.push(sw);
    });
    var tokens = words.slice();
    var concepts = {};
    if (kb) {
      var si = synIndex(kb);
      si.phrases.forEach(function (p) { if (p.re.test(norm)) concepts[p.c] = 1; });
      words.forEach(function (w) { (si.words[w] || []).forEach(function (c) { concepts[c] = 1; }); });
      raw.forEach(function (w) { (si.words[w] || []).forEach(function (c) { concepts[c] = 1; }); });
    }
    // Olumsuzluk ("giremedim", "çalışmıyor", "can't"): ek ayıklanınca kaybolur, ayrı belirteç olur
    if (NEG_TR.test(core) || NEG_EN.test(fold(text))) concepts['@olumsuz'] = 1;
    if (mine && words.length) concepts['@ben'] = 1;
    Object.keys(concepts).forEach(function (c) { tokens.push(c); });
    if (!tokens.length) tokens = social.slice();
    return { norm: norm, words: words, tokens: uniq(tokens), generic: words.length > 0 && words.every(function (w) { return qwStem()[w]; }) };
  }
  function uniq(a) { var o = {}, r = []; a.forEach(function (x) { if (!o[x]) { o[x] = 1; r.push(x); } }); return r; }

  // ── 4. Yazım hatası toleransı ────────────────────────────────
  // Kısıtlı Damerau-Levenshtein (komşu harf yer değiştirme = 1). max aşılınca max+1 döner.
  function damerau(a, b, max) {
    if (max == null) max = 2;
    if (a === b) return 0;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var prev2 = null, prev = [], cur, i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur = [i];
      var rowMin = i;
      for (j = 1; j <= lb; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[lb] > max ? max + 1 : prev[lb];
  }
  // Kelime ≥4 harf: 1 hata, ≥8 harf: 2 hata
  function tokenSim(q, e) {
    if (q === e) return 1;
    if (q.charAt(0) === '@' || e.charAt(0) === '@') return 0;
    var lq = q.length, le = e.length, ml = Math.min(lq, le);
    if (ml >= 4) {
      var allow = Math.max(lq, le) >= 8 && ml >= 6 ? 2 : 1;
      var d = damerau(q, e, allow);
      if (d <= allow) return d === 1 ? 0.82 : 0.7;
      // ayıklanamamış ek: biri ötekinin başı ("kampanyal" ~ "kampanya")
      if (ml >= 4 && (q.indexOf(e) === 0 || e.indexOf(q) === 0)) return 0.72;
    }
    return 0;
  }

  function trigrams(s) {
    var t = {}, n = 0, p = ' ' + s + ' ';
    for (var i = 0; i < p.length - 2; i++) { var g = p.substr(i, 3); if (!t[g]) { t[g] = 1; n++; } }
    return { set: t, n: n };
  }
  function dice(a, b) {
    if (!a.n || !b.n) return 0;
    var c = 0;
    for (var g in a.set) if (b.set[g]) c++;
    return 2 * c / (a.n + b.n);
  }

  // ── 5. Dizin (TF-IDF) ─────────────────────────────────────────
  function examplesOf(it) {
    var ex = it.ex || {};
    var out = [];
    if (Array.isArray(ex)) out = ex.slice();
    else { if (ex.tr) out = out.concat(ex.tr); if (ex.en) out = out.concat(ex.en); }
    if (Array.isArray(it.q)) out = out.concat(it.q);
    return out.filter(function (s) { return typeof s === 'string' && s.trim(); });
  }
  var _idxCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function compile(intents, kb) {
    var key = intents;
    if (_idxCache && _idxCache.has(key)) { var c = _idxCache.get(key); if (c.kb === (kb || null)) return c; }
    kb = kb || null;
    var df = {}, list = [];
    intents.forEach(function (it) {
      var exs = examplesOf(it).map(function (s) {
        var a = analyze(s, kb);
        return { tokens: a.tokens, tri: trigrams(a.words.join(' ')) };
      });
      var kw = (it.kw || []).length ? analyze(it.kw.join(' '), kb).tokens : [];
      var bag = {};
      exs.forEach(function (e) { e.tokens.forEach(function (t) { bag[t] = 1; }); });
      kw.forEach(function (t) { bag[t] = 1; });
      Object.keys(bag).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
      list.push({ it: it, exs: exs, kw: kw });
    });
    var N = list.length || 1;
    var idf = {};
    var sum = 0, cnt = 0;
    Object.keys(df).forEach(function (t) { idf[t] = Math.log(1 + N / df[t]); sum += idf[t]; cnt++; });
    var maxIdf = Math.log(1 + N);
    var oov = 1.2 * maxIdf;
    var vocab = Object.keys(idf).filter(function (t) { return t.charAt(0) !== '@'; });
    // örnek normları
    list.forEach(function (L) {
      L.exs.forEach(function (e) {
        var s = 0;
        e.tokens.forEach(function (t) { var w = idf[t] || oov; s += w * w; });
        e.norm = Math.sqrt(s) || 1;
      });
    });
    var out = { list: list, idf: idf, oov: oov, N: N, kb: kb, vocab: vocab, wcache: {} };
    if (_idxCache) _idxCache.set(key, out);
    return out;
  }

  // Sorgu kelimesinin ağırlığı: sözlükteyse idf; yazım hatalıysa en yakın kelimenin idf'i;
  // hiç tanınmıyorsa yüksek (kapsam dışı soru güvenle eşleşmesin)
  function qWeight(t, idx) {
    if (idx.idf[t]) return idx.idf[t];
    if (idx.wcache[t] != null) return idx.wcache[t];
    var best = 0, bw = idx.oov;
    if (t.charAt(0) !== '@') for (var i = 0; i < idx.vocab.length; i++) {
      var s = tokenSim(t, idx.vocab[i]);
      if (s >= 0.82 && s > best) { best = s; bw = idx.idf[idx.vocab[i]]; break; }
    }
    idx.wcache[t] = bw;
    return bw;
  }
  var _lastCov = 0;
  function scoreExample(qa, qNorm, e, idx) {
    var num = 0;
    for (var i = 0; i < qa.tokens.length; i++) {
      var t = qa.tokens[i], best = 0;
      for (var j = 0; j < e.tokens.length; j++) {
        var s = tokenSim(t, e.tokens[j]);
        if (s > best) { best = s; if (s === 1) break; }
      }
      if (best) { var w = qWeight(t, idx); num += w * w * best; }
    }
    var cos = num / (qNorm * e.norm);
    var tri = dice(qa.tri, e.tri);
    _lastCov = num / (qNorm * qNorm);   // sorgunun ağırlığının ne kadarı karşılandı
    return 0.78 * Math.min(1, cos) + 0.22 * tri;
  }

  function scoreAll(qa, idx, ctx) {
    var s2 = 0;
    qa.tokens.forEach(function (t) { var w = qWeight(t, idx); s2 += w * w; });
    var qNorm = Math.sqrt(s2) || 1;
    var st = ctx && ctx.state;
    return idx.list.map(function (L) {
      var best = 0, second = 0, cov = 0;
      for (var i = 0; i < L.exs.length; i++) {
        var s = scoreExample(qa, qNorm, L.exs[i], idx);
        if (s > best) { second = best; best = s; cov = _lastCov; } else if (s > second) second = s;
      }
      // iki örnekle birden örtüşen niyete küçük güç; anahtar kelime eşleşmesine küçük ek
      var sc = best + 0.08 * second;
      if (L.kw.length) {
        var hit = 0;
        qa.tokens.forEach(function (t) { if (L.kw.indexOf(t) >= 0) hit++; });
        sc += Math.min(0.08, 0.04 * hit);
      }
      // öğrencinin durumuna uyan niyet hafif öne çıkar (aynı soru farklı durumda farklı cevap)
      if (st && L.it.states) sc *= L.it.states.indexOf(st) >= 0 ? 1.08 : 0.97;
      return { id: L.it.id, it: L.it, score: Math.min(1, sc), cov: cov };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  // Eşikler (Node değerlendirmesiyle ayarlandı)
  var T_HI = 0.40, T_LO = 0.24, T_GAP = 0.025, T_COV = 0.5;

  function intentsOf(kb) { return Array.isArray(kb) ? kb : ((kb && kb.intents) || []); }

  function match(text, kb, ctx) {
    // Dizin niyet dizisinin kimliğiyle önbelleklenir: öğrenilen cevaplar eklenince arayüz yeni
    // bir { intents, synonyms } nesnesi kurar (be-assistant-ui.js → kbWithFaq).
    var kbo = Array.isArray(kb) ? null : kb;
    var idx = compile(intentsOf(kb), kbo);
    var qa = analyze(text, kbo);
    qa.tri = trigrams(qa.words.join(' '));
    var res = { intent: null, score: 0, confident: false, alternatives: [], followup: false, tokens: qa.tokens };
    if (!qa.tokens.length) return res;
    var ranked = scoreAll(qa, idx, ctx);

    // Kısa takip sorusu: önceki konunun belirteçleriyle zenginleştirip yeniden puanla
    var last = ctx && ctx.last && ctx.last.intent;
    var lastIt = last && idx.list.filter(function (L) { return L.it.id === last; })[0];
    var strongFollow = FOLLOW_MARK.test(qa.norm) || qa.generic;
    var isFollow = strongFollow || qa.words.length <= 3;
    if (lastIt && isFollow && (strongFollow || !(ranked[0].score >= T_HI + 0.15 && ranked[0].id !== last))) {
      var topic = (lastIt.it.topic || []).map(function (t) { return t.charAt(0) === '@' ? t : stem(normalize(t)); });
      if (topic.length) {
        var qa2 = { tokens: uniq(qa.tokens.concat(topic)), words: qa.words.concat(topic.filter(function (t) { return t.charAt(0) !== '@'; })) };
        qa2.tri = trigrams(qa2.words.join(' '));
        var r2 = scoreAll(qa2, idx, ctx);
        // takip sorusu aynı soruyu tekrar etmez: önceki niyet yerine konudaki başka niyet seçilir
        var pick = r2[0].id === last && r2[1] && r2[1].score > T_LO && FOLLOW_MARK.test(qa.norm) && (lastIt.it.follow || []).length
          ? r2.filter(function (x) { return (lastIt.it.follow || []).indexOf(x.id) >= 0; })[0] || r2[0] : r2[0];
        if (strongFollow || pick.score > ranked[0].score + 0.02 || (ranked[0].score < T_HI && pick.score >= T_LO)) {
          ranked = [pick].concat(r2.filter(function (x) { return x !== pick; }));
          res.followup = true;
        }
      }
    }

    var top = ranked[0], second = ranked[1] || { score: 0 };
    res.score = +top.score.toFixed(4);
    res.alternatives = ranked.slice(0, 4).filter(function (x) { return x.score >= T_LO * 0.8; })
      .map(function (x) { return { id: x.id, score: +x.score.toFixed(4) }; });
    if (top.score >= T_LO) res.intent = top.id;
    // Güven: puan eşiği + ikinciden ayrışma + sorgunun çoğu karşılanmış olmalı (tanınmayan
    // kelimesi ağır basan soru — "gitar dersi veriyor musunuz" — öneriye düşer)
    res.coverage = +(top.cov || 0).toFixed(3);
    res.confident = top.score >= T_HI && (top.score - second.score >= T_GAP || top.score >= T_HI + 0.2) && (top.cov || 0) >= T_COV;
    return res;
  }

  // ── 6. Şablon ─────────────────────────────────────────────────
  // intent.a: { tr, en } ya da varyant dizisi [{ if:'paid !trial', tr, en }, …]. İlk uyan varyant
  // seçilir: tüm bayraklar doğru VE metindeki her {yer_tutucu} bağlamda dolu olmalı. Böylece veri
  // yoksa (ör. sıradaki ders bilinmiyor) bir sonraki, daha genel varyanta düşülür.
  function flagsOk(cond, flags) {
    if (!cond) return true;
    return String(cond).split(/\s+/).filter(Boolean).every(function (f) {
      var neg = f.charAt(0) === '!';
      var v = !!(flags && flags[neg ? f.slice(1) : f]);
      return neg ? !v : v;
    });
  }
  function fill(str, vars) {
    var ok = true;
    var out = String(str).replace(/\{([a-z0-9_]+)\}/g, function (m, k) {
      var v = vars ? vars[k] : undefined;
      if (v === undefined || v === null) { ok = false; return m; }   // '' geçerli (isteğe bağlı ek metin)
      return String(v);
    });
    return ok ? out : null;
  }
  function pickLang(o, lang) { return o ? (o[lang] != null ? o[lang] : o.tr) : null; }
  function render(intent, ctx, lang) {
    lang = lang === 'en' ? 'en' : 'tr';
    var flags = (ctx && ctx.flags) || {}, vars = (ctx && ctx.vars) || {};
    var variants = Array.isArray(intent.a) ? intent.a : [intent.a];
    var text = null;
    for (var i = 0; i < variants.length && text == null; i++) {
      var v = variants[i];
      if (!v || !flagsOk(v.if, flags)) continue;
      var s = pickLang(v, lang);
      if (s == null) continue;
      text = fill(s, vars);
    }
    if (text == null) text = '';
    var actions = (intent.actions || []).filter(function (a) { return flagsOk(a.if, flags); });
    return { text: text, actions: actions };
  }

  // Basit dil tahmini: İngilizce işlev kelimeleri ≥2 ve Türkçe harf yoksa 'en'
  var EN_WORDS = /\b(how|what|when|where|can|could|do|does|my|is|the|lesson|lessons|change|pay|payment|price|join|cancel|reschedule|credits?|trial|level|test|password|login|zoom link)\b/g;
  function detectLang(text) {
    var s = String(text || '');
    if (/[çğıöşüÇĞİÖŞÜ]/.test(s)) return 'tr';
    var m = s.toLowerCase().match(EN_WORDS);
    if (m && m.length >= 2) return 'en';
    if (/\b(mi|mı|mu|mü|nasıl|nasil|ne zaman|nerede|kaç|kac|var mi|yok)\b/i.test(s)) return 'tr';
    return null;
  }

  var api = {
    VERSION: 1,
    fold: fold, normalize: normalize, stem: stem, analyze: analyze, damerau: damerau,
    compile: compile, match: match, render: render, detectLang: detectLang,
    thresholds: { hi: T_HI, lo: T_LO, gap: T_GAP, cov: T_COV },
  };
  var prev = root.beAssistant || {};
  for (var k in api) prev[k] = api[k];
  root.beAssistant = prev;
  if (typeof module !== 'undefined' && module.exports) module.exports = prev;
})(typeof window !== 'undefined' ? window : globalThis);
