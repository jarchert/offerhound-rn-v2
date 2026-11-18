import {useSavedAthletes} from './useSavedAthletes';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useScoutSavedAthletes() {
  return useSavedAthletes();
}

export function useScoutSaveAthlete() {
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  return useMutation({
    mutationFn: async ({ athleteProfileId, notes, priority = "medium" }: { athleteProfileId: string; notes?: string; priority?: string }) => {
       if (!user?.id) throw new Error("Not authenticated");
       const { data, error } = await supabase
         .from("saved_athletes")
         .insert({ coach_user_id: user.id, scout_user_id: ["scout","agency"].includes(userRole||"") ? user.id : null, athlete_profile_id: athleteProfileId, notes:notes || null, priority })
         .select().single();
       if (error) { if(error.code==='23505')return {alreadySaved:true}; throw error; }
       if(!data?.id||data.athlete_profile_id!==athleteProfileId||data.coach_user_id!==user.id)throw Error("Save was not confirmed. Refresh your shortlist before retrying.");
       return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["saved-athletes"] }); },
  });
}
