import {getPositionsForSport} from '@/lib/data/sportPositions';

/** Reconcile legacy singular/abbreviated positions with current selection labels. */
export function profilePositions(profile: {sport?: string|null; position?: string|null; positions?: unknown}): string[] {
  const values = Array.isArray(profile.positions) && profile.positions.some(v=>typeof v==='string' && v.trim())
    ? profile.positions : profile.position ? [profile.position] : [];
  const options = getPositionsForSport(profile.sport || 'football');
  const result = values.filter((v): v is string=>typeof v==='string' && !!v.trim()).map(value=>{
    const input=value.trim().toLowerCase();
    const match=options.find(({label})=>label.toLowerCase()===input
      || label.replace(/\s*\([^)]*\)$/, '').toLowerCase()===input
      || label.match(/\(([^)]*)\)$/)?.[1]?.toLowerCase()===input);
    return match?.label || value.trim();
  });
  return [...new Set(result)];
}
