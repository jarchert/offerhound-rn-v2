# Contact→LetterComposer Investigation Report

**Repo:** `/home/ubuntu/offerhound-rn-v2` @ `09d75ce` (branch `housekeeping-followups-2026-07-27`)
**Date:** 2026-09-05
**Scope:** Real bug report — "Contact" buttons across the app should navigate to LetterComposer with coach+athlete info pre-filled. User found this broken from an athlete's own profile.

---

## Platform assumption confirmed ✓

RN codebase is shared between iOS and Android. `app.json` targets `com.emergentmindlab.offerhoundv2` on both platforms from the same JS bundle. One code fix covers both. No platform-specific branches at any of the 14 trigger sites reviewed.

---

## 1. Every RN Contact/Letters trigger site (14 total)

| # | File / line | Trigger context | Current seed |
|---|-------------|-----------------|--------------|
| 1 | `src/components/coach/CoachMatchCard.tsx:158` | Coach card's built-in Contact — used on athlete dashboard, athlete profile, athlete matches (**reported bug site**) | Recipient (coach) only: `recipientName, recipientRole, schoolName, letterType, tone`. **No sender/athlete info.** |
| 2 | `src/screens/coach/CoachDashboard.tsx:150` | Coach viewing athlete on dashboard | `seed: { athlete }` — nested object silently ignored by `LetterComposerScreen` |
| 3 | `src/screens/scout/ScoutDashboard.tsx:185` | Scout viewing athlete | Same as #2 — silently ignored |
| 4 | `src/screens/hs-coach/HSCoachDashboardScreen.tsx:77` | HS coach viewing athlete | `seed: { athlete, surface }` — silently ignored |
| 5 | `src/screens/public/PublicProfileScreen.tsx:216` | Coach viewing athlete's public profile | Recipient (athlete) only: `prefillAthleteId, prefillAthleteName, recipientName`. **No sender info.** |
| 6 | `src/screens/public/PublicHSCoachProfileScreen.tsx:88` | Viewing HS coach's public profile | `{ prefill }` — opaque shape mismatch |
| 7 | `src/screens/public/PublicScoutProfileScreen.tsx:83` | Viewing scout's public profile | `{ prefill }` — opaque |
| 8 | `src/screens/shared/CoachProfileScreen.tsx:82` | Athlete viewing coach profile detail | Recipient (coach) only: `recipientName, schoolName`. **No sender info.** |
| 9 | `src/screens/shared/AthleteSearchScreen.tsx:365` | Recruiter searching athletes | Recipient (athlete) only, **no sender info** |
| 10 | `src/screens/scout/ScoutDirectoryScreen.tsx:82, 92` | Athlete/coach viewing scouts | Recipient only, **no sender info** |
| 11 | `src/screens/agency/AgencyDashboardScreen.tsx:304` | Agency staff viewing athletes | Recipient only, **no sender info** |
| 12 | `src/screens/agency/AgencyDashboardScreen.tsx:137, 224` | "Letter Center" quick actions | Empty seed — deliberate |
| 13 | `src/screens/club/ClubCoachDashboardScreen.tsx:275, 378` | Club coach quick actions | Empty seed — deliberate |
| 14 | `src/screens/agency/AgencyDashboardScreen.tsx:365` | Agency composer seed | Recipient only |

**Pattern: sender is never seeded anywhere in the 14 trigger sites. This is systemic, not a single site.**

---

## 2. "Working" reference in RN — none is fully correct

The best precedent is **#5** (`PublicProfileScreen.goLetter`) — uses the "flat named-field" shape that `LetterComposerScreen:52-69` actually consumes (`recipientName`, `prefillAthleteName`, `prefillAthleteId`). But even this seeds only the recipient, not the sender.

**MAIN has the sender-side infrastructure that RN is missing.** `src/components/letters/LetterComposer.tsx:52` on MAIN requires `senderProfile: SenderProfile` as a **mandatory prop**. MAIN's wiring goes through `useLetterCenter` hook → `LetterButton` wrapper → `goToLetterForAthlete`. The concept of "sender identity" got dropped entirely during the RN port.

---

## 3. Root cause of the reported athlete-profile bug

**Two overlapping causes converge at one site (`CoachMatchCard.handleContact`):**

**Cause A — Missing seed data (surface-visible bug):**
Lines 158-166 of `CoachMatchCard.tsx`:
```js
navigation.navigate('LetterComposer', {
  seed: {
    recipientName: coach.name || '',       // coach — ✓
    recipientRole: coach.title || 'Coach', // coach — ✓
    schoolName: coach.school || '',         // coach — ✓
    letterType: 'recruiting' as const,
    tone: 'professional' as const,
    // ❌ MISSING: senderName, senderRole, senderSchool — athlete's own info
  },
});
```
When an athlete taps this from their own dashboard/profile, the composer opens with a blank sender area. Athlete must manually type their own name, position, GPA, school every time.

