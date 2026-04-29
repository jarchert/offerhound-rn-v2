# MASTER — OfferHound RN Parity Audit Summary

> Generated: Wed 2026-04-29 UTC
> Lovable canonical: `/home/ubuntu/.openclaw/workspace/offerhound-repo/` @ `aa4d51e9`
> RN target: `/home/ubuntu/offerhound-rn-push/` (`session-parity-port-phase1-2`)
> Methodology: file-by-file inventory, line-count comparison, navigator/route tracing,
> live Supabase REST queries authenticating as 9 test users, role-by-role nav and screen
> diffing.

## 1. Scope summary

- 103 Lovable pages × 9 roles audited.
- 9 RN role tab navigators + 8 RN shared/auth/legal/onboarding/camp/settings stacks.
- ~106 RN screens inventoried (path → LOC).
- All 9 test credentials authenticated successfully against
  `https://abdzdcgsmdlnytkkhvtb.supabase.co`.

## 2. Total gap count

Aggregating the severity-sorted lists across `00`–`08`:

| Severity | Count | Notes |
|---|---|---|
| **P0** | **23** | Production-blockers (compliance, broken role routing, stubbed core surfaces) |
| **P1** | **57** | High-priority parity gaps (missing nav items, missing components, screen content drift) |
| **P2** | **38** | Quality-of-life and discoverability |
| **P3** | **17** | Polish and dead code |
| **Total tagged gaps** | **~135** | |
| **AMBIGUOUS items requiring verification** | **~40** | Schema names, hook existence, mount paths, conditional rendering branches |

Effort distribution (rough estimate):

| Effort | Count |
|---|---|
| XS | ~30 |
| S | ~40 |
| M | ~35 |
| L | ~25 |
| XL | ~5 |

## 3. Top 30 P0/P1 gaps (cross-role)

| # | Role | Sev | Effort | Gap |
|---|---|---|---|---|
| 1 | All | P0 | S | `AuthContext.fetchUserRole` uses `.maybeSingle()` on multi-row `user_roles` — testparent (athlete + parent) crashes silently → role-picker landing |
| 2 | Athlete | P0 | XL | `DashboardScreen` missing 8+ Lovable components (ProfileAnalyzer, SocialSyndicationCenter, CoachReferencesManager, TranscriptManager, CampNewsFeed, TransferPortalFeed, MyCampAlertSubscriptions, ParentInviteModal, TeammateInviteModal, ProfileCompletionTracker, TermsAcceptanceBanner) |
| 3 | Athlete | P0 | L | `OnboardingScreen` is 96 lines vs Lovable 720 — multi-step wizard gutted |
| 4 | Athlete | P1 | L | `AthleteFootballHub` (666 lines) not ported |
| 5 | Parent | P0 | M | RN routes parent-with-athlete to ParentTabs (2 tabs) instead of AthleteTabs+overlay (Lovable's design) |
| 6 | Parent | P0 | S | `<ParentAthleteSwitcher />` absent |
| 7 | Parent | P0 | XS | ParentTabs missing Messages + Inbox tabs |
| 8 | Coach | P0 | M | `CoachTabs.PipelineTab → CoachRosterScreen` is 46-line stub |
| 9 | Coach | P0 | XS | `CoachTabs.DirectoryTab` points at 68-line `CoachSearchAthletesScreen` instead of 388-line `AthleteSearchScreen` |
| 10 | HSCoach | P0 | XS | HSCoachTabs missing AthleteSearch/Messages/Inbox tabs |
| 11 | ClubCoach | P0 | XS | ClubCoachTabs missing Messages/Inbox tabs |
| 12 | Scout/Agency | P0 | M | RootNavigator `'agency'` branch is dead (Lovable detects via `scout_organizations`); rebuild detection |
| 13 | Scout/Agency | P0 | XS | ScoutTabs/AgencyTabs missing Messages/Inbox/AthleteSearch tabs |
| 14 | Influencer | P0 | XS | InfluencerTabs missing Messages tab |
| 15 | Admin | P0 | L | `<ImpersonationProvider>` + `<ImpersonationBanner />` absent |
| 16 | Admin | P0 | L | `AdminAuditScreen` is 21-line stub vs 541-line Lovable AdminOptOutAuditViewer (compliance) |
| 17 | Admin | P0 | M | `AdminModerationScreen` is 21-line stub |
| 18 | Admin | P0 | L | `AdminLetterAnalytics` (355 lines, deliverability charts) not ported |
| 19 | Unauth | P0 | M | No public Footer / legal link surface (App Store review blocker) |
| 20 | Unauth | P0 | S | iOS in-app purchase gating (`shouldHidePricingUI`) for PricingScreen — verify |
| 21 | All | P1 | M | Global RN `<Footer>` component absent — leaks to every screen |
| 22 | All | P1 | S | `<ShareRoleCardDialog>` not built for any role (athlete, coach, club_coach, hs_coach, scout) |
| 23 | All | P1 | S | Notification bell absent on every role tab navigator |
| 24 | Unauth | P1 | S | InfluencerBoard / CoachDirectory / ScoutDirectory / AthleteSearch / CampDiscovery / PublicClubDiscovery have no PublicTabs entry — Lovable exposes all publicly |
| 25 | Unauth | P1 | M | First-launch privacy/cookie consent modal absent |
| 26 | Unauth | P1 | M | Landing missing `HomepageVideoShowcaseLazy` |
| 27 | All | P1 | S | Two competing useAuth imports (`@/hooks/useAuth` vs `@/contexts/AuthContext`) — risk of stale state |
| 28 | Athlete | P1 | XS | SavedCoaches/SavedCamps/CampDiscovery/Gallery/ReferralTracking/NewsAndLearn exist on disk but unmounted in RootStack |
| 29 | Coach/Club/HS | P1 | XS | CampsTab points at shared `CampsScreen` instead of role-specific `CoachCampsScreen` |
| 30 | Influencer | P1 | L | Blog post composer / edit-mode absent |

## 4. Cross-cutting issues (fix-once, benefit-many)

These themes appear across multiple role files. Fixing each here removes 3-9 line items
from the per-role gap lists.

### A. Auth role resolution (P0)
- `AuthContext.tsx:72-80` — `.maybeSingle()` on multi-row `user_roles`.
- Lovable's canonical resolution is via profile tables (`coach_profiles`,
  `scout_profiles`, `hs_coach_profiles`, `parent_athlete_relationships`,
  `influencer_profiles`) PLUS `user_roles` fallback for admin/influencer/parent.
