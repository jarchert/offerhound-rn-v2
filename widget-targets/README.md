# `widget-targets/` — iOS WidgetKit Sources (mirror)

This directory mirrors the Swift WidgetKit sources that power the OfferHound
home-screen widgets. The **canonical** copies still live at
`../ios-prebuild-assets/Widgets/` and are copied into the generated Xcode
project by `../plugins/with-widgets.js` on `expo prebuild`.

We also keep this `widget-targets/` mirror checked into the app root so:

1. The Wave-29 v1.0 native-targets convention has a single discoverable
   directory per target (`clip/`, `widget-targets/`, etc.).
2. Future moves out of `ios-prebuild-assets/` can flip the plugin's source
   path here without restructuring the repo again.
3. Reviewers can find widget code without spelunking through prebuild
   plumbing.

## Files

| File                              | Purpose                                                              |
| --------------------------------- | -------------------------------------------------------------------- |
| `OfferHoundWidgetBundle.swift`    | `@main WidgetBundle` — registers all widgets in the extension.       |
| `RecentLettersWidget.swift`       | Small + medium widget: latest recruiting letters at a glance.        |
| `UpcomingCampWidget.swift`        | Small + medium widget: next recruiting event with countdown.         |

> ⚠️ **Single source of truth:** if you edit a file here, also update
> `../ios-prebuild-assets/Widgets/` (or the plugin will overwrite your edits
> on next `expo prebuild`). A tidy-up pass will collapse this mirror once the
> plugin is pointed here directly.

## Sizes shipped

- **Small** (`.systemSmall`)
- **Medium** (`.systemMedium`)
- *(Large is documented as a future addition — not yet implemented.)*

## Coordinates

| Setting              | Value                                              |
| -------------------- | -------------------------------------------------- |
| Widget bundle ID     | `com.emergentmindlab.offerhoundv2.widgets`         |
| App Group ID         | `group.com.emergentmindlab.offerhoundv2.shared`    |
| Apple Team ID        | `8MG7GFDJ62`                                       |

See `../IOS_WIDGETS.md` for the full setup guide and data-bridge plan, and
`../WIDGETS_SETUP.md` for the Apple-Developer-portal walk-through.