**Cause B — Structural gap in `LetterDraft`:**
`LetterComposerScreen.tsx:27-34`:
```ts
interface LetterDraft {
  recipientName: string;
  recipientRole: string;
  schoolName: string;
  letterType: LetterType;
  keyPoints: string;
  tone: 'professional' | 'warm' | 'direct';
}
```
There are no `senderName` / `senderProfile` / `athleteProfile` fields. Even if seed data were passed with sender info, there is nowhere for it to land. The `generate-letter` edge function is invoked with only the `draft` (line 94), so the AI model doesn't receive the sender's context either — the generated letter is lower quality as a result.

**Cause A alone** makes the button feel "empty" for athletes.
**Cause B** makes the underlying letter generation lower quality regardless.

---

## 4. Same-cause instances across the app

**Every athlete-side or generic Contact-to-LetterComposer trigger has the same bug.** Sites #1, #5, #6, #7, #8, #9 all display the same missing-sender issue when the tapper is an athlete.

Sites #2, #3, #4 have a **second, additive bug** on top: `seed: { athlete }` passes a nested object, but `LetterComposerScreen` only destructures the flat named fields — so the athlete data is silently dropped on those coach-side dashboards too.

This is a systemic port gap, not a single missed site.

---

## 5. MAIN parity comparison

**MAIN is not fully correct either, but its bug is smaller.**

- ✅ MAIN has the `senderProfile` slot in `LetterComposer` → AI generation gets sender context correctly
- ❌ MAIN's coach-side Contact buttons rely on `goToLetterForAthlete` from `useLetterCenter`, which uses a hook cache lookup that fails on some surfaces (inconsistent recipient wiring)

**RN's bug is a strict superset of MAIN's:**
- Missing sender-side infrastructure entirely (Cause B, MAIN doesn't have this)
- Plus the same inconsistent recipient wiring MAIN has (Cause A)

Fixing RN cleanly requires porting MAIN's `senderProfile` concept into `LetterComposerScreen`'s draft model — this is a real Layer-2 refactor, not a one-liner.

---

## Recommended fix scope — need user decision

### Option A — Full port (right thing, larger change)
1. Add `senderName`, `senderTitle`, `senderSchool`, `senderRole`, `senderEmail` to `LetterDraft` + seed shape
2. Auto-seed sender fields from authenticated user's profile via `usePlayerProfile` / `useCoachProfile` / `useScoutProfile` (role-dependent) when seed doesn't provide them
3. Update `CoachMatchCard.handleContact` to pass athlete's own profile as sender when `viewerRole === 'athlete'`
4. Fix the 3 `seed: { athlete }` sites (CoachDashboard, ScoutDashboard, HSCoachDashboardScreen) to flat named-field shape
5. Verify `generate-letter` edge function payload accepts sender fields (need to check MAIN's `supabase/functions/generate-letter/index.ts`)
6. Tests: 4 viewer roles × 2 recipient types = 8 seed scenarios

**Scope:** ~15 files, ~200 lines net. **Risk:** touches every LetterComposer entry point.

### Option B — Minimal athlete-side fix (unblocks reported bug only)
1. Add just `senderName`, `senderRole`, `senderSchool` to `LetterDraft` seed shape
2. Update `CoachMatchCard.handleContact` — when `viewerRole === 'athlete'`, look up own profile via `usePlayerProfile()` and include in seed
3. Update `LetterComposerScreen` to display seeded sender info at top (read-only badge)
4. Leave `seed: { athlete }` sites alone (out of scope)
5. Tests: athlete-viewer contact from CoachMatchCard seeds sender correctly

**Scope:** ~3 files, ~50 lines net. **Risk:** low.

### Option C (recommended) — Option B + fix the 3 shape-mismatch sites
Same as B but also fix the 3 `seed: { athlete }` shape-mismatch sites (CoachDashboard, ScoutDashboard, HSCoachDashboardScreen) so coach-side dashboards start showing recipient prefill correctly for the first time.

**Scope:** ~7 files, ~90 lines net. **Risk:** low-medium.

**My recommendation:** Option C. It fixes the reported athlete-side bug plus the 3 obviously-broken coach-side sites that were already sending wrong-shape seeds, without doing the full sender-profile Layer-2 refactor that Option A entails (which deserves its own dedicated PR with visual QA on device).

---

## What I need from you

Pick A, B, or C before I start editing.