- Fix sketch:
  ```ts
  const fetchUserRole = async (userId: string) => {
    const [{data: roles}, {data: coach}, {data: scout}, {data: hs}, {data: inf}, {data: parent}] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('coach_profiles').select('id,is_club_coach').eq('user_id', userId).maybeSingle(),
      supabase.from('scout_profiles').select('id').eq('user_id', userId).maybeSingle(),
      supabase.from('hs_coach_profiles').select('id').eq('user_id', userId).maybeSingle(),
      supabase.from('influencer_profiles').select('id').eq('user_id', userId).maybeSingle(),
      supabase.from('parent_athlete_relationships').select('id').eq('parent_user_id', userId).eq('invitation_accepted', true),
    ]);
    const roleSet = new Set((roles ?? []).map(r => r.role));
    if (roleSet.has('admin') || roleSet.has('moderator')) return setUserRole('admin');
    if (hs)            return setUserRole('high_school_coach');
    if (coach?.is_club_coach) return setUserRole('club_coach');
    if (coach)         return setUserRole('coach');
    if (scout)         return setUserRole('scout'); // agency vs scout decided downstream
    if (inf || roleSet.has('influencer')) return setUserRole('influencer');
    if (parent && parent.length > 0 && !roleSet.has('athlete')) return setUserRole('parent');
    return setUserRole('athlete'); // fallback
  };
  ```
- This single change fixes: parent role-picker landing, multi-role precedence (athlete +
  influencer), agency dead-code branch (downstream scout-org check).

### B. Thin role tab bars (P0/P1)
- ParentTabs (2 tabs), HSCoachTabs (2 tabs), ClubCoachTabs (3 tabs),
  InfluencerTabs (3 tabs), AgencyTabs (2 tabs), ScoutTabs (4 tabs).
