# 00 — Unauthenticated User Parity Audit

> Scope: Anonymous browsing. No auth, no role. Anything reachable on the Lovable web app
> while signed out, and the equivalent surface in the RN app's `PublicTabs` /
> `PublicSportStack` / `AuthStack` / `LegalStack` / `CampStack` (public subset) /
> `PublicProfileStack`.
>
> Lovable canonical: `/home/ubuntu/.openclaw/workspace/offerhound-repo/` @ `aa4d51e9`.
> RN target: `/home/ubuntu/offerhound-rn-push/` (`session-parity-port-phase1-2`).

## 1. Role definition & access

### Lovable (web) — what an unauthenticated user can reach

Routing source: `src/components/AnimatedRoutes.tsx` (294 lines, mounted under one
`<Routes>` with no auth guard). There is **no global `<RequireAuth>` wrapper**: every
route is technically reachable while signed out; pages that need data simply render
empty / show toasts / redirect themselves to `/auth`. That means the practical "public
surface" includes the marketing pages plus a long tail of pages that are public-by-route
but useless without a session.

Genuinely public-by-design pages (referenced from Navbar/Footer/landing CTAs while
signed out, or via deep links like `/p/:slug`):

| Lovable page | Route | LOC |
|---|---|---|
| `Landing` | `/` and `/landing` | 390 |
| `SportLanding` | `/football`, `/basketball`, `/soccer`, `/baseball`, `/softball`, `/volleyball`, `/lacrosse`, `/hockey`, `/golf`, `/swimming`, `/track`, `/cheerleading`, `/wrestling` | 38 (delegates to Landing) |
| `Auth` | `/auth` (signin / signup / reset via `?mode=`) | 413 |
| `BetaRegister` | `/beta-register` | 36 |
| `ParentalConsent` | `/parental-consent` | 21 |
| `Pricing` | `/pricing` | 356 |
| `Install` | `/install` | 21 |
| `FounderMessage` | `/founder-message` | 22 |
| `PublicProfile` | `/p/:customUrl`, `/profile/:customUrl`, `/athlete/:customUrl` | 219 |
| `SampleAthlete` | `/sample-athlete`, `/sample-athlete/:sport` | 124 |
| `SampleAthleteGallery` | `/sample-athlete/gallery`, `/sample-athlete/:sport/gallery` | 25 |
| `PublicScoutProfile` | `/scouts/:scoutId` | 122 |
| `PublicClubDiscovery` | `/discover/clubs` (alias `/discover/teams`) | 449 |
| `InfluencerBoard` | `/influencers` | 148 |
| `InfluencerProfile` | `/influencers/:handle` | 317 |
| `InfluencerBlogPost` | `/influencers/:handle/blog/:slug` | 210 |
| `PodcastLibrary` | `/podcasts` | 28 |
| `PodcastEpisodeDetail` | `/podcasts/:episodeId` | 32 |
| `NewsAndLearn` | `/news-learn` | 24 |
| `NILIntelligence` | `/nil-intelligence` | 306 (renders public preview if no user) |
| `Support` | `/support` | 79 |
| `TermsOfUse` | `/terms` | 36 |
| `PrivacyPolicy` | `/privacy` | 36 |
| `CookiesPolicy` | `/cookies` | 30 |
| `CCPARights` | `/ccpa` | 30 |
| `Accessibility` | `/accessibility` | 29 |
| `CommunityGuidelines` | `/community-guidelines` | 31 |
| `CoachCommunicationRules` | `/coach-communication-rules` | 74 |
| `ParentTrustSafety` | `/parent-trust-safety` | 21 |
| `PublicCampRegistration` | `/camps/:campId` | 966 |
| `ClaimCampSpot` | `/camps/claim` | 176 |
| `CampLeaderboardEmbed` | `/embed/leaderboard/:campId` (no chrome) | 103 |
| `CampSpectatorView` | `/camp/spectator/:token` | 256 |
| `CampStaffCheckin` | `/camp/staff-checkin/:token` | 78 |
| `UnsubscribeCampAlerts` | `/unsubscribe/camp-alerts` | 138 |
| `SubmitReference` | `/reference/:token` | 50 |
| `SubmitTestimonial` | `/testimonial` | 52 |
| `InviteShareCard` | `/invite/share-card` | 295 |
| `NotFound` | `*` catch-all | 18 |
| `AIExperienceSlides` | `/ai-experience-slides` | 28 (marketing slide deck) |
| `AthleteExperienceSlides` | `/athlete-experience-slides` | 36 |
| `AthleteProfileSlides` | `/athlete-profile-slides` | 32 |
| `CoachExperienceSlides` | `/coach-experience-slides` | 58 |

