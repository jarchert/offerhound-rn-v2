# Share Card "Cut Off At Bottom" — Investigation Findings

**Date:** 2026-09-12
**Reported symptom:** Share card modal cut off at bottom, Share/action controls unreachable, no scroll available.
**Referenced prior fix:** commit `cd10343` — "remove nested ScrollView so Share button is reachable (Bug 3)".

---

## Question 1: Is cd10343's fix still present at HEAD?

**YES — the fix is intact and correct.**

Evidence:
- `git merge-base --is-ancestor cd10343 HEAD` → `YES`
- `git log --oneline cd10343..HEAD -- src/components/SharePlayerCardDialog.tsx` → **empty** (zero commits touched this file after cd10343)
- Current file content at `src/components/SharePlayerCardDialog.tsx:70-83` shows:
  - NO `<ScrollArea>` wrapper (confirmed via `grep`)
  - `<ProfileCardGenerator />` is a direct child of the capture `<View>`
  - The Bug 3 comment block (lines 67-73) is present and correct
- Existing test `src/__tests__/SharePlayerCardDialogBug3.test.tsx` still passes (would trip if the nested ScrollView came back)

**Scenario 1 (fix reverted) is ruled out.**

---

## Question 2: If the fix IS present, why does the symptom persist?

Three scenarios were on the table:

### (a) DIFFERENT screen/component than the one cd10343 fixed

**PARTIALLY TRUE — this is the primary root cause.**

Beyond `SharePlayerCardDialog`, the codebase has TWO OTHER share-card entry points that cd10343 did NOT fix:

**1. `ShareRoleCardDialog` (src/components/ShareRoleCardDialog.tsx)** — used by:
- `AgencyDashboardScreen` (`role="scout"`)
- `ClubCoachDashboardScreen` (`role="club_coach"`)
- `HSCoachDashboardScreen` (`role="hs_coach"`)

It uses a **raw `<Modal>` + bottom-sheet layout** (NOT the `<Dialog>` component), with `maxHeight: '85%'` on the sheet and its own `<ScrollView>` inside. The sheet renders:
- Header row (title + X)
- `<ScrollView>` containing: card (avatar/name/email/QR) + action buttons (Share/Copy)

It has **only one ScrollView** (no nesting), but its `contentContainerStyle: { padding: spacing.lg, gap: spacing.lg }` — no `paddingBottom` beyond `spacing.lg`, no `flexGrow`. If the ScrollView container itself is height-constrained by the parent sheet, the content SHOULD scroll — this appears structurally fine BUT has never been tested end-to-end for bottom-button reachability on short devices. **Recommend adding the same style of Jest structural test.**

**2. Standalone `ProfileCardGenerator` inside `SocialLinksManager`** — used on the **athlete Profile tab** of `DashboardScreen` (and the scout/coach/agency social sections).

This is NOT a modal. The `ProfileCardGenerator` (which includes the tall header, measurables, contacts, socials, radar graph, and QR row) plus a `<CardShareActions>` action bar is rendered directly inside a `<CardContent>` inside a screen-level `<ScrollView>` (the outer `DashboardScreen` scroll). On short phones with the "Show Card" toggle expanded, the card is very tall; the OUTER scroll handles this. But if the surrounding screen has any fixed-height container, action buttons could go off-screen and appear unreachable. **This is the same category as Bug 3 but at the screen level, not the dialog level.**

### (b) LATER commit tonight reintroduced a nested-scroll or fixed-height container

**FALSE — no post-cd10343 commit touches these files.**

```
$ git log --oneline cd10343..HEAD -- \
    src/components/SharePlayerCardDialog.tsx \
    src/components/ShareRoleCardDialog.tsx \
    src/components/ui/Dialog.tsx \
    src/components/ProfileCardGenerator.tsx
```
Output: **empty**. Zero commits after cd10343 have modified any of the share-card-related files. The Layer 2 spacing changes (`284dac6`) and the letter composer fix (`bf290be`) touch entirely different subsystems. Ruled out.

### (c) Device-size/content-length combination the original fix didn't cover

**POSSIBLY TRUE — but only for the athlete `SharePlayerCardDialog` on very small viewports.**

`SharePlayerCardDialog`'s dialog container has `maxHeight: '90%'` (styles.content, line 103). Combined with:
- `ProfileCardGenerator` renders: header, badges, measurables (2-col grid), contact grid, socials pills, stat strip, events table (if track/swim), **radar graph** (~250-300pt tall), QR row, and an action bar
- The radar chart alone is a large SVG that adds significant vertical height
- `DialogContent` has its own single `<ScrollView>`, so the content SHOULD scroll

