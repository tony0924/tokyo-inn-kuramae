# Tokyo Inn Kuramae Project Context

This file is the handoff note for future Codex/terminal sessions. Read this first before making changes.

## Current Status

- App: Vite + React + TypeScript.
- Firebase project ID: `tokyo-inn-kuramae`.
- Firebase project number: `263022233310`.
- Firestore database ID: `default` (not `(default)`).
- Firebase Hosting URL: `https://tokyo-inn-kuramae.web.app`.
- Cloud Functions region: `asia-east1`.
- Scheduled operations timezone: `Asia/Taipei`.
- Guest stay-day and homepage stage timezone: `Asia/Tokyo`.
- Main app folder: `/Users/chenweian/Documents/git/tokyo-inn-kurama/tokyo_inn`.
- Current production deployment uses Firebase Hosting + Firestore + Cloud Functions v2 scheduled functions.

## Important Commands

Run commands from `tokyo_inn`.

```bash
npm run build
```

```bash
/opt/homebrew/bin/node --check functions/index.js
```

```bash
/opt/homebrew/bin/node /Users/chenweian/.npm-global/lib/node_modules/firebase-tools/lib/bin/firebase.js deploy --only hosting --project tokyo-inn-kuramae
```

```bash
/opt/homebrew/bin/node /Users/chenweian/.npm-global/lib/node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions --project tokyo-inn-kuramae
```

```bash
/opt/homebrew/bin/node /Users/chenweian/.npm-global/lib/node_modules/firebase-tools/lib/bin/firebase.js functions:list --project tokyo-inn-kuramae
```

Known deploy note: `firebase deploy --only functions` may end with exit code `1` because Artifact Registry cleanup policy could not be set. If output says `2 Functions Deployed`, `0 Functions Errored`, this is a non-blocking cleanup-policy warning, not a function failure.

## Routes

- `/`: public preview/landing page.
- `/login`: Gmail login page.
- `/code-login`: guest access code login page.
- `/pending`: user is signed in but waiting for admin approval.
- `/guest/*`: guest-facing pages. Allowed roles: `guest`, `admin`.
- `/admin/*`: admin backend. Allowed role: `admin`; `/admin` defaults to `/admin/today`.
- When an Admin previews `/guest/*`, a safe-area-aware fixed return bar remains
  visible above the sticky Guest header so the Admin can always return to `/admin`.

Routing entry point: `src/App.tsx`.

## Main Folders

- `src/pages`: route-level pages.
- `src/admin`: admin backend pages and admin CSS.
- `src/guest`: guest-facing layout and legacy styles.
- `src/preview`: public preview page styles/components.
- `src/lib`: Firebase data helpers.
- `src/auth`: auth context and protected route logic.
- `src/types`: shared TypeScript types.
- `functions`: Firebase Cloud Functions.
- `pic`: image assets for arrival/facilities pages.
- `dist`: build output for Firebase Hosting.

## Admin Features

Admin backend currently includes:

- Mobile-first today operations dashboard.
- Booking list and booking form.
- Calendar-style booking view.
- Revenue overview.
- User management.
- Key management.
- Guest access code management.
- Notification settings.
- Guest message management.
- Recommendation place management with grouped search/filter views, visual star
  ratings, a drawer editor with Google Maps lookup and guest preview, automatic
  per-category ordering, bulk status actions, duplicate/archive/restore tools,
  data-quality warnings, and update attribution.
- Mobile bottom navigation and installable PWA shell.
- Per-admin-device Web Push registration and App icon badge support.
- Button/link flow to preview guest-facing page as admin.
- The Admin guest-preview entry opens a picker containing every current or
  upcoming booking in check-in order. Selecting a booking stores its ID in
  session storage and renders the Guest portal with that booking's name and
  date-aware stay stage. The preview dock can simulate pre-arrival, check-in,
  stay day 2, checkout, and completed states without changing booking data.
  When there are no current/upcoming bookings, Admin can explicitly preview the
  generic no-guest state.
- Email management center with upcoming schedules, rendered template previews,
  delivery history, missing-recipient warnings, admin test sends, and manual
  guest resend actions.
- Today checklist combines payment, key handoff/return, guest code, guest Email,
  and reminder-delivery issues. Payment and key tasks have one-tap completion.
- Guest analytics dashboard with 7/30/90-day filters, real-guest-only journey
  funnel, daily activity, top pages and places, Email entry attribution, PWA
  engagement, checkout checklist progress, and per-guest usage signals.

Admin app entry: `src/pages/AdminApp.tsx`.

## Guest Access Methods

There are two guest access paths:

