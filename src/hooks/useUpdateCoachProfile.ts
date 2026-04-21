import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoachProfile } from "@/hooks/useCoachProfile";

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
