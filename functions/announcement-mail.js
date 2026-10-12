// Etkinlik duyurusu e-postası (siteye kayıtlı herkese): şablon, alıcı listesi ve toplu gönderim
// yardımcıları. Firebase'e bağımlı değildir (yalnız saf fonksiyonlar) — Node'da doğrudan
// çalıştırılıp önizlenebilir. Gönderim ve kayıt mantığı index.js → sendAnnouncementEmail'dedir.
//
// Metni ya da konuyu değiştirmek için bu dosyayı düzenle: SUBJECT ve buildAnnouncementMail().
// Hero görseli e-postanın İÇİNE gömülür (inline ek, cid:) — sitede ya da herhangi bir adreste barınmaz,
// görseller kapalı istemcilerde de görünür. Dosya: functions/assets/etkinlik-duyuru-hero.jpg
// (.gitignore'da; yoksa e-posta görselsiz, yalnız yazıyla gider). Düz bir URL için {heroSrc} verilebilir.

const fs = require("fs");
const path = require("path");

const SITE = "https://berkayeracademy.com";
const ADMIN_MAIL = "berkayer032@gmail.com";
const INSTAGRAM = "https://www.instagram.com/erberkay/";
const SUBJECT = "Çok yakında: GigBridge lansmanı ve 2 gece 3 gün masterclass 🎧";
// Aynı duyuru iki kez gitmesin diye gönderim kaydı bu kimlikle tutulur (mail_campaigns/{id})
const CAMPAIGN_ID = "etkinlik-duyuru-1";

const PREHEADER = "Ultra her şey dahil otel · GigBridge lansman partisi · 2 gece 3 gün masterclass — detaylar çok yakında.";
const HERO_ALT = "Çok yakında — klasik bir eğitimden biraz daha fazlası.";
const HERO_CID = "duyuru-hero@berkayeracademy.com";
const HERO_FILE = path.join(__dirname, "assets", "etkinlik-duyuru-hero.jpg");
let heroBuf; // undefined = henüz okunmadı, null = dosya yok
function loadHero() {
  if (heroBuf === undefined) {
    try {
      heroBuf = fs.readFileSync(HERO_FILE);
    } catch (e) {
      heroBuf = null;
    }
  }
  return heroBuf;
}

const FEATURES = [
  ["🏨", "Ultra Her Şey Dahil Otel"],
  ["🎧", "GigBridge Lansman Partisi"],
  ["🎓", "2 gece 3 gün Masterclass & Eğitim"],
  ["🤝", "Networking, müzik ve birlikte üretim"],
];

function escHtml(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[c]);
}

// "ayşe yılmaz" → "Ayşe"; e-posta öneki gibi görünen (rakam / @) adlar kullanılmaz → "Merhaba,"
function firstName(raw) {
  const tok = String(raw == null ? "" : raw).trim().split(/\s+/)[0] || "";
  if (!tok || tok.length > 30 || /[\d@_.<>&"]/.test(tok)) return "";
  const same = tok === tok.toLocaleLowerCase("tr-TR") || tok === tok.toLocaleUpperCase("tr-TR");
  const t = same ? tok.toLocaleLowerCase("tr-TR") : tok;
  return t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);
}

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;

// users + reservations → tekil, küçük harfli alıcı listesi. Yönetici (test ayrı gider) ve
// emailOptOut === true olanlar çıkarılır; ad users.displayName'den, yoksa rezervasyondan alınır.
function collectRecipients(users, reservations, adminEmail) {
  const admin = String(adminEmail || ADMIN_MAIL).toLowerCase();
  const norm = (e) => String(e == null ? "" : e).trim().toLowerCase();
  const optOut = new Set();
  (users || []).forEach((u) => {
    const d = u.data || {};
    if (d.emailOptOut === true && norm(d.email)) optOut.add(norm(d.email));
  });
  const byMail = new Map();
  const add = (email, name) => {
    const e = norm(email);
    if (!EMAIL_RE.test(e) || e === admin || optOut.has(e)) return;
    const cur = byMail.get(e);
    if (!cur) byMail.set(e, {email: e, name: firstName(name)});
    else if (!cur.name) cur.name = firstName(name);
  };
  (users || []).forEach((u) => add((u.data || {}).email, (u.data || {}).displayName));
  (reservations || []).forEach((r) => add((r.data || {}).student_email, (r.data || {}).student_name));
  return Array.from(byMail.values());
}

// items'ı en fazla `concurrency` eşzamanlı olarak sendFn'e verir; hata gönderimi durdurmaz.
async function sendInBatches(items, sendFn, concurrency) {
  const ok = [];
  const failed = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        await sendFn(item);
        ok.push(item);
      } catch (e) {
        failed.push({item, error: String((e && e.message) || e).slice(0, 140)});
      }
    }
  };
  const n = Math.max(1, Math.min(concurrency || 4, items.length));
  await Promise.all(Array.from({length: n}, worker));
  return {ok, failed};
}

