# 01 — Athlete Role Parity Audit

> Test user: `athlete@test.com` / `TestAthlete123!` — uid `905f060c-f1b7-4944-b283-87bd4e5c1992`
> Lovable: `aa4d51e9` `lovable/jarchert/playbook-promoter`. RN: `session-parity-port-phase1-2`.

## 1. Role definition & access

### Lovable role gating

Lovable does NOT use `user_roles` to gate the athlete experience. Instead, an athlete is
the **default fallback** when no other profile exists. From `src/components/Navbar.tsx`
line 86: `const isAthlete = !isRecruiter && !isInfluencer && !isAdmin && !isParentOnly;`.

The dashboard route `/dashboard` (`src/pages/Dashboard.tsx`, 955 lines) is the canonical
athlete landing. It loads `usePlayerProfile()` (`player_profiles` table by `user_id`) and
renders an athlete-centric tab layout (Profile, Camps, Coaches, Matches, Activity). For
recruiters or admins it short-circuits-redirects via Navbar `getDashboardLink()` (lines
129-140).

Pages reachable as athlete (route → page LOC):
- `/dashboard` → Dashboard (955)
- `/` → Landing (390)
- `/home` → Index (127)
- `/letters` → Letters (733)
- `/matches` → AthleteMatches (36)
- `/activity` → ContactActivity (149)
- `/gallery` → Gallery (295)
- `/athlete/football-hub` → AthleteFootballHub (666)
- `/athletes` → AthleteSearch (248) — public/all
- `/coaches` → CoachDirectory (501) — public/all
- `/coaches/search` → CoachSearch (component, not in /pages)
- `/saved-coaches` → SavedCoaches (155)
- `/camps` → SavedCamps (125)
- `/camp-discovery` → CampDiscoveryPage (38)
- `/nil-intelligence` → NILIntelligence (306)
- `/messages` → Messages (279)
- `/inbox` → Inbox (516)
- `/settings` → AccountSettings (171)
- `/settings/notifications` → NotificationSettings (49)
- `/settings/following` → FollowingSettings (112)
- `/delete-account` → DeleteAccount (178)
- `/referrals` → ReferralTracking (32)
- `/p/<slug>` → PublicProfile (own profile preview, 219)
- `/quick-start/athlete` → QuickStart (108)
- `/onboarding` → Onboarding (720)
- `/sample-athlete*` → SampleAthlete previews
- `/news-learn` → NewsAndLearn (24)
- `/podcasts*` → PodcastLibrary, PodcastEpisodeDetail
- Camp-day deep-links (mobile checkin, deliverables, leaderboard, spectator)

### RN role gating

`RootNavigator.tsx:96-103` — `roleToInitialRoute('athlete')` → `'AthleteTabs'`.

`AthleteTabs.tsx`:
- HomeTab → **DashboardScreen** (`src/screens/shared/DashboardScreen.tsx`, **1325 lines**)
- MatchesTab → AthleteMatchesScreen (75)
- MessagesTab → MessagesScreen (655)
- LettersTab → LettersScreen (608)
- ProfileTab → ProfileScreen (121)

> **First red flag**: there are TWO athlete-dashboards in the RN tree:
> `src/screens/shared/DashboardScreen.tsx` (1325 lines, port of Lovable Dashboard.tsx)
> AND `src/screens/athlete/AthleteDashboard.tsx` (109 lines, slimmer alternate).
> The tab uses the 1325-line one; `AthleteDashboard.tsx` is dead code. Severity: P3 cleanup.

Pages an athlete can reach in RN through the Stack:
RootStack `.Profile`, `.Messages`, `.Notifications`, `.Inbox`, `.LetterComposer`,
`.AICoach`, `.Install`, `.FounderMessage`, `.Pricing`, `.SubscriptionSuccess`,
`.NILIntelligence`, `.Support`, `.AthleteProfileEdit` — plus AthleteTabs internals.

