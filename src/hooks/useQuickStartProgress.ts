// useQuickStartProgress — RN port (stub-level parity with Lovable API).
// Lovable source: src/hooks/useQuickStartProgress.ts
// Full Supabase-backed persistence is out of scope for this port; we expose the
// same surface the component consumes and keep state in-memory per session.
// GAP_IN_LOVABLE: Supabase persistence of showGuide/completedSteps/dismissed
// is deferred to the hook port session.
import { useState, useCallback } from "react";

export type QuickStartRole = "athlete" | "coach" | "scout" | "parent" | "influencer";

export function useQuickStartProgress(_role: QuickStartRole = "athlete") {
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
  }, []);

  const resetGuide = useCallback(() => {
    setShowGuide(true);
    setCompletedSteps([]);
  }, []);

  const completeStep = useCallback((stepId: string) => {
    setCompletedSteps((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
  }, []);

  // Back-compat helpers used by older scaffolds.
  const markComplete = completeStep;
  const isComplete = useCallback(
    (stepId: string) => completedSteps.includes(stepId),
    [completedSteps]
  );

  return {
    // Lovable parity API (consumed by AthleteQuickStartGuide / CoachQuickStartGuide / etc.)
    showGuide,
    completedSteps,
    dismissGuide,
    resetGuide,
    completeStep,
    isLoading: false as const,

    // Legacy surface kept to avoid breaking earlier stubs.
    progress: {} as Record<string, boolean>,
    markComplete,
    isComplete,
    completedCount: completedSteps.length,
    totalSteps: 5,
  };
}
