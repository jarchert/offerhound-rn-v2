# iOS Live Activities & Dynamic Island — Setup Guide

OfferHound uses **ActivityKit** (iOS 16.1+) and the **Dynamic Island** (iOS
16.1+ on iPhone 14 Pro and newer) to surface time-sensitive recruiting moments
on the Lock Screen and at the top of the screen — no need to open the app.

Bundle (extension):  `com.emergentmindlab.offerhoundv2.activities`
App Group:           `group.com.emergentmindlab.offerhoundv2.shared`
Apple Team:          `8MG7GFDJ62`

> ⚠️ Live Activities ship inside the **main app target's Widget Extension**
> on iOS — they are *not* a separate Xcode target on their own. Our
> `plugins/with-live-activities.js` adds the necessary `Info.plist` keys and
> Swift sources to the existing widget extension produced by
> `with-widgets.js`. If you ship widgets without Live Activities (or vice
> versa), see §5.

---

## 1. v1.0 use cases

| Activity                       | Trigger                                          | Lock-Screen content                                  | Dynamic Island content                                                            |
| ------------------------------ | ------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Camp check-in countdown**    | User RSVPs to a camp + camp starts within 24 h.  | Camp name, start time, "Check-in opens in **2h 14m**" countdown, school logo. | Compact: ⏱ 2h 14m. Expanded: school logo • camp name • countdown • "Check in" CTA. |
| **Recruiting deadline timer**  | Coach contact / scholarship offer with explicit deadline. | Coach school, "Reply by Fri 5pm — 1d 6h left", urgency color ramp. | Compact: 🔴 1d. Expanded: school logo • coach name • deadline • "Open" CTA.        |

Both activities should:

- Auto-end when the underlying timestamp passes (or the user dismisses).
- Update at most once per minute via `Activity.update(...)` to respect
  ActivityKit budget.
- Use stale-content placeholders if the app hasn't refreshed in > 8 hours.

---

## 2. Project layout

| Path                                                 | Purpose                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `ios-prebuild-assets/LiveActivities/OfferHoundActivityAttributes.swift` | `ActivityAttributes` definition (shared by app + widget ext).   |
| `ios-prebuild-assets/LiveActivities/OfferHoundActivityView.swift`       | Lock-screen + dynamic island SwiftUI views.                     |
| `plugins/with-live-activities.js`                    | Adds `NSSupportsLiveActivities=true` to `Info.plist` and copies the Swift sources into the widget extension. |

The `ActivityAttributes` file is referenced from **both** the main app target
(so the RN bridge can `start`/`update`/`end` activities) and the widget
extension (so the SwiftUI views can render them). The plugin handles dual
membership.

---

## 3. Native package status

There is currently **no** maintained `expo-live-activity` npm package that
fully covers our use cases on the SDK version we target. We therefore use a
lightweight in-app native module instead of an external package:

- TypeScript surface lives at `src/native/liveActivities.ts` (planned).
- Swift bridge `OfferHoundLiveActivitiesBridge` (planned, in main app target)
  exposes:
  - `startCampCheckIn(payload)` → `Activity<CampCheckInAttributes>.request(...)`
  - `startRecruitingDeadline(payload)` → `Activity<RecruitingDeadlineAttributes>.request(...)`
  - `updateActivity(id, contentState)` → `activity.update(...)`
  - `endActivity(id, dismissalPolicy)` → `activity.end(...)`
- All calls are **iOS 16.1+ guarded**; older devices return a successful
  no-op so callers don't need version checks.

If a viable Expo package emerges (e.g. official Expo Live Activities support),
we'll swap in and drop the bespoke bridge.

---

## 4. RN ↔ ActivityKit data flow

```
[RN] camp RSVP succeeded
  → publishWidgetSnapshot()         // (covered in IOS_WIDGETS.md)
  → if camp.startsAt - now < 24h:
       NativeModules.OfferHoundLiveActivitiesBridge.startCampCheckIn({
         campId, name, startsAt, schoolLogoUrl
       })
  → background task pings updateActivity() every 30 min until startsAt
  → on check-in success (or startsAt passes), endActivity(id, .immediate)
```

Push-token-driven updates (APNs alert→Live Activity) are **out of scope for
v1.0** — local timers + foreground updates are sufficient for our two use
cases.

---

## 5. Manual Xcode steps (only if not using the plugin)

1. Open the existing **OfferHoundWidgets** widget extension target.
2. **Info.plist** → add `NSSupportsLiveActivities` = `YES` (also add to the
   *main app* `Info.plist`).
3. Drag `ios-prebuild-assets/LiveActivities/*.swift` into the widget
   extension. Add `OfferHoundActivityAttributes.swift` to the **main app
   target's** "Compile Sources" too (dual membership).
4. Set deployment target ≥ **iOS 16.1**.
5. Verify on a device that supports Live Activities (iOS 16.1+ iPhone) — the
   simulator's Dynamic Island only debuted in Xcode 14.1 and behavior can be
   flaky.

---

## 6. Status checklist

- [x] Use cases defined (camp check-in, recruiting deadline)
- [x] `ActivityAttributes` Swift source written
- [x] Lock-screen + Dynamic Island SwiftUI views written
- [x] `with-live-activities.js` plugin in `app.json`
- [x] App Group reserved for cross-process state
- [ ] `OfferHoundLiveActivitiesBridge` Swift module implemented
- [ ] `src/native/liveActivities.ts` TS surface landed
- [ ] Camp RSVP flow triggers `startCampCheckIn`
- [ ] Coach contact deadline triggers `startRecruitingDeadline`
- [ ] On-device verification (iPhone 14 Pro+ for full Dynamic Island)

---

## References

- Apple — [ActivityKit](https://developer.apple.com/documentation/activitykit)
- Apple — [Displaying live data with Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- Apple — [Dynamic Island UX guidelines](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- Plugin — `plugins/with-live-activities.js`
- Companion doc — `IOS_WIDGETS.md` (shared App Group + plugin pipeline)
