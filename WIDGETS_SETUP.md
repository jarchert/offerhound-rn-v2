# iOS Widgets — Setup Guide

This document covers everything **outside** the code that's required to ship
the two OfferHound iOS widgets:

- **Recent Letters** — latest recruiting letters (small / medium)
- **Upcoming Camp** — next recruiting event (small / medium)

The Swift sources live in `app/ios-prebuild-assets/Widgets/` and are copied
into the generated Xcode project by `app/plugins/with-widgets.js`.

> ⚠️ Do **not** run `expo prebuild` to validate this scaffold — coordinate with
> the maintainer first; the prebuild step rewrites the entire `ios/` folder.

---

## 1. Apple Developer portal

Sign in to <https://developer.apple.com/account/> as the team admin.

### 1a. Register the Widget bundle id

1. **Certificates, Identifiers & Profiles → Identifiers → `+`**
2. Select **App IDs**, then **App**.
3. Description: `OfferHound Widgets`
4. Bundle ID (explicit): `com.emergentmindlab.offerhoundv2.widgets`
5. Capabilities — enable **App Groups**.
6. **Continue → Register**.

### 1b. Create / confirm the App Group

1. **Identifiers → App Groups → `+`**
2. Description: `OfferHound Shared`
3. Identifier: `group.com.emergentmindlab.offerhoundv2.shared`
4. Register.

### 1c. Assign the App Group to both bundle ids

For **each** of these identifiers:

- `com.emergentmindlab.offerhoundv2` (host app)
- `com.emergentmindlab.offerhoundv2.widgets` (widget extension)

Open the identifier → **App Groups → Configure** → tick
`group.com.emergentmindlab.offerhoundv2.shared` → **Save**.

### 1d. Provisioning profiles

If you manage profiles manually, regenerate the app + widget provisioning
profiles so the App Group entitlement is included. EAS Build with automatic
credentials handles this on the next cloud build.

---

## 2. Xcode (one-time, after the next `expo prebuild`)

The config plugin copies Swift + `Info.plist` + entitlements into
`ios/OfferHoundWidgets/` and tries to register a PBXGroup, but **the Widget
Extension target itself must be created in Xcode the first time**. The
community `xcode` parser that Expo uses cannot fully wire up an app-extension
target.

1. Open `ios/OfferHound.xcworkspace` in Xcode.
2. **File → New → Target…** → **Widget Extension** → **Next**.
3. Product Name: `OfferHoundWidgets`.
4. Bundle Identifier: `com.emergentmindlab.offerhoundv2.widgets`.
5. Team: OfferHound team.
6. **Include Configuration Intent: OFF** (we use `StaticConfiguration`).
7. When prompted to activate the scheme, click **Activate**.
8. In the Project navigator, delete the boilerplate `.swift` file Xcode
   created inside the new `OfferHoundWidgets/` group, **without** moving it
   to Trash.
9. Right-click the `OfferHoundWidgets` group → **Add Files to "OfferHound"…**
   → select:
    - `OfferHoundWidgetBundle.swift`
    - `RecentLettersWidget.swift`
    - `UpcomingCampWidget.swift`
   Ensure **Target Membership** is set to `OfferHoundWidgets` only.
10. Replace the generated `Info.plist` + entitlements with the copies our
    plugin placed in `ios/OfferHoundWidgets/` (or merge them — only
    `NSExtension.NSExtensionPointIdentifier = com.apple.widgetkit-extension`
    and the App Group are required).
11. Select the `OfferHoundWidgets` target → **Signing & Capabilities**:
    - Team: OfferHound team
    - Add capability **App Groups** → enable
      `group.com.emergentmindlab.offerhoundv2.shared`
12. Do the same for the host app target (`OfferHound`) — it must share the
    same App Group for `UserDefaults(suiteName:)` reads/writes to work.
13. **Build Settings** on `OfferHoundWidgets`:
    - iOS Deployment Target: **16.0** (matches `.containerBackground`)
    - Swift Language Version: **5 or later**
14. Build & run on a device. Add the widgets to the home screen to verify
    placeholders render.

### Subsequent `expo prebuild`s

The plugin is idempotent for **sources + entitlements** (re-copied each run),
but Xcode-only settings (target membership, capabilities, deployment target)
are preserved because `ios/` is kept under version control and regenerated
via `expo prebuild --no-install --clean` only intentionally. If the `ios/`
folder is nuked, repeat Step 2.

---

## 3. React Native side — populating widget data

`src/lib/widgetSync.ts` exposes:

```ts
import { syncRecentLetters, syncUpcomingCamps } from '@/lib/widgetSync';

await syncRecentLetters([
  { school: 'Stanford', date: 'Today', snippet: 'Coach reached out.' },
]);

await syncUpcomingCamps([
  {
    name: 'Elite QB Camp',
    school: 'Stanford',
    date: new Date().toISOString(),
    location: 'Stanford, CA',
  },
]);
```

### Native dependency gap (TODO)

The plan was to use `expo-shared-group-preferences`, but that package is
**not** published on npm. Pick one of:

1. **`react-native-shared-group-preferences`** (community module, on npm).
   Install, add the pod, and swap the stub in `writeToSharedDefaults`.
2. **A tiny custom Expo module** wrapping
   `UserDefaults(suiteName: "group.com.emergentmindlab.offerhoundv2.shared")`
   plus a `WidgetCenter.shared.reloadAllTimelines()` method. This is the
   cleanest long-term fix and ~30 lines of Swift.

Until then, `widgetSync.ts` keeps the payload in an in-memory cache so
callers don't break, but the widgets fall back to hard-coded placeholder
entries on the lock/home screen.

---

## 4. Smoke test checklist

- [ ] Bundle id `com.emergentmindlab.offerhoundv2.widgets` exists in Apple
      Developer and is assigned to the App Group.
- [ ] Host app + widget target both list the App Group under Signing &
      Capabilities.
- [ ] Widgets appear in the iOS widget gallery under "OfferHound".
- [ ] Both widgets render placeholder data on first install.
- [ ] Once `widgetSync.ts` is wired to a real native bridge, writing from
      the app updates the widget within ~1 timeline refresh (or immediately
      after a `reloadAllTimelines()` call).
