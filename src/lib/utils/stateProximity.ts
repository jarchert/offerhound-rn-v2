/**
* Lightweight US-state proximity scoring used to sort athletes/coaches/contacts
* by how close they are to a viewing user's home state.
*
* Scoring (lower = closer):
*    0 — same state
*    1 — directly bordering state
*    2 — every other US state
*    3 — unknown / missing state on the candidate
*
* This is intentionally coarse: it requires no geocoding and runs entirely on
* the client. If you need more precision later, swap in a lat/long-based
* Haversine score per athlete profile.
*/

const norm = (s?: string | null): string => (s ?? "").trim().toUpperCase();

// ISO 3166-2:US two-letter codes plus DC. Common full names map to codes.
const NAME_TO_CODE: Record<string, string> = {
  ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR",
  CALIFORNIA: "CA", COLORADO: "CO", CONNECTICUT: "CT", DELAWARE: "DE",
   FLORIDA: "FL", GEORGIA: "GA", HAWAII: "HI", IDAHO: "ID",
   ILLINOIS: "IL", INDIANA: "IN", IOWA: "IA", KANSAS: "KS",
   KENTUCKY: "KY", LOUISIANA: "LA", MAINE: "ME", MARYLAND: "MD",
   MASSACHUSETTS: "MA", MICHIGAN: "MI", MINNESOTA: "MN", MISSISSIPPI: "MS",
   MISSOURI: "MO", MONTANA: "MT", NEBRASKA: "NE", NEVADA: "NV",
   "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM",
   "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND",
   OHIO: "OH", OKLAHOMA: "OK", OREGON: "OR", PENNSYLVANIA: "PA",
   "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD",
   TENNESSEE: "TN", TEXAS: "TX", UTAH: "UT", VERMONT: "VT",
   VIRGINIA: "VA", WASHINGTON: "WA", "WEST VIRGINIA": "WV",
   WISCONSIN: "WI", WYOMING: "WY", "DISTRICT OF COLUMBIA": "DC",
};

const ALL_CODES = new Set(
   Object.values(NAME_TO_CODE).concat(["DC"]),
);

export function toStateCode(value?: string | null): string | null {
   const v = norm(value);
   if (!v) return null;
   if (ALL_CODES.has(v)) return v;
   if (NAME_TO_CODE[v]) return NAME_TO_CODE[v];
   // Last resort: leading 2 letters if uppercase code embedded in a longer string
   const head = v.slice(0, 2);
   return ALL_CODES.has(head) ? head : null;
}

// Adjacency map – land-bordering US states. Hawaii / Alaska have no borders.
const BORDERS: Record<string, string[]> = {
   AL: ["FL", "GA", "MS", "TN"],
   AK: [],
   AZ: ["CA", "CO", "NM", "NV", "UT"],
   AR: ["LA", "MO", "MS", "OK", "TN", "TX"],
   CA: ["AZ", "NV", "OR"],
   CO: ["AZ", "KS", "NE", "NM", "OK", "UT", "WY"],
   CT: ["MA", "NY", "RI"],
   DE: ["MD", "NJ", "PA"],
   DC: ["MD", "VA"],
   FL: ["AL", "GA"],
   GA: ["AL", "FL", "NC", "SC", "TN"],
   HI: [],
   ID: ["MT", "NV", "OR", "UT", "WA", "WY"],
   IL: ["IA", "IN", "KY", "MO", "WI"],
   IN: ["IL", "KY", "MI", "OH"],
   IA: ["IL", "MN", "MO", "NE", "SD", "WI"],
   KS: ["CO", "MO", "NE", "OK"],
   KY: ["IL", "IN", "MO", "OH", "TN", "VA", "WV"],
   LA: ["AR", "MS", "TX"],
   ME: ["NH"],
   MD: ["DC", "DE", "PA", "VA", "WV"],
   MA: ["CT", "NH", "NY", "RI", "VT"],
   MI: ["IN", "OH", "WI"],
   MN: ["IA", "ND", "SD", "WI"],
   MS: ["AL", "AR", "LA", "TN"],
   MO: ["AR", "IA", "IL", "KS", "KY", "NE", "OK", "TN"],
   MT: ["ID", "ND", "SD", "WY"],
   NE: ["CO", "IA", "KS", "MO", "SD", "WY"],
   NV: ["AZ", "CA", "ID", "OR", "UT"],
   NH: ["MA", "ME", "VT"],
   NJ: ["DE", "NY", "PA"],
   NM: ["AZ", "CO", "OK", "TX", "UT"],
   NY: ["CT", "MA", "NJ", "PA", "VT"],
   NC: ["GA", "SC", "TN", "VA"],
   ND: ["MN", "MT", "SD"],
   OH: ["IN", "KY", "MI", "PA", "WV"],
   OK: ["AR", "CO", "KS", "MO", "NM", "TX"],
   OR: ["CA", "ID", "NV", "WA"],
   PA: ["DE", "MD", "NJ", "NY", "OH", "WV"],
   RI: ["CT", "MA"],
   SC: ["GA", "NC"],
   SD: ["IA", "MN", "MT", "ND", "NE", "WY"],
   TN: ["AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA"],
   TX: ["AR", "LA", "NM", "OK"],
   UT: ["AZ", "CO", "ID", "NM", "NV", "WY"],
   VT: ["MA", "NH", "NY"],
   VA: ["DC", "KY", "MD", "NC", "TN", "WV"],
   WA: ["ID", "OR"],
   WV: ["KY", "MD", "OH", "PA", "VA"],
   WI: ["IA", "IL", "MI", "MN"],
   WY: ["CO", "ID", "MT", "NE", "SD", "UT"],
};

/**
* Distance score relative to a viewer's home state.
* Returns: 0 (same), 1 (border), 2 (other US state), 3 (unknown).
*/
export function stateProximityScore(
  viewerState: string | null | undefined,
  candidateState: string | null | undefined,
): number {
  const v = toStateCode(viewerState);
  const c = toStateCode(candidateState);
  if (!c) return 3;
  if (!v) return 2;
  if (v === c) return 0;
  return BORDERS[v]?.includes(c) ? 1 : 2;
}

/**
* Human-readable badge label for the proximity row in athlete cards.
* Returns null when no useful label can be produced.
*/
export function proximityLabel(
  viewerState: string | null | undefined,
  candidateState: string | null | undefined,
): string | null {
  const score = stateProximityScore(viewerState, candidateState);
  switch (score) {
    case 0: return "Your state";
    case 1: return "Bordering state";
    default: return null;
  }
}
