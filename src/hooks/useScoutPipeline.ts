import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ScoutPipelineStage {
  id: string;
  scout_user_id: string;
  name: string;
  position: number;
  color: string;
}

export function useScoutPipelineStages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scout-pipeline-stages", user?.id],
    queryFn: async () => {
       if (!user?.id) return [];
       const { data, error } = await supabase
         .from("scout_pipeline_stages")
         .select("*")
         .eq("scout_user_id", user.id)
         .order("position");
       if (error) throw error;
       return data as ScoutPipelineStage[];
    },
    enabled: !!user?.id,
  });
}

export function useScoutPipelineAthletes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scout-pipeline-athletes", user?.id],
    queryFn: async () => {
       if (!user?.id) return [];
       // Use athlete_pipeline_status table which exists in the schema
       const { data, error } = await supabase
         .from("athlete_pipeline_status")
         .select("*")
         .eq("coach_user_id", user.id);
       if (error) throw error;
       return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useAddToPipeline() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ athleteProfileId, stageId, notes, priority }: { athleteProfileId: string; stageId: string; notes?: string; priority?: string }) => {
       if (!user?.id) throw new Error("Not authenticated");
       const { data, error } = await supabase
         .from("athlete_pipeline_status")
         .insert({ coach_user_id: user.id, athlete_profile_id: athleteProfileId, stage_id: stageId, notes: notes || null, priority: priority || "medium" })
         .select().single();
       if (error) throw error;
       return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["scout-pipeline-athletes"] }); },
  });
}