1. Gmail login:
   - User signs in with Google.
   - User document is created in `users/{uid}`.
   - If email exists in `emailAccess/{email}`, role/active/bookingId can be applied automatically.
   - Admin UI treats `emailAccess` rows without a matching Firebase user as approved Gmail accounts with status `尚未登入`.
   - Once that Gmail logs in, it becomes a normal approved `users/{uid}` guest account.
   - Otherwise user goes to pending approval.

2. Guest code login:
   - User enters code at `/code-login`.
   - Code is normalized to uppercase alphanumeric via `normalizeGuestCode`.
   - Valid code is stored in localStorage key `tokyoInnGuestAccessCode`.
   - Code must be `active`, `startsAt <= now`, and `expiresAt > now`.
   - Guest code login is used to view guest pages without Gmail.

Guest code helpers: `src/lib/guestAccessCodes.ts`.

## Personalized Stay Status

The Guest home page loads the booking assigned to the signed-in Gmail guest or
the active guest code and shows a date-aware stay card:

- Guest name personalization appears in the daily welcome guide, the Guest
  header on every tab, and the Home hero.
- The booking `guestName` is authoritative. Google `displayName` is used only
  while no booking name is available; email addresses are never used as a
  greeting.
- Before check-in: arrival countdown plus airport, arrival, and check-in guidance.
- Check-in day through the final overnight day: Tokyo-local stay day number,
  current Kuramae weather, and deterministic daily restaurant/cafe/sight picks.
- Checkout day: urgent checkout state and the interactive checkout checklist;
  general preparation and daily-tour content is hidden.
- After checkout: completed-stay message.
- The checkout day is not counted as another stay day. A three-night booking
  displays days 1–3, then switches to checkout mode.

The same status calculation is shared with the Admin today dashboard. The Admin
operations card brings the next operational booking, payment, key, guest-code,
and guest-message status into one place.

The Guest checkout checklist is stored per booking in browser local storage so
each device remembers its progress without adding guest-writable booking fields.
Guest booking reads remain single-document reads and are authorized for the
assigned active Gmail guest or through the booking's active guest access code.

Relevant files:

- `src/lib/stayStatus.ts`
- `src/lib/bookingPreview.ts`
- `src/guest/useGuestBooking.ts`
- `src/guest/shared/StayOverviewCard.tsx`
- `src/guest/shared/DailyRecommendationsCard.tsx`
- `src/admin/TodayDashboard.tsx`
- `firestore.rules`

## Recommendation Management

- `/admin/recommendations` groups records by guest-facing category instead of
  exposing a wide technical table.
- On the Guest restaurant, shopping, and sightseeing pages, mobile uses the
  document scroll instead of a nested fixed-height sidebar. Selecting a place
  scrolls to its map marker, and the map provides a return-to-selected-place
  action with a page-specific label.
- Active records can be reordered by drag-and-drop or explicit first/up/down/last
  actions. All persisted `sortOrder` values are normalized per category after
  reorder, disable, archive, restore, or delete operations.
- The editor keeps address, Place ID, latitude, and longitude under advanced
  settings. Google Maps lookup fills these fields for normal editing.
- Rating is edited and displayed as one to five stars. The drawer includes a
  guest-card preview and lists the guest surfaces that consume the record.
- Admins can select multiple records to show, disable, archive, or restore.
  Archive is reversible; permanent deletion remains a separate confirmed action.
- Active/archive changes use Firestore batches. `archivedAt`, `updatedAt`, and
  `updatedBy` provide maintenance status and update attribution.
- Inline quality warnings flag missing descriptions, low ratings, malformed
  Maps URLs, and likely duplicates based on Place ID or normalized Maps URL.

## System Health

- `/admin/system-health` provides a read-only operational health dashboard for
  private Guest guide completeness, recommendation category coverage and data
  quality, upcoming booking / guest-code consistency, and recent Email / Admin
  notification delivery failures.
- Health findings link to the existing Admin management page that can resolve
  them. The checker never edits Firestore content automatically.
- `npm run check` is the release verification entry point. It runs the frontend
  production build, deterministic system-health rule tests, and all Functions
  tests.

Relevant files:

- `src/admin/RecommendationManagement.tsx`
- `src/admin/useRecommendations.ts`
- `src/lib/recommendations.ts`
- `src/admin/SystemHealthDashboard.tsx`
- `src/lib/systemHealth.ts`
- `test/systemHealth.test.mjs`
- `src/types/index.ts`

## Protected Guest Guide Content

- Address, room, Wi-Fi, entry, door-lock, garbage-location, and private search
  entries live in `guestGuideContent/private` instead of the Hosting bundle.
