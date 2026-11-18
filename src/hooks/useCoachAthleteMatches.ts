import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useCoachAthleteMatches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach-athlete-matches", user?.id],
    queryFn: async () => {
       if (!user) return [];
       const { data, error } = await supabase
         .from("coach_athlete_matches")
         .select("*")
         .eq("coach_user_id", user.id)
         .eq("is_dismissed", false)
         .order("match_score", { ascending: false })
         .limit(50);
       if (error) throw error;
       if(!data?.length)return [];
       const listed=await supabase.from('player_profiles_recruiter_safe' as any).select('id, full_name, position, positions, school, graduation_year, height, weight, city, state, profile_image_url, custom_url, traits, intangibles, gpa, sport').in('id',data.map((row:any)=>row.athlete_profile_id));
       if(listed.error)throw listed.error;
       const byId=new Map((listed.data||[]).map((athlete:any)=>[athlete.id,athlete]));
       return data.filter((row:any)=>byId.has(row.athlete_profile_id)).map((row:any)=>({...row,athlete:byId.get(row.athlete_profile_id)}));
    },
    enabled: !!user,
  });
}

export interface CoachAthleteMatch {
  id: string;
  athlete_profile_id: string;
  match_score: number;
  athletic_fit_score: number;
  position_fit_score: number;
  geographic_fit_score: number;
  academic_fit_score: number;
  priority: string | null;
  match_reason: string | null;
  athlete: any;
}
