import { useCallback } from "react";
import { useAuth } from "./useAuth";

export function useScoutProfileView() {
  const { user } = useAuth();

  const logProfileView = useCallback(async (athleteProfileId: string) => {
    if (!user?.id) return;
    // Profile view logging - tracked via coach_activity_log or similar
    console.log("Scout profile view logged for:", athleteProfileId);
  }, [user?.id]);

  return { logProfileView };
}
