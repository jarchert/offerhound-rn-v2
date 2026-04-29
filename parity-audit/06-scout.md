# 06 — Scout Role Parity Audit

> Test users:
> - `testscout@offerhound.test` / `TestScout2025!` — uid `3496fc18-ab35-4e71-b9ab-dd35f6ae102e` (solo scout)
> - `testagency@offerhound.test` / `TestAgency2025!` — uid `7ad47c98-95c0-4a50-b919-f9b6513a0a87` (scout in an agency)

## 1. Role definition & access

### Lovable

`isScout = !!scoutProfile` from `useScoutProfile()` → `scout_profiles?user_id=eq.<uid>`.
`useScoutOrganization()` returns `{isOwner, isMember}`. Then:
- `isAgency = isScout && (isOwner || isMember)` (Navbar.tsx:85)
- `isAgencyOwner = isScout && isOwner` (line 127)
- `isAgencyMember = isScout && isMember && !isOwner` (line 128)

`getDashboardLink()` priority: `agency_owner → /agency/dashboard`, otherwise scout →
`/scout/dashboard`. Agency members still see scout dashboard but get an "Agency" sidelink
in the nav (lines 168-172).

Pages reachable as scout / agency:
- `/scout/dashboard` → ScoutDashboard (210)
- `/scout/letters` → ScoutLetters (218)
- `/scout/trends` → ScoutTrends (171)
- `/scout/onboarding` → ScoutOnboarding (154)
- `/scouts` → ScoutDirectory (129)
- `/scouts/:id` → PublicScoutProfile (122)
- `/agency/dashboard` → AgencyDashboard (373) — agency-owner-only landing
- `/agency/letters` → ScoutLetters (218 reused)
- `/organization/settings` → OrganizationSettings (30) — agency settings
- `/athletes`, `/coaches`, `/messages`, `/inbox`, `/settings`
- `<ShareRoleCardDialog role="scout">`

### RN

Both `scout` and `agency`/`scout-with-org` resolve via user_roles `role = "scout"`. RN
`roleToInitialRoute('scout')` → `'ScoutTabs'`. RN also has a separate `'AgencyTabs'`
mapped via `roleToInitialRoute('agency' as UserRole)` (line 105) BUT no Supabase
`user_roles.role = "agency"` row exists — testagency has `role = "scout"`. So
**`AgencyTabs` is registered but never reached automatically**. P1 architectural bug.

`ScoutTabs`:
- DashboardTab → ScoutDashboard (1165)
- LettersTab → ScoutLettersScreen (291)
- TrendsTab → ScoutTrendsScreen (337)
- OnboardingTab → ScoutOnboardingScreen (183)

`AgencyTabs`:
- DashboardTab → AgencyDashboardScreen (432)
- LettersTab → CoachLettersScreen (167) — odd: uses CoachLettersScreen not ScoutLettersScreen.

## 2. Navigation parity table

| Nav item | Lovable | RN ScoutTabs | RN AgencyTabs | Gap |
|---|---|---|---|---|
| Dashboard | `/scout/dashboard` or `/agency/dashboard` | DashboardTab | DashboardTab | ok |
| Letters | `/scout/letters` | LettersTab | LettersTab → CoachLettersScreen | partial — agency uses wrong screen |
| Trends | `/scout/trends` | TrendsTab | absent | P1 for agency |
| Onboarding | `/scout/onboarding` | OnboardingTab | absent | P2 for agency |
| Find Athletes | `/athletes` | absent | absent | **P0** both |
| Scouts Directory | `/scouts` | absent | absent | P1 both |
| Coaches Directory | `/coaches` | absent | absent | P2 both |
| Messages | `/messages` | absent | absent | **P0** both |
| Inbox | `/inbox` | absent | absent | **P0** both |
| Agency switcher | `<Link to="/agency/dashboard">` for members | n/a | n/a | P1 — no way to switch between scout & agency views |
| Organization Settings | `/organization/settings` | absent | absent | P1 (agency only) |
| Public Scout Profile | `/scouts/:id` | absent direct entry | absent | P2 |
| Share Card | scout variant | absent | absent | P1 |

