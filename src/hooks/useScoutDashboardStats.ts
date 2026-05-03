import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns aggregate stats for the Scout Dashboard:
 * - savedCount: number of athletes saved by this scout
 * - lettersSent: number of letters sent by this scout
 * - searchesCount: number of search activities logged
 */
export function useScoutDashboardStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scout-dashboard-stats", user?.id],
    queryFn: async () => {
      if (!user) return { savedCount: 0, lettersSent: 0, searchesCount: 0 };
      const [savedRes, lettersRes, searchesRes] = await Promise.all([
        supabase
          .from("saved_athletes" as any)
          .select("id", { count: "exact", head: true })
          .eq("coach_user_id", user.id),
        supabase
          .from("scout_letter_history")
          .select("id", { count: "exact", head: true })
          .eq("scout_user_id", user.id),
        supabase
          .from("scout_activity_log")
          .select("id", { count: "exact", head: true })
          .eq("scout_user_id", user.id)
          .eq("activity_type", "search_performed"),
      ]);
      return {
        savedCount: savedRes.count ?? 0,
        lettersSent: lettersRes.count ?? 0,
        searchesCount: searchesRes.count ?? 0,
      };
    },
    enabled: !!user,
  });
}