### RN — what `RootNavigator` shows when `!user`

`src/navigation/RootNavigator.tsx:130-141` enumerates the signed-out screen list:
`PublicTabs`, `PublicSportStack`, `AuthStack`, `PublicProfileStack`, `CampStack`,
`Install`, `FounderMessage`, `Pricing`, `Support`, `CoachCommunicationRules`, `NotFound`.

`PublicTabs` (`src/navigation/stacks/PublicTabs.tsx`) is a 4-tab bottom navigator:
**Home (LandingScreen), Discover (SportPickerScreen), Podcasts (PodcastScreen),
Account (SignInScreen)**. There is **no Legal tab** and no Influencers/Creators tab.

`AuthStack` (`src/navigation/stacks/AuthStack.tsx:30-47`) exposes Landing, Auth, SignIn,
SignUp, BetaRegister, ParentalConsent, DeleteAccount, PasswordReset, LegalStack.

`LegalStack` (`src/screens/legal/_LegalLayout.tsx` + 6 screens) has Terms, Privacy,
Cookies, CCPA, Accessibility, CommunityGuidelines.

`PublicSportStack` exposes `SportLanding_<sport>` for 13 sports — note
`SportLanding_trackfield` uses sport `track-field` while Lovable's path is `/track`.

`PublicProfileStack` — needs verification; not opened directly above; assumed to host
PublicProfile + PublicScoutProfile + InfluencerProfile from the public/ folder.

`CampStack` is registered for both signed-out and signed-in branches (lines 132 and 156),
so public camp-spectator/check-in/registration paths are reachable.

## 2. Navigation parity table

Comparison is "what a signed-out visitor can reach with one tap from the chrome"
(navbar links / public CTA buttons), per Lovable Navbar.tsx (signed-out branch) and the
RN `PublicTabs` plus AuthStack landing buttons.

