# 07 — Influencer Role Parity Audit

> Test user: `influencer.test@offerhound.com` / `TestInfluencer2024!` — uid `a1b2c3d4-e5f6-4789-9abc-def012345678`

## 1. Role definition & access

### Lovable

`isInfluencer = hasInfluencerRole || !!influencerProfile` (Navbar.tsx:84). Two-source
detection: a `user_roles.role = "influencer"` row AND/OR a row in `influencer_profiles`.
Either is sufficient. Influencers are deliberately separated from athlete recruiting:
**`renderInfluencerNav()` (lines 211-222) shows ONLY**:
- Creator Studio (`/influencer/dashboard`)
- My Profile (`/influencers/<handle>` if handle set)
- Creators (`/influencers`)
- Messages (`/messages`)

Lovable comment lines 209-210 explicitly: "Influencer = content creator. NO
athletic-recruiting links (no Letters, Camps, Coaches & Recruiting, NIL AI, Gallery, or
compare/match tools)."

Pages reachable as influencer:
- `/influencer/dashboard` → InfluencerDashboard (143)
- `/influencers` → InfluencerBoard (148)
- `/influencers/:handle` → InfluencerProfile (317)
- `/influencers/:handle/blog/:slug` → InfluencerBlogPost (210)
- `/influencers/onboarding` → InfluencerOnboarding (244)
- `/podcasts` → PodcastLibrary (28)
- `/podcasts/:id` → PodcastEpisodeDetail (32)
- `/messages`, `/inbox`, `/settings`, `/notifications`, `/pricing`
- Settings → `/settings/following` for the Following list

### RN

`roleToInitialRoute('influencer')` → `'InfluencerTabs'`.

`InfluencerTabs`:
- DashboardTab → InfluencerDashboard (199)
- BoardTab → InfluencerBoardScreen (279)
- PodcastsTab → PodcastScreen (81)

3 tabs.

## 2. Navigation parity table

| Nav item | Lovable | RN | Gap |
|---|---|---|---|
| Creator Studio (Dashboard) | `/influencer/dashboard` | DashboardTab | ok |
| My Profile (`/influencers/<handle>`) | nav link | absent on tabs | P1 (no quick access to own public page) |
| Creators (`/influencers`) | nav link | BoardTab | ok |
| Messages (`/messages`) | nav link | absent on tabs | P0 |
| Podcasts (`/podcasts`) | implicit | PodcastsTab | ok |
| Following (`/settings/following`) | account menu | RN FollowingSettingsScreen 245 — not on tabs, accessible via SettingsStack | P2 |
| Blog post (read/edit) | `/influencers/:handle/blog/:slug` | InfluencerBlogPostScreen exists in `public/` (275) | partial — no compose/edit affordance |
| Inbox | implicit | absent | P1 |
| Settings | account | via SettingsStack | ok |
| Notifications | bell | absent | P2 |

## 3. Screen-by-screen parity

### 3.1 InfluencerDashboard

- Lovable: 143 lines. Cards: my podcasts, my blog posts, follower count, recent
  notifications, monetization summary.
- RN: 199 lines. Likely Complete on size.

### 3.2 InfluencerBoardScreen vs InfluencerBoard

- Lovable: 148, RN: 279. Likely Complete (overshoot).

### 3.3 InfluencerProfileScreen vs InfluencerProfile

- Lovable: 317, RN: 468. Likely Complete (overshoot).
- Mounted in `src/screens/public/` — accessible from BoardTab tap-through but not from
  own profile tab. Influencer cannot quickly see "my profile as others see it" —
  acceptable but minor friction. P3.

### 3.4 InfluencerBlogPostScreen vs InfluencerBlogPost

- Lovable: 210, RN: 275. Likely Complete on read.
- **Composer/edit mode**: Lovable's blog post edit happens via the dashboard's "+ New
  Post" button (rich text editor). RN: no obvious composer screen. Severity: P1.
  Effort: L.

### 3.5 InfluencerOnboardingScreen vs InfluencerOnboarding

- Lovable: 244, RN: 305. Likely Complete (overshoot).

### 3.6 PodcastScreen vs PodcastLibrary / PodcastEpisodeDetail

- Lovable: PodcastLibrary 28 (very thin), PodcastEpisodeDetail 32. Likely small because
  they delegate to a heavy `PodcastPlayerProvider` shared context.
- RN: PodcastScreen 81, PodcastLibraryScreen 100, PodcastEpisodeDetailScreen 121. Likely
  Complete.
- The InfluencerTabs PodcastsTab points at PodcastScreen, not PodcastLibraryScreen. The
  difference: PodcastScreen may be a personal management view ("my podcasts") while
  PodcastLibraryScreen is the public consumption view. Likely intentional.

### 3.7 FollowingSettingsScreen vs FollowingSettings

- Lovable: 112, RN: 245. Likely Complete.

## 4. Cross-cutting components

| Component | Status |
|---|---|
| Footer | absent |
| `<PodcastMiniPlayer />` | Lovable mounts it globally (App.tsx); RN status unverified | P1 if absent |
| `<PodcastPlayerProvider>` | Lovable wraps the app; RN status unverified | P1 if absent |
| Notification bell | absent |
| Creator share-card | absent |
| Blog rich-text editor | absent | P1 |

