/**
 * isMinorSafeAthlete — shared guard helper for upload paths.
 *
 * Returns true when the player_profiles row has is_minor_safe=true, meaning
 * the profile belongs to an athlete under 13 and parental consent has NOT yet
 * been completed. All media/file upload paths must call this before writing
 * anything to Supabase Storage.
 *
 * Fail-open on lookup errors (returns false) so a transient DB error never
 * silently blocks uploads for non-minor athletes.
 *
 * Usage:
 *   const locked = await isMinorSafeAthlete(supabase, athleteId);
 *   if (locked) { /* show honest error, return *\/ }
 *
 * Parity with MAIN: MAIN does not yet implement this helper — this is RN-first.
 */

import { supabase } from '@/integrations/supabase/client';

export async function isMinorSafeAthlete(athleteId: string): Promise<boolean> {
  if (!athleteId) return false;
  try {
    const { data, error } = await supabase
      .from('player_profiles')
      .select('is_minor_safe')
      .eq('id', athleteId)
      .maybeSingle();
    if (error) {
      // Fail-open: lookup error → treat as non-minor, allow upload.
      console.warn('[isMinorSafeAthlete] lookup error:', error.message);
      return false;
    }
    return !!((data as any)?.is_minor_safe);
  } catch (e: any) {
    console.warn('[isMinorSafeAthlete] unexpected error:', e?.message);
    return false;
  }
}

/** Synchronous version for callers that already have the profile object. */
export function isMinorSafeFromProfile(profile: any): boolean {
  return !!(profile?.is_minor_safe);
}
