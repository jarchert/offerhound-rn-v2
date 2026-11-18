import {hydrateRecruiterAthletes} from '@/lib/recruiterAthletes';
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
       // Scout stages and the visible scout board use the scout-owned pipeline.
       const { data, error } = await supabase
         .from("scout_athlete_pipeline_status")
         .select("*")
         .eq("scout_user_id", user.id);
       if (error) throw error;
       return hydrateRecruiterAthletes(supabase,data||[],'player_profiles');
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
         .from("scout_athlete_pipeline_status")
         .insert({ scout_user_id: user.id, athlete_profile_id: athleteProfileId, stage_id: stageId, notes: notes || null, priority: priority || "medium" })
         .select().single();
       if (error) throw error;
       if(!data?.id||data.athlete_profile_id!==athleteProfileId||data.stage_id!==stageId||data.scout_user_id!==user.id)throw Error("Pipeline addition was not confirmed. Refresh the board before retrying.");
       return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["scout-pipeline-athletes"] }); },
  });
}
