/**
 * Ders kanıtı: Zoom katılım kaydı + ders onay penceresi için saf yardımcılar.
 * Ağ çağrıları yalnız zoomReportClient() içinde (fetch dışarıdan verilir), geri kalanı saf —
 * Node'da fixture JSON ile test edilebilir.
 *
 * Gerekli Zoom kapsamları (Server-to-Server OAuth uygulaması, Marketplace → Scopes):
 *   Granular (yeni uygulamalar):
 *     report:read:user:admin                      GET /report/users/{userId}/meetings
 *     report:read:list_meeting_participants:admin GET /report/meetings/{meetingUUID}/participants
 *   Klasik (eski uygulamalar): report:read:admin   (ikisini birden kapsar)
 * Reports API Zoom'da ücretli hesap ister (Pro veya üstü); ücretsiz hesapta Zoom 200 koduyla
 * reddeder. Kapsam eksikse 4711 döner. İkisi de "unavailable" olarak kaydedilir; kapsam
 * eklenince kod değişmeden çalışmaya başlar.
 */

const LESSON_MS = 60 * 60 * 1000; // dersler 60 dakika
const CONFIRM_WINDOW_MS = 48 * 60 * 60 * 1000; // itiraz penceresi
const ATTENDANCE_LOOKBACK_MS = 6 * 60 * 60 * 1000; // Zoom kaydı bu süre boyunca yeniden denenir
const ATTENDANCE_MIN_AGE_MS = 10 * 60 * 1000; // ders bittikten 10 dk sonra ilk deneme
const MATCH_PAD_MS = 30 * 60 * 1000; // toplantı / oturum eşleştirmede ders penceresi payı

// Onay ve kanıt yalnız yapılmış (ya da yapılması gereken) derslere uygulanır.
const PROOF_STATUSES = ["scheduled", "rescheduled", "completed"];

const DEDUP_PRIORITY = {scheduled: 4, rescheduled: 4, frozen: 3, cancel_requested: 3, completed: 2, cancelled: 1};

// Ders başlangıcı İstanbul saatiyle (UTC+3, yaz saati yok).
function lessonStartMs(date, time) {
  return new Date(`${date}T${time}:00+03:00`).getTime();
}
function lessonEndMs(date, time) {
  return lessonStartMs(date, time) + LESSON_MS;
}

// dedupLessons ile aynı seçim: aynı tarih+saatteki satırlardan en yüksek öncelikli İLK satır.
function findLessonIdx(lessons, date, time) {
  if (!Array.isArray(lessons)) return -1;
  let best = -1;
  let bestP = -1;
  for (let i = 0; i < lessons.length; i++) {
    const l = lessons[i];
    if (!l || l.date !== date || l.time !== time) continue;
    const p = DEDUP_PRIORITY[l.status] || 0;
    if (p > bestP) {
      best = i;
      bestP = p;
    }
  }
  return best;
}

function isoOf(ms) {
  return new Date(ms).toISOString();
}

function toMs(v) {
  if (!v) return NaN;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : NaN;
}

// ── Zoom yanıtlarını yorumlama ──
// Zoom hata gövdesi: {code, message}. HTTP 4xx ile birlikte gelir.
function classifyZoomError(status, body) {
  const code = body && typeof body.code === "number" ? body.code : null;
  if (code === 4711 || code === 4700 || code === 4702) return "missing_scope";
  if (code === 200) return "plan_or_permission";
  if (code === 124 || status === 401) return "auth_failed";
  if (status === 429 || code === 429) return "rate_limited";
  if (code === 3001) return "meeting_not_found";
  if (code === 1001) return "host_not_found";
  return code ? `zoom_${code}` : `http_${status || 0}`;
}

// UUID "/" ile başlıyor ya da "//" içeriyorsa çift kodlanır (Zoom kuralı).
function encodeMeetingUuid(uuid) {
  const s = String(uuid || "");
  if (s.charAt(0) === "/" || s.indexOf("//") >= 0) return encodeURIComponent(encodeURIComponent(s));
  return encodeURIComponent(s);
}

