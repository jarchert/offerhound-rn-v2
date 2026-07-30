/**
 * getAgeBand — RN port of MAIN src/lib/getAgeBand.ts
 *
 * Age bands drive the visibility-consent system:
 *   "child"   → under 15  — hard-blocked, no UI shown at all
 *   "teen"    → 15–17     — parent consensus required (VisibilityProposalControl renders)
 *   "adult"   → 18+       — self-managed, no parental gate
 *   "unknown" → null/bad  — treated as no-op (component renders nothing)
 */

export type AgeBand = "child" | "teen" | "adult" | "unknown";

export function getAgeBand(dateOfBirth: string | null | undefined): AgeBand {
  if (!dateOfBirth) return "unknown";
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return "unknown";

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 15) return "child";
  if (age < 18) return "teen";
  return "adult";
}
