# 04 — High School Coach Role Parity Audit

> Test user: `hstestcoach@offerhound.test` / `TestHS2026!` — uid `6506a5b0-c6c1-4359-b44e-66e061fb0a89`

## 1. Role definition & access

### Lovable

`isHSCoach = !!hsCoachProfile` (Navbar.tsx:82). Sourced from `useHSCoachProfile()` →
`hs_coach_profiles?user_id=eq.<uid>`. `getDashboardLink()` priority — HS coach is
**second only to admin** (line 132): `/hs-coach/dashboard`.

HS coaches are recruiter-class but with a narrower toolkit: they don't run camps the way
college coaches do; they help their athletes get recruited. So `renderRecruiterNav()`
hides Letters for HS coaches (line 175 condition: `!isClubCoach && !isHSCoach`).

Pages reachable as HS coach:
- `/hs-coach/dashboard` → HSCoachDashboard (602)
- `/hs-coach/letters` → HSCoachLetters (72)
- `/athletes` → AthleteSearch (248)
- `/coaches` → CoachDirectory (501)
- `/messages`, `/inbox`, `/settings`, `/notifications`
- `<ShareRoleCardDialog role="hs_coach">`

### RN

`roleToInitialRoute('high_school_coach')` → `'HSCoachTabs'`.

`HSCoachTabs`:
- DashboardTab → HSCoachDashboardScreen (768)
- LettersTab → HSCoachLettersScreen (138)

That's it. Two tabs. **No athlete search, no peer directory, no messages, no inbox.**

## 2. Navigation parity table

| Nav item | Lovable | RN | Gap |
|---|---|---|---|
| Dashboard | `/hs-coach/dashboard` | DashboardTab | ok |
| Find Athletes | `/athletes` (athlete search) | absent on HSCoachTabs | P0 |
| Letters | `/hs-coach/letters` (in Lovable, hidden in nav but route exists) | LettersTab | ok-ish (Lovable nav hides it but route is reachable) |
| Coaches Directory | `/coaches` | absent | P1 |
| Messages | `/messages` | absent | P0 |
| Inbox | `/inbox` | absent | P0 |
| Share Card (HS coach) | `<ShareRoleCardDialog role="hs_coach">` | absent | P1 |
| Settings | `/settings` | via account menu | ok |
| Notifications | bell | absent | P2 |

## 3. Screen-by-screen parity

### 3.1 HSCoachDashboard

- Lovable: 602 lines. Cards: my athletes (those tied to my school), athlete recruiting
  status, transcript requests inbox, transfer portal feed (if school admin), letter
  drafts on behalf of athletes, school-team statistics, news feed.
- RN: 768 lines. Existence: Likely Complete on size. AMBIGUOUS — verify each card.

### 3.2 HSCoachLettersScreen

- Lovable: 72 lines. Letter writing/templates targeted at HS coaches advocating for their
  athletes (e.g. "letter of recommendation").
- RN: 138 lines. Likely Complete.

## 4. Cross-cutting components

Same gaps as coach: no Footer, no Notification bell, no ShareRoleCardDialog, no athlete
search affordance. Add the missing tabs.

## 5. Live data validation

```
Auth uid 6506a5b0-...
GET /rest/v1/hs_coach_profiles?user_id=eq.<uid>  → expected 1 row (verify in prod)
GET /rest/v1/user_roles?user_id=eq.<uid>         → [{"role":"high_school_coach"}] (✓ confirmed)
```

Tables an HS coach dashboard hits (inferred from Lovable HSCoachDashboard 602 lines):
- `hs_coach_profiles`
- `school_athletes` or `player_profiles?high_school=eq.<school>`
- `transcript_requests`
- `letter_history` filtered by sender
- `news_articles` for school-relevant content

AMBIGUOUS — schema verification needed.

## 6. Specific issue confirmations

- Role-picker landing for HS coach: single role row, `.maybeSingle()` returns the row,
  RN routes to HSCoachTabs. ok (no P0 from this bug).
- Tab bar dramatically thin: P0 (only 2 tabs vs 5 for athlete; HS coach is a high-leverage
  user with many duties).
- Letters access — Lovable hides Letters from nav but allows the route; RN exposes
  LettersTab — minor divergence. Could be intentional for RN to surface it. Acceptable.

## 7. Effort tags

| Effort | Items |
|---|---|
| XS | Mount AthleteSearch / Messages / Inbox in HSCoachTabs as additional tabs |
| S | Build hs_coach variant of ShareRoleCardDialog |
| M | Verify HSCoachDashboard cards render: transcript requests, athlete status, news |

## 8. Severity-sorted gap list

