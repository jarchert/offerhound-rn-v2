// Platform detection — in React Native, we are ALWAYS on native.
// This replaces src/lib/platform.ts from the Lovable web app.
// Apple Guideline 3.1.1/3.1.3(a) and Google Play Payments Policy:
// Hide all Stripe/web pricing UI; point users to App Store/Play subscriptions.

import { Platform } from 'react-native';

export function isNativePlatform(): boolean {
  return true; // Always true in RN
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export function isIOSNative(): boolean {
  return Platform.OS === 'ios';
}

export function isAndroidNative(): boolean {
  return Platform.OS === 'android';
}

/**
 * Apple Guideline 3.1.1 / 3.1.3(a) AND Google Play Payments Policy:
 * Both stores prohibit external/web payment links for digital subscriptions
 * consumed in-app. Hide pricing UI on ANY native build until native IAP
 * (react-native-iap / StoreKit / Play Billing) is wired.
 * Always returns true in React Native.
 */
export function shouldHidePricingUI(): boolean {
  return true;
}

export function getSubscriptionManagementURL(): string {
  if (Platform.OS === 'ios') {
    return 'https://apps.apple.com/account/subscriptions';
  }
  return 'https://play.google.com/store/account/subscriptions';
}
