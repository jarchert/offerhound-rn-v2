# BUILD PLAN — OfferHound RN Parity Closure

> Target: ship a series of small, testable builds that systematically close the gaps
> identified in the per-role audits and `MASTER.md`.
> Phasing principle: P0 first, cross-cutting fix-once-benefit-many work next, role-deep
> work last. Each build ≤ 3 days of focused work.

---

## Build 24 — Auth & Routing Foundation (1.5 days)

**Goal**: Stop sending real users into the role-picker and unblock multi-role testparent.

### Changes
1. `src/contexts/AuthContext.tsx` — replace `fetchUserRole` with the multi-source
   resolver from MASTER.md §4A. Reads: `user_roles`, `coach_profiles`,
   `scout_profiles`, `hs_coach_profiles`, `influencer_profiles`,
   `parent_athlete_relationships`. Picks priority: admin > hs_coach > club_coach >
   coach > scout > influencer > parent > athlete.
2. `src/navigation/RootNavigator.tsx` — when role is `parent` AND user also has athlete
   row OR linked athletes via `parent_athlete_relationships`, render AthleteTabs (not
   ParentTabs) and add a `ParentDashboardModal` accessible from the account menu.
3. `src/navigation/RootNavigator.tsx` — remove `'agency' as UserRole` cast; add a
   runtime check after auth that swaps to `AgencyTabs` when
   `scout_organizations.owner_user_id = uid` returns 1+ row.
4. Unify `useAuth` import: change `@/hooks/useAuth` to a re-export of
   `@/contexts/AuthContext`'s hook. Codemod screens using the old path.

### Smoke-test checklist
- [ ] Sign in as testparent → AthleteTabs (not OnboardingStack).
- [ ] Sign in as testagency → AgencyTabs (not ScoutTabs).
- [ ] Sign in as testscout → ScoutTabs.
- [ ] Sign in as athlete@test.com → AthleteTabs.
- [ ] Sign in as testcoach → CoachTabs.
- [ ] Sign in as testclubcoach → ClubCoachTabs.
- [ ] Sign in as hstestcoach → HSCoachTabs.
- [ ] Sign in as influencer.test → InfluencerTabs.
- [ ] Sign in as admin → AdminTabs.
- [ ] Sign out → PublicTabs.

### Out-of-scope for B24
- Tab content changes. New screens. Navigation polish.

---

## Build 25 — Tab-Bar Triage (1 day)

**Goal**: Fix wrong-screen mounts and add missing core tabs without changing component
internals. All XS effort.

### Changes
1. `CoachTabs.tsx`:
   - DirectoryTab: swap `CoachSearchAthletesScreen` → `AthleteSearchScreen`.
   - CampsTab: swap `CampsScreen` → `CoachCampsScreen`.
   - Add MessagesTab + InboxTab (drop unused tab if needed for 5-tab cap).
2. `HSCoachTabs.tsx` — add AthleteSearchTab, MessagesTab, InboxTab.
3. `ClubCoachTabs.tsx` — CampsTab → `CoachCampsScreen`; add MessagesTab, InboxTab.
4. `ScoutTabs.tsx` — add AthleteSearchTab, MessagesTab, InboxTab. Move OnboardingTab
   to a one-time stack screen.
5. `AgencyTabs.tsx` — LettersTab swap `CoachLettersScreen` → `ScoutLettersScreen`.
   Add MembersTab and OrgSettingsTab.
6. `ParentTabs.tsx` — add MessagesTab, InboxTab. (Note: in B24 most parents will already
   route to AthleteTabs, but parent-only users still hit ParentTabs.)
7. `InfluencerTabs.tsx` — add MessagesTab; add "View My Profile" link from
   InfluencerDashboard header.
8. `AthleteTabs.tsx` — add NotificationsTab OR a header bell affordance.

### Smoke-test checklist
- [ ] Each role's tab bar has at minimum: Dashboard, primary action, Messages, Inbox.
- [ ] Tap Messages from each role → opens MessagesScreen with the correct user context.
- [ ] CoachTabs DirectoryTab: search athletes by sport returns rows.
- [ ] AgencyTabs LettersTab shows scout letter UI (not coach UI).
- [ ] ClubCoachTabs CampsTab shows club-coach-specific camp list.

