# 02 — Parent Role Parity Audit

> Test user: `testparent@offerhound.test` / `TestParent2025!` — uid `a50cc451-c79f-4bc3-a679-8ac2342b9b6f`
> Multi-row in `user_roles`: `[{role:"athlete"},{role:"parent"}]` — **the canonical
> trigger for the P0 role-picker bug.**

## 1. Role definition & access

### Lovable

Parent is detected via `parent_athlete_relationships` (Navbar.tsx:104-114): if the user
has any row where `parent_user_id = me AND invitation_accepted = true`, `isParent`
becomes true. The variable `isParentOnly` (line 88) is true ONLY if `isParent &&
!isRecruiter && !isInfluencer && !isAdmin`. Because testparent also has an athlete row,
`isParentOnly` is FALSE — Lovable shows the **athlete navbar** for them, with the
`<ParentAthleteSwitcher />` letting them switch between "viewing as themselves" and
"viewing as their athlete".

So Lovable's parent UX is **not a separate role surface — it's an overlay**. The
navbar's `<ParentAthleteSwitcher />` (Navbar.tsx:178) and the `<ParentInviteModal />`
in Dashboard are the two parent-specific affordances.

The dedicated parent dashboard at `/parent/dashboard` (`ParentDashboard.tsx` 563 lines)
is reachable from the account dropdown when `isParent` is true, regardless of
`isParentOnly`. So a parent who is also an athlete sees: athlete navbar + parent dashboard
link + switcher.

Pages reachable as parent:
- `/parent/dashboard` → ParentDashboard (563)
- `/parental-consent` → ParentalConsent (21)
- `/parent-trust-safety` → ParentTrustSafety (21)
- All athlete pages (because they also have an athlete row)
- `/inbox`, `/messages`, `/settings`

### RN

`RootNavigator.tsx:96-103` → `roleToInitialRoute('parent')` returns `'ParentTabs'`.
`ParentTabs` has TWO tabs only: DashboardTab → ParentDashboard, TrustSafetyTab →
ParentTrustSafetyScreen. Compare to AthleteTabs's 5 tabs.

**Critical divergence**: RN routes the parent to a 2-tab parent shell INSTEAD of giving
them the athlete shell with a parent overlay. testparent loses access to:
- AthleteTabs HomeTab (Dashboard)
- AthleteTabs MatchesTab
- AthleteTabs LettersTab
- AthleteTabs MessagesTab
- AthleteTabs ProfileTab

…unless RN's RootStack + linking lets them deep-link out of ParentTabs into other
navigators. But there's no UI affordance to do so. Severity: **P0** (architectural).

This is **compounded** by the `.maybeSingle()` bug: testparent currently lands in the
role picker (OnboardingStack), not even ParentTabs. Two-bug pile-up.

## 2. Navigation parity table