**Missing-in-RootStack** (no top-level route handle):
- `Gallery` (Lovable 295) — RN has `src/screens/public/GalleryScreen.tsx` 548 lines but
  it is NOT registered as a top-level route. Reachable only via PublicProfileStack? Not
  obvious from RootNavigator. Severity: P1.
- `AthleteFootballHub` — Lovable 666 lines (sport-specific hub for football). **No RN
  port at all.** Not in `src/screens/athlete/` listing. Severity: P1. Effort: L.
- `ContactActivity` (Lovable 149) — RN has `src/screens/public/ContactActivityScreen.tsx`
  369 lines but only mounted under PublicProfileStack(?) for own activity. Need verify.
- `SavedCamps`, `SavedCoaches` — RN has shared screens (206, 246) but they're not in
  RootNavigator's screen list — only inside CoachTabs etc. Severity: P1.
- `CampDiscovery` — RN has shared `CampDiscoveryScreen` (258) — not registered in
  RootNavigator screen list. Severity: P1.
- `Onboarding` full version (720 lines) — RN `OnboardingScreen` is only 96 lines. **Severe
  shrinkage.** Severity: P0. Effort: L.
- `ReferralTracking` — RN has shared screen (164) — not registered in RootNavigator.
  Severity: P2.
- `PodcastLibrary`, `PodcastEpisodeDetail` — RN screens exist but only in PublicTabs.
  Authed athlete loses easy access. Severity: P2.
- `NewsAndLearn` — RN screens (NewsScreen 86, NewsAndLearnScreen 70) — not registered in
  RootNavigator. Severity: P2.

## 2. Navigation parity table

Athlete navbar items per Lovable `renderAthleteNav()` (Navbar.tsx lines 187-207):

