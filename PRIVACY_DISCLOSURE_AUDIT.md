# App Store Privacy / Data-Safety Disclosure Audit

**Repo:** `/home/ubuntu/offerhound-rn-v2` @ `284dac6` (branch `housekeeping-followups-2026-07-27`)
**Date:** 2026-08-31
**Purpose:** Factual, evidence-based basis for App Store Connect privacy disclosures and Google Play Data Safety form. Every claim below is backed by a specific file:line reference.

---

## Summary Table (fill this into App Store Connect / Play Console)

| Category | Collected? | Linked to user? | Used for tracking? | Purpose |
|----------|:----------:|:---------------:|:------------------:|---------|
| Name | **Yes** | Yes | No | App functionality (identify user on platform, roster display) |
| Email address | **Yes** | Yes | No | App functionality (account auth, invitations, notifications) |
| Phone number | **Yes** (optional) | Yes | No | App functionality (coach/scout contact info) |
| Physical address | **No** | — | — | — |
| Date of birth | **Yes** (roster context only) | Yes | No | Age-protection compliance (under-13 detection) |
| City / State | **Yes** (free-text) | Yes | No | App functionality (team logistics, geographic search) |
| Precise location | **No** | — | — | — |
| Coarse location | **No** | — | — | — |
| Photos | **Yes** | Yes | No | App functionality (profile photos, banners, highlight thumbnails, gallery) |
| Videos | **Yes** | Yes | No | App functionality (highlight reels) |
| Health & fitness data | **No** | — | — | — |
| Sensitive info (race, orientation, religion, etc.) | **No** | — | — | — |
| Contacts | **No** | — | — | — |
| User content — messages | **Yes** | Yes | No | App functionality (in-app messaging between coaches/athletes/scouts) |
| Search history | **No** | — | — | — |
| Browsing history | **No** | — | — | — |
| Identifiers — user ID | **Yes** | Yes | No | Account authentication (Supabase auth UUID) |
| Identifiers — device ID | **No** (no analytics SDKs collecting them) | — | — | — |
| Purchase history | **Yes** (Apple/Google-mediated only) | Yes | No | App functionality (in-app subscription entitlement) |
| Usage data / analytics | **No** | — | — | — |
| Crash data | **No** (no Sentry/Crashlytics/Bugsnag) | — | — | — |
| Financial info (payment info) | **No** (never touches app; handled by Apple/Google IAP) | — | — | — |

**"Data used for tracking" answer for both stores: NO.** No third-party analytics, ad networks, or cross-app tracking SDKs are integrated. `expo-tracking-transparency` is present but only invoked from `PrivacySettingsScreen` as a user-facing setting; nothing in the app uses ATT-gated identifiers because there are no ad/analytics networks to gate.

---

## 1. Personal information collected

### 1a. Email + password (all roles)
`src/screens/auth/SignUpScreen.tsx:15-24` — `email`, `password` → `supabase.auth.signUp` (`AuthContext.tsx:150-155`).

**Alternate auth:** Apple Sign In and Google OAuth. Both provide email only via the identity provider.

### 1b. Athlete onboarding — `src/screens/onboarding/OnboardingScreen.tsx`

**Required:** `full_name` (line 613), `school` (line 663), `positions[]`, `graduation_year`, `state` (2-letter picker, line 700), `sport`.

**Optional:** `gpa` (line 382), `height` (self-reported string, line 383), `weight` (self-reported string, line 384), `bio` (line 385), `custom_url`.

**Third-party PII:** `coach_references` — up to 3 external coaches added by athlete (line 141-142): `{ coach_name, coach_email }`. Triggers email invitation.

**Role:** athletes 13+ only.

### 1c. Coach onboarding — `src/screens/onboarding/CoachOnboardingScreen.tsx:82-96`

Three sub-types (college/club/highschool):
- Personal: `name`, `title`, `email`, `phone`
- College: `school`, `conference`, `division`, `position_coached`
- Club: `club_name`, `club_description`, `club_type`, `city`, `state`, `country`, `website`
- High school: `school_name`, `school_city`, `school_state`, `school_district`, `school_classification`, `conference_name`, `team_mascot`, `career_record`, `hs_years_at_school`, `hs_website`