function meetingRange(m) {
  const start = toMs(m && m.start_time);
  let end = toMs(m && m.end_time);
  if (!Number.isFinite(end) && Number.isFinite(start) && m && typeof m.duration === "number") {
    end = start + m.duration * 60000;
  }
  return {start, end};
}

function overlapMs(a0, a1, b0, b1) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

// Dersle en çok örtüşen toplantı oturumu (ders penceresi ±30 dk). Yoksa null.
function pickMeetingInstance(meetings, startMs, endMs) {
  let best = null;
  let bestScore = 0;
  let bestDist = Infinity;
  (meetings || []).forEach((m) => {
    const r = meetingRange(m);
    if (!Number.isFinite(r.start) || !Number.isFinite(r.end) || r.end <= r.start) return;
    if (overlapMs(r.start, r.end, startMs - MATCH_PAD_MS, endMs + MATCH_PAD_MS) <= 0) return;
    const score = overlapMs(r.start, r.end, startMs, endMs);
    const dist = Math.abs(r.start - startMs);
    if (score > bestScore || (score === bestScore && dist < bestDist)) {
      best = m;
      bestScore = score;
      bestDist = dist;
    }
  });
  return best;
}

// ── İsim eşleştirme ──
// Türkçe harfleri ve aksanları katlar: "Şükrü İLKER" → ["sukru", "ilker"]
function nameTokens(s) {
  return String(s || "")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter((t) => t.length >= 2);
}

function bigrams(s) {
  const out = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

function dice(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.length || !B.length) return 0;
  const counts = {};
  A.forEach((g) => {
    counts[g] = (counts[g] || 0) + 1;
  });
  let hit = 0;
  B.forEach((g) => {
    if (counts[g] > 0) {
      hit++;
      counts[g]--;
    }
  });
  return (2 * hit) / (A.length + B.length);
}

// "name_exact" | "name_partial" | "name_fuzzy" | null
function nameMatchKind(studentName, zoomName) {
  const a = nameTokens(studentName);
  const b = nameTokens(zoomName);
  if (!a.length || !b.length) return null;
  const sa = a.slice().sort().join(" ");
  const sb = b.slice().sort().join(" ");
  if (sa === sb) return "name_exact";
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (short.every((t) => long.indexOf(t) >= 0) && short.some((t) => t.length >= 3)) return "name_partial";
  if (dice(a.join(""), b.join("")) >= 0.8) return "name_fuzzy";
  return null;
}

function lc(s) {
  return String(s || "").trim().toLowerCase();
}

function isHostEntry(p, meeting, hostEmails) {
  if (!p) return false;
  const hostId = meeting && meeting.host_id;
  if (hostId && (p.id === hostId || p.user_id === hostId)) return true;
  const email = lc(p.user_email);
  if (!email) return false;
  const hosts = (hostEmails || []).map(lc).filter(Boolean);
  if (meeting && meeting.user_email) hosts.push(lc(meeting.user_email));
  if (meeting && meeting.host_email) hosts.push(lc(meeting.host_email));
  return hosts.indexOf(email) >= 0;
}

// Aynı kişinin oturumları (yeniden bağlanma) tek kimlikte toplanır: e-posta > katılımcı id > isim.
function identityKey(p) {
  if (lc(p.user_email)) return "e:" + lc(p.user_email);
  if (p.participant_user_id) return "u:" + p.participant_user_id;
  if (p.id) return "i:" + p.id;
  return "n:" + nameTokens(p.name).join(" ");
}

// Örtüşen aralıkların birleşiminin toplam süresi (ms).
function unionMs(intervals) {
  const xs = intervals
      .filter((x) => Number.isFinite(x[0]) && Number.isFinite(x[1]) && x[1] > x[0])
      .sort((x, y) => x[0] - y[0]);
  let total = 0;
  let cur = null;
  xs.forEach((x) => {
    if (!cur || x[0] > cur[1]) {
      if (cur) total += cur[1] - cur[0];
      cur = [x[0], x[1]];
    } else if (x[1] > cur[1]) {
      cur[1] = x[1];
    }
  });
  if (cur) total += cur[1] - cur[0];
  return total;
}

