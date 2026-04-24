// useCoaches — RN port stub of Lovable src/hooks/useCoaches.ts.
// The full Supabase-backed coach directory (with offline cache + online status)
// is deferred to a dedicated hook port; for now we expose an empty list with
// the same return shape expected by AthleteQuickStartGuide.
// GAP_IN_LOVABLE: offline cache, useCreateCoach, useRefreshCoaches mutations
// are not yet ported.
import { useMemo } from "react";

export interface Coach {
  id: string;
  name: string;
  title: string;
  school: string;
  conference: string;
  division: string;
  positionCoached: string;
  email: string;
  phone?: string | null;
  twitter?: string | null;
  imageUrl?: string | null;
  sport: string;
}

export function useCoaches() {
  const data = useMemo<Coach[]>(() => [], []);
  return {
    data,
    isLoading: false,
    isError: false,
    isOfflineData: false,
    isOnline: true,
  };
}