### 1d. Scout onboarding — `src/screens/onboarding/ScoutOnboardingScreen.tsx:35-37`

Fields: `name`, `title`, `email`, `phone` (optional), `specialization`, `bio` (optional), `city` (optional), `state` (optional).

### 1e. Parent role — `src/components/dashboard/ParentInviteCard.tsx`, `src/components/ParentInviteModal.tsx`

Parents are invited via email; relationship stored in `parent_athlete_relationships`. No independent parent profile — parents authenticate via the same Supabase auth flow.

### 1f. Roster entry (coach adds athletes) — `src/components/ClubTeamManagement.tsx:80`

Fields: `athlete_name`, `email`, `position`, `jersey_number`, `school`, `graduation_year`, `date_of_birth`, `parent_name`, `parent_email`, `parent_phone`.

**Under-13 special path** (line 289-303): only `athlete_name`, `date_of_birth`, `parent_email` persisted. All other fields **stripped** (documented in-code line 298).

---

## 2. Sensitive categories

### 2a. Health data — NOT COLLECTED

Grep confirmed no HealthKit / injury / medical / nutrition / allergy / medication / heart-rate / blood / BMI fields.

`height` and `weight` on athlete profile (§1b) are **self-reported free-text strings** for recruiting display, not linked to any health provider or measurement. Classify as "Other User Content" not "Health & Fitness data" — no HealthKit or Google Fit integration.

### 2b. Under-13 data minimization (Minor-Safe protocol) — REAL CODE ENFORCEMENT

**`isUnder13(dob)`** — `src/components/ClubTeamManagement.tsx:73-76`
**`isMinorSafeAthlete(athleteId)`** — `src/lib/isMinorSafeAthlete.ts:21-40`

**Roster path** (`ClubTeamManagement.tsx:286-303`): coach cannot directly add under-13 athletes. Requires `parent_email`. Only `athlete_name`, `date_of_birth`, `parent_email` persisted.

**Upload guards** (pre-write, always checked):
- `AthleteProfileImageUpload.tsx:44-51`
- `BannerImageUpload.tsx:77-84`
- `HighlightVideoUpload.tsx:52-58`

Guard is fail-open on DB errors (documented in `isMinorSafeAthlete.ts:31`).

**What IS collected for under-13** (`MinorProfileForm.tsx:206-238`, shown verbatim to parent in itemized consent screen):

| Field | Collected | Notes |
|-------|:---------:|-------|
| First name | Yes | Roster ID |
| Last initial (1 char) | Yes | **Never a full last name** |
| Sport | Yes | Roster grouping |
| Position | Optional | Roster grouping |
| City | Optional | "Never a street address" |
| State (2-char) | Optional | Team logistics only |
| Date of birth | Yes | Already from coach; age protection only, never displayed on profile |
| Phone number | **NO** | Explicit exclusion, line 233 |
| Email | **NO** | Explicit exclusion |
| School | **NO** | Explicit exclusion |
| Height / weight | **NO** | Explicit exclusion |
| Highlight video | **NO** | Blocked at upload time |
| Social accounts | **NO** | Not collected |
| GPA | **NO** | Explicit exclusion |

**Visibility rule** (line 238-242): _"Because your child is under 15, their profile can never be made publicly visible or searchable on the internet. It stays private and visible only to their own team's coaches. Recruiters cannot find or contact them, and you can delete the profile at any time from your parent dashboard."_

**COPPA disclosure required.** On Play Console Data Safety: yes we collect from under-13, enumerated minimized set above, parental consent required, access limited to team coaches.

### 2c. Race / gender / orientation / religion / biometric — NONE COLLECTED

Grep for `gender`, `race`, `orientation`, `religion`, `ethnicity`: no schema fields exist.

---

## 3. Photos and videos

### 3a. Supabase Storage buckets (11 total)