## 3. Screen-by-screen parity

### 3.1 ScoutDashboard

- Lovable: 210 lines. Cards: top prospects, evaluation queue, recent letters, region
  scoreboards.
- RN: 1165 lines (5.5x Lovable). Likely Complete + extra widgets. Risk: divergent
  feature set vs Lovable.

### 3.2 ScoutLettersScreen vs ScoutLetters

- Lovable: 218, RN: 291. Likely Complete.

### 3.3 ScoutTrendsScreen vs ScoutTrends

- Lovable: 171, RN: 337. Likely Complete (overshoot).

### 3.4 ScoutOnboardingScreen

- Lovable: 154, RN: 183. Likely Complete.
- Mounted as a Tab is unusual — typically onboarding is a one-time stack screen, not a
  permanent tab. Suggest moving to first-launch flow. P3.

### 3.5 AgencyDashboardScreen vs AgencyDashboard

- Lovable: 373, RN: 432. Likely Complete on size.

### 3.6 ScoutDirectoryScreen / PublicScoutProfileScreen

- Lovable: ScoutDirectory 129, PublicScoutProfile 122.
- RN: 228, 182. Disk: yes. Mount: ScoutDirectoryScreen is in `src/screens/scout/` but
  not mounted as a ScoutTabs tab; PublicScoutProfileScreen is in `src/screens/public/`
  presumably under PublicProfileStack. AMBIGUOUS — verify.

### 3.7 OrganizationSettingsScreen

- Lovable: 30 (very thin), RN: 88. Likely Complete.
- Not mounted in AgencyTabs UI; agency owner has no entry point. P1.

## 4. Cross-cutting components

| Component | Status |
|---|---|
| Footer | absent |
| Notification bell | absent on tabs |
| `<ShareRoleCardDialog role="scout">` | absent |
| Agency sub-nav (members link) | absent |
| Multi-org switcher (scout in multiple agencies) | absent |

## 5. Live data validation

```
Auth uid 3496fc18-... (solo scout)
GET /rest/v1/scout_profiles?user_id=eq.<uid>  → expect 1 row
GET /rest/v1/user_roles?user_id=eq.<uid>       → confirmed [{"role":"scout"}]

Auth uid 7ad47c98-... (agency scout)
GET /rest/v1/scout_organizations?owner_user_id=eq.<uid>  → expect 1 row OR membership
GET /rest/v1/scout_organization_members?user_id=eq.<uid>  → expect membership row
```

The agency org tables are AMBIGUOUS — verify schema.

## 6. Specific issue confirmations

- Single role row for scout/agency-scout → `.maybeSingle()` works.
- HOWEVER the RootNavigator has an `'agency' as UserRole` branch (line 105) that is
  effectively dead code — no test user has `user_roles.role = "agency"`. Lovable detects
  agency via `useScoutOrganization()`, NOT via a user_roles row. P0 architectural.
- Agency LettersTab points at CoachLettersScreen (wrong) → P1.
- No Find Athletes / Messages / Inbox on either ScoutTabs or AgencyTabs → P0.

## 7. Effort tags

| Effort | Items |
|---|---|
| XS | Swap AgencyTabs LettersTab to ScoutLettersScreen |
| S | Add Messages/Inbox/AthleteSearch tabs to both scout shells |
| S | Build scout ShareRoleCard variant |
| M | Detect agency via `scout_organizations` not `user_roles`; swap RootNavigator branch |
| M | Add Organization Settings entry from AgencyTabs |
| L | Multi-org switcher for scouts in multiple agencies |

## 8. Severity-sorted gap list

