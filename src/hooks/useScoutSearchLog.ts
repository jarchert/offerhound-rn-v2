import { useCallback, useRef } from "react";
import { useScoutProfile } from "./useScoutProfile";

export function useScoutSearchLog() {
  const { data: scoutProfile } = useScoutProfile();
  const lastSearchLog = useRef<number>(0);

  const logSearch = useCallback((filters: Record<string, any>) => {
    if (!scoutProfile) return;
    const now = Date.now();
    if (now - lastSearchLog.current < 5000) return;
    lastSearchLog.current = now;
    // Scout search logging - activity tracked via useScoutActivity
  }, [scoutProfile]);

  return { logSearch, isScout: !!scoutProfile };
}
