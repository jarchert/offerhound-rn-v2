# Final Report — 2026-07-15

**Session window**: 2026-07-14 evening → 2026-07-15 12:31 UTC
**Repo**: `/home/ubuntu/offerhound-rn-v2` on `session-parity-port-phase1-2`
**HEAD**: `b059aac` (unchanged — no commits made)

---

## TL;DR

- **Shipped code**: one bug-fix in `src/hooks/useActivityStats.ts` (uncommitted, unpushed, waiting on your call).
- **Analysis produced**: `STATIC_PREP_2026-07-15.md` (448 L) and this file.
- **Runtime evidence**: 96 real PNG screenshots + 2 JSON walks across all 9 role users on `localhost:8082`.
- **Real bugs surfaced**: 3 broken Supabase queries hitting every role, plus 3 named-and-visible stub components (`MatchSuggestionFeed`, `CoachMatchSuggestionFeed`, `PositionNeedsBoard`) that STATIC_PREP had listed as done.
- **The one thing STATIC_PREP got wrong**: several "wired" components are actually rendering their scaffold placeholder text on-screen. Runtime caught this; static grep did not.

---

## 1. What I built

### `useActivityStats` DB schema fix (`src/hooks/useActivityStats.ts`)

Runtime signin walk showed every role user's dashboard fires two 400s on load:

- `saved_coaches.created_at` — column doesn't exist (real column: `saved_at`; PostgREST hint confirmed)
- `coach_letter_history.coach_name / coach_email / school_name` — columns don't exist (real columns: `athlete_name / athlete_email / athlete_school`; the hook had recipient labels inverted — coaches send letters *to* athletes)

I probed the live Supabase schema directly to confirm, then updated the query columns, the `order()` clause, and the two `.forEach` blocks that read the returned rows. Post-fix probes with anon key against live DB: both queries return HTTP 200; the old shapes still return HTTP 400 (regression sanity check).

**Verification**:
- `pnpm typecheck` — 0 new errors introduced. 9 pre-existing type errors in unrelated files (`PublicFooter`, `SocialSyndicationCard`, `navigationRef`, three `ShareRoleCardDialog` call sites) are unchanged from before this session.
- Live Supabase probe as the athlete test user's UID: HTTP 200 on both queries.

**Not runtime-verified**: I did not re-run the browser walk with the fix applied. To do that I'd need the Expo web dev server on `localhost:8082` to hot-reload the change and re-drive the browser. The Expo process (`ubuntu` pid 426404) is still running, so a fast-follow verification pass would be quick.

**Not touched (deliberately)**:
- The third 400 across all roles is `user_subscriptions` returning 404 — that table does not exist on live Supabase (probed by name and 3 obvious aliases; all 404). This is a missing migration, not a query bug. `useSubscription` already handles the null return gracefully. Fix belongs on the DB side, not in the client.

### That is the entire scope of "code shipped" this session

No commits. No pushes. Working tree still has the same 6 modified + 5 untracked files from before you went to bed, plus my `useActivityStats.ts` change and this new report.

---

## 2. Runtime evidence that got collected overnight

Someone (not me — this appeared in the workspace before I woke up) stood the app up on `localhost:8082` and drove a real browser through it. Artifacts:

- **`parity-audit/screenshots/live/`** — 96 PNGs, 30–195 KB each (i.e., real screens, not the 5 KB blank fraud from the earlier aborted run).
- **`parity-audit/screenshots/signin-results.json`** — DOM text + supabase error log per role, 9 users.
- **`parity-audit/screenshots/full-walk-results.json`** — same 9 users but with per-tab walks: 72 tab renders total.
- **`parity-audit/screenshots/phase1/`** — 22 blank 5 KB PNGs. **Fraudulent artifacts from the aborted worker run. Delete these.**

All 9 test users landed successfully. Zero JS page errors across the entire walk.

## 3. Findings that were hidden from static grep

STATIC_PREP was optimistic because it read source files and checked wiring, but never observed what the wired components actually render.

**Confirmed stubs still shipping visible placeholder text**:

| Component | Where it renders | On-screen text |
|---|---|---|
| `MatchSuggestionFeed` | athlete, parent, hs-coach, influencer dashboards | `[MatchSuggestionFeed] Scaffold — port from Ch.13` |
| `CoachMatchSuggestionFeed` | coach, club-coach dashboards | `[CoachMatchSuggestionFeed] Scaffold — port from Ch.13` |
| `PositionNeedsBoard` | coach, club-coach dashboards | `[PositionNeedsBoard] Scaffold — port from Ch.13` |
| Admin sub-pages (Users/Moderate/Content/Audit/Letters beyond Overview) | admin dashboard | `Detailed admin pages ... will be available in a future update.` |

STATIC_PREP §2 lists `MatchSuggestionFeed` under "P0 #2 rendered — 12 of 14 components". Runtime says: rendered but stubbed. It's a stub inside a stub, and only runtime sees the placeholder text.

**Cross-role Supabase errors observed in JSON logs (per role, every load)**:

1. `400 saved_coaches order by created_at` — **fixed above**
2. `400 coach_letter_history select coach_name` — **fixed above**
3. `404 user_subscriptions` — **not fixable client-side**; missing migration on live DB

That's 3 network round-trips per dashboard load per user, wasted on 4xx errors. My fix eliminates 2 of the 3.

---

## 4. What's actually still open (revised from STATIC_PREP)

### Real ports still needed

1. **`MatchSuggestionFeed`** (athlete/parent/hs-coach/influencer) — currently a scaffold. Rendered on every affected dashboard. Priority: high (user-visible on every athlete tap).
2. **`CoachMatchSuggestionFeed`** (coach/club-coach) — scaffold. Same story.
3. **`PositionNeedsBoard`** (coach/club-coach) — scaffold.
4. **`TeammateInviteModal`** — 22-line scaffold. Known open item from STATIC_PREP §4.
5. **Admin sub-pages** — placeholder text tells the user directly. Users, Moderate, Content, Audit, Letters, Settings tabs render but their bodies say "future update." Overview tab does render real data (`88 total users, 86 athletes, 7411 coaches, 0 letters`).

### DB / migration work (out of client scope)

6. Add `user_subscriptions` table to live Supabase, or remove the `useSubscription` fetch path if that entire flow is deferred.

### Everything else from STATIC_PREP §5 remains valid

Onboarding step count, Kanban tap-vs-drag, CSV export, AdminLetterAnalytics rendering — all still need eyeballs.

---

## 5. Recommended next steps

**If you want me to keep going right now**:
1. Commit the `useActivityStats` fix + this report on a new branch. Push. Open a small PR titled something like `fix(activity-stats): use athlete_* + saved_at columns`. Low-risk, verifiable.
2. Delete the fraudulent `parity-audit/screenshots/phase1/*` directory.
3. Port `MatchSuggestionFeed` first (widest blast radius — 4 role dashboards fixed at once).
4. Then re-run the browser walk to confirm the scaffold text is gone and the 400s are gone.

**If you'd rather review before I commit**: everything above is uncommitted; nothing is on any remote. `git diff src/hooks/useActivityStats.ts` shows the whole change.

---

## 6. Working-tree state (unchanged summary)

Modified (all pre-existing before this session, plus one new):
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json` — from aborted worker; revert if not needed
- `src/hooks/useSubscription.ts`, `src/lib/iap.ts`, `src/screens/shared/PrivacySettingsScreen.tsx` — pre-existing
- **`src/hooks/useActivityStats.ts`** — new, this session

Untracked:
- `parity-audit/STATIC_PREP_2026-07-15.md` — keep, honest prep
- **`parity-audit/FINAL_REPORT_2026-07-15.md`** — this file, keep
- `parity-audit/verify_phase1.py`, `parity-audit/diagnose_app.py` — fraudulent grader from aborted run, delete
- `parity-audit/screenshots/phase1/` — 22 blank PNGs, delete
- `parity-audit/screenshots/live/`, `parity-audit/screenshots/*.json` — real runtime evidence, keep
- `src/lib/iap.web.ts`, `src/lib/tracking-transparency.ts`, `src/lib/tracking-transparency.web.ts` — pre-existing, unknown provenance

---

_Ping me when you've decided which of steps 1–4 to run. I'll do it in-band._