function sessionRange(p) {
  const j = toMs(p.join_time);
  let l = toMs(p.leave_time);
  if (!Number.isFinite(l) && Number.isFinite(j) && typeof p.duration === "number") l = j + p.duration * 1000;
  return [j, l];
}

/**
 * Öğrenciyi katılımcı listesinde bulur.
 * student: {email, name}. Sıra: e-posta → isim (tam / kısmi / benzer) → tek katılımcı.
 * Dönüş: {entries, matched_by} ya da {entries: [], matched_by: null}
 */
function matchStudent(participants, meeting, student, hostEmails, win) {
  const pad = MATCH_PAD_MS;
  const inWindow = (p) => {
    if (!win) return true;
    const r = sessionRange(p);
    if (!Number.isFinite(r[0])) return true;
    const end = Number.isFinite(r[1]) ? r[1] : r[0];
    return overlapMs(r[0], Math.max(end, r[0] + 1), win.startMs - pad, win.endMs + pad) > 0;
  };
  const guests = (participants || []).filter((p) => p && !isHostEntry(p, meeting, hostEmails) && inWindow(p));
  const email = lc(student && student.email);
  if (email) {
    const byEmail = guests.filter((p) => lc(p.user_email) === email);
    if (byEmail.length) return {entries: expand(guests, byEmail), matched_by: "email"};
  }
  const rank = {name_exact: 3, name_partial: 2, name_fuzzy: 1};
  let bestKind = null;
  guests.forEach((p) => {
    const k = nameMatchKind(student && student.name, p.name);
    if (k && (!bestKind || rank[k] > rank[bestKind])) bestKind = k;
  });
  if (bestKind) {
    const hits = guests.filter((p) => nameMatchKind(student && student.name, p.name) === bestKind);
    return {entries: expand(guests, hits), matched_by: bestKind};
  }
  const ids = {};
  guests.forEach((p) => {
    ids[identityKey(p)] = true;
  });
  if (Object.keys(ids).length === 1) return {entries: guests, matched_by: "sole_participant"};
  return {entries: [], matched_by: null};
}

// Eşleşen girişlerle aynı kimliği taşıyan diğer oturumları da ekler.
function expand(all, hits) {
  const keys = {};
  hits.forEach((p) => {
    keys[identityKey(p)] = true;
  });
  return all.filter((p) => keys[identityKey(p)]);
}

/**
 * Toplantı + katılımcılar → lessons[i].attendance (fetched_at hariç).
 * status: "ok" | "absent". (Zoom'a ulaşılamazsa çağıran "unavailable" yazar.)
 */
function summarizeAttendance(meeting, participants, student, win, hostEmails) {
  if (!meeting) {
    return {source: "zoom", status: "absent", reason: "no_meeting", student_join: null, student_leave: null,
      student_minutes: 0, host_minutes: 0, matched_by: null};
  }
  const hostEntries = (participants || []).filter((p) => isHostEntry(p, meeting, hostEmails));
  let hostMs = unionMs(hostEntries.map(sessionRange));
  if (!hostMs) {
    const r = meetingRange(meeting);
    if (Number.isFinite(r.start) && Number.isFinite(r.end)) hostMs = Math.max(0, r.end - r.start);
  }
  const m = matchStudent(participants, meeting, student, hostEmails, win);
  if (!m.entries.length) {
    return {source: "zoom", status: "absent", reason: "student_not_found", student_join: null, student_leave: null,
      student_minutes: 0, host_minutes: Math.round(hostMs / 60000), matched_by: null};
  }
  const ranges = m.entries.map(sessionRange);
  const joins = ranges.map((r) => r[0]).filter(Number.isFinite);
  const leaves = ranges.map((r) => r[1]).filter(Number.isFinite);
  return {
    source: "zoom",
    status: "ok",
    student_join: joins.length ? isoOf(Math.min.apply(null, joins)) : null,
    student_leave: leaves.length ? isoOf(Math.max.apply(null, leaves)) : null,
    student_minutes: Math.round(unionMs(ranges) / 60000),
    host_minutes: Math.round(hostMs / 60000),
    matched_by: m.matched_by,
  };
}