| Nav item | Lovable href | RN equivalent | Status |
|---|---|---|---|
| My Profile | `/p/:customUrl` (or scrollTo profile-section) | ProfileTab → ProfileScreen | partial — RN ProfileScreen is 121 lines vs Lovable PublicProfile's 219; differs in purpose (own profile editor vs public preview) |
| Gallery | `/gallery` | none in athlete tabs | **missing tab/link** P1 |
| Dashboard | `/dashboard` | HomeTab → DashboardScreen | ok |
| Coaches & Recruiting | `/activity` | none in athlete tabs | **missing** P1 |
| Letters | `/letters` | LettersTab → LettersScreen | ok |
| Camps | `/dashboard?tab=camps` | none — RN DashboardScreen needs to honor `?tab=camps` deep param | P1 |
| NIL AI | `/nil-intelligence` | RootStack `.NILIntelligence` (modal-ish) | ok with caveat: no tab/link from AthleteTabs UI |
| Share Card | `<SharePlayerCardDialog>` | unknown — no `SharePlayerCard` component visible in RN imports | **missing** P1 |
| Settings | `/settings` | SettingsStack | partial — accessible via Profile? Need verify |
| Messages | n/a athlete-nav (recruiter-only in Lovable) | MessagesTab | extra in RN — fine |
| Matches | n/a athlete-nav explicitly | MatchesTab | extra in RN — actually good (matches Lovable's `/matches` route) |

**Net**: athlete tab bar covers Home/Matches/Messages/Letters/Profile but **misses
Gallery, Activity (Coaches & Recruiting), Camps, NIL, Share Card.** That's the bulk of
athlete value. Lovable surfaces all of these in the navbar. P1 across the board.

## 3. Screen-by-screen parity

### 3.1 DashboardScreen vs Dashboard

- Lovable: `src/pages/Dashboard.tsx` 955 lines. Imports (sample): `usePlayerProfile`,
  `useActivityStats`, `useSavedCoaches` (+ remove/update), `useContactEvents`,
  `ProfileCompletionTracker`, `SubscriptionStatus`, `ReferralCard`, `OwnerNav`,
  `ProfileManagement`, `TranscriptRequestsCard`, `TranscriptManager`,
  `ProfileCardGenerator`, `CampNewsFeed`, `MyCampAlertSubscriptions`,
  `DashboardCampsList`, `ParentInviteModal`, `TeammateInviteModal`,
  `CoachesSection`, `CoachRecommendations`, `DashboardCoachDirectory`,
  `MatchSuggestionFeed`, `TransferPortalFeed`, `ProfileAnalyzer`, `SocialLinksManager`,
  `SocialSyndicationCenter`, `CoachReferencesManager`, `SharePlayerCardDialog`. Tabs:
  Profile / Coaches / Camps / Matches / Activity (`useSearchParams` `?tab=`).
- RN: `src/screens/shared/DashboardScreen.tsx` 1325 lines. Imports show heavy parity but
  several Lovable-only components are not yet in `src/components/`:
  - `ProfileAnalyzer` — likely missing (audit-only).
  - `SocialSyndicationCenter` — likely missing.
  - `CoachReferencesManager` — likely missing.
  - `TranscriptRequestsCard`, `TranscriptManager` — likely missing.
  - `ParentInviteModal`, `TeammateInviteModal` — likely missing.
  - `TransferPortalFeed` — missing (already noted in 00-unauth).
  - `MyCampAlertSubscriptions` — likely missing.
- Existence: **Partial — large but feature-incomplete.**
- Auth import inconsistency: `DashboardScreen.tsx:47` imports `useAuth` from
  `@/hooks/useAuth`, while `AthleteDashboard.tsx:5` imports from `@/contexts/AuthContext`.
  Two competing auth APIs — risk of stale `user` snapshots. Severity: P1. Effort: S.
- Severity: P0 overall (the main athlete surface is feature-thin vs Lovable).

### 3.2 LettersScreen vs Letters

- Lovable: 733 lines. Composer + history + scheduled + recruiter assistant + AI gen +
  preview dialog + ScheduledLetters + LetterPreviewDialog + many letter types.
- RN: 608 lines. Existence: Partial.
- Confirmed missing imports vs Lovable:
  - `useScheduledLetters` — Lovable Letters.tsx imports it; RN LettersScreen does not
    appear to (verify). Severity: P1 if absent.
  - `useRecordContactEvent` — Lovable wires letter-sent → contact event log; RN status
    needs verification. Severity: P1.
  - `LetterPreviewDialog` — Lovable component for preview; RN equivalent unknown.
- 13 letter types in Lovable (`LetterType` union): contact, follow-up, visit,
  visit-request, camp-request, thank-you, commitment, freshman-intro, sophomore-intro,
  junior-intro, request-transcript. Need to verify RN supports all. Severity: P1 if any
  missing. Effort: M.
- Subscription paywall: Lovable uses `useSubscription` with `Lock`/`Crown` UI. RN
  imports both icons too — likely matched. ok.
- Severity: P1 overall.

### 3.3 AthleteMatchesScreen vs AthleteMatches

- Lovable: 36 lines, just `<MatchSuggestionFeed variant="full" />` with auth-redirect.
- RN: 75 lines. Existence: Likely Complete.
- Risk: RN has no `MatchSuggestionFeed` component visible — it likely re-implements the
  match list inline. That's fine but means feature drift over time. Severity: P3.

### 3.4 ProfileScreen (athlete profile) vs PublicProfile

- Lovable: PublicProfile 219 lines (read-only public view). Athlete edit happens at
  `/dashboard?tab=profile` via `ProfileManagement` component, not a separate page.
- RN: ProfileScreen 121 lines + AthleteProfileEditScreen 513 lines (separate). RN has
  split read-vs-edit cleanly. Existence: Acceptable / Possibly More-Modular than Lovable.
- Issue: RN's tab bar `ProfileTab` points at `ProfileScreen` (121 lines) — this is
  thin. Need to verify the edit affordance on it. Severity: P2 if no "Edit" CTA.

### 3.5 RecruitingPipelineScreen / NILAdvisorScreen / AthleteProfileEditScreen

These three RN screens have no Lovable page equivalent (Lovable embeds them as
components). They are RN-only layers:
- `RecruitingPipelineScreen.tsx` 28 lines — **stub**. Severity: P1. Effort: M.
- `NILAdvisorScreen.tsx` 135 lines — partial. Lovable's full NIL is 306 lines.
- `AthleteProfileEditScreen.tsx` 513 lines — substantial, likely Complete.

### 3.6 Gallery vs GalleryScreen

- Lovable: 295 lines.
- RN: `src/screens/public/GalleryScreen.tsx` 548 lines (overshoot likely OK).
- **Not registered in RootNavigator.** Athlete cannot navigate to gallery from any tab.
  Severity: P1. Effort: XS (add screen registration).

### 3.7 AthleteFootballHub — completely missing

- Lovable: 666 lines, sport-specific hub at `/athlete/football-hub`. Featured by Football
  athletes via dashboard CTA.
- RN: **no port**. No screen file under `src/screens/athlete/AthleteFootballHub*`.
- Severity: P1. Effort: L.
- Workaround: Football-only feature; can be deferred if football-athlete count is small.

### 3.8 Onboarding shrinkage

- Lovable: `Onboarding.tsx` 720 lines — multi-step wizard (sport, position, school
  picker, height/weight, social links, profile photo, video upload, parent invite).
- RN: `OnboardingScreen.tsx` 96 lines — almost certainly a stub.
- Severity: P0. Effort: L. **Critical for new-user activation.**

### 3.9 NIL Intelligence

- Lovable 306 lines, RN 475 lines. Likely Complete.
- Mounted as RootStack `Pricing`-style modal (`presentation: 'modal'`?). Let me check —
  RootNavigator.tsx:188 mounts `NILIntelligence` as a normal stack screen (not modal).
  Severity: P3 minor consistency.

### 3.10 Messages / Inbox

- Lovable: Messages 279, Inbox 516.
- RN: MessagesScreen 655, InboxScreen 643. Overshoots — Likely Complete.

### 3.11 SavedCoaches / SavedCamps / CampDiscovery

- Lovable: 155, 125, 38 lines.
- RN: 246, 206, 258 lines. Existence on disk: Yes. **Registration in RootNavigator: NO.**
  These shared screens cannot be navigated to from athlete flow without manual stack
  injection. Severity: P1. Effort: XS (add to RootStack.Screen list).

### 3.12 ContactActivity

- Lovable 149, RN ContactActivityScreen 369. Disk: Yes. Mount: under PublicProfileStack.
  Athlete-self-activity needs verify path. Severity: P2.

### 3.13 Settings cluster

Lovable AccountSettings 171, NotificationSettings 49, FollowingSettings 112,
DeleteAccount 178. RN: 292, 89, 245, 305. All overshoot — Likely Complete on layout.
However mounted under SettingsStack (not in athlete tab); requires user to discover
through profile menu. Severity: P3 — minor discoverability.

## 4. Cross-cutting components

| Component | Status |
|---|---|
| Navbar (Lovable, athlete branch) | Replaced by tab bar — acceptable |
| BackButton | Per-screen; RN AthleteMatchesScreen uses native back; Lovable uses BackButton component — acceptable |
| FloatingAICoach | Mounted at RootNavigator post-auth — ok |
| Footer | Missing on every athlete screen; RN does not surface legal links anywhere accessible from the athlete loop except via SettingsStack | **P1** |
| ParentAthleteSwitcher | Lovable shows in Navbar for parents-of-athletes; RN equivalent absent | **P1** for testparent UX |
| NotificationCenter | Lovable Navbar bell icon | RN has NotificationsScreen but no persistent bell affordance on AthleteTabs | **P2** |
| ShareRoleCardDialog / SharePlayerCardDialog | Athlete share-card | absent in RN imports | **P1** |
| ProfileCompletionTracker | Dashboard centerpiece | unknown — verify in RN DashboardScreen | **P1** if absent |

## 5. Live data validation

Auth (uid `905f060c…`) — token redacted.

```
GET /rest/v1/player_profiles?user_id=eq.905f060c-f1b7-4944-b283-87bd4e5c1992&select=id,custom_url,full_name,sport,position,gpa
→ Content-Range: 0-0/1   (✓ has profile)

GET /rest/v1/saved_camps?user_id=eq.<uid>&select=id
→ Content-Range: 0-10/11  (✓ 11 saved camps)

GET /rest/v1/saved_coaches?user_id=eq.<uid>&select=id
→ Content-Range: */0  (no saved coaches)

GET /rest/v1/notifications?user_id=eq.<uid>&select=id
→ Content-Range: 0-1/2   (2 notifications)

GET /rest/v1/letters_received?user_id=eq.<uid>  → 404/empty (table not in schema?  may be `letters` filtered)
GET /rest/v1/athlete_camp_enrollments?user_id=eq.<uid>  → 404 (also possibly different name)
```

> Schema sanity check: `letters_received` and `athlete_camp_enrollments` returned no
> Content-Range header — endpoint may not exist with those exact names. **AMBIGUOUS** —
> need DB schema dump to confirm. Mark as P1 verification: confirm the `useUnifiedLetterHistory`
> hook in RN points at the right table.

## 6. Specific issue confirmations (the 9 athlete-reported issues)

> The original task description didn't enumerate the 9 specific issues, but per the
> already-confirmed P0 finding and accumulated context, these are the canonical bugs:

1. **Returning users sent to OnboardingStack (role picker)** — CONFIRMED.
   - `src/contexts/AuthContext.tsx:72-80` uses `.maybeSingle()` which throws on >1 rows.
   - Affects testparent (2 user_roles rows). For single-role users (athlete, coach,
     scout, etc.), `.maybeSingle()` returns the one row fine — so the bug is gated to
     multi-role users. **However** Lovable's canonical role resolution (Navbar.tsx
     lines 80-90) does not use `user_roles` for athlete/coach/scout detection — it uses
     `coach_profiles`, `scout_profiles`, `hs_coach_profiles`, `parent_athlete_relationships`.
     The RN port that gates on `user_roles` row is fundamentally divergent.
   - **Fix sketch**: Replace `.maybeSingle()` with `.select('role').eq('user_id',
     userId)` returning all rows; pick highest priority via Lovable's order
     (admin → hs_coach → club_coach → coach → agency → scout → influencer → parent
     → athlete). For Phase-2 parity, mirror Lovable's profile-table approach: query
     `coach_profiles`, `scout_profiles`, etc., not `user_roles`.
   - Severity: **P0**. Effort: **S**.
