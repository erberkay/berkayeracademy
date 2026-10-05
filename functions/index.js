const {setGlobalOptions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, HttpsError, onRequest} = require("firebase-functions/v2/https");
const crypto = require("crypto");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const {sendWhatsApp, sendWhatsAppTemplate, TEMPLATES} = require("./whatsapp");
const att = require("./attendance");


setGlobalOptions({maxInstances: 10, region: "europe-west1"});

initializeApp();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "berkayer032@gmail.com",
    pass: process.env.GMAIL_PASS,
  },
});

// Admin: tek hesap, e-postası doğrulanmış olmalı (firestore.rules isAdmin() ile aynı).
// Bu e-postayla doğrulamadan açılmış bir e-posta/şifre hesabı admin sayılmaz.
const ADMIN_EMAIL = "berkayer032@gmail.com";
function isAdminAuth(auth) {
  return !!(auth && auth.token &&
    auth.token.email === ADMIN_EMAIL &&
    auth.token.email_verified === true);
}

// HTML e-posta şablonlarına giren kullanıcı verisi (ad, saat, mesaj) kaçışlanır
function escHtml(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[c]);
}

// Zoom linki settings/zoom'da (yalnız admin + ödemesi onaylı / deneme öğrencisi okur).
// Geçiş (bir sürüm): orada yoksa eski settings/global.zoom_link okunur.
async function getZoomLink(db) {
  const z = await db.collection("settings").doc("zoom").get();
  if (z.exists && z.data().zoom_link) return z.data().zoom_link;
  const g = await db.collection("settings").doc("global").get();
  return g.exists ? (g.data().zoom_link || "") : "";
}

/**
 * Builds anti-spam mail options for payment reminder.
 * - Neutral subject (no warning symbols)
 * - Plain-text alternative
 * - Reply-To + List-Unsubscribe headers
 */
