/**
 * Twilio WhatsApp wrapper — no npm dependency, uses native fetch.
 * Auth via HTTP Basic (AccountSID:AuthToken).
 *
 * Env vars required:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WA_FROM   (e.g. "whatsapp:+14155238886" for sandbox)
 */

/**
 * Normalize a TR phone number into Twilio's whatsapp:+E.164 format.
 * Accepts "05XX...", "5XX...", "+90...", "905..." — returns "whatsapp:+90...".
 * Returns null if input can't be parsed.
 */
function toWaNumber(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/[^\d+]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("00")) s = s.slice(2);
  if (s.startsWith("0")) s = "90" + s.slice(1);
  if (/^5\d{9}$/.test(s)) s = "90" + s;
  if (!/^90\d{10}$/.test(s)) return null;
  return "whatsapp:+" + s;
}

/**
 * Send a free-form WhatsApp message via Twilio.
 * In sandbox the recipient must have joined first.
 *
 * @param {string} toPhone — raw phone (will be normalized)
 * @param {string} body    — message text (up to ~1600 chars)
 * @return {Promise<{ok:boolean, sid?:string, status?:string, error?:string}>}
 */
async function sendWhatsApp(toPhone, body) {
  return sendCore(toPhone, {Body: body});
}

/**
 * Send a Twilio content-template message. Works outside the 24h window
 * once the template is approved by Meta.
 *
 * @param {string} toPhone — raw phone (will be normalized)
 * @param {string} contentSid — HXxxxxxxxx from Content Template Builder
 * @param {object} variables — { "1": "Ahmet", "2": "14:00", ... }
 */
async function sendWhatsAppTemplate(toPhone, contentSid, variables = {}) {
  const params = {ContentSid: contentSid};
  if (variables && Object.keys(variables).length > 0) {
    params.ContentVariables = JSON.stringify(variables);
  }
  return sendCore(toPhone, params);
}

async function sendCore(toPhone, extraParams) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WA_FROM;

  if (!sid || !token || !from) {
    return {ok: false, error: "Twilio env vars missing"};
  }
  const to = toWaNumber(toPhone);
  if (!to) {
    return {ok: false, error: "invalid_phone: " + toPhone};
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({From: from, To: to, ...extraParams});

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.message || `HTTP ${res.status}`,
        code: data.code,
      };
    }
    return {ok: true, sid: data.sid, status: data.status};
  } catch (e) {
    return {ok: false, error: e.message || "network error"};
  }
}

// Content Template SIDs from Content Template Builder
const TEMPLATES = {
  lesson_reminder_24h: "HX18dd68325569c9cb07e92713c4b3c900",
  lesson_reminder_1h: "HX3a4c76a7ce11285ea155152409ab45cc",
  payment_reminder: "HX84bdb474422c1f8d6c78719ff0124294",
  request_status: "HXe7f08f14c970665e5c19a92042ddd4f2",
  // Paket sonu mesajı — öğrencinin paketindeki son ders bittikten sonra
  // lessonEndFollowUp cron'u tarafından kullanılır. Variable: {{1}} = öğrenci adı.
  package_completed: "HX9e04ca80fe8860a5b897b1a9b4946d9d",
};

module.exports = {sendWhatsApp, sendWhatsAppTemplate, toWaNumber, TEMPLATES};