| Nav item | Lovable | RN | Gap |
|---|---|---|---|
| Parent Dashboard | `/parent/dashboard` | DashboardTab | ok |
| Trust & Safety | `/parent-trust-safety` | TrustSafetyTab | ok |
| Messages | `/messages` (athlete navbar) | not on ParentTabs | **P0** |
| Inbox | `/inbox` | not on ParentTabs | **P0** |
| Switch to athlete view | `<ParentAthleteSwitcher />` in Navbar | absent | **P0** |
| Letters (athlete child's letters) | via athlete view | inaccessible | **P0** |
| Profile (own + child) | via athlete view | inaccessible | **P0** |
| Settings | `/settings` | not on ParentTabs | **P1** |
| Notifications | bell icon | not on ParentTabs | **P1** |

## 3. Screen-by-screen parity

### 3.1 ParentDashboard

- Lovable: 563 lines. Uses `useParentChildren()` to list linked athletes; per-child
  cards with quick actions; `ParentInviteModal`; `ParentTrustSafety` quick links;
  message digest; consent center.
- RN: `src/screens/parent/ParentDashboard.tsx` 747 lines. Existence: Likely Complete on
  size — but this is suspicious overshoot vs Lovable. Likely re-implements
  `ParentInviteModal` inline (Lovable lifts that to a shared component).
- Risk: ParentInviteModal is the inverse flow (athlete invites parent). On the parent
  side, the modal is "claim my child's profile via token". Need to verify which side
  is implemented and whether the invitation_token lookup works.
- Severity: P1 (verification). Effort: M.

### 3.2 ParentTrustSafetyScreen

- Lovable: `ParentTrustSafety.tsx` 21 lines (short marketing/info page).
- RN: 73 lines. Existence: Complete or overshoot — fine.
- However Lovable mounts ParentTrustSafety in PUBLIC routes too (`/parent-trust-safety`
  with no auth gate); RN mounts it inside ParentTabs only. Add to LegalStack /
  PublicTabs entry. Severity: P1. Effort: XS.

### 3.3 ParentalConsent

- Lovable: 21 lines (token-based consent acceptance).
- RN: `src/screens/auth/ParentalConsentScreen.tsx` 58 lines, mounted in AuthStack.
  Existence: Complete.
- Token deep-link via `?parent_token=<token>` — verify linking.ts maps it.

## 4. Cross-cutting components

| Component | Status |
|---|---|
| `<ParentAthleteSwitcher />` | **Absent in RN** — P0 |
| `<ParentInviteModal />` | unclear; if inlined in ParentDashboard, fine; if absent on Athlete side, P0 |
| Footer / legal | absent globally |
| Notification bell | absent on ParentTabs |
| Inbox affordance | absent on ParentTabs |

## 5. Live data validation

```
GET /rest/v1/parent_athlete_relationships?parent_user_id=eq.a50cc451-c79f-4bc3-a679-8ac2342b9b6f
→ 1 row: athlete_profile_id 094bd567-bf81-45f9-a7c4-7e4d922f810f, invitation_accepted true
```

```
GET /rest/v1/user_roles?user_id=eq.a50cc451-c79f-4bc3-a679-8ac2342b9b6f
→ [{"role":"athlete"},{"role":"parent"}]
```

```
GET /rest/v1/player_profiles?id=eq.094bd567-bf81-45f9-a7c4-7e4d922f810f
→ should return the linked child's profile; verify SELECT permission for parent role
```

## 6. Specific issue confirmations

- **Role-picker landing for testparent** — already canonical. P0.
- **Parent loses access to Messages/Letters** — RN sandwiches them into ParentTabs only.
  P0.
- **No view-as-athlete switch** — P0.
- **No inbox/messages on ParentTabs** — P0.

## 7. Effort tags

| Effort | Items |
|---|---|
| XS | Add Settings/Notifications navigation entry to ParentTabs |
| S | Build `<ParentAthleteSwitcher />` component |
| M | Refactor RootNavigator: when user has parent + athlete, render AthleteTabs with parent overlay (mirror Lovable) instead of routing exclusively to ParentTabs |
| L | Full Parent UX rebuild (consent center, child management, message digest) |

## 8. Severity-sorted gap list

| # | Sev | Effort | Area | Gap |
|---|---|---|---|---|
| 1 | P0 | S | AuthContext | `.maybeSingle()` blows up for parent (multi-row) — currently sends to OnboardingStack |
| 2 | P0 | M | RootNavigator | Parent-with-athlete should see AthleteTabs + overlay, not ParentTabs in isolation |
| 3 | P0 | S | Components | `<ParentAthleteSwitcher />` absent |
| 4 | P0 | XS | ParentTabs | Add MessagesTab, InboxTab equivalents |
| 5 | P0 | M | ParentDashboard | Verify ParentInviteModal flow + child profile fetch |
| 6 | P1 | XS | ParentTrustSafety | Mount in LegalStack + PublicTabs (pre-auth education) |
| 7 | P1 | XS | ParentTabs | Add Settings/Notifications affordances |
| 8 | P2 | S | Linking | `?parent_token=` deep-link to ParentalConsent |
| 9 | P2 | M | ParentDashboard | Compare-and-port Lovable's per-child action grid |
| 10 | P3 | XS | Parental UX copy | Verify message-digest and consent-center copy parity |

## 9. AMBIGUOUS — needs verification

- Whether RN ParentDashboard fetches via `useParentChildren()` or a direct query.
- Whether `RouteParam` `parent_token` is mapped in linking.ts.
- RLS for parent → athlete profile reads (player_profiles, letters_received,
  athlete_camp_enrollments).

## 10. Detailed recommendation

The right architectural fix is **not** to make ParentTabs a separate destination — it is
to mirror Lovable's "parent is an overlay on athlete":

1. RootNavigator branches:
   - If user has admin role → AdminTabs.
   - Else if user has any of {coach, hs_coach, club_coach, scout, agency} →
     respective recruiter tabs.
   - Else if user has influencer role → InfluencerTabs.
   - Else (athlete, or parent-with-athlete, or parent-only):
     - Route to AthleteTabs.
     - If user has parent role too, render `<ParentAthleteSwitcher />` in the header.
     - Provide a "Parent Dashboard" entry in the account menu.

2. Keep ParentTabs only as a navigator-only-when-parent-with-no-athlete-link (very rare —
   parent created account but athlete profile not yet linked).

3. Migrate `ParentDashboard` to a stack screen accessible from the AthleteTabs header
   account menu (mirroring Lovable's account-dropdown link).

This refactor unifies the experience and resolves multiple P0s in one shot. Effort: M-L.

## 11. Test plan

- Sign in as testparent → expect athlete tabs + parent affordances.
- Tap "View as Athlete (child)" → expect data swap to athlete_profile_id.
- Open `/parent/dashboard` directly → ParentDashboard should be reachable from account
  menu, no force-redirect.
- Open `/parent-trust-safety` from a deep link while signed-out → resolves to public
  legal screen.
- Validate testparent can read their child's letters via RLS.

## 12. Cross-references

- Issue 1 here is the same as Issue 1 in `01-athlete.md` — fix once benefits both roles.
- ParentTrustSafety inclusion in LegalStack benefits unauth users (`00-unauthenticated.md`).
- Parent's loss of Inbox parallels athlete's missing Activity tab — both stem from
  thin role-tabs.
