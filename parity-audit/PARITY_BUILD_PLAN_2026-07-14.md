# OfferHound RN Parity — Corrected Build Plan & Handoff Spec

> **Purpose**: Hand-off document for an autonomous coding session (OpenClaw-spawned
> Claude Code worker, or a direct Claude Code session) to close the remaining gap
> between the RN app (`offerhound-rn-v2`, branch `session-parity-port-phase1-2`) and
> the Lovable web source of truth (**OfferHound MAIN**, Lovable project
> `playbook-promoter`, current commit `f52356d0...`).
>
> **Do NOT modify the Lovable MAIN project.** It is read-only source of truth.
> All work happens in the RN repo.
>
> Generated: July 14, 2026, from a live re-audit that corrected an earlier
> April 29, 2026 audit (`parity-audit/MASTER.md`, `parity-audit/BUILD_PLAN.md`
> in the RN repo — kept for history, but several of its findings are now stale).

---

## 1. What changed since the April 29 audit (read this first)

The original audit found 23 P0, 57 P1, 38 P2, 17 P3 gaps (~135 total) and proposed
Builds 24–35 (~28 dev-days). **A live re-read of the current RN source shows most
of Builds 24–31 already shipped.** Do not re-implement these — verify them with
tests/QA instead of rebuilding from scratch:

### Confirmed DONE (verified by reading current source, July 14 2026)
- **Auth/routing bug (P0 #1)** — `src/contexts/AuthContext.tsx` now runs the
  correct multi-source role resolver (`user_roles`, `admin_profiles`,
  `coach_profiles`, `scout_profiles`, `influencer_profiles`,
  `parent_athlete_relationships` in parallel) with priority
  admin > hs_coach > club_coach > coach > scout > influencer > athlete-default
  > parent-only-fallback. The old `.maybeSingle()`-on-multi-row bug is gone.
- **Agency routing dead branch (P0 #12)** — `RootNavigator.tsx` calls a real
  `useScoutOrganization()` hook and correctly branches to `AgencyTabs`.
- **Athlete Dashboard missing components (P0 #2)** — `DashboardScreen.tsx` now
  imports/renders ProfileCompletionTracker, TermsAcceptanceBanner, OfflineBanner,
  CampNewsFeed, MyCampAlertSubscriptions, TransferPortalFeed, ProfileAnalyzer,
  CoachReferencesManager, SocialSyndicationCenter, SharePlayerCardDialog,
  MatchSuggestionFeed. **Still missing**: `ParentInviteModal`,
  `TeammateInviteModal`, full `TranscriptManager` (only has the lighter
  `TranscriptRequestsCard`).
- **Onboarding gutted (P0 #3)** — `OnboardingScreen.tsx` grew from 96 lines to a
  full multi-step wizard (42.5KB). Verify it matches the 7-step spec (sport/position
  → profile basics → school picker → stats → social+photo → video → parent invite)
  and that each step persists incrementally to `player_profiles`.
- **CoachRosterScreen stub (P0 #8)** — grew from 46 lines to 19.8KB. Verify pipeline
  drag-to-move and stage grouping actually work end to end.
- **ImpersonationProvider/Banner absent (P0 #15)** — Both exist.
  `ImpersonationContext.tsx` has full start/end lifecycle with 24hr AsyncStorage
  expiry. Verify `AdminUsersScreen` actually has a wired "Impersonate" button.
- **AdminAuditScreen stub (P0 #16)** — grew from 21 lines to 16.1KB. Verify CSV
  export and user_id/date-range filtering work.
- **AdminModerationScreen stub (P0 #17)** — grew from 21 lines to 10.4KB. Verify
  Resolve/Dismiss actions actually mutate a real table.
- **AdminLetterAnalytics missing (P0 #18)** — file now exists (11.1KB). Verify the
  Recharts→native chart port renders real data, not placeholder.
- **No public Footer (P0 #19, App Store blocker)** — Both `Footer.tsx` and
  `PublicFooter.tsx` (7.9KB) exist. **Verify `PublicFooter` is actually imported
  and rendered in `LandingScreen.tsx`** (existence of the file doesn't guarantee
  it's mounted — check this first, it's a 5-minute check).
- **NotificationBell / ShareRoleCardDialog absent (Build 27)** — Both exist
  (2.2KB, 10.3KB). Verify they're wired into each role's dashboard header, not
  just present as orphaned components.

### Confirmed STILL OPEN
- **ParentTabs (P0 #6/#7)** — `ParentTabs.tsx` is still only 1.7KB, the original
  2-tab shell (Dashboard, Trust & Safety). No Messages/Inbox tab. The
  parent-with-linked-athlete case is now elegantly handled upstream (the auth
  resolver gives them `athlete` role so they land on AthleteTabs directly), but a
  **parent-only** user (no linked athlete yet) still hits this thin shell.
  Missing: `ParentAthleteSwitcher` component, Messages/Inbox tabs on ParentTabs.
- **ParentInviteModal / TeammateInviteModal** — not present anywhere in
  `src/components/dashboard/` as of this audit. Needed for the athlete dashboard's
  invite flows.
- **Full TranscriptManager** — only the lighter `TranscriptRequestsCard` exists.

### NOT YET RE-VERIFIED (original audit's findings stand until checked)
Everything in Builds 32–35 of the original `BUILD_PLAN.md` was not re-checked in
this pass and should be treated as still-open per the original audit:
- Influencer blog composer + podcast mini-player (Build 32)
- Public discovery browse tiles, video showcase, sticky sport header (Build 34)
- AthleteFootballHub port + camp QR check-in QA on physical devices (Build 35)
- All ~40 "AMBIGUOUS" items flagged in the original per-role audits
  (`parity-audit/01-athlete.md` through `08-admin.md`) — table/schema names,
  hook existence, conditional rendering branches that need live verification
  against the actual Supabase instance (`abdzdcgsmdlnytkkhvtb.supabase.co`)

---

## 2. Recommended execution order for this session

1. **Verification pass first (~2-3 hours)**: For every item marked "Confirmed DONE"
   above, actually run the app (simulator or device) and click through the flow.
   File existence and line count are not proof of working functionality — several
   of the "Confirmed DONE" items above were graded on file size alone and need a
   real functional check (e.g., does the Footer's legal links actually navigate?
   does CSV export in AdminAuditScreen produce a real file?).
2. **Close the confirmed-open gaps**:
   - Build `ParentAthleteSwitcher` + add Messages/Inbox tabs to `ParentTabs.tsx`
   - Build `ParentInviteModal` + `TeammateInviteModal`, wire into `DashboardScreen.tsx`
   - Upgrade `TranscriptRequestsCard` to full `TranscriptManager` parity
3. **Work Builds 32–35** from the original `parity-audit/BUILD_PLAN.md`, verifying
   each against current Lovable MAIN source (not the stale April snapshot) before
   building — Lovable MAIN may have moved since April 29 too.
4. **Resolve the ~40 AMBIGUOUS items** via direct Supabase queries against the
   live instance before assuming any schema/table name.
5. Per-build smoke regression (sign in as all 9 test users, verify correct tab
   landing, verify Messages/Inbox reachable, verify no console errors) after
   every change, per the original BUILD_PLAN.md's own checklist.

---

## 3. Source of truth reminders

- Lovable MAIN (`playbook-promoter`) is the *living* source of truth — it has
  continued to change since both the April 29 audit and this July 14 re-audit.
  Re-check any given page's current Lovable source before porting, don't trust
  either audit's line counts as current.
- MAIN's own known gaps (from `.lovable/plan.md`, current as of this audit): a P0
  PII leak in the testimonials table (Supabase-side, not RN's problem), 35 stub
  components on the web side (Coach/Scout pipelines, several media uploaders,
  4 admin stubs), an unbuilt real-time Messages page, pending NIL Intelligence
  tools, and 3 unidentified partial routes. Don't race to port RN features against
  web features that don't exist yet — check MAIN's current state first.
- Do not push any changes to the Lovable MAIN project itself, per original
  constraint.

---

## 4. Repo / environment context

- RN repo: currently a local export in Google Drive
  (`offerhound-rn-v2-session-parity-port-phase1-2-2`), not yet pushed to a
  GitHub repo of its own. First task for this session: initialize/push to the
  new GitHub repo the user is setting up.
- Stack: Expo SDK 55, React Native 0.83.6, React 19.2, React Navigation,
  React Query, Supabase JS, expo-iap (6-tier IAP already implemented — see
  `IAP_SETUP.md` in repo root), EAS Build configured (`eas.json` has
  development/preview/production/production-play profiles).
- After code changes: `eas build` per profile, then `eas submit` once App Store
  Connect / Play Console credentials are confirmed working end to end.