The existing test `SharePlayerCardDialogBug3.test.tsx` only verifies STRUCTURE (that there is exactly ONE ScrollView) — it does NOT verify that a very-tall `ProfileCardGenerator` (with the radar chart) actually renders inside that ScrollView reachable-by-scroll. The mocked `ProfileCardGenerator` in the test is trivial (two Text elements). **A regression could theoretically slip through if, say, someone added `overflow: 'hidden'` to the ScrollView's container or removed the ScrollView's ability to grow beyond `maxHeight: 90%`.** But grepping `overflow: 'hidden'` shows it's on `styles.content` in SharePlayerCardDialog, which is the OUTER wrapper — that's fine, the ScrollView is inside.

**Verdict: SharePlayerCardDialog structurally looks correct. Cannot fully verify without running on a real device, but the code is doing what it should.**

---

## The Real Answer

The screenshot most likely shows **`ShareRoleCardDialog`** (scout/coach/hs_coach) — which was NEVER fixed by cd10343 and has NEVER been tested for bottom-cutoff reachability. cd10343 only patched the athlete-specific `SharePlayerCardDialog`.

**Alternate possibility:** the standalone `SocialLinksManager` "Shareable Athlete Card" section on the Profile tab of `DashboardScreen`, where a very tall `ProfileCardGenerator` + action bar sits inside a screen-level `ScrollView`. This would show the same symptom on short phones with long content.

To definitively narrow down which of the two:
- If the reported screen was on **Agency/Club/HS-Coach dashboards** → it's `ShareRoleCardDialog`.
- If the reported screen was on the **Athlete's Profile tab in the "Shareable Athlete Card" card** (not the header "Share" button that opens the dialog) → it's `SocialLinksManager`.
- If it was the **Athlete tapping "Share Player Card" from their dashboard** → it's `SharePlayerCardDialog` and this is unexpected because cd10343 fixed it.

---

## Proposed Fix Plan

### Priority 1: `ShareRoleCardDialog` — apply cd10343-style hardening

Currently the ScrollView's `contentContainerStyle` is `{ padding: spacing.lg, gap: spacing.lg }`. To match the same discipline as `SharePlayerCardDialog` and guarantee bottom-button reachability on short viewports:

- Add `paddingBottom` = `spacing.xl` (or larger) to ensure the last action button has breathing room from the bottom edge.
- Add `flexGrow: 1` to the ScrollView's contentContainerStyle so it always fills the available height AND expands beyond it when content is tall.
- Verify sheet's `maxHeight: '85%'` gives the ScrollView a definite max height (it does, since sheet is inside a `Pressable` with `flex:1` backdrop).
- Add a Jest test asserting: (i) exactly ONE ScrollView in the rendered Modal, (ii) the "Share" and "Copy Link" action nodes are present as descendants of that ScrollView (so they're scrollable-to), (iii) no nested ScrollView inside the sheet.

### Priority 2: Ensure `SocialLinksManager` "Shareable Athlete Card" action bar is reachable

Since this component is rendered inside a screen-level ScrollView, the fix is primarily about ensuring nothing constrains its height. Verify:
- `CardContent` around `ProfileCardGenerator` and `CardShareActions` does not have `overflow: 'hidden'` or a fixed height.
- The parent screens (`DashboardScreen`, `CoachDashboard`, `ScoutDashboard`, `AgencyDashboardScreen`) render `SocialLinksManager` inside a real scrollable container.
- Add a Jest test rendering `SocialLinksManager` with `role="athlete"` and `showFullCard=true`, asserting the `CardShareActions` node is a descendant of the same component tree (no clip/overflow container in between).

### Priority 3: Strengthen the existing `SharePlayerCardDialogBug3.test.tsx`

The current test uses a trivial `ProfileCardGenerator` mock (two Text elements). Add a companion test that mocks `ProfileCardGenerator` to render a KNOWN-TALL block (e.g., 20 x 100pt rows = 2000pt) and asserts:
- The "share-player-card-capture" View AND the sibling `CardShareActions` are both rendered
- Both are descendants of exactly one ScrollView between them and the Modal root
- No `overflow: 'hidden'` container sits between the ScrollView and the CardShareActions

---

## Reported before applying any code changes

Per your instructions ("Report real findings ... before applying any fix"), pausing here for direction. The likely fix scope is:
1. `ShareRoleCardDialog.tsx` — add `flexGrow:1` + `paddingBottom` to `styles.content`, plus new test file
2. Companion tests strengthening structural coverage on all three share-card render paths

Confirm which path to take:
- **A)** Apply Priority 1 + new tests for `ShareRoleCardDialog` only (most likely fix)
- **B)** Apply Priorities 1 + 2 + 3 (comprehensive: cover all three paths)
- **C)** Provide the actual screenshot's screen origin (athlete dashboard, coach dashboard, HS coach dashboard, etc.) so I can zero in on exactly one of the three components.
