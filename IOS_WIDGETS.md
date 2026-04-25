# iOS Widgets — Engineering Guide

> Companion to `WIDGETS_SETUP.md` (which covers the Apple Developer portal +
> App Store Connect side). This file is the **engineering** reference: what
> the widgets show, where their data comes from, and how the data bridge
> between the React Native app and the WidgetKit extension works.

Bundle: `com.emergentmindlab.offerhoundv2.widgets`
App Group: `group.com.emergentmindlab.offerhoundv2.shared`
Apple Team: `8MG7GFDJ62`

---

## 1. Widgets shipped in v1.0

| Widget            | Sizes              | Headline content                                                 |
| ----------------- | ------------------ | ---------------------------------------------------------------- |
| Recent Letters    | small, medium      | Latest 1 / 3 recruiting letters (school logo, school, time ago)  |
| Upcoming Camp     | small, medium      | Next camp with city, date, days-until countdown                  |

Both widgets carry the **"Recruiting Pipeline at a glance"** brand framing:
small = the single most-important card; medium = a richer 2–3-card snapshot.
A *large* size is planned but not yet implemented.

Swift sources live at:

- `ios-prebuild-assets/Widgets/` (canonical, used by `with-widgets.js` plugin)
- `widget-targets/`               (mirror — see `widget-targets/README.md`)

---

## 2. Data bridge: RN → WidgetKit (UserDefaults shared container)

WidgetKit extensions cannot make network calls on their typical refresh path,
and they cannot import Hermes/JS. They read from the **App Group**'s shared
`UserDefaults` suite, which the React Native app writes to whenever the
underlying data changes.

### 2a. Write side (React Native)

```ts
// src/native/widgets.ts (planned)
import { NativeModules, Platform } from 'react-native';

const APP_GROUP = 'group.com.emergentmindlab.offerhoundv2.shared';

export type RecentLetter = {
  id: string;
  schoolName: string;
  schoolLogoUrl: string | null;
  receivedAt: string; // ISO8601
};

export type UpcomingCamp = {
  id: string;
  name: string;
  city: string;
  state: string;
  startsAt: string;   // ISO8601
};

export async function publishWidgetSnapshot(payload: {
  recentLetters: RecentLetter[];
  upcomingCamp: UpcomingCamp | null;
  publishedAt: string;
}) {
  if (Platform.OS !== 'ios') return;
  const Bridge = NativeModules.OfferHoundWidgetBridge;
  if (!Bridge?.writeSnapshot) return;
  await Bridge.writeSnapshot(APP_GROUP, JSON.stringify(payload));
}
```

The bridge module (Swift, in the main-app target — *not* the widget target)
calls:

```swift
let defaults = UserDefaults(suiteName: appGroup)
defaults?.set(jsonString, forKey: "OfferHoundWidgetSnapshot")
WidgetCenter.shared.reloadAllTimelines()
```

### 2b. Read side (WidgetKit)

```swift
// In the Widget extension's TimelineProvider:
let defaults = UserDefaults(suiteName: "group.com.emergentmindlab.offerhoundv2.shared")
let json = defaults?.string(forKey: "OfferHoundWidgetSnapshot")
let snapshot = decode(json) ?? .placeholder
```

### 2c. When to publish

Trigger `publishWidgetSnapshot()` from the RN app when:

- A new recruiting letter arrives (`useRecentLetters` invalidation).
- The user adds / RSVPs to a camp (`useUpcomingCamps` invalidation).
- App foreground (cheap idempotent refresh).
- After auth state changes (sign-in writes; sign-out clears the snapshot).

---

## 3. Plugin behaviour

`plugins/with-widgets.js` (already in `app.json`'s `plugins` array):

- Adds a `WidgetExtension` Xcode target.
- Copies Swift sources from `ios-prebuild-assets/Widgets/` into
  `ios/OfferHoundWidgets/` on `expo prebuild`.
- Wires the App Group entitlement onto **both** the main app and the widget
  extension.
- Sets the widget bundle id and Apple Team id.

The plugin honours `EXPO_INCLUDE_WIDGETS` from `eas.json`'s build profile
`env` block — set `false` to skip widget target generation (e.g. on the
Android-only `production-play` profile).

---

## 4. Manual Xcode steps (only if not using the plugin)

If for some reason the plugin is bypassed and you need to add the target by
hand:

1. **File → New → Target → Widget Extension**
2. Product Name: `OfferHoundWidgets` (no SwiftUI App Clip checkbox).
3. Bundle id: `com.emergentmindlab.offerhoundv2.widgets`.
4. Team: `8MG7GFDJ62`.
5. **Signing & Capabilities → +Capability → App Groups** →
   `group.com.emergentmindlab.offerhoundv2.shared` (also add to the main
   target if not already present).
6. Drag the three `.swift` files from `widget-targets/` into the new target.
7. Build target = the same iOS deployment target as the main app.

---

## 5. Status checklist

- [x] Bundle id reserved (`com.emergentmindlab.offerhoundv2.widgets`)
- [x] App Group reserved (`group.com.emergentmindlab.offerhoundv2.shared`)
- [x] Swift sources written (`RecentLetters`, `UpcomingCamp`, `Bundle`)
- [x] `with-widgets.js` plugin in `app.json`
- [x] `widget-targets/` mirror created
- [ ] `OfferHoundWidgetBridge` native module (Swift) implemented
- [ ] `publishWidgetSnapshot()` TS helper landed
- [ ] Snapshot publish wired into letters + camps invalidation paths
- [ ] First on-device verification (TestFlight build → add widget → confirm
      data appears)
- [ ] Large-size variants (future)

---

## References

- Apple — [WidgetKit](https://developer.apple.com/documentation/widgetkit)
- Apple — [Sharing data with your widget](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date#Share-data-with-your-widget)
- Plugin — `plugins/with-widgets.js`
- Apple-portal walk-through — `WIDGETS_SETUP.md`
- Mirror — `widget-targets/README.md`