function buildReminderMailOptions(name, toEmail, nextLesson, nextDateFormatted) {
  const lessonLine = nextLesson ?
    `Yaklaşan dersiniz: ${nextDateFormatted} – ${nextLesson.time}` : "";

  return {
    from: `"Berkay Er Academy" <berkayer032@gmail.com>`,
    replyTo: "berkayer032@gmail.com",
    to: toEmail,
    subject: `Dersiniz için ödeme hatırlatması — Berkay Er Academy`,
    headers: {
      "List-Unsubscribe": "<mailto:berkayer032@gmail.com?subject=unsubscribe>",
    },
    text: `Merhaba ${name},

Ders ödemenizin henüz gerçekleşmediğini fark ettik.
${lessonLine}

Lütfen ödemenizi aşağıdaki hesaba yapınız:

Banka : Garanti Bankası
İsim  : Muhammet Berkay Er
IBAN  : TR35 0006 2000 6870 0006 8982 06

Ödeme ders saatine kadar gerçekleşmelidir. Gerçekleşmediği takdirde derse giriş butonu aktifleşmeyecektir.

Ödeme yaptıktan sonra ders panelinizden bildirim göndermeyi unutmayın.
Ders Paneliniz: https://berkayeracademy.com/booking

Herhangi bir sorunuz için bu emaile yanıt verebilirsiniz.

Berkay Er Academy
berkayeracademy.com`,
    html: `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:560px;">
        <tr><td style="background:#060609;padding:24px 32px;text-align:center;">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:bold;color:#e8b84b;letter-spacing:2px;">BERKAY ER ACADEMY</div>
          <div style="font-size:11px;color:rgba(238,235,230,.5);letter-spacing:3px;margin-top:4px;">ABLETON ÖZEL DERS</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#222;">Merhaba <strong>${escHtml(name)}</strong>,</p>
          <div style="background:#f9f6f0;border:1px solid #ddd;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#555;">Ders ödemenizin henüz gerçekleşmediğini fark ettik.</p>
            ${nextLesson ? `<p style="margin:8px 0 0;font-size:13px;color:#666;">Yaklaşan dersiniz: <strong style="color:#333;">${escHtml(nextDateFormatted)} – ${escHtml(nextLesson.time)}</strong></p>` : ""}
          </div>
          <p style="margin:0 0 12px;font-size:14px;color:#444;line-height:1.6;">Lütfen ödemenizi aşağıdaki hesaba yapınız:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;border-radius:6px;padding:16px;margin-bottom:24px;">
            <tr><td style="font-size:12px;color:#888;padding:3px 0;">Banka</td><td style="font-size:13px;color:#333;font-weight:bold;text-align:right;">Garanti Bankası</td></tr>
            <tr><td style="font-size:12px;color:#888;padding:3px 0;">İsim</td><td style="font-size:13px;color:#333;font-weight:bold;text-align:right;">Muhammet Berkay Er</td></tr>
            <tr><td style="font-size:12px;color:#888;padding:3px 0;">IBAN</td><td style="font-size:13px;color:#222;font-weight:bold;text-align:right;font-family:monospace;letter-spacing:1px;">TR35 0006 2000 6870 0006 8982 06</td></tr>
          </table>
          <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
            <p style="margin:0;font-size:13px;color:#856404;font-weight:bold;">⚠️ Ödeme ders saatine kadar gerçekleşmelidir.</p>
            <p style="margin:6px 0 0;font-size:12px;color:#856404;">Gerçekleşmediği takdirde derse giriş butonu aktifleşmeyecektir.</p>
          </div>
          <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.6;">Ödeme yaptıktan sonra ders panelinizden bildirim göndermeyi unutmayın. Herhangi bir sorunuz için bu emaile yanıt verebilirsiniz.</p>
          <a href="https://berkayeracademy.com/booking.html" style="display:inline-block;background:#e8b84b;color:#060609;font-size:13px;font-weight:bold;padding:12px 28px;border-radius:4px;text-decoration:none;letter-spacing:1px;">Ders Panelinize Git →</a>
        </td></tr>
        <tr><td style="background:#f8f8f8;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;">Berkay Er Academy · berkayeracademy.com</p>
          <p style="margin:4px 0 0;font-size:11px;color:#ccc;">Bu emaili almak istemiyorsanız <a href="mailto:berkayer032@gmail.com?subject=unsubscribe" style="color:#aaa;">buraya tıklayın</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ── Helper: collect unpaid non-trial students with upcoming lessons ──
function collectUnpaidStudents(snapshot) {
  const today = new Date().toISOString().split("T")[0];
  const result = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.lesson_type === "trial" || data.payment_confirmed) return;
    // Dedupe before picking the earliest upcoming so leftover duplicate rows
    // from older buggy reschedule paths can't masquerade as the "next" lesson.
    const upcoming = dedupLessons(data.lessons || [])
        .filter((l) => l.date >= today && (l.status === "scheduled" || l.status === "rescheduled"))
        .sort((a, b) => (a.date > b.date ? 1 : -1));
    if (!upcoming.length) return;
    const email = data.student_email || data.from_email;
    const name = data.student_name || data.from_name || "Öğrenci";
    if (!email) return;
    result.push({doc, data, email, name, nextLesson: upcoming[0]});
  });
  return result;
}

// Compute total package price for a reservation
function reservationPrice(data) {
  if (typeof data.custom_total_price === "number") return data.custom_total_price;
  const totalLessons = (data.lessons || []).length;
  const unit = data.custom_lesson_price || (data.lesson_type === "single" ? 3000 : 2500);
  return totalLessons * unit;
}

const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// Runs every day at 09:00 Istanbul time
exports.paymentReminder = onSchedule(
    {schedule: "0 6 * * *", timeZone: "Europe/Istanbul"},
    async () => {
      const db = getFirestore();
      const snapshot = await db.collection("reservations").get();
      const students = collectUnpaidStudents(snapshot);
      const promises = students.map(({doc, data, email, name, nextLesson}) => {
        const nextDateFormatted = new Date(nextLesson.date + "T12:00:00")
            .toLocaleDateString("tr-TR", {day: "numeric", month: "long", year: "numeric"});
        const mail = buildReminderMailOptions(name, email, nextLesson, nextDateFormatted);
        const tasks = [];
        // Email branch (existing)
        tasks.push(transporter.sendMail(mail).then(() => {
          console.log(`Email reminder sent to ${email} (${name})`);
        }).catch((e) => console.error("email failed", e.message)));
        // WhatsApp branch (new) — sendAndPersistWA also writes to
        // whatsapp_conversations so this shows up in the admin chat panel.
        if (data.student_phone) {
          const monthIdx = new Date().getMonth();
          const monthName = MONTHS_TR[monthIdx];
          const total = reservationPrice(data).toLocaleString("tr-TR");
          tasks.push(sendAndPersistWA({
            toPhone: data.student_phone,
            contentSid: TEMPLATES.payment_reminder,
            variables: {"1": name, "2": monthName, "3": total},
            displayBody: `💳 Ödeme hatırlatma — ${name}, ${monthName} ayı için ${total} TL ödemeni unutma.`,
            source: "cron:payment_reminder",
          }).then((r) => {
            if (!r.ok) console.error("wa payment_reminder failed", r.error);
            else console.log(`WA payment_reminder → ${data.student_phone}`);
          }));
        }
        return Promise.all(tasks).then(() => {
          return db.collection("reservations").doc(doc.id).update({
            last_reminder_sent: FieldValue.serverTimestamp(),
          });
        });
      });
      await Promise.all(promises);
      console.log(`Payment reminders done. Processed ${promises.length} students.`);
    },
);

// ─── Shared WhatsApp send helpers ───────────────────────────
// Normalizes a stored phone (digits-only or already E.164) into the
// "+90XXXXXXXXXX" key we use in whatsapp_conversations/{phone}. Same
// branches as sendWhatsAppAdmin so the conversation key is identical
// no matter who's sending — cron, admin panel, etc.
function normalizeConvoPhone(toPhone) {
  let phone = String(toPhone || "").replace(/[^\d+]/g, "");
  if (phone.startsWith("00")) phone = "+" + phone.slice(2);
  if (!phone.startsWith("+")) {
    if (phone.startsWith("0")) phone = "+90" + phone.slice(1);
    else if (phone.startsWith("90")) phone = "+" + phone;
    else if (phone.startsWith("5")) phone = "+90" + phone;
    else phone = "+" + phone;
  }
  return phone;
}

// reservations.student_phone is stored two ways depending on when/how it was written:
// bare digits for Turkish numbers (legacy convention, e.g. "905551234567") or with an
// explicit leading "+" for international ones (e.g. "+16173884403"). A lookup keyed off
// a single shape misses the other, so callers should query both candidate shapes.
function phoneLookupCandidates(phone) {
  const bare = String(phone || "").replace(/^\+/, "");
  const withPlus = "+" + bare;
  return bare === withPlus ? [bare] : [bare, withPlus];
}

// Wraps sendWhatsApp / sendWhatsAppTemplate and (on Twilio acceptance)
// persists the outbound message to whatsapp_conversations so the admin
// WhatsApp panel renders it alongside human-sent messages. Pass a
// displayBody for templates so the panel shows readable text instead of
// "[Template HX…]".
async function sendAndPersistWA({toPhone, body, contentSid, variables, displayBody, source}) {
  let result;
  if (contentSid) {
    result = await sendWhatsAppTemplate(toPhone, contentSid, variables);
  } else {
    result = await sendWhatsApp(toPhone, body);
  }
  if (!result.ok) return result;
  const phone = normalizeConvoPhone(toPhone);
  if (!phone || phone === "+") return result; // unrecoverable phone — bail on persistence

  const db = getFirestore();
  const convoRef = db.collection("whatsapp_conversations").doc(phone);
  const renderedBody = contentSid ?
    (displayBody || `[Template ${contentSid}]`) :
    (body || "");

  try {
    await convoRef.collection("messages").doc(result.sid || `outbound_${Date.now()}`).set({
      direction: "out",
      from: process.env.TWILIO_WA_FROM,
      to: "whatsapp:" + phone,
      body: renderedBody,
      template_sid: contentSid || null,
      template_variables: variables || null,
      sid: result.sid,
      status: result.status,
      source: source || "cron",
      created_at: FieldValue.serverTimestamp(),
    });

    let studentUid = null;
    let studentName = null;
    try {
      const q = await db.collection("reservations").where("student_phone", "in", phoneLookupCandidates(phone)).limit(1).get();
      if (!q.empty) {
        studentUid = q.docs[0].id;
        studentName = q.docs[0].data().student_name || null;
      }
    } catch (_) {/* lookup failure ok */}

    await convoRef.set({
      phone,
      ...(studentUid ? {student_uid: studentUid} : {}),
      ...(studentName ? {student_name: studentName} : {}),
      last_message: renderedBody.slice(0, 200),
      last_message_at: FieldValue.serverTimestamp(),
      last_direction: "out",
    }, {merge: true});
  } catch (e) {
    console.error("sendAndPersistWA: persist failed for " + phone + ":", e.message || e);
  }
  return result;
}

// ─── Lesson reminders ───────────────────────────────────────
// Build student lookup helpers shared by 24h + 1h crons.
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Mirrors client-side dedupLessons (booking.html). Older reschedule paths
// could leave duplicate {date,time} rows in reservations.lessons; the client
// hides them at render time but cron jobs see the raw array and would pick
// the older copy as "earliest upcoming", sending reminders for the original
// (pre-reschedule) date. We dedupe by (date,time) and keep the higher-status
// entry (priority: scheduled/rescheduled > frozen/cancel_requested >
// completed > cancelled), then sort by (date,time).
function dedupLessons(arr) {
  if (!Array.isArray(arr)) return [];
  const priority = {scheduled: 4, rescheduled: 4, frozen: 3, cancel_requested: 3, completed: 2, cancelled: 1};
  const map = new Map();
  for (const l of arr) {
    if (!l || !l.date || !l.time) continue;
    const key = `${l.date}_${l.time}`;
    const prev = map.get(key);
    if (!prev || (priority[l.status] || 0) > (priority[prev.status] || 0)) {
      map.set(key, l);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

// Daily at 09:00 TR → notify students whose lesson is the next day
exports.lessonReminder24h = onSchedule(
    {schedule: "0 6 * * *", timeZone: "Europe/Istanbul"},
    async () => {
      const db = getFirestore();
      const zoomLink = await getZoomLink(db);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = toDateStr(tomorrow);

      const snap = await db.collection("reservations").get();
      let sent = 0;
      const tasks = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (!d.student_phone) return;
        const lessons = dedupLessons(d.lessons || []);
        const match = lessons.find((l) => l.date === tomorrowStr &&
          (l.status === "scheduled" || l.status === "rescheduled"));
        if (!match) return;
        const name = d.student_name || (d.student_email || "").split("@")[0] || "Öğrenci";
        tasks.push(sendAndPersistWA({
          toPhone: d.student_phone,
          contentSid: TEMPLATES.lesson_reminder_24h,
          variables: {"1": name, "2": match.time, "3": zoomLink || "https://berkayeracademy.com/booking"},
          displayBody: `⏰ 24 saat hatırlatma — ${name}, yarın ${match.time} dersin var.`,
          source: "cron:lesson_reminder_24h",
        }).then((r) => {
          if (r.ok) {
            sent++;
            console.log(`WA 24h reminder → ${d.student_phone} (${name})`);
          } else {
            console.error("wa lesson_reminder_24h failed", d.student_phone, r.error);
          }
        }));
      });
      await Promise.all(tasks);
      console.log(`lessonReminder24h done. Sent ${sent} of ${tasks.length} attempts.`);
    },
);

// Hourly check → notify students whose lesson starts in ~1 hour
exports.lessonReminder1h = onSchedule(
    {schedule: "0 * * * *", timeZone: "Europe/Istanbul"},
    async () => {
      const db = getFirestore();
      const zoomLink = await getZoomLink(db);

      // 1 hour from now in Istanbul TZ — schedule runs at minute 0 so target is HH+1:00
      const now = new Date();
      const target = new Date(now.getTime() + 60 * 60 * 1000);
      // Use Istanbul offset by formatting via toLocaleString — safer than UTC math
      const istanbulDate = new Date(target.toLocaleString("en-US", {timeZone: "Europe/Istanbul"}));
      const targetDateStr = toDateStr(istanbulDate);
      const targetTime = `${pad2(istanbulDate.getHours())}:00`;

      const snap = await db.collection("reservations").get();
      let sent = 0;
      const tasks = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (!d.student_phone) return;
        const lessons = dedupLessons(d.lessons || []);
        const match = lessons.find((l) => l.date === targetDateStr && l.time === targetTime &&
          (l.status === "scheduled" || l.status === "rescheduled"));
        if (!match) return;
        const name = d.student_name || (d.student_email || "").split("@")[0] || "Öğrenci";
        tasks.push(sendAndPersistWA({
          toPhone: d.student_phone,
          contentSid: TEMPLATES.lesson_reminder_1h,
          variables: {"1": name, "2": targetTime, "3": zoomLink || "https://berkayeracademy.com/booking"},
          displayBody: `⏰ 1 saat hatırlatma — ${name}, 1 saat sonra ${targetTime} dersin var.`,
          source: "cron:lesson_reminder_1h",
        }).then((r) => {
          if (r.ok) {
            sent++;
            console.log(`WA 1h reminder → ${d.student_phone} (${name})`);
          } else {
            console.error("wa lesson_reminder_1h failed", d.student_phone, r.error);
          }
        }));
      });
      await Promise.all(tasks);
      console.log(`lessonReminder1h done at target ${targetDateStr} ${targetTime}. Sent ${sent} of ${tasks.length}.`);
    },
);

// Her saat :05'te → bu saat başında biten ders ÖĞRENCİNİN PAKETİNDEKİ SON ders
// ise (yani bundan sonra scheduled/rescheduled hiçbir ders kalmadıysa) öğrenciye
// "paketin tamamlandı" WhatsApp mesajı gönder. Ara derslerde mesaj gitmez.
//
// Onaylı "package_completed" şablonu varsa onu kullanır (24 saat penceresi
// dışında da ulaşır); yoksa serbest metin dener (öğrenci son 24 saatte yazdıysa
// ulaşır, aksi halde Twilio reddeder ve log'a düşer).
//
// Aynı dersten dolayı tekrar tetiklenmemek için biten ders objesine
// package_complete_sent: true bayrağı yazılır. Öğrenci yeni paket alırsa son
// ders değişir, yeni son derste tekrar gönderilir.
exports.lessonEndFollowUp = onSchedule(
    {schedule: "5 * * * *", timeZone: "Europe/Istanbul"},
    async () => {
      const db = getFirestore();
      const nowIst = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Istanbul"}));
      // Şimdi biten ders: 1 saat önce, saat başında başladı.
      const startIst = new Date(nowIst.getTime() - 60 * 60 * 1000);
      const dateStr = toDateStr(startIst);
      const timeStr = `${pad2(startIst.getHours())}:00`;

      const snap = await db.collection("reservations").get();
      let sent = 0;
      const tasks = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (!d.student_phone) return;
        const lessons = dedupLessons(d.lessons || []);

        // 1) Bu saat başında biten dersi bul.
        const matchIdx = lessons.findIndex((l) => l.date === dateStr && l.time === timeStr &&
          (l.status === "scheduled" || l.status === "rescheduled" || l.status === "completed"));
        if (matchIdx < 0) return;
        const match = lessons[matchIdx];
        if (match.package_complete_sent) return; // zaten gönderildi

        // 2) Bu dersten sonra paket içinde scheduled/rescheduled ders var mı?
        const hasMore = lessons.some((l, i) => {
          if (i === matchIdx) return false;
          if (l.status !== "scheduled" && l.status !== "rescheduled") return false;
          return l.date > dateStr || (l.date === dateStr && l.time > timeStr);
        });
        if (hasMore) return; // ara ders — bu cron'dan mesaj yok

        // 3) Son ders. Paket-bitti mesajı gönder.
        const name = d.student_name || (d.student_email || "").split("@")[0] || "Öğrenci";
        tasks.push((async () => {
          const displayBody = `🎉 Paket tamamlandı — ${name}, paketindeki son dersi de bitirdik. Eline sağlık!`;
          let r;
          if (TEMPLATES.package_completed) {
            r = await sendAndPersistWA({
              toPhone: d.student_phone,
              contentSid: TEMPLATES.package_completed,
              variables: {"1": name},
              displayBody,
              source: "cron:package_completed",
            });
          } else {
            const body = `Merhaba ${name}! 🎉\n\nPaketindeki son dersi de bitirdik — ` +
              `eline sağlık, çok güzel bir yolculuktu.\n\n` +
              `Devam etmek istersen yeni paket için bana buradan yazabilirsin 🎵`;
            r = await sendAndPersistWA({
              toPhone: d.student_phone,
              body,
              source: "cron:package_completed_freeform",
            });
          }
          if (r.ok) {
            sent++;
            const updated = lessons.slice();
            updated[matchIdx] = Object.assign({}, match, {package_complete_sent: true});
            await doc.ref.set({lessons: updated}, {merge: true});
            console.log(`WA package-end → ${d.student_phone} (${name})`);
          } else {
            console.error("wa package_end failed", d.student_phone, r.error);
          }
        })());
      });
      await Promise.all(tasks);
      console.log(`lessonEndFollowUp (package-end) done for ${dateStr} ${timeStr}. Sent ${sent} of ${tasks.length}.`);
    },
);

// ─── Firestore triggers for status notifications ────────────
const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");

// New lesson request → notify admin via WhatsApp
exports.notifyAdminOnNewRequest = onDocumentCreated(
    {region: "europe-west1", document: "lesson_requests/{reqId}"},
    async (event) => {
      const d = event.data && event.data.data();
      if (!d || d.status !== "pending") return;
      // Talep her durumda kaydedilir; yalnız admine giden WhatsApp öğrenci başına sınırlıdır
      // (kötü niyetli bir hesap talep yağdırıp bildirim spam'i yapamasın).
      if (d.from_uid && !(await allowAdminNotify(d.from_uid))) {
        console.warn("admin notify rate-limited", {reqId: event.params.reqId});
        return;
      }
      const adminNum = process.env.WA_ADMIN_NUMBER || "905523070067";
      const name = d.from_name || d.from_email || "Öğrenci";
      let detail;
      if (d.type === "reschedule_request") {
        detail = `↺ Erteleme · ${d.lesson_date} ${d.lesson_time} → ${d.new_date}`;
      } else if (d.type === "time_change_request") {
        detail = `⇄ Saat değişikliği · ${d.lesson_date} ${d.lesson_time} → ${d.new_date} ${d.new_time} (onayın bekleniyor, hak düşmez)`;
      } else if (d.type === "payment_request") {
        detail = `₺ Ödeme bildirimi · ${(d.total_price || 0).toLocaleString("tr-TR")} TL`;
      } else if (d.type === "extra_lesson") {
        detail = `➕ Ek ders · ${d.lesson_date} ${d.lesson_time}`;
      } else if (d.lesson_type === "trial") {
        detail = `🎯 Deneme · ${d.trial_date} ${d.trial_time}`;
      } else if (d.lesson_type === "single") {
        detail = `🎯 Tek Ders`;
      } else {
        detail = `📅 ${d.duration_months} Ay · ${d.lessons_per_month || 4}/Ay`;
      }
      const body = `🔔 Yeni talep — ${name}\n${detail}\n${d.from_phone || ""}\nberkayeracademy.com/booking`;
      const res = await sendWhatsApp(adminNum, body);
      if (!res.ok) console.error("admin notify failed", res.error);
      else console.log("admin notified for new request", event.params.reqId);
    },
);

// ─── Asistan: öğrencinin "Berkay'a ilet" dediği soru → admine WhatsApp ───
// Cevap admin panelindeki "Asistan soruları" kartından yazılır; asistan onu öğrenir.
exports.notifyAdminOnAssistantQuestion = onDocumentCreated(
    {region: "europe-west1", document: "assistant_questions/{qId}"},
    async (event) => {
      const d = event.data && event.data.data();
      if (!d || d.answered || !d.uid) return;
      if (!(await allowAdminNotify(d.uid, "assistant_notify"))) {
        console.warn("assistant notify rate-limited", {qId: event.params.qId});
        return;
      }
      const adminNum = process.env.WA_ADMIN_NUMBER || "905523070067";
      const name = d.name || "Öğrenci";
      const text = String(d.text || "").slice(0, 300);
      const body = `💬 Asistan sorusu — ${name}\n"${text}"\nYanıtla: berkayeracademy.com/booking#adm-mesajlar`;
      const res = await sendWhatsApp(adminNum, body);
      if (!res.ok) console.error("assistant notify failed", res.error);
      else console.log("admin notified for assistant question", event.params.qId);
    },
);

