/**
 * Web-only stub for src/lib/iap.ts.
 * Web builds must not touch the ExpoIap native module.
 * Purchases are a native-only feature; web users are directed to the mobile app.
 * Metro auto-picks this over iap.ts when bundling for web.
 */

import type { Purchase, ProductSubscription, Product } from 'expo-iap';

export type { Purchase, ProductSubscription, Product };

type Sub = { remove: () => void };
const noopSub: Sub = { remove: () => {} };

// Event listeners are no-ops on web (no store to emit events).
export function purchaseUpdatedListener(_cb: (p: Purchase) => void): Sub {
  return noopSub;
}
export function purchaseErrorListener(_cb: (e: unknown) => void): Sub {
  return noopSub;
}

export type ProductGroup = 'athletes' | 'coaches' | 'camp_manager' | null;

export const TIER_TO_PRODUCT_ID = {
  'recruit-pro': {
    ios: 'com.emergentmindlab.offerhoundv2.recruit_pro_monthly',
    android: 'recruit_pro_monthly',
    type: 'subscription' as const,
    group: 'athletes' as ProductGroup,
  },
  'recruit-elite': {
    ios: 'com.emergentmindlab.offerhoundv2.recruit_elite_monthly',
    android: 'recruit_elite_monthly',
    type: 'subscription' as const,
    group: 'athletes' as ProductGroup,
  },
  'family-bundle': {
    ios: 'com.emergentmindlab.offerhoundv2.family_bundle_monthly',
    android: 'family_bundle_monthly',
    type: 'subscription' as const,
    group: 'athletes' as ProductGroup,
  },
  'club-coach': {
    ios: 'com.emergentmindlab.offerhoundv2.club_coach_annual',
    android: 'club_coach_annual',
    type: 'subscription' as const,
    group: 'coaches' as ProductGroup,
  },
  'camp-manager-event': {
    ios: 'com.emergentmindlab.offerhoundv2.camp_manager_event',
    android: 'camp_manager_event',
    type: 'consumable' as const,
    group: null as ProductGroup,
  },
  'camp-manager-annual': {
    ios: 'com.emergentmindlab.offerhoundv2.camp_manager_annual_unlimited',
    android: 'camp_manager_annual_unlimited',
    type: 'subscription' as const,
    group: 'camp_manager' as ProductGroup,
  },
} as const;
export type SubscriptionTierId = keyof typeof TIER_TO_PRODUCT_ID;

export const SUBSCRIPTION_SKUS: string[] = [];
export const CONSUMABLE_SKUS: string[] = [];
export const ALL_SKUS: string[] = [];

export function tierIdForSku(_sku: string): SubscriptionTierId | null {
  return null;
}

const unavailable = () => {
  throw new Error('In-app purchases are not available on web. Please use the mobile app.');
};

export async function initIAP(): Promise<void> {
  // Web: no-op instead of throw, so app boot doesn't crash on import-time init calls.
  return;
}

export async function teardownIAP(): Promise<void> {
  return;
}

export async function fetchSubscriptions(): Promise<ProductSubscription[]> {
  return [];
}

export async function fetchConsumables(): Promise<Product[]> {
  return [];
}

export async function purchaseSubscription(_sku: string): Promise<Purchase | Purchase[] | null> {
  unavailable();
  return null;
}

export async function purchaseConsumable(_sku: string): Promise<Purchase | Purchase[] | null> {
  unavailable();
  return null;
}

export async function restorePurchases(): Promise<Purchase[]> {
  return [];
}

export async function acknowledgePurchase(
  _purchase: Purchase,
  _isConsumable: boolean = false,
): Promise<void> {
  return;
}
