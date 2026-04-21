import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useCallback } from "react";

export function usePlayerProfile() {
  const { user } = useAuth();
  const [isOfflineData, setIsOfflineData] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["player-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("player_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const fetchProfile = useCallback(() => {
    refetch();
  }, [refetch]);

  const createProfile = useCallback(async (profileData: any) => {
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("player_profiles")
      .insert({ ...profileData, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["player-profile"] });
    return data;
  }, [user, queryClient]);

  const updateProfile = useCallback(async (updates: any) => {
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("player_profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["player-profile"] });
    return data;
  }, [user, queryClient]);

  const publishProfile = useCallback(async (opts?: { skipPaywall?: boolean }) => {
    if (!user) throw new Error("Not authenticated");

    // Check subscription status before allowing publish (unless bypassed for paid roles)
    if (!opts?.skipPaywall) {
      // Check if the user is a coach or scout (free access roles)
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

        if (!coachProfile && !scoutProfile) {
          // Athlete/parent — must have an active subscription
          const { data: subData } = await supabase.functions.invoke("check-subscription");
          if (!subData?.subscribed) {
            const err = new Error("SUBSCRIPTION_REQUIRED");
            (err as any).code = "SUBSCRIPTION_REQUIRED";
            throw err;
          }
        }
    }

    const { data, error } = await supabase
      .from("player_profiles")
      .update({ is_published: true })
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["player-profile"] });
    return data;
  }, [user, queryClient]);

  const checkUrlAvailability = useCallback(async (url: string): Promise<boolean> => {
    const { data } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("custom_url", url)
      .neq("user_id", user?.id || "")
      .limit(1);
    return !data || data.length === 0;
  }, [user]);

  return { profile, isLoading, isOfflineData, fetchProfile, createProfile, updateProfile, publishProfile, checkUrlAvailability };
}
