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

Loaded by most pages via `<script src="/assets/js/X.js">` and `<link href="/assets/css/X.css">`. Order in every `<head>`: Google Fonts → `ui.css` → [`style.css`] → `theme-init.js` → `themes.css` → [`auth-ui.js`] → page `<style>`. Bump the shared `?v=` stamp on all pages in the same commit when a shared asset changes.

- `assets/css/ui.css` — **design system** (every page). Tokens on `html:root`: legacy palette names plus semantic aliases (`--bg --surface --surface-2 --line --fg --fg-2 --fg-3 --accent --accent-ink --ok --warn --err --info --*-soft`), type scale (`--fs-display/h2/h3/body/small/label/micro/input`), control scale (`--ctl-sm/md/lg` = 32/40/48px with matching `--ctl-px-*`/`--fs-ctl-*`), spacing `--s1..--s9`, `--radius:0`, `--nav-w`, `--topbar-h`, z-index tokens. Light palette flips on `html:root.theme-light`. Components: `.btn` (+`-primary/-ghost/-danger/-ok/-sm/-lg/-icon/-block`), `.input/.select/.textarea`, `.field-label`, `.seg/.seg-btn`, `.card`, `.badge`, `.modal*`, `.toast`, `.ava*`, `.icon`. Alias groups map legacy per-page button/input classes onto the same scale — a page must not redeclare geometry (height/padding/font) for an aliased class; override colour/width through a descendant selector instead. Selectors are `html`-prefixed (0,1,1) so they win over page CSS without `!important`. Breakpoints are 600 / 900 / 1024 only. Mobile hit area comes from `.btn::after` at ≤600px; the visible box is identical on mobile and desktop.
- `assets/css/style.css` — landing-page components only (index, egitim, egitmen, sss). App pages do **not** load it.
- `assets/css/themes.css` — nav shell (sidebar ≥1024, top bar + drawer <1024, markup built by `theme-init.js`), the shared auth-bar/notification block, and the remaining light-mode + flattening patches for the Ableton Lab **module internals** (not tokenized yet). Theme persisted in `localStorage['site-theme']`.
- `assets/js/theme-init.js` — applies the stored theme before paint, builds the mobile top bar/drawer (or mounts the hamburger into a page's own `.topnav`) and the theme switch.
- `assets/js/i18n.js` — `data-i18n` attribute-based string swapping. Stored in `localStorage['_lang']` (`tr` | `en`).
- `assets/js/love-nav.js` — toggles the admin / love nav items and the trial-lesson hint on the existing nav markup; it does not render the nav.
- `assets/js/auth-ui.js` — shared sign-in modal (Google + e-posta/şifre: giriş, kayıt, şifre sıfırlama), exposed as `window.bkAuth` (`openLogin`, `signInGoogle`, `handleRedirectResult`, `isEmbeddedBrowser`, `errorMessage`). Plain `<script>` in `<head>` before the Firebase SDK — it only calls `firebase.auth()` lazily. Every page with a sign-in button loads it (not `app-bridge.html`).
- `assets/img/icons.svg` — icon sprite: `<svg class="icon" aria-hidden="true"><use href="/assets/img/icons.svg#i-NAME"/></svg>`. UI chrome uses these, never emoji.

When changing the nav shell, edit `theme-init.js` / `themes.css` once instead of each page. New page CSS: tokens only — no `!important`, no px `border-radius`, no gradients, no `backdrop-filter`; inline `style=""` only for runtime state (`display:none`, widths computed from data).

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

- **Pricing:** monthly per-lesson **2500 TL**, single one-off **3000 TL** (`LESSON_PRICE` / `LESSON_PRICE_SINGLE` in `booking.html`). Picking "Tek Ders" in the request form shows an upsell note (`renderSingleUpsell()`, `#singleUpsell`) with a one-click switch to the monthly plan; its figures — per-lesson difference and the package total — are derived from those two constants plus the form's lessons/month value (`monthlyLessonsPerMonth()`, today the single `4 ders/ay` option), so changing a price or the package size updates the note too.
- **Reschedule credits:** package-based pool — an N-month package grants N credits total (1-month = 1 credit even if lessons spill into the next calendar month). Stored as `reservations.reschedule_credits {'YYYY-MM': n}`; available = sum of values (`totalRescheduleCredits()`), consumption via `consumeRescheduleCredit()` decrements the lesson's month key if positive, else the earliest positive key. Buying an extra credit costs **500 TL** via the in-panel modal (admin adds +1 to a month key).
- **Rules acceptance:** modal shown once after first lesson purchase; writes `rules_accepted_at` (write-once). Re-shown only if the field is missing.
- **Closed slots:** admin can mark whole days or single hours red; those appear blocked but visible in the trial-lesson day grid.
- **24h rule:** `calculateLessonDates()` pushes a weekday series one week forward while its first slot starts less than 24h from now (or is already past), so a request made Sunday 11:00 for Monday 10:00 begins with the other selected day. The extra-lesson picker disables such days/times via `slotStartsTooSoon()`; the same function feeds the request preview, the min-lesson check and admin `acceptRequest`.

These flows live almost entirely inside `booking.html` (~5300 lines) — single source of truth for the panel UX.

## Auth Patterns

- `authDomain` is `berkayeracademy.com` (same-origin `/__/auth/handler`; the cross-origin `firebaseapp.com` handler broke on iOS Safari / in-app browsers with "missing initial state"). The OAuth client must list `https://berkayeracademy.com/__/auth/handler` as a redirect URI.
- Sign-in buttons call `window.bkAuth.openLogin()`; never call `signInWithPopup`/`signInWithRedirect` from a page (exception: `app-bridge.html`, which needs a real Google ID token). `signInGoogle()` tries the popup first and falls back to redirect only on `auth/popup-blocked` / `auth/internal-error`, never inside an in-app browser (Instagram/Facebook/TikTok WebViews — Google rejects OAuth there, so the modal leads with e-posta).
- Pages call `window.bkAuth.handleRedirectResult()` instead of `getRedirectResult()` so redirect failures are shown to the user, not swallowed in the console.
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
| ders-push3.html | /ders-push3 | Ableton Push 3 interactive "find the control" game — 27 hotspots bound to named layers in assets/img/push3-device.svg (fetched + injected, background removed); linked from egitim.html curriculum grid |
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
