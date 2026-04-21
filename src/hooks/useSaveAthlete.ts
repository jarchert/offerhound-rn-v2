import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSaveAthlete() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ athleteProfileId }: { athleteProfileId: string }) => {
       if (!user) throw new Error("Not authenticated");
       const { error } = await supabase.from("saved_athletes" as any).insert({
         coach_user_id: user.id,
         athlete_profile_id: athleteProfileId,
       });
       if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-athletes"] }),
  });
}
