import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUpdateScoutProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
       if (!user) throw new Error("Not authenticated");
       const { error } = await supabase.from("scout_profiles" as any).update(updates).eq("user_id", user.id);
       if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scout-profile"] }),
  });
}
