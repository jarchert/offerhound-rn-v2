import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function useSavedCoaches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-coaches", user?.id],
    queryFn: async () => {
       if (!user) return [];
       const { data, error } = await supabase
         .from("saved_coaches")
         .select("*, coach:coaches(*)")
         .eq("user_id", user.id)
         .order("saved_at", { ascending: false });
       if (error) return [];
       return data || [];
    },
    enabled: !!user,
  });
}

export function useSaveCoach() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ coachId, notes, priority }: { coachId: string; notes?: string; priority?: string }) => {
       if (!user) throw new Error("Must be signed in");
       const { error } = await supabase.from("saved_coaches").insert({
         user_id: user.id,
         coach_id: coachId,
         notes: notes || null,
         priority: priority || "medium",
       });
       if (error) throw error;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["saved-coaches"] });
       toast({ title: "Coach Saved", description: "Added to your saved coaches list." });
    },
    onError: (err: any) => {
       toast({ title: "Error", description: err.message || "Failed to save coach", variant: "destructive" });
    },
  });
}

export function useRemoveSavedCoach() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (coachId: string) => {
       const { error } = await supabase.from("saved_coaches").delete().eq("user_id", user!.id).eq("coach_id", coachId);
       if (error) throw error;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["saved-coaches"] });
       toast({ title: "Coach Removed", description: "Removed from your saved coaches." });
    },
  });
}

export function useUpdateSavedCoach() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ coachId, notes, priority }: { coachId: string; notes?: string; priority?: string }) => {
       const { error } = await supabase.from("saved_coaches").update({ notes, priority }).eq("user_id", user!.id).eq("coach_id", coachId);
       if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-coaches"] }),
  });
}

export function useIsCoachSaved(coachId: string) {
  const { data: savedCoaches } = useSavedCoaches();
  return savedCoaches?.some((s: any) => s.coach_id === coachId) ?? false;
}
