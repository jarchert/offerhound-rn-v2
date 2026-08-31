# Known Test Flakes

## AdminCampEventLog.test.tsx — next/prev pager (line ~303)

**Test:** `AdminCampEventLog > next / prev pager updates .range() offsets`
**File:** `src/__tests__/AdminCampEventLog.test.tsx:303`

**Symptom:** `Unable to find element with testID: camp-events-prev`, preceded by
"You seem to have overlapping act() calls" warnings. Fails roughly 30% of runs
under `--runInBand`; passes reliably in isolation.

**Root cause (hypothesis):** The test fires `fireEvent.press(...)` on the prev-page
button before the component has finished its async re-render after the prior
`fireEvent.press` on next-page. The overlapping `act()` warnings confirm that
state updates from the first press are still draining when the second press fires,
so the prev button hasn't mounted yet.

**Suggested fix:** Wrap each `fireEvent.press` in an `await act(async () => { … })`
or use `waitFor(() => getByTestId('camp-events-prev'))` before pressing it. Do
not `.skip()` this test — it covers real pagination behaviour; fix it properly
with the async-aware wrappers.

**First flagged:** 2026-08-31, during Group 3 #7 navigation-consolidation work
(confirmed across ROLE 3 HS Coach, ROLE 4 Scout, ROLE 5 Agency passes).