// Öğrenci başına admin bildirimi sınırı: 24 saatlik pencerede en fazla
// ADMIN_NOTIFY_MAX. Sayaç rate_limits/{uid} (yalnız fonksiyon yazar, admin okur).
// field: ayrı sayaç ("admin_notify" talepler, "assistant_notify" asistan soruları).
const ADMIN_NOTIFY_MAX = 3;
const ADMIN_NOTIFY_WINDOW_MS = 24 * 60 * 60 * 1000;
async function allowAdminNotify(uid, field = "admin_notify") {
  const db = getFirestore();
  const ref = db.collection("rate_limits").doc(String(uid));
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const cur = (snap.exists && snap.data()[field]) || {};
      const start = cur.window_start && cur.window_start.toMillis ? cur.window_start.toMillis() : 0;
      if (!start || now - start >= ADMIN_NOTIFY_WINDOW_MS) {
        tx.set(ref, {[field]: {window_start: Timestamp.fromMillis(now), count: 1}}, {merge: true});
        return true;
      }
      const count = Number(cur.count) || 0;
      if (count >= ADMIN_NOTIFY_MAX) {
        tx.set(ref, {[field]: {suppressed: FieldValue.increment(1)}}, {merge: true});
        return false;
      }
      tx.set(ref, {[field]: {count: count + 1}}, {merge: true});
      return true;
    });
  } catch (e) {
    console.error("rate limit check failed", e.message || e);
    return true; // sayaç okunamazsa bildirim kaybolmasın
  }
}

// ─── Trial-lesson eligibility check ────────────────────────────
// Trial ders sadece 1 kere alınabilir. Aynı email / telefon / IP'den
// ikinci bir deneme dersi denemesi engellenir. Her kontrol AYRI ayrı:
// biri eşleşirse yeter — email değiştirilse bile telefon veya IP
// yakalar (kullanıcının anti-abuse isteği).
exports.checkTrialEligibility = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Auth gerekli");
      }
      const email = (request.auth.token.email || "").toLowerCase();
      const rawPhone = String((request.data && request.data.phone) || "");
      const phone = rawPhone.replace(/[^\d+]/g, ""); // normalize
      const rr = request.rawRequest || {};
      const hdrs = rr.headers || {};
      const forwarded = String(hdrs["x-forwarded-for"] || "").split(",")[0].trim();
      const clientIp = rr.ip || forwarded || null;

      const db = getFirestore();

      async function hasPriorTrialBy(field, value) {
        if (!value) return false;
        const snap = await db.collection("lesson_requests")
            .where(field, "==", value)
            .where("lesson_type", "==", "trial")
            .limit(1)
            .get();
        return !snap.empty;
      }

      if (await hasPriorTrialBy("from_email", email)) {
        return {ok: false, reason: "email", ip: clientIp};
      }
      if (phone && await hasPriorTrialBy("from_phone", phone)) {
        return {ok: false, reason: "phone", ip: clientIp};
      }
      if (clientIp && await hasPriorTrialBy("client_ip", clientIp)) {
        return {ok: false, reason: "ip", ip: clientIp};
      }
      return {ok: true, ip: clientIp};
    },
);

// Request status change → notify student via WhatsApp template
exports.notifyStudentOnRequestStatus = onDocumentUpdated(
    {region: "europe-west1", document: "lesson_requests/{reqId}"},
    async (event) => {
      const before = event.data && event.data.before.data();
      const after = event.data && event.data.after.data();
      if (!before || !after) return;
      if (before.status === after.status) return;
      if (!after.from_phone) return;
      const name = after.from_name || (after.from_email || "").split("@")[0] || "Öğrenci";
      let statusLabel = "";
      if (after.status === "accepted") statusLabel = "onaylandı";
      else if (after.status === "rejected") statusLabel = "şu an için uygun görülmedi";
      else return;
      const res = await sendWhatsAppTemplate(
          after.from_phone,
          TEMPLATES.request_status,
          {"1": name, "2": statusLabel},
      );
      if (!res.ok) console.error("student notify failed", res.error);
      else console.log(`student notified ${after.status} for`, event.params.reqId);
    },
);

