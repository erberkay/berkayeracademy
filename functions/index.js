const {setGlobalOptions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
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
        ${m.free ? `<div style="display:inline-block;background:#e8b84b;color:#060609;font-size:9px;font-weight:bold;padding:2px 7px;border-radius:3px;letter-spacing:.5px;margin-bottom:8px;">ÜCRETSİZ</div>` : ""}
        <table cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
          <tr>
            <td style="vertical-align:middle;padding-right:8px;font-size:18px;font-weight:bold;color:${m.free ? "#e8b84b" : "#bbb"};font-family:'Helvetica Neue',Arial,sans-serif;line-height:1;">${m.num}</td>
            <td style="vertical-align:middle;">
              <div style="font-size:12px;font-weight:bold;color:#222;line-height:1.2;">${m.title}</div>
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
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Giriş gerekli");
      }
      const {toEmail, toName} = request.data;
      if (!toEmail) throw new HttpsError("invalid-argument", "toEmail gerekli");
      const mail = buildWelcomeMailOptions(toName || "Öğrenci", toEmail);
      await transporter.sendMail(mail);
      return {ok: true};
    },
);
