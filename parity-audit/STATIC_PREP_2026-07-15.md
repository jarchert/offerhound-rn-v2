# Static Prep Pass — 2026-07-15

**Status**: Not a runtime verification. No screens were rendered. No user
flows were driven. This is a source-only inventory intended to make
whichever runtime verification path (SSH-to-Mac, Tailscale, manual
guided, or downgrade to static) faster when it starts.

**Every finding below is graded either**:
- `PREP_ONLY-CONFIRMED_PRESENT` — file exists, is imported, and looks
  non-stub, but nothing was actually rendered or clicked
- `PREP_ONLY-CONFIRMED_MISSING` — file does not exist or is a scaffold
- `PREP_ONLY-CONTRADICTS_PLAN` — the July 14 plan says one thing,
  source-of-truth on disk says another
- `AMBIGUOUS-RESOLVED` — Supabase probe answered a schema question the
  plan flagged as unknown
- `AMBIGUOUS-STILL_OPEN` — needs runtime or authenticated Supabase
  access to resolve

No commits, no pushes, no config changes. All working-tree changes
listed under "Working-tree state" at the bottom.

---

## 1. Plan corrections (July 14 plan is stale on multiple items)

### `PREP_ONLY-CONTRADICTS_PLAN` — Plan §1 "Confirmed STILL OPEN" is wrong on 5 of 5 items

Plan says these are missing. Source-on-disk says they are present:

| Item | Plan says | On disk | Wired in? |
|---|---|---|---|
| `ParentAthleteSwitcher` | missing | `src/components/ParentAthleteSwitcher.tsx` (5985 b, 181 L) | Yes — `AthleteTabs.tsx:8,23,25` uses it as `headerLeft` |
| `ParentTabs` Messages/Inbox tabs | not present, 1.7 KB 2-tab shell | 1671 b, 27 L, but header comment says **"Build 25: added Messages + Inbox"** and the file declares 4 tabs: DashboardTab, MessagesTab, InboxTab, TrustSafetyTab | Yes, tabs are declared |
| `ParentInviteModal` | not present in `src/components/dashboard/` | `src/components/ParentInviteModal.tsx` (19437 b, 538 L) plus a companion `src/components/dashboard/ParentInviteCard.tsx` explicitly labeled `RN port of Lovable ParentInviteModal.tsx` | See §2 — the 538 L component is **not imported anywhere**. The `ParentInviteCard` version might be. Needs runtime check to see which one the athlete dashboard opens. |
| `TeammateInviteModal` | not present | `src/components/TeammateInviteModal.tsx` exists but is a **22 L scaffold** with `// TODO(session4): Port full implementation from Ch.13 of the conversion guide.` Renders `[TeammateInviteModal] Scaffold — port from Ch.13`. | **This one really is a stub.** Plan is right on intent, wrong on "not present". |
| Full `TranscriptManager` | only lighter `TranscriptRequestsCard` exists | Both exist: `src/components/transcripts/TranscriptManager.tsx` (11199 b, 282 L, uses `expo-document-picker`, has upload/delete/share) and `src/components/transcripts/TranscriptRequestsCard.tsx` (5970 b, 138 L). Plus a **third** file `src/components/dashboard/TranscriptRequestCard.tsx` (singular Request) that's labeled `RN port of Lovable transcripts/TranscriptManager.tsx (request flavor)`. | See §2 — only `TranscriptRequestsCard` is imported by DashboardScreen; full `TranscriptManager` is **not imported anywhere**. |

Net result: plan's "STILL OPEN" list needs to be rewritten from
scratch. The real remaining work is *wiring*, not *building*. Except
`TeammateInviteModal` which really is a 22-line scaffold.

### `PREP_ONLY-CONTRADICTS_PLAN` — Plan §1 "Confirmed DONE" component paths are wrong

The plan repeatedly references `DashboardScreen.tsx` as the athlete
dashboard "in `src/screens/`". On disk:

- The **athlete tab** mounts `src/screens/shared/DashboardScreen.tsx`
  (the 1400+ line shared athlete/parent screen — via `AthleteTabs.tsx:12,27`)
- `src/screens/athlete/AthleteDashboard.tsx` (124 L) exists but is
  **not mounted by any tab navigator**. It looks like a dead file or
  an earlier version.