// ─── Twilio WhatsApp inbound webhook ────────────────────────
// Twilio POSTs incoming WA messages here as x-www-form-urlencoded.
// We validate the signature, then write to:
//   whatsapp_conversations/{phone}                  (summary doc)
//   whatsapp_conversations/{phone}/messages/{id}    (full thread)
// Returns empty TwiML so Twilio doesn't auto-reply.
function validateTwilioSig(url, params, twilioSig, token) {
  // Twilio's signature = HMAC-SHA1 of (URL + alphabetized form params concatenated), base64
  const sorted = Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = crypto.createHmac("sha1", token).update(url + sorted).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(twilioSig || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Twilio imzayı konsolda tanımlı webhook adresi üzerinden hesaplar. Cloud Functions v2'de
// req.originalUrl fonksiyon yolunu içermez ("/"), bu yüzden kanonik adres(ler) ile denenir.
const TWILIO_WEBHOOK_URLS = [
  process.env.TWILIO_WEBHOOK_URL,
  "https://europe-west1-ableton-tutorial.cloudfunctions.net/twilioWhatsAppWebhook",
].filter(Boolean);

exports.twilioWhatsAppWebhook = onRequest(
    {region: "europe-west1", cors: false},
    async (req, res) => {
      if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
      }
      const token = process.env.TWILIO_AUTH_TOKEN;
      const sig = req.get("X-Twilio-Signature");
      const proto = req.get("x-forwarded-proto") || "https";
      const host = req.get("x-forwarded-host") || req.get("host");
      const q = req.originalUrl && req.originalUrl.indexOf("?") >= 0 ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
      const candidates = TWILIO_WEBHOOK_URLS.map((u) => u + q).concat([`${proto}://${host}${req.originalUrl}`]);
      const params = req.body || {};
      // Yalnız Twilio'dan gelen (doğru imzalı) istekler işlenir; sahte istek admin sohbetine mesaj yazamaz.
      const ok = !!(token && sig) && candidates.some((u) => validateTwilioSig(u, params, sig, token));
      // Log: mesaj içeriği / telefon yazılmaz (kişisel veri)
      console.log("twilio webhook", {ok, hasSig: !!sig, bodyKeys: Object.keys(params)});
      if (!ok) {
        console.warn("Twilio signature rejected", {hasSig: !!sig, tried: candidates.length});
        res.status(403).send("Forbidden");
        return;
      }

      const from = req.body.From || ""; // "whatsapp:+90555..."
      const to = req.body.To || "";
      const body = req.body.Body || "";
      const msgSid = req.body.MessageSid || req.body.SmsMessageSid || "";
      const profileName = req.body.ProfileName || "";

      // Strip "whatsapp:" prefix to get the phone number
      const phone = from.replace(/^whatsapp:/, "");
      if (!phone) {
        res.status(200).send("<Response/>");
        return;
      }

      const db = getFirestore();
      // Look up student by phone to enrich the summary doc
      let studentUid = null;
      let studentName = profileName || phone;
      try {
        const q = await db.collection("reservations").where("student_phone", "in", phoneLookupCandidates(phone)).limit(1).get();
        if (!q.empty) {
          studentUid = q.docs[0].id;
          studentName = q.docs[0].data().student_name || studentName;
        }
      } catch (e) {
        console.warn("student lookup failed", e.message);
      }

      const convoRef = db.collection("whatsapp_conversations").doc(phone);
      const msgRef = convoRef.collection("messages").doc(msgSid || `inbound_${Date.now()}`);

      await msgRef.set({
        direction: "in",
        from,
        to,
        body,
        sid: msgSid,
        profile_name: profileName,
        created_at: FieldValue.serverTimestamp(),
      });
      await convoRef.set({
        phone,
        student_uid: studentUid,
        student_name: studentName,
        last_message: body.slice(0, 200),
        last_message_at: FieldValue.serverTimestamp(),
        last_direction: "in",
        unread_count: FieldValue.increment(1),
      }, {merge: true});

      // Empty TwiML — no auto-reply
      res.status(200).type("text/xml").send("<Response/>");
    },
);

// Admin-only callable: send WhatsApp via shared helper so freeform admin
// messages land in the same whatsapp_conversations thread as cron sends.
exports.sendWhatsAppAdmin = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!isAdminAuth(request.auth)) {
        throw new HttpsError("permission-denied", "Yetkisiz erişim");
      }
      const {toPhone, body} = request.data || {};
      if (!toPhone || !body) throw new HttpsError("invalid-argument", "toPhone ve body gerekli");
      const result = await sendAndPersistWA({toPhone, body, source: "admin_panel"});
      if (!result.ok) {
        throw new HttpsError("internal", result.error || "send failed");
      }
      return {ok: true, sid: result.sid, status: result.status};
    },
);

// Admin-only: mark a conversation as read (zero unread count)
exports.markWhatsAppConvoRead = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!isAdminAuth(request.auth)) {
        throw new HttpsError("permission-denied", "Yetkisiz erişim");
      }
      const {phone} = request.data || {};
      if (!phone) throw new HttpsError("invalid-argument", "phone gerekli");
      await getFirestore().collection("whatsapp_conversations").doc(phone).set({
        unread_count: 0,
      }, {merge: true});
      return {ok: true};
    },
);

// ── Helper: branded template for custom admin messages ──
function buildCustomMailOptions(toName, toEmail, subject, message) {
  const safeSubject = (subject || "").replace(/[\r\n]/g, " ").slice(0, 200);
  const safeName = escHtml((toName || "").replace(/[\r\n]/g, " ").slice(0, 100));
  const safeMessage = escHtml(message).replace(/\n/g, "<br>");
  return {
    from: `"Berkay Er Academy" <berkayer032@gmail.com>`,
    replyTo: "berkayer032@gmail.com",
    to: toEmail,
    subject: safeSubject,
    headers: {
      "List-Unsubscribe": "<mailto:berkayer032@gmail.com?subject=unsubscribe>",
    },
    text: `Merhaba ${toName},\n\n${message}\n\nBerkay Er Academy\nberkayeracademy.com`,
    html: `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:560px;">
        <tr><td style="background:#060609;padding:24px 32px;text-align:center;">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:bold;color:#e8b84b;letter-spacing:2px;">BERKAY ER ACADEMY</div>
          <div style="font-size:11px;color:rgba(238,235,230,.5);letter-spacing:3px;margin-top:4px;">ABLETON ÖZEL DERS</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;font-size:15px;color:#222;">Merhaba <strong>${safeName}</strong>,</p>
          <div style="font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${safeMessage}</div>
        </td></tr>
        <tr><td style="background:#f8f8f8;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;">Berkay Er Academy · berkayeracademy.com</p>
          <p style="margin:4px 0 0;font-size:11px;color:#ccc;">Bu emaili almak istemiyorsanız <a href="mailto:berkayer032@gmail.com?subject=unsubscribe" style="color:#aaa;">buraya tıklayın</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// Manual trigger: admin clicks "Email Gönder" in admin panel
exports.sendPaymentRemindersManual = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!isAdminAuth(request.auth)) {
        throw new Error("Unauthorized");
      }
      const db = getFirestore();
      const snapshot = await db.collection("reservations").get();
      const students = collectUnpaidStudents(snapshot);
      const promises = students.map(({doc, email, name, nextLesson}) => {
        const nextDateFormatted = new Date(nextLesson.date + "T12:00:00")
            .toLocaleDateString("tr-TR", {day: "numeric", month: "long", year: "numeric"});
        const mail = buildReminderMailOptions(name, email, nextLesson, nextDateFormatted);
        return transporter.sendMail(mail).then(() =>
          db.collection("reservations").doc(doc.id).update({
            last_reminder_sent: FieldValue.serverTimestamp(),
          }),
        );
      });
      await Promise.all(promises);
      return {sent: promises.length};
    },
);

// Admin: send a custom email to a specific student
exports.sendCustomEmail = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!isAdminAuth(request.auth)) {
        throw new Error("Unauthorized");
      }
      const {toEmail, toName, subject, message} = request.data;
      if (!toEmail || !message) throw new Error("Missing toEmail or message");
      const mail = buildCustomMailOptions(toName || "Öğrenci", toEmail, subject || "Berkay Er Academy", message);
      await transporter.sendMail(mail);
      return {ok: true};
    },
);

// ── Zoom: Create Meeting ────────────────────────────────────────────────────
exports.createZoomMeeting = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!isAdminAuth(request.auth)) {
        throw new HttpsError("permission-denied", "Yetkisiz erişim");
      }

      const {topic, startTime, duration} = request.data;

      // 1. Get access token
      const accountId = process.env.Z_ACCOUNT_ID;
      const clientId = process.env.Z_CLIENT_ID;
      const clientSecret = process.env.Z_CLIENT_SECRET;
      if (!accountId || !clientId || !clientSecret) {
        throw new HttpsError("failed-precondition", "Zoom credentials eksik");
      }
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      let tokenData;
      try {
        const tokenRes = await fetch(
            `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
            {method: "POST", headers: {"Authorization": `Basic ${credentials}`}},
        );
        tokenData = await tokenRes.json();
      } catch (e) {
        throw new HttpsError("unavailable", "Zoom token isteği başarısız: " + e.message);
      }
      if (!tokenData.access_token) {
        throw new HttpsError("failed-precondition", "Zoom token alınamadı: " + JSON.stringify(tokenData));
      }

      // 2. Create meeting
      let meetingData;
      try {
        const meetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: topic || "Ableton Özel Ders",
            type: startTime ? 2 : 1,
            start_time: startTime || undefined,
            duration: duration || 60,
            timezone: "Europe/Istanbul",
            settings: {host_video: true, participant_video: true, waiting_room: false},
          }),
        });
        meetingData = await meetingRes.json();
      } catch (e) {
        throw new HttpsError("unavailable", "Zoom toplantı isteği başarısız: " + e.message);
      }
      if (!meetingData.join_url) {
        throw new HttpsError("failed-precondition", "Toplantı oluşturulamadı: " + JSON.stringify(meetingData));
      }

      // 3. Save to Firestore — settings/zoom (kısıtlı okuma); eski alan global'den silinir
      const db = getFirestore();
      const batch = db.batch();
      batch.set(db.collection("settings").doc("zoom"),
          {zoom_link: meetingData.join_url, updated_at: FieldValue.serverTimestamp()},
          {merge: true});
      batch.set(db.collection("settings").doc("global"),
          {zoom_link: FieldValue.delete()},
          {merge: true});
      await batch.commit();

      return {join_url: meetingData.join_url, meeting_id: meetingData.id};
    },
);