---

## Build 26 — Public Surface & Compliance (2 days)

**Goal**: App Store / Play Store review readiness.

### Changes
1. `src/components/PublicFooter.tsx` — new component with: Pricing, Founder Message,
   Install, Support, Terms, Privacy, Cookies, CCPA, Accessibility, Community
   Guidelines, Coach Communication Rules, Parent Trust Safety, Sample Athlete, App
   Store badge, social links.
2. `src/screens/auth/LandingScreen.tsx` — append `<PublicFooter />` at bottom of
   ScrollView.
3. `src/screens/legal/_LegalLayout.tsx` — add ParentTrustSafetyScreen and
   CoachCommunicationRulesScreen to LegalStack.
4. `src/components/FirstLaunchConsentModal.tsx` — first-launch privacy / cookie
   acknowledgement (App Tracking Transparency pre-prompt for iOS).
5. `App.tsx` — mount `<FirstLaunchConsentModal />` once on app start, gate by
   AsyncStorage flag.
6. `PricingScreen.tsx` — add `Platform.OS === 'ios' && shouldHidePricingUI()` gate
   matching Lovable.
7. `linking.ts` — add deep-link mappings for `/coaches`, `/scouts`, `/athletes`,
   `/influencers`, `/discover/clubs`, `/camp-discovery`, `/news-learn`, `/podcasts`,
   `/sample-athlete*`, `/founder-message`, `/install`, `/support`, `/pricing`,
   `/nil-intelligence`, `/p/:slug`, `/profile/:slug`, `/athlete/:slug`.

### Smoke-test checklist
- [ ] Fresh install → consent modal shown once, dismisses cleanly.
- [ ] Landing scroll → footer visible with all legal links.
- [ ] Tap each footer legal link → opens corresponding legal screen.
- [ ] Open `/pricing` on iOS test build → pricing UI hidden per gate.
- [ ] Open `/pricing` on Android → pricing visible.
- [ ] Deep link `https://offerhound.com/p/<known-slug>` → resolves to PublicProfileScreen.

---

## Build 27 — Notification & Share-Card Surface (1.5 days)

### Changes
1. `src/components/AppHeader.tsx` — header bar with logo + notification bell + account
   avatar. Drop into top of every role tab navigator's screens via wrapper.
2. `src/components/NotificationBell.tsx` — fetches `notifications` table count, badge,
   tap → NotificationsScreen.
3. `src/components/ShareRoleCardDialog.tsx` — single component with `role` prop
   ('athlete'|'coach'|'club_coach'|'hs_coach'|'scout'|'influencer'). Generates a
   shareable card with role-appropriate copy.
4. Wire ShareRoleCardDialog from each role's dashboard header.

### Smoke-test checklist
- [ ] Notification bell shows badge count for athlete (sample 2 unread → badge "2").
- [ ] Tap bell → NotificationsScreen.
- [ ] Tap "Share Card" from CoachDashboard → modal with coach-specific copy.
- [ ] Share via iOS share sheet works.

---

## Build 28 — Athlete Dashboard Backfill (3 days)

### Changes
1. `src/components/dashboard/ProfileCompletionTracker.tsx` — % bar + checklist.
2. `src/components/dashboard/CampNewsFeed.tsx`.
3. `src/components/dashboard/MyCampAlertSubscriptions.tsx`.
4. `src/components/dashboard/TranscriptRequestsCard.tsx`.
5. `src/components/dashboard/TranscriptManager.tsx`.
6. `src/components/dashboard/TransferPortalFeed.tsx`.
7. `src/components/dashboard/CoachReferencesManager.tsx`.
8. `src/components/dashboard/ProfileAnalyzer.tsx` (AI gap analysis).
9. `src/components/dashboard/SocialSyndicationCenter.tsx`.
10. `src/components/dashboard/ParentInviteModal.tsx`.
11. `src/components/dashboard/TeammateInviteModal.tsx`.
12. Wire all into `DashboardScreen.tsx`.
13. Honor `?tab=camps`, `?tab=matches`, `?tab=activity` deep params.