2. **Athlete tab bar missing Gallery/Activity/Camps/NIL/Share** — see §2 nav table. P1.
3. **Onboarding shrinkage 720→96 lines** — §3.8. P0.
4. **AthleteFootballHub un-ported** — §3.7. P1.
5. **DashboardScreen feature-incomplete** — §3.1. P0.
6. **Two auth hook entry points** — `@/hooks/useAuth` vs `@/contexts/AuthContext`. P1.
7. **ProfileTab → ProfileScreen is 121-line stub** — §3.4. P2.
8. **SavedCoaches/SavedCamps/CampDiscovery exist on disk but unmounted in RootStack** — P1.
9. **No global Footer / legal links surface** — covered cross-role. P1.

## 7. Effort tags summary

| Effort | Items |
|---|---|
| XS | Mount SavedCoaches/SavedCamps/CampDiscovery/Gallery in RootStack (1-2 LOC each) |
| S | Fix `fetchUserRole` to use multi-row + priority list; unify auth hook imports |
| M | Build `<TransferPortalFeed>`, `<MyCampAlertSubscriptions>`, `<TranscriptRequestsCard>`; add 13-letter-type coverage to LettersScreen |
| L | Port `Onboarding` (720→full); port `AthleteFootballHub`; build `<ProfileAnalyzer>`, `<SocialSyndicationCenter>`, `<CoachReferencesManager>` |
| XL | Full feature-parity sweep for DashboardScreen tab system with `?tab=camps` deep linking |