| Nav item | Lovable (web) | RN (mobile) | Gap |
|---|---|---|---|
| Logo → `/` | ✓ | ✓ (LandingTab) | ok |
| Founder Message link | ✓ (Landing FounderRibbon) | partial — FounderMessageScreen exists but no entry button on LandingScreen | P2 |
| App Store badge in navbar | ✓ (`AppStoreBadge`) | n/a (it IS the app) | ok |
| Sign In CTA | ✓ (`/auth` button) | ✓ (AccountTab → SignInScreen) | ok |
| Sign Up CTA (separate from sign in) | ✓ | partial — buried inside AuthScreen toggle, no dedicated SignUpScreen tab | P3 |
| Pricing link | ✓ (Footer + Landing) | partial — `Pricing` registered as a route but no Public-tab/footer entry visible to signed-out user | P1 |
| Install link | ✓ | partial — InstallScreen registered but never linked from PublicTabs UI | P2 |
| Sport landing pages (13 sports) | ✓ deep links | ✓ via `PublicSportStack`, but **Discover tab uses SportPickerScreen** (114 lines) — a sport picker, not a "discover" hub like Lovable's `/discover/clubs` | P1 |
| Discover Clubs (`/discover/clubs`) | ✓ `PublicClubDiscovery` 449 lines | ✓ `PublicClubDiscoveryScreen` 532 lines, but **NOT linked from any public tab/screen** | P1 |
| Sample Athlete demo | ✓ called from CTA on Landing | partial — `SampleAthleteScreen` exists but Landing CTA wiring needs verification | P2 |
| Influencers / Creators board | ✓ `/influencers` | ❌ **PublicTabs has no Influencers tab.** Reachable only by deep link → InfluencerProfileScreen via PublicProfileStack | P1 |
| Podcasts | ✓ Footer + creator links | ✓ Tab present (PodcastScreen) — good | ok |
| News & Learn (`/news-learn`) | ✓ Footer link | partial — `NewsAndLearnScreen` exists (70 lines) but no nav entry | P2 |
| Coaches Directory (`/coaches`) | ✓ public, in Navbar for some flows | ❌ no public-tab entry; `CoachDirectoryScreen` exists (701 lines) but only inside CoachTabs | P1 |
| Scouts Directory (`/scouts`) | ✓ public | ❌ no public entry; `ScoutDirectoryScreen` only inside ScoutTabs | P1 |
| Athletes search (`/athletes`) | ✓ public | ❌ no public entry; `AthleteSearchScreen` exists (388 lines) but only inside CoachTabs flow | P1 |
| Camp discovery (`/camp-discovery`) | ✓ | ❌ no public entry from PublicTabs (CampDiscoveryScreen exists 258 lines) | P1 |
| Legal pages (Terms, Privacy, Cookies, CCPA, Accessibility, Community Guidelines, Coach Communication Rules, Parent Trust Safety) | ✓ Footer | partial — LegalStack exists for 6 of 8; **`CoachCommunicationRules` only mounted as a top-level RootStack screen**, **`ParentTrustSafety` not in LegalStack** at all (`src/screens/legal/` lacks it) | P1 |
| Support (`/support`) | ✓ Footer | ✓ registered top-level; **no footer/UI link** from PublicTabs | P2 |
| NIL Intelligence preview (`/nil-intelligence`) | ✓ public preview | ❌ `NILIntelligenceScreen` only registered for authed branch (RootNavigator line 188 inside the `:` branch) | P2 |
| AI/Athlete/Coach Experience slide decks | ✓ at `/ai-experience-slides` etc. | ❌ no RN screens (zero ports) | P3 (marketing) |
| Cookie Consent Banner | ✓ `<CookieConsentBanner />` | ❌ not found in RN App tree | P2 (legal) |
| Theme toggle | ✓ `<ThemeToggle />` in navbar | partial — no global theme toggle on PublicTabs UI | P3 |
| Notification Center | n/a unauth | n/a | ok |
| Back button (history-aware) | ✓ Lovable Navbar lines 235-247 | partial — relies on stack `back` button per screen | P3 |

## 3. Screen-by-screen parity

### 3.1 LandingScreen vs Landing

- Lovable: `src/pages/Landing.tsx` (390 lines). Imports SportSelector, ViewerTypeSelector,
  AthleteHeroContent, CoachHeroContent, AthleteFeaturesSection, CoachFeaturesSection,
  AthleteScreenshotsSection, CoachScreenshotsSection, LandingPodcastSection,
  HomepageVideoShowcaseLazy, AIUseCasesSection, FeaturedInfluencersStrip,
  TransferPortalFeed, FounderRibbon, StickyMobileSportHeader, Footer, ScrollToTop, SEO.
- RN: `src/screens/auth/LandingScreen.tsx` (565 lines). Imports SportSelector,
  ViewerTypeSelector, FounderRibbon, LandingHeroContent, LandingFeatures,
  AthleteScreenshotsSection, CoachScreenshotsSection, LandingPodcastSection,
  AIUseCasesSection, FeaturedInfluencersStrip.
- Existence: **Partial.**
- Visual gaps:
  - **Missing `HomepageVideoShowcaseLazy`** — Lovable shows a full-width video showcase
    section between hero and features. RN has no video player section. Severity: P1.
    Effort: M.
  - **Missing `TransferPortalFeed`** — Lovable surfaces transfer portal news ticker.
    Not present in RN imports. Severity: P2. Effort: M.
  - **Missing `StickyMobileSportHeader`** — Lovable adds a sticky sport header for mobile;
    RN doesn't add it (RN has its own sport selector but the sticky behavior is gone).
    Severity: P2. Effort: S.
  - **Hero rendering collapsed** — RN uses one `LandingHeroContent` with viewer toggle;
    Lovable uses two distinct components (`AthleteHeroContent` / `CoachHeroContent`).
    Likely smaller/less-detailed hero copy in RN. Severity: P2. Effort: S.
  - **Features section consolidated** — RN uses one `LandingFeatures`, Lovable renders
    `AthleteFeaturesSection` + `CoachFeaturesSection` separately, gated by viewer type.
    Severity: P2. Effort: S.
  - **No SEO meta tagging** — RN cannot render `<SEO>` (web only); but RN also lacks
    deep-link linking metadata in `src/navigation/linking.ts` for several sport routes.
    Severity: P3. Effort: S.
  - **No Footer** — Lovable Landing ends with `<Footer />` showing legal/social links.
    RN `LandingScreen` does NOT render any equivalent footer. All footer-linked legal
    pages are unreachable from Home. Severity: P1. Effort: M.