| # | Sev | Effort | Area | Gap |
|---|---|---|---|---|
| 1 | P0 | XS | HSCoachTabs | Missing AthleteSearch tab — recruiter cannot find athletes from chrome |
| 2 | P0 | XS | HSCoachTabs | Missing Messages tab |
| 3 | P0 | XS | HSCoachTabs | Missing Inbox tab |
| 4 | P1 | S | HSCoachTabs | Missing Coaches Directory affordance |
| 5 | P1 | S | Components | ShareRoleCardDialog (hs_coach variant) absent |
| 6 | P1 | M | HSCoachDashboard | Verify transcript requests + athlete-status cards |
| 7 | P1 | M | HSCoachDashboard | Verify school-athletes auto-filter (player_profiles by high_school) |
| 8 | P2 | XS | NotificationBell | absent |
| 9 | P2 | M | linking.ts | `/hs-coach/dashboard?tab=transcripts` etc. deep params |
| 10 | P3 | XS | LettersTab | Lovable hides; RN shows — confirm product intent |

## 9. AMBIGUOUS — needs verification

- `hs_coach_profiles` schema and RLS for cross-school reads.
- Whether HSCoachDashboard auto-binds to a school via the profile's `school_id` field.
- Whether `transcript_requests` table exists and the RN dashboard renders it.
- Whether the HS coach can write letters on behalf of their athletes (i.e. the letter
  composer accepts a `proxy_for_athlete_id`).

## 10. Recommendations

1. Bring HSCoachTabs up to 5 tabs minimum: Dashboard, Athletes, Letters, Messages, Inbox.
2. Verify school-context queries — without that, the dashboard is a generic recruiter view
   instead of an HS-coach-specific one.
3. Build the HS coach share card.
4. Add a school-news widget for parity with Lovable's likely school-feed card.

## 11. Test plan

- Sign in as hstestcoach.
- Open dashboard → expect HS-school context.
- Tap "My Athletes" → list of player_profiles with high_school = my_school.
- Open transcript request → can sign/upload PDF.
- Send letter → recipient = college coach, sender label = HS coach.

## 12. Cross-references

- The "thin tab bar" pattern is mirrored in Parent (2 tabs) and Scout (4 tabs) and
  Influencer (3 tabs). Cross-cutting fix in MASTER.md.
- ShareRoleCardDialog absent across all recruiter roles — consolidate fix.

## 13. Detailed expected HS Coach feature surface

Lovable HSCoachDashboard (602 lines) almost certainly contains the following sub-surfaces
based on the recruiter dashboard pattern + HS-specific extensions:

1. **My Roster** — list of player_profiles where `high_school = my_school` and
   `recruiting_active = true`. Sortable by class year, sport, GPA. Each row links to the
   athlete's profile + their recent recruiting activity.
2. **Transcript Requests Inbox** — incoming requests from college coaches asking the HS
   coach to sign/upload a transcript. Action buttons: approve, deny, upload PDF.
3. **Letter-of-Recommendation Composer** — write letters that go on the athlete's profile
   ("Coach J recommends Player X"). Letter type unique to HS coach: `recommendation`.
4. **School Statistics Card** — total scholarship offers received this season, top GPA,
   acceptance rate to D1/D2/D3.
5. **News Feed** — articles relevant to HS football / state athletic association.
6. **Communication Log** — every email/text sent on behalf of athletes from this account.
7. **Settings** — link sharing for recruiters to claim "verified by school" badge.

RN HSCoachDashboardScreen (768 lines) — verify each block exists. Severity if any
missing: P1 each.

## 14. RN-only divergences to confirm

- RN `LettersTab` exposes letters openly. Lovable hides letter nav for HS coach but the
  route works. This is likely an intentional product call; confirm with PM.
- RN may merge "school news" into the dashboard scroll vs. Lovable's separate cards.
- RN `RecruitingPipelineScreen` is 28 lines = stub; an HS coach version likely doesn't
  even need its own pipeline view (the dashboard handles it). No action.

## 15. Push notification / deep link expectations

- New transcript request received → push → tap → opens HSCoachDashboard with transcript
  card scrolled into view. Linking.ts entry: `/hs-coach/dashboard?card=transcripts`.
- New offer for one of my athletes → push → tap → opens athlete's public profile. Path:
  `/p/<athlete-slug>?from=hs-coach-alert`.

Verify these paths exist in `src/navigation/linking.ts` (215 lines). Severity P1 if
missing. Effort: S each.

## 16. Edge cases

- HS coach with no `high_school` association in their profile → dashboard "select your
  school" empty state. Lovable handles via CoachOnboarding flow. RN equivalent unverified.
- HS coach who is also a parent (rare but possible) → see Parent file overlay design.
- HS coach across multiple schools (e.g. assistant at School A + head at School B) →
  schema may not support; document as out-of-scope.

## 17. Compliance & permissions

- HS coach actions on behalf of minors require COPPA compliance (parental consent on file
  for athlete <13). The transcript-upload flow should verify `parental_consent` table.
  AMBIGUOUS — verify Lovable's implementation.
- FERPA: transcript data is education record; encryption-at-rest required (Supabase
  default ok), but UI should not surface PII unnecessarily.