- Standard expectation: 5 tabs (Dashboard, primary action, Messages, Inbox, Profile).
- Cross-cutting fix: define a shared `RoleTabsBuilder` that always includes Messages +
  Inbox + Notifications affordances, with role-specific tabs in slots 1-3.

### C. Wrong-screen mounted (P1)
- AgencyTabs.LettersTab → CoachLettersScreen (should be ScoutLettersScreen).
- CoachTabs.DirectoryTab → CoachSearchAthletesScreen (68 stub) (should be AthleteSearchScreen 388).
- CoachTabs.CampsTab → CampsScreen (shared 105) (should be CoachCampsScreen 167).
- ClubCoachTabs.CampsTab → CampsScreen (same fix).
- Fix: Update tab `component` references in each `*Tabs.tsx`. XS effort each.

### D. Share-role-card components (P1)
- Lovable has `<SharePlayerCardDialog>` (athlete) and `<ShareRoleCardDialog>` for coach,
  club_coach, hs_coach, scout.
- RN: zero ports.
- Fix: build one component with role variants. Effort M.

### E. Navigation bell + notification surface (P1/P2)
- Lovable Navbar has persistent `<NotificationCenter />` bell on every authed page.
- RN: `NotificationsScreen` exists but no persistent affordance.
- Fix: header-bar component with bell + badge count, mounted in every role tab navigator.
  Effort S.

### F. Public surface entry points (P1)
- `/coaches`, `/scouts`, `/athletes`, `/influencers`, `/discover/clubs`,
  `/camp-discovery`, `/news-learn`, `/podcasts`, `/sample-athlete`, `/founder-message`,
  `/install`, `/support`, `/pricing`, `/nil-intelligence` — all public on Lovable, none
  surfaced from RN PublicTabs UI beyond the 4 hardcoded tabs.
- Fix: redesign PublicTabs to include a "Browse" tab that lists these surfaces, OR add a
  global `<PublicFooter>` component. Effort M.

### G. Compliance / legal surface (P0)
- No global Footer with legal links (Terms, Privacy, Cookies, CCPA, Accessibility,
  Community Guidelines, Coach Communication Rules, Parent Trust Safety).
- No first-launch consent modal.
- ParentTrustSafety not in LegalStack.
- Audit log viewer (admin) is a stub.
- Fix: Footer + Legal screen index + first-launch modal + AuditScreen build-out. Effort
  M+L combined.

### H. Onboarding flows (P0)
- `OnboardingScreen` 96 lines vs Lovable Onboarding 720 — gutted.
- `CoachOnboardingScreen` 532 vs Lovable 560 — closer, but mount path needs verification.
- `ScoutOnboardingScreen` 183 vs Lovable 154 — overshoots.
- `InfluencerOnboardingScreen` 305 vs Lovable 244 — overshoots.
- Fix: athlete OnboardingScreen rebuild = L. Others verify via QA pass = S each.

### I. Dual auth-hook ambiguity (P1)
- `@/hooks/useAuth` vs `@/contexts/AuthContext` — used inconsistently across screens
  (e.g. `DashboardScreen.tsx:47` uses hooks; `AthleteDashboard.tsx:5` uses contexts).