// ── Welcome Email ──────────────────────────────────────────────────────────
const MODULES = [
  {num: "01", title: "Ableton Live Temelleri", level: "Başlangıç", free: true, topics: ["Arayüz & workflow optimizasyonu", "Session View vs Arrangement View", "MIDI & Audio routing", "Temel efektler & sinyal zinciri"]},
  {num: "02", title: "Ritim & Beat Üretimi", level: "Başlangıç — Orta", free: false, topics: ["Drum Rack & sample layering", "Swing, groove & humanization", "Velocity programlama", "Peaktime & Techno ritim yapıları"]},
  {num: "03", title: "Parça Kurgulama ve Yapımı", level: "Orta — İleri", free: false, topics: ["Dark melodi & harmoni yapısı", "Tension, build & release dinamiği", "Arrangement şablonları", "Ses mimarisi & atmosfer katmanlama"]},
  {num: "04", title: "Loop & Sample Tasarımı", level: "Orta", free: false, topics: ["Sample seçimi & düzenleme", "Creative resampling teknikleri", "Chop, slice & warp", "Loop'tan sahneye taşıma"]},
  {num: "05", title: "Ses Tasarımı & Synthesis", level: "Orta", free: false, topics: ["Oscillator, ADSR, Filter temelleri", "Ableton Wavetable & Operator", "Serum / VST synthesizer kullanımı", "Atmospheric pad & texture tasarımı"]},
  {num: "06", title: "Mixing & Mastering", level: "Orta — İleri", free: false, topics: ["EQ, Compressor & Sidechain", "Reverb / Delay space tasarımı", "Stereo genişlik & derinlik", "Master chain & loudness yönetimi"]},
  {num: "07", title: "Özgün Tarz Geliştirme", level: "Tüm seviyeler", free: false, topics: ["Referans analizi & kulak eğitimi", "Müzikal kimlik & imza ses", "Demo & release süreçleri", "Geri bildirim & kritik çalışması"]},
  {num: "08", title: "Live Set Kurgulama", level: "İleri", free: false, topics: ["Sahne için clip & scene düzeni", "Controller mapping & MIDI takımı", "Canlı efekt & otomasyon", "Sahne dinamiği & crowd okuma"]},
];

