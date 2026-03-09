const {setGlobalOptions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

setGlobalOptions({maxInstances: 10, region: "europe-west1"});

initializeApp();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "berkayer032@gmail.com",
    pass: "gkkpghxlnpjscxzm",
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

Ödeme yaptıktan sonra ders panelinizden bildirim göndermeyi unutmayın.
Ders Paneliniz: https://berkayeracademy.com/booking.html

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

// Runs every day at 09:00 Istanbul time
exports.paymentReminder = onSchedule(
    {schedule: "0 6 * * *", timeZone: "Europe/Istanbul"},
    async () => {
      const db = getFirestore();
      const snapshot = await db.collection("reservations").get();
      const students = collectUnpaidStudents(snapshot);
      const promises = students.map(({doc, email, name, nextLesson}) => {
        const nextDateFormatted = new Date(nextLesson.date + "T12:00:00")
            .toLocaleDateString("tr-TR", {day: "numeric", month: "long", year: "numeric"});
        const mail = buildReminderMailOptions(name, email, nextLesson, nextDateFormatted);
        return transporter.sendMail(mail).then(() => {
          console.log(`Reminder sent to ${email} (${name})`);
          return db.collection("reservations").doc(doc.id).update({
            last_reminder_sent: FieldValue.serverTimestamp(),
          });
        });
      });
      await Promise.all(promises);
      console.log(`Payment reminders done. Sent ${promises.length} emails.`);
    },
);

// ── Helper: branded template for custom admin messages ──
function buildCustomMailOptions(toName, toEmail, subject, message) {
  const safeMessage = message.replace(/\n/g, "<br>");
  return {
    from: `"Berkay Er Academy" <berkayer032@gmail.com>`,
    replyTo: "berkayer032@gmail.com",
    to: toEmail,
    subject: subject,
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
          <p style="margin:0 0 20px;font-size:15px;color:#222;">Merhaba <strong>${toName}</strong>,</p>
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
