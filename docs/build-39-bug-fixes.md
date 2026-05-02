# Build 39 Bug Fix Plan

## Root Cause of Most Regressions

Build 38 was built from branch `session-parity-port-phase1-2` which is **18 commits behind** `parity/2026-04-29`. The parity branch contains fixes for:
- Ghost yellow circles removal
- Navbar/hamburger on 35 screens
- BackButton on 8 dead-end screens
- Share card rebuilds (player + role cards)
- AI coach avatar/system-prompt alignment
- Letter composer pipeline repair
- Gallery social share
- Dashboard share/scroll buttons
- 4 missing route registrations

**Action: Build 39 must be built from `parity/2026-04-29` or a merge forward.**

## Remaining Issues (not yet fixed on parity/2026-04-29)

### 1. Settings — navigation broken for Legal links
SettingsScreen navigates to `SettingsStack > LegalStack > screen` but it's already inside SettingsStack. Should navigate directly to `LegalStack > screen`.

### 2. Settings — no back button
No BackButton component on SettingsScreen.

### 3. Messages tab — no back/home navigation
MessagesScreen (when used as a tab) has no way to go back to dashboard.

### 4. Gallery — "Profile Not Found" for non-athlete roles
GalleryScreen uses usePlayerProfile() which only queries player_profiles. Non-athlete users get null profile → redirect to Onboarding or error.

### 5. Edge function 400 on Letter Composer
The generate-letter edge function returns 400. Backend issue — needs investigation of the Supabase edge function.

### 6. Dark/light mode toggle doesn't work
ThemeContext toggles state but theme.ts colors are hardcoded dark values. Nothing reads the theme state to swap colors.

### 7. Unauthenticated homepage — no top global nav
LandingScreen has a sticky header that only appears after scrolling 400px. No visible top navbar with logo + hamburger on initial view.

### 8. Bottom nav bar inconsistency
Some screens show tab bar, some don't. Need to audit all role navigators.

### 9. AI Coach avatar — verify against live Lovable
Files are byte-identical to Lovable repo, but Lovable project may have updated since last sync.

### 10. Shareable player card modal — verify parity
Commits on parity branch rebuilt the share card dialogs. Need to verify against Lovable.
