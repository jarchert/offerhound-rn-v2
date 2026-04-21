import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useScoutActivity(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scout-activity", user?.id, limit],
    queryFn: async () => {
       if (!user?.id) return [];
       const { data, error } = await supabase
         .from("scout_activity_log")
         .select(`*, athlete:player_profiles!athlete_profile_id (id, full_name, position, school, custom_url),coach:coaches!coach_id (id, name, title, school)`)
         .eq("scout_user_id", user.id)
         .order("created_at", { ascending: false })
         .limit(limit);
       if (error) throw error;
       return data;
    },
    enabled: !!user?.id,
  });
}

export function useLogScoutActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ activityType, athleteProfileId, coachId, details }: {
       activityType: string; athleteProfileId?: string; coachId?: string; details?: Record<string, any>;
    }) => {
       if (!user?.id) throw new Error("User not authenticated");
       const { data, error } = await supabase
         .from("scout_activity_log")
         .insert({ scout_user_id: user.id, activity_type: activityType, athlete_profile_id: athleteProfileId ||null, coach_id: coachId || null, details: details || null })
         .select().single();
       if (error) throw error;
       return data;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["scout-activity"] });
    },
  });
}