function buildWelcomeMailOptions(name, toEmail) {
  const moduleCards = MODULES.map((m) => `
    <td style="width:50%;padding:6px;vertical-align:top;">
      <div style="background:#f8f8f8;border:1px solid ${m.free ? "#e8b84b" : "#e5e5e5"};border-radius:6px;padding:14px 16px;height:100%;box-sizing:border-box;">
        ${m.free ? `<div style="display:inline-block;background:#e8b84b;color:#060609;font-size:9px;font-weight:bold;padding:2px 7px;border-radius:3px;letter-spacing:.5px;margin-bottom:8px;">ÜCRETSİZ</div><br>` : ""}
        <table cellpadding="0" cellspacing="0" style="margin-bottom:6px;width:100%;">
          <tr>
            <td style="vertical-align:top;padding-right:8px;width:28px;font-size:17px;font-weight:bold;color:${m.free ? "#e8b84b" : "#ccc"};font-family:'Helvetica Neue',Arial,sans-serif;line-height:1.3;">${m.num}</td>
            <td style="vertical-align:top;">
              <div style="font-size:12px;font-weight:bold;color:#222;line-height:1.3;">${m.title}</div>
              <div style="font-size:10px;color:#999;margin-top:2px;">${m.level}</div>
            </td>
          </tr>
        </table>
        <ul style="margin:0;padding-left:14px;">
          ${m.topics.map((t) => `<li style="font-size:11px;color:#555;margin-bottom:3px;line-height:1.4;">${t}</li>`).join("")}
        </ul>
      </div>
    </td>`).reduce((rows, card, i) => {
    if (i % 2 === 0) rows.push(`<tr>${card}`);
    else rows[rows.length - 1] += `${card}</tr>`;
    return rows;
  }, []).join("");

  return {
    from: `"Berkay Er Academy" <berkayer032@gmail.com>`,
    replyTo: "berkayer032@gmail.com",
    to: toEmail,
    subject: `Hoş geldin ${name} — Ders programın hazır`,
    headers: {"List-Unsubscribe": "<mailto:berkayer032@gmail.com?subject=unsubscribe>"},
    text: `Merhaba ${name},\n\nDers talebini aldık, çok yakında seninle iletişime geçeceğiz.\n\nSeni neler bekliyor?\n\n${MODULES.map((m) => `${m.num}. ${m.title} (${m.level})${m.free ? " — ÜCRETSİZ" : ""}\n${m.topics.map((t) => "   • " + t).join("\n")}`).join("\n\n")}\n\nDers Paneli: https://berkayeracademy.com/booking\n\nBerkay Er Academy\nberkayeracademy.com`,
    html: `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:580px;">
        <tr><td style="background:#060609;padding:24px 32px;text-align:center;">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:bold;color:#e8b84b;letter-spacing:2px;">BERKAY ER ACADEMY</div>
          <div style="font-size:11px;color:rgba(238,235,230,.5);letter-spacing:3px;margin-top:4px;">ABLETON ÖZEL DERS</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:15px;color:#222;">Merhaba <strong>${escHtml(name)}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">Ders talebini aldık — çok yakında seninle iletişime geçeceğiz. Seni neler beklediğine bir göz at:</p>

          <div style="background:#060609;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
            <div style="font-size:11px;color:rgba(232,184,75,.7);letter-spacing:2px;font-weight:bold;margin-bottom:4px;">DERS İÇERİĞİ</div>
            <div style="font-size:13px;color:rgba(238,235,230,.7);line-height:1.6;">8 modül · Tüm seviyeler · Kişiye özel müfredat</div>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${moduleCards}
          </table>

          <div style="background:#f9f6f0;border:1px solid #e8b84b;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
            <div style="font-size:12px;color:#856404;font-weight:bold;margin-bottom:4px;">📦 500 GB Preset Paketi</div>
            <div style="font-size:12px;color:#555;line-height:1.5;">Ders sürecinde kullanmak üzere 500 GB preset, sample ve kaynak paketi paylaşılacaktır.</div>
          </div>

          <a href="https://berkayeracademy.com/booking" style="display:inline-block;background:#e8b84b;color:#060609;font-size:13px;font-weight:bold;padding:12px 28px;border-radius:4px;text-decoration:none;letter-spacing:1px;">Ders Panelinize Git →</a>
        </td></tr>
        <tr><td style="background:#f8f8f8;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;">Berkay Er Academy · berkayeracademy.com</p>
          <p style="margin:4px 0 0;font-size:11px;color:#ccc;">Bu emaili almak istemiyorsanız <a href="mailto:berkayer032@gmail.com?subject=unsubscribe" style="color:#aaa;">buraya tıklayın</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

exports.sendWelcomeEmail = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!isAdminAuth(request.auth)) {
        throw new HttpsError("permission-denied", "Yetkisiz erişim");
      }
      const {toEmail, toName} = request.data;
      if (!toEmail) throw new HttpsError("invalid-argument", "toEmail gerekli");
      const mail = buildWelcomeMailOptions(toName || "Öğrenci", toEmail);
      await transporter.sendMail(mail);
      return {ok: true};
    },
);

// ── Promo Email ────────────────────────────────────────────────────────────
function buildPromoMailOptions(name, toEmail) {
  const moduleRows = [
    ["01 · Ableton Live Temelleri", "ÜCRETSİZ", "#e8b84b"],
    ["02 · Ritim & Beat Üretimi", "Başlangıç — Orta", "#aaa"],
    ["03 · Parça Kurgulama ve Yapımı", "Orta — İleri", "#aaa"],
    ["04 · Loop & Sample Tasarımı", "Orta", "#aaa"],
    ["05 · Ses Tasarımı & Synthesis", "Orta", "#aaa"],
    ["06 · Mixing & Mastering", "Orta — İleri", "#aaa"],
    ["07 · Özgün Tarz Geliştirme", "Tüm seviyeler", "#aaa"],
    ["08 · Live Set Kurgulama", "İleri", "#aaa"],
  ].map(([title, badge, color]) => `
    <tr>
      <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td style="font-size:12px;color:#222;font-weight:600;">${title}</td>
          <td style="text-align:right;white-space:nowrap;"><span style="font-size:10px;color:${color};font-weight:bold;">${badge}</span></td>
        </tr></table>
      </td>
    </tr>`).join("");

  return {
    from: `"Berkay Er Academy" <berkayer032@gmail.com>`,
    replyTo: "berkayer032@gmail.com",
    to: toEmail,
    subject: `Ableton özel ders — elektronik müzik prodüksiyonunu profesyonelce öğren`,
    headers: {"List-Unsubscribe": "<mailto:berkayer032@gmail.com?subject=unsubscribe>"},
    text: `Merhaba ${name},\n\nBerkay Er Academy ile Ableton Live özel dersleri başlıyor.\n\n2019'dan bu yana süregelen müzikal birikim ve prodüksiyon deneyimiyle elektronik müzik üretimini sıfırdan profesyonel düzeye taşı.\n\n8 Modül:\n${MODULES.map((m) => `${m.num}. ${m.title}`).join("\n")}\n\nAyrıca:\n• Ücretsiz deneme dersi\n• 500 GB preset & sample paketi\n• Online, esnek takvim\n\nDeneme dersini rezerve et: https://berkayeracademy.com/egitim\n\nBerkay Er Academy\nberkayeracademy.com`,
    html: `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:560px;">
        <tr><td style="background:#060609;padding:28px 32px;text-align:center;">
          <div style="font-size:22px;font-weight:bold;color:#e8b84b;letter-spacing:2px;font-family:'Helvetica Neue',Arial,sans-serif;">BERKAY ER ACADEMY</div>
          <div style="font-size:11px;color:rgba(238,235,230,.5);letter-spacing:3px;margin-top:4px;">ABLETON ÖZEL DERS</div>
        </td></tr>
        <tr><td style="background:#0d0d14;padding:28px 32px;text-align:center;">
          <div style="font-size:13px;color:rgba(232,184,75,.7);letter-spacing:2px;margin-bottom:10px;">ELEKTRONİK MÜZİK PRODÜKSİYONU</div>
          <div style="font-size:26px;font-weight:bold;color:#fff;line-height:1.25;margin-bottom:12px;">Sıfırdan Profesyonele<br><span style="color:#e8b84b;">Ableton Özel Ders</span></div>
          <div style="font-size:13px;color:rgba(238,235,230,.55);line-height:1.7;max-width:400px;margin:0 auto 20px;">Berkay Er ile kişiye özel müfredat, online uygulamalı dersler. 2019'dan bu yana süregelen prodüksiyon deneyimi.</div>
          <a href="https://berkayeracademy.com/egitim" style="display:inline-block;background:#e8b84b;color:#060609;font-size:13px;font-weight:bold;padding:13px 30px;border-radius:4px;text-decoration:none;letter-spacing:1px;">Ücretsiz Deneme Dersi Al →</a>
        </td></tr>
        <tr><td style="padding:28px 32px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:33%;text-align:center;padding:0 8px;">
                <div style="font-size:24px;margin-bottom:6px;">🎓</div>
                <div style="font-size:12px;font-weight:bold;color:#222;margin-bottom:3px;">8 Modül</div>
                <div style="font-size:11px;color:#888;line-height:1.5;">Tüm seviyeler, kişiye özel müfredat</div>
              </td>
              <td style="width:33%;text-align:center;padding:0 8px;">
                <div style="font-size:24px;margin-bottom:6px;">📦</div>
                <div style="font-size:12px;font-weight:bold;color:#222;margin-bottom:3px;">500 GB Paket</div>
                <div style="font-size:11px;color:#888;line-height:1.5;">Preset, sample ve kaynak arşivi</div>
              </td>
              <td style="width:33%;text-align:center;padding:0 8px;">
                <div style="font-size:24px;margin-bottom:6px;">🆓</div>
                <div style="font-size:12px;font-weight:bold;color:#222;margin-bottom:3px;">Ücretsiz Deneme</div>
                <div style="font-size:11px;color:#888;line-height:1.5;">İlk ders tamamen ücretsiz</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="height:1px;background:#eee;"></div></td></tr>
        <tr><td style="padding:24px 32px;">
          <div style="font-size:11px;color:#999;letter-spacing:2px;margin-bottom:14px;">DERS İÇERİĞİ</div>
          <table width="100%" cellpadding="0" cellspacing="0">${moduleRows}</table>
        </td></tr>
        <tr><td style="background:#f9f6f0;padding:24px 32px;text-align:center;border-top:1px solid #eee;">
          <div style="font-size:14px;color:#222;font-weight:bold;margin-bottom:6px;">Hemen başla — ilk ders ücretsiz</div>
          <div style="font-size:12px;color:#888;margin-bottom:16px;">Online · Esnek takvim · Kişiye özel</div>
          <a href="https://berkayeracademy.com/egitim" style="display:inline-block;background:#060609;color:#e8b84b;font-size:13px;font-weight:bold;padding:12px 28px;border-radius:4px;text-decoration:none;letter-spacing:1px;">Eğitim Sayfasına Git →</a>
        </td></tr>
        <tr><td style="background:#f8f8f8;padding:18px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;">Berkay Er Academy · berkayeracademy.com</p>
          <p style="margin:4px 0 0;font-size:11px;color:#ccc;">Bu emaili almak istemiyorsanız <a href="mailto:berkayer032@gmail.com?subject=unsubscribe" style="color:#aaa;">buraya tıklayın</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

exports.sendPromoEmailAll = onCall(
    {region: "europe-west1", timeoutSeconds: 300},
    async (request) => {
      if (!isAdminAuth(request.auth)) {
        throw new HttpsError("permission-denied", "Yetkisiz erişim");
      }
      const db = getFirestore();
      const [usersSnap, resSnap] = await Promise.all([
        db.collection("users").get(),
        db.collection("reservations").get(),
      ]);
      const studentUids = new Set(resSnap.docs.map((d) => d.id));
      const promises = [];
      usersSnap.forEach((doc) => {
        const d = doc.data();
        if (!d.email || d.email === ADMIN_EMAIL) return;
        if (studentUids.has(doc.id)) return; // skip existing students
        const mail = buildPromoMailOptions(d.displayName || d.email.split("@")[0], d.email);
        promises.push(transporter.sendMail(mail).catch(() => {}));
      });
      await Promise.all(promises);
      return {sent: promises.length};
    },
);

exports.sendPromoEmailSingle = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!isAdminAuth(request.auth)) {
        throw new HttpsError("permission-denied", "Yetkisiz erişim");
      }
      const {toEmail, toName} = request.data;
      if (!toEmail) throw new HttpsError("invalid-argument", "toEmail gerekli");
      const mail = buildPromoMailOptions(toName || toEmail.split("@")[0], toEmail);
      await transporter.sendMail(mail);
      return {ok: true};
    },
);

// ─── WhatsApp (Twilio) ──────────────────────────────────────────────
// Admin-only callable to send a WhatsApp message to any phone.
// In sandbox, the recipient must have joined first.
exports.sendWhatsAppMessage = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!isAdminAuth(request.auth)) {
        throw new HttpsError("permission-denied", "Yetkisiz erişim");
      }
      const {toPhone, body} = request.data || {};
      if (!toPhone) throw new HttpsError("invalid-argument", "toPhone gerekli");
      if (!body) throw new HttpsError("invalid-argument", "body gerekli");
      const result = await sendWhatsApp(toPhone, body);
      if (!result.ok) {
        throw new HttpsError("internal", result.error || "send failed");
      }
      return {ok: true, sid: result.sid, status: result.status};
    },
);

// ─── Öğrencinin ders saati değişikliği TALEBİ ────────────────────────
// Öğrenci aynı hafta içinde başka bir saat seçer; ders hemen taşınmaz, admine
// lesson_requests/{id} {type:"time_change_request"} talebi gider (notifyAdminOnNewRequest
// WhatsApp atar). Admin "Gelen talepler"de onaylayınca ders taşınır (booking.html
// admApplyTimeChange); onay/red öğrenciye notifyStudentOnRequestStatus ile bildirilir.
// Kurallar (booking.html'deki seçici de aynılarını gösterir):
//   - dersin başlamasına en az 5 saat olmalı, yeni saat de en az 5 saat sonra
//   - yeni saat dersin olduğu haftada (Pazartesi–Pazar) olmalı
//   - her ders yalnızca bir kez taşınabilir (self_changed); ders başına tek bekleyen talep
//   - erteleme hakkı düşmez; ödemesi onaylanmamış planda (deneme hariç) kapalı
//   - kapalı gün/saatler ve dolu saatler (60 dk ders + 30 dk ara) seçilemez
// Saatler İstanbul saatidir (UTC+3, yaz saati uygulaması yok).
const SELF_RESCHED_MIN_MS = 5 * 60 * 60 * 1000;
const SELF_RESCHED_STATUSES = ["scheduled", "rescheduled"];
const OCCUPYING_STATUSES = ["scheduled", "rescheduled", "frozen", "cancel_requested"];

function trStart(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00+03:00`);
}
function weekStartOf(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
function minutesOf(timeStr) {
  const p = String(timeStr).split(":").map(Number);
  return p[0] * 60 + (p[1] || 0);
}
// Başka bir ders b'de başlıyorsa yeni başlangıç t ile çakışır mı: dersler
// üst üste binmez ve bir dersten sonra 30 dk ara kalır (ızgaradaki kural).
function slotsClash(t, b) {
  return t - b > -60 && t - b <= 60;
}
function trLabel(dateStr, timeStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${days[d.getUTCDay()]} ${timeStr}`;
}

exports.studentSelfReschedule = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısın.");
      const uid = request.auth.uid;
      const data = request.data || {};
      const lessonDate = String(data.lessonDate || "");
      const lessonTime = String(data.lessonTime || "");
      const newDate = String(data.newDate || "");
      const newTime = String(data.newTime || "");
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRe.test(lessonDate) || !dateRe.test(newDate) ||
          !/^\d{2}:\d{2}$/.test(lessonTime) || !/^([01]\d|2[0-3]):00$/.test(newTime)) {
        throw new HttpsError("invalid-argument", "Geçersiz tarih veya saat.");
      }
      if (lessonDate === newDate && lessonTime === newTime) {
        throw new HttpsError("invalid-argument", "Yeni saat mevcut saatle aynı.");
      }
      if (weekStartOf(lessonDate) !== weekStartOf(newDate)) {
        throw new HttpsError("failed-precondition", "Yeni saat, dersin olduğu hafta içinde olmalı.");
      }
      const now = Date.now();
      if (trStart(lessonDate, lessonTime).getTime() - now < SELF_RESCHED_MIN_MS) {
        throw new HttpsError("failed-precondition", "Dersine 5 saatten az kaldı; saat artık değiştirilemez.");
      }
      if (trStart(newDate, newTime).getTime() - now < SELF_RESCHED_MIN_MS) {
        throw new HttpsError("failed-precondition", "Yeni saat en az 5 saat sonra olmalı.");
      }

      const db = getFirestore();
      // Bu ders için bekleyen erteleme ya da saat talebi varsa iki akış çakışmasın
      const pending = await db.collection("lesson_requests")
          .where("from_uid", "==", uid)
          .where("status", "==", "pending")
          .get();
      const sameLesson = pending.docs.map((d) => d.data())
          .filter((x) => x.lesson_date === lessonDate && x.lesson_time === lessonTime);
      if (sameLesson.some((x) => x.type === "reschedule_request")) {
        throw new HttpsError("failed-precondition", "Bu ders için bekleyen bir erteleme talebin var.");
      }
      if (sameLesson.some((x) => x.type === "time_change_request")) {
        throw new HttpsError("already-exists", "Bu ders için bekleyen bir saat değişikliği talebin zaten var.");
      }

      const resSnap = await db.collection("reservations").doc(uid).get();
      if (!resSnap.exists) throw new HttpsError("not-found", "Rezervasyon bulunamadı.");
      const res = resSnap.data();
      if (res.lesson_type !== "trial" && !res.payment_confirmed) {
        throw new HttpsError("failed-precondition", "Ödeme onaylanmadan ders saati değiştirilemez.");
      }
      const lessons = Array.isArray(res.lessons) ? res.lessons : [];
      const idx = lessons.findIndex((l) => l && l.date === lessonDate && l.time === lessonTime &&
          SELF_RESCHED_STATUSES.includes(l.status));
      if (idx < 0) throw new HttpsError("not-found", "Ders bulunamadı (taşınmış veya iptal edilmiş olabilir).");
      if (lessons[idx].self_changed) {
        throw new HttpsError("failed-precondition", "Bu dersin saati daha önce değişti; her ders bir kez değiştirilebilir.");
      }

      // Kapalı gün / saat (admin müsaitliği)
      const settingsSnap = await db.collection("settings").doc("global").get();
      const settings = settingsSnap.exists ? settingsSnap.data() : {};
      const dow = new Date(`${newDate}T12:00:00Z`).getUTCDay();
      if (Array.isArray(settings.available_days) && !settings.available_days.includes(dow)) {
        throw new HttpsError("failed-precondition", "Seçilen saat dolu.");
      }
      const blocked = settings.blocked_hours && settings.blocked_hours[dow];
      if (Array.isArray(blocked) && blocked.includes(newTime)) {
        throw new HttpsError("failed-precondition", "Seçilen saat dolu.");
      }
      // Dolu saatler: o günün tüm kayıtları + öğrencinin kendi diğer dersleri
      // (admin onaylarken yeniden denetlenir; arada dolabilir)
      const t = minutesOf(newTime);
      const oldSlotId = `${lessonDate}_${lessonTime}`;
      const daySlots = await db.collection("booked_slots").where("date", "==", newDate).get();
      const clash = daySlots.docs.some((d) => d.id !== oldSlotId && slotsClash(t, minutesOf(d.data().time))) ||
          lessons.some((l, i) => i !== idx && l && l.date === newDate &&
              OCCUPYING_STATUSES.includes(l.status) && slotsClash(t, minutesOf(l.time)));
      if (clash) throw new HttpsError("failed-precondition", "Seçilen saat dolu. Başka bir saat seç.");

      const who = res.student_name || res.student_email || request.auth.token.email || "Öğrenci";
      const reqRef = await db.collection("lesson_requests").add({
        type: "time_change_request",
        from_uid: uid,
        from_name: res.student_name || "",
        from_email: res.student_email || request.auth.token.email || "",
        from_phone: res.student_phone || "",
        from_photo: res.student_photo || "",
        lesson_date: lessonDate,
        lesson_time: lessonTime,
        new_date: newDate,
        new_time: newTime,
        status: "pending",
        created_at: FieldValue.serverTimestamp(),
      });

      // Talep kaydedildi; e-posta hatası öğrencinin işlemini bozmasın (WhatsApp'ı tetikleyici atar).
      try {
        await transporter.sendMail({
          from: `"Berkay Er Academy" <berkayer032@gmail.com>`,
          to: "berkayer032@gmail.com",
          subject: `Saat değişikliği talebi — ${who}`,
          text: `${who} ders saatinin değişmesini istiyor.\n\nEski: ${trLabel(lessonDate, lessonTime)}\nYeni: ${trLabel(newDate, newTime)}\n\nOnaylarsan ders taşınır; erteleme hakkı düşmez.\nhttps://berkayeracademy.com/booking`,
        });
      } catch (e) {
        console.error("time-change request admin email error", e);
      }
      return {ok: true, pending: true, requestId: reqRef.id, date: newDate, time: newTime};
    },
);

