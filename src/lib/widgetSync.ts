// widgetSync.ts
// Bridges OfferHound data into the iOS Widget Extension via an App Group
// shared UserDefaults.
//
// App Group : group.com.emergentmindlab.offerhoundv2.shared
// Keys      : "recent_letters_json" | "upcoming_camp_json"
//
// NATIVE DEPENDENCY
// -----------------
// The intended implementation uses `expo-shared-group-preferences`, but that
// package does not currently exist on the public npm registry. Until a
// concrete native module is chosen, this helper stores the payload in memory
// and no-ops on write for iOS. Android is never a target for these widgets.
//
// Replace `writeToSharedDefaults` below with one of the following once a
// library is selected:
//
//   1. react-native-shared-group-preferences (community, on npm):
//        import SharedGroupPreferences from 'react-native-shared-group-preferences';
//        await SharedGroupPreferences.setItem(key, value, APP_GROUP);
//
//   2. A tiny custom Expo module wrapping `UserDefaults(suiteName:)`.
//
// After writing, call `WidgetCenter.shared.reloadAllTimelines()` from Swift
// (via a native module bridge) so the widget refreshes without waiting for
// its next timeline tick. A TODO marker is left below.

import { Platform } from 'react-native';

export const WIDGET_APP_GROUP =
  'group.com.emergentmindlab.offerhoundv2.shared';

export const WIDGET_KEYS = {
  recentLetters: 'recent_letters_json',
  upcomingCamp: 'upcoming_camp_json',
} as const;

export type WidgetKey = (typeof WIDGET_KEYS)[keyof typeof WIDGET_KEYS];

/** Matches the Swift `RecentLetter` model. */
export interface RecentLetterPayload {
  school: string;
  /** Free-form label: "Today", "Yesterday", "Mar 14", etc. */
  date: string;
  snippet?: string;
}

/** Matches the Swift `UpcomingCamp` model. */
export interface UpcomingCampPayload {
  name: string;
  school: string;
  /** ISO-8601 date string. */
  date: string;
  location?: string;
}

/* --------------------------------------------------------------------- */
/* Internal                                                              */
/* --------------------------------------------------------------------- */

// In-memory cache so callers in this session can read back what they wrote,
// even while the native bridge is stubbed.
const memoryCache: Partial<Record<WidgetKey, string>> = {};

async function writeToSharedDefaults(
  key: WidgetKey,
  value: string,
): Promise<void> {
  memoryCache[key] = value;

  if (Platform.OS !== 'ios') return;

  try {
    // TODO: swap in the real shared-preferences library once chosen.
    // Example once wired up:
    //   const SharedGroupPreferences =
    //     require('react-native-shared-group-preferences').default;
    //   await SharedGroupPreferences.setItem(key, value, WIDGET_APP_GROUP);
    //
    // And reload the timeline:
    //   const { NativeModules } = require('react-native');
    //   NativeModules.WidgetCenterBridge?.reloadAllTimelines?.();
  } catch (err) {
    // Non-fatal: widgets will fall back to placeholder data.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[widgetSync] write failed', key, err);
    }
  }
}

/* --------------------------------------------------------------------- */
/* Public API                                                            */
/* --------------------------------------------------------------------- */

export async function syncRecentLetters(
  letters: RecentLetterPayload[],
): Promise<void> {
  const trimmed = letters.slice(0, 10);
  await writeToSharedDefaults(
    WIDGET_KEYS.recentLetters,
    JSON.stringify(trimmed),
  );
}

export async function syncUpcomingCamps(
  camps: UpcomingCampPayload[],
): Promise<void> {
  const trimmed = camps.slice(0, 10);
  await writeToSharedDefaults(
    WIDGET_KEYS.upcomingCamp,
    JSON.stringify(trimmed),
  );
}

/** Internal: lets tests / callers verify what would have been written. */
export function __peekWidgetCache(key: WidgetKey): string | undefined {
  return memoryCache[key];
}
