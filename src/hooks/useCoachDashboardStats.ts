import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns aggregate stats for the Coach Dashboard:
 * - savedCount: number of athletes saved by this coach
 * - lettersSent: number of letters sent by this coach
 */
export function useCoachDashboardStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach-dashboard-stats", user?.id],
    queryFn: async () => {
      if (!user) return { savedCount: 0, lettersSent: 0 };
      const [savedRes, lettersRes] = await Promise.all([
        supabase
          .from("saved_athletes" as any)
          .select("id", { count: "exact", head: true })
          .eq("coach_user_id", user.id),
        supabase
          .from("coach_letter_history")
          .select("id", { count: "exact", head: true })
          .eq("coach_user_id", user.id),
      ]);
      return {
        savedCount: savedRes.count ?? 0,
        lettersSent: lettersRes.count ?? 0,
      };
    },
    enabled: !!user,
  });
}
