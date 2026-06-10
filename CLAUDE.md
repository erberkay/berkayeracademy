# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deploy

After any HTML/CSS/JS change, deploy to Firebase Hosting:
```bash
firebase deploy --only hosting
```

For Cloud Functions changes:
```bash
firebase deploy --only functions
```

For Firestore rules changes:
```bash
firebase deploy --only firestore:rules
```

`git push` only updates GitHub — Firebase Hosting is a separate deploy step. The `releaseLimit: 5` cap in `firebase.json` means very old hosting releases get auto-pruned.

## Cloud Functions Development

```bash
cd functions
npm run lint          # ESLint (runs automatically on deploy)
npm run serve         # Local emulator
npm run logs          # Tail live function logs
```

Functions are Node 24, firebase-functions v2, deployed to `europe-west1`. All callable functions must be invoked from the browser with the region specified:
```js
firebase.app().functions('europe-west1').httpsCallable('functionName')
```

Sensitive credentials are stored in `functions/.env.ableton-tutorial` (gitignored). Access via `process.env.*` — do **not** use Firebase Secret Manager (had newline corruption issues with `echo` piping; if you must use it, pipe with `printf '%s'`).

Env vars in use: `GMAIL_PASS`, `Z_ACCOUNT_ID` / `Z_CLIENT_ID` / `Z_CLIENT_SECRET` (Zoom OAuth), `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WA_FROM`, `WA_ADMIN_NUMBER`.

### Function inventory (`functions/index.js`)

**Scheduled (cron, Europe/Istanbul):**
- `paymentReminder` — daily 06:00, emails students with unpaid lessons
- `lessonReminder24h` — daily 06:00, WhatsApp + email 24h ahead
- `lessonReminder1h` — hourly at :00, WhatsApp 1h ahead
- `lessonEndFollowUp` — hourly at :05, WhatsApp follow-up after the lesson that just ended (uses `TEMPLATES.lesson_completed` if its HX SID is filled in `whatsapp.js`; until then falls back to freeform, which only delivers inside the 24h conversation window)

**Triggered (Firestore docs):**
- `notifyAdminOnNewRequest` — new `lesson_requests/*`
- `notifyStudentOnRequestStatus` — `lesson_requests/*` status change

**Callable (`onCall`):**
- `sendPaymentRemindersManual`, `sendCustomEmail`, `sendWelcomeEmail`, `sendPromoEmailAll`, `sendPromoEmailSingle` — email blasts (admin)
- `createZoomMeeting` — admin only, writes `settings/global.zoom_link`
- `sendWhatsAppMessage`, `sendWhatsAppAdmin` — WhatsApp send (template or freeform)
- `markWhatsAppConvoRead` — clears unread count on admin panel

**HTTP:**
- `twilioWhatsAppWebhook` — Twilio inbound webhook (URL set in Twilio console). Signature validation logs mismatches but does not reject (Cloud Functions v2 URL reconstruction can mismatch).

## Twilio WhatsApp Integration

Number: **+1 405 851 4568** (Twilio-as-ISV registered sender).

Helper: `functions/whatsapp.js` exports `sendWhatsApp`, `sendWhatsAppTemplate`, `toWaNumber`, `TEMPLATES`. Phone normalization assumes Turkish numbers (`+90`); `toWaNumber` rejects anything not matching `90XXXXXXXXXX`.

Content template SIDs (Meta-approved) live in `TEMPLATES`:
- `lesson_reminder_24h`, `lesson_reminder_1h`, `payment_reminder`, `request_status`

Free-form messages only work inside Twilio's 24h conversation window. Outside that window, you must use a `ContentSid` template.

Conversations are persisted to Firestore at `whatsapp_conversations/{phone}` with `messages/` subcollection. The admin chat panel is embedded inside `booking.html`.

## Architecture

**No build step.** All pages are static HTML files served directly by Firebase Hosting. Firebase compat SDK v10.12.2 is loaded via CDN `<script>` tags inside each HTML file.

**Clean URLs:** `firebase.json` has `cleanUrls: true`. Each page has a redirect script in `<head>` to canonicalize `.html` → clean URL. All internal `href` and `location.href` use clean URLs (no `.html`).

**Admin check:** Admin is identified by email `berkayer032@gmail.com`. Client-side pages compare `user.email === ADMIN_EMAIL`. Firestore rules use `request.auth.token.email == "berkayer032@gmail.com"` (server-side JWT, not bypassable).

## Shared assets

Loaded by most pages via `<script src="/assets/js/X.js">` and `<link href="/assets/css/X.css">`:

- `assets/css/style.css` — base styles, brand palette
- `assets/css/themes.css` — light mode via `html.theme-light` class; values flip CSS variables. Persisted in `localStorage['site-theme']`.
- `assets/js/theme-init.js` — applies stored theme **before** body renders to avoid flash.
- `assets/js/i18n.js` — `data-i18n` attribute-based string swapping. Stored in `localStorage['site-lang']` (`tr` | `en`).
- `assets/js/love-nav.js` — shared top + bottom nav rendering.

When changing top-level layout, edit `love-nav.js` once instead of each page.

## Critical: Cross-Script Variable Sharing

`<script type="module">` isolates all declarations from other `<script>` blocks. When variables or functions must be shared across multiple script blocks on the same page, **do not use `type="module"`** — use plain `<script>` and `var` (not `let`/`const`).

