import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";

export interface AthleteCoachMatch {
  id: string;
  athlete_profile_id: string;
  coach_id: string;
  match_score: number;
  athletic_fit_score: number;
  program_fit_score: number;
  geographic_fit_score: number;
  scheme_fit_score: number;
  recruiting_history_score: number;
  match_reason: string;
  priority: "high" | "medium" | "low";
  is_dismissed: boolean;
  last_refreshed_at: string;
  coach?: {
    id: string;
    name: string;
    title: string;
    school: string;
    conference: string;
     division: string;
     position_coached: string;
     email: string;
     image_url: string | null;
  };
}

export function useAthleteMatches() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile();

  return useQuery({
     queryKey: ["athlete-matches", profile?.id],
     queryFn: async () => {
        if (!profile?.id) return [];
        const { data, error } = await supabase
          .from("athlete_coach_matches")
          .select(`*, coach:coaches(id, name, title, school, conference, division, position_coached, email, image_url)`)
          .eq("athlete_profile_id", profile.id)
          .eq("is_dismissed", false)
          .order("match_score", { ascending: false });
        if (error) throw error;
        return data as AthleteCoachMatch[];
     },
     enabled: !!profile?.id,
  });
}

export function useDismissAthleteMatch() {
  const queryClient = useQueryClient();
  return useMutation({
     mutationFn: async (matchId: string) => {
        const { error } = await supabase.from("athlete_coach_matches").update({ is_dismissed: true }).eq("id", matchId);
        if (error) throw error;
     },
     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["athlete-matches"] }); },
  });
}

export interface CoachAthleteMatch {
  id: string;
  coach_user_id: string;
  athlete_profile_id: string;
  match_score: number;
  athletic_fit_score: number;
  position_fit_score: number;
  geographic_fit_score: number;
  academic_fit_score: number;
  match_reason: string;
  priority: "high" | "medium" | "low";
  is_dismissed: boolean;
  last_refreshed_at: string;
  athlete?: {
     id: string;
     full_name: string;
     position: string;
     positions: string[];
     school: string;
     city: string;
     state: string;
     graduation_year: string;
     height: string;
     weight: string;
     profile_image_url: string | null;
     gpa: string;
     sport: string | null;
  };
}

export function useCoachAthleteMatches() {
  const { user } = useAuth();
  return useQuery({
     queryKey: ["coach-athlete-matches", user?.id],
     queryFn: async () => {
        if (!user?.id) return [];
        const { data, error } = await supabase
          .from("coach_athlete_matches")
          .select(`*, athlete:player_profiles(id, full_name, position, positions, school, city, state, graduation_year, height, weight, profile_image_url, gpa, sport)`)
          .eq("coach_user_id", user.id)
          .eq("is_dismissed", false)
         .order("match_score", { ascending: false });
       if (error) throw error;
       return data as CoachAthleteMatch[];
    },
    enabled: !!user?.id,
  });
}

export function useDismissCoachMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => {
       const { error } = await supabase.from("coach_athlete_matches").update({ is_dismissed: true }).eq("id", matchId);
       if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["coach-athlete-matches"] }); },
  });
}