- Fix: pick one (recommend `@/contexts/AuthContext` since it's the provider), make
  `@/hooks/useAuth` a re-export. Effort S.

### J. Linking deep params (P1)
- `?tab=camps`, `?mode=reset`, `?parent_token=`, `?coach=<id>`, `?ref=<code>`,
  `?redirect=<path>` — these query-string deep-link patterns from Lovable need RN
  linking.ts mappings. Currently incomplete.
- Fix: linking.ts audit + per-screen `useRoute()` param wiring. Effort M.

## 5. Risk-ranked roadmap

| Priority | Block | Reason |
|---|---|---|
| 1 | Auth role resolution + parent overlay | Unblocks testparent + multi-role users |
| 2 | Footer + legal surface + first-launch consent | App Store / Play Store review |
| 3 | Wrong-screen tab mounts (4 swaps) | XS effort, P0/P1 wins |
| 4 | Add Messages/Inbox tabs to thin role bars | XS each, fixes 5 P0s |
| 5 | Onboarding rebuild | Activation funnel |
| 6 | DashboardScreen feature backfill | Athlete value prop |
| 7 | Admin: impersonation + audit + moderation | CS/compliance |
| 8 | Share-role cards + notification bell | Engagement |
| 9 | Influencer blog composer | Content velocity |
| 10 | Athlete Football Hub + slide decks | Marketing |

## 6. Production-blocker red list

If the team intends to ship a v24 build to TestFlight / internal Play track today:

1. Fix `fetchUserRole` (S, hours, not days).
2. Add Messages/Inbox to all role tab bars (XS, hours).
3. Add a basic Footer with legal links + Pricing on Landing (M, ~1 day).
4. Add iOS pricing gate to PricingScreen (S, ~half day).
5. Replace ModerationTab/AuditTab/SettingsTab stubs with at least a "coming soon" screen
   that doesn't read as a missing feature (XS).

Without these, expect: parent users locked out, every recruiter cannot read DMs,
App Store rejection on legal links, and admin role looks unfinished.

## 7. Verification gaps to close before final build sign-off

- Confirm exact Supabase table names: `letters_received`, `letters_sent`,
  `athlete_camp_enrollments`, `recruiting_pipeline`, `transcript_requests`,
  `admin_audit_log`, `clubs`, `scout_organizations`, `scout_organization_members`,
  `influencer_blog_posts`, `podcast_episodes`. (~10 hooks)
- Confirm `OfflineAppShell`, `ErrorBoundary`, `CookiePreferencesProvider`,
  `PodcastPlayerProvider`, `ImpersonationProvider`, `ThemeProvider` mounts in RN
  `App.tsx`.
- Confirm OAuth Google + Apple JSX in AuthScreen.
- Confirm 13 letter types in LettersScreen vs Lovable.
- Confirm AdminUsersScreen impersonate button.
- Run RN linking.ts audit against Lovable's full route table (~60 paths).
- E2E smoke each role's primary CRUD flow on TestFlight build.

## 8. Strengths to preserve

The RN port is NOT a low-effort wrapper. Several screens are larger and more polished
than Lovable equivalents:
- `DashboardScreen` 1325 vs 955.
- `ScoutDashboard` 1165 vs 210.
- `MessagesScreen` 655 vs 279.
- `InboxScreen` 643 vs 516.
- `LettersScreen` 608 vs 733 (close).
- Camp screens (CampMobileCheckin 571 vs 433, CampSpectatorView 314 vs 256) reflect
  meaningful native polish.
- AdminUsersScreen (133) is RN-extension valuable for in-app user management.
- AthleteProfileEditScreen (513) is a clean separation Lovable embeds inline — better
  architecture.

These wins should be documented and not regressed.

## 9. Final tally per role

| Role | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| Unauthenticated | 2 | 11 | 12 | 5 | 30 |
| Athlete | 3 | 8 | 5 | 3 | 19 (+ deep-dive matrix items) |
| Parent | 5 | 2 | 2 | 1 | 10 |
| Coach | 2 | 6 | 3 | 1 | 12 |
| HS Coach | 3 | 4 | 2 | 1 | 10 |
| Club Coach | 2 | 6 | 2 | 1 | 11 |
| Scout/Agency | 4 | 5 | 2 | 1 | 12 |
| Influencer | 1 | 4 | 3 | 2 | 10 |
| Admin | 4 | 5 | 3 | 1 | 13 |
| **Sum** | **26** | **51** | **34** | **16** | **127** (some shared across files) |

Net unique cross-role gaps after dedup of cross-cutting issues (Auth, Footer,
ShareCard, NotificationBell, etc.): **~95 unique items.**

## 10. Methodological caveats

- Screen line counts are a proxy for completeness, not a guarantee. Some 200-line RN
  screens may render less than 100-line Lovable pages because of native verbosity.
  Visual / functional verification still required.
- AMBIGUOUS items were marked rather than guessed; ~40 of the gap entries depend on
  schema/component verification not feasible without RN-runtime inspection.
- Live data validation was successful for auth and a sampling of tables. Several
  inferred tables (`letters_received`, etc.) returned no Content-Range header — these
  may be different table names or anon-RLS-restricted.
- The `_progress.md` file at audit root tracks per-file completion timestamps.

See `BUILD_PLAN.md` for the proposed Build 24 / 25 / 26 sequence.