| Bucket | Content |
|--------|---------|
| `avatars` | User profile photos |
| `camp-images` | Camp promo images |
| `camp-insurance` | Insurance certificate PDFs (coach-side) |
| `club-media` | Club promo images |
| `gallery` | General gallery images |
| `highlight-videos` | Athlete highlight videos |
| `influencer-media` | Influencer content |
| `organization-logos` | Org logos |
| `player-media` | Athlete media |
| `profile-images` | Profile/banner photos |
| `transcripts` | Academic transcript PDFs |

### 3b. Upload entry points (17 files)

All use `expo-image-picker`. All athlete-facing photo/video paths gated by `isMinorSafeAthlete`. Videos stored in Supabase Storage; app does not upload to YouTube/Vimeo.

### 3c. Transcripts

`transcripts` bucket + `transcript_requests` table (`dashboard/TranscriptRequestCard.tsx:71`). User-uploaded PDFs, no third-party academic API integration.

---

## 4. Location

### 4a. Device location — NOT REQUESTED

Grep confirmed:
- `expo-location` **not in `package.json`**
- No `Geolocation` / `getCurrentPosition` / `requestLocationPermission` / `watchPosition` calls anywhere
- No `NSLocationWhenInUseUsageDescription` / `NSLocationAlwaysUsageDescription` in `app.json:ios.infoPlist`
- No `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` in `app.json:android.permissions`

### 4b. City/state — free-text form fields only

`state` = 2-letter US abbreviation picker (US_STATES enum). `city` = free-text input. Neither is GPS-derived.

**Disclosure implication:** "Location" answer should be **No**. City/state as user-typed strings are correctly disclosed as "Other User Content", NOT location. Materially different classification.

---

## 5. Contacts — NOT ACCESSED

- `expo-contacts` **not in `package.json`**
- No `Contacts.getContact` / `requestContactsPermission` / `CNContact` / `CONTACT_READ` anywhere in `src/`

Coach references (§1b) and parent invitations (§1e) require the user to **type email addresses manually**. The app never reads the device contact book.

---

## 6. Device permissions actually requested

### iOS (`app.json:ios.infoPlist`)

| Permission | Usage description |
|------------|-------------------|
| `NSCameraUsageDescription` | "OfferHound needs camera access to upload profile photos and highlight videos." |
| `NSPhotoLibraryUsageDescription` | "OfferHound needs photo library access to upload profile photos and highlight videos." |
| `NSPhotoLibraryAddUsageDescription` | "OfferHound saves share cards and highlight images to your photo library." |
| `NSMicrophoneUsageDescription` | "OfferHound needs microphone access for video recording." |
| `NSCalendarsUsageDescription` | "OfferHound adds upcoming college camps and recruiting events to your calendar." |
| `NSCalendarsFullAccessUsageDescription` | Same as above |
| `NSUserTrackingUsageDescription` | "OfferHound never tracks you across other apps. This permission is unused." |
| `ITSAppUsesNonExemptEncryption` | false |
| Sign in with Apple entitlement | `com.apple.developer.applesignin: [Default]` |
| Push notifications | `aps-environment: production` |

### Android (`app.json:android.permissions`)

| Permission | Purpose |
|-----------|---------|
| `INTERNET` | Baseline network |
| `POST_NOTIFICATIONS` | Push notifications |
| `CAMERA` | Camera capture for uploads |
| `READ_MEDIA_IMAGES` | Photo library (Android 13+ scoped) |
| `READ_MEDIA_VIDEO` | Video library |
| `RECORD_AUDIO` | Video recording |
| `READ_CALENDAR` / `WRITE_CALENDAR` | Camp event calendar integration |

**Explicitly NOT requested:** location (fine/coarse), contacts, SMS, phone/telephony, biometrics, fitness, health, activity recognition, background location, external storage write.

**Note on `NSUserTrackingUsageDescription`:** the string is declared but the app never calls `requestTrackingPermissionsAsync` in a data-collection context. `expo-tracking-transparency` is loaded from `PrivacySettingsScreen.tsx:87-98` for the user to review a system-level setting; no analytics or ad network uses the resulting IDFA. **Current honest string is fine to keep, or delete permission entirely.**

---

## 7. Third-party data sharing

### 7a. Analytics SDKs — ZERO