function buildAnnouncementMail(opts) {
  const o = opts || {};
  const name = firstName(o.name);
  const hello = name ? `Merhaba ${escHtml(name)},` : "Merhaba,";
  const helloText = name ? `Merhaba ${name},` : "Merhaba,";
  // hero: açık URL (heroSrc) > gömülü dosya (cid:) > yok (noHero ya da dosya eksik)
  const buf = o.heroSrc || o.noHero ? null : loadHero();
  const hero = o.heroSrc || (buf ? `cid:${HERO_CID}` : "");
  const subject = (o.test ? "[TEST] " : "") + SUBJECT;
  const sans = "'Helvetica Neue',Helvetica,Arial,sans-serif";
  const serif = "'Instrument Serif',Georgia,'Times New Roman',serif";

  const rows = FEATURES.map(([icon, label]) => `
          <tr><td style="padding:5px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#111116" style="background:#111116;border:1px solid #25252c;border-radius:12px;">
              <tr>
                <td width="64" align="center" valign="middle" style="padding:15px 0 15px 14px;font-size:26px;line-height:1;">${icon}</td>
                <td valign="middle" style="padding:15px 18px 15px 8px;font-family:${sans};font-size:17px;font-weight:700;line-height:1.35;color:#f3efe6;">${escHtml(label)}</td>
              </tr>
            </table>
          </td></tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${escHtml(subject)}</title>
<style>
  :root { color-scheme: dark light; supported-color-schemes: dark light; }
  a { color:#e8b84b; }
  @media (max-width:620px) {
    .px { padding-left:22px !important; padding-right:22px !important; }
    .h1 { font-size:29px !important; line-height:1.14 !important; }
    .h2 { font-size:24px !important; }
    .lead { font-size:16px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#060609;" bgcolor="#060609">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${escHtml(PREHEADER)}${"&zwnj;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#060609" style="background:#060609;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#0b0b0e" style="width:100%;max-width:600px;background:#0b0b0e;border:1px solid #1c1c22;border-radius:14px;overflow:hidden;">

    <tr><td class="px" style="padding:20px 32px 16px;border-bottom:1px solid #1c1c22;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${sans};font-size:13px;font-weight:700;letter-spacing:3px;color:#e8b84b;">BERKAY ER ACADEMY</td>
        <td align="right" style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:2px;color:#8f897f;">DUYURU</td>
      </tr></table>
    </td></tr>

${hero ? `    <tr><td style="padding:0;line-height:0;font-size:0;">
      <a href="${SITE}" style="text-decoration:none;"><img src="${escHtml(hero)}" width="600" alt="${escHtml(HERO_ALT)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;background:#0b0b0e;color:#e8b84b;font-family:${sans};font-size:14px;line-height:1.5;"></a>
    </td></tr>
` : ""}
    <tr><td class="px" style="padding:${hero ? "32px" : "36px"} 32px 6px;font-family:${sans};">
${hero ? "" : `      <div style="font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;letter-spacing:4px;color:#e8b84b;margin:0 0 22px;">ÇOK YAKINDA</div>
`}      <div style="font-size:15px;line-height:1.6;color:#a8a29a;margin:0 0 10px;">${hello}</div>
      <div class="h1" style="font-family:${serif};font-size:34px;line-height:1.12;font-weight:400;color:#f3efe6;margin:0 0 14px;">Çok yakında <span style="color:#e8b84b;font-style:italic;">yeni bir etkinlik</span> duyuruyorum.</div>
      <div class="lead" style="font-size:17px;line-height:1.6;color:#d7d1c6;margin:0 0 20px;">Bu kez klasik bir eğitimden biraz daha fazlası olacak.</div>
    </td></tr>

    <tr><td class="px" style="padding:0 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}
      </table>
    </td></tr>

    <tr><td class="px" style="padding:22px 32px 4px;font-family:${sans};font-size:16px;line-height:1.7;color:#d7d1c6;">
      <p style="margin:0 0 14px;">Hem eğitim yapacağımız hem de GigBridge’in lansmanını gerçekleştireceğimiz özel bir organizasyon planlıyorum.</p>
      <p style="margin:0 0 6px;">Etkinlik tarihleri, otel, eğitim içeriği ve tüm detayları çok yakında sosyal medyada paylaşacağım.</p>
    </td></tr>

    <tr><td class="px" style="padding:16px 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#15120a" style="background:#15120a;border:1px solid #4d3f19;border-left:4px solid #e8b84b;border-radius:10px;">
        <tr><td style="padding:18px 20px;font-family:${sans};font-size:15px;line-height:1.7;color:#e6dfd0;">
          Ayrıca duyurunun ardından <strong style="color:#e8b84b;">erken rezervasyon dönemine özel indirim</strong> olacak.<br><br>
          Kontenjan sınırlı tutulacağı için erken rezervasyon avantajlı olacak.
        </td></tr>
      </table>
    </td></tr>

    <tr><td class="px" align="center" style="padding:30px 32px 6px;">
      <div class="h2" style="font-family:${serif};font-size:28px;line-height:1.2;font-weight:400;color:#f3efe6;">Detaylar çok yakında.</div>
      <div class="h2" style="font-family:${serif};font-size:28px;line-height:1.25;font-weight:400;font-style:italic;color:#e8b84b;margin:2px 0 22px;">Hazır olun. 🚀</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
        <td bgcolor="#e8b84b" style="background:#e8b84b;border-radius:999px;">
          <a href="${INSTAGRAM}" style="display:inline-block;padding:14px 30px;font-family:${sans};font-size:14px;font-weight:700;letter-spacing:.5px;color:#17120a;text-decoration:none;">Sosyal medyada takipte kal →</a>
        </td>
      </tr></table>
    </td></tr>

    <tr><td class="px" style="padding:30px 32px 26px;font-family:${sans};">
      <div style="font-family:${serif};font-style:italic;font-size:22px;line-height:1.2;color:#f3efe6;">Berkay Er</div>
      <div style="font-size:12px;letter-spacing:2px;color:#8f897f;margin-top:4px;">BERKAY ER ACADEMY</div>
    </td></tr>

    <tr><td class="px" align="center" style="padding:18px 32px 22px;border-top:1px solid #1c1c22;font-family:${sans};font-size:12px;line-height:1.7;color:#9a948a;">
      Bu duyuruyu Berkay Er Academy üyesi olduğunuz için aldınız · <a href="${SITE}" style="color:#b9b3a8;">berkayeracademy.com</a><br>
      Bu emaili almak istemiyorsanız <a href="mailto:${ADMIN_MAIL}?subject=unsubscribe" style="color:#b9b3a8;">buraya tıklayın</a>.
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    helloText,
    "",
    "Çok yakında yeni bir etkinlik duyuruyorum.",
    "",
    "Bu kez klasik bir eğitimden biraz daha fazlası olacak.",
    "",
    ...FEATURES.map(([icon, label]) => `${icon} ${label}`),
    "",
    "Hem eğitim yapacağımız hem de GigBridge’in lansmanını gerçekleştireceğimiz özel bir organizasyon planlıyorum.",
    "",
    "Etkinlik tarihleri, otel, eğitim içeriği ve tüm detayları çok yakında sosyal medyada paylaşacağım.",
    "",
    "Ayrıca duyurunun ardından erken rezervasyon dönemine özel indirim olacak.",
    "Kontenjan sınırlı tutulacağı için erken rezervasyon avantajlı olacak.",
    "",
    "Detaylar çok yakında.",
    "Hazır olun. 🚀",
    "",
    `Sosyal medyada takipte kal: ${INSTAGRAM}`,
    "",
    "Berkay Er",
    "Berkay Er Academy · berkayeracademy.com",
    "",
    `Bu emaili almak istemiyorsanız bu mesaja "unsubscribe" yazarak yanıtlayın (${ADMIN_MAIL}).`,
  ].join("\n");

  return {
    from: `"Berkay Er Academy" <${ADMIN_MAIL}>`,
    replyTo: ADMIN_MAIL,
    to: o.to,
    subject,
    headers: {"List-Unsubscribe": `<mailto:${ADMIN_MAIL}?subject=unsubscribe>`},
    text,
    html,
    // filename: false → dosya adı yok (nodemailer yoksa "attachment-1.jpeg" üretir); Gmail gelen kutusu
    // listesinde "ek" çipi göstermesin diye. Görsel gövdede satır içi (cid) görünür.
    attachments: buf ? [{
      filename: false,
      content: buf,
      cid: HERO_CID,
      contentType: "image/jpeg",
      contentDisposition: "inline",
    }] : [],
  };
}

module.exports = {
  SUBJECT, CAMPAIGN_ID, FEATURES,
  firstName, collectRecipients, sendInBatches, buildAnnouncementMail,
};
