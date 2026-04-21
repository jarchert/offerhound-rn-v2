import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useScoutSavedAthletes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scout-saved-athletes", user?.id],
    queryFn: async () => {
       if (!user?.id) return [];
       const { data, error } = await supabase
         .from("saved_athletes")
         .select(`*, athlete:player_profiles!athlete_profile_id (id, full_name, position, school, graduation_year, city, state, profile_image_url, custom_url)`)
         .eq("scout_user_id", user.id)
         .order("saved_at", { ascending: false });
       if (error) throw error;
       return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useScoutSaveAthlete() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ athleteProfileId, notes, priority = "medium" }: { athleteProfileId: string; notes?: string; priority?: string }) => {
       if (!user?.id) throw new Error("Not authenticated");
       const { data, error } = await supabase
         .from("saved_athletes")
         .insert({ coach_user_id: user.id, scout_user_id: user.id, athlete_profile_id: athleteProfileId, notes:notes || null, priority })
         .select().single();
       if (error) throw error;
       return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["scout-saved-athletes"] }); },
  });
}
