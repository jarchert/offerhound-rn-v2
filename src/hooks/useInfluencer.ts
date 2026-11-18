import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {setCreatorFollow} from "@/lib/creatorFollow";
import {toast} from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";

export function useInfluencerBoard(options: { filter?: string; sport?: string; affiliationType?: string; limit?: number }) {
  return useQuery({
    queryKey: ["influencer-board", options],
    queryFn: async () => {
       let query = supabase.from("influencer_board_snapshots" as any).select("*, influencer:influencer_profiles!influencer_id(*)").order("rank", { ascending: true });
       if (options.limit) query = query.limit(options.limit);
       const { data, error } = await query;
       if (error) throw error;
       return { data: data || [], lastUpdated: new Date().toISOString() };
    },
  });
}

export function useMyInfluencerProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-influencer-profile", user?.id],
    queryFn: async () => {
       if (!user) return null;
       const { data, error } = await supabase.from("influencer_profiles" as any).select("*").eq("user_id", user.id).maybeSingle();
       if (error) throw error;
       return data;
    },
    enabled: !!user,
  });
}

export function useInfluencerByHandle(handle?: string) {
  return useQuery({
    queryKey: ["influencer-by-handle", handle],
    queryFn: async () => {
       if (!handle) return null;
       const { data } = await supabase.from("influencer_profiles" as any).select("*, influencer_social_links(*), influencer_gamification(*)").eq("handle", handle).maybeSingle();
       return data;
    },
    enabled: !!handle,
  });
}

export function useFollowInfluencer() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const followMutation = useMutation({
    mutationFn: async (params: { influencerId: string; source?: string }) => {
       if (!user) throw new Error("Not authenticated");
       return setCreatorFollow(supabase,user.id,params.influencerId,true,params.source);
    },
    onError:(error:any)=>toast.error(error.message || "Follow status was not confirmed."),
    onSuccess: (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["is-following", vars.influencerId] });
       qc.invalidateQueries({ queryKey: ["influencer-follower-count", vars.influencerId] });
    },
  });
  const unfollowMutation = useMutation({
    mutationFn: async (influencerId: string) => {
       if (!user) throw new Error("Not authenticated");
       return setCreatorFollow(supabase,user.id,influencerId,false);
    },
    onError:(error:any)=>toast.error(error.message || "Follow status was not confirmed."),
    onSuccess: (_d, influencerId) => {
       qc.invalidateQueries({ queryKey: ["is-following", influencerId] });
       qc.invalidateQueries({ queryKey: ["influencer-follower-count", influencerId] });
    },
  });
  return { follow: followMutation.mutate, unfollow: unfollowMutation.mutate, isFollowing: followMutation.isPending, isUnfollowing: unfollowMutation.isPending };
}

export function useIsFollowing(influencerId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-following", influencerId, user?.id],
    queryFn: async () => {
       if (!user || !influencerId) return false;
       const { data, error } = await supabase.from("influencer_follows" as any)
         .select("id, is_following")
         .eq("influencer_id", influencerId)
         .eq("follower_user_id", user.id)
         .maybeSingle();
       if (error) throw error;
       return !!data && (data as any).is_following === true;
    },
    enabled: !!user && !!influencerId,
  });
}

export function useInfluencerActivities(influencerId?: string, limit = 20) {
  return useQuery({
    queryKey: ["influencer-activities", influencerId, limit],
    queryFn: async () => {
       if (!influencerId) return [];
       const { data } = await supabase.from("influencer_activities" as any).select("*").eq("influencer_id", influencerId).eq("moderation_status", "approved").order("created_at", { ascending: false }).limit(limit);
       return data || [];
    },
    enabled: !!influencerId,
  });
}
