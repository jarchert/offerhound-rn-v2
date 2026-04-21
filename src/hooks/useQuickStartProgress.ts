import { useState } from "react";

export function useQuickStartProgress() {
  return {
     progress: {} as Record<string, boolean>,
     markComplete: (_step: string) => {},
     isComplete: (_step: string) => false,
     completedCount: 0,
     totalSteps: 5,
  };
}