// ─── Ders kanıtı: Zoom katılımı + onay / itiraz penceresi ─────────────
// Öğrenci "o ders hiç yapılmadı" diyemesin diye her dersin bitiminde:
//   1) lessons[i].confirmation = {status:"pending", opened_at, due_at} + zil bildirimi
//      (öğrenci panelde "Evet, ders yapıldı" / "Sorun bildir" görür; confirmLesson yazar)
//   2) Zoom Reports API'den katılım: lessons[i].attendance (özet) ve
//      lesson_attendance/{uid}_{date}_{time} (tam katılımcı listesi, yalnız admin)
//   3) 48 saat içinde karar verilmeyen ders lessonAutoConfirm ile {status:"auto"} olur.
// Yalnız ilgili dersin attendance / confirmation alanı değişir; yazımlar transaction içinde.
// Zoom kapsamları ve plan şartı: functions/attendance.js başındaki not.
const LESSON_SYNC_BATCH = 100; // tek çalıştırmada en fazla açılan onay penceresi
const ATTENDANCE_BATCH = 25; // tek çalıştırmada en fazla Zoom'a sorulan ders
const AUTO_CONFIRM_BATCH = 200; // tek çalıştırmada en fazla otomatik onay

function lessonKey(date, time) {
  return `${date}_${time}`;
}
function proofStudent(d) {
  return {
    email: d.student_email || d.from_email || "",
    name: d.student_name || d.from_name || "",
  };
}
// attendance karşılaştırması (fetched_at hariç) — değişmeyen sonucu her saat yeniden yazmayalım
function attendanceSig(a) {
  if (!a) return "";
  return [a.status, a.reason || "", a.student_join || "", a.student_leave || "",
    a.student_minutes || 0, a.host_minutes || 0, a.matched_by || ""].join("|");
}

// Zoom katılımını toplar: her ders için {attendance, evidence} döner. Rapor alınamazsa
// tüm dersler "unavailable" olur ve çalıştırma başına TEK uyarı yazılır (kişisel veri yok).
async function collectAttendance(items) {
  const out = {};
  if (!items.length) return out;
  const client = att.zoomReportClient({
    fetch: (url, init) => fetch(url, init),
    accountId: process.env.Z_ACCOUNT_ID,
    clientId: process.env.Z_CLIENT_ID,
    clientSecret: process.env.Z_CLIENT_SECRET,
    // Rapor uç noktaları S2S uygulamada "me"yi kabul etmiyor (1001 User does not exist: me) → Zoom hesabının e-postası
    hostUser: process.env.Z_HOST_USER || ADMIN_EMAIL,
  });
  const hostEmails = [process.env.Z_HOST_EMAIL, ADMIN_EMAIL];
  const fetchedAt = new Date().toISOString();
  const unavailable = (reason) => ({attendance: {source: "zoom", status: "unavailable", reason,
    student_join: null, student_leave: null, student_minutes: 0, host_minutes: 0, matched_by: null,
    fetched_at: fetchedAt}, evidence: null});

  const minStart = Math.min.apply(null, items.map((x) => x.startMs));
  const maxEnd = Math.max.apply(null, items.map((x) => x.endMs));
  const range = att.reportDateRange(minStart, maxEnd);
  const list = await client.listMeetings(range.from, range.to);
  if (!list.ok) {
    console.warn("[attendance] Zoom raporu alınamadı", {reason: list.reason, lessons: items.length});
    items.forEach((x) => {
      out[x.id] = unavailable(list.reason);
    });
    return out;
  }
  const partCache = {};
  let warned = false;
  for (const x of items) {
    const meeting = att.pickMeetingInstance(list.data, x.startMs, x.endMs);
    let participants = [];
    if (meeting) {
      if (!partCache[meeting.uuid]) partCache[meeting.uuid] = await client.listParticipants(meeting.uuid);
      const pr = partCache[meeting.uuid];
      if (!pr.ok) {
        if (!warned) console.warn("[attendance] Zoom katılımcı raporu alınamadı", {reason: pr.reason});
        warned = true;
        out[x.id] = unavailable(pr.reason);
        continue;
      }
      participants = pr.data;
    }
    const a = att.summarizeAttendance(meeting, participants, x.student,
        {startMs: x.startMs, endMs: x.endMs}, hostEmails);
    a.fetched_at = fetchedAt;
    out[x.id] = {
      attendance: a,
      evidence: {
        uid: x.uid, date: x.date, time: x.time,
        lesson_start: new Date(x.startMs).toISOString(),
        lesson_end: new Date(x.endMs).toISOString(),
        student_name: x.student.name, student_email: x.student.email,
        status: a.status, reason: a.reason || null, matched_by: a.matched_by,
        student_join: a.student_join, student_leave: a.student_leave,
        student_minutes: a.student_minutes, host_minutes: a.host_minutes,
        meeting: meeting ? {
          uuid: meeting.uuid || null, id: meeting.id || null, topic: meeting.topic || null,
          start_time: meeting.start_time || null, end_time: meeting.end_time || null,
          duration: typeof meeting.duration === "number" ? meeting.duration : null,
          participants_count: typeof meeting.participants_count === "number" ? meeting.participants_count : null,
        } : null,
        participants: att.evidenceParticipants(participants, meeting, hostEmails),
      },
    };
  }
  return out;
}