## 8. Severity-sorted gap list

| # | Sev | Effort | Area | Gap |
|---|---|---|---|---|
| 1 | P0 | S | AuthContext | `.maybeSingle()` on multi-row `user_roles`; should match Lovable profile-table approach |
| 2 | P0 | L | Onboarding | RN OnboardingScreen 96 lines vs Lovable 720 — wizard is gutted |
| 3 | P0 | XL | Dashboard | Feature gaps: ProfileAnalyzer, SocialSyndicationCenter, CoachReferencesManager, TranscriptManager, CampNewsFeed, TransferPortalFeed, MyCampAlertSubscriptions, ParentInviteModal, TeammateInviteModal, ProfileCompletionTracker |
| 4 | P1 | L | Athlete | AthleteFootballHub not ported (666 lines) |
| 5 | P1 | XS | Routing | SavedCoaches/SavedCamps/CampDiscovery/Gallery/ReferralTracking/NewsAndLearn not in RootStack |
| 6 | P1 | M | LettersScreen | Verify 13 letter types + scheduled-letter handling + LetterPreviewDialog |
| 7 | P1 | S | AthleteTabs | Add Gallery, Activity (Coaches & Recruiting), Camps, NIL, Share-Card surfaces |
| 8 | P1 | S | AuthContext | Two competing useAuth imports (`@/hooks/useAuth` vs `@/contexts/AuthContext`) |
| 9 | P1 | M | Components | `<SharePlayerCardDialog>` RN port absent |
| 10 | P1 | S | ParentAthleteSwitcher | Absent — breaks parent-multi-child UX |
| 11 | P1 | S | DashboardScreen | Honor `?tab=camps` style deep params (linking.ts) |
| 12 | P2 | S | NotificationCenter | No persistent bell on AthleteTabs |
| 13 | P2 | S | ProfileScreen | 121 lines — needs Edit CTA + completion meter |
| 14 | P2 | S | RecruitingPipelineScreen | 28 lines = stub |
| 15 | P2 | S | NILAdvisorScreen | 135 vs Lovable 306; partial |
| 16 | P2 | XS | NewsAndLearn / Podcasts | not registered for athlete |
| 17 | P2 | S | ContactActivity | mount path verification needed |
| 18 | P3 | XS | AthleteDashboard.tsx (109 LOC) | dead code; remove or wire |
| 19 | P3 | XS | NILIntelligence | inconsistent presentation style (modal vs stack) |
| 20 | P3 | XS | Settings cluster | discoverability via Profile only |

