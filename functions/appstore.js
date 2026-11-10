// Apple aboneliği (yalnız iPhone/Mac uygulamasında satılır) — sunucu tarafı.
//
//   verifyAppStorePurchase (callable): uygulama satın almadan sonra StoreKit 2 işleminin
//     JWS'ini ve öğrencinin seçtiği haftalık saatleri gönderir; imza Apple kök sertifikasıyla
//     doğrulanır, işlem çağıranın uid'ine (appAccountToken) bağlıysa abonelik ve dönemin
//     dersleri reservations/{uid}'e yazılır.
//   appStoreNotifications (HTTP): App Store Server Notifications V2. Yenileme yeni dönemin
//     derslerini ekler; iptal/iade/süre bitimi durumu günceller. Aynı bildirim iki kez işlenmez.
//
// İstemci abonelik alanı yazamaz (firestore.rules: öğrencinin reservations güncellemesi dar
// bir alan kümesiyle sınırlı). Fiyat Firestore'da tutulmaz; App Store Connect'te belirlenir.
// Doğrulama için App Store Connect API anahtarı gerekmez (imzalı veriden doğrulanır).

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {onCall, HttpsError, onRequest} = require("firebase-functions/v2/https");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {SignedDataVerifier, Environment} = require("@apple/app-store-server-library");

const BUNDLE_ID = "com.berkayeracademy.app";
const APP_APPLE_ID = 6832734719; // App Store Connect › Berkay Er Academy
const IST_OFFSET_MS = 3 * 60 * 60 * 1000; // İstanbul, yaz saati yok
const MIN_LEAD_MS = 24 * 60 * 60 * 1000; // 24 saat kuralı (booking.html ile aynı)

// settings/subscriptions yoksa varsayılan planlar (ürün kimliği → ayda saat, haftada ders)
const DEFAULT_PLANS = {
  "com.berkayeracademy.app.temel4": {name: "Temel 4", hours_per_month: 4, weekly: 1},
  "com.berkayeracademy.app.temel8": {name: "Temel 8", hours_per_month: 8, weekly: 2},
};

const ROOT_CERTS = ["AppleRootCA-G3.cer", "AppleRootCA-G2.cer"]
    .map((f) => fs.readFileSync(path.join(__dirname, "certs", f)));

const verifiers = {};
function verifierFor(env) {
  if (!verifiers[env]) {
    // Online iptal kontrolü (OCSP) açık; Sandbox'ta appAppleId gerekmez
    verifiers[env] = new SignedDataVerifier(ROOT_CERTS, true, env, BUNDLE_ID,
        env === Environment.PRODUCTION ? APP_APPLE_ID : undefined);
  }
  return verifiers[env];
}

// Önce Production, olmazsa Sandbox (TestFlight ve Xcode testleri Sandbox'tır)
async function verifyEither(fn) {
  try {
    return {env: Environment.PRODUCTION, data: await fn(verifierFor(Environment.PRODUCTION))};
  } catch (e) {
    return {env: Environment.SANDBOX, data: await fn(verifierFor(Environment.SANDBOX))};
  }
}

