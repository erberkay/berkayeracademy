const {setGlobalOptions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, HttpsError, onRequest} = require("firebase-functions/v2/https");
const crypto = require("crypto");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const {sendWhatsApp, sendWhatsAppTemplate, TEMPLATES} = require("./whatsapp");


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
          <p style="margin:0 0 16px;font-size:15px;color:#222;">Merhaba <strong>${name}</strong>,</p>
          <div style="background:#f9f6f0;border:1px solid #ddd;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#555;">Ders ödemenizin henüz gerçekleşmediğini fark ettik.</p>
            ${nextLesson ? `<p style="margin:8px 0 0;font-size:13px;color:#666;">Yaklaşan dersiniz: <strong style="color:#333;">${nextDateFormatted} – ${nextLesson.time}</strong></p>` : ""}
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
    const upcoming = (data.lessons || [])
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
        // WhatsApp branch (new)
        if (data.student_phone) {
          const monthIdx = new Date().getMonth();
          const monthName = MONTHS_TR[monthIdx];
          const total = reservationPrice(data).toLocaleString("tr-TR");
          tasks.push(sendWhatsAppTemplate(
              data.student_phone,
              TEMPLATES.payment_reminder,
              {"1": name, "2": monthName, "3": total},
          ).then((r) => {
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

// ─── Lesson reminders ───────────────────────────────────────
// Build student lookup helpers shared by 24h + 1h crons.
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Daily at 09:00 TR → notify students whose lesson is the next day
exports.lessonReminder24h = onSchedule(
    {schedule: "0 6 * * *", timeZone: "Europe/Istanbul"},
    async () => {
      const db = getFirestore();
      const settings = await db.collection("settings").doc("global").get();
      const zoomLink = settings.exists ? (settings.data().zoom_link || "") : "";
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = toDateStr(tomorrow);

      const snap = await db.collection("reservations").get();
      let sent = 0;
      const tasks = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (!d.student_phone) return;
        const lessons = d.lessons || [];
        const match = lessons.find((l) => l.date === tomorrowStr &&
          (l.status === "scheduled" || l.status === "rescheduled"));
        if (!match) return;
        const name = d.student_name || (d.student_email || "").split("@")[0] || "Öğrenci";
        tasks.push(sendWhatsAppTemplate(
            d.student_phone,
            TEMPLATES.lesson_reminder_24h,
            {"1": name, "2": match.time, "3": zoomLink || "https://berkayeracademy.com/booking"},
        ).then((r) => {
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
      const settings = await db.collection("settings").doc("global").get();
      const zoomLink = settings.exists ? (settings.data().zoom_link || "") : "";

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
        const lessons = d.lessons || [];
        const match = lessons.find((l) => l.date === targetDateStr && l.time === targetTime &&
          (l.status === "scheduled" || l.status === "rescheduled"));
        if (!match) return;
        const name = d.student_name || (d.student_email || "").split("@")[0] || "Öğrenci";
        tasks.push(sendWhatsAppTemplate(
            d.student_phone,
            TEMPLATES.lesson_reminder_1h,
            {"1": name, "2": targetTime, "3": zoomLink || "https://berkayeracademy.com/booking"},
        ).then((r) => {
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

// ─── Firestore triggers for status notifications ────────────
const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");

// New lesson request → notify admin via WhatsApp
exports.notifyAdminOnNewRequest = onDocumentCreated(
    {region: "europe-west1", document: "lesson_requests/{reqId}"},
    async (event) => {
      const d = event.data && event.data.data();
      if (!d || d.status !== "pending") return;
      const adminNum = process.env.WA_ADMIN_NUMBER || "905523070067";
      const name = d.from_name || d.from_email || "Öğrenci";
      let detail;
      if (d.lesson_type === "trial") {
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
  return expected === twilioSig;
}

exports.twilioWhatsAppWebhook = onRequest(
    {region: "europe-west1", cors: false},
    async (req, res) => {
      if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
      }
      const token = process.env.TWILIO_AUTH_TOKEN;
      const sig = req.get("X-Twilio-Signature");
      // Twilio reconstructs the URL from headers + path. Functions v2 sees the
      // public URL via headers; trust forwarded headers under our region.
      const proto = req.get("x-forwarded-proto") || "https";
      const host = req.get("x-forwarded-host") || req.get("host");
      const url = `${proto}://${host}${req.originalUrl}`;
      if (token && sig && !validateTwilioSig(url, req.body, sig, token)) {
        console.warn("Twilio signature mismatch — rejecting", {url});
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
        const q = await db.collection("reservations").where("student_phone", "==", phone).limit(1).get();
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

// Admin-only callable: send WhatsApp + persist to whatsapp_conversations
exports.sendWhatsAppAdmin = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
        throw new HttpsError("permission-denied", "Yetkisiz erişim");
      }
      const {toPhone, body} = request.data || {};
      if (!toPhone || !body) throw new HttpsError("invalid-argument", "toPhone ve body gerekli");
      const result = await sendWhatsApp(toPhone, body);
      if (!result.ok) {
        throw new HttpsError("internal", result.error || "send failed");
      }

      // Normalize phone for conversation key (E.164 with leading +)
      let phone = String(toPhone).replace(/[^\d+]/g, "");
      if (phone.startsWith("00")) phone = "+" + phone.slice(2);
      if (!phone.startsWith("+")) {
        if (phone.startsWith("0")) phone = "+90" + phone.slice(1);
        else if (phone.startsWith("90")) phone = "+" + phone;
        else if (phone.startsWith("5")) phone = "+90" + phone;
        else phone = "+" + phone;
      }

      const db = getFirestore();
      const convoRef = db.collection("whatsapp_conversations").doc(phone);
      await convoRef.collection("messages").doc(result.sid || `outbound_${Date.now()}`).set({
        direction: "out",
        from: process.env.TWILIO_WA_FROM,
        to: "whatsapp:" + phone,
        body,
        sid: result.sid,
        status: result.status,
        created_at: FieldValue.serverTimestamp(),
      });

      // Look up student to enrich convo doc
      let studentUid = null;
      let studentName = null;
      try {
        const q = await db.collection("reservations").where("student_phone", "==", phone).limit(1).get();
        if (!q.empty) {
          studentUid = q.docs[0].id;
          studentName = q.docs[0].data().student_name || null;
        }
      } catch (e) {/* ignore */}

      await convoRef.set({
        phone,
        ...(studentUid ? {student_uid: studentUid} : {}),
        ...(studentName ? {student_name: studentName} : {}),
        last_message: body.slice(0, 200),
        last_message_at: FieldValue.serverTimestamp(),
        last_direction: "out",
      }, {merge: true});

      return {ok: true, sid: result.sid, status: result.status};
    },
);

// Admin-only: mark a conversation as read (zero unread count)
exports.markWhatsAppConvoRead = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
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
  const safeName = (toName || "").replace(/[\r\n<>]/g, "").slice(0, 100);
  const safeMessage = message.replace(/\n/g, "<br>");
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
const ADMIN_EMAIL = "berkayer032@gmail.com";
exports.sendPaymentRemindersManual = onCall(
    {region: "europe-west1"},
    async (request) => {
      if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
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
      if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
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
      if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
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

      // 3. Save to Firestore
      const db = getFirestore();
      await db.collection("settings").doc("global").set(
          {zoom_link: meetingData.join_url},
          {merge: true},
      );

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
          <p style="margin:0 0 8px;font-size:15px;color:#222;">Merhaba <strong>${name}</strong>,</p>
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
      if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
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
      if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
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
      if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
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
      if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
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
