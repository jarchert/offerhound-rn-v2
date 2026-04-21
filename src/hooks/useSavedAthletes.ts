import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSavedAthletes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-athletes", user?.id],
    queryFn: async () => {
       if (!user) return [] as any[];
       const { data, error } = await supabase
         .from("saved_athletes" as any)
         .select("*, athlete:player_profiles(*)")
         .eq("coach_user_id", user.id);
       if (error) return [] as any[];
       return (data || []) as any[];
    },
    enabled: !!user,
  });
}

export function useRemoveSavedAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
       const { error } = await supabase.from("saved_athletes" as any).delete().eq("id", id);
       if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-athletes"] }),
  });
}

export function useUpdateSavedAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes, priority }: { id: string; notes?: string; priority?: string }) => {
       const { error } = await supabase.from("saved_athletes" as any).update({ notes, priority }).eq("id", id);
       if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-athletes"] }),
  });
}
