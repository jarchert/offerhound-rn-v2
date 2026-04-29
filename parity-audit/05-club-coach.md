# 05 — Club Coach Role Parity Audit

> Test user: `testclubcoach@offerhound.test` / `TestClubCoach2025!` — uid `4d2d0699-440e-4bff-a89b-cb340de1f9c9`

## 1. Role definition & access

### Lovable

`isClubCoach = !!(coachProfile as any)?.is_club_coach` (Navbar.tsx:84). Note: the role
boolean is **derived from a flag on `coach_profiles`, not a separate table.** A club
coach IS a coach, with `is_club_coach=true`. That means `useCoachProfile()` resolves
truthy for both, and the dashboard link priority puts club_coach above coach
(getDashboardLink lines 132-133).

But interestingly, the test user `testclubcoach` has `user_roles.role = "club_coach"` —
a separate row distinct from "coach". So Supabase has TWO mechanisms for tagging a club
coach: the row in `user_roles` AND the `is_club_coach` flag on `coach_profiles`. RN's
RootNavigator only reads `user_roles` → that's how it routes to ClubCoachTabs.

Lovable's nav `renderRecruiterNav()` for club coaches HIDES Letters
(`!isClubCoach && !isHSCoach` at line 175) — same as HS coach. Club coaches manage clubs,
not direct college recruiting.

Pages reachable as club coach (Lovable):
- `/club/dashboard` → ClubCoachDashboard (656)
- `/club/letters` → ClubCoachLetters (71)
- `/club/camps` → CoachCamps (151) reused
- `/discover/clubs` → PublicClubDiscovery (449) — for self-listing
- `/athletes`, `/coaches`, `/messages`, `/inbox`, `/settings`
- `<ShareRoleCardDialog role="club_coach">`

### RN

`roleToInitialRoute('club_coach')` → `'ClubCoachTabs'`.

`ClubCoachTabs`:
- DashboardTab → ClubCoachDashboardScreen (691)
- CampsTab → CampsScreen (105 shared)
- LettersTab → ClubCoachLettersScreen (140)

3 tabs only.

## 2. Navigation parity table

| Nav item | Lovable | RN | Gap |
|---|---|---|---|
| Dashboard | `/club/dashboard` | DashboardTab | ok |
| Camps | `/club/camps` (= CoachCamps) | CampsTab → shared CampsScreen | partial — wrong target like coach P1 |
| Letters | `/club/letters` | LettersTab | ok (RN exposes; Lovable hides in nav) |
| Find Athletes | `/athletes` | absent | P1 |
| Coaches Directory | `/coaches` | absent | P2 |
| Discover Clubs (self-promotion) | `/discover/clubs` | absent | P1 |
| Messages | `/messages` | absent | P0 |
| Inbox | `/inbox` | absent | P0 |
| Share Card | club_coach variant | absent | P1 |
| Settings | `/settings` | via account | ok |

## 3. Screen-by-screen parity

### 3.1 ClubCoachDashboardScreen vs ClubCoachDashboard

- Lovable: 656 lines. Sections: club roster, club camps, prospect list, club analytics,
  invite assistants, edit club profile.
- RN: 691 lines. Likely Complete on size. AMBIGUOUS — verify each section.

### 3.2 ClubCoachLettersScreen vs ClubCoachLetters

- Lovable: 71. RN: 140. Likely Complete (overshoot).

### 3.3 PublicClubDiscovery integration

A club coach should be able to manage their club's public listing. Lovable
`/discover/clubs` is public-facing but the club coach manages their entry from the
dashboard. RN: discovery screen exists (532 lines) but no UI affordance to "edit my
club's listing" from ClubCoachTabs. P1.

### 3.4 Club camps vs Generic camps

CampsTab points at `CampsScreen` (shared, 105 lines, generic). Should use
`CoachCampsScreen` (167 lines) for parity with Lovable's `/club/camps` reusing CoachCamps.
P1. Effort: XS.

## 4. Cross-cutting components

Same recurring gaps across all recruiter roles: Footer absent, Notification bell absent,
ShareRoleCardDialog absent, Messages tab absent, Inbox tab absent.

## 5. Live data validation

```
GET /rest/v1/coach_profiles?user_id=eq.4d2d0699-...&select=*  → expect is_club_coach=true
GET /rest/v1/user_roles?user_id=eq.<uid>                       → confirmed [{"role":"club_coach"}]
GET /rest/v1/clubs?owner_user_id=eq.<uid>                       → schema check (likely table name)
```

`clubs` table existence — likely yes given `/discover/clubs` page is wired to it.
AMBIGUOUS — confirm exact table.

## 6. Specific issue confirmations

- Single role row for club_coach → `.maybeSingle()` works, no role-picker bug.
- Tab bar minimal at 3 tabs → P0 missing-Messages/Inbox.
- CampsTab again points at shared instead of CoachCampsScreen → P1.
- Discover Clubs management entry absent → P1.
- Discrepancy: RN reads user_roles; Lovable reads coach_profiles flag. Users with one
  marker but not the other will land in inconsistent surfaces — P1 data integrity.

