/**
 * liveActivities.ts
 *
 * TypeScript facade for iOS ActivityKit Live Activities.
 *
 * GAP: requires custom native module; scaffold only.
 *
 * As of this commit there is no mature, first-party Expo module for
 * ActivityKit Live Activities. The ecosystem has a few unofficial
 * community modules (e.g. `react-native-live-activities`, `@bacons/...`)
 * but none are production-stable against Expo SDK 55 + RN 0.76.
 *
 * The intended wiring is:
 *
 *   JS  ──►  NativeModules.OfferHoundLiveActivity.start(payload)
 *                                          .update(id, payload)
 *                                          .end(id)
 *   Swift (main app target, not the widget target):
 *        @objc(OfferHoundLiveActivity)
 *        class OfferHoundLiveActivity: NSObject { ... Activity<OfferHoundActivityAttributes>.request(...) }
 *
 * The SwiftUI rendering (Dynamic Island + Lock Screen) lives in a Widget
 * Extension target — see ios-prebuild-assets/LiveActivities/.
 *
 * Until the native module is added (post-prebuild, in Xcode), every function
 * here is a safe no-op that logs in dev and resolves. Call sites can adopt
 * this API now and nothing breaks on Android or on iOS simulators without
 * the module.
 *
 * See LIVE_ACTIVITIES_SETUP.md for the full wiring checklist.
 */

import { NativeModules, Platform } from 'react-native';

export type LiveActivityKind = 'camp' | 'offer' | 'generic';

export interface LiveActivityContentState {
  /** Short headline, e.g. "Starts in 2h 14m" or "New offer: Stanford". */
  status: string;
  /** Secondary line, e.g. coach name or location. */
  subtitle: string;
  /** Optional camp name; only meaningful when kind === 'camp'. */
  campName?: string;
}

export interface StartLiveActivityInput {
  /** Stable id: camp UUID, offer UUID, etc. Used to update/end later. */
  activityId: string;
  kind: LiveActivityKind;
  state: LiveActivityContentState;
  /**
   * If provided, Live Activity will be scheduled to auto-end at this time.
   * iOS also enforces its own 8h / 12h ceilings.
   */
  staleDate?: Date;
}

type NativeLiveActivityModule = {
  start(payload: {
    activityId: string;
    kind: LiveActivityKind;
    state: LiveActivityContentState;
    staleDate?: number; // epoch seconds
  }): Promise<{ activityId: string; pushToken?: string }>;
  update(payload: {
    activityId: string;
    state: LiveActivityContentState;
  }): Promise<void>;
  end(payload: { activityId: string }): Promise<void>;
  areActivitiesEnabled(): Promise<boolean>;
};

const nativeModule: NativeLiveActivityModule | undefined =
  (NativeModules as Record<string, unknown>).OfferHoundLiveActivity as
    | NativeLiveActivityModule
    | undefined;

function isSupported(): boolean {
  return Platform.OS === 'ios' && typeof nativeModule !== 'undefined';
}

function logGap(method: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      `[liveActivities.${method}] no-op: native module OfferHoundLiveActivity not installed. ` +
        `See LIVE_ACTIVITIES_SETUP.md.`,
    );
  }
}

/**
 * Returns true iff the user has Live Activities enabled for this app AND
 * the native module is wired up.
 */
export async function areLiveActivitiesEnabled(): Promise<boolean> {
  if (!isSupported() || !nativeModule) return false;
  try {
    return await nativeModule.areActivitiesEnabled();
  } catch {
    return false;
  }
}

/**
 * Start a Live Activity. Returns the activityId (echoed from native) and
 * optionally a push token that can be sent to your APNS backend so that
 * the server can push `ContentState` updates without the app being open.
 */
export async function startLiveActivity(
  input: StartLiveActivityInput,
): Promise<{ activityId: string; pushToken?: string } | null> {
  if (!isSupported() || !nativeModule) {
    logGap('start');
    return null;
  }
  return nativeModule.start({
    activityId: input.activityId,
    kind: input.kind,
    state: input.state,
    staleDate:
      input.staleDate instanceof Date
        ? Math.floor(input.staleDate.getTime() / 1000)
        : undefined,
  });
}

/** Update the ContentState of an in-flight Live Activity. */
export async function updateLiveActivity(
  activityId: string,
  state: LiveActivityContentState,
): Promise<void> {
  if (!isSupported() || !nativeModule) {
    logGap('update');
    return;
  }
  await nativeModule.update({ activityId, state });
}

/** End (dismiss) a Live Activity. */
export async function endLiveActivity(activityId: string): Promise<void> {
  if (!isSupported() || !nativeModule) {
    logGap('end');
    return;
  }
  await nativeModule.end({ activityId });
}

// --- Convenience helpers for the two real OfferHound use cases -------------

/**
 * Start a countdown activity for an upcoming camp.
 * The server (or a local timer) is expected to call `updateLiveActivity`
 * with a refreshed `status` like "Starts in 1h 12m".
 */
export function startCampCountdown(params: {
  campId: string;
  campName: string;
  location?: string;
  startsAt: Date;
}): Promise<{ activityId: string; pushToken?: string } | null> {
  const msUntil = params.startsAt.getTime() - Date.now();
  const status =
    msUntil > 0 ? `Starts in ${formatDuration(msUntil)}` : 'Starting now';
  return startLiveActivity({
    activityId: `camp:${params.campId}`,
    kind: 'camp',
    state: {
      status,
      subtitle: params.location ?? 'Tap for details',
      campName: params.campName,
    },
    staleDate: new Date(params.startsAt.getTime() + 2 * 60 * 60 * 1000),
  });
}

/**
 * Fire-and-forget activity for a freshly-received offer.
 * Usually short-lived — end it once the user has opened the offer screen.
 */
export function startOfferActivity(params: {
  offerId: string;
  school: string;
  coach?: string;
}): Promise<{ activityId: string; pushToken?: string } | null> {
  return startLiveActivity({
    activityId: `offer:${params.offerId}`,
    kind: 'offer',
    state: {
      status: `New offer: ${params.school}`,
      subtitle: params.coach ? `from ${params.coach}` : 'Tap to view',
    },
  });
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
