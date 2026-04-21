/**
* Sport matching helpers for filtering search results to a viewer's
* registered sport(s).
*
* Background: athletes have a primary `sport` and JSON `secondary_sports`,
* coaches have `sport` and JSON `secondary_sports`, and scouts have a
* `sports` text[] array. We normalize all of these so search lists only
* surface contacts whose sports overlap with the current viewer.
*/

const SPORT_ALIASES: Record<string, string> = {
   "track": "track-field",
   "track and field": "track-field",
   "track & field": "track-field",
   "track-and-field": "track-field",
   "trackfield": "track-field",
   "cheer": "cheerleading",
};

export function normalizeSport(input: unknown): string | null {
   if (input == null) return null;
   const raw = String(input).trim().toLowerCase();
   if (!raw) return null;
  return SPORT_ALIASES[raw] ?? raw;
}

/**
* Pull every sport reference from a profile-like object regardless of role.
* Accepts coach/athlete (sport + secondary_sports) and scout (sports[]) shapes.
*/
export function extractSports(profile: any): Set<string> {
  const out = new Set<string>();
  if (!profile) return out;

  const add = (val: unknown) => {
     const n = normalizeSport(val);
     if (n) out.add(n);
  };

  add(profile.sport);

  if (Array.isArray(profile.sports)) {
     profile.sports.forEach(add);
  }

  const secondary = profile.secondary_sports;
  if (Array.isArray(secondary)) {
     secondary.forEach((entry: any) => {
       if (typeof entry === "string") add(entry);
       else if (entry && typeof entry === "object") add(entry.sport);
     });
  }

  return out;
}

/**
* Returns true when the candidate shares at least one sport with the viewer.
* If the viewer has no registered sports, no filtering is applied.
*/
export function sportsOverlap(viewerSports: Set<string>, candidate: any): boolean {
  if (viewerSports.size === 0) return true;
  const candidateSports = extractSports(candidate);
  if (candidateSports.size === 0) return false;
  for (const s of candidateSports) {
     if (viewerSports.has(s)) return true;
  }
  return false;
}