Many pages still have `type="module"` on some script blocks. Before adding shared state, verify the target script block is a plain `<script>`. Also: an unescaped apostrophe inside a single-quoted JS string (e.g. `'Wet'i'`) silently breaks the whole module. Prefer template literals for any Turkish UI strings.

## Firestore Collections

| Collection | Notes |
|---|---|
| `forum` | Posts; subcollection `replies` |
| `users` | Profiles; subcollections `beats`, `presets`, `userReplies` |
| `reservations/{uid}` | Per-student lesson schedule (admin-managed) — see "Reservation update rules" below |
| `booked_slots` | Student-booked trial-lesson slots |
| `lesson_requests` | Initial lesson request submissions |
| `lesson_questions/{qId}/answers` | Q&A threads, admin or student replies |
| `settings/global` | Site-wide settings (e.g. `zoom_link`) |
| `notifications/{uid}/items` | Per-user notifications |
| `chats/{chatId}/messages` | DM threads (chatId = sorted uid pair). Collab requests use `type: 'collab_request'` with status update flow. |
| `whatsapp_conversations/{phone}/messages` | Twilio inbound + outbound persisted (admin-only read/write) |
| `access_codes` | Booking panel access codes |
| `booking_access_requests/{uid}` | Trial-lesson request queue |
| `announcements` | Site-wide announcements (admin write, auth read) |
| `testimonials` | Student testimonials (public read, auth create) |
| `app_bridge` | UUID-keyed cross-app data bridge (publicly readable) |
| `userSettings/{uid}` | Per-user preferences |
| `follows` | Profile follow edges |

### Reservation update rules

`reservations/{uid}` is mostly admin-write. Students can `update` only a narrow set of fields (`firestore.rules:136-149`):
- `note` (anytime)
- `payment_pending` (set to `true` only)
- `rules_accepted_at` (write-once: must not already exist)

Lesson rows themselves are **always admin-only**. If the client tries to modify any other field, the rule will reject the write.

Because of this, the student "↺ Ertele" button does **not** write lessons directly — it creates a `lesson_requests` doc with `type: 'reschedule_request'` (fields: `lesson_date`, `lesson_time`, `new_date`, `from_*`). Admin approves it in "Gelen Talepler", which runs `adminRescheduleLesson` (cascade + credit consumption) and sets the request `accepted` — the existing `notifyStudentOnRequestStatus` trigger then WhatsApps the student.

## Booking domain model (high level)

- **Pricing:** monthly per-lesson **2500 TL**, single one-off **3000 TL**.
- **Reschedule credits:** package-based pool — an N-month package grants N credits total (1-month = 1 credit even if lessons spill into the next calendar month). Stored as `reservations.reschedule_credits {'YYYY-MM': n}`; available = sum of values (`totalRescheduleCredits()`), consumption via `consumeRescheduleCredit()` decrements the lesson's month key if positive, else the earliest positive key. Buying an extra credit costs **500 TL** via the in-panel modal (admin adds +1 to a month key).
- **Rules acceptance:** modal shown once after first lesson purchase; writes `rules_accepted_at` (write-once). Re-shown only if the field is missing.
- **Closed slots:** admin can mark whole days or single hours red; those appear blocked but visible in the trial-lesson day grid.

These flows live almost entirely inside `booking.html` (~5300 lines) — single source of truth for the panel UX.

## Auth Patterns

- Google Sign-In via `signInWithPopup` (redirect not used — cross-origin cookie issue).
- `displayName` may be empty for email/password users — always fall back:
  ```js
  user.displayName?.trim() || user.email?.split('@')[0] || ''
  ```

## Page → Route Map

| File | Route | Notes |
|---|---|---|
| index.html | / | Landing + community feed |
| egitim.html | /egitim | Course info, SEO-loaded with genre keywords |
| booking.html | /booking | Student lesson panel + admin panel + WhatsApp chat |
| forum.html | /forum | |
| post.html | /post?id= | |
| new-post.html | /new-post | |
| members.html | /members | |
| profile.html | /profile?uid= | |
| ableton-lab.html | /ableton-lab | Interactive lab — multiple Web Audio modules |
| ders-ableton.html | /ders-ableton | Lesson content |
| sss.html | /sss | FAQ |
| app-bridge.html | /app-bridge | UUID-keyed cross-app data bridge UI |

Legacy: `site_1.html` (3300+ lines) is orphan content; `/site_1` and `/site_1.html` both 301-redirect to `/ableton-lab`. Do not link to it.

## Ableton Lab synth pattern (`ableton-lab.html`, ~5100 lines)

`renderModule1()` is the Synthesizer module. State lives in a single module-scope `state` object (`state.osc1`, `state.osc2`, `state.sub`, `state.noise`, `state.adsr`, `state.filter`, `state.filterEnv`, `state.lfo`, `state.fx`, `state.activePreset`).

Preset application must **not** trigger a full re-render. Pattern:
- Each section pushes a refresh closure into `m1Refresh = []` during render.
- `_m1Update()` runs all closures (wrapped in `try/catch`) plus the existing ADSR + filter cutoff/Q sync.
- Preset clicks call `_m1Update()` instead of `navigate(1)` so scroll, oscilloscope continuity, and any open sub-panel state are preserved.

`state.waveform` is kept as a legacy alias for `state.osc1.wave`. Older presets that only set `wave` still load via `applyPreset()` which fills new fields with neutral defaults.
