# 08 — Admin Role Parity Audit

> Test user: `admin@offerhound.test` / `AdminAccess2025!` — uid `a767dcdb-b368-4f0d-91d6-631d3f52fc53`

## 1. Role definition & access

### Lovable

`useAdminRole()` hook checks `user_roles.role IN ('admin','moderator')`. `isAdmin` is
highest priority in `getDashboardLink()` (Navbar.tsx:131) → `/admin`.

Admin nav (Navbar lines 270-275): "Admin" link with shield icon, plus athlete nav
suppressed (line 168: `(!isAdmin && renderAthleteNav())`).

Pages reachable as admin (Lovable):
- `/admin` → AdminDashboard (103)
- `/admin/onboarding` → AdminOnboarding (37)
- `/admin/optout-audit` → AdminOptOutAuditViewer (541)
- `/admin/test-passwords` → AdminTestPasswordRotation (229)
- `/admin/influencers` → AdminInfluencers (29)
- `/admin/podcasts` → AdminPodcasts (62)
- `/admin/media-center` → AdminMediaCenter (467)
- `/admin/letter-analytics` → AdminLetterAnalytics (355)
- `/admin/recharts-artifacts` → RechartsSmokeArtifacts (25)
- All other pages — admins can impersonate any role via `<ImpersonationProvider>`.

### RN

`roleToInitialRoute('admin' | 'moderator')` → `'AdminTabs'`.

`AdminTabs` (6 tabs):
- OverviewTab → AdminDashboard (71)
- UsersTab → AdminUsersScreen (133)
- ModerationTab → AdminModerationScreen (21) — **STUB**
- ContentTab → AdminContentScreen (43)
- AuditTab → AdminAuditScreen (21) — **STUB**
- SettingsTab → AdminSettingsScreen (22) — **STUB**

## 2. Navigation parity table

| Nav item | Lovable | RN | Gap |
|---|---|---|---|
| Admin Dashboard | `/admin` | OverviewTab | partial (71 vs 103) |
| Users management | implicit | UsersTab → AdminUsersScreen 133 | RN-extension |
| Moderation | not in Lovable | ModerationTab (stub) | **stub** |
| Content | partial via AdminMediaCenter | ContentTab (43) | partial |
| Audit | `/admin/optout-audit` | AuditTab (21) | **massive gap** Lovable 541 vs RN 21 |
| Settings (admin) | implicit | SettingsTab (22) | stub |
| Influencers admin | `/admin/influencers` | absent | P1 |
| Podcasts admin | `/admin/podcasts` | absent | P1 |
| Media Center | `/admin/media-center` (467) | absent | P1 |
| Letter Analytics | `/admin/letter-analytics` (355) | absent | **P0** |
| Test Password Rotation | `/admin/test-passwords` (229) | absent | P2 (dev only) |
| Onboarding admin | `/admin/onboarding` | absent | P2 |
| Impersonation | `<ImpersonationProvider>` global | absent | **P0** |

## 3. Screen-by-screen parity

### 3.1 AdminDashboard

- Lovable: 103 lines. Top-level stats: total users by role, signups today/week, active
  sessions, system health, top errors.
- RN: 71 lines. Likely Partial.

### 3.2 AdminUsersScreen

- No direct Lovable page. RN-extension. 133 lines — likely supports search + role
  assignment + impersonate. AMBIGUOUS — verify impersonate button.

### 3.3 AdminModerationScreen — 21 line STUB

- No Lovable page. RN extends but is a stub. **P0**.
- Should support: flagged content review, message report queue, user suspension.

### 3.4 AdminContentScreen — 43 lines

- Partial parity with Lovable AdminMediaCenter (467 lines). Massive gap.
- Should support: video uploads, podcast publishing, blog post moderation, banner image
  management.

### 3.5 AdminAuditScreen — 21 line STUB

- Lovable AdminOptOutAuditViewer is 541 lines: filterable log, CSV export, opt-out
  tracking for CCPA/GDPR.
- **P0 compliance gap.** Without a viewer, GDPR/CCPA right-to-delete + opt-out audit
  trail can't be produced on demand.

### 3.6 AdminSettingsScreen — 22 line STUB

- No Lovable equivalent (Supabase config-driven). RN-extension as stub. Should support:
  feature flags, system maintenance mode, banner messages, A/B test toggles.

### 3.7 AdminInfluencers / AdminPodcasts / AdminMediaCenter — completely missing

- Lovable: 29, 62, 467 lines.
- RN: zero ports.
- Severity: P1 each.

### 3.8 AdminLetterAnalytics — completely missing

- Lovable: 355 lines (Recharts dashboards: deliverability, open, response, by-coach
  cohort).
- RN: not ported.
- **Severity: P0** — letters are a core paid feature; admin must monitor deliverability.

### 3.9 AdminOnboarding / AdminTestPasswordRotation

- Lovable: 37, 229 lines.
- RN: not ported.
- Severity: P2 (admin-internal tooling).

## 4. Cross-cutting components

| Component | Lovable | RN | Gap |
|---|---|---|---|
| `<AdminBadge />` | ✓ | absent | P2 |
| `<ImpersonationBanner />` | ✓ | absent | **P0** |
| `<ImpersonationProvider>` | ✓ | absent | **P0** |
| Audit log writer hook | ✓ | unverified | P1 |

