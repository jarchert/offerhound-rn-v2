// IAP scaffold — wraps react-native-iap (v15 / Nitro) so the rest of the app can
// initialise the connection, fetch subscription products, kick off a purchase,
// and forward receipts to the backend for verification.
//
// Apple StoreKit 2 + Google Play Billing v6 under the hood.
// Subscription products are configured in App Store Connect / Play Console.

import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type EventSubscription,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { supabase } from '@/integrations/supabase/client';

export const SUBSCRIPTION_SKUS = Platform.select({
  ios: ['offerhound.recruit_pro.monthly', 'offerhound.recruit_pro.annual'],
  android: ['recruit_pro_monthly', 'recruit_pro_annual'],
  default: [] as string[],
})!;

let initialised = false;
let purchaseSub: EventSubscription | null = null;
let errorSub: EventSubscription | null = null;

export async function initIAP(): Promise<void> {
  if (initialised) return;
  await initConnection();
  initialised = true;

  purchaseSub = purchaseUpdatedListener(async (purchase: any) => {
    const receipt = purchase?.transactionReceipt || purchase?.purchaseToken;
    if (!receipt) return;
    try {
      await supabase.functions.invoke('verify-iap-receipt', {
        body: {
          platform: Platform.OS,
          productId: purchase.productId,
          receipt,
          transactionId: purchase.transactionId,
        },
      });
      await finishTransaction({ purchase, isConsumable: false });
    } catch (e) {
      console.warn('[IAP] receipt verification failed', e);
    }
  });

  errorSub = purchaseErrorListener((error: any) => {
    console.warn('[IAP] purchase error', error);
  });
}

export async function teardownIAP(): Promise<void> {
  purchaseSub?.remove();
  errorSub?.remove();
  purchaseSub = null;
  errorSub = null;
  if (initialised) {
    await endConnection();
    initialised = false;
  }
}

export async function fetchSubscriptions(): Promise<any[]> {
  if (!initialised) await initIAP();
  return fetchProducts({ skus: SUBSCRIPTION_SKUS, type: 'subs' as any }) as any;
}

export async function purchaseSubscription(sku: string): Promise<void> {
  if (!initialised) await initIAP();
  await requestPurchase({
    request: Platform.OS === 'ios'
      ? ({ sku } as any)
      : ({ skus: [sku], subscriptionOffers: [{ sku, offerToken: '' }] } as any),
    type: 'subs' as any,
  });
}

export async function restorePurchases(): Promise<void> {
  if (!initialised) await initIAP();
  const purchases = await getAvailablePurchases();
  for (const p of purchases as any[]) {
    const receipt = p.transactionReceipt || p.purchaseToken;
    if (!receipt) continue;
    await supabase.functions.invoke('verify-iap-receipt', {
      body: {
        platform: Platform.OS,
        productId: p.productId,
        receipt,
        transactionId: p.transactionId,
        restored: true,
      },
    });
  }
}
