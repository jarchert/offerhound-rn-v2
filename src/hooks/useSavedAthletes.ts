import {recruiterShortlist} from '@/lib/recruiterAthletes';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSavedAthletes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-athletes", user?.id],
    queryFn: async () => {
       if (!user) return [] as any[];
       return recruiterShortlist(supabase,user.id);
    },
    enabled: !!user,
  });
}

export function useRemoveSavedAthlete() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
       if (!user?.id) throw Error("Sign in to change your shortlist.");
       const { data, error } = await supabase.from("saved_athletes").delete().eq("id", id).eq("coach_user_id", user.id).select("id").single();
       if (error) throw error;
       if (data?.id !== id) throw Error("Removal was not confirmed. Refresh your shortlist before retrying.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-athletes"] }),
  });
}

export function useUpdateSavedAthlete() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes, priority }: { id: string; notes?: string; priority?: string }) => {
       if (!user?.id) throw Error("Sign in to change your shortlist.");
       const patch = { ...(notes !== undefined ? { notes } : {}), ...(priority !== undefined ? { priority } : {}) };
       const { data, error } = await supabase.from("saved_athletes").update(patch).eq("id", id).eq("coach_user_id", user.id).select("id,notes,priority").single();
       if (error) throw error;
       if (data?.id !== id || (notes !== undefined && data.notes !== notes) || (priority !== undefined && data.priority !== priority)) throw Error("Changes were not confirmed. Refresh your shortlist before retrying.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-athletes"] }),
  });
}