## 7. Effort tags

| Effort | Items |
|---|---|
| XS | Add Messages/Inbox tabs; swap CampsTab to CoachCampsScreen |
| S | Add "My Club Listing" entry from ClubCoachDashboard |
| S | Build club_coach ShareRoleCard variant |
| M | Verify PublicClubDiscovery edit-mode for owners |

## 8. Severity-sorted gap list

| # | Sev | Effort | Area | Gap |
|---|---|---|---|---|
| 1 | P0 | XS | ClubCoachTabs | No Messages tab |
| 2 | P0 | XS | ClubCoachTabs | No Inbox tab |
| 3 | P1 | XS | ClubCoachTabs | CampsTab points at shared CampsScreen instead of CoachCampsScreen |
| 4 | P1 | XS | ClubCoachTabs | No Find Athletes affordance |
| 5 | P1 | M | ClubCoachDashboard | Missing "Edit My Club's Listing" CTA → PublicClubDiscovery edit mode |
| 6 | P1 | S | Components | ShareRoleCardDialog (club_coach) absent |
| 7 | P1 | M | clubs schema | Verify clubs table reads/writes for owners |
| 8 | P1 | S | Role detection | Reconcile user_roles row vs coach_profiles.is_club_coach |
| 9 | P2 | XS | Coaches Directory | absent on tabs |
| 10 | P2 | XS | NotificationBell | absent |
| 11 | P3 | S | Onboarding | Verify CoachOnboarding accepts is_club_coach branch |

## 9. AMBIGUOUS — needs verification

- Whether `coach_profiles.is_club_coach` is the canonical flag or whether `user_roles`
  row "club_coach" is canonical. RN reads user_roles; Lovable reads coach_profiles flag.
  Migration risk for users who only have one of the two markers.
- Whether the `clubs` table is the right schema name (could be `club_organizations`).
- Whether RN ClubCoachDashboard renders club_camps separately from generic camps.

## 10. Recommendations

1. Re-architect role detection to read BOTH user_roles AND profile flags, taking
   highest-priority match (admin > hs_coach > club_coach > coach > agency > scout >
   influencer > parent > athlete).
2. Bring ClubCoachTabs to 5 tabs: Dashboard, Roster (athletes), Camps, Letters, Messages.
3. Add a "Manage Club Listing" deep link surface so club coaches can edit their
   `/discover/clubs/<id>` listing.
4. ShareRoleCardDialog with club_coach variant.

## 11. Test plan

- Sign in as testclubcoach.
- Confirm landing on ClubCoachTabs (no role picker).
- Open Dashboard → expect club roster + club camps.
- Tap "Manage Club Listing" → opens an edit form for club's public discovery profile.
- Send a letter from LettersTab → recipient typeahead works.

## 12. Cross-references

- Camp tab swap also applies to coach (03) and HS coach (04).
- ShareRoleCard absent across coach/club_coach/hs_coach/scout — consolidate.
- 2-tab/3-tab thin shells — see MASTER.md cross-cutting "thin role tabs" theme.

## 13. Detailed surface comparison

The largest functional wedge between Lovable's club coach UX and RN's is the
**self-service club listing**: Lovable lets a club coach (a) join PublicClubDiscovery as
a public business listing, (b) edit hours/contact/age groups, (c) post upcoming camps,
(d) collect inbound DMs. RN has 0/4 of these flows surfaced. Severity: **P1**.

Build estimate (per flow): S, M, S, M = ~2-3 days total.

## 14. Push notification expectations

- New club camp signup → push → ClubCoachDashboard.
- New inbound DM about club → push → Inbox (which is currently absent).

Both require Inbox tab P0 fix to land properly. Otherwise the deep link 404s in-app
or routes to a fallback.

## 15. Compliance considerations

- Background-check verification for club coaches working with minors — store an
  `nonprofit_or_verified_check` flag on coach_profiles. Verify Lovable surfaces this.
- Display "Verified Club" badge to distinguish from unverified self-listings. Likely
  sourced from an admin-controlled `is_verified` column.

## 16. Notable nav inversion

Lovable HIDES "Letters" from the recruiter nav for club_coach (line 175 condition), but
the route still works directly. RN exposes LettersTab on the bottom bar. Two options:
- Match Lovable: hide Letters from tabs (and surface from dashboard CTA only).
- Diverge intentionally: keep Letters visible on RN since mobile users benefit from
  fewer hops. Acceptable if PM approves.

## 17. Inbound communication paths

Club coaches receive inbound DMs from: (a) parents inquiring about programs, (b) athletes
asking about tryouts, (c) other coaches scouting cross-club talent. All inbound currently
funnels into Inbox — which is absent on ClubCoachTabs. Severity: P0.
