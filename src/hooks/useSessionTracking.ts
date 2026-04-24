// Stub for @/hooks/useSessionTracking. Real port pending. Tracks the API contract
// SessionTrackingProvider expects: setGlobalTracker(tracker) + useSessionTracking()
// returning { trackEvent }.
export function useSessionTracking() {
  return {
    trackEvent: (_event: string, _props?: Record<string, unknown>) => {
      // no-op until real port lands
    },
  };
}

let _globalTracker: ((event: string, props?: Record<string, unknown>) => void) | null = null;

export function setGlobalTracker(
  tracker: ((event: string, props?: Record<string, unknown>) => void) | null,
): void {
  _globalTracker = tracker;
}

export function getGlobalTracker() {
  return _globalTracker;
}