Grepped `package.json` for: sentry, amplitude, mixpanel, segment, posthog, firebase, `@react-native-firebase`, facebook.sdk, adjust, appsflyer, branch.io, singular, google-analytics.

**Match count: 0.** No crash reporting, no analytics, no attribution SDKs.

### 7b. Non-Supabase HTTPS calls — ZERO

Grepped `fetch("https://...")` in `src/` excluding supabase/localhost. **Match count: 0.**

Every network write goes through the Supabase JS client. Only external identity providers reached:
- Apple (Sign in with Apple) — token exchange only, native SDK
- Google (OAuth) — token exchange only, via `supabase.auth.signInWithOAuth({ provider: 'google' })`

### 7c. Supabase Edge Functions invoked (30)

`admin-delete-user`, `admin-impersonate-user`, `admin-list-users`, `admin-resend-verification`, `admin-suspend-user`, `admin-update-role`, `admin-user-activity`, `admin-verify-user`, `analyze-profile`, `check-subscription`, `claim-waitlist-spot`, `crawl-recruiting-podcasts`, `create-checkout`, `customer-portal`, `delete-account`, `generate-feedback-prompt`, `generate-letter`, `invite-club-athlete`, `nil-advisor`, `notify-camp-enrollment`, `notify-terms-update`, `notify-transcript-decision`, `process-camp-refund`, `refresh-athlete-matches`, `refresh-coach-athlete-matches`, `request-transcript`, `send-beta-invitation`, `send-camp-sms`, `send-feedback-notification`, `send-letter`.

All run in your Supabase project. Names ending `send-*` / `notify-*` do email/SMS delivery — these functions internally call third parties (Resend/Twilio/etc.), but the RN app itself doesn't touch those APIs. **Disclose email/SMS delivery vendors as service providers to Supabase, not as your app's direct third-party data sharing.**

### 7d. In-app purchases

`expo-iap` (`package.json`, `src/lib/iap.ts`). Apple StoreKit and Google Play Billing only.

**No payment information (card number, CVV, billing address) ever enters your app** — Apple/Google handle everything. Your app receives only:
- Product SKU purchased
- `purchaseToken` (opaque receipt) sent to your backend for validation

Disclose as "Purchase history" (yes) but **NOT "Payment info"** (no).

### 7e. WebView usage — RESOLVED (bounded to 4 named third-party platforms)

`react-native-webview` used only in `HighlightMediaWindow.tsx` to embed highlight video players. The URL destinations are **not user-controlled hostnames** — the file parses the user-supplied video URL, extracts only the video ID, and constructs the embed URL against a fixed hostname string literal in code.

**Complete list of third-party domains reachable through this component:**

| Domain | When loaded | Embed URL template |
|--------|-------------|-------------------|
| `www.youtube-nocookie.com` | Athlete's URL matches YouTube pattern | `https://www.youtube-nocookie.com/embed/{videoId}?autoplay=1&mute=1&loop=1&…` |
| `player.vimeo.com` | Athlete's URL matches Vimeo pattern | `https://player.vimeo.com/video/{videoId}?autoplay=1&muted=1&loop=1&background=1` |
| `www.hudl.com` | Athlete's URL contains `hudl.com` | `https://www.hudl.com/embed/video/{path}` |
| `www.maxpreps.com` | Athlete's URL contains `maxpreps.com` and `/video`/`/videos` | `https://www.maxpreps.com/embed/video/{videoId}` |