- Data wiring: Both pull `FeaturedInfluencersStrip` data — verified influencer table has 2
  rows (`/rest/v1/influencer_profiles?limit=1` Content-Range `0-0/2`). Risk: RN renders
  empty strip if no featured rows; need to inspect FeaturedInfluencersStrip RN port for
  empty-state handling.
- Loading/empty/error: Lovable uses framer-motion + Suspense fallback (PageFallback in
  AnimatedRoutes.tsx:131-148). RN LandingScreen has no Suspense — content renders inline.
  Severity: P3. Effort: XS.
- Severity summary: P1 (missing video, missing footer).

### 3.2 SportLandingScreen vs SportLanding

- Lovable: `src/pages/SportLanding.tsx` (38 lines) — useEffect sets sport context from
  pathname then renders `<Landing initialSport={sportFromPath} />`.
- RN: `src/screens/shared/SportLandingScreen.tsx` (10 lines) — returns `<LandingScreen />`
  with no params handed in. **However**, `LandingScreen` calls `useRoute()` itself and
  reads `route.params.sport` (lines 47-50), and `PublicSportStack` registers each route
  with `initialParams: { sport: '<sport>' }`. So data flow works — it's not a bug, just
  a stylistic difference.
- Gap: **`PublicSportStack` route name `SportLanding_trackfield` carries
  `sport: 'track-field'`** — matches Lovable enum. ✓.
- Severity: ok / no gap of substance.

### 3.3 AuthScreen vs Auth

- Lovable: `src/pages/Auth.tsx` (413 lines). Single page that toggles between sign-in,
  sign-up, password reset; honors `?mode=` and `?parent_token=`; supports OAuth Google +
  Apple; SEO; Footer.
- RN: `src/screens/auth/AuthScreen.tsx` (493 lines) PLUS dedicated SignIn (72) and SignUp
  (67) screens.
- Existence: Partial-to-Complete. RN has more screens but the routing is fragmented:
  `PublicTabs` AccountTab points at `SignInScreen`, while `AuthStack` has both Auth and
  SignIn. Risk of UX confusion.
- Functional gaps:
  - **OAuth Google/Apple buttons** — verify RN Auth includes both. Lovable Auth.tsx
    imports `signInWithProvider` from `useAuth`. RN AuthContext exposes
    `signInWithGoogle` and `signInWithApple` (lines 100-127), and AuthScreen presumably
    wires both. NEEDS visual confirmation. Severity: P1 if missing. Effort: S.
  - **`?mode=reset` deep-link handling** — RN linking.ts must map `auth?mode=reset` to
    AuthScreen with the `mode: 'reset'` param. AMBIGUOUS — verify.
  - **Parent token onboarding (`?parent_token=`)** — Lovable Auth.tsx accepts a parent
    token that pre-fills sign-up. RN AuthStack typings include `parent_token?: string`
    (AuthStack.tsx:21) but actual handling needs verification.
- Severity: P1 (auth flow is the ticket gate).

### 3.4 SignUpScreen — only 67 lines

A 67-line sign-up form is suspiciously thin given Lovable Auth's 413-line dual-mode page.
Likely missing: legal acknowledgement checkbox, role selector, parent-of-athlete option,
referral code capture from URL (`?ref=`). Severity: P1. Effort: M.

### 3.5 PricingScreen vs Pricing

- Lovable: 356 lines. Reads `user_roles` to detect influencer/coach (special pricing).
  Footer rendered. Coupon input, popup-blocked detection, `referralCode` from URL.
- RN: 542 lines. Existence: Likely Complete on layout, but:
  - **No public-tab entry** — user can only reach pricing if they manually navigate or
    deep link. Severity: P1. Effort: XS (add link).
  - Need to confirm coupon field and OAuth-provider checkout works inside RN webview.
    Stripe/Paddle on iOS triggers App Store policy concerns — `shouldHidePricingUI`
    helper exists in Lovable; verify equivalent gating in RN. Severity: P0 if not gated
    on iOS. Effort: S.

