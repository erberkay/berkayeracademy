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
  const params = new URLSearchParams({From: from, To: to, Body: body});

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

module.exports = {sendWhatsApp, toWaNumber};