## 5. Live data validation

```
Auth uid a1b2c3d4-...
GET /rest/v1/user_roles?user_id=eq.<uid>             → confirmed [{"role":"influencer"}]
GET /rest/v1/influencer_profiles?user_id=eq.<uid>    → expect 1 row with handle, bio, followers
GET /rest/v1/influencer_blog_posts?author_user_id=eq.<uid>  → schema check
GET /rest/v1/podcast_episodes?host_user_id=eq.<uid>  → schema check
```

Sanity from earlier admin probe: `influencer_profiles` has 2 total rows. Test influencer
should be one of them. AMBIGUOUS — exact tables to verify.

## 6. Specific issue confirmations

- Single role row → no role-picker bug.
- 3-tab shell: thin but acceptable per Lovable's intentional minimalism for influencers.
- **Messages absent**: P0 (an influencer needs to receive sponsorship/collab DMs).
- **No blog composer** in RN: P1.
- No quick "view my profile" link: P3.

## 7. Effort tags

| Effort | Items |
|---|---|
| XS | Add Messages tab to InfluencerTabs |
| XS | Add "View as public" link from DashboardTab → InfluencerProfileScreen |
| S | Verify PodcastMiniPlayer + PodcastPlayerProvider mounted in RN App tree |
| L | Build blog post composer / edit mode |
| M | Following management surfacing in InfluencerTabs |

## 8. Severity-sorted gap list

| # | Sev | Effort | Area | Gap |
|---|---|---|---|---|
| 1 | P0 | XS | InfluencerTabs | Missing Messages tab |
| 2 | P1 | L | Blog | No composer / edit-mode for InfluencerBlogPost |
| 3 | P1 | XS | InfluencerTabs | No "My Profile" public preview link |
| 4 | P1 | XS | InfluencerTabs | No Inbox tab |
| 5 | P1 | S | PodcastPlayer | Verify global PodcastMiniPlayer + Provider mounted |
| 6 | P2 | XS | NotificationBell | absent |
| 7 | P2 | M | FollowingSettings | Not surfaced in InfluencerTabs |
| 8 | P2 | M | Monetization | Verify dashboard cards: payouts, sponsor offers |
| 9 | P3 | XS | InfluencerProfile | Self-preview link |
| 10 | P3 | M | Notifications | Influencer-specific notification types (new follower, podcast comment) |

## 9. AMBIGUOUS — needs verification

- Whether `influencer_blog_posts`, `podcast_episodes`, `influencer_followers` tables
  exist with those names.
- Whether RN's `PodcastPlayerProvider` exists (Lovable wraps App in it).
- Whether the blog composer is intentionally web-only.

## 10. Recommendations

1. Add MessagesTab to InfluencerTabs immediately.
2. Build a minimal blog composer (markdown editor + image picker) — without it,
   influencers cannot create content from the app.
3. Wire global PodcastMiniPlayer for cross-tab playback continuity.
4. Add a "View My Profile" link from InfluencerDashboard.

## 11. Test plan

- Sign in as influencer.test → InfluencerTabs.
- Open DashboardTab → see my podcasts + blog posts.
- Tap "+ New Blog Post" → composer opens.
- Compose post → publish → appears in /influencers/<handle> profile.
- Receive new follower notification → bell shows badge.

## 12. Cross-references

- Podcast player needs to be a global RN context, not per-screen. Cross-cutting fix.
- Influencer is the only role where the deliberately-thin tab bar matches Lovable's
  intent (Lovable nav has 4 items for influencer); contrast with thin recruiter shells
  which are gaps not features.

## 13. Detail: Lovable-stated intent

From Navbar.tsx lines 209-210: "Influencer = content creator. NO athletic-recruiting
links (no Letters, Camps, Coaches & Recruiting, NIL AI, Gallery, or compare/match
tools)." This is a deliberate product decision. RN must NOT add Letters or Recruiting
tabs to InfluencerTabs even though they exist for athletes — would violate role
separation.

## 14. Multi-role users (athlete + influencer)

Some influencers are also athletes (e.g. NIL deals). Lovable resolves precedence by
showing the influencer nav (line 167: `isInfluencer ? renderInfluencerNav() : ...`).
RN currently picks one based on first user_roles row → wrong if athlete row comes first.
This is a P1 corner case for multi-role users. Effort: S (priority list fix in
fetchUserRole).

## 15. Push notification expectations

- New follower → InfluencerDashboard activity feed.
- New blog comment → Inbox (absent → P1).
- Podcast episode publish complete → InfluencerDashboard.
- Sponsor offer → Messages (absent → P0).

## 16. Monetization & compliance

- Stripe Connect (or Tipalti) for creator payouts — verify RN dashboard surfaces
  payout history.
- 1099 tax forms — annual, end-of-year. Likely admin-issued.
- FTC #ad disclosure tagging on blog posts — composer must support.
- COPPA: if creator audience includes minors, parental consent UI on follow flow.
