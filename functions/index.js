const {setGlobalOptions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
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
    pass: "kqnvjwnxvddvcpx",
  },
});

// Runs every day at 09:00 Istanbul time
exports.paymentReminder = onSchedule(
    {schedule: "0 6 * * *", timeZone: "Europe/Istanbul"},
    async () => {
      const db = getFirestore();

      const now = new Date();
      const target = new Date(now);
      target.setDate(target.getDate() + 3);
      const targetDate = target.toISOString().split("T")[0]; // YYYY-MM-DD

      const snapshot = await db.collection("reservations").get();

      const promises = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Only send to students with pending payment
        if (!data.payment_pending) return;

        const email = data.from_email;
        const name = data.from_name || "Öğrenci";
        if (!email) return;

        const lessons = data.lessons || [];
        const hasLessonOnTarget = lessons.some(
            (l) =>
              l.date === targetDate &&
          (l.status === "scheduled" || l.status === "rescheduled"),
        );

        if (!hasLessonOnTarget) return;

        const mailOptions = {
          from: `"Ders Sistemi" <berkayer032@gmail.com>`,
          to: email,
          subject: "Ders ödemesi hatırlatması",
          html:
            "<p>Merhaba " + name + ",</p>" +
            "<p><strong>3 gün sonra (" + targetDate + ")</strong>" +
            " dersiniz var, ödemeniz henüz alınmadı.</p>" +
            "<p>Lütfen en kısa sürede ödemenizi yapınız.</p>" +
            "<p>İyi dersler!</p>",
        };

        promises.push(
            transporter.sendMail(mailOptions).then(() => {
              return db.collection("reservations").doc(doc.id).update({
                last_reminder_sent: FieldValue.serverTimestamp(),
              });
            }),
        );
        console.log(`Reminder sent to ${email} for lesson on ${targetDate}`);
      });

      await Promise.all(promises);
      const count = promises.length;
      console.log(`Payment reminders done. Processed ${count} emails.`);
    },
);
