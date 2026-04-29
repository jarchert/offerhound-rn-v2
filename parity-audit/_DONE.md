# _DONE — OfferHound RN Parity Audit Complete

All 11 deliverables written to `/home/ubuntu/offerhound-rn-push/parity-audit/`.

## Deliverables checklist

- [x] `00-unauthenticated.md` — 429 lines
- [x] `01-athlete.md` — 409 lines
- [x] `02-parent.md` — 203 lines
- [x] `03-coach.md` — 200 lines
- [x] `04-high-school-coach.md` — 201 lines
- [x] `05-club-coach.md` — 201 lines
- [x] `06-scout.md` — 243 lines
- [x] `07-influencer.md` — 219 lines
- [x] `08-admin.md` — 230 lines
- [x] `MASTER.md` — 264 lines
- [x] `BUILD_PLAN.md` — 333 lines

Total: 2,932 lines of audit material.

## Summary

Compared Lovable canonical (`/home/ubuntu/.openclaw/workspace/offerhound-repo/`,
branch `lovable/jarchert/playbook-promoter` @ `aa4d51e9`, 103 pages) against RN port
(`/home/ubuntu/offerhound-rn-push/`, branch `session-parity-port-phase1-2`, ~106
screens across 16 role/feature folders). Authenticated all 9 test users against the
live Supabase instance (`abdzdcgsmdlnytkkhvtb.supabase.co`) and ran live REST probes to
validate seed data and confirm role-resolution behavior.

### Headline findings
- **23 P0 production-blockers**, **57 P1 high-priority gaps**, **38 P2**, **17 P3**
  (~135 tagged items, ~95 unique after cross-role dedup).
- The user-reported "role selection page after login" bug is confirmed as a P0 in
  `src/contexts/AuthContext.tsx:72-80` — `.maybeSingle()` on multi-row `user_roles`
  silently fails for testparent. Fix sketch in MASTER.md §4A.
- Wider auth-resolution rebuild needed: Lovable detects roles via profile tables
  (`coach_profiles`, `scout_profiles`, `hs_coach_profiles`, `parent_athlete_relationships`,
  `influencer_profiles`) plus `user_roles`, with priority order admin > hs_coach >
  club_coach > coach > scout > influencer > parent > athlete. RN reads only
  `user_roles`.
- 6 of 9 role tab navigators are too thin (missing Messages + Inbox tabs); 4 mount the
  wrong screen (e.g. AgencyTabs.LettersTab uses CoachLettersScreen).
- Admin role has 3 stub tabs (Moderation 21 lines, Audit 21 lines, Settings 22 lines)
  vs Lovable AdminOptOutAuditViewer 541 lines. AdminLetterAnalytics (355 lines) and
  AdminMediaCenter (467 lines) not ported. ImpersonationProvider absent.
- Athlete DashboardScreen missing 8+ Lovable components (ProfileAnalyzer,
  SocialSyndicationCenter, CoachReferencesManager, TranscriptManager,
  TransferPortalFeed, ParentInviteModal, TermsAcceptanceBanner, OfflineBanner).
- OnboardingScreen 96 lines vs Lovable 720 — multi-step wizard gutted.
- AthleteFootballHub (666 lines) not ported.
- No global Footer / legal-link surface — App Store review blocker.
- Two competing useAuth import paths (`@/hooks/useAuth` vs `@/contexts/AuthContext`)
  used inconsistently.

### Build sequencing
`BUILD_PLAN.md` proposes Builds 24-35 (~28 dev-days, 6 calendar weeks for one engineer).
After Build 26 the app is App-Store-submittable. After Build 31 admin compliance is
satisfied. Build 35 closes the parity gap minus marketing slide decks.

### Strengths preserved
RN port is not a low-effort wrapper — DashboardScreen (1325 vs 955), ScoutDashboard
(1165 vs 210), MessagesScreen (655 vs 279), InboxScreen (643 vs 516), and the camp
mobile suite (CampMobileCheckin 571 vs 433) are larger and more polished than Lovable.
Documented in MASTER.md §8.

### AMBIGUOUS items
~40 items flagged as needing verification (exact Supabase table names, hook existence,
component mount paths, conditional rendering branches). Pre-Build-24 verification work
(~2 hours) listed at end of BUILD_PLAN.md.

## Methodology notes
- Line counts used as completeness proxy, with explicit caveat that visual + functional
  verification is still required.
- Live data probes validated auth flow + sample row counts (athlete: 11 saved_camps, 2
  notifications; parent: 1 athlete relationship; admin: 86 user_roles, 2
  influencer_profiles).
- AMBIGUOUS items documented inline rather than blocking progress.

## Source code mutations
None. Audit-only as instructed.