### 3.6 InstallScreen vs Install

- Lovable: 21 lines (very thin — likely a marketing one-pager linking to App Store).
- RN: `InstallScreen` 108 lines. Likely overshoots Lovable. **Conceptually irrelevant**
  inside the RN app — user is already installed. Could surface as "Add a Web Shortcut"
  card. Severity: P3. Effort: XS.

### 3.7 Footer parity (cross-cutting public)

Lovable `<Footer />` (referenced in Landing, Pricing, Auth, multiple pages). Verified
import in Landing.tsx line 4. The Footer typically lists Pricing, Founder Message,
Install, Support, Terms, Privacy, Cookies, CCPA, Accessibility, Community Guidelines,
Coach Communication Rules, Parent Trust Safety, Sample Athlete, Sitemap, social links,
podcast/newsletter signups.

**RN has NO equivalent global Footer component for unauthenticated screens.** Search:
`grep -r "Footer" src/screens/auth src/screens/shared/Landing*` returns nothing matching
a footer component. The bottom-tab bar replaces some functions but not most legal/info
links. Severity: P0 for legal compliance. Effort: M.

### 3.8 PublicCampRegistration vs PublicCampRegistrationScreen

- Lovable: 966 lines (one of the largest pages) — public deep-link registration flow.
- RN: `src/screens/camps/PublicCampRegistrationScreen.tsx` 977 lines. Existence: Likely
  Complete (line counts match). Severity: ok.

### 3.9 PublicProfile vs PublicProfileScreen

- Lovable: 219 lines. Resolves athlete by `customUrl`, renders gallery, stats, recruiting
  counters, Share buttons.
- RN: 238 lines. Existence: Likely Complete. Need to verify route param handling on
  three Lovable aliases (`/p/:customUrl`, `/profile/:customUrl`, `/athlete/:customUrl`).
  RN linking.ts handling needed. AMBIGUOUS — needs verification of linking config.
- Severity: P2.

### 3.10 NotFound vs NotFoundScreen

- Lovable: 18 lines, RN: 41 lines. RN goes beyond. Acceptable. ok.

### 3.11 Cookie banner / consent

Lovable `<CookieConsentBanner />` + `<CookiePreferencesModal />` in App.tsx. RN's app
shell does not mount these. Legal exposure: GDPR/CCPA cookie consent is required for web
but **for native apps, the equivalent is App Tracking Transparency (iOS) and an in-app
privacy modal**. RN has `PrivacySettingsScreen` (160 lines) but no first-launch consent
modal. Severity: P1 (App Store review will flag). Effort: M.

### 3.12 InfluencerBoard / Profile /
InfluencerBlogPost

- Lovable: `InfluencerBoard` 148, `InfluencerProfile` 317, `InfluencerBlogPost` 210.
- RN: `InfluencerBoardScreen` 279 (in `influencer/` not `public/`), `InfluencerProfileScreen` 468, `InfluencerBlogPostScreen` 275.
- Gap: RN's `InfluencerBoardScreen` lives in the `influencer/` folder and the only mount
  point is `InfluencerTabs.BoardTab` — i.e. authed-influencer-only. **A signed-out user
  cannot reach the creators directory** even though Lovable's `/influencers` route is
  fully public. Severity: P1. Effort: S (re-mount in PublicTabs or PublicProfileStack).

### 3.13 Marketing slide decks (4 pages)

Lovable: `AIExperienceSlides` (28), `AthleteExperienceSlides` (36), `AthleteProfileSlides`
(32), `CoachExperienceSlides` (58) — these are marketing demos linked from share/email
campaigns. RN: **zero ports**. Severity: P3 (marketing only, not in the core product
loop). Effort: M each.

### 3.14 Camp public surfaces

Public camp paths: `/camps/:campId`, `/camps/claim`, `/embed/leaderboard/:campId`,
`/camp/spectator/:token`, `/camp/staff-checkin/:token`, `/unsubscribe/camp-alerts`,
`/reference/:token`. All of these have RN equivalents in `src/screens/camps/`. The RN
`CampStack` is registered in BOTH the signed-out and signed-in branches of RootNavigator,
so deep-linking from email/SMS works without forcing auth — matches Lovable. Severity:
ok.

