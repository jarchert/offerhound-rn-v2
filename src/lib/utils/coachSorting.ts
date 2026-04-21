const OFFENSIVE_POSITIONS = ['qb', 'quarterback', 'rb', 'running back', 'wr', 'wide receiver', 'te', 'tight end', 'ol', 'offensive line', 'athlete', 'ath'];
const DEFENSIVE_POSITIONS = ['cb', 'cornerback', 'safety', 'db', 'defensive back', 'lb', 'linebacker', 'dl', 'defensive line', 'de', 'dt', 'edge'];
const HEAD_COACH_INDICATORS = ['head coach', 'head football coach', 'hc'];

export function isOffensivePosition(position: string | null): boolean {
  if (!position) return false;
  const posLower = position.toLowerCase();
  return OFFENSIVE_POSITIONS.some(p => posLower.includes(p));
}

export function isDefensivePosition(position: string | null): boolean {
  if (!position) return false;
  const posLower = position.toLowerCase();
  return DEFENSIVE_POSITIONS.some(p => posLower.includes(p));
}

export function getAthleteSideOfBall(primaryPosition: string | null, secondaryPositions: string[] | null): 'offense' | 'defense' | 'both' | 'unknown' {
  const allPositions = [primaryPosition, ...(secondaryPositions || [])].filter(Boolean) as string[];
  if (allPositions.length === 0) return 'unknown';
  let hasOffensive = false, hasDefensive = false;
  for (const pos of allPositions) {
    if (isOffensivePosition(pos)) hasOffensive = true;
    if (isDefensivePosition(pos)) hasDefensive = true;
  }
  if (hasOffensive && hasDefensive) return 'both';
  if (hasOffensive) return 'offense';
  if (hasDefensive) return 'defense';
  return 'unknown';
}

function isHeadCoach(title: string | null, positionCoached: string | null): boolean {
  const combined = `${title || ''} ${positionCoached || ''}`.toLowerCase();
  return HEAD_COACH_INDICATORS.some(indicator => combined.includes(indicator));
}

function isOffensiveCoach(title: string | null, positionCoached: string | null): boolean {
  const posLower = (positionCoached || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();
  if (titleLower.includes('offensive coordinator')) return true;
  return OFFENSIVE_POSITIONS.some(p => posLower.includes(p));
}

function isDefensiveCoach(title: string | null, positionCoached: string | null): boolean {
  const posLower = (positionCoached || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();
  if (titleLower.includes('defensive coordinator')) return true;
  return DEFENSIVE_POSITIONS.some(p => posLower.includes(p));
}

function getCoachPositionRelevanceScore(
  coach: { title: string; position_coached: string },
  athleteSideOfBall: 'offense' | 'defense' | 'both' | 'unknown'
): number {
  const { title, position_coached } = coach;
  if (isHeadCoach(title, position_coached)) return 1000;
  const coachIsOffensive = isOffensiveCoach(title, position_coached);
  const coachIsDefensive = isDefensiveCoach(title, position_coached);
  const titleLower = (title || '').toLowerCase();
  const isCoordinator = titleLower.includes('coordinator');

  if (athleteSideOfBall === 'unknown' || athleteSideOfBall === 'both') {
    if (isCoordinator) return 500;
    if (coachIsOffensive || coachIsDefensive) return 300;
    return 100;
  }
  if (athleteSideOfBall === 'offense') {
    if (coachIsOffensive) return isCoordinator ? 800 : 600;
    if (coachIsDefensive) return isCoordinator ? 400 : 200;
  }
  if (athleteSideOfBall === 'defense') {
    if (coachIsDefensive) return isCoordinator ? 800 : 600;
    if (coachIsOffensive) return isCoordinator ? 400 : 200;
  }
  return 100;
}

export function sortCoachesByPositionRelevance<T extends { title: string; position_coached: string; school: string; name: string }>(
  coaches: T[], primaryPosition: string | null, secondaryPositions: string[] | null
): T[] {
  const athleteSide = getAthleteSideOfBall(primaryPosition, secondaryPositions);
  return [...coaches].sort((a, b) => {
    const scoreA = getCoachPositionRelevanceScore(a, athleteSide);
    const scoreB = getCoachPositionRelevanceScore(b, athleteSide);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const schoolCompare = a.school.localeCompare(b.school);
    if (schoolCompare !== 0) return schoolCompare;
    return a.name.localeCompare(b.name);
  });
}