- Active Google guests and Admins read the document through Firestore Rules.
- Guest-code users call `getGuestPortalData`; the Function validates the code
  window and returns the private guide plus a sanitized booking summary.
- Public clients cannot directly read `guestAccessCodes` or use a code to read
  `bookings`.
- Entry, lock, and floor-plan images are intentionally excluded from Hosting.
  Protected media delivery must be designed before those images are restored.

## Guest PWA Install Guide

- The authenticated Guest shell switches the page metadata to
  `public/guest-manifest.webmanifest`; Admin keeps the existing Admin manifest.
- The permanent Quick Access card appears immediately after the Guest guide
  introduction so first-time iPhone and Android visitors see installation help
  before the longer guide. Installed visitors receive a compact completion state.
- The daily welcome modal includes a PWA entry point, and the Guest user-guide
  tab keeps a permanent entry so visitors can reopen the instructions later.
- iPhone/iPad visitors receive Safari-specific Add to Home Screen steps.
  Android visitors use the browser install prompt when available, with manual
  Chrome steps as a fallback.
- Standalone mode is detected through the display-mode media query and iOS
  `navigator.standalone`; installed visitors see a completion state instead of
  repeated install instructions.
- Guest PWA installation improves access and recall, but does not imply that
  private Firestore content is available offline.

## Frontend Performance

- The public Preview route is intentionally outside the authenticated Firebase
  application shell. Firebase Auth and Firestore load only after navigating to
  login, guest, pending, or admin routes.
- `index.html` contains a lightweight public hero shell so first content does not
  wait for React to download and start.
- The public Leaflet map loads only after the visitor explicitly requests it.
  Leaflet CSS is bundled with the map chunk and must not also be linked globally.
- The Gmail login card renders without Firebase; authentication state initializes
  during browser idle time or immediately after the visitor clicks sign in.
- Google Fonts load asynchronously with system-font fallbacks for first paint.
- Valid guest-code lookups are cached briefly in memory so route authorization
  and the personalized booking card do not read the same document twice.
- The Admin today dashboard loads only the latest 100 guest messages; the full
  message management screen remains capped at the latest 500.
- Guest instructional photos are resized and recompressed for the app viewport.
  Original source photos remain in `pic/`; packaged assets live in
  `src/guest/assets/`.
- Firebase Hosting gives hashed `/assets/**` files a one-year immutable cache.

## Booking And Guest Code Flow

Bookings are stored in `bookings`.

When admin creates a booking via the current form:

- `createBookingWithGuestAccessCode` is used.
- A booking doc is created.
- A matching `guestAccessCodes/{code}` doc is created in the same Firestore batch.
- Booking stores `guestAccessCode`.
- Guest code doc stores `bookingId`, `guestEmail`, `guestName`, active state, start/end validity.

Guest code validity window:

- Starts immediately when the booking is created.
- Expires at checkout date 00:00 plus 2 days.
- Because rules use `expiresAt > request.time`, this makes the code valid through the day after checkout.

Relevant files:

- `src/lib/bookings.ts`
- `src/lib/guestAccessCodes.ts`
- `src/admin/BookingForm.tsx`
- `src/admin/BookingList.tsx`

## Booking Constraints

- There is currently only one room.
- Booking form checks date overlap before saving.
- If dates conflict, it should show a conflict warning with the existing booking/person.
- Booking list supports deletion; deletion also removes the linked guest access code if present.
- Keys are managed in `/admin/keys`.
- Booking form key field is a select menu backed by Firestore `keys`.
- If a key is currently lent in another booking (`keyLentAt` set and `keyReturnedAt` empty), it cannot be selected for a different booking.

## Data Model Summary

Shared types: `src/types/index.ts`.

`users/{uid}`:

- `email`
- `displayName`
- `photoURL`
- `role`: `admin | guest | pending`
- `active`
- `bookingId`
- `createdAt`
- `updatedAt`

`emailAccess/{email}`:

- `email`
- `role`: `admin | guest`
- `active`
- `bookingId`
- `createdAt`
- `updatedAt`

`bookings/{id}`:

- `guestUid`
- `guestEmail`
- `guestName`
- `guestAccessCode`
- `partySize`
- `checkIn`
- `checkOut`
- `amount`
- `paymentStatus`: `unpaid | partial | paid`
- `paymentNotes`
- `keyCode`
- `keyLentAt`
- `keyReturnedAt`
- `notes`
- `suppressBookingCreatedEmail` (optional internal flag for historical imports)
- `importTag` (optional internal marker for imported data)
- `createdAt`
- `updatedAt`

`guestAccessCodes/{code}`:

