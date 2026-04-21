import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Toast from "react-native-toast-message";
const toast = (opts: any) => Toast.show(opts);

export interface ScoutSavedCoach {
  id: string;
  scout_user_id: string;
  coach_id: string;
  notes: string | null;
  priority: "high" | "medium" | "low";
  saved_at: string;
  updated_at: string;
  coach?: any;
}

export function useScoutSavedCoaches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scout-saved-coaches", user?.id],
    queryFn: async () => {
       if (!user?.id) return [];
       const { data, error } = await supabase
         .from("scout_saved_coaches")
         .select(`*, coach:coaches(id, name, title, school, conference, division, position_coached, email, twitter, phone, image_url, sport)`)
         .eq("scout_user_id", user.id)
         .order("priority", { ascending: true })
         .order("saved_at", { ascending: false });
       if (error) throw error;
       return data as ScoutSavedCoach[];
    },
    enabled: !!user?.id,
  });
}

export function useScoutSaveCoach() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ coachId, notes, priority }: { coachId: string; notes?: string; priority?: "high" | "medium" | "low" }) => {
       if (!user?.id) throw new Error("You must be signed in to save coaches");
       const { data, error } = await supabase
         .from("scout_saved_coaches")
         .insert({ scout_user_id: user.id, coach_id: coachId, notes: notes || null, priority: priority || "medium" })
         .select().single();
       if (error) { if (error.code === "23505") throw new Error("Coach already saved"); throw error; }
       return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["scout-saved-coaches"] }); Toast.show({ type: "success", text1: "Coach added to your network!" }); },
    onError: (error) => { Toast.show({ type: "error", text1: error instanceof Error ? error.message : "Failed to save coach" }); },
  });
}

export function useScoutRemoveSavedCoach() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (coachId: string) => {
       if (!user?.id) throw new Error("You must be signed in");
       const { error } = await supabase.from("scout_saved_coaches").delete().eq("coach_id", coachId).eq("scout_user_id", user.id);
       if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["scout-saved-coaches"] }); Toast.show({ type: "success", text1: "Coach removed from your network" }); },
    onError: () => { Toast.show({ type: "error", text1: "Failed to remove coach" }); },
  });
}
