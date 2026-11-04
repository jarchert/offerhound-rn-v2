# OfferHound repository separation — mandatory owner rule (2026-11-03)

The OfferHound web application and React Native mobile application MUST always remain in separate GitHub repositories, with separate histories, branches, pull requests, audits, builds, dependencies, versioning, and release pipelines.

- Never combine them into a monorepo or merge one application's code or Git history into the other's repository.
- Never copy, vendor, embed, add as a submodule/subtree, or import the other application's source code into this repository.
- Implement parity independently in each platform. Coordinate through documented feature requirements, API behavior, data contracts, design specifications, and separately recorded test evidence.
- Each application must be buildable, testable, auditable, and releasable independently. A passing web check does not certify mobile, or vice versa.
- Keep runtime source and platform-specific build tooling in the appropriate repository. Investigate pre-existing cross-platform contamination without deleting historical work blindly.
- Compare both applications read-only during parity audits; identify each repository, branch, commit, platform, role, and test result.
- Do not change repository links or release branches without verifying the intended platform and project identity.
- This rule persists for all future OfferHound work unless the owner explicitly changes it.

Web: Lovable OfferHound MAIN (project a171504d-fe76-405b-b44d-3158df669502); GitHub jarchert/playbook-promoter-c3ae2d35 (branch jarchert/playbook-promoter), verified in Lovable Git settings.
Mobile: jarchert/offerhound-rn-v2; Expo @jarchert/offerhound-v2.