- `code`
- `label`
- `bookingId`
- `guestEmail`
- `guestName`
- `active`
- `startsAt`
- `expiresAt`
- `createdAt`
- `updatedAt`

`keys/{code}`:

- `code`
- `label`
- `active`
- `notes`
- `createdAt`
- `updatedAt`

`settings/notifications`:

- `senderName`
- `senderEmail`
- `reminderTemplateVersion`
- `bookingCreatedReminder.subject`
- `bookingCreatedReminder.body`
- `checkInReminder.subject`
- `checkInReminder.body`
- `checkoutAdminReminder.subject`
- `checkoutAdminReminder.body`
- `updatedAt`

`emailDeliveries/{deliveryId}`:

- `bookingId`, `guestName`, `recipient`
- `type`, `typeLabel`, `trigger`
- `subject`, `status`, `errorMessage`
- `initiatedBy`, `createdAt`, `updatedAt`, `sentAt`

Only Functions write delivery records; Admin clients can read them.

`adminPushDevices/{uid_deviceId}`:

- `ownerUid`
- `token`
- `label`
- `userAgent`
- `enabled`
- `createdAt`
- `updatedAt`
- `lastSeenAt`

Each admin can read and manage only their own device documents. Cloud Functions use enabled device tokens for management push notifications and delete invalid registrations automatically.

`adminNotifications/{id}` stores every management push event, including its
title, body, deep link, delivery status, device count, and timestamps. Admins
can read the latest 100 records from the `通知紀錄` page; clients cannot write
or delete these documents. Booking date-change notifications show only the
fields that changed, including the previous and new check-in / checkout dates.
`adminNotificationReads/{uid}` stores each admin's latest read timestamp. The
mobile header bell shows that admin's unread count and marks visible history as
read when the history page opens.

`guestPageViews/{id}` stores authenticated usage events:

- `eventType`: `page_view | code_login | email_entry | pwa_guide_open |
  pwa_install | recommendation_click | checkout_checklist`
- `visitorType`, `path`, authenticated identity fields
- optional bounded `targetId`, `targetLabel`, and numeric `value`
- `deviceId`, `userAgent`, `createdAt`

The analytics dashboard excludes `admin_preview`, never displays guest access
codes, and does not collect search text, message bodies, lock details, or Wi-Fi
content.

## Firestore Rules

Rules file: `firestore.rules`.

Important behavior:

- Admin is determined by `users/{uid}.role == "admin"`.
- Users can self-create pending profile or profile matching `emailAccess/{email}`.
- Users cannot change their own role/active/bookingId.
- Admin can manage `users`, `emailAccess`, `settings`, `bookings`, `guestAccessCodes`, `keys`.
- Admin can read `emailDeliveries`; all writes remain Functions-only.
- Guest access codes can be read without Firebase Auth only when active and within validity window.
- Bookings can be read by admin or by signed-in user whose `guestUid` matches the booking.

## Email Notifications

Email sending is handled by Firebase Cloud Functions in `functions/index.js`.

Provider:

- Gmail SMTP via `nodemailer`.
- Firebase secret: `GMAIL_APP_PASSWORD`.
- Do not print or expose the secret value.
- Sender defaults to `ttoonnyy8024@gmail.com`, but production reads `settings/notifications` first.

Functions:

- `sendBookingCreatedReminder`
  - Firestore trigger: `bookings/{bookingId}` created.
  - Sends booking completion email to guest email.
  - CCs all active admin users.
  - Email includes website URL and guest access code.
  - Email intentionally does not show room price.
  - Skips sending when booking has `suppressBookingCreatedEmail == true`; this is used for historical imports only.

- `sendUpcomingCheckInReminders`
  - Schedule: `0 9 * * *`
  - Timezone: `Asia/Taipei`
  - Finds bookings where `checkIn` is tomorrow.
  - Sends to guest email.
  - CCs all active admin users.
  - Email includes a concise Narita/Haneda arrival guide, website URL, and guest access code.
  - Missing Admin recipients do not block delivery to the guest.
  - Email intentionally does not show room price.

- `sendCheckoutAdminReminders`
  - Schedule: `0 12 * * *`
  - Timezone: `Asia/Taipei`
  - Finds bookings where `checkOut` is today.
  - The legacy Function/setting name is retained for deployment compatibility.
  - Sends a concise checkout checklist to the guest and CCs all active admin users.
  - Email includes the website URL and guest access code for complete instructions.
  - Missing Admin recipients do not block delivery to the guest.
  - Email intentionally does not show room price.

## Admin Mobile Push Notifications

Enabled admin devices receive push notifications for:

