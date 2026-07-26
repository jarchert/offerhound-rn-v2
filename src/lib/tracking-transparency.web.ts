// Web-only stub for expo-tracking-transparency.
// Web builds must not touch the ExpoTrackingTransparency native module.
// Signatures match the subset the app actually calls.

export type PermissionStatus = 'undetermined' | 'denied' | 'granted' | 'restricted';

export interface TrackingPermissionResult {
  status: PermissionStatus;
  canAskAgain: boolean;
  granted: boolean;
  expires: 'never';
}

const unavailable = async (): Promise<TrackingPermissionResult> => ({
  status: 'undetermined',
  canAskAgain: false,
  granted: false,
  expires: 'never',
});

export const getTrackingPermissionsAsync = unavailable;
export const requestTrackingPermissionsAsync = unavailable;
export const isAvailable = () => false;