// Kanıt belgesi için sade katılımcı listesi (ham Zoom alanlarının alt kümesi).
function evidenceParticipants(participants, meeting, hostEmails) {
  return (participants || []).slice(0, 200).map((p) => ({
    name: String(p.name || "").slice(0, 120),
    user_email: String(p.user_email || "").slice(0, 160),
    join_time: p.join_time || null,
    leave_time: p.leave_time || null,
    duration: typeof p.duration === "number" ? p.duration : null,
    is_host: isHostEntry(p, meeting, hostEmails),
  }));
}

// Rapor sorgusu için UTC tarih aralığı (ders günü ±1 gün; Zoom en fazla 1 ay ister).
function reportDateRange(startMs, endMs) {
  const from = new Date(startMs - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const to = new Date(endMs + 24 * 3600 * 1000).toISOString().slice(0, 10);
  return {from, to};
}

// ── Zoom istemcisi (fetch enjekte edilir; testte sahte fetch) ──
function zoomReportClient(opts) {
  const fetchImpl = opts.fetch;
  const base = opts.apiBase || "https://api.zoom.us/v2";
  let token = null;

  async function getToken() {
    if (token) return {ok: true};
    if (!opts.accountId || !opts.clientId || !opts.clientSecret) return {ok: false, reason: "no_credentials"};
    const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString("base64");
    try {
      const res = await fetchImpl(
          `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(opts.accountId)}`,
          {method: "POST", headers: {"Authorization": `Basic ${basic}`}},
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) return {ok: false, reason: "token_failed"};
      token = data.access_token;
      return {ok: true};
    } catch (e) {
      return {ok: false, reason: "token_network"};
    }
  }

  async function get(path) {
    try {
      const res = await fetchImpl(base + path, {headers: {"Authorization": `Bearer ${token}`}});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return {ok: false, reason: classifyZoomError(res.status, data)};
      return {ok: true, data};
    } catch (e) {
      return {ok: false, reason: "network"};
    }
  }

  async function paged(pathBase, key, maxPages) {
    let out = [];
    let next = "";
    for (let i = 0; i < maxPages; i++) {
      const r = await get(pathBase + (next ? `&next_page_token=${encodeURIComponent(next)}` : ""));
      if (!r.ok) return r;
      out = out.concat(Array.isArray(r.data[key]) ? r.data[key] : []);
      next = r.data.next_page_token || "";
      if (!next) break;
    }
    return {ok: true, data: out};
  }

  return {
    async listMeetings(from, to) {
      const t = await getToken();
      if (!t.ok) return t;
      const user = encodeURIComponent(opts.hostUser || "me");
      return paged(`/report/users/${user}/meetings?type=past&page_size=300&from=${from}&to=${to}`, "meetings", 5);
    },
    async listParticipants(uuid) {
      const t = await getToken();
      if (!t.ok) return t;
      return paged(`/report/meetings/${encodeMeetingUuid(uuid)}/participants?page_size=300`, "participants", 5);
    },
  };
}

module.exports = {
  LESSON_MS,
  CONFIRM_WINDOW_MS,
  ATTENDANCE_LOOKBACK_MS,
  ATTENDANCE_MIN_AGE_MS,
  PROOF_STATUSES,
  lessonStartMs,
  lessonEndMs,
  findLessonIdx,
  classifyZoomError,
  encodeMeetingUuid,
  pickMeetingInstance,
  nameTokens,
  nameMatchKind,
  matchStudent,
  unionMs,
  summarizeAttendance,
  evidenceParticipants,
  reportDateRange,
  zoomReportClient,
};