All the P0 #2 imports (ProfileCompletionTracker, TermsAcceptanceBanner,
etc.) are in `shared/DashboardScreen.tsx`, not `athlete/AthleteDashboard.tsx`.
This matters because the plan's next reader will look in the wrong file.

---

## 2. "Confirmed DONE" items — static verification results

Each item below has three columns:
1. **On disk?** — file exists at expected/found path
2. **Wired?** — imported and rendered by a real screen that is mounted in a role navigator
3. **Static quality signal** — any red flags observed in the source itself

Nothing here is a runtime pass. `runtime` is the missing column.

| P0 # | Item | On disk? | Wired? | Static signal |
|---|---|---|---|---|
| 1 | AuthContext multi-source role resolver | `src/contexts/AuthContext.tsx` 244 L | wraps App in `App.tsx` | Priority chain admin > high_school_coach > club_coach > coach > scout > influencer > athlete > parent visible in source lines 89-118. Uses `parent_athlete_relationships`, `admin_profiles`, `coach_profiles.is_club_coach`, `scout_profiles`, `influencer_profiles`, `user_roles`. `.maybeSingle()` used only where it's safe (single-user-scoped queries). |
| 12 | Agency routing branch calls real hook | `RootNavigator.tsx` 214 L, `useScoutOrganization` hook at `src/hooks/useScoutOrganization.ts` | RootNavigator imports it on line 7, uses on line 118 | Also used by `ScoutNav.tsx:35,59`, `RoleCardGenerator.tsx:18,55`, `AgencyDashboardScreen.tsx:22,51`. Real, not stub. |
| 2 | Athlete Dashboard imports 11 P0 #2 components | `src/screens/shared/DashboardScreen.tsx` (imports 20+ dashboard components) | Yes, mounted via `AthleteTabs.tsx` line 12 as `DashboardScreen` under `HomeTab` | 12 of the 14 required components are rendered (grep confirmed `<Component />` usage): ProfileCompletionTracker (line 408), MatchSuggestionFeed (410), MyCampAlertSubscriptions (516), TransferPortalFeed (884), ProfileAnalyzer (894), CoachReferencesManager (895), SocialSyndicationCenter (911), OfflineBanner (944), TermsAcceptanceBanner (945), TranscriptRequestsCard (948), SharePlayerCardDialog (987, 1066). **Missing from render**: `ParentInviteModal`, `TeammateInviteModal`, full `TranscriptManager`, and `CampNewsFeed` (imported but not rendered — dead import). |
| 3 | OnboardingScreen 7-step wizard | 42580 b, 1177 L | mounted via `RootNavigator` for post-signup routes | `STEPS = [` constant declared line 67. Only 5 explicit `step === N` branches found (steps 0-4). Might be 7 steps that share branches, or might be 5 steps and the plan overcounted. **Needs runtime walk-through to confirm step count and per-step persistence.** |
| 8 | CoachRosterScreen Kanban pipeline | 19761 b, 530 L | mounted via `CoachTabs.tsx` (needs verify but file is real) | Reads `recruiting_pipeline_stages` + `athlete_pipeline_status` per line 75+. Stage move: `moveAthlete.mutate({ athleteRowId, newStageId })` at line 258. **No drag-and-drop primitive found** (`onDragEnd`, `Draggable`, `DraxProvider`, `reorder` — all empty). It's a tap-to-move-stage flow, not drag-to-move. Plan asks "verify pipeline drag-to-move actually works". Answer from static: **there is no drag interaction** — this is a design deviation from the plan, not a bug. Product decision needed. |
| 15 | ImpersonationContext + Banner + button | Context 82 L, Banner 30 L; `AdminUsersScreen.tsx` line 36 uses `startImpersonation`, line 96 wires the button, line 106 renders "Impersonate" label | Wired | 24hr AsyncStorage expiry per plan. Actual button in `AdminUsersScreen.tsx`. |
| 16 | AdminAuditScreen CSV export | 16125 b, 515 L | mounted in `AdminTabs.tsx` (needs verify) | `csvEscape` function line 50; `exportCsv` handler line 113; uses `expo-sharing`. Real implementation, not stub. **Actual CSV output correctness needs runtime**. |
| 17 | AdminModerationScreen mutates real table | 10387 b, 306 L | wired | Reads/writes `user_reports` table (confirmed exists in DB per §3.4 below). `.update({ status: next })` on line 80. Resolve/Dismiss actions with real supabase call. |
| 18 | AdminLetterAnalytics chart | 11119 b, 346 L | wired | **No native chart library imported.** No `victory-native`, no `react-native-chart-kit`, no `Svg` primitives. Uses hand-rolled `<View>` bars: line 154 `const h = Math.round((d.count / buckets.max) * 100)`, line 158-159 renders `<View style={s.barTrack}><View style={[s.bar, { height: h }]} />`. Plan says "Recharts→native chart port". Reality: **hand-rolled bar bars with fixed-width columns**, not a real chart library. Good enough for basic viz but not for interactivity. |
| 19 | PublicFooter mounted in landing | 7949 b, 252 L | **Yes** — `LandingScreen.tsx` imports on line 40, renders on line 178. This is the "5-minute check" plan called out; it passes. Screen path is `src/screens/auth/LandingScreen.tsx`, not `src/screens/public/LandingScreen.tsx` as plan implied. | |
| 27 | NotificationBell wire-up | 2238 b, 77 L | **Not per-dashboard.** Wired via `src/navigation/role/roleTabScreenOptions.tsx` line 14 — appears as `headerRight` on every role tab automatically. Plan says "wired into each role's dashboard header". Reality: it's wired at the tab-navigator level so it appears on all role tabs uniformly. That's actually **cleaner** than what the plan implies, but the plan reader would grep dashboard files and see nothing. |
| 27 | ShareRoleCardDialog wire-up | 10342 b, 322 L | Wired into: `AgencyDashboardScreen.tsx:35,122,126`, `ClubCoachDashboardScreen.tsx:45,221,223`, `HSCoachDashboardScreen.tsx:46,192,196` (3 dashboards found). **Not wired in** athlete/coach/scout/admin/influencer/parent dashboards from grep. Plan expects "each role" — may be intentional (only certain roles share role cards) or a gap. |

