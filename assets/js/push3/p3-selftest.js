/* Push 3 Laboratuvarı — debug testleri (p3-selftest.js)
 *
 * Yalnız ?p3debug=1 ile p3-app tarafından dinamik yüklenir (README §G15, sartname-dogrulama §1–§2).
 *   P3.test.run(opts?)  → Promise<[{grup, ad, sonuc:'GECTI'|'KALDI'|'ATLANDI', detay}]>; console.table ile de basar
 *                         opts: {audio:false} ses ölçümlerini atlar, {only:['scale','ses']} grup seçer
 *   P3.test.audio.render(presetId, notes, sec, opts?) → Promise<Float32Array> (sol kanal; sağ kanal .right)
 *   P3.test.audio.util  → fft, spectrum, fftDb, peakNear, maxStepDiff, onset, peak, db, mtof, aliasDb
 *   P3.test.overlay(on) → registry debug katmanı (#p3HotspotLayer üstünde geçici div'ler, id etiketli)
 *   P3.test.panel(on)   → sağ alttaki kapatılabilir sonuç paneli
 *
 * İlke: testler canlı durumu değiştirmez. Saf testler yerel nesnelerle çalışır; LED kuralları P3.S'yi
 * senkron bir blok içinde geçici bir kopyaya çevirip geri alır (arada olay yayılmaz, kare çizilmez);
 * öğretici testleri ayrık bir durum nesnesi üzerinde çalışan bir test emu'suyla koşar. Ses ölçümleri
 * kendi OfflineAudioContext'lerinde (48 kHz) gerçek worklet dosyasıyla yapılır.
 *
 * SAPMA/EKLEME:
 * - Worklet mesajlarının render başlamadan işlendiğinden emin olmak için render 1024 örnek önce başlar,
 *   bu noktada suspend edilir, mesajlar gönderilir ve kısa bir beklemeden sonra devam edilir; dönen dizi
 *   bu ön bölümü içermez (notaların `at` değeri dizinin başına göredir). suspend yoksa (eski Firefox)
 *   mesajlar startRendering'den önce gönderilip beklenir.
 * - Çeyrek ton adımları tek render'da Note PB ({t:'x'}, 1.0 = 48 st) ile verilir; o1Det zamanlanamıyor.
 * - check(setup) değeri 'false' dışında bir falsy (undefined/0/null) ise geçer ama detayda belirtilir.
 * - EKLEME: sayfa yüklenince sağ altta küçük bir panel açılır (Çalıştır / Registry / Kapat); testler
 *   kendiliğinden çalışmaz. Olay günlüğü, FPS ve worklet meter paneli (sartname-dogrulama §0) bu dosyada yok.
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  var PASS = 'GECTI', FAIL = 'KALDI', SKIP = 'ATLANDI';
  var FS = 48000;
  var PRE = 1024;                       // ön bölüm (örnek): suspend noktası, render kuantumunun katı
  var MSG_WAIT_MS = 60;                 // suspend sırasında worklet'in mesajları işlemesi için
  var RENDER_TIMEOUT_MS = 120000;
  var ALWAYS_ALLOWED = ['play', 'volume'];   // sartname-ogretici §4: kilitte de serbest
  var FAZ1_CHAPTERS = ['baslarken', 'padler', 'scale', 'dizilim', 'osilator', 'filtre-env', 'modulasyon', 'drum'];

  // ---------------------------------------------------------------- küçük yardımcılar
  function js(v) {
    try {
      return JSON.stringify(v, function (k, x) {
        if (x instanceof Set) return Array.from(x);
        if (typeof x === 'number' && !isFinite(x)) return String(x);
        return x;
      });
    } catch (e) { return String(v); }
  }
  function errText(e) { return (e && e.message) || String(e); }
  function round(v, d) { var k = Math.pow(10, d || 0); return Math.round(v * k) / k; }
  function nowMs() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function deepClone(v) {
    if (P3.u && P3.u.deepClone) return P3.u.deepClone(v);
    return JSON.parse(JSON.stringify(v));
  }

  function recorder(rows, grup) {
    function push(ad, sonuc, detay) {
      rows.push({ grup: grup, ad: ad, sonuc: sonuc, detay: detay == null ? '' : String(detay) });
    }
    return {
      ok: function (ad, cond, detay) { push(ad, cond ? PASS : FAIL, detay); return !!cond; },
      eq: function (ad, got, exp, detay) {
        var g = js(got), e = js(exp), c = g === e;
        push(ad, c ? PASS : FAIL, c ? (detay || g) : `beklenen ${e}, gelen ${g}`);
        return c;
      },
      skip: function (ad, detay) { push(ad, SKIP, detay); },
      fail: function (ad, detay) { push(ad, FAIL, detay); }
    };
  }

  // Birçok alt kontrolü tek satırda toplar: ilk birkaç hatayı detaya yazar.
  function tally() {
    var n = 0, bad = [];
    return {
      check: function (cond, msg) { n++; if (!cond && bad.length < 1e6) bad.push(msg); return cond; },
      report: function (T, ad, okText) {
        var d = bad.length ? `${bad.length}/${n} hata: ${bad.slice(0, 4).join(' | ')}` : `${n} kontrol` + (okText ? ` · ${okText}` : '');
        return T.ok(ad, bad.length === 0, d);
      }
    };
  }

  // Hidrate edilmiş, canlı durumdan bağımsız bir §D durumu (store.init'in hydrate'i ile aynı sonuç).
  function freshState(X) {
    var S = X.initState();
    (S.tracks || []).forEach(function (t) {
      if (t.kind !== 'synth' || !X.wtp) return;
      t.p = X.wtp.defaults();
      t.mods = deepClone(X.wtp.DEFAULT_MODS || {});
    });
    return S;
  }

  // ================================================================ 1. scale
  function suiteScale(T, X) {
    var Sc = X.scale;
    if (!Sc) { T.fail('P3.scale', `modül yüklenmemiş`); return; }
    function st(o) { var s = { root: 0, idx: 0, inKey: true, fixed: false, layoutIdx: 0 }; for (var k in o || {}) s[k] = o[k]; return s; }
    function row(S, pos, y) { var r = []; for (var x = 0; x < 8; x++) r.push(Sc.padNote(S, pos, x, y)); return r; }
    function idxOf(name) { for (var i = 0; i < Sc.SCALES.length; i++) if (Sc.SCALES[i][0] === name) return i; return -1; }

    T.eq('35 gam, ilk/son', [Sc.SCALES.length, Sc.SCALES[0][0], Sc.SCALES[34][0]], [35, 'Major', 'Messiaen 7']);
    T.eq('noteName 36/60/0/127', [Sc.noteName(36), Sc.noteName(60), Sc.noteName(0), Sc.noteName(127)], ['C1', 'C3', 'C-2', 'G8']);
    T.eq('ROOT_NOTES (upper2..7, lower2..7)', Sc.ROOT_NOTES, [0, 7, 2, 9, 4, 11, 5, 10, 3, 8, 1, 6]);

    // §10 test vektörleri
    var CM = st();
    T.eq(`§10 C Major defaultPos`, Sc.defaultPos(CM), 21);
    T.eq(`§10 C Major satır 0`, row(CM, 21, 0), [36, 38, 40, 41, 43, 45, 47, 48]);
    T.eq(`§10 C Major satır 1`, row(CM, 21, 1), [41, 43, 45, 47, 48, 50, 52, 53]);
    T.eq(`§10 C Major sağ üst`, Sc.padNote(CM, 21, 7, 7), 84);
    T.eq(`§10 majör akor (0,0)+(2,0)+(1,1)`, [Sc.padNote(CM, 21, 0, 0), Sc.padNote(CM, 21, 2, 0), Sc.padNote(CM, 21, 1, 1)].map(function (m) { return m % 12; }), [0, 4, 7]);
    var DM = st({ root: 2, idx: 1 }), pD = Sc.realign(CM, DM, 21);
    T.eq(`§10 C → D Minor p`, pD, 22);
    T.eq(`§10 D Minor satır 0`, row(DM, pD, 0), [38, 40, 41, 43, 45, 46, 48, 50]);
    var AmOff = st({ root: 9, idx: 1 }), AmOn = st({ root: 9, idx: 1, fixed: true });
    T.eq(`§10 A Minor Fixed Off p=26 → 45`, [Sc.defaultPos(AmOff), Sc.padNote(AmOff, 26, 0, 0)], [26, 45]);
    T.eq(`§10 A Minor Fixed On → 36`, Sc.padNote(AmOn, Sc.realign(AmOff, AmOn, 26), 0, 0), 36);
    var DMajOn = st({ root: 2, fixed: true });
    T.eq(`§10 D Major Fixed On → 37`, Sc.padNote(DMajOn, Sc.defaultPos(DMajOn), 0, 0), 37);
    var chr = [0, 1, 2].map(function (li) { return st({ inKey: false, layoutIdx: li }); });
    var t4 = tally(), t3 = tally(), tS = tally();
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
      t4.check(Sc.padNote(chr[0], 36, x, y) === 36 + x + 5 * y, `4ths (${x},${y})`);
      t3.check(Sc.padNote(chr[1], 36, x, y) === 36 + x + 4 * y, `3rds (${x},${y})`);
      tS.check(Sc.padNote(chr[2], 36, x, y) === 36 + x + 8 * y, `Seq (${x},${y})`);
    }
    t4.report(T, `§10 Chromatic 4ths 36+x+5y`);
    t3.report(T, `§10 Chromatic 3rds 36+x+4y`);
    tS.report(T, `§10 Chromatic Sequential 36+x+8y`);
    T.eq(`§10 Chromatic 4ths sağ üst`, Sc.padNote(chr[0], 36, 7, 7), 78);
    var CmPS = st({ idx: idxOf('Minor Pentatonic'), layoutIdx: 2 });
    T.eq(`§10 C Minor Pent. Sequential p=15`, [Sc.defaultPos(CmPS)].concat(row(CmPS, 15, 0)), [15, 36, 39, 41, 43, 46, 48, null, null]);
    T.eq(`§10 C Major p=70 satır 0`, row(CM, 70, 0), [120, 122, 124, 125, 127, null, null, null]);
    var t = { pos: 21 };
    Sc.octUp(CM, t); Sc.octUp(CM, t);
    T.eq(`§10 Octave ▲×2: p ve (0,1) 4ths/3rds/Seq`,
      [t.pos, Sc.padNote(CM, 35, 0, 1), Sc.padNote(st({ layoutIdx: 1 }), 35, 0, 1), Sc.padNote(st({ layoutIdx: 2 }), 35, 0, 1)], [35, 65, 64, 72]);

    // Şüpheci sorusu (dogrulanmis-scale.md)
    T.eq(`şüpheci: C3 tabanında In Key (0,1) 4ths/3rds/Seq`, [Sc.noteName(Sc.padNote(CM, 35, 0, 1)),
      Sc.noteName(Sc.padNote(st({ layoutIdx: 1 }), 35, 0, 1)), Sc.noteName(Sc.padNote(st({ layoutIdx: 2 }), 35, 0, 1))], ['F3', 'E3', 'C4']);
    var tc = { pos: Sc.defaultPos(chr[0]) };
    Sc.octUp(chr[0], tc); Sc.octUp(chr[0], tc);
    T.eq(`şüpheci: Chromatic C3 tabanında (0,1) 4ths/3rds/Seq`, [tc.pos, Sc.padNote(chr[0], 60, 0, 1), Sc.padNote(chr[1], 60, 0, 1), Sc.padNote(chr[2], 60, 0, 1)], [60, 65, 64, 68]);
    T.eq(`şüpheci: Sequential + In Key (0,1)−(0,0) = 12`, Sc.padNote(st({ layoutIdx: 2 }), 21, 0, 1) - Sc.padNote(st({ layoutIdx: 2 }), 21, 0, 0), 12);

    // Oktav sınırları
    t = { pos: 21 }; var downs = 0, ups = 0;
    while (Sc.canDown(CM, t) && downs < 50) { Sc.octDown(CM, t); downs++; }
    var tu = { pos: 21 };
    while (Sc.canUp(CM, tu) && ups < 50) { Sc.octUp(CM, tu); ups++; }
    T.eq(`C Major oktav sınırları: 3 aşağı, 7 yukarı`, [downs, ups], [3, 7]);

    // Tarama: her gam × kök × In Key × Fixed × düzen; padNote ≤ 127, realign sonrası 0 ≤ pos < posCount
    var t127 = tally(), tRe = tally(), states = [];
    for (var idx = 0; idx < Sc.SCALES.length; idx++) for (var root = 0; root < 12; root++)
      for (var ik = 0; ik < 2; ik++) for (var fx = 0; fx < 2; fx++) for (var li = 0; li < 3; li++)
        states.push(st({ root: root, idx: idx, inKey: !!ik, fixed: !!fx, layoutIdx: li }));
    states.forEach(function (S) {
      var pc = Sc.posCount(S), xs = [0, Sc.W(S) - 1, 7];
      for (var p = 0; p < pc; p++) for (var a = 0; a < 3; a++) for (var yy = 0; yy < 8; yy += 7) {
        var m = Sc.padNote(S, p, xs[a], yy);
        if (m !== null && !(m >= 0 && m <= 127 && m === Math.floor(m))) t127.check(false, `${js(S)} pos ${p} → ${m}`);
        else t127.check(true);
      }
    });
    function checkRealign(Sa, Sb) {
      var pc = Sc.posCount(Sa);
      [0, Sc.P(Sa), Sc.defaultPos(Sa), pc - Sc.L(Sa), pc - 1].forEach(function (p) {
        var q = Sc.realign(Sa, Sb, p);
        tRe.check(q >= 0 && q < Sc.posCount(Sb), `${js(Sa)} → ${js(Sb)} pos ${p} → ${q}`);
      });
    }
    states.forEach(function (S) {
      if (S.layoutIdx !== 0) return;   // düzen L/P/posCount'u değiştirmez
      for (var r = 0; r < 12; r += 1) checkRealign(S, st({ root: r, idx: S.idx, inKey: S.inKey, fixed: S.fixed }));
      for (var i = 0; i < Sc.SCALES.length; i += 3) checkRealign(S, st({ root: S.root, idx: i, inKey: S.inKey, fixed: S.fixed }));
      checkRealign(S, st({ root: S.root, idx: S.idx, inKey: !S.inKey, fixed: S.fixed }));
      checkRealign(S, st({ root: S.root, idx: S.idx, inKey: S.inKey, fixed: !S.fixed }));
    });
    t127.report(T, `padNote hiçbir zaman 127'yi aşmaz (${states.length} durum × tüm pos)`);
    tRe.report(T, `realign sonrası 0 ≤ pos < posCount`);
  }

  // ================================================================ 2. drum eşlemesi
  function suiteDrum(T, X) {
    var Sc = X.scale;
    if (!Sc) { T.fail('P3.scale', `modül yüklenmemiş`); return; }
    var d = { grid: 3, page: 0, loopOff: 0, bank: 0 };
    T.eq('drumCell pad 0 = (0,0)', Sc.drumCell(0, 0, d), { k: 'drum', pad: 0 });
    T.eq('drumCell (3,3) = 15', Sc.drumCell(3, 3, d), { k: 'drum', pad: 15 });
    T.eq('step (0,7)=0, (7,7)=7, (0,6)=8, (7,4)=31', [Sc.drumCell(0, 7, d).step, Sc.drumCell(7, 7, d).step, Sc.drumCell(0, 6, d).step, Sc.drumCell(7, 4, d).step], [0, 7, 8, 31]);
    T.eq('loop (4,3)=0, (7,3)=3, (4,2)=4, (7,0)=15', [Sc.drumCell(4, 3, d).page, Sc.drumCell(7, 3, d).page, Sc.drumCell(4, 2, d).page, Sc.drumCell(7, 0, d).page], [0, 3, 4, 15]);
    var tr = tally();
    [0, 2, 4, 6].forEach(function (g) {
      for (var y = 4; y < 8; y++) for (var x = 6; x < 8; x++)
        tr.check(Sc.drumCell(x, y, { grid: g, page: 0, loopOff: 0, bank: 0 }).k === 'none', `grid ${g} (${x},${y})`);
    });
    tr.report(T, `triplet'te step sütunları 6–7 'none'`);
    T.eq(`loopPadBeats her çözünürlükte`, [0, 1, 2, 3, 4, 5, 6, 7].map(function (g) { return round(Sc.loopPadBeats({ grid: g }), 9); }), [2, 4, 4, 4, 4, 4, 4, 4]);
    T.eq('pageBeats = CLIP_LEN', [0, 1, 2, 3, 4, 5, 6, 7].map(function (g) { return round(Sc.pageBeats({ grid: g }), 9); }), Sc.CLIP_LEN);
    var bk = { bank: 0 }, up = [], dn = [];
    while (Sc.drumCanUp(bk) && up.length < 20) up.push(Sc.drumBankUp(bk));
    bk = { bank: 0 };
    while (Sc.drumCanDown(bk) && dn.length < 20) dn.push(Sc.drumBankDown(bk));
    T.eq(`drum bank Octave ▲ / ▼ dizileri`, [up, dn], [[16, 32, 48, 64, 76], [-16, -32, -36]]);
    var K = X.drums && X.drums.KIT;
    if (!K) { T.skip(`KIT eşlemesi (§A7)`, `P3.drums yüklenmemiş`); return; }
    var kinds = K.map(function (s) { return s.kind || null; });
    T.eq(`KIT eşlemesi (§A7): sample 0/2/6/10, synth 1/3/5/13, 8 boş`, kinds,
      ['sample', 'synth', 'sample', 'synth', null, 'synth', 'sample', null, null, null, 'sample', null, null, 'synth', null, null]);
  }

  // ================================================================ 3. registry
  function suiteRegistry(T, X) {
    var D = X.dev;
    if (!D || !D.CONTROLS) { T.fail('P3.dev', `modül yüklenmemiş`); return; }
    var C = D.CONTROLS, ids = Object.keys(C);
    function hitId(x, y) { var h = D.hitTest(x, y); return h && h.pad ? 'pad:' + h.pad.join(',') : h; }
    function bbox(h) { return h.r ? { x: h.cx - h.r, y: h.cy - h.r, w: 2 * h.r, h: 2 * h.r } : h; }

    var tk = tally(), KINDS = { btn: 1, enc: 1, pad: 1, strip: 1, dpad: 1, octpage: 1, lcd: 1 };
    ids.forEach(function (id) {
      var c = C[id], h = c.hit;
      tk.check(c.id === id && KINDS[c.kind] && h && (h.r ? h.r > 0 : h.w > 0 && h.h > 0), id);
    });
    tk.report(T, `kayıt biçimi (${ids.length} kontrol)`);

    // 64 pad formülü: x = 589 + 152c, y = 866 + 114r, 146 × 108 (r üstten)
    var tp = tally();
    for (var i = 0; i < 64; i++) {
      var r = i >> 3, c = i & 7, px = [c, 7 - r], rc = D.svgRect({ pad: px });
      var exp = { x: 589 + 152 * c, y: 866 + 114 * r, w: 146, h: 108 };
      tp.check(rc && rc.x === exp.x && rc.y === exp.y && rc.w === exp.w && rc.h === exp.h, `pad ${i} kutu ${js(rc)}`);
      tp.check(js(D.padAt(exp.x + 73, exp.y + 54)) === js(px), `pad ${i} padAt`);
      tp.check(hitId(exp.x + 73, exp.y + 54) === 'pad:' + px.join(','), `pad ${i} hitTest`);
    }
    tp.report(T, `64 pad formülü (kutu, padAt, hitTest)`);

    // Çapraz bölgeler: Frame 34 (Octave/Page) ve Frame 35 (D-pad), 4 köşe (köşegenin iki yanı) + merkez
    [['octpage', 'Frame 34'], ['dpad', 'Frame 35']].forEach(function (pair) {
      var g = D.GROUPS && D.GROUPS[pair[0]];
      if (!g) { T.fail(`${pair[1]} çapraz hit-test`, `GROUPS.${pair[0]} yok`); return; }
      var X0 = g.x, Y0 = g.y, X1 = g.x + g.w, Y1 = g.y + g.h, e = 0.01;
      var got = [
        hitId(X0 + 10, Y0 + 2), hitId(X0 + 2, Y0 + 10), hitId(X1 - 10, Y0 + 2), hitId(X1 - 2, Y0 + 10),
        hitId(X0 + 10, Y1 - 2), hitId(X0 + 2, Y1 - 10), hitId(X1 - 10, Y1 - 2), hitId(X1 - 2, Y1 - 10)
      ];
      var exp = [g.up, g.left, g.up, g.right, g.down, g.left, g.down, g.right];
      if (g.center) { got.push(hitId(g.cx, g.cy)); exp.push(g.center); }
      else {
        // Merkez köşegenlerin kesişimi; tam merkez belgelenmiş eşitlik kuralına göre bir yaprağa düşer.
        got.push(hitId(g.cx, g.cy - e), hitId(g.cx, g.cy + e), hitId(g.cx - e, g.cy), hitId(g.cx + e, g.cy));
        exp.push(g.up, g.down, g.left, g.right);
        var center = hitId(g.cx, g.cy);
        got.push([g.up, g.down, g.left, g.right].indexOf(center) >= 0 ? 'yaprak' : center);
        exp.push('yaprak');
      }
      T.eq(`${pair[1]} (${pair[0]}) çapraz hit-test: 4 köşe + merkez`, got, exp);
    });

    // Çakışma: hiçbir hit bölgesi başka biriyle kesişmez (daireler kutu olarak; grup üyeleri grup kutusuyla)
    var regions = [];
    ids.forEach(function (id) { if (!C[id].group) regions.push([id, bbox(C[id].hit)]); });
    Object.keys(D.GROUPS || {}).forEach(function (g) { regions.push(['grup:' + g, D.svgRect(g)]); });
    var bad = [];
    for (var a = 0; a < regions.length; a++) for (var b = a + 1; b < regions.length; b++) {
      var p = regions[a][1], q = regions[b][1];
      if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) bad.push(regions[a][0] + ` × ` + regions[b][0]);
    }
    T.ok(`hit bölgeleri çakışmıyor`, bad.length === 0, bad.length ? `çakışan: ${bad.slice(0, 6).join(', ')}` : `${regions.length} bölge`);

    // Her kontrolün temsili noktası kendini döndürür
    var ts = tally();
    ids.forEach(function (id) {
      var c = C[id], h = c.hit, pt;
      if (h.r) pt = [h.cx, h.cy];
      else if (c.dir && c.dir !== 'center' && c.group) {
        var g = D.GROUPS[c.group];
        var base = { up: [h.x + h.w / 2, h.y], down: [h.x + h.w / 2, h.y + h.h], left: [h.x, h.y + h.h / 2], right: [h.x + h.w, h.y + h.h / 2] }[c.dir];
        pt = [base[0] + (g.cx - base[0]) / 3, base[1] + (g.cy - base[1]) / 3];
      } else pt = [h.x + h.w / 2, h.y + h.h / 2];
      var got = D.hitTest(pt[0], pt[1]);
      ts.check(id === 'pads' ? !!(got && got.pad) : got === id, `${id} → ${js(got)}`);
    });
    ts.report(T, `her kontrolün merkezi kendini döndürür`);
  }

  // ================================================================ 4. parametreler
  function suiteParams(T, X) {
    var W = X.wtp;
    if (!W) { T.fail('P3.wtp', `modül yüklenmemiş`); return; }
    T.eq(`WT_PARAMS 106 kayıt, AMP 104, PITCH 105`, [W.PARAMS.length, W.IDX.AMP, W.IDX.PITCH], [106, 104, 105]);
    var tr = { id: 0, kind: 'synth', p: null, mods: {} };
    W.applyPreset(tr, 'init');
    var tDef = tally(), tFmt = tally(), tRt = tally(), maxErr = 0;
    W.PARAMS.forEach(function (p) {
      tDef.check(p.def >= p.min && p.def <= p.max, `${p.k} def ${p.def} ∉ [${p.min}, ${p.max}]`);
      for (var j = -1; j <= 20; j++) {
        var v = j < 0 ? p.def : W.fromNorm(p, j / 20), s;
        try { s = W.fmt(p, v, tr); } catch (e) { s = 'HATA ' + errText(e); }
        tFmt.check(typeof s === 'string' && s.length > 0 && s.indexOf('NaN') < 0 && s.indexOf('undefined') < 0 && s.indexOf('HATA') !== 0, `${p.k} fmt(${v}) = ${s}`);
      }
      if (p.curve === 'int' || p.curve === 'enum' || p.curve === 'bool') {
        for (var x = p.min; x <= p.max; x++) tRt.check(W.fromNorm(p, W.toNorm(p, x)) === x, `${p.k} ${x}`);
      } else {
        for (var i = 0; i <= 200; i++) {
          var n = i / 200, v2 = W.fromNorm(p, n), err = Math.abs(W.toNorm(p, v2) - n);
          if (p.curve === 'gain' && n === 0) err = Math.abs(v2);   // n=0 → −inf dB (0)
          if (err > maxErr) maxErr = err;
          tRt.check(err <= 1e-6, `${p.k} n=${n} hata ${err}`);
        }
      }
    });
    tDef.report(T, `her parametrede def aralık içinde`);
    tFmt.report(T, `fmt() hata vermiyor (def + 21 noktalı ızgara)`);
    tRt.report(T, `eğri gidiş-dönüşü ≤ 1e−6`, `en büyük hata ${maxErr.toExponential(1)}`);
  }

  // ================================================================ 5. LED kuralları
  // controlLed/padColor P3.S'yi okur: kural, senkron bir blokta geçici bir durumla çağrılır.
  function withState(X, S, fn) {
    var prev = X.S;
    X.S = S;
    try { return fn(); } finally { X.S = prev; }
  }

  function suiteLeds(T, X) {
    var L = X.leds;
    if (!L || !L.controlLed || !L.padColor) { T.fail('P3.leds', `modül yüklenmemiş`); return; }
    if (!X.initState || !X.K) { T.fail('P3.leds', `p3-core yüklenmemiş`); return; }
    var K = X.K.C, shade = L.color.shade, tint = L.color.tint, W = '#FFFFFF';
    var probe = freshState(X), SYN = probe.tracks[0].color, DRM = probe.tracks[1].color;
    function st(m, c) { return { m: m, c: c }; }
    var OFF = st('off', K.ledOff), DIM = st('dim', K.ledDim), ON = st('on', K.ledOn);
    function clip() {
      return { len: 4, loop: [0, 4], notes: [
        { t: 0, p: 36, d: 0.25, v: 127, m: false }, { t: 1, p: 36, d: 0.25, v: 80, m: false },
        { t: 2, p: 36, d: 0.25, v: 30, m: false }, { t: 3, p: 36, d: 0.25, v: 100, m: true }] };
    }
    function drum(S) { S.sel.track = 1; }
    // [ad, durum yaması, [[kontrol id | [x,y], beklenen {m,c} | pad hex], …]]
    var CASES = [
      [`C Major: kök pad track rengi, gam içi beyaz`, null, [[[0, 0], SYN], [[1, 0], K.white], [[7, 0], SYN]]],
      [`Chromatic: gam dışı pad off, gam içi beyaz`, function (S) { S.scale.inKey = false; S.tracks[0].pos = 36; },
        [[[0, 0], SYN], [[1, 0], K.off], [[2, 0], K.white]]],
      [`Sequential pentatonik: sütun 6–7 off`, function (S) { S.scale.idx = 11; S.scale.layoutIdx = 2; S.tracks[0].pos = 15; },
        [[[5, 0], SYN], [[6, 0], K.off], [[7, 0], K.off]]],
      [`Drum: seçili pad beyaz, sesli pad track rengi, boş pad gri`, drum, [[[0, 0], K.white], [[1, 0], DRM], [[3, 3], K.gray]]],
      ['Drum step: velocity kademeleri ve mute tint', function (S) { drum(S); S.tracks[1].clips[0] = clip(); },
        [[[0, 7], DRM], [[4, 7], shade(DRM, 0.65)], [[0, 6], shade(DRM, 0.4)], [[4, 6], tint(DRM, 0.55)], [[1, 7], K.gray]]],
      [`Drum triplet: sağdaki iki sütun off`, function (S) { drum(S); S.tracks[1].grid = 2; }, [[[6, 7], K.off], [[7, 4], K.off], [[5, 7], K.gray]]],
      ['Octave Up: canUp false iken off', function (S) { S.tracks[0].pos = X.scale.posCount(S.scale) - X.scale.L(S.scale); },
        [['octaveUp', OFF], ['octaveDown', ON]]],
      ['Octave Down: pos 0 iken off', function (S) { S.tracks[0].pos = 0; }, [['octaveUp', ON], ['octaveDown', OFF]]],
      ['Octave (drum): bank 76 iken Up off', function (S) { drum(S); S.tracks[1].bank = 76; }, [['octaveUp', OFF], ['octaveDown', ON]]],
      [`Repeat açık, rate 5: scene6 yeşil`, function (S) { S.tracks[0].repeat = { on: true, rate: 5 }; },
        [['scene6', st('on', K.repeatGreen)], ['scene4', DIM], ['repeat', st('pulse', K.ledOn)]]],
      [`Repeat açık (drum), rate 5: scene6 yeşil, grid sönük`, function (S) { drum(S); S.tracks[1].repeat = { on: true, rate: 5 }; },
        [['scene6', st('on', K.repeatGreen)], ['scene4', DIM]]],
      ['Drum grid 1/16: scene4 beyaz', drum, [['scene4', ON], ['scene1', DIM]]],
      [`Scale menüsü D Minor: upper4 beyaz, diğer kökler dim, In Key on`, function (S) { S.overlay = 'scale'; S.scale.root = 2; S.scale.idx = 1; },
        [['upper4', st('on', W)], ['upper2', st('dim', shade(W, 0.4))], ['lower1', st('on', W)], ['lower8', st('dim', shade(W, 0.4))], ['scale', ON]]],
      [`Scale menüsü gam listesi başında: D-pad Up/Left off`, function (S) { S.overlay = 'scale'; S.scale.idx = 0; },
        [['dpadUp', OFF], ['dpadLeft', OFF], ['dpadDown', DIM], ['dpadRight', DIM]]],
      [`Transport: Play yeşil, Record rec kırmızı`, function (S) { S.transport.playing = true; S.transport.rec = 'rec'; },
        [['play', st('on', K.playGreen)], ['record', st('on', K.red)]]],
      ['Record: bekleme (pending) blink, Play durukken dim', function (S) { S.transport.rec = 'pending'; },
        [['record', st('blink', K.red)], ['play', DIM]]],
      [`Metronom açık: pulse`, function (S) { S.transport.metro = true; }, [['metronome', st('pulse', K.ledOn)]]],
      [`Mute ve Accent açık: on`, function (S) { S.tracks[0].mute = true; S.accent.on = true; }, [['mute', ON], ['accent', ON], ['solo', DIM]]],
      [`Zincir görünümü: seçili track beyaz, diğeri track ×0.5`, null,
        [['upper1', st('on', W)], ['lower1', st('on', W)], ['lower2', st('dim', shade(DRM, 0.5))], ['lower3', OFF]]],
      ['LED olmayan kontroller ve User/Convert off', null, [['enc1', OFF], ['volume', OFF], ['strip', OFF], ['pads', OFF], ['user', OFF], ['convert', OFF]]]
    ];
    CASES.forEach(function (cs) {
      var S = freshState(X);
      if (cs[1]) cs[1](S);
      var got = [], exp = [];
      try {
        withState(X, S, function () {
          cs[2].forEach(function (e) {
            if (Array.isArray(e[0])) { got.push(L.padColor(e[0][0], e[0][1])); exp.push(e[1]); }
            else { var s = L.controlLed(e[0]); got.push(e[0] + ' ' + s.m + ':' + s.c); exp.push(e[0] + ' ' + e[1].m + ':' + e[1].c); }
          });
        });
        T.eq(cs[0], got, exp);
      } catch (e) { T.fail(cs[0], `hata: ${errText(e)}`); }
    });
  }

  // ================================================================ 6. öğretici
  function setPath(X, S, path, v) {
    var parts = String(path).split('.'), o = S;
    for (var i = 0; i < parts.length - 1; i++) {
      var k = parts[i];
      if (o[k] === undefined || o[k] === null) o[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      o = o[k];
    }
    var last = parts[parts.length - 1];
    // 'tracks.0.p.o1Pos' → PARAMS indeksi
    if (ArrayBuffer.isView(o) && !/^\d+$/.test(last) && X.wtp && X.wtp.IDX && has(X.wtp.IDX, last)) last = X.wtp.IDX[last];
    if (v === undefined && !Array.isArray(o) && !ArrayBuffer.isView(o)) delete o[last];
    else o[last] = v;
  }
  function getPath(S, path) {
    var o = S, parts = String(path).split('.');
    for (var i = 0; i < parts.length && o != null; i++) o = o[parts[i]];
    return o;
  }

  // Test emu'su: README §G13'teki emu arayüzü, canlı store yerine ayrık bir durum nesnesi üzerinde.
  function makeEmu(X, S, unknown) {
    function applyPreset(id) {
      var i = (S.tracks || []).findIndex(function (t) { return t.kind === 'synth'; });
      var tr = S.tracks[i < 0 ? 0 : i];
      if (!tr || !X.wtp || !X.wtp.PRESETS || !X.wtp.PRESETS[id]) return false;
      X.wtp.applyPreset(tr, id);
      tr.preset = id;
      return true;
    }
    function base() {
      var F = freshState(X);
      Object.keys(S).forEach(function (k) { delete S[k]; });
      Object.keys(F).forEach(function (k) { S[k] = F[k]; });
      // sartname-ogretici §5 tutorial-base: 120 BPM, swing 0, C Major / In Key / 4ths / pos 21, repeat 1/8, −10 dB
      S.transport.bpm = 120; S.transport.swing = 0;
      S.scale = { root: 0, idx: 0, inKey: true, fixed: false, layoutIdx: 0 };
      S.tracks.forEach(function (t) { if (t.kind === 'synth') t.pos = 21; t.repeat = { on: false, rate: 5 }; });
      S.vol.main = -10; S.view = 'device'; S.pad = 'note';
    }
    var emu = {
      S: S,
      load: function (x) {
        if (x == null || x === 'tutorial-base') { base(); return true; }
        if (typeof x === 'string') return applyPreset(x);
        if (typeof x === 'object') {
          if (x.base !== false) base();
          if (x.preset) applyPreset(x.preset);
          Object.keys(x).forEach(function (k) {
            if (k === 'preset' || k === 'base') return;
            if (k.indexOf('.') >= 0) setPath(X, S, k, deepClone(x[k]));
            else if (x[k] && typeof x[k] === 'object' && !Array.isArray(x[k]) && S[k] && typeof S[k] === 'object') {
              for (var j in x[k]) S[k][j] = deepClone(x[k][j]);
            } else S[k] = deepClone(x[k]);
          });
          return true;
        }
        return false;
      },
      set: function (o) { for (var p in o || {}) setPath(X, S, p, o[p]); },
      openOverlay: function (name) { S.overlay = name || null; },
      select: function (i) { S.sel.track = i; S.bankView = false; if (S.wtui) S.wtui.touched = -1; }
    };
    if (typeof Proxy !== 'function') return emu;
    // Sözleşme dışı emu yöntemleri yok sayılır ama kaydedilir (detayda uyarı olarak görünür).
    return new Proxy(emu, {
      get: function (o, k) {
        if (k in o || typeof k !== 'string' || k === 'then') return o[k];
        return function () { unknown.push(k); };
      }
    });
  }

  function makeRt(X, tut, S) {
    var mk = tut && (tut.makeRt || tut.newRt || tut.createRt);
    if (typeof mk === 'function') {
      try { var r = mk(S); if (r && typeof r === 'object') return r; } catch (e) { /* yedek rt */ }
    }
    var base = deepClone(S);
    // sartname-ogretici §4 rt alanları + yardımcıların kurulum anındaki (etkileşimsiz) karşılıkları
    return {
      base: base, notes: [], held: new Set(), presses: [], repeatHits: {}, flags: {}, t0: nowMs(),
      moved: function (path, amt) { return Math.abs((+getPath(S, path) || 0) - (+getPath(base, path) || 0)) >= (amt || 1e-9); },
      pcsHeld: function () { return new Set(); },
      seq: function () { return false; },
      after: function () { return false; }
    };
  }

  function listOf(v, S) {
    if (typeof v === 'function') { try { v = v(S); } catch (e) { v = []; } }
    return [].concat(v || []);
  }

  function suiteTutorial(T, X) {
    var tut = X.tut;
    if (!tut || !tut.CURRICULUM) { T.skip(`müfredat`, `P3.tut.CURRICULUM yüklenmemiş`); return; }
    var chs = Array.isArray(tut.CURRICULUM) ? tut.CURRICULUM : (tut.CURRICULUM.chapters || []);
    var haveIds = chs.map(function (c) { return c.id; });
    var missing = FAZ1_CHAPTERS.filter(function (s) { return haveIds.indexOf(s) < 0; });
    T.ok(`Faz 1 bölümleri (§F)`, missing.length === 0, missing.length ? `eksik: ${missing.join(', ')}` : haveIds.join(', '));
    var D = X.dev, seen = {}, dups = [];
    function expand(list) { return D && D.expand ? D.expand(list) : list.filter(function (s) { return typeof s === 'string'; }); }

    chs.forEach(function (ch) {
      var chPhase = ch.phase || 1;
      if (chPhase > 1) { T.skip(`${ch.id}`, `Faz ${chPhase} bölümü (${(ch.steps || []).length} adım)`); return; }
      (ch.steps || []).forEach(function (step) {
        var ad = `${ch.id}/${step.id}`;
        if (seen[ad]) dups.push(ad);
        seen[ad] = true;
        var phase = step.phase || chPhase;
        if (phase > 1) { T.skip(ad, `Faz ${phase} adımı`); return; }
        var probs = [], notes = [], unknown = [];
        var S = freshState(X), emu = makeEmu(X, S, unknown), result;
        try {
          if (typeof ch.setup === 'function') ch.setup(emu);
          if (typeof step.stepSetup === 'function') step.stepSetup(emu);
        } catch (e) { probs.push(`setup hatası: ${errText(e)}`); }

        // targets registry'de ve allow içinde
        var allow = listOf(step.allow, S), targets = listOf(step.targets, S);
        var allowIds = expand(allow.concat(ALWAYS_ALLOWED)), allowPads = allow.indexOf('pads') >= 0;
        allow.forEach(function (a) {
          if (typeof a === 'string' && expand([a]).length === 0) probs.push(`allow'da registry'de olmayan '${a}'`);
        });
        targets.forEach(function (tg) {
          if (tg && tg.pad) {
            var ok = Array.isArray(tg.pad) && tg.pad[0] >= 0 && tg.pad[0] < 8 && tg.pad[1] >= 0 && tg.pad[1] < 8;
            if (!ok) probs.push(`geçersiz pad hedefi ${js(tg)}`);
            else if (!allowPads && !allow.some(function (a) { return a && a.pad && a.pad[0] === tg.pad[0] && a.pad[1] === tg.pad[1]; })) probs.push(`hedef ${js(tg)} allow'da yok`);
            return;
          }
          if (typeof tg !== 'string') { probs.push(`tanınmayan hedef ${js(tg)}`); return; }
          var ids = expand([tg]);
          if (!ids.length) { probs.push(`hedef '${tg}' registry'de yok`); return; }
          var out = ids.filter(function (id) { return allowIds.indexOf(id) < 0; });
          if (out.length) probs.push(`hedef '${tg}' allow dışında (${out.slice(0, 3).join(', ')})`);
        });

        // check(setup) === false
        if (typeof step.check !== 'function') {
          if (step.kind === 'action') probs.push(`action adımında check yok`);
          else notes.push(`check yok (${step.kind || `tür yok`})`);
        } else if (!probs.length || probs.every(function (p) { return p.indexOf('setup') !== 0; })) {
          try {
            result = step.check(S, makeRt(X, tut, S));
            if (result) probs.push(`check(setup) = ${js(result)} (false olmalı)`);
            else if (result !== false) notes.push(`check(setup) = ${js(result)} (falsy, 'false' değil)`);
          } catch (e) { probs.push(`check hatası: ${errText(e)}`); }
        }
        if (unknown.length) notes.push(`UYARI: sözleşme dışı emu çağrısı ${unknown.join(', ')} (test emu'sunda yok sayıldı)`);
        var d = probs.length ? probs.join('; ') : `check false · hedef ${targets.length ? js(targets) : `—`}`;
        T.ok(ad, probs.length === 0, d + (notes.length ? ` · ` + notes.join('; ') : ''));
      });
    });
    T.ok(`adım kimlikleri benzersiz`, dups.length === 0, dups.length ? dups.join(', ') : `${Object.keys(seen).length} adım`);
  }

  // ================================================================ 7. ses: analiz
  function fft(re, im) {   // yerinde, radix-2
    var n = re.length, i, j, bit, len, k, t;
    for (i = 1, j = 0; i < n; i++) {
      for (bit = n >> 1; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (len = 2; len <= n; len <<= 1) {
      var ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (k = 0; k < half; k++) {
          var a = i + k, b = a + half;
          var tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }
  // Blackman-Harris (4 terim) pencereli genlik spektrumu, 0..N/2
  function spectrum(x, start, N) {
    var re = new Float64Array(N), im = new Float64Array(N), a0 = 0.35875, a1 = 0.48829, a2 = 0.14128, a3 = 0.01168;
    for (var i = 0; i < N; i++) {
      var w = a0 - a1 * Math.cos(2 * Math.PI * i / (N - 1)) + a2 * Math.cos(4 * Math.PI * i / (N - 1)) - a3 * Math.cos(6 * Math.PI * i / (N - 1));
      re[i] = (x[start + i] || 0) * w;
    }
    fft(re, im);
    var mag = new Float64Array(N / 2 + 1);
    for (var k = 0; k <= N / 2; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    return mag;
  }
  function db(x) { return 20 * Math.log10(Math.max(x, 1e-300)); }
  function fftDb(x, start, N) { var m = spectrum(x, start, N), o = new Float64Array(m.length); for (var i = 0; i < m.length; i++) o[i] = db(m[i]); return o; }
  function peakNear(mag, bin, r) {
    r = r === undefined ? 4 : r;
    var m = 0, c = Math.round(bin);
    for (var k = Math.max(0, c - r); k <= Math.min(mag.length - 1, c + r); k++) if (mag[k] > m) m = mag[k];
    return m;
  }
  function maxStepDiff(x, a, b) { var m = 0; for (var i = Math.max(1, a); i < Math.min(b, x.length); i++) { var d = Math.abs(x[i] - x[i - 1]); if (d > m) m = d; } return m; }
  function onset(x, thr, from) { thr = thr || 1e-3; for (var i = Math.max(0, from || 0); i < x.length; i++) if (Math.abs(x[i]) > thr) return i; return -1; }
  function peak(x, a, b) { var m = 0; for (var i = a || 0; i < (b === undefined ? x.length : b); i++) { var v = Math.abs(x[i]); if (v > m) m = v; } return m; }
  function mtof(p) { return 440 * Math.pow(2, (p - 69) / 12); }
  // Kararlı pencerede harmonik olmayan en güçlü bileşen, en güçlü bileşene göre dB (limitHz altı).
  function aliasDb(x, start, N, f0, fs, limitHz) {
    var mag = spectrum(x, start, N), bin = fs / N, ref = 0, k;
    for (k = 1; k < mag.length; k++) if (mag[k] > ref) ref = mag[k];
    var guard = 6 * bin, worst = 0, worstHz = 0;   // Blackman-Harris ana lobu ±4 bin
    for (k = 1; k * bin < limitHz; k++) {
      var f = k * bin, h = Math.max(1, Math.round(f / f0));
      if (Math.abs(f - h * f0) <= guard) continue;
      if (mag[k] > worst) { worst = mag[k]; worstHz = f; }
    }
    return { rel: db(worst / ref), hz: worstHz };
  }

  // ================================================================ 7. ses: render (tarayıcı)
  var tableCache = {}, tgWorker = null, tgPending = {};

  function assetUrl(file) { return '/assets/js/push3/' + file + '?v=' + ((P3.K && P3.K.V) || ''); }

  function audioSupported() {
    var OAC = typeof OfflineAudioContext === 'function' ? OfflineAudioContext : null;
    var secure = typeof isSecureContext === 'undefined' || isSecureContext;
    return !!(OAC && typeof AudioWorkletNode === 'function' && 'audioWorklet' in OAC.prototype && secure);
  }

  function fetchText(u) {
    return fetch(u).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (t) {
      if (/^\s*</.test(t)) throw new Error(`JS yerine HTML geldi`);
      return t;
    });
  }

  function loadWorklet(ctx) {
    var u = assetUrl('p3-wt-worklet.js');
    return ctx.audioWorklet.addModule(u).catch(function () {
      return fetchText(u).then(function (text) {
        var b = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
        return ctx.audioWorklet.addModule(b).then(function () { URL.revokeObjectURL(b); });
      });
    });
  }

  // Tablo verisi: sayfada P3TableGen varsa o; yoksa kendi Worker'ımız (üretim yolu); o da olmazsa <script>.
  function genTable(id) {
    var key = String(id);
    if (tableCache[key]) return tableCache[key];
    var p;
    if (window.P3TableGen) p = Promise.resolve(window.P3TableGen.generate(id, 'std'));
    else p = genInWorker(id).catch(function () {
      return loadTableScript().then(function (TG) { return TG.generate(id, 'std'); });
    });
    tableCache[key] = p;
    p.catch(function () { delete tableCache[key]; });
    return p;
  }
  function genInWorker(id) {
    return new Promise(function (res, rej) {
      if (typeof Worker !== 'function') { rej(new Error('Worker yok')); return; }
      if (!tgWorker) {
        try { tgWorker = new Worker(assetUrl('p3-wt-tables.worker.js')); } catch (e) { rej(e); return; }
        tgWorker.onmessage = function (e) {
          var d = e.data || {}, cb = tgPending[String(d.id)];
          if (!cb) return;
          delete tgPending[String(d.id)];
          if (d.t === 'tdata') cb[0](d); else cb[1](new Error(d.msg || `tablo üretilemedi`));
        };
        tgWorker.onerror = function (e) {
          Object.keys(tgPending).forEach(function (k) { tgPending[k][1](new Error(`Worker hatası`)); });
          tgPending = {};
          if (e && e.preventDefault) e.preventDefault();
          try { tgWorker.terminate(); } catch (x) { /* kapalı */ }
          tgWorker = null;
        };
      }
      tgPending[String(id)] = [res, rej];
      tgWorker.postMessage({ t: 'gen', id: id, profile: 'std' });
    });
  }
  var tgScriptP = null;
  function loadTableScript() {
    if (window.P3TableGen) return Promise.resolve(window.P3TableGen);
    if (tgScriptP) return tgScriptP;
    tgScriptP = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = assetUrl('p3-wt-tables.worker.js');
      s.onload = function () { if (window.P3TableGen) res(window.P3TableGen); else rej(new Error('P3TableGen yok')); };
      s.onerror = function () { rej(new Error(`tablo üreticisi yüklenemedi`)); };
      document.head.appendChild(s);
    });
    tgScriptP.catch(function () { tgScriptP = null; });
    return tgScriptP;
  }
  function releaseWorker() {
    if (tgWorker) { try { tgWorker.terminate(); } catch (e) { /* kapalı */ } }
    tgWorker = null; tgPending = {};
  }

  // spec → {preset, p (Float32Array), mods, notes:[{id,n,v,at,off,bend}], sec, profile, maxVoices, fs}
  function buildSpec(presetId, notes, sec, opts) {
    opts = opts || {};
    var W = P3.wtp, tr = { id: 0, kind: 'synth', p: null, mods: {} };
    presetId = presetId || 'init';
    if (!W.PRESETS[presetId]) throw new Error(`bilinmeyen preset '${presetId}'`);
    W.applyPreset(tr, presetId);
    var set = opts.set || {};
    Object.keys(set).forEach(function (k) {
      if (!has(W.IDX, k)) throw new Error(`bilinmeyen parametre '${k}'`);
      tr.p[W.IDX[k]] = set[k];
    });
    Object.keys(opts.mods || {}).forEach(function (k) {
      tr.mods[k] = tr.mods[k] || {};
      for (var s in opts.mods[k]) tr.mods[k][s] = opts.mods[k][s];
    });
    var list = [].concat(notes || []).map(function (n, i) {
      if (typeof n === 'number') n = { n: n };
      return { id: n.id === undefined ? i + 1 : n.id, n: n.n, v: n.v === undefined ? 127 : n.v,
        at: n.at === undefined ? 0.01 : n.at, off: n.off, bend: n.bend };
    });
    return { preset: presetId, set: set, mods: opts.mods || null, p: tr.p, trMods: tr.mods, notes: list, sec: sec,
      profile: opts.profile || 'std', maxVoices: opts.maxVoices || 16, fs: opts.fs || FS };
  }

  function renderBrowser(spec) {
    if (!audioSupported()) return Promise.reject(new Error(`OfflineAudioContext + audioWorklet yok`));
    var W = P3.wtp, fs = spec.fs, t0 = PRE / fs;
    var ctx = new OfflineAudioContext({ numberOfChannels: 2, length: PRE + Math.ceil(spec.sec * fs), sampleRate: fs });
    var p = spec.p, I = W.IDX;
    function tid(o) { return W.audibleTable(W.tableId(p[I[o + 'Cat']], p[I[o + 'Tab']])); }
    var tabs = [];
    if (p[I.o1On] > 0.5) tabs.push([1, tid('o1')]);
    if (p[I.o2On] > 0.5) tabs.push([2, tid('o2')]);
    var ids = tabs.map(function (t) { return t[1]; }).concat(['sub']);
    return Promise.all([loadWorklet(ctx)].concat(ids.map(genTable))).then(function (res) {
      var tdata = {};
      ids.forEach(function (id, i) { tdata[String(id)] = res[i + 1]; });
      var node = new AudioWorkletNode(ctx, 'p3-wavetable', {
        numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
        processorOptions: { maxVoices: spec.maxVoices, spare: 4, profile: spec.profile }
      });
      node.connect(ctx.destination);
      var sent = {};
      function sendTable(id) {
        var d = tdata[String(id)];
        if (!d || sent[String(id)]) return;
        sent[String(id)] = true;
        node.port.postMessage({ t: 'tdata', id: id, F: d.F, levels: d.levels, buf: d.buf });   // kopya (tampon önbellekte kalır)
      }
      node.port.onmessage = function (e) { if (e.data && e.data.t === 'need') sendTable(e.data.id); };
      function setup() {
        node.port.postMessage({ t: 'init', params: W.PARAMS.map(function (q) { return { k: q.k, min: q.min, max: q.max, curve: q.curve, mod: q.mod }; }),
          def: new Float32Array(p), mods: spec.trMods, bpm: 120, profile: spec.profile });
        ids.forEach(sendTable);
        tabs.forEach(function (t) { node.port.postMessage({ t: 'tab', osc: t[0], id: t[1] }); });
        spec.notes.forEach(function (n) {
          node.port.postMessage({ t: 'on', id: n.id, n: n.n, v: n.v, at: t0 + n.at });
          if (n.bend) node.port.postMessage({ t: 'x', id: n.id, bend: n.bend, at: t0 + n.at + 0.001 });
          if (n.off !== undefined && n.off !== null) node.port.postMessage({ t: 'off', id: n.id, at: t0 + n.off });
        });
      }
      var rendering, sp = null, hookErr = null, timer = 0;
      try { sp = typeof ctx.suspend === 'function' ? ctx.suspend(t0) : null; } catch (e) { sp = null; }
      if (sp) {
        sp.then(function () { setup(); return sleep(MSG_WAIT_MS); })
          .then(function () { return ctx.resume(); })
          .catch(function (e) { hookErr = e; });
        rendering = ctx.startRendering();
      } else {
        setup();
        rendering = sleep(MSG_WAIT_MS).then(function () { return ctx.startRendering(); });
      }
      var timeout = new Promise(function (res, rej) {
        timer = setTimeout(function () { rej(new Error(`render zaman aşımı`)); }, RENDER_TIMEOUT_MS);
      });
      return Promise.race([rendering, timeout]).then(function (buf) {
        clearTimeout(timer);
        node.port.onmessage = null;
        if (hookErr) throw hookErr;
        return { L: buf.getChannelData(0).slice(PRE), R: buf.getChannelData(1).slice(PRE), fs: fs };
      }, function (e) { clearTimeout(timer); throw e; });
    });
  }

  function render(presetId, notes, sec, opts) {
    var spec;
    try { spec = buildSpec(presetId, notes, sec, opts); } catch (e) { return Promise.reject(e); }
    var impl = P3.test.audio.impl || renderBrowser;
    return Promise.resolve(impl(spec)).then(function (r) {
      var L = r.L;
      L.right = r.R;
      L.fs = r.fs || FS;
      return L;
    });
  }

  // ================================================================ 7. ses: ölçümler (sartname-dogrulama §2 + §H8)
  function suiteAudio(T) {
    var custom = !!P3.test.audio.impl;
    if (!custom && !audioSupported()) {
      [`aliasing: saw C0→C8 (std)`, 'Sub Tone %0: 3. harmonik', `onset sapması`, 'envelope A=500 ms',
        '8 ses vel 127 seviye', `voice steal sıçraması`].forEach(function (ad) { T.skip(ad, `OfflineAudioContext + audioWorklet yok`); });
      return Promise.resolve();
    }
    function step(ad, fn) {
      var t = nowMs();
      return Promise.resolve().then(fn).then(function (r) {
        T.ok(ad, r[0], r[1] + ` · ${Math.round(nowMs() - t)} ms`);
      }, function (e) { T.fail(ad, `hata: ${errText(e)}`); });
    }
    var ampShort = { ampS: 1, ampR: 0.0015 };

    return step(`aliasing: saw C0→C8 (std, fs/3 altı < −60 dB)`, function () {
      // Temel Şekiller kare 42 = testere; her nota 0.45 s, tek sayılı notalar çeyrek ton (Note PB) yukarıda
      var T0 = 0.02, SEG = 0.45, N = 16384, notes = [];
      for (var n = 12; n <= 108; n++) {
        var i = n - 12, det = n % 2 ? 0.5 : 0;
        notes.push({ id: i + 1, n: n, v: 127, at: T0 + i * SEG, off: T0 + i * SEG + 0.447, bend: det ? det / 48 : 0, det: det });
      }
      return render('init', notes, T0 + notes.length * SEG + 0.05, { set: { o1Pos: 42 / 63, ampS: 1, ampR: 0.0015 } }).then(function (L) {
        var fs = L.fs, worst = { rel: -Infinity };
        notes.forEach(function (nt) {
          var s = Math.round(nt.at * fs) + 4966;
          var a = aliasDb(L, s, N, mtof(nt.n + nt.det), fs, fs / 3);
          if (a.rel > worst.rel) { worst = a; worst.n = nt.n + nt.det; }
        });
        var silent = peak(L) < 1e-3;
        return [!silent && worst.rel < -60, silent ? `çıktı sessiz` :
          `en kötü harmonik dışı bileşen ${worst.rel.toFixed(1)} dB (nota ${worst.n}, ${Math.round(worst.hz)} Hz), ${notes.length} nota`];
      });
    }).then(function () {
      return step(`Sub Tone %0: 3. harmonik < −90 dB`, function () {
        var cases = [[48, 0], [60, 0], [72, 1], [84, 2], [96, 0]], worst = -Infinity, info = '';
        return cases.reduce(function (pr, cs) {
          return pr.then(function () {
            return render('init', [{ n: cs[0], at: 0.005 }], 1.6, { set: { o1On: 0, subOn: 1, subTone: 0, subOct: cs[1], ampS: 1 } }).then(function (L) {
              var fs = L.fs, N = 65536, mag = spectrum(L, L.length - N, N), f = mtof(cs[0]) / Math.pow(2, cs[1]), bin = fs / N;
              var h1 = peakNear(mag, f / bin, 3), h3 = peakNear(mag, 3 * f / bin, 3), r3 = db(h3 / h1);
              if (h1 < 1e-6) { worst = Infinity; info = `nota ${cs[0]} sessiz`; return; }
              if (r3 > worst) { worst = r3; info = `nota ${cs[0]} okt −${cs[1]}: 3. harmonik ${r3.toFixed(1)} dB`; }
            });
          });
        }, Promise.resolve()).then(function () { return [worst < -90, `en kötü ${info} (Worker 'sub' tablosu)`]; });
      });
    }).then(function () {
      return step(`onset sapması < 1 örnek`, function () {
        var fracs = [0, 37.3, 0.4, 0.49, 0.51, 99.99, 127.6, 128.4, 15999.9984 % 128], notes = [];
        fracs.forEach(function (fr, i) { notes.push({ id: i + 1, n: 69, at: 0.05 + 0.3 * i + fr / FS, off: 0.05 + 0.3 * i + 0.1 }); });
        return render('init', notes, 0.05 + 0.3 * fracs.length + 0.05, { set: { ampR: 0.0015 } }).then(function (L) {
          var fs = L.fs, offs = [];
          notes.forEach(function (nt) {
            var exp = Math.round(nt.at * fs), idx = onset(L, 1e-3, exp - 200);
            offs.push(idx < 0 ? NaN : idx - exp);
          });
          var ok = offs.every(isFinite), spread = ok ? Math.max.apply(null, offs) - Math.min.apply(null, offs) : NaN;
          // Ofset = zarfın eşiği geçme süresi; her notada aynı olmalı (planlama örnek doğruluğunda).
          return [ok && spread < 1 && offs[0] >= 0, `${notes.length} planlı nota, eşik ofsetleri ${js(offs)} örnek (yayılım ${spread})`];
        });
      });
    }).then(function () {
      return step(`envelope A=500 ms: tepeye 500 ± 10 ms`, function () {
        var at = 0.02;
        return render('init', [{ n: 69, at: at }], 0.85, { set: { ampA: 0.5, ampS: 1 } }).then(function (L) {
          var fs = L.fs, s0 = Math.round(at * fs), per = Math.round(fs / 440) + 2, env = [];
          for (var i = s0; i + per < L.length; i += per) env.push([i - s0 + per / 2, peak(L, i, i + per)]);
          var top = 0;
          env.forEach(function (e) { if (e[1] > top) top = e[1]; });
          var e999 = env.find(function (e) { return e[1] >= 0.998 * top; }), e90 = env.find(function (e) { return e[1] >= 0.9 * top; });
          var t999 = e999[0] / fs * 1000, t90 = e90[0] / fs * 1000;
          return [top > 1e-3 && Math.abs(t999 - 500) <= 10, `tepe ${t999.toFixed(1)} ms; %90 ${t90.toFixed(1)} ms (doğrusal attack'ta ≈450 ms)`];
        });
      });
    }).then(function () {
      return step(`8 ses vel 127: tepe < −1 dBFS, soft-clip devrede değil`, function () {
        var out = [], ok = true;
        return ['init', 'saw-lead'].reduce(function (pr, preset) {
          return pr.then(function () {
            var notes = [36, 43, 48, 52, 55, 60, 64, 67].map(function (n, i) { return { id: i + 1, n: n, at: 0.01 }; });
            return render(preset, notes, 2).then(function (L) {
              var pk = Math.max(peak(L), peak(L.right));
              ok = ok && pk > 1e-3 && pk < 0.891 && pk < 0.7;
              out.push(`${preset} ${db(pk).toFixed(1)} dBFS (diz 0.7 ${pk < 0.7 ? `aşılmadı` : `AŞILDI`})`);
            });
          });
        }, Promise.resolve()).then(function () { return [ok, out.join('; ')]; });
      });
    }).then(function () {
      return step(`voice steal: 9. nota anında maxStepDiff < 0.05`, function () {
        var out = [], ok = true;
        return ['init', 'saw-lead'].reduce(function (pr, preset) {
          return pr.then(function () {
            var notes = [48, 52, 55, 59, 62, 65, 69, 72].map(function (n, i) { return { id: i + 1, n: n, at: 0.01 }; });
            notes.push({ id: 9, n: 76, at: 0.4 });
            return render(preset, notes, 0.6, { set: { polyIdx: 6 } }).then(function (L) {
              var s = Math.round(0.4 * L.fs), before = maxStepDiff(L, s - 4800, s - 10), at = maxStepDiff(L, s - 2, s + 480);
              ok = ok && at < 0.05 && peak(L) > 1e-3;
              out.push(`${preset} ${at.toFixed(4)} (öncesi ${before.toFixed(4)})`);
            });
          });
        }, Promise.resolve()).then(function () { return [ok, out.join('; ')]; });
      });
    }).then(function () { releaseWorker(); }, function (e) { releaseWorker(); throw e; });
  }

  // ================================================================ çalıştırıcı
  var SUITES = [
    ['scale', suiteScale], ['drum', suiteDrum], ['registry', suiteRegistry], ['params', suiteParams],
    ['led', suiteLeds], ['ogretici', suiteTutorial]
  ];
  var running = null;

  function run(opts) {
    if (running) return running;
    opts = opts || {};
    var rows = [], only = opts.only ? [].concat(opts.only) : null, t0 = nowMs();
    function want(g) { return !only || only.indexOf(g) >= 0; }
    var chain = Promise.resolve();
    SUITES.forEach(function (s) {
      if (!want(s[0])) return;
      chain = chain.then(function () {
        var T = recorder(rows, s[0]);
        try { s[1](T, P3); } catch (e) { T.fail(`${s[0]} grubu`, `beklenmeyen hata: ${errText(e)}`); }
        return sleep(0);   // gruplar arasında sayfa nefes alsın
      });
    });
    if (opts.audio !== false && want('ses')) {
      chain = chain.then(function () {
        var T = recorder(rows, 'ses');
        setPanel(`ses ölçülüyor…`);
        return suiteAudio(T).catch(function (e) { T.fail('ses grubu', `beklenmeyen hata: ${errText(e)}`); });
      });
    }
    running = chain.then(function () {
      running = null;
      if (typeof console !== 'undefined' && console.table) console.table(rows);
      var bad = rows.filter(function (r) { return r.sonuc === FAIL; }).length;
      if (bad) console.warn(`[p3] selftest: ${bad} test kaldı`);
      P3.test.last = rows;
      showResults(rows, nowMs() - t0);
      return rows;
    }, function (e) { running = null; throw e; });
    return running;
  }

  // ================================================================ panel ve registry katmanı (yalnız tarayıcı)
  var hasDom = typeof document !== 'undefined' && !!document.createElement;
  var panelEl = null, ovEl = null, ovOff = null;

  function injectStyle() {
    if (!hasDom || document.getElementById('p3StStyle')) return;
    var s = document.createElement('style');
    s.id = 'p3StStyle';
    s.textContent = [
      '.p3-st-panel{position:fixed;right:16px;bottom:16px;z-index:var(--z-toast,1100);width:min(440px,calc(100vw - 32px));max-height:min(60vh,520px);display:flex;flex-direction:column;background:var(--surface,#111);color:var(--fg,#eee);border:1px solid var(--line,#333);font-family:var(--ff-mono,monospace);font-size:var(--fs-label,11px);line-height:1.45}',
      '.p3-st-head{display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--line,#333)}',
      '.p3-st-title{font-weight:700;letter-spacing:.08em;text-transform:uppercase}',
      '.p3-st-sum{flex:1;min-width:0;color:var(--fg-2,#aaa);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.p3-st-list{margin:0;padding:0;list-style:none;overflow:auto}',
      '.p3-st-list li{padding:6px 8px;border-bottom:1px solid var(--line,#333);word-break:break-word}',
      '.p3-st-list b{font-weight:700;margin-right:6px}',
      '.p3-st-k{color:var(--err,#FA325E)}.p3-st-a{color:var(--warn,#E0B040)}.p3-st-g{color:var(--ok,#38D65A)}',
      '.p3-st-ov{position:absolute;inset:0;pointer-events:none;z-index:20}',
      '.p3-st-ov div{position:absolute;box-sizing:border-box}',
      '.p3-st-ov span{position:absolute;transform:translate(-50%,-50%);font:10px/1 var(--ff-mono,monospace);color:#FFFFFF;background:rgba(0,0,0,.66);padding:1px 3px;white-space:nowrap}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function panel(on) {
    if (!hasDom) return null;
    if (on === false) { if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl); panelEl = null; return null; }
    if (panelEl) return panelEl;
    injectStyle();
    var el = document.createElement('div');
    el.className = 'p3-st-panel';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', `P3 test paneli`);
    el.innerHTML = '<div class="p3-st-head"><span class="p3-st-title">P3 test</span><span class="p3-st-sum" aria-live="polite"></span>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-act="run"></button>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-act="ov" aria-pressed="false">Registry</button>' +
      '<button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="close"><svg class="icon" aria-hidden="true"><use href="/assets/img/icons.svg#i-x"/></svg></button></div>' +
      '<ol class="p3-st-list" hidden></ol>';
    el.querySelector('[data-act="run"]').textContent = `Çalıştır`;
    el.querySelector('[data-act="close"]').setAttribute('aria-label', `Test panelini kapat`);
    el.querySelector('.p3-st-sum').textContent = `?p3debug=1 · P3.test.run()`;
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'run') { setPanel(`çalışıyor…`); run(); }
      else if (act === 'ov') { var on2 = !ovEl; overlay(on2); b.setAttribute('aria-pressed', String(!!ovEl)); }
      else if (act === 'close') panel(false);
    });
    document.body.appendChild(el);
    panelEl = el;
    return el;
  }

  function setPanel(text) {
    var el = panel(true);
    if (el) el.querySelector('.p3-st-sum').textContent = text;
  }

  function showResults(rows, ms) {
    if (!hasDom) return;
    var el = panel(true);
    if (!el) return;
    var n = { GECTI: 0, KALDI: 0, ATLANDI: 0 };
    rows.forEach(function (r) { n[r.sonuc] = (n[r.sonuc] || 0) + 1; });
    setPanel(`${n.GECTI} geçti · ${n.KALDI} kaldı · ${n.ATLANDI} atlandı · ${(ms / 1000).toFixed(1)} s`);
    var list = el.querySelector('.p3-st-list');
    list.innerHTML = '';
    var show = rows.filter(function (r) { return r.sonuc !== PASS; });
    if (!show.length) show = [{ grup: '', ad: `Tüm testler geçti`, sonuc: PASS, detay: `ayrıntı: console.table` }];
    show.forEach(function (r) {
      var li = document.createElement('li'), b = document.createElement('b');
      b.className = r.sonuc === FAIL ? 'p3-st-k' : r.sonuc === SKIP ? 'p3-st-a' : 'p3-st-g';
      b.textContent = r.sonuc;
      li.appendChild(b);
      li.appendChild(document.createTextNode((r.grup ? r.grup + ` · ` : '') + r.ad + (r.detay ? ` — ` + r.detay : '')));
      list.appendChild(li);
    });
    list.hidden = false;
  }

  var KIND_COLOR = { btn: '#38D65A', enc: '#2448C8', pad: '#E6E6E6', strip: '#FA325E', dpad: '#D87635', octpage: '#D87635', lcd: '#7A7A80' };
  var TRI = {
    up: ['0 0,100% 0,50% 100%', 0.5, 0.33], down: ['0 100%,100% 100%,50% 0', 0.5, 0.67],
    left: ['0 0,0 100%,100% 50%', 0.33, 0.5], right: ['100% 0,100% 100%,0 50%', 0.67, 0.5]
  };
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function box(parent, r, color, fill) {
    var d = document.createElement('div');
    d.style.left = r.x + 'px'; d.style.top = r.y + 'px'; d.style.width = r.w + 'px'; d.style.height = r.h + 'px';
    d.style.outline = '1px solid ' + color;
    d.style.outlineOffset = '-1px';
    if (fill) d.style.background = rgba(color, 0.18);
    parent.appendChild(d);
    return d;
  }
  function label(parent, x, y, text) {
    var s = document.createElement('span');
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.textContent = text;
    parent.appendChild(s);
  }

  function buildOverlay() {
    var D = P3.dev, layer = hasDom && document.getElementById('p3HotspotLayer');
    if (!layer || !D || !D.CONTROLS) return false;
    if (!ovEl) { injectStyle(); ovEl = document.createElement('div'); ovEl.className = 'p3-st-ov'; ovEl.setAttribute('aria-hidden', 'true'); }
    ovEl.innerHTML = '';
    if (ovEl.parentNode !== layer) layer.appendChild(ovEl);
    var C = D.CONTROLS, drawn = 0;
    Object.keys(C).forEach(function (id) {
      var c = C[id], r = D.controlRect(id);
      if (!r) return;
      var color = KIND_COLOR[c.kind] || '#E6E6E6';
      if (id === 'pads') {
        box(ovEl, r, color, false);
        for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
          var pr = D.controlRect({ pad: [x, y] });
          if (!pr) continue;
          box(ovEl, pr, color, true);
          label(ovEl, pr.x + pr.w / 2, pr.y + pr.h / 2, x + ',' + y);
        }
        drawn++;
        return;
      }
      var tri = c.group && c.dir && TRI[c.dir];
      var d = box(ovEl, r, color, true);
      if (c.hit && c.hit.r) d.style.borderRadius = '50%';
      if (tri) { d.style.outline = 'none'; d.style.clipPath = 'polygon(' + tri[0] + ')'; d.style.background = rgba(color, 0.32); }
      label(ovEl, r.x + r.w * (tri ? tri[1] : 0.5), r.y + r.h * (tri ? tri[2] : 0.5), id);
      drawn++;
    });
    return drawn > 0;
  }

  function overlay(on) {
    if (!hasDom) return false;
    if (!on) {
      if (ovOff) { ovOff(); ovOff = null; }
      if (ovEl && ovEl.parentNode) ovEl.parentNode.removeChild(ovEl);
      ovEl = null;
      return false;
    }
    var ok = buildOverlay();
    if (!ok) { console.warn(`[p3] registry katmanı: cihaz henüz yüklenmedi`); overlay(false); return false; }
    if (!ovOff && P3.bus && P3.bus.on) ovOff = P3.bus.on('layout', function () { if (ovEl) buildOverlay(); });
    return true;
  }

  // ================================================================ dışa açılan API
  P3.test = {
    run: run,
    audio: {
      render: render,
      impl: null,          // test ortamı render'ı değiştirebilir: spec → Promise<{L, R, fs}>
      util: { fft: fft, spectrum: spectrum, fftDb: fftDb, peakNear: peakNear, maxStepDiff: maxStepDiff, onset: onset,
        peak: peak, db: db, mtof: mtof, aliasDb: aliasDb }
    },
    overlay: overlay,
    panel: panel,
    suites: { scale: suiteScale, drum: suiteDrum, registry: suiteRegistry, params: suiteParams, led: suiteLeds, ogretici: suiteTutorial },
    makeEmu: makeEmu,
    last: null
  };

  // Debug modunda (bu dosya yalnız ?p3debug=1 ile yüklenir) sağ altta başlatıcı panel.
  if (hasDom && document.body) panel(true);
  else if (hasDom && document.addEventListener) document.addEventListener('DOMContentLoaded', function () { panel(true); });
})();
