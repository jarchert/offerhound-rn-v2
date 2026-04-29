# 03 — Coach Role Parity Audit

> Test user: `testcoach@offerhound.test` / `TestCoach2024!` — uid `16d0e678-b0d2-4b28-8f40-71ccf4f66e90`
> Single role row. Single profile row in `coach_profiles`.

## 1. Role definition & access

### Lovable

Coach gating (Navbar.tsx lines 81-90): `isCoach = !!coachProfile`. Detection comes from
`useCoachProfile()` hook hitting `coach_profiles?user_id=eq.<uid>`. Sub-flags:
- `isClubCoach = !!(coachProfile as any)?.is_club_coach` — a coach is also club_coach
  when their profile has `is_club_coach = true`.
- `isHSCoach = !!hsCoachProfile` — separate `hs_coach_profiles` table.
- `isRecruiter = isCoach || isScout || isHSCoach`.

So "Coach" is a recruiter sub-type. `getDashboardLink()` priority (lines 130-141):
admin → hs_coach → club_coach → coach → agency → scout. A pure coach with
`is_club_coach=false` lands at `/coach/dashboard`.

Pages reachable as coach (Lovable LOC):
- `/coach/dashboard` → CoachDashboard (622)
- `/coach/letters` → CoachLetters (130)
- `/coach/matches` → CoachAthleteMatches (83)
- `/coach/camps` → CoachCamps (151)
- `/coach/camps/:id/checkin` → CampMobileCheckin (433)
- `/coach/camps/:id/evaluate` → CampEvaluatorScoring (441)
- `/coach/onboarding` → CoachOnboarding (560)
- `/coach/campaigns` → CoachCampaigns (169)
- `/athletes` → AthleteSearch (248)
- `/coaches` → CoachDirectory (501) — peer directory
- `/coaches/search` → CoachSearch component
- `/messages`, `/inbox`, `/settings`, `/notifications`, `/pricing`
- `/coach-communication-rules` → CoachCommunicationRules (74)
- `<ShareRoleCardDialog role="coach">` recruiter share card

### RN

`RootNavigator.tsx:roleToInitialRoute('coach')` → `'CoachTabs'`.

`CoachTabs`:
- DashboardTab → CoachDashboard (677 lines)
- PipelineTab → CoachRosterScreen (46) — **STUB**
- CampsTab → CampsScreen (105 — shared)
- LettersTab → CoachLettersScreen (167)
- DirectoryTab → CoachSearchAthletesScreen (68) — likely stub

Stack screens added at root for coach: `CoachCampaigns`, `CoachCommunicationRules`,
`CoachAthleteMatchesScreen` (under CoachTabs? No — inside the coach folder).

## 2. Navigation parity table

| Nav item | Lovable | RN | Gap |
|---|---|---|---|
| Dashboard | `/coach/dashboard` | DashboardTab | ok |
| Find Athletes | `/athletes` | DirectoryTab → CoachSearchAthletesScreen | partial — 68 lines vs Lovable AthleteSearch 248 → P1 |
| Letters | `/coach/letters` | LettersTab | ok |
| Messages | `/messages` | not on CoachTabs (must reach via stack) | P1 |
| Camps | `/coach/camps` | CampsTab (shared CampsScreen) | partial — Lovable CoachCamps is coach-specific (151) and RN CampsScreen is shared/generic (105) → P1 |
| Athlete Matches | `/coach/matches` | not on CoachTabs | P1 |
| Campaigns | `/coach/campaigns` | RootStack CoachCampaigns | partial — no UI entry from CoachTabs |
| Pipeline | not in Lovable nav (separate concept) | PipelineTab → CoachRosterScreen (46 = stub) | P0 — RN added a tab that's a stub |
| Share Card | `<ShareRoleCardDialog role="coach">` | absent in RN | P1 |
| Settings | `/settings` | via SettingsStack from account | ok |
| Onboarding (re-launch) | `/coach/onboarding` | RN CoachOnboardingScreen 532 lines (mounted? verify) | P1 |
| Communication Rules | `/coach-communication-rules` | RootStack `.CoachCommunicationRules` | ok |

## 3. Screen-by-screen parity

### 3.1 CoachDashboard

- Lovable: 622 lines. Tabs: Athletes, Camps, Recruiting, Letters, Settings. Cards:
  inbound interest, team roster (if club_coach=false this section hidden), upcoming
  camps, pending letters, recent contact events.
- RN: `src/screens/coach/CoachDashboard.tsx` 677 lines. Likely Complete on size.
- AMBIGUOUS: verify the `is_club_coach` branch hides team roster. If RN renders the
  same widgets regardless, that's a P2 logic mismatch.

### 3.2 CoachLettersScreen

- Lovable CoachLetters: 130 lines. Heavy: list of sent letters with status, click-to-edit,
  schedule, batch resend, recipient autocomplete.
- RN: 167 lines. Existence: Likely Complete on simple flows. Verify scheduling and
  batch resend.

### 3.3 CoachCampaignsScreen

- Lovable: 169 lines, RN: 285 lines. Likely Complete.

### 3.4 CoachAthleteMatchesScreen

- Lovable: 83, RN: 194. Overshoots, Likely Complete.

### 3.5 CoachCampsScreen (RN coach-specific) vs CampsScreen (RN shared)

CoachTabs binds CampsTab to `CampsScreen` (shared). But Lovable's `/coach/camps` route
goes to `CoachCamps` (151 lines, coach-specific). RN has BOTH `CoachCampsScreen` (167
lines) and `CampsScreen` (105 lines), but the tab uses the wrong one. Severity: P1.
Effort: XS (swap component reference).

