import { useEffect, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PRICING_TIERS } from '@/lib/pricing';
import {
  initIAP,
  teardownIAP,
  purchaseSubscription as iapPurchase,
  restorePurchases as iapRestore,
  acknowledgePurchase,
  tierIdForSku,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type SubscriptionTierId,
  type Purchase,
} from '@/lib/iap';

// ---------------------------------------------------------------------------
// Tier model
// ---------------------------------------------------------------------------

/**
 * App-level subscription tier. `'free'` is granted by user role (coach/scout/
 * admin); `'none'` means no entitlement; everything else is an IAP tier.
 */
export type SubscriptionTier =
  | 'none'
  | 'free'
  | SubscriptionTierId;

export interface UserSubscriptionRow {
  id: string;
  user_id: string;
  store_provider: 'apple' | 'google';
  product_id: string;
  tier: string;
  is_active: boolean;
  expires_at: string | null;
  original_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

const SUBSCRIPTION_KEY = (uid: string | undefined) => ['subscription', uid] as const;
const ROLE_KEY = (uid: string | undefined) => ['subscription', 'role', uid] as const;

interface RoleEntitlement {
  isAdmin: boolean;
  isCoach: boolean;
  isScout: boolean;
  hasFreeAccess: boolean;
}

async function fetchRoleEntitlement(userId: string): Promise<RoleEntitlement> {
  // Three parallel reads; any non-null match → free server-side entitlement.
  const [adminRes, coachRes, scoutRes] = await Promise.all([
    supabase
      .from('user_roles' as never)
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle(),
    supabase
      .from('coach_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('scout_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const isAdmin = !!adminRes.data;
  const isCoach = !!coachRes.data;
  const isScout = !!scoutRes.data;
  return {
    isAdmin,
    isCoach,
    isScout,
    hasFreeAccess: isAdmin || isCoach || isScout,
  };
}

async function fetchActiveSubscription(userId: string): Promise<UserSubscriptionRow | null> {
  const { data, error } = await supabase
    .from('user_subscriptions' as never)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[useSubscription] fetch failed', error.message);
    return null;
  }
  return (data as unknown as UserSubscriptionRow) ?? null;
}

interface ValidateReceiptArgs {
  store: 'apple' | 'google';
  productId: string;
  transactionId: string;
  receipt: string;
}

async function callValidateReceipt(args: ValidateReceiptArgs) {
  const { data, error } = await supabase.functions.invoke('validate-iap-receipt', {
    body: args,
  });
  if (error) throw error;
  return data;
}

function purchaseToValidatePayload(p: Purchase): ValidateReceiptArgs {
  const store: 'apple' | 'google' = Platform.OS === 'ios' ? 'apple' : 'google';
  // expo-iap surfaces a unified `purchaseToken` (iOS = JWS, Android = token).
  const receipt = (p as { purchaseToken?: string | null }).purchaseToken ?? '';
  return {
    store,
    productId: p.productId,
    transactionId:
      (p as { transactionId?: string | null }).transactionId ?? p.id ?? '',
    receipt,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseSubscriptionResult {
  // New (task spec) surface
  subscription: UserSubscriptionRow | null;
  tier: SubscriptionTier;
  isActive: boolean;
  isLoading: boolean;
  purchase: (sku: string) => Promise<void>;
  restore: () => Promise<void>;

  // Legacy surface (existing callers depend on these)
  isSubscribed: boolean;
  priceId: string | null;
  subscriptionEnd: string | null;
  tierName: string | null;
  isCoachOrScout: boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionResult {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Initialize the store connection once per app session.
  useEffect(() => {
    let mounted = true;
    initIAP().catch(err => {
      if (mounted) console.warn('[useSubscription] initIAP failed', err);
    });
    return () => {
      mounted = false;
      teardownIAP().catch(() => {});
    };
  }, []);

  // Role entitlements (free for admin/coach/scout).
  const roleQuery = useQuery({
    queryKey: ROLE_KEY(userId),
    queryFn: () => fetchRoleEntitlement(userId as string),
    enabled: !!isAuthenticated && !!userId,
    staleTime: 5 * 60_000,
  });

  // Active subscription row from Supabase.
  const subQuery = useQuery({
    queryKey: SUBSCRIPTION_KEY(userId),
    queryFn: () => fetchActiveSubscription(userId as string),
    enabled: !!isAuthenticated && !!userId,
    staleTime: 30_000,
  });

  // Listen for store-side purchase events and reconcile via the edge function.
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const updateSub = purchaseUpdatedListener(async purchase => {
      try {
        await callValidateReceipt(purchaseToValidatePayload(purchase));
        await acknowledgePurchase(purchase, /* isConsumable */ false);
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY(userId) });
      } catch (err) {
        console.warn('[useSubscription] receipt validation failed', err);
      }
    });
    const errSub = purchaseErrorListener(err => {
      console.warn('[useSubscription] purchase error', err);
    });
    return () => {
      updateSub.remove();
      errSub.remove();
    };
  }, [isAuthenticated, userId, queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: async (sku: string) => {
      await iapPurchase(sku);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const purchases = await iapRestore();
      // Validate each restored purchase server-side.
      for (const p of purchases) {
        try {
          await callValidateReceipt(purchaseToValidatePayload(p));
        } catch (err) {
          console.warn('[useSubscription] restore validation failed', err);
        }
      }
      if (userId) {
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY(userId) });
      }
    },
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY(userId) }),
      queryClient.invalidateQueries({ queryKey: ROLE_KEY(userId) }),
    ]);
  }, [queryClient, userId]);

  return useMemo<UseSubscriptionResult>(() => {
    const role = roleQuery.data;
    const subRow = subQuery.data ?? null;

    let tier: SubscriptionTier;
    let isActive: boolean;

    if (role?.hasFreeAccess) {
      tier = 'free';
      isActive = true;
    } else if (subRow?.is_active) {
      const mapped = tierIdForSku(subRow.product_id);
      tier = (mapped ?? (subRow.tier as SubscriptionTier)) ?? 'none';
      isActive = true;
    } else {
      tier = 'none';
      isActive = false;
    }

    const tierName =
      tier === 'free'
        ? 'Free (role)'
        : tier === 'none'
          ? null
          : (PRICING_TIERS.find(t => t.id === tier)?.name ?? tier);

    return {
      // new surface
      subscription: subRow,
      tier,
      isActive,
      isLoading: roleQuery.isLoading || subQuery.isLoading,
      purchase: async (sku: string) => {
        await purchaseMutation.mutateAsync(sku);
      },
      restore: async () => {
        await restoreMutation.mutateAsync();
      },
      // legacy surface
      isSubscribed: isActive,
      priceId: subRow?.product_id ?? null,
      subscriptionEnd: subRow?.expires_at ?? null,
      tierName,
      isCoachOrScout: !!(role?.isCoach || role?.isScout),
      refresh,
    };
  }, [
    roleQuery.data,
    roleQuery.isLoading,
    subQuery.data,
    subQuery.isLoading,
    purchaseMutation,
    restoreMutation,
    refresh,
  ]);
}