### Smoke-test checklist
- [ ] DashboardScreen renders all sections without errors.
- [ ] Profile completion shows X/Y filled.
- [ ] Tap "Invite Parent" → ParentInviteModal opens, sends invitation_token email.
- [ ] Tap "Invite Teammate" → TeammateInviteModal works.
- [ ] Open with deep link `?tab=camps` → camps tab pre-selected.

---

## Build 29 — Onboarding Rebuild (3 days)

**Goal**: Athlete OnboardingScreen 96 → ~700 lines parity with Lovable.

### Changes
1. `OnboardingScreen.tsx` rewrite as multi-step wizard:
   - Step 1: Sport + position picker (using `SPORTS_CONFIG`).
   - Step 2: Profile basics (name, height, weight, class year, GPA).
   - Step 3: School picker (autocomplete against `high_schools` table).
   - Step 4: Stats (40-yard, vertical, sport-specific metrics).
   - Step 5: Social links + profile photo.
   - Step 6: Optional video upload.
   - Step 7: Parent invite (skippable).
2. Each step persists to `player_profiles` on next.
3. Final step → AthleteTabs.

### Smoke-test checklist
- [ ] New user signup → lands on Step 1.
- [ ] Each step's data saved to player_profiles incrementally.
- [ ] Skip parent invite → still lands on AthleteTabs.
- [ ] Resume mid-onboarding (kill + reopen app) → resumes at last step.

---

## Build 30 — Recruiter Surface Rebuild (3 days)

### Changes
1. `CoachRosterScreen.tsx` — flesh from 46 → ~300 lines: pipeline list grouped by stage,
   drag-to-move, athlete avatar + key stats, contact log link.
2. `CoachSearchAthletesScreen.tsx` — supplement filters in `AthleteSearchScreen`.
3. `LettersScreen.tsx` audit — confirm 13 letter types, scheduling, batch resend,
   recipient autocomplete.
4. Verify `is_club_coach` branch in CoachDashboard hides team roster.
5. Add `OwnerNav` (multi-org switcher) for agency-member scouts.

### Smoke-test checklist
- [ ] CoachRoster lists athletes with stage labels.
- [ ] Drag athlete from "Prospect" → "Offered" → status persists.
- [ ] Letter composer shows all 13 types.
- [ ] Schedule a letter for tomorrow → appears in scheduled list.

---

## Build 31 — Admin Compliance Suite (3 days)

### Changes
1. `AdminAuditScreen.tsx` rewrite: filterable opt-out audit log + CSV export.
2. `AdminModerationScreen.tsx`: flagged content queue with Resolve/Dismiss actions.
3. `AdminLetterAnalytics.tsx`: port Recharts deliverability charts.
4. `ImpersonationProvider` + `ImpersonationBanner` + `useImpersonation` hook.
5. AdminUsersScreen: add Impersonate button (read-only mode).
6. `AdminBadge` in AdminTabs header.

### Smoke-test checklist
- [ ] AuditScreen filters by user_id, date range. Export CSV downloads file.
- [ ] ModerationScreen shows pending reports; resolve marks as handled.
- [ ] LetterAnalytics shows weekly send counts per coach.
- [ ] Tap "Impersonate" on a user row → app re-renders as that user with red banner.
- [ ] Tap "Stop Impersonation" → returns to admin context.

---

## Build 32 — Influencer Content Tools (2 days)

### Changes
1. `InfluencerBlogComposerScreen.tsx` — markdown editor + image picker + publish.
2. Wire from InfluencerDashboard "+ New Post" button.
3. `PodcastPlayerProvider` mount in App.tsx.
4. `PodcastMiniPlayer` global overlay.

### Smoke-test checklist
- [ ] Compose a blog post → publish → appears at /influencers/<handle> within 60s.
- [ ] Start podcast in PodcastsTab → switch to DashboardTab → audio continues, mini
  player visible.

---

## Build 33 — Parent Overlay (2 days)