async function runLessonEndSync(nowMs) {
  const db = getFirestore();
  const snap = await db.collection("reservations").get();
  const work = {}; // uid → {ref, open: [lesson], att: [item]}
  const attItems = [];
  let openCount = 0;
  snap.forEach((doc) => {
    const d = doc.data();
    dedupLessons(d.lessons || []).forEach((l) => {
      if (att.PROOF_STATUSES.indexOf(l.status) < 0) return;
      const startMs = att.lessonStartMs(l.date, l.time);
      const endMs = startMs + att.LESSON_MS;
      const age = nowMs - endMs;
      if (!(age >= 0)) return;
      const w = work[doc.id] || (work[doc.id] = {ref: doc.ref, open: [], att: []});
      if (age < att.CONFIRM_WINDOW_MS && !(l.confirmation && l.confirmation.status) && openCount < LESSON_SYNC_BATCH) {
        w.open.push({date: l.date, time: l.time, endMs});
        openCount++;
      }
      if (age >= att.ATTENDANCE_MIN_AGE_MS && age < att.ATTENDANCE_LOOKBACK_MS &&
          !(l.attendance && l.attendance.status === "ok") && attItems.length < ATTENDANCE_BATCH) {
        const item = {id: `${doc.id}_${lessonKey(l.date, l.time)}`, uid: doc.id, date: l.date, time: l.time,
          startMs, endMs, student: proofStudent(d)};
        w.att.push(item);
        attItems.push(item);
      }
    });
  });

  const results = await collectAttendance(attItems);

  let opened = 0;
  let attWritten = 0;
  for (const uid of Object.keys(work)) {
    const w = work[uid];
    if (!w.open.length && !w.att.length) continue;
    try {
      const r = await db.runTransaction(async (tx) => {
        const s = await tx.get(w.ref);
        if (!s.exists) return {opened: 0, changed: false};
        const lessons = Array.isArray(s.data().lessons) ? s.data().lessons.slice() : [];
        const nowIso = new Date(nowMs).toISOString();
        let changed = false;
        const notifs = [];
        const evidence = [];
        w.open.forEach((o) => {
          const i = att.findLessonIdx(lessons, o.date, o.time);
          if (i < 0) return;
          const l = lessons[i];
          if (att.PROOF_STATUSES.indexOf(l.status) < 0 || (l.confirmation && l.confirmation.status)) return;
          lessons[i] = Object.assign({}, l, {confirmation: {
            status: "pending", opened_at: nowIso, due_at: new Date(o.endMs + att.CONFIRM_WINDOW_MS).toISOString(),
          }});
          notifs.push(o);
          changed = true;
        });
        w.att.forEach((x) => {
          const r = results[x.id];
          if (!r) return;
          const i = att.findLessonIdx(lessons, x.date, x.time);
          if (i < 0) return;
          const l = lessons[i];
          const prev = l.attendance;
          if (prev && prev.status === "ok") return;
          // geçici erişim hatası daha önce alınmış bir "absent" sonucunu silmesin
          if (r.attendance.status === "unavailable" && prev && prev.status === "absent") return;
          if (r.evidence) evidence.push(r.evidence);
          if (attendanceSig(prev) === attendanceSig(r.attendance)) return;
          lessons[i] = Object.assign({}, lessons[i], {attendance: r.attendance});
          changed = true;
        });
        if (changed) tx.update(w.ref, {lessons});
        notifs.forEach((o) => {
          tx.set(db.collection("notifications").doc(uid).collection("items").doc(`lessoncfm_${lessonKey(o.date, o.time)}`), {
            type: "lesson_confirm",
            text: `Dersin tamamlandı (${trLabel(o.date, o.time)}). Ders yapıldıysa onayla; bir sorun varsa 48 saat içinde bildir.`,
            link: "/booking#derslerim",
            lesson_date: o.date,
            lesson_time: o.time,
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          });
        });
        evidence.forEach((e) => {
          tx.set(db.collection("lesson_attendance").doc(`${uid}_${lessonKey(e.date, e.time)}`),
              Object.assign({}, e, {fetched_at: FieldValue.serverTimestamp()}));
        });
        return {opened: notifs.length, changed};
      });
      opened += r.opened;
      if (r.changed && w.att.length) attWritten += w.att.length;
    } catch (e) {
      console.error("lessonEndSync transaction failed", {uid, error: e.message || String(e)});
    }
  }
  console.log(`lessonAttendanceSync done: windows opened ${opened}, attendance checked ${attItems.length}`);
  return {opened, attendanceChecked: attItems.length, attWritten};
}

async function runAutoConfirm(nowMs) {
  const db = getFirestore();
  const snap = await db.collection("reservations").get();
  let budget = AUTO_CONFIRM_BATCH;
  let confirmed = 0;
  for (const doc of snap.docs) {
    if (budget <= 0) break;
    const due = dedupLessons(doc.data().lessons || []).filter((l) =>
      att.PROOF_STATUSES.indexOf(l.status) >= 0 && l.confirmation && l.confirmation.status === "pending" &&
      nowMs - att.lessonEndMs(l.date, l.time) >= att.CONFIRM_WINDOW_MS).slice(0, budget);
    if (!due.length) continue;
    try {
      const n = await db.runTransaction(async (tx) => {
        const s = await tx.get(doc.ref);
        if (!s.exists) return 0;
        const lessons = Array.isArray(s.data().lessons) ? s.data().lessons.slice() : [];
        const nowIso = new Date(nowMs).toISOString();
        let k = 0;
        due.forEach((l0) => {
          const i = att.findLessonIdx(lessons, l0.date, l0.time);
          if (i < 0) return;
          const l = lessons[i];
          if (att.PROOF_STATUSES.indexOf(l.status) < 0) return;
          if (!l.confirmation || l.confirmation.status !== "pending") return;
          if (nowMs - att.lessonEndMs(l.date, l.time) < att.CONFIRM_WINDOW_MS) return;
          lessons[i] = Object.assign({}, l, {confirmation: Object.assign({}, l.confirmation, {status: "auto", at: nowIso})});
          k++;
        });
        if (k) tx.update(doc.ref, {lessons});
        return k;
      });
      confirmed += n;
      budget -= due.length;
    } catch (e) {
      console.error("autoConfirm transaction failed", {uid: doc.id, error: e.message || String(e)});
    }
  }
  console.log(`lessonAutoConfirm done: ${confirmed} lessons auto-confirmed`);
  return {confirmed};
}

// Her saat :20 — biten derslerde onay penceresi + zil bildirimi, son 6 saatte bitenlerde Zoom katılımı
exports.lessonAttendanceSync = onSchedule(
    {schedule: "20 * * * *", timeZone: "Europe/Istanbul", timeoutSeconds: 300},
    async () => {
      await runLessonEndSync(Date.now());
    },
);

// Her saat :40 — 48 saat içinde onaylanmayan / itiraz edilmeyen dersler "yapılmış" sayılır
exports.lessonAutoConfirm = onSchedule(
    {schedule: "40 * * * *", timeZone: "Europe/Istanbul", timeoutSeconds: 300},
    async () => {
      await runAutoConfirm(Date.now());
    },
);

// Öğrenci: "Evet, ders yapıldı" / "Sorun bildir". Kurallar ders satırlarını yalnız admine
// açtığı için karar burada doğrulanıp Admin SDK ile yazılır.
const DISPUTE_REASON_MAX = 500;
exports.confirmLesson = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısın.");
      const uid = request.auth.uid;
      const data = request.data || {};
      const date = String(data.date || "");
      const time = String(data.time || "");
      const action = String(data.action || "");
      const reason = String(data.reason || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        throw new HttpsError("invalid-argument", "Geçersiz tarih veya saat.");
      }
      if (action !== "confirm" && action !== "dispute") throw new HttpsError("invalid-argument", "Geçersiz işlem.");
      if (action === "dispute" && !reason) throw new HttpsError("invalid-argument", "Sorunu kısaca yazmalısın.");
      if (reason.length > DISPUTE_REASON_MAX) {
        throw new HttpsError("invalid-argument", `Açıklama en fazla ${DISPUTE_REASON_MAX} karakter olabilir.`);
      }
      const now = Date.now();
      const endMs = att.lessonEndMs(date, time);
      const db = getFirestore();
      const resRef = db.collection("reservations").doc(uid);
      let who = "";
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(resRef);
        if (!snap.exists) throw new HttpsError("not-found", "Rezervasyon bulunamadı.");
        const res = snap.data();
        who = res.student_name || res.student_email || "";
        const lessons = Array.isArray(res.lessons) ? res.lessons.slice() : [];
        const i = att.findLessonIdx(lessons, date, time);
        if (i < 0) throw new HttpsError("not-found", "Ders bulunamadı.");
        const l = lessons[i];
        if (att.PROOF_STATUSES.indexOf(l.status) < 0) {
          throw new HttpsError("failed-precondition", "Bu ders iptal edilmiş ya da dondurulmuş.");
        }
        if (now < endMs) throw new HttpsError("failed-precondition", "Ders henüz bitmedi.");
        const c = l.confirmation;
        if (c && c.status && c.status !== "pending") {
          throw new HttpsError("already-exists", "Bu ders için karar zaten verilmiş.");
        }
        if (action === "dispute" && now - endMs > att.CONFIRM_WINDOW_MS) {
          throw new HttpsError("failed-precondition", "İtiraz süresi (48 saat) doldu.");
        }
        const conf = Object.assign({}, c || {}, {
          status: action === "confirm" ? "confirmed" : "disputed",
          at: new Date(now).toISOString(),
          by: "student",
        });
        if (action === "dispute") conf.reason = reason;
        lessons[i] = Object.assign({}, l, {confirmation: conf});
        tx.update(resRef, {lessons});
      });

      if (action === "dispute") {
        // Karar kaydedildi; bildirim hatası öğrencinin işlemini bozmasın.
        const label = trLabel(date, time);
        const name = who || request.auth.token.email || "Öğrenci";
        try {
          const adminNum = process.env.WA_ADMIN_NUMBER || "905523070067";
          const wa = await sendWhatsApp(adminNum,
              `⚠ Ders itirazı — ${name}\n${label}\nSebep: ${reason}\nberkayeracademy.com/booking`);
          if (!wa.ok) console.error("dispute admin WhatsApp failed", wa.error);
        } catch (e) {
          console.error("dispute admin WhatsApp error", e.message || e);
        }
        try {
          await transporter.sendMail({
            from: `"Berkay Er Academy" <berkayer032@gmail.com>`,
            to: "berkayer032@gmail.com",
            subject: `Ders itirazı — ${name.replace(/[\r\n]/g, " ").slice(0, 100)}`,
            text: `${name} şu ders için itiraz etti: ${label}\n\nSebep:\n${reason}\n\nAdmin panelinde dersin Zoom katılım kaydını görüp itirazı "Çözüldü" olarak işaretleyebilirsin.\nhttps://berkayeracademy.com/booking`,
          });
        } catch (e) {
          console.error("dispute admin email error", e.message || e);
        }
      }
      return {ok: true, status: action === "confirm" ? "confirmed" : "disputed"};
    },
);
