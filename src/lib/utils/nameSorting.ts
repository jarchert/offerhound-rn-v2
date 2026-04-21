/**
* Utility helpers to push records that lack a populated first AND last name
* to the bottom of any search/directory list.
*
* A record is considered "missing a full name" when the resolved name field is:
* - empty / null / undefined
* - a single token (no space → likely missing first or last name)
* - a known placeholder (e.g. "Unknown", "N/A")
*/

const PLACEHOLDER_NAMES = new Set([
  "unknown",
  "unknown user",
  "n/a",
  "na",
  "no name",
  "anonymous",
  "user",
  "athlete",
  "coach",
  "scout",
]);

export function hasFullName(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  if (PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) return false;
  // Require at least two non-empty tokens (first + last)
  const tokens = trimmed.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length < 2) return false;
  // Each of the first two tokens should be at least 1 letter
  return tokens[0].length >= 1 && tokens[1].length >= 1;
}

/**
* Comparator factor: returns -1 / 1 if exactly one of (a, b) lacks a full name,
* else returns 0 so the caller can apply its own secondary ordering.
*/
export function compareByFullNamePresence<T>(
  a: T,
  b: T,
  getName: (item: T) => string | null | undefined
): number {
  const aHas = hasFullName(getName(a));
  const bHas = hasFullName(getName(b));
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;
  return 0;
}

/**
* Stable partition: items WITH a full name first (in original order),
* items WITHOUT a full name appended at the end (in original order).
*/
export function partitionByFullName<T>(
  items: T[],
  getName: (item: T) => string | null | undefined
): T[] {
  const named: T[] = [];
  const unnamed: T[] = [];
  for (const item of items) {
    if (hasFullName(getName(item))) named.push(item);
    else unnamed.push(item);
  }
  return [...named, ...unnamed];
}