// uid → appAccountToken (UUID). Swift tarafı aynı hesabı yapar:
// SHA-256(uid) ilk 16 bayt, sürüm 5 ve RFC 4122 varyant bitleri.
function accountTokenFor(uid) {
  const b = crypto.createHash("sha256").update(String(uid)).digest().subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function loadPlans(db) {
  const snap = await db.collection("settings").doc("subscriptions").get().catch(() => null);
  const plans = {...DEFAULT_PLANS};
  const items = snap && snap.exists && Array.isArray(snap.data().plans) ? snap.data().plans : [];
  items.forEach((p) => {
    if (!p || !p.product_id) return;
    const h = Number(p.hours_per_month);
    const w = Number(p.weekly);
    if (Number.isInteger(h) && h > 0 && h <= 40 && Number.isInteger(w) && w > 0 && w <= 7) {
      plans[p.product_id] = {name: String(p.name || ""), hours_per_month: h, weekly: w};
    }
  });
  return plans;
}

function validSchedule(schedule, weekly) {
  if (!Array.isArray(schedule) || schedule.length !== weekly) return false;
  const seen = new Set();
  return schedule.every((s) => {
    if (!s || !Number.isInteger(s.dayIndex) || s.dayIndex < 0 || s.dayIndex > 6) return false;
    if (typeof s.time !== "string" || !/^([01]\d|2[0-3]):00$/.test(s.time)) return false;
    const k = `${s.dayIndex}_${s.time}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// İstanbul takvim günü (YYYY-MM-DD) ve haftanın günü
function istDateStr(ms) {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}
function istStartMs(dateStr, time) {
  return Date.parse(`${dateStr}T${time}:00+03:00`);
}
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekday(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

// Dönemin dersleri: her seçili saat için [start, end) aralığında haftalık; 24 saat kuralı;
// en fazla hours_per_month ders (en erkenler).
function periodLessons(schedule, startMs, endMs, hours, nowMs) {
  const out = [];
  const startDay = istDateStr(startMs);
  schedule.forEach((s) => {
    let d = startDay;
    while (weekday(d) !== s.dayIndex) d = addDays(d, 1);
    for (; istStartMs(d, s.time) < endMs; d = addDays(d, 7)) {
      const t = istStartMs(d, s.time);
      if (t < startMs || t < nowMs + MIN_LEAD_MS) continue;
      out.push({date: d, time: s.time});
    }
  });
  out.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return out.slice(0, hours);
}

// Bir abonelik dönemini (işlemi) rezervasyona işler. Aynı işlem ikinci kez gelirse
// (callable + SUBSCRIBED bildirimi gibi) ders eklenmez. Transaction içinde.
async function applyTransaction(db, uid, tx, opts) {
  const plans = await loadPlans(db);
  const plan = plans[tx.productId];
  if (!plan) throw new HttpsError("failed-precondition", "Bilinmeyen abonelik ürünü.");
  const resRef = db.collection("reservations").doc(uid);
  const userSnap = await db.collection("users").doc(uid).get().catch(() => null);
  const user = userSnap && userSnap.exists ? userSnap.data() : {};
  const nowMs = Date.now();

  return db.runTransaction(async (t) => {
    const snap = await t.get(resRef);
    const res = snap.exists ? snap.data() : {};
    const prev = res.subscription || {};
    const schedule = opts.schedule || prev.schedule;
    if (!validSchedule(schedule, plan.weekly)) {
      throw new HttpsError("invalid-argument", "Haftalık ders saatleri planla uyuşmuyor.");
    }
    const done = Array.isArray(prev.transactions) ? prev.transactions : [];
    const txId = String(tx.transactionId);
    const expiresMs = Number(tx.expiresDate) || 0;
    const sub = {
      source: "apple",
      product_id: tx.productId,
      plan_name: plan.name,
      hours_per_month: plan.hours_per_month,
      weekly: plan.weekly,
      schedule,
      status: expiresMs > nowMs ? "active" : "ended",
      original_transaction_id: String(tx.originalTransactionId),
      transaction_id: txId,
      period_start: new Date(Number(tx.purchaseDate)).toISOString(),
      period_end: expiresMs ? new Date(expiresMs).toISOString() : "",
      auto_renew: prev.auto_renew !== false,
      environment: opts.environment,
      transactions: done.includes(txId) ? done : done.concat(txId).slice(-36),
      updated_at: new Date(nowMs).toISOString(),
    };

    const patch = {subscription: sub};
    if (!done.includes(txId) && expiresMs > nowMs && !tx.revocationDate) {
      const lessons = Array.isArray(res.lessons) ? res.lessons.slice() : [];
      const have = new Set(lessons.map((l) => `${l.date}_${l.time}`));
      const fresh = periodLessons(schedule, Number(tx.purchaseDate), expiresMs, plan.hours_per_month, nowMs)
          .filter((l) => !have.has(`${l.date}_${l.time}`));
      for (const l of fresh) {
        const slotRef = db.collection("booked_slots").doc(`${l.date}_${l.time}`);
        const slot = await t.get(slotRef);
        const taken = slot.exists && slot.data().student_uid && slot.data().student_uid !== uid;
        lessons.push(Object.assign({date: l.date, time: l.time, status: "scheduled", sub_tx: txId},
            taken ? {conflict: true} : {}));
        if (!taken) t.set(slotRef, {date: l.date, time: l.time, student_uid: uid});
      }
      lessons.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time).localeCompare(String(b.time)));
      patch.lessons = lessons;
      const mk = istDateStr(Number(tx.purchaseDate)).slice(0, 7);
      patch.reschedule_credits = Object.assign({}, res.reschedule_credits || {}, {[mk]: 1});
      const lastDate = lessons.length ? lessons[lessons.length - 1].date : "";
      if (!res.end_date || lastDate > res.end_date) patch.end_date = lastDate;
    }

    if (!snap.exists) {
      Object.assign(patch, {
        student_uid: uid,
        student_name: opts.name || user.displayName || "",
        student_email: opts.email || user.email || "",
        student_phone: "",
        student_photo: user.photoURL || "",
        lesson_type: "subscription",
        start_date: istDateStr(Number(tx.purchaseDate)),
        payment_confirmed: true, // Apple tahsil etti; Zoom linki okunabilir
        payment_pending: false,
        created_at: FieldValue.serverTimestamp(),
      });
      if (!patch.lessons) patch.lessons = [];
    } else if (!res.lesson_type || res.lesson_type === "subscription" || res.lesson_type === "trial") {
      patch.lesson_type = "subscription";
      patch.payment_confirmed = true;
    }
    t.set(resRef, patch, {merge: true});
    t.set(db.collection("subscriptions_index").doc(sub.original_transaction_id),
        {uid, product_id: tx.productId, updated_at: sub.updated_at}, {merge: true});
    return sub;
  });
}

exports.verifyAppStorePurchase = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısın.");
  const uid = request.auth.uid;
  const data = request.data || {};
  const jws = String(data.signedTransaction || "");
  if (!jws || jws.length > 20000) throw new HttpsError("invalid-argument", "İşlem bilgisi eksik.");

  let verified;
  try {
    verified = await verifyEither((v) => v.verifyAndDecodeTransaction(jws));
  } catch (e) {
    console.warn("appstore verify failed", e && e.message);
    throw new HttpsError("permission-denied", "Satın alma doğrulanamadı.");
  }
  const tx = verified.data;
  if (String(tx.appAccountToken || "").toLowerCase() !== accountTokenFor(uid)) {
    throw new HttpsError("permission-denied", "Bu satın alma başka bir hesaba ait.");
  }
  const db = getFirestore();
  const sub = await applyTransaction(db, uid, tx, {
    schedule: data.schedule,
    environment: verified.env,
    name: request.auth.token.name || "",
    email: request.auth.token.email || "",
  });
  return {ok: true, status: sub.status, period_end: sub.period_end, product_id: sub.product_id};
});

exports.appStoreNotifications = onRequest({region: "europe-west1"}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("POST");
    return;
  }
  const signedPayload = req.body && req.body.signedPayload;
  if (!signedPayload) {
    res.status(400).send("signedPayload");
    return;
  }
  let verified;
  try {
    verified = await verifyEither((v) => v.verifyAndDecodeNotification(signedPayload));
  } catch (e) {
    console.warn("appstore notification verify failed", e && e.message);
    res.status(400).send("invalid");
    return;
  }
  const n = verified.data;
  const db = getFirestore();
  const seenRef = db.collection("appstore_notifications").doc(String(n.notificationUUID));
  try {
    await seenRef.create({type: n.notificationType, subtype: n.subtype || "", at: FieldValue.serverTimestamp()});
  } catch (e) {
    res.status(200).send("dup"); // aynı bildirim daha önce işlendi
    return;
  }

  try {
    const d = n.data || {};
    const verifier = verifierFor(verified.env);
    const tx = d.signedTransactionInfo ? await verifier.verifyAndDecodeTransaction(d.signedTransactionInfo) : null;
    const renewal = d.signedRenewalInfo ? await verifier.verifyAndDecodeRenewalInfo(d.signedRenewalInfo) : null;
    const otid = String((tx && tx.originalTransactionId) || (renewal && renewal.originalTransactionId) || "");
    const idx = otid ? await db.collection("subscriptions_index").doc(otid).get() : null;
    // İlk SUBSCRIBED bildirimi callable'dan önce gelebilir: uid appAccountToken'dan bulunamaz
    // (tek yönlü özet), callable gelince aynı işlem işlenir. Bilinmeyen abonelik atlanır.
    const uid = idx && idx.exists ? idx.data().uid : null;
    if (!uid) {
      await seenRef.set({skipped: "unknown_subscription"}, {merge: true});
      res.status(200).send("ok");
      return;
    }
    const resRef = db.collection("reservations").doc(uid);
    const type = n.notificationType;
    const nowIso = new Date().toISOString();

    if ((type === "SUBSCRIBED" || type === "DID_RENEW") && tx) {
      await applyTransaction(db, uid, tx, {environment: verified.env});
    } else if (type === "DID_CHANGE_RENEWAL_STATUS" && renewal) {
      await resRef.set({subscription: {auto_renew: renewal.autoRenewStatus === 1, updated_at: nowIso}}, {merge: true});
    } else if (type === "DID_CHANGE_RENEWAL_PREF" && renewal) {
      await resRef.set({subscription: {pending_product_id: renewal.autoRenewProductId || "", updated_at: nowIso}}, {merge: true});
    } else if (type === "DID_FAIL_TO_RENEW") {
      await resRef.set({subscription: {status: n.subtype === "GRACE_PERIOD" ? "grace" : "billing_retry", updated_at: nowIso}}, {merge: true});
    } else if (type === "EXPIRED" || type === "GRACE_PERIOD_EXPIRED") {
      await resRef.set({subscription: {status: "ended", auto_renew: false, updated_at: nowIso}}, {merge: true});
    } else if ((type === "REFUND" || type === "REVOKE") && tx) {
      // İade edilen dönemin gelecek dersleri iptal; booked_slots boşaltılır
      const txId = String(tx.transactionId);
      const today = istDateStr(Date.now());
      await db.runTransaction(async (t) => {
        const snap = await t.get(resRef);
        if (!snap.exists) return;
        const lessons = (snap.data().lessons || []).map((l) => {
          if (l.sub_tx === txId && l.date >= today && l.status === "scheduled") {
            t.delete(db.collection("booked_slots").doc(`${l.date}_${l.time}`));
            return Object.assign({}, l, {status: "cancelled"});
          }
          return l;
        });
        t.set(resRef, {lessons, subscription: {status: "refunded", updated_at: nowIso}}, {merge: true});
      });
    }
    res.status(200).send("ok");
  } catch (e) {
    console.error("appstore notification handling error", e);
    await seenRef.delete().catch(() => {}); // Apple yeniden denesin
    res.status(500).send("error");
  }
});

exports._test = {accountTokenFor, periodLessons, validSchedule, istDateStr};