### 3.15 SubmitTestimonial / SubmitReference

- Lovable: SubmitTestimonial 52, SubmitReference 50 (both token-based public submission).
- RN: 166 + 156 lines. Existence: Likely Complete (RN screens overshoot). NEEDS visual
  confirmation that token-from-URL parsing works through RN linking.ts.

## 4. Cross-cutting components

| Component | Lovable | RN | Gap |
|---|---|---|---|
| Navbar | `src/components/Navbar.tsx` 470 lines, role-aware | none on PublicTabs (tab bar replaces it) | acceptable for native |
| BackButton | inside Navbar lines 235-247 (history-aware) | per-screen native stack back | acceptable |
| Footer | `<Footer />` global | **none** | P0 (see 3.7) |
| FloatingAICoach | mounted authenticated-only (`<GlobalAICoachIcon />`) | `<FloatingAICoach />` in RootNavigator only when `user` truthy (line 195) — matches | ok |
| ImpersonationBanner | shown for admins | not mounted in RN | P2 |
| CookieConsentBanner | global | none | P1 |
| ScrollRestoration | route change | RN uses native stack default | ok |
| ErrorBoundary | wraps App | NEEDS verification — search RN App.tsx | AMBIGUOUS |
| OfflineAppShell | offline cache UI | NEEDS verification | AMBIGUOUS |
| Toaster (sonner) | global | `react-native-toast-message` shown in AuthContext lines 13-16 | ok |
| SEO meta | `<SEO>` per page | n/a (native) — but linking.ts metadata still useful for share previews | ok |
| ThemeToggle | persistent | NEEDS verification — likely missing on PublicTabs | P3 |
| AppStoreBadge | navbar + multiple pages | n/a inside the app itself | ok |

## 5. Live data validation

No auth. Public tables only.

### 5.1 Featured influencers strip

```
GET https://abdzdcgsmdlnytkkhvtb.supabase.co/rest/v1/influencer_profiles?select=*&limit=10
Headers: apikey: <anon>
```
Result (admin token): Content-Range `0-0/2` (i.e. 2 influencer profiles). Verify the
public anon role has SELECT. RN strip should render two creators. Sanity: ok.

### 5.2 Sport landing data

`SPORTS_CONFIG` in `src/lib/data/sports.ts` (Lovable) and `@/lib/data/sports` (RN) — both
are local JSON, no DB. ok.

### 5.3 Public camp registration

`GET /rest/v1/camps?id=eq.<campId>&select=*` should be SELECT-able by anon role.
Cannot test without a known campId; AMBIGUOUS — sanity-check anon RLS in production.

### 5.4 Public profile resolution

`GET /rest/v1/player_profiles?custom_url=eq.<slug>&select=*,athlete_videos(*),athlete_stats(*)`
should return 1 row by `custom_url`. Anon SELECT is required. NEEDS verification.

### 5.5 Pricing / coupons

`GET /rest/v1/coupons?code=eq.<code>` — anon SELECT permitted in Lovable Pricing.tsx.
NEEDS verification.

## 6. Specific issue confirmations

(Athlete-reported issues are detailed in `01-athlete.md`; this section covers
unauth-equivalents.)

- **Returning user lands on role picker** — only fires post-auth, but the *pre-auth*
  symptom is harmless (RN sends to `PublicTabs`). Tracked in 01-athlete.md.
- **Sign in / sign up flow accessible from tab bar** — confirmed: AccountTab → SignIn.
  However, dedicated **Sign Up** route is not surfaced in PublicTabs. Users must tap
  "Account" then toggle to sign-up inside SignInScreen. Friction. Severity: P2.
- **Pricing page reachable to logged-out** — RN `PricingScreen` registered in
  `RootNavigator` signed-out branch (line 137), but **no UI link** from PublicTabs.
  Severity: P1.
