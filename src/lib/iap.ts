/**
 * In-App Purchase wrapper around `expo-iap` (v4.x, OpenIAP-compliant).
 *
 * Replaces the previous react-native-iap stub that was kept while the project
 * was on Expo SDK 52 (Kotlin conflict). Now on Expo SDK 55 + RN 0.83.
 *
 * SOURCE OF TRUTH for product IDs is `TIER_TO_PRODUCT_ID` below. These are
 * the FINAL App Store Connect / Google Play Console IDs (per user, 2026-04-25).
 * If marketing/pricing renames a tier, update both this file AND the matching
 * App Store Connect / Play Console listings — they must stay in lockstep.
 *
 * Free tiers (college-coach / scout / admin roles) are NOT IAP products.
 * They are server-side entitlements granted by user role. See useSubscription.
 */

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type ProductSubscription,
  type Product,
} from 'expo-iap';

export { purchaseUpdatedListener, purchaseErrorListener };
export type { Purchase, ProductSubscription, Product };

// ---------------------------------------------------------------------------
// Product map — single source of truth. Keys are the Lovable PRICING_TIERS ids.
// ---------------------------------------------------------------------------
/**
 * Apple subscription groups (a product can belong to at most one group).
 *  - 'athletes'     → mutually-exclusive athlete tiers (Pro / Elite / Family Bundle)
 *  - 'coaches'      → club_coach_annual
 *  - 'camp_manager' → camp_manager_annual_unlimited
 *  - null           → consumables (no group), e.g. camp_manager_event
 */
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
    /**
     * Single Apple/Google product, but entitlement is per-sport: a user may
     * hold multiple active `user_subscriptions` rows (one per sport_id) for
     * this product. The store knows nothing about sports; sport selection
     * happens in-app and is recorded server-side at receipt-validation time.
     */
    group: 'camp_manager' as ProductGroup,
  },
} as const;

export type SubscriptionTierId = keyof typeof TIER_TO_PRODUCT_ID;

const isIos = Platform.OS === 'ios';

function skuForTier(tierId: SubscriptionTierId): string {
  const entry = TIER_TO_PRODUCT_ID[tierId];
  return isIos ? entry.ios : entry.android;
}

function entriesByType(kind: 'subscription' | 'consumable'): string[] {
  return (Object.keys(TIER_TO_PRODUCT_ID) as SubscriptionTierId[])
    .filter(id => TIER_TO_PRODUCT_ID[id].type === kind)
    .map(skuForTier);
}

// Per-platform SKU arrays (subscriptions vs one-time consumables).
export const SUBSCRIPTION_SKUS: string[] = entriesByType('subscription');
export const CONSUMABLE_SKUS: string[] = entriesByType('consumable');
export const ALL_SKUS: string[] = [...SUBSCRIPTION_SKUS, ...CONSUMABLE_SKUS];

// Reverse lookup: store SKU → tier id (used when reconciling purchases).
export function tierIdForSku(sku: string): SubscriptionTierId | null {
  for (const key of Object.keys(TIER_TO_PRODUCT_ID) as SubscriptionTierId[]) {
    const entry = TIER_TO_PRODUCT_ID[key];
    if (entry.ios === sku || entry.android === sku) return key;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

let connected = false;

export async function initIAP(): Promise<void> {
  if (connected) return;
  try {
    await initConnection();
    connected = true;
  } catch (err) {
    console.warn('[IAP] initConnection failed', err);
    throw err;
  }
}

export async function teardownIAP(): Promise<void> {
  if (!connected) return;
  try {
    await endConnection();
  } catch (err) {
    console.warn('[IAP] endConnection failed', err);
  } finally {
    connected = false;
  }
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/**
 * Fetch the subscription catalog from the relevant store.
 * Returns the raw expo-iap product/subscription objects so callers can read
 * `localizedPrice`, `currency`, and platform-specific offer details.
 */
export async function fetchSubscriptions(): Promise<ProductSubscription[]> {
  if (!connected) await initIAP();
  const skus = SUBSCRIPTION_SKUS;
  if (skus.length === 0) return [];
  const result = await fetchProducts({ skus, type: 'subs' });
  // expo-iap returns `Product[] | ProductSubscription[] | null` depending on type.
  return (result ?? []).filter(
    (p): p is ProductSubscription => p != null,
  ) as unknown as ProductSubscription[];
}

/** Fetch the one-time (consumable) catalog. Currently just camp-manager-event. */
export async function fetchConsumables(): Promise<Product[]> {
  if (!connected) await initIAP();
  const skus = CONSUMABLE_SKUS;
  if (skus.length === 0) return [];
  const result = await fetchProducts({ skus, type: 'in-app' });
  return (result ?? []).filter((p): p is Product => p != null) as unknown as Product[];
}

// ---------------------------------------------------------------------------
// Purchase / restore / acknowledge
// ---------------------------------------------------------------------------

/**
 * Request a subscription purchase. The purchase result is delivered via the
 * `purchase-updated` listener (see useSubscription). This function resolves
 * once the modal has been presented and the user has acted on it.
 */
export async function purchaseSubscription(sku: string): Promise<Purchase | Purchase[] | null> {
  if (!connected) await initIAP();
  const result = await requestPurchase({
    type: 'subs',
    request: {
      ios: { sku },
      android: { skus: [sku] },
      // Legacy aliases (some expo-iap surfaces still expect these):
      apple: { sku },
      google: { skus: [sku] },
    },
  });
  return result ?? null;
}

/** Request a one-time (consumable) purchase, e.g. a single Camp Manager event. */
export async function purchaseConsumable(sku: string): Promise<Purchase | Purchase[] | null> {
  if (!connected) await initIAP();
  const result = await requestPurchase({
    type: 'in-app',
    request: {
      ios: { sku },
      android: { skus: [sku] },
      apple: { sku },
      google: { skus: [sku] },
    },
  });
  return result ?? null;
}

/** Restore prior purchases (reads existing entitlements from the store). */
export async function restorePurchases(): Promise<Purchase[]> {
  if (!connected) await initIAP();
  const result = await getAvailablePurchases();
  return (result ?? []) as Purchase[];
}

/**
 * Acknowledge / finish a purchase.
 *  - iOS: marks the StoreKit transaction finished (must be called after the
 *         receipt has been validated server-side).
 *  - Android: acknowledges (subscriptions / non-consumables) or consumes
 *         (consumables) the purchase token.
 */
export async function acknowledgePurchase(
  purchase: Purchase,
  isConsumable: boolean = false,
): Promise<void> {
  if (!connected) await initIAP();
  await finishTransaction({ purchase, isConsumable });
}
