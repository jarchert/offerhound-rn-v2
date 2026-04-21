import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useCoachActivity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach-activity", user?.id],
    queryFn: async () => {
       if (!user) return [] as any[];
       const { data } = await supabase
          .from("coach_activity_log")
          .select("*")
          .eq("coach_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
       return (data || []) as any[];
    },
    enabled: !!user,
  });
}

export function useCoachActivityStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach-activity-stats", user?.id],
    queryFn: async () => {
       if (!user) return { profileViews: 0, athletesContacted: 0, searchesPerformed: 0 };
       const { data } = await supabase
          .from("coach_activity_log")
          .select("activity_type")
          .eq("coach_user_id", user.id);
       const items = data || [];
       return {
          profileViews: items.filter((i: any) => i.activity_type === "profile_view").length,
          athletesContacted: items.filter((i: any) => i.activity_type === "athlete_contacted").length,
          searchesPerformed: items.filter((i: any) => i.activity_type === "search_performed").length,
       };
    },
    enabled: !!user,
  });
}

export function useUpdateCoachProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: any) => {
       if (!user) throw new Error("Not authenticated");
       const { error } = await supabase.from("coach_profiles").update(updates).eq("user_id", user.id);
       if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coach-profile"] }),
  });
}
