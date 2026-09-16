# Known Test Flakes

_No currently-tracked flakes._

## Resolved

### AdminCampEventLog.test.tsx — next/prev pager (line ~303)  ✅ resolved 2026-08-31

**Test:** `AdminCampEventLog > next / prev pager updates .range() offsets`
**File:** `src/__tests__/AdminCampEventLog.test.tsx`

**Original symptom:** `Unable to find element with testID: camp-events-prev`,
preceded by "You seem to have overlapping act() calls" warnings. Measured 70%
fail rate under `npx jest --runInBand` at time of resolution (worse than the
initially-estimated ~30%).

**Real root cause (empirically confirmed):** Not just an act() race around
`fireEvent.press`. The pager UI is only rendered when `rows.length > 0` (see
`src/components/AdminCampEventLog.tsx:484`). When the Next button fires
`setPage(1)`, React Query refetches with a new query key and briefly returns
`undefined` for `data` — which drops `rows.length` to 0 and unmounts the
entire pager. If the second `fireEvent.press('camp-events-prev')` fires during
that refetch window, the `prev` button isn't in the tree.

**Fix applied:** Added `await waitFor(() => utils.getByTestId('camp-events-prev'))`
between the two presses to wait for the pager to re-mount after the refetch
completes. `waitFor` on `rangeCalls.length >= 2` alone was insufficient — that
waits for the query *call* to be made, not for the re-render that mounts the
pager back.

**Verification:** 10 consecutive `--runInBand` runs, all pass (0 fail / 10
pass). Compared to 3 pass / 7 fail baseline before the fix.

**First flagged:** 2026-08-31, during Group 3 #7 navigation-consolidation work.
**Resolved:** 2026-08-31.