- The first successful login for each guest code per Taiwan-local day.
- Guest messages.
- New pending users and users returned to pending.
- New, deleted, or date-modified bookings.
- Booking/key conflicts detected after a booking write.
- Same-day check-in and missing/invalid guest access codes at 09:00.
- Same-day checkout and unreturned keys at 11:00.

Notification clicks deep-link to the corresponding admin page. Invalid FCM
registrations are deleted automatically.
Every push event is also saved to `adminNotifications`, including events that
had no enabled device. History starts accumulating only after this feature is
deployed; previously delivered FCM messages cannot be recovered.

Important implementation details:

- Functions use `getFirestore("default")`.
- Date matching uses Taiwan-local midnight calculation in `atMidnightDaysFromNow`.
- `WEBSITE_URL` is `https://tokyo-inn-kuramae.web.app`.
- `GUEST_CODE_LOGIN_URL` is `https://tokyo-inn-kuramae.web.app/code-login`.
- Template variables include `guestName`, `guestEmail`, `checkInDate`, `checkOutDate`, `partySize`, `keyCode`, `guestAccessCode`, `websiteUrl`, `guestCodeLoginUrl`, `senderName`.
- `amount`/price should not be used in email templates unless the user explicitly asks to restore it.

## Notification Settings In Admin

Admin can edit email content in `通知設定`.

Relevant files:

- `src/lib/notificationSettings.ts`
- `src/admin/NotificationSettingsPage.tsx`
- `functions/index.js`

When changing email templates:

1. Update frontend defaults in `src/lib/notificationSettings.ts`.
2. Update Cloud Functions defaults in `functions/index.js`.
3. Update admin helper variable list in `src/admin/NotificationSettingsPage.tsx`.
4. If production Firestore `settings/notifications` already exists, update that document too, because functions read Firestore settings first.
5. Deploy hosting and functions if code changed.

## Revenue

Revenue overview exists in admin and uses booking `amount` and `paymentStatus`.

The overview also includes a responsive donut chart that breaks the selected stays'
accommodation value into received, outstanding, and non-revenue portions. Cash received
within the selected calendar period remains a separate metric because it uses payment date
rather than check-in date.

Important distinction:

- Admin pages can show and calculate revenue.
- Guest-facing pages and notification emails should not show room price unless explicitly requested.

Relevant file: `src/admin/RevenueOverview.tsx`.

## Images

Chrome had issues with arrival page photos when using a different rendering path. Arrival photos were adjusted to display in the same style as facilities photos.

Relevant folders:

- `pic/arrival`
- `pic/facilities`

## Authentication Notes

- Firebase Auth uses Google sign-in for Gmail login.
- Authorized domains must include local development hosts like `127.0.0.1` when testing locally.
- Admin status is not the same as Firebase project owner; the app checks Firestore `users/{uid}`.

## Local Development

Development server command used previously:

```bash
/opt/homebrew/bin/npm run dev -- --host 127.0.0.1 --port 5173
```

Local URL is usually:

```text
http://127.0.0.1:5173
```

## Current Known Admin Emails

These emails have been used as admins in this project:

- `ttoonnyy8024@gmail.com`
- `jenny2308919@gmail.com`

Verify in Firestore `users` before relying on this list.

## Testing Notes

To trigger scheduled functions manually, use Cloud Scheduler jobs:

- `firebase-schedule-sendUpcomingCheckInReminders-asia-east1`
- `firebase-schedule-sendCheckoutAdminReminders-asia-east1`

Previously tested:

- Created a test booking.
- Auto-created a guest access code.
- Triggered both scheduled jobs.
- Cloud Run request logs showed HTTP `200`.
- No `ERROR` logs were present.

If exact email recipient acceptance is needed, add explicit success logging around `transporter.sendMail`; currently only failures are logged.

## Recent User Preferences

- Email content should not show room price.
- Booking completion email should send immediately after booking creation and CC admin.
- Check-in reminder email must CC admin.
- Check-in reminder email should summarize both Narita and Haneda arrival routes, then link to the guest website for details.
- Checkout-day email should send the guest a short checklist, CC admin, and link to the guest website for details.
- Guest code should be created per booking.
- Guest code validity starts when the booking is created and runs through the day after checkout.
- Check-in notification should include website link and guest code.
- Site should support both Gmail login and guest code login.
- Booking Gmail accounts should appear under approved accounts. If the guest has not logged in yet, show them as approved but not logged in instead of a separate pre-authorized list.
- Admin wants revenue overview for total/year/month.
- Only one room exists, so overlapping booking dates should be blocked.
- Keys should be selected from managed key records, not typed freely in bookings.