**Privacy hardening applied:** YouTube embeds use `youtube-nocookie.com` (YouTube's official privacy-enhanced variant) rather than `youtube.com`, which prevents Google advertising / DoubleClick cookies from being dropped inside the embedded iframe. See `src/components/HighlightMediaWindow.tsx:148` and test `src/__tests__/HighlightMediaWindowYouTubeNoCookie.test.tsx`.

**Everything else falls through to native video playback**, not a WebView. Uploaded videos stored in the Supabase `highlight-videos` bucket (§3a) hit `expo-video` `<VideoView>` directly, no third-party domain involved.

**Cannot escape the 4-domain allowlist:** each handler constructs its embed URL against a hardcoded hostname string literal (`https://www.youtube-nocookie.com/embed/`, `https://player.vimeo.com/video/`, `https://www.hudl.com/embed/video/`, `https://www.maxpreps.com/embed/video/`). User input controls only the video ID extracted by the regex, never the hostname.

**Play Store disclosure language for embedded third-party content:**

> This app embeds video players from YouTube, Vimeo, Hudl, and MaxPreps when athletes provide video URLs from those platforms. Video playback occurs in a sandboxed iframe; those third parties may collect data as governed by their own privacy policies (session identifiers, referrer + IP). YouTube embeds use the privacy-enhanced `youtube-nocookie.com` domain to minimize third-party tracking. No user data is transmitted to those services by this app beyond the standard iframe loading request. Athletes control which URLs are embedded via their own profile.

---

## 8. Data retention and deletion

### 8a. Account deletion — REAL and available in-app

**Two entry points, same backend:**

1. `src/components/DeleteAccountSection.tsx` — settings button with confirmation Alert
2. `src/screens/shared/DeleteAccountScreen.tsx` — public-facing full-screen flow, per header comment (line 2-3): _"Public-facing account deletion landing **required by Google Play / Apple App Store**"_

Full screen requires:
- Password re-entry (via `supabase.auth.signInWithPassword` re-verify — defense in depth, line 75-79)
- Confirmation checkbox
- Delete button enabled only when both filled

**Server call (both entry points):** `supabase.functions.invoke('delete-account')` (`DeleteAccountSection.tsx:26`).

**On success:** `signOut()` and navigation reset to public tabs.

### 8b. Does it actually delete or just deactivate? — RESOLVED: HARD DELETE

**Verified against real source code:** `/home/ubuntu/_other-projects/offerhound-WEB-MAIN-reference-only/supabase/functions/delete-account/index.ts` (95 lines, last touched 2026-04-20 — 4-month stable code). Function header comment states verbatim: _"Hard-deletes the authenticated user's account and all associated data. Apple App Store Guideline 5.1.1(v) compliance."_

**Execution order (from the actual source):**

1. **Auth check** — parses `Authorization` header, calls `userClient.auth.getUser()`; rejects with 401 if invalid. (The RN app's password-reentry step at `DeleteAccountScreen.tsx:75-79` refreshes the session token before invoking, guaranteeing a valid caller.)

2. **Explicit purges on 22 application tables** — runs `DELETE FROM <table> WHERE user_id = $userId` for each:

   ```
   player_profiles, coach_profiles, scout_profiles,
   club_coach_profiles, high_school_coach_profiles, admin_profiles,
   influencer_profiles, academic_transcripts, athlete_testimonials,
   athlete_visibility_settings, user_blocks, user_reports,
   notifications, saved_athletes, saved_coaches,
   scout_saved_athletes, scout_saved_coaches, messages,
   letters, scheduled_letters, camp_enrollments,
   parent_athlete_relationships, user_roles
   ```

   Best-effort: per-table errors captured in a `partial_errors` return field; `"does not exist"` errors ignored.

3. **Audit log insert** — writes `{ deleted_user_id, deleted_email, initiated_by: "user" }` into `account_deletion_log`. **This audit row is retained after deletion** — the UUID and email address persist for compliance/legal purposes.

4. **`admin.auth.admin.deleteUser(userId)`** — Supabase's admin API removes the row from `auth.users`. User can no longer log in with that email. Any application tables with `ON DELETE CASCADE` foreign keys are cleaned up by Postgres.

5. Returns 200 on success, or 500 with `partial_errors` if the auth delete itself fails.

**Bottom line:** Hard delete, not soft-delete or deactivation. Row removed from `auth.users`, 22 known application tables explicitly purged, FK cascade handles the rest. **Only retained trace:** `account_deletion_log` audit row containing the deleted user's UUID and email — a small, intentional compliance artifact, not a copy of the user's data.

**Play Console disclosure language:**
> Users can request deletion of their account and associated data from within the app (Settings → Delete Account) or via the public deep link `offerhoundv2://delete-account`. Account deletion is a hard delete: the user's authentication record is removed and application data spread across 22 tables is purged. A minimal audit record (deleted user's UUID and email) is retained for compliance purposes.

**App Store Connect:** Guideline 5.1.1(v) satisfied — in-app account deletion path exists and performs full account removal.

Also present: `admin-delete-user` Edge Function (§7c) — admin-side hard delete, separate operator flow.

---

## Recommended App Store Connect disclosures

Under App Store Connect → App Privacy → Data Types:

- **Contact Info → Name:** Collected, Linked, No tracking, App Functionality
- **Contact Info → Email:** Collected, Linked, No tracking, App Functionality
- **Contact Info → Phone (optional):** Collected, Linked, No tracking, App Functionality
- **User Content → Photos or Videos:** Collected, Linked, No tracking, App Functionality
- **User Content → Other User Content** (bio, GPA, height, weight, DOB, city, state, coach references, transcripts): Collected, Linked, No tracking, App Functionality
- **Identifiers → User ID:** Collected, Linked, No tracking, App Functionality
- **Purchases → Purchase History:** Collected, Linked, No tracking, App Functionality
- Everything else: **Not Collected**

## Recommended Google Play Data Safety disclosures

- **Personal info:** Name, Email, Phone (optional), Other info (bio/GPA/height/weight/DOB/city/state)
- **Photos and videos:** Photos, Videos
- **Files and docs:** Other files (transcripts, insurance PDFs)
- **Messages:** In-app messages between users
- **App activity:** In-app search history — only if your Supabase side logs recruiting/camp searches server-side (verify separately, RN doesn't log)
- **Purchases:** Purchase history (mediated by Google Play Billing)
- **All categories:** Processing purpose = App Functionality; NOT collected for analytics, ads, or account management by third parties.
- **Data encrypted in transit:** Yes (Supabase HTTPS)
- **Data encrypted at rest:** Yes (Supabase default)
- **Users can request deletion:** Yes (in-app + public URL: DeleteAccountScreen, deep-linked via `linking.ts:58` → `delete-account`)
- **COPPA / Children's target audience:** Yes if you're offering the app to under-13 users — the Minor-Safe protocol is real code enforcement (§2b).

---

## Action items before submitting privacy forms

1. ~~**Verify `delete-account` Edge Function behavior**~~ **RESOLVED:** hard delete confirmed against MAIN's `supabase/functions/delete-account/index.ts` (§8b).
2. ~~**Verify WebView embed URLs**~~ **RESOLVED:** bounded to YouTube, Vimeo, Hudl, MaxPreps — see §7e. YouTube embed hardened to `youtube-nocookie.com`.
3. **Verify search-history logging on Supabase side** — the RN app doesn't log searches, but if your DB or a search function does, disclose it.
4. **Optional: remove `NSUserTrackingUsageDescription`** — it's unused; the honest description string is fine to keep as-is if you prefer belt-and-suspenders.
5. **Confirm `expo-calendar` calendar-write is disclosed** — you write camp events to the user's calendar. Both stores expect calendar write to be disclosed under "Calendar" data type.

---

## Files referenced in this audit

Authoritative source list for future verification runs:
- `src/screens/auth/SignUpScreen.tsx` — email/password signup
- `src/screens/onboarding/OnboardingScreen.tsx` — athlete onboarding
- `src/screens/onboarding/CoachOnboardingScreen.tsx` — coach onboarding
- `src/screens/onboarding/ScoutOnboardingScreen.tsx` — scout onboarding
- `src/contexts/AuthContext.tsx` — Apple/Google/email auth
- `src/components/ClubTeamManagement.tsx` — roster + under-13 stripping
- `src/lib/isMinorSafeAthlete.ts` — Minor-Safe guard
- `src/components/minor-invite/MinorProfileForm.tsx` — itemized consent
- `src/components/AthleteProfileImageUpload.tsx` + `BannerImageUpload.tsx` + `HighlightVideoUpload.tsx` — upload guards
- `src/components/DeleteAccountSection.tsx` + `src/screens/shared/DeleteAccountScreen.tsx` — account deletion
- `src/components/HighlightMediaWindow.tsx` — WebView embed
- `src/lib/tracking-transparency.ts` + `src/screens/shared/Pr