| # | Sev | Effort | Area | Gap |
|---|---|---|---|---|
| 1 | P0 | M | RootNavigator | `agency` branch is dead code; agency must be detected via scout_organizations |
| 2 | P0 | XS | ScoutTabs / AgencyTabs | Missing Messages tab |
| 3 | P0 | XS | ScoutTabs / AgencyTabs | Missing Inbox tab |
| 4 | P0 | XS | ScoutTabs / AgencyTabs | Missing Find Athletes tab |
| 5 | P1 | XS | AgencyTabs | LettersTab uses CoachLettersScreen instead of ScoutLettersScreen |
| 6 | P1 | M | AgencyTabs | OrganizationSettings entry absent |
| 7 | P1 | S | Components | ShareRoleCardDialog (scout) absent |
| 8 | P1 | M | AgencyDashboard | Verify owner vs member view branch |
| 9 | P1 | S | Scouts Directory | absent on tabs |
| 10 | P2 | S | OnboardingTab | Move from permanent tab to first-launch flow |
| 11 | P2 | XS | NotificationBell | absent |
| 12 | P3 | S | PublicScoutProfile | Add entry from ScoutTabs (preview my own profile) |

## 9. AMBIGUOUS — needs verification

- Schema of `scout_organizations`, `scout_organization_members`.
- Whether AgencyDashboard renders different content for owner vs member.
- Whether RN's `useScoutOrganization` hook exists (Lovable has it).
- Whether `useScoutProfile` exists in RN.

## 10. Recommendations

1. **Architectural**: Replace `'agency' as UserRole` branch with a runtime check after
   loading scout_profiles + scout_organization_members. If user is scout AND owner →
   AgencyTabs. If scout AND member → ScoutTabs + agency switcher. If scout solo →
   ScoutTabs.
2. AgencyTabs needs OrganizationSettings + Members tabs. Currently bare.
3. Build scout ShareRoleCard.
4. Fix wrong-letters-screen on AgencyTabs.

## 11. Test plan

- Sign in as testscout (solo) → ScoutTabs, no agency affordance.
- Sign in as testagency → AgencyTabs (owner) OR ScoutTabs+agency-link (member). Verify
  via `useScoutOrganization` data.
- Open AgencyDashboard → see roster of agency scouts + assignments.
- Edit org settings → verify writes succeed.

## 12. Cross-references

- "Wrong-screen mounted" pattern repeats: AgencyTabs (CoachLetters), CoachTabs
  (CampsScreen). MASTER.md.
- Thin recruiter tab bars affect coach, hs_coach, club_coach, scout, agency.
- Org/multi-tenancy concerns intersect with admin role (08).

## 13. Detailed AgencyDashboard surface

Lovable AgencyDashboard 373 lines likely contains: agency roster (assigned scouts),
prospect aggregations across the agency, regional heatmaps, scout assignment matrix, billing/subscription summary, member
invite flow, payouts/commissions tracker, evaluation queue across all agency scouts.

RN AgencyDashboardScreen 432 lines may cover most of these but several are likely
shallow stubs. AMBIGUOUS — verify per-section.

## 14. Notes on dead code

The RootNavigator branch `case 'agency' as UserRole: return 'AgencyTabs';` (line 105) is
unreachable in production because Supabase doesn't issue `agency` as a user_roles value.
This is a TypeScript-level deception: the cast `'agency' as UserRole` bypasses the
union type. Recommendation: either (a) add `'agency'` to the AppRole enum and migrate
DB to assign it, or (b) compute agency-vs-scout at runtime from organization membership.
Lovable does (b).

## 15. Push notification expectations

- New athlete evaluation request → ScoutDashboard.
- Inbound DM from coach → Inbox (absent).
- Letter delivery confirmation → LettersTab.
- Agency-scoped: new prospect added by another scout → AgencyDashboard activity feed.

All P0 dependent on Inbox/Messages tabs being added.

## 16. Compliance considerations

- NCAA contact period rules: scouts must respect blackout windows. Lovable surfaces this
  via `useContactRules` hook + warning banners on letter composer. Verify RN compliance
  banner.
- GDPR: scout profiles include athlete watchlists which contain minor PII. Verify RLS
  policies on `scout_watchlist` etc.

## 17. Edge cases

- Scout with no `scout_profiles` row → onboarding redirect. Verify RN routes them to
  ScoutOnboardingScreen rather than the OnboardingStack picker.
- Scout removed from agency mid-session → AgencyTabs should gracefully degrade to
  ScoutTabs. Verify reactivity.
- Two agencies for same scout → multi-org picker. Likely out of scope for current build.
