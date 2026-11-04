# OfferHound native quality and staging — 2026-11-03

## Repository boundary
Native source and releases belong only to `jarchert/offerhound-rn-v2`, Expo `@jarchert/offerhound-v2`. The web application stays in `jarchert/playbook-promoter-c3ae2d35`. No source or Git history has been merged between them.

## Verified baseline and checks
- Base: `7aa6a56c8ea71bbfd45b37e019c98e16205140db`, branch `session-parity-port-phase1-2`.
- Expo's GitHub project link was connected to this native repository, root directory /.
- 122 native screen files and nine role tab navigators were inventoried. Counts do not prove functional parity.
- Clean install, TypeScript, ten real React Navigation deep-link cases, staging-isolation checks, and nine admin access-state cases passed.
- Both iOS and Android JavaScript bundles compiled, including the staging environment. These are bundle builds, not signed binaries or device E2E evidence.
- The April/July parity reports are historical; do not treat their issue totals or completion claims as current.

## Changes
- Restored a reproducible npm lockfile.
- Added native-only quality CI and required it before EAS build jobs. Removed continue-on-error from the iOS build.
- Fixed duplicate camps/scout-trends path registrations. The parser probe now checks the actual config without removing collisions, and failures produce a failing exit status.
- Added the canonical offer-hound.com JS link prefixes. OS domain association files/entitlements still need end-to-end validation.
- Native admin screens now remain unmounted until the server's is_admin() result allows the current user. An error, logout, account change, or unresolved auth cannot grant access.
- Role navigation now waits for role resolution and resets the navigator when the resolved role changes.

## Staging app
- Backend: `https://wrrfwvkixlzmnsztjfgg.supabase.co`, separate from production.
- Profile: `staging`; EAS environment: `preview`; channel: `staging`.
- App name: OfferHound QA; bundle/package id: `com.emergentmindlab.offerhoundv2.staging`; scheme: `offerhound-staging`.
- Staging does not claim production OS links. Extensions are disabled for this QA profile.
- Set both APP_ENV and EXPO_PUBLIC_APP_ENV to staging, plus the staging URL and public client key. Copy .env.staging.example to .env.staging.local for local bundle tests. The latter is ignored by Git.
- Configure the same EXPO_PUBLIC_* variables in Expo's preview environment before a remote staging build. Staging fails closed if its backend variables are absent or point elsewhere.
- Production defaults are preserved; no production publish or store submission was performed.

## Remaining verification
Signed simulator/device builds, all nine role journeys, session restore/agency selection, Google/Apple callback registration, minor/guardian authorization, outreach suppression, subscriptions, uploads, and OS domain handoffs remain release gates. Test data and integrations must be staging-only. Do not promote the separate web backend's policy drafts automatically.
