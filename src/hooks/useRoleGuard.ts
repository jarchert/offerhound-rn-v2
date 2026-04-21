import { useState } from "react";

export function useRoleGuard(_role: string) {
  return { isLoading: false, currentRole: "none" as string | null, redirectPath: null as string | null };
}

export function getRoleConflictMessage(role: string) {
  return {
     title: `Role Conflict`,
     description: `You are currently registered as a ${role}. Please use the correct dashboard.`,
  };
}