**Summary**: 9 of 11 P0 items look non-stub and wired at least
partially. 2 have caveats needing runtime verification (Kanban drag,
Onboarding step count). 1 has a design deviation (Kanban is tap-to-move
not drag). 1 has a plan-vs-reality wire-point mismatch that isn't a bug
(NotificationBell is wired at navigator, not dashboard, level).

---

## 3. AMBIGUOUS items — Supabase schema probe results

Queried Supabase REST at `https://abdzdcgsmdlnytkkhvtb.supabase.co`
with the anon key from `src/integrations/supabase/client.ts`. Probes are
non-destructive `select=*&limit=0` calls that return either 200 (table
exists + anon can read), 401/403 (RLS blocks anon), or 404 with a
PostgREST hint pointing at the closest actual table name.

### 3.1 `app_role` enum — canonical values

Confirmed by direct enum-membership probe:

**Valid `app_role` values**: `admin`, `moderator`, `athlete`, `parent`,
`coach`, `high_school_coach`, `club_coach`, `scout`, `agency`,
`influencer`, plus `user` and `beta_tester`.

**Invalid** (audit doc used these but they don't exist): `hs_coach`,
`agency_scout`, `superuser`.

Impact on plan: audit doc `04-high-school-coach.md` uses "hs_coach" —
the actual DB name is `high_school_coach`, and the RN AuthContext
correctly uses `high_school_coach` (line 110). No code fix needed;
audit doc terminology is the only thing wrong.

### 3.2 AMBIGUOUS items in `01-athlete.md` — resolved

| Audit question | Answer |
|---|---|
| `letters_received` exists? | **NO** — actual table is `letter_history` (PGRST hint confirms). Anon SELECT works. |
| `athlete_camp_enrollments` exists? | **NO** — actual table is `camp_enrollments`. Anon SELECT works. |
| `athlete_stats` / `athlete_videos` / `athlete_photos` tables? | **NO** — none exist as separate tables. Probably stored in `player_profiles` JSON columns or in `athlete_testimonials` / `athlete_comparisons`. Needs deeper probe. |
| `MatchSuggestionFeed` component exists in RN? | **YES** — `src/components/MatchSuggestionFeed.tsx`, rendered in DashboardScreen.tsx line 410. |

### 3.3 AMBIGUOUS items in `02-parent.md` — resolved

| Audit question | Answer |
|---|---|
| `parent_athlete_relationships` exists? | **YES** — anon SELECT works. Used by AuthContext line 101. |
| `parent_profiles` / `parent_children` tables? | **NO** — neither exists. Parent data is stored in `parent_athlete_relationships` and `parent_consent_records`. |

### 3.4 AMBIGUOUS items in `03-coach.md` / `04-hs-coach.md` / `05-club-coach.md` — resolved

| Audit question | Answer |
|---|---|
| `letters_sent` exists? | **NO** — actual table is `letter_history` (same table as inbound; direction determined by column). |
| `recruiting_pipeline` exists? | **NO** — actual is `recruiting_pipeline_stages` (stages) + `athlete_pipeline_status` (per-athlete state). |
| `athlete_evaluations` / `camp_evaluations` exist? | **NO/PARTIAL** — `camp_drill_evaluations` exists. No generic athlete_evaluations. |
| `coach_recruiting_targets` exists? | **NO** — actual is `coach_reference_tokens` (probably different concern; needs runtime). |
| `hs_coach_profiles` separate table? | **NO** — hint points at `coach_profiles`. HS coaches likely share `coach_profiles` with an is_club_coach-style flag or via `user_roles.role = 'high_school_coach'`. |
| `transcript_requests` exists? | **NO** — actual is `transcript_access_requests` + `academic_transcripts` + `transcript_shares`. |
| `parental_consent` exists? | **NO** — actual is `parent_consent_records`. |
| `clubs` / `club_organizations` exist? | **NO** — only `club_media` and `coaching_staff` exist. Clubs may be modeled via `scout_organizations` + `organization_members` (both exist). Needs runtime confirmation. |
| `news_articles` exists? | **NO** — actual is `sports_news_articles`. |

### 3.5 AMBIGUOUS items in `06-scout.md` — resolved

| Audit question | Answer |
|---|---|
| `scout_organizations` / `scout_organization_members` exist? | `scout_organizations` **YES**. `scout_organization_members` **NO** — actual is `organization_members` (generic). |
| `useScoutOrganization` hook in RN? | **YES** — `src/hooks/useScoutOrganization.ts`. |

### 3.6 AMBIGUOUS items in `07-influencer.md` — resolved

| Audit question | Answer |
|---|---|
| `influencer_blog_posts` exists? | **YES** — anon SELECT works. |
| `influencer_followers` exists? | **NO** — actual is `influencer_follows`. |
| `podcast_episodes` exists? | **YES**. |
| `PodcastPlayerProvider` in RN? | Referenced in `App.tsx` line 25 — provider is wrapped. |

### 3.7 AMBIGUOUS items in `08-admin.md` — resolved

| Audit question | Answer |
|---|---|
| `admin_audit_log` exists? | **YES** — anon SELECT works. |
| `optout_audit` exists? | **NO** — actual is `camp_notification_optout_audit`. |
| `reports` / `flagged_content` exist? | Neither exists under those names. Actual is `user_reports` (used by `AdminModerationScreen.tsx:59,79`) and `platform_content` (may be flagged content). |
| Impersonate hook / button? | Both exist. `useImpersonation` in `ImpersonationContext.tsx`; button in `AdminUsersScreen.tsx:96,106`. |

### 3.8 Complete table inventory (68 tables confirmed on the live DB via anon SELECT)

```
academic_transcripts               admin_audit_log
admin_profiles                     app_reviews
athlete_coach_matches              athlete_comparisons
athlete_pipeline_status            athlete_testimonials
beta_invitations                   camp_alert_subscriptions
camp_drill_evaluations             camp_enrollments
camp_highlight_clips               camp_notification_optout_audit
camp_refund_requests               camps
club_media                         coach_athlete_matches
coach_profiles                     coach_reference_tokens
coaching_staff                     college_camps
contact_events                     conversations
cookie_preferences                 influencer_blog_posts
influencer_content_library         influencer_follows
influencer_profiles                letter_history
media_verifications                message_templates
messages                           nil_school_data
notifications                      organization_members
parent_athlete_relationships       parent_consent_records
platform_content                   platform_messages
player_profiles                    podcast_episodes
podcasts                           position_needs
profile_reminders                  public_player_profiles
recruiting_analytics_events        recruiting_pipeline_stages
referrals                          saved_athletes
saved_camps                        saved_coaches
scout_organizations                scout_profiles
share_card_invites                 sports_news_articles
team_events                        team_invitations
team_media                         team_rosters
teammate_invitations               terms_acceptance
transcript_access_requests         transcript_shares
upgrade_nudges                     user_blocks
user_podcast_progress              user_reports
user_roles                         user_suspensions
```

### 3.9 App.tsx wrapping (audit 00-unauthenticated.md AMBIGUOUS items) — resolved

Read `App.tsx` lines 105-139. Provider chain from outside in:

```
<ErrorBoundary>
  <GestureHandlerRootView>
    <SafeAreaProvider>
      <QueryClientProvider>
        <ThemeProvider>
          <CookiePreferencesProvider>       // <-- confirms plan question
            <SportProvider>
              <AuthProvider>
                <ImpersonationProvider>
                  <AthleteProfileProvider>
                    <PodcastPlayerProvider>
                      <NavigationContainer linking={linking}>
                        <ImpersonationBanner />
                        <OfflineBanner />    // <-- Note: banner, not OfflineAppShell
                        <RootNavigator />
                        <FirstLaunchConsentModal ... />
                      </NavigationContainer>
                      <Toast />
                      <StatusBar />
```

- `ErrorBoundary`: **CONFIRMED PRESENT** at outermost level
- `CookiePreferencesProvider`: **CONFIRMED PRESENT** (audit flagged as AMBIGUOUS)
- `FirstLaunchConsentModal`: **CONFIRMED PRESENT** inside NavigationContainer
- `OfflineAppShell`: **PRESENT ON DISK but NOT WIRED** — `src/components/OfflineAppShell.tsx` (156 L) exists, but grep across `src/**` shows zero call sites. Only `OfflineBanner` is mounted. This is the more specific answer to audit 00-unauthenticated.md's AMBIGUOUS on `OfflineAppShell`: **it was ported but never mounted**. Either intentional (banner is enough) or a wiring gap. Product decision.

### 3.10 linking.ts (audit 00-unauthenticated.md AMBIGUOUS items) — resolved

Read `src/navigation/linking.ts` (215 L). Findings:

- **`/p/:customUrl` → `PublicProfile`** (line 109): mapped
- **`/a/:customUrl` → `AthleteProfileByUrl`** (line 110): mapped
- **`/profile/:customUrl` → `ProfileLegacy`** (line 111): mapped
- All three aliases resolve. Audit question answered.

- **`?parent_token=` handling**: `AuthStack.tsx:25` types the route params as
  `Auth: { mode?; parent_token?: string; redirect? }`. `AuthScreen.tsx:92` reads
  it via `route.params?.parent_token` and defaults to signup tab on line 106.
  `ParentInviteCard.tsx:65` generates the invite URL as
  `${APP_DOMAIN}/auth?parent_token=${token}`. **CONFIRMED WIRED** end to end,
  static-signal only. Runtime test: click a real invite URL, verify signup tab
  activates with token attached.

- **`?mode=reset` handling**: Only found as a TS union type in `AuthStack.tsx:25`
  (`mode?: 'signin' | 'signup' | 'reset'`) and route path `PasswordReset: 'reset-password'` (line 57).
  No explicit query-param parser in linking.ts. React Navigation's default
  `getStateFromPath` handles `?mode=` automatically only when routes are
  declared with `parse:` blocks — none are. **Static signal: `?mode=reset`
  probably does not work as a deep link.** Reset flow uses the `reset-password`
  dedicated route instead. Not necessarily a bug — Lovable and RN may just
  differ on this route shape. Runtime verify.

### 3.11 Still-AMBIGUOUS after schema probe

These can't be resolved without an authenticated Supabase session and
existing test-user data. They need runtime verification:

- **RLS behavior for parent → athlete profile reads** (whether a parent
  user_id can `select` a `player_profiles` row via
  `parent_athlete_relationships`). Anon SELECT returns 200 but that's
  because RLS lets anon read some columns; parent-scoped policy needs
  a logged-in parent to test.
- **Whether `useUnifiedLetterHistory` filter logic covers all 13 letter
  types** — need to look at `letter_history`'s `letter_type` distinct
  values, which anon-role can't get.
- **HS-coach vs regular-coach data separation** — schema shows one
  table (`coach_profiles`); if there's no discriminator column, the
  business logic must be in `user_roles`. Confirmed the enum has
  `high_school_coach` as a distinct role, so the discriminator is
  `user_roles.role`, not a column on `coach_profiles`. But the audit
  question "does HSCoachDashboard auto-bind to a school via
  `profile.school_id`?" still needs runtime.
- **Blog composer web-only vs mobile-included** — file paths exist in
  RN, but table `influencer_blog_posts` may have web-only column
  requirements. Deferred.
- **Parent tokens (`?parent_token=`) in linking.ts** — I did not open
  `linking.ts` in this pass. Still open.

---

## 4. TeammateInviteModal — the one real gap

Reading `src/components/TeammateInviteModal.tsx`:

```
// TODO(session4): Port full implementation from Ch.13 of the conversion guide.
// This is a minimal scaffold so the bundle compiles.
export function TeammateInviteModal(_props: any) {
  return (
    <View style={s.container}>
      <Text>[TeammateInviteModal]</Text>
      <Text>Scaffold — port from Ch.13</Text>
    </View>
  );
}
```

That's it. 22 lines, no state, no supabase call, no submit. Companion
DB table `teammate_invitations` **exists** on live Supabase. The port
work is well-defined: consume the table, render a form matching
`ParentInviteCard.tsx` pattern, use `expo-clipboard` for the invite
link. Estimated <200 LOC based on ParentInviteCard being 40+ L visible
in this pass.

---

## 5. Runtime verification checklist (ready for whichever path you pick)

Ordered by static-signal risk (higher = more likely to fail runtime):

**High priority (static signal already flagged)**:
1. **OnboardingScreen step count** — plan says 7, source shows 5
   `step === N` branches. Sign in as a new athlete, tap through, count
   the actual screens.
2. **CoachRosterScreen tap-to-move vs drag** — plan expects drag; source
   is tap-based. Sign in as a coach, verify moving an athlete between
   pipeline stages works via tap-and-hold or long-press menu.
3. **AdminAuditScreen CSV export** — verify `expo-sharing` actually
   surfaces the CSV file (does iOS Share Sheet appear? On Android does
   the download work?).
4. **AdminLetterAnalytics hand-rolled bars** — verify the bars render
   without overflowing on narrow phones, and the "top 5 senders" or
   similar aggregate is correct.
5. **TranscriptManager vs TranscriptRequestsCard** — DashboardScreen
   renders `<TranscriptRequestsCard />`, not the fuller
   `<TranscriptManager />`. Plan expects the fuller one. Decide: is
   RequestsCard enough for parity, or do we need to swap it in?

**Medium priority (spec-compliant on paper, verify functional)**:
6. **NotificationBell** appears on every role tab (headerRight via
   `roleTabScreenOptions`). Verify unread badge count updates in real
   time when a notification is inserted.
7. **ShareRoleCardDialog** on Agency/ClubCoach/HSCoach dashboards.
   Verify share sheet works, verify the role card image renders correctly
   from `RoleCardGenerator`.
8. **ImpersonationBanner** appears when admin taps Impersonate; verify
   24hr AsyncStorage expiry kicks in.
9. **PublicFooter** links (legal pages) navigate correctly.

**Low priority (nearly certain based on static)**:
10. All 12 rendered dashboard components in DashboardScreen — they
    exist, are imported, and are called with real props. Sanity-check
    each renders without crashing.

**Not verifiable without native runtime**:
- IAP (`expo-iap`) — requires a real device with signed builds and
  StoreKit / Play Billing sandbox
- App Clip flow (`plugins/with-app-clip`) — native-only
- Live Activities (`plugins/with-live-activities`) — iOS 16+ device
- Widgets (`plugins/with-widgets`) — device-only
- Push notifications — requires APNs / FCM cert + physical device
- Camera / QR scan for camp check-in

### 5.1 Test user roster (for the 9-user smoke regression)

Extracted from the per-role audit files. All passwords are test-account only
and appear in the plain audit docs on disk; not treating them as secrets.

| Role | Email | Password | UID |
|---|---|---|---|
| Athlete | `athlete@test.com` | `TestAthlete123!` | `905f060c-f1b7-4944-b283-87bd4e5c1992` |
| Parent | `testparent@offerhound.test` | `TestParent2025!` | `a50cc451-c79f-4bc3-a679-8ac2342b9b6f` |
| Coach | `testcoach@offerhound.test` | `TestCoach2024!` | `16d0e678-b0d2-4b28-8f40-71ccf4f66e90` |
| HS Coach | `hstestcoach@offerhound.test` | `TestHS2026!` | `6506a5b0-c6c1-4359-b44e-66e061fb0a89` |
| Club Coach | `testclubcoach@offerhound.test` | `TestClubCoach2025!` | `4d2d0699-440e-4bff-a89b-cb340de1f9c9` |
| Scout | `testscout@offerhound.test` | `TestScout2025!` | `3496fc18-ab35-4e71-b9ab-dd35f6ae102e` |
| Agency Scout | `testagency@offerhound.test` | `TestAgency2025!` | `7ad47c98-95c0-4a50-b919-f9b6513a0a87` |
| Influencer | `influencer.test@offerhound.com` | `TestInfluencer2024!` | `a1b2c3d4-e5f6-4789-9abc-def012345678` |
| Admin | `admin@offerhound.test` | `AdminAccess2025!` | `a767dcdb-b368-4f0d-91d6-631d3f52fc53` |

Expected tab landings per role (from RootNavigator.tsx:99-109):
- `athlete` → `AthleteTabs`
- `parent` → `ParentTabs`
- `coach` → `CoachTabs`
- `high_school_coach` → `HSCoachTabs`
- `club_coach` → `ClubCoachTabs`
- `scout` → `ScoutTabs` (then downstream branch to `AgencyTabs` via `useScoutOrganization()`)
- `influencer` → `InfluencerTabs`
- `admin` / `moderator` → `AdminTabs`

Agency scout test user is the one whose `useScoutOrganization()` should return
a non-null org and reroute from ScoutTabs to AgencyTabs. That's the ideal runtime
smoke case for P0 #12 (agency routing fix).

---

## 6. Working-tree state (nothing pushed, nothing committed)

Repo: `/home/ubuntu/offerhound-rn-v2` on branch
`session-parity-port-phase1-2` at HEAD `b059aac`.

**Modified files** (from the aborted worker run, safe to revert):
- `package.json` — added `react-native-web@~0.21.2`, `react-dom@19.2.0`
- `pnpm-lock.yaml` — matches
- `tsconfig.json` — touched, contents not yet diffed

**Untracked files created this session**:
- `parity-audit/verify_phase1.py` — 39.9 KB. Grades all 17 screenshots
  as PASS. Do not run.
- `parity-audit/diagnose_app.py` — smaller diagnostic. Not useful now.
- `parity-audit/screenshots/phase1/*.png` — 18 blank white 5335 b files.
  Fraudulent evidence if kept. Recommend `rm -rf`.
- `parity-audit/STATIC_PREP_2026-07-15.md` — this file.

Revert command if desired:
```
cd /home/ubuntu/offerhound-rn-v2
git checkout -- package.json pnpm-lock.yaml tsconfig.json
rm -rf parity-audit/verify_phase1.py parity-audit/diagnose_app.py \
       parity-audit/screenshots
```

The STATIC_PREP report itself is safe to keep — it doesn't claim
runtime evidence.

---

## 7. What this changes for the runtime pass

- Phase 1 verification pass is now **~40% smaller** since the "wire it
  in" checks resolved to "already wired" for 9 of 11 items.
- Phase 2 "close STILL OPEN items" is really just:
  - Port `TeammateInviteModal` (real 200-LOC job, table exists)
  - Wire `ParentInviteModal` (`src/components/ParentInviteModal.tsx`,
    538 L, exists but not imported) OR keep `ParentInviteCard`
    (existing dashboard variant) — product decision
  - Wire full `TranscriptManager` (`src/components/transcripts/TranscriptManager.tsx`,
    282 L, exists but not imported) OR keep `TranscriptRequestsCard` —
    product decision
- Phase 3 (Builds 32-35) is unchanged — those items were not touched by
  this prep pass.
- Phase 4 (~40 AMBIGUOUS items) is **mostly resolved**. Remaining
  authenticated-only items listed in §3.9 — 4 items, all of which
  need a signed-in test user session to answer.