- **Legal pages (compliance)** — App Store + Play Store require Privacy Policy / Terms
  links to be reachable from the app's primary entry. Currently buried inside `AuthStack
  → LegalStack`. **Add a footer-equivalent on Landing.** Severity: P0 (store-review
  blocker).

## 7. Effort tags summary

| Effort | Examples |
|---|---|
| XS | Add Pricing/Support/Install link to LandingScreen footer; pass `route.params` explicitly through SportLandingScreen wrapper |
| S | OAuth button parity in AuthScreen; ParentTrustSafety added to LegalStack; surface Influencers tab |
| M | Build a global RN `<PublicFooter>` component; port HomepageVideoShowcase; first-launch privacy/cookie consent modal |
| L | Port InfluencerBlogPost rich content rendering (markdown + embeds + comments) |
| XL | Recreate the four marketing slide decks with native gestures |

## 8. Severity-sorted gap list (flat)

| # | Severity | Effort | Area | Gap |
|---|---|---|---|---|
| 1 | P0 | M | Cross-cutting | No public Footer / legal-link surface — App Store review blocker |
| 2 | P0 | S | PricingScreen | iOS in-app purchase gating (`shouldHidePricingUI` equivalent) — verify |
| 3 | P1 | S | PricingScreen | No public-tab entry; user can't reach pricing from chrome |
| 4 | P1 | S | InfluencerBoard | No PublicTabs entry; creators directory unreachable while signed out |
| 5 | P1 | S | CoachDirectory / ScoutDirectory / AthleteSearch | No public entries — Lovable exposes `/coaches`, `/scouts`, `/athletes` publicly |
| 6 | P1 | M | LandingScreen | Missing `HomepageVideoShowcaseLazy` section |
| 7 | P1 | M | LandingScreen | Missing `<Footer />` — leaks to all public pages |
| 8 | P1 | S | LegalStack | `ParentTrustSafety` not added; `CoachCommunicationRules` mounted at root only |
| 9 | P1 | S | AuthScreen | OAuth Google + Apple buttons — verify present |
| 10 | P1 | M | AuthScreen / SignUpScreen | SignUp 67 lines = under-built; missing referral / parent_token / role hint |
| 11 | P1 | S | CampDiscovery | No public entry from PublicTabs |
| 12 | P1 | S | PublicClubDiscovery | No public entry from PublicTabs |
| 13 | P1 | M | App shell | First-launch privacy/cookie consent modal absent |
| 14 | P2 | S | LandingScreen | Missing `TransferPortalFeed` ticker |
| 15 | P2 | S | LandingScreen | Missing `StickyMobileSportHeader` |
| 16 | P2 | S | LandingScreen | Hero collapsed — single component vs two role-specific |
| 17 | P2 | S | LandingScreen | Features collapsed |
| 18 | P2 | XS | InstallScreen | No CTA into it; consider folding into Settings |
| 19 | P2 | S | NewsAndLearn | No nav entry |
| 20 | P2 | M | NILIntelligence | Authed-only mount; Lovable preview is public |
| 21 | P2 | XS | PublicProfile | Verify three-route alias (`/p/:slug`, `/profile/:slug`, `/athlete/:slug`) all resolve |
| 22 | P2 | S | ImpersonationBanner | Not mounted in RN |
| 23 | P2 | S | SignUpScreen | Dedicated sign-up entry from PublicTabs |
| 24 | P2 | XS | Support | No nav entry |
| 25 | P2 | XS | FounderMessage | No nav entry on LandingScreen |
| 26 | P3 | S | LandingScreen | No Suspense fallback equivalent |
| 27 | P3 | M | AI/Athlete/Coach experience slide decks | Zero ports |
| 28 | P3 | XS | LandingScreen | No SEO/linking metadata for sport routes |
| 29 | P3 | S | ThemeToggle | Not on PublicTabs |
| 30 | P3 | S | NotFoundScreen | Already covered (RN ahead of Lovable) |

## 9. AMBIGUOUS — needs verification

- RN linking.ts: do `/p/:customUrl`, `/profile/:customUrl`, `/athlete/:customUrl` all
  resolve? Verify path map.
- RN `PublicProfileStack` content — was not opened directly in this audit pass.
- RN `App.tsx` — verify `ErrorBoundary`, `CookiePreferencesProvider`, `OfflineAppShell`
  presence.
- RN `FeaturedInfluencersStrip` — does its empty-state render gracefully?
- RN `AuthScreen` — OAuth Google + Apple buttons present in JSX (signature confirmed in
  AuthContext, JSX needs visual).
