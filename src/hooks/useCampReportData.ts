import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * RN port of Lovable web src/hooks/useCampReportData.ts.
 *
 * The web version imported `CampReportData` from `@/lib/campReportPdf`, which depends
 * on jsPDF (browser-only). The PDF generator hasn't been ported to RN yet, so the
 * shape is inlined here. When the RN PDF/share path lands, swap this for a shared
 * type module so both sides stay in sync.
 */
export interface CampReportData {
  camp: {
    id: string;
    name: string;
    sport: string;
    start_date: string;
    end_date?: string | null;
    location?: string | null;
    city?: string | null;
    state?: string | null;
  };
  athlete: {
    name: string;
    position?: string | null;
    school?: string | null;
    graduation_year?: string | number | null;
    jersey_number?: string | null;
    position_group?: string | null;
  };
  measurables: {
    forty_yard_dash?: number | null;
    shuttle_5_10_5?: number | null;
    three_cone_drill?: number | null;
    vertical_jump?: number | null;
    broad_jump?: number | null;
    height_inches?: number | null;
    weight_lbs?: number | null;
  };
  ai?: {
    composite?: number | null;
    rank?: number | null;
    speed?: number | null;
    agility?: number | null;
    explosiveness?: number | null;
    position_score?: number | null;
    summary?: string | null;
  } | null;
  badge?: { label: string; type: string } | null;
  evaluatorNotes?: string | null;
  drillEvaluations?: Array<{ drill_name: string; score: number | null; notes?: string | null }>;
  campAverage?: {
    forty_yard_dash?: number | null;
    vertical_jump?: number | null;
    broad_jump?: number | null;
  } | null;
  athletesInCamp?: number;
}

function avg(arr: number[] | null | undefined): number | null {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function best(arr: number[] | null | undefined, lowerBetter = false): number | null {
  if (!arr || arr.length === 0) return null;
  return lowerBetter ? Math.min(...arr) : Math.max(...arr);
}

export function useCampReportData(campId: string | null, enrollmentId: string | null) {
  return useQuery({
    queryKey: ["camp-report-data", campId, enrollmentId],
    enabled: !!campId && !!enrollmentId,
    queryFn: async (): Promise<CampReportData | null> => {
      if (!campId || !enrollmentId) return null;

      const [{ data: camp }, { data: enrollment }, { data: perfRow }, { data: aiRow }] = await Promise.all([
        supabase.from("camps").select("*").eq("id", campId).maybeSingle(),
        supabase.from("camp_enrollments").select("*").eq("id", enrollmentId).maybeSingle(),
        supabase.from("camp_performance_entries").select("*").eq("camp_id", campId).eq("enrollment_id", enrollmentId).maybeSingle(),
        supabase.from("camp_ai_scores").select("*").eq("camp_id", campId).eq("enrollment_id", enrollmentId).maybeSingle(),
      ]);

      if (!camp || !enrollment) return null;

      const profileId = (enrollment as any).athlete_profile_id;
      const [{ data: profile }, { data: badge }, { data: drillEvals }, { data: campPerf }, { data: campAi }] = await Promise.all([
        profileId
          ? supabase.from("player_profiles").select("first_name,last_name,position,school,graduation_year").eq("id", profileId).maybeSingle()
          : Promise.resolve({ data: null }),
        profileId
          ? supabase.from("athlete_verified_badges").select("badge_label,badge_type").eq("athlete_profile_id", profileId).eq("camp_id", campId).maybeSingle()
          : Promise.resolve({ data: null }),
        perfRow
          ? supabase.from("camp_drill_evaluations").select("drill_name,score,evaluator_notes").eq("performance_entry_id", (perfRow as any).id)
          : Promise.resolve({ data: [] }),
        supabase.from("camp_performance_entries").select("forty_yard_dash,vertical_jump,broad_jump").eq("camp_id", campId),
        supabase.from("camp_ai_scores").select("athlete_profile_id, composite_score, ai_rank").eq("camp_id", campId).order("composite_score", { ascending: false }),
      ]);

      const fortyAvg = (campPerf || [])
        .map((r: any) => best(r.forty_yard_dash, true))
        .filter((v): v is number => v != null);
      const vertAvg = (campPerf || [])
        .map((r: any) => best(r.vertical_jump, false))
        .filter((v): v is number => v != null);
      const broadAvg = (campPerf || [])
        .map((r: any) => best(r.broad_jump, false))
        .filter((v): v is number => v != null);

      const p: any = perfRow || {};
      const a: any = aiRow || null;

      const fullName = profile
        ? `${(profile as any).first_name || ""} ${(profile as any).last_name || ""}`.trim() || "Athlete"
        : "Athlete";

      return {
        camp: {
          id: (camp as any).id,
          name: (camp as any).name,
          sport: (camp as any).sport,
          start_date: (camp as any).start_date,
          end_date: (camp as any).end_date,
          location: (camp as any).location,
          city: (camp as any).city,
          state: (camp as any).state,
        },
        athlete: {
          name: fullName,
          position: (profile as any)?.position ?? null,
          school: (profile as any)?.school ?? null,
          graduation_year: (profile as any)?.graduation_year ?? null,
          jersey_number: (enrollment as any).jersey_number,
          position_group: (enrollment as any).position_group,
        },
        measurables: {
          forty_yard_dash: best(p.forty_yard_dash, true),
          shuttle_5_10_5: best(p.shuttle_5_10_5, true),
          three_cone_drill: best(p.three_cone_drill, true),
          vertical_jump: best(p.vertical_jump, false),
          broad_jump: best(p.broad_jump, false),
          height_inches: p.height_inches,
          weight_lbs: p.weight_lbs,
        },
        ai: a
          ? {
              composite: a.composite_score,
              rank: a.ai_rank,
              speed: a.speed_score,
              agility: a.agility_score,
              explosiveness: a.explosiveness_score,
              position_score: a.position_score,
              summary: a.ai_summary,
            }
          : null,
        badge: badge
          ? { label: (badge as any).badge_label, type: (badge as any).badge_type }
          : null,
        evaluatorNotes: p.coach_notes ?? null,
        drillEvaluations: (drillEvals || []).map((d: any) => ({
          drill_name: d.drill_name,
          score: d.score,
          notes: d.evaluator_notes,
        })),
        campAverage: {
          forty_yard_dash: avg(fortyAvg),
          vertical_jump: avg(vertAvg),
          broad_jump: avg(broadAvg),
        },
        athletesInCamp: (campAi || []).length,
      };
    },
  });
}