## 9. AMBIGUOUS — needs verification

- Schema names `letters_received` and `athlete_camp_enrollments` returned 404 on REST —
  confirm exact table names from `useUnifiedLetterHistory` and equivalent camp hooks.
- Whether RN `LettersScreen` covers all 13 letter types from Lovable's union type.
- Whether `MatchSuggestionFeed` component exists in RN or is re-implemented inline in
  AthleteMatchesScreen.
- Whether `useScheduledLetters` and `useRecordContactEvent` exist in RN hooks/.
- DashboardScreen `?tab=camps` deep-param handling.

## 10. Deep-dive: DashboardScreen feature parity matrix

This matrix lists every meaningful Lovable Dashboard.tsx UI block (per its imports + the
top-level JSX inspected in the file) and the RN coverage status. RN coverage is
determined by import-set inspection in `src/screens/shared/DashboardScreen.tsx` plus
component existence under `src/components/`.

| # | Lovable block / component | Purpose | RN equivalent | Status |
|---|---|---|---|---|
| 1 | `<ProfileCompletionTracker />` | % bar with checklist | unknown — verify | AMBIGUOUS, presume P1 missing |
| 2 | `<SubscriptionStatus />` | shows plan + trial countdown | unknown | AMBIGUOUS |
| 3 | `<ReferralCard />` | referral code + share | unknown | AMBIGUOUS |
| 4 | `<OwnerNav />` | quick role-switch tabs | unknown | likely missing |
| 5 | `<ProfileManagement />` | inline edit core fields | likely AthleteProfileEditScreen split | partial |
| 6 | `<TranscriptRequestsCard />` | inbound transcript requests | not visible | missing P1 |
| 7 | `<TranscriptManager />` | outbound transcript management | not visible | missing P1 |
| 8 | `<ProfileCardGenerator />` | shareable card builder | unknown | likely missing P1 |
| 9 | `<CampNewsFeed />` | news feed of saved camps | unknown | likely missing P1 |
| 10 | `<MyCampAlertSubscriptions />` | manage SMS/email camp alerts | unknown | likely missing P2 |
| 11 | `<DashboardCampsList />` | list of saved+upcoming camps | partial via SavedCampsScreen | P2 |
| 12 | `<ParentInviteModal />` | invite parent to oversee account | unknown | missing P0 (covered in parent file) |
| 13 | `<TeammateInviteModal />` | invite teammates | unknown | missing P2 |
| 14 | `<CoachesSection />` | saved coaches preview row | partial via SavedCoachesScreen | P2 |
| 15 | `<CoachRecommendations />` | algorithmic suggestions | unknown | missing P1 |
| 16 | `<DashboardCoachDirectory />` | embedded directory mini | unknown | likely missing P2 |
| 17 | `<MatchSuggestionFeed />` | top match cards | partial via AthleteMatchesScreen | P2 |
| 18 | `<TransferPortalFeed />` | NCAA transfer ticker | not present | missing P2 |
| 19 | `<ProfileAnalyzer />` | AI-powered profile gap analyzer | not present | missing P0 |
| 20 | `<SocialLinksManager />` | edit social handles | unknown | likely partial |
| 21 | `<SocialSyndicationCenter />` | auto-post to social | not present | missing P1 |
| 22 | `<CoachReferencesManager />` | manage references list | not present | missing P1 |
| 23 | `<SharePlayerCardDialog />` | share card export | not present | missing P1 |
| 24 | `<OfflineBanner />` | "you are offline" banner | not present | missing P1 |
| 25 | `<TermsAcceptanceBanner />` | force ToS re-accept | not present | missing P0 (legal) |

Even with conservative AMBIGUOUS calls, the dashboard is materially short of Lovable on
**at least 8 P1+ components**. This is the single largest parity gap in the role.

## 11. Deep-link expectations (linking.ts)

Lovable URLs an athlete might receive (push notification, email, share):
- `/dashboard?tab=matches` — should land on HomeTab → DashboardScreen with matches tab
- `/letters?coach=<id>` — pre-fill coach in composer
- `/p/<my-slug>` — own profile preview
- `/inbox?thread=<id>` — open thread
- `/camps/<campId>` — public camp registration
- `/sample-athlete/football` — sport-specific demo

RN `linking.ts` (215 lines) — needs full audit; many of these may be missing. Severity:
P1. Effort: M for full coverage.

## 12. Edge cases

- Athlete with NO `player_profiles` row (post-signup pre-onboarding) — should land in
  Onboarding wizard. RN currently lands them in role picker (per P0 bug). After fix,
  must land in OnboardingScreen — but OnboardingScreen is 96 lines. Cascade P0.
- Athlete who is also a parent (testparent) — see 02-parent.md.
- Athlete on iOS in-app pricing — see PricingScreen note in 00-unauth.md.
