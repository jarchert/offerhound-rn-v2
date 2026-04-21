import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PRICING_TIERS } from "@/lib/pricing";

interface SubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
  priceId: string | null;
  subscriptionEnd: string | null;
  tierName: string | null;
  isCoachOrScout: boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { isAuthenticated, user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [priceId, setPriceId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
     if (!isAuthenticated) {
        setIsSubscribed(false);
        setPriceId(null);
        setSubscriptionEnd(null);
        setIsLoading(false);
        return;
     }

     try {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        if (error) throw error;
        setIsSubscribed(data?.subscribed ?? false);
        setPriceId(data?.price_id ?? null);
        setSubscriptionEnd(data?.subscription_end ?? null);
     } catch {
        setIsSubscribed(false);
     } finally {
        setIsLoading(false);
     }
  }, [isAuthenticated]);

  useEffect(() => {
     checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60s
  useEffect(() => {
     if (!isAuthenticated) return;
     const interval = setInterval(checkSubscription, 60_000);
     return () => clearInterval(interval);
  }, [isAuthenticated, checkSubscription]);

  const tierName = priceId
     ? PRICING_TIERS.find(t => t.priceId === priceId)?.name ?? null
     : null;

  // Check if user is a coach or scout (they get free access)
  const [isCoachOrScout, setIsCoachOrScout] = useState(false);
  useEffect(() => {
     if (!isAuthenticated || !user?.id) {
        setIsCoachOrScout(false);
        return;
     }
     const checkRole = async () => {
        const { data: coachProfile } = await supabase
          .from("coach_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        const { data: scoutProfile } = await supabase
          .from("scout_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsCoachOrScout(!!(coachProfile || scoutProfile));
     };
     checkRole();
  }, [isAuthenticated, user?.id]);

  return {
     isSubscribed,
     isLoading,
     priceId,
     subscriptionEnd,
     tierName,
     isCoachOrScout,
     refresh: checkSubscription,
  };
}
