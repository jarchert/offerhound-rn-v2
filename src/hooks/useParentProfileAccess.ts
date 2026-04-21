import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useParentProfileAccess() {
  const { user } = useAuth();
  return {
     linkedAthletes: [] as any[],
     selectedProfile: null as any,
     isLoading: false,
  };
}