Without impersonation, an admin cannot debug user-specific issues in-app — must use
Supabase Studio. Critical CS / engineering gap.

## 5. Live data validation

```
Auth uid a767dcdb-...
GET /rest/v1/user_roles?select=role&limit=1 (Prefer: count=exact)  → 86 total rows
GET /rest/v1/influencer_profiles?limit=1  (count exact)            → 2 rows
GET /rest/v1/admin_audit_log                                        → schema check (likely)
GET /rest/v1/profiles?limit=1                                       → restricted by RLS
```

Confirmed: 86 user_roles rows in DB. Admin RLS reads work via Bearer token.

## 6. Specific issue confirmations

- Single admin role row → no role-picker bug.
- 6 tabs but **3 are stubs** (Moderation, Audit, Settings) → P0.
- Letter Analytics, Media Center, Influencer Admin, Podcast Admin not ported → P0/P1.
- ImpersonationProvider absent → P0 for CS workflows.
- AdminBadge absent → P2 polish.

## 7. Effort tags

| Effort | Items |
|---|---|
| XS | Add AdminBadge to header |
| S | Wire impersonation read-only mode (impersonate-as) |
| M | Flesh out Moderation tab with flagged-content list |
| M | Flesh out Audit tab with filterable log + CSV export |
| L | Port AdminMediaCenter (467 lines) |
| L | Port AdminLetterAnalytics (355 lines, charts) |
| L | Build full impersonation system with banner + context provider |

## 8. Severity-sorted gap list

| # | Sev | Effort | Area | Gap |
|---|---|---|---|---|
| 1 | P0 | L | Impersonation | ImpersonationProvider + Banner absent |
| 2 | P0 | L | AuditScreen | 21-line stub vs Lovable 541-line opt-out audit viewer (compliance) |
| 3 | P0 | M | ModerationScreen | 21-line stub; no flagged-content queue |
| 4 | P0 | L | AdminLetterAnalytics | Not ported (355 lines, deliverability) |
| 5 | P1 | L | AdminMediaCenter | Not ported (467 lines) |
| 6 | P1 | M | AdminInfluencers | Not ported |
| 7 | P1 | M | AdminPodcasts | Not ported |
| 8 | P1 | M | AdminContentScreen | 43-line scaffold; expand |
| 9 | P1 | M | AdminSettingsScreen | 22-line stub; add feature flags + maintenance mode |
| 10 | P2 | M | AdminOnboarding | Not ported |
| 11 | P2 | M | AdminTestPasswordRotation | Not ported (dev tooling) |
| 12 | P2 | XS | AdminBadge | Absent |
| 13 | P3 | S | RechartsArtifacts | Smoke-test only |

## 9. AMBIGUOUS — needs verification

- Whether `admin_audit_log` / `optout_audit` tables exist with those names.
- Whether RN has any impersonation hook in `src/hooks/`.
- Whether moderation tables (`reports`, `flagged_content`) exist.
- Whether AdminUsersScreen has a working impersonate button.

## 10. Recommendations

1. Implement read-only impersonation FIRST: lets admin debug other roles' UX. Effort M.
2. Port Audit viewer for compliance. Effort L.
3. Port Letter Analytics for product/CS visibility. Effort L.
4. Promote Moderation queue from stub to MVP (list of reports + Resolve button).
5. Defer Media Center / Influencer Admin / Podcast Admin until content volume warrants.

## 11. Test plan

- Sign in as admin → AdminTabs (6 tabs).
- OverviewTab: sees stats.
- UsersTab: searches user, taps row, sees full profile + impersonate button.
- ModerationTab: sees flagged content list.
- AuditTab: filters by user_id, exports CSV.
- ContentTab: uploads a banner; appears on landing page.
- SettingsTab: toggles maintenance mode; banner appears app-wide.
- Trigger impersonation → ImpersonationBanner visible at top of every screen.

## 12. Cross-references

- Audit log writer is shared with all other roles — every PII action needs to log.
- Moderation queue intersects with influencer (blog comments), athlete (profile reports),
  parent/child (consent withdrawals).
- Letter Analytics intersects with coach/scout/HS coach (their letter performance).

## 13. Stub-density observation

3 of 6 admin tabs (Moderation, Audit, Settings) are 21-22 lines = stubs. That's 50% stub
density on the most-permissioned role. Fix before any admin-facing release.

## 14. Compliance posture

- GDPR Article 15 (right of access) — admin needs a "User data export" button. Absent.
- GDPR Article 17 (right to erasure) — DeleteAccount exists for self-serve; admin
  bulk-erase absent.
- CCPA opt-out — `AdminOptOutAuditViewer` is the audit trail; absent in RN. P0.
- App Store privacy nutrition labels — must reflect actual data collection; admin can't
  confirm without media center.

## 15. Operational tooling gaps

Lovable's `/admin/test-passwords` (229 lines) is a password-rotation utility for the
test fleet of accounts. Useful in CI/QA, not production. RN port deferred — acceptable
P2.

## 16. Multi-admin coordination

If two admins act on the same flagged report, no locking. Lovable likely doesn't either,
but as moderation volume grows this becomes important. Out of scope for current build.
