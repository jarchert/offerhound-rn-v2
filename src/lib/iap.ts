// IAP stub — react-native-iap v15 requires Kotlin 2.2+ which is incompatible
// with Expo SDK 52 (ships Kotlin 1.9). This stub provides the same API surface
// so the rest of the app compiles. Replace with real IAP when upgrading to
// Expo SDK 55+ or when react-native-iap ships a compatible version.

import { Platform } from 'react-native';

export const SUBSCRIPTION_SKUS = Platform.select({
  ios: ['offerhound.recruit_pro.monthly', 'offerhound.recruit_pro.annual'],
  android: ['recruit_pro_monthly', 'recruit_pro_annual'],
  default: [] as string[],
})!;

export async function initIAP(): Promise<void> {
  console.log('[IAP] stub — no-op (react-native-iap removed for Kotlin compat)');
}

export async function teardownIAP(): Promise<void> {}

export async function fetchSubscriptions(): Promise<any[]> {
  console.warn('[IAP] stub — fetchSubscriptions is a no-op');
  return [];
}

export async function purchaseSubscription(_sku: string): Promise<void> {
  console.warn('[IAP] stub — purchaseSubscription is a no-op');
}

export async function restorePurchases(): Promise<void> {
  console.warn('[IAP] stub — restorePurchases is a no-op');
}
