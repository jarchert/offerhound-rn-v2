# Native guest-change provenance audit

Baseline: native repository `jarchert/offerhound-rn-v2`, commit `d3ed41c74e341538d38cd9b1b6336da926ecb0af`. This feature branch descends only from that native history. Its sole Git remote is the native repository. No web history, repository, submodule or application source was imported.

Automatic upload review flagged historical headers that describe earlier web-to-native conversions. Inspection with `git show` proves those headers and their surrounding implementation already exist in the native baseline listed below. They were not introduced by this guest-registration work. The owner rule explicitly requires investigation of pre-existing contamination without blindly deleting historical work. This audit does not certify the independence of that earlier conversion.

| Existing native file | Already-native baseline blob |
|---|---|
| src/components/CampEnrollmentManager.tsx | fddf51ca0baeb93d43061497b242cf9c15a96eb8 |
| src/hooks/useCampCheckinSync.ts | 473ee5080a21f38669e2dd4a3fbe629592c98965 |
| src/lib/checkinQueue.ts | c2dfe95ca8093390548530e2f287e64a61d21d73 |
| src/screens/camps/CampMobileCheckinScreen.tsx | beed529c96906b654fba393d45522ca938c336bf |
| src/components/ui/Button.tsx | edd1df54374ddd816c0a8242253a27d565820348 |
| package.json | 3bee4aef780337c585e464b7f15d691afce73bfa |

The new edits to those files are limited to guest fields/name display, the native guest form integration, staff-scoped queue synchronization, serialized AsyncStorage writes, unreadable-storage protection, a button test identifier and the independent native test command. The old direct staff-as-attendee guest insert is replaced with the approved API call. The queue's former claim of unchanged conversion logic was updated because its synchronization behavior changed; the baseline provenance is retained here rather than erased.

`CampGuestWalkupForm.tsx`, `nativeCampGuest.ts`, the native queue tests, QA flows and API requirements were authored independently for React Native. They use native controls, native storage and the documented backend contract. The backend SQL remains solely in the web/backend review branch; it is not uploaded here. The web guest form and IndexedDB implementation were not copied into this repository.

Checks: the native repository-boundary checker passes; all runtime imports resolve within native source or its own dependencies; package dependencies exactly match the baseline; native type/quality checks and nine storage/transport tests pass. Both SDKs independently pass fifteen staging API scenarios. Actual guest device journeys remain pending at the time of this audit.