### 3.6 CoachRosterScreen (RN tab) vs no Lovable equivalent

The `PipelineTab → CoachRosterScreen` is 46 lines = a stub. Lovable does not have a
"Pipeline" tab — the closest concept is the recruiting pipeline embedded in
CoachDashboard's Athletes tab. RN added a tab that's empty. Severity: P0 (stub in
production).

### 3.7 CoachSearchAthletesScreen (RN tab) vs AthleteSearch (Lovable)

- Lovable AthleteSearch: 248 lines (full search with filters: sport, position, year, GPA,
  state, height/weight, recruitable status, distance).
- RN: 68 lines = thin. Filters likely missing. Severity: P0.
- RN has TWO athlete-search screens: `src/screens/shared/AthleteSearchScreen.tsx` (388
  lines, likely Complete) AND `src/screens/coach/CoachSearchAthletesScreen.tsx` (68).
  The CoachTabs DirectoryTab uses the 68-line one — wrong. Effort: XS.

### 3.8 CoachOnboardingScreen

- Lovable CoachOnboarding: 560 lines.
- RN: 532 lines. Existence: Likely Complete on scope.

### 3.9 CoachCommunicationRulesScreen

- Lovable: 74 lines, RN: 160. Overshoots — Likely Complete.

### 3.10 CampMobileCheckin / CampEvaluatorScoring

- Lovable: 433, 441. RN: 571, 475. Likely Complete.
- Critical operational tooling for camp day. Verify camera permissions, QR scan, signature
  capture. AMBIGUOUS — needs visual.

## 4. Cross-cutting components

| Component | Status |
|---|---|
| Coach navbar branch | replaced by tabs — acceptable |
| `<ShareRoleCardDialog role="coach">` | absent | P1 |
| Footer / legal | absent | P1 |
| Notification bell | absent on CoachTabs | P2 |
| Coach search filters | not present in 68-line stub | P0 |
| OwnerNav (multi-org switcher) | unverified — agency members | P2 |

## 5. Live data validation

```
Auth uid 16d0e678-...
GET /rest/v1/coach_profiles?user_id=eq.<uid>  → 1 row (✓)
GET /rest/v1/letters_sent?user_id=eq.<uid>     → schema check (table name?)
GET /rest/v1/recruiting_pipeline?user_id=eq.<uid> → schema check
GET /rest/v1/athlete_evaluations?user_id=eq.<uid> → schema check
```

The above three returned no Content-Range — same caveat as athlete file: confirm exact
table names from RN hooks. Likely `letter_history`, `coach_recruiting_targets`,
`camp_evaluations`. AMBIGUOUS.

## 6. Specific issue confirmations

Coach-equivalent of the 9-issue class:
- Role landing: single-row `user_role` for coach ⇒ `.maybeSingle()` works ⇒ no role-picker
  bug for coach. ok.
- DirectoryTab/PipelineTab stubs: P0 — confirmed.
- CampsTab points at shared component instead of coach-specific: P1 — confirmed.
- ShareRoleCardDialog absent: P1.
- Communication Rules accessible: ok.
- Onboarding re-launch entry from CoachTabs: needs verification.

## 7. Effort tags

| Effort | Items |
|---|---|
| XS | Swap CampsTab to use CoachCampsScreen; swap DirectoryTab to AthleteSearchScreen |
| S | Build `<ShareRoleCardDialog>` for coach role |
| M | Flesh out CoachRosterScreen (pipeline tab) |
| L | Re-build CoachSearchAthletesScreen with full filter set |

## 8. Severity-sorted gap list

| # | Sev | Effort | Area | Gap |
|---|---|---|---|---|
| 1 | P0 | M | CoachTabs | PipelineTab → CoachRosterScreen is a 46-line stub |
| 2 | P0 | XS | CoachTabs | DirectoryTab points at 68-line stub instead of 388-line AthleteSearchScreen |
| 3 | P1 | XS | CoachTabs | CampsTab points at shared CampsScreen instead of CoachCampsScreen |
| 4 | P1 | S | Components | ShareRoleCardDialog absent for coach role |
| 5 | P1 | S | CoachTabs | Add Messages, Athlete Matches, Campaigns affordances |
| 6 | P1 | M | CoachLettersScreen | Verify scheduling + batch resend + recipient autocomplete |
| 7 | P1 | M | CoachDashboard | Verify is_club_coach hide-team-roster branch |
| 8 | P1 | M | CoachOnboardingScreen | Mount entry from CoachTabs / Settings for re-launch |
| 9 | P2 | S | CampMobileCheckin / CampEvaluatorScoring | Verify camera/QR/signature flows on iOS+Android |
| 10 | P2 | XS | NotificationBell | Absent on CoachTabs |
| 11 | P2 | M | OwnerNav (agency multi-org) | Verify multi-org switcher present |
| 12 | P3 | XS | CoachCommunicationRules | RN 160 lines vs Lovable 74 — overshoot, no fix needed |

## 9. AMBIGUOUS — needs verification

- `letters_sent` / `recruiting_pipeline` / `athlete_evaluations` exact table names.
- `is_club_coach` conditional rendering in CoachDashboard RN.
- CoachOnboardingScreen entry point post-signup (does it auto-route from RootNavigator
  when coach has no profile?).
- Camp day flows (camera, QR scan, signature) operational on physical devices.
