import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useHSCoachProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["hs-coach-profile", user?.id],
    queryFn: async () => {
       if (!user) return null;
       const { data, error } = await supabase
         .from("high_school_coach_profiles")
         .select("*")
         .eq("user_id", user.id)
         .maybeSingle();
       if (error) throw error;
       return data;
    },
    enabled: !!user,
  });
}

export function useUpdateHSCoachProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
       if (!user) throw new Error("Not authenticated");
       const { error } = await supabase
         .from("high_school_coach_profiles")
         .update(updates)
         .eq("user_id", user.id);
       if (error) throw error;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["hs-coach-profile"] });
    },
  });
}