### Changes
1. `<ParentAthleteSwitcher />` in AthleteTabs header.
2. `ParentDashboardModal` — full-screen modal accessible from account menu when user
   has parent role.
3. Verify `ParentInviteModal` works (athlete invites parent → token email → parent
   accepts → relationship created).
4. Verify RLS allows parent to read child's letters / camp enrollments / stats.

### Smoke-test checklist
- [ ] testparent → AthleteTabs + switcher visible.
- [ ] Tap switcher → see "View as athlete" option (currently no athletes linked? add one).
- [ ] Open ParentDashboard from account menu → see linked children list.

---

## Build 34 — Public Discovery & Marketing (3 days)

### Changes
1. `PublicTabs.tsx` — replace SignInScreen on AccountTab with a richer Account hub
   showing Sign In / Sign Up + browse links.
2. Add `/coaches`, `/scouts`, `/athletes`, `/discover/clubs`, `/influencers` browse
   tiles to PublicTabs.
3. Port `HomepageVideoShowcaseLazy` to RN (`Video` component from expo-av).
4. Port `TransferPortalFeed`.
5. Port `StickyMobileSportHeader`.

### Smoke-test checklist
- [ ] Public user can browse coaches/scouts/athletes from PublicTabs.
- [ ] Video plays inline on Landing.
- [ ] Sticky sport header appears when scrolling past hero.

---

## Build 35 — Football Hub & Camp Tooling (3 days)

### Changes
1. Port `AthleteFootballHub.tsx` (666 lines).
2. QA pass on CampMobileCheckin (camera permissions, QR scan, signature capture) on
   physical iOS + Android devices.
3. Verify CampEvaluatorScoring writes to `camp_evaluations` correctly.

### Smoke-test checklist
- [ ] Football athlete navigates to FootballHub from Dashboard.
- [ ] CampMobileCheckin scans a QR → check-in row inserted.
- [ ] Evaluator scores 5 athletes → leaderboard updates.

---

## Out of scope (>3 days each)

- AI/Athlete/Coach experience slide decks (4 marketing pages, ~M-L each, defer).
- Multi-org switcher for scouts in 2+ agencies (rare edge case).
- Bulk admin operations (mass email, bulk role assignment).
- Custom domain configuration (web-only concept).
- Comprehensive Recharts → Victory Native chart parity for analytics dashboards beyond
  Letter Analytics.

## Per-build smoke regression

After each build, run the **always-on regression**:
1. Sign in as each of the 9 test users.
2. Verify each lands on correct role tabs.
3. Verify Messages + Inbox tabs reachable from every role.
4. Verify legal Footer present on Landing.
5. Verify no console errors in first 60s of usage.

## Release cadence

| Build | Days | Cumulative |
|---|---|---|
| 24 (Auth) | 1.5 | 1.5 |
| 25 (Tabs) | 1.0 | 2.5 |
| 26 (Public/Compliance) | 2.0 | 4.5 |
| 27 (Notif/Share) | 1.5 | 6.0 |
| 28 (Dashboard) | 3.0 | 9.0 |
| 29 (Onboarding) | 3.0 | 12.0 |
| 30 (Recruiter) | 3.0 | 15.0 |
| 31 (Admin) | 3.0 | 18.0 |
| 32 (Influencer) | 2.0 | 20.0 |
| 33 (Parent) | 2.0 | 22.0 |
| 34 (Public Disc) | 3.0 | 25.0 |
| 35 (Football/Camp) | 3.0 | 28.0 |

**Total: ~28 working days (~6 calendar weeks for a single dev).**

After Build 26 the app is App Store-submittable. After Build 31 admin compliance is
satisfied. After Build 35 the parity gap is closed minus the marketing slide decks.

## Pre-Build-24 verification work (not a build)

Before starting Build 24, confirm via DB inspection:
- Exact table names: `letter_history` vs `letters_received` vs `letters_sent`.
- `scout_organizations` schema.
- `clubs` schema.
- `admin_audit_log` / `optout_audit` schema.
- Whether `useScoutOrganization` exists in RN hooks.

This is ~2 hours of `psql` / Supabase Studio work. Schedule as B24 prep.
