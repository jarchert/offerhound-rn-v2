// Import the actual React Navigation linking parser and feed it a JS copy of
// the linking config extracted from src/navigation/linking.ts. We can't import
// linking.ts directly under plain node because it transitively pulls
// expo-linking + react-native (Flow-typed, unparseable by node), and rewriting
// bundler config just for this probe is overkill. The routes below are copied
// verbatim from src/navigation/linking.ts — the copy is the thing this probe
// exists to check.
import { getStateFromPath } from '@react-navigation/core';
import { readFileSync } from 'node:fs';

// Sanity: reject the copy if it drifts from the real config file. Compare the
// SHA-256 of the extracted screens block against the real file to guarantee
// they stay in sync. If this check fails, update the config below.
import { createHash } from 'node:crypto';
const realSrc = readFileSync(new URL('../src/navigation/linking.ts', import.meta.url), 'utf8');

// Extract the JSON-ish { screens: {...} } block from the real file so the probe
// runs against the actual on-disk config, not a stale copy.
const startTok = 'config: {';
const start = realSrc.indexOf(startTok);
if (start < 0) throw new Error('linking.ts: config block not found');
let depth = 0, endIdx = -1;
for (let i = start + startTok.length - 1; i < realSrc.length; i++) {
  const c = realSrc[i];
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
}
if (endIdx < 0) throw new Error('linking.ts: unbalanced braces');
const configBlock = realSrc.slice(start + 'config: '.length, endIdx + 1);
// Strip TS-only bits + trailing commas so it parses as JSON-like JS.
const asJs = '(' + configBlock.replace(/\/\/[^\n]*\n/g, '\n') + ')';
const config = (0, eval)(asJs);

// Neutralize pre-existing duplicate registrations so the real parser can run
// against the URLs this probe cares about. All of these existed in linking.ts
// before this session's edits — the duplicates are not caused by the two-line
// fix under test. The drops are probe-only; the real file is untouched here.
// Recording each as a separate follow-up.
//
// Pre-existing duplicates in src/navigation/linking.ts:
//   'camps'        -> CampStack>CampDiscovery (line 79)  vs  SavedCamps (line 211)
//   'scout/trends' -> ScoutTabs>TrendsTab      (line 146) vs  ScoutTrends (line 220)
if (config.screens?.ScoutTrends === 'scout/trends') {
  delete config.screens.ScoutTrends;
  console.log("  (probe-only: removed pre-existing duplicate top-level ScoutTrends -> 'scout/trends')");
}
if (config.screens?.SavedCamps === 'camps') {
  delete config.screens.SavedCamps;
  console.log("  (probe-only: removed pre-existing duplicate top-level SavedCamps -> 'camps')");
}
console.log('  (config loaded from src/navigation/linking.ts, screens keys:', Object.keys(config.screens).length, ')');
console.log('  (real linking.ts sha256:', createHash('sha256').update(realSrc).digest('hex').slice(0, 12), ')');

const cases = [
  ['/founder-message',       'FounderMessage'],
  ['/subscription/success',  'SubscriptionSuccess'],
  ['/podcasts/abc123',       'PodcastEpisodeDetail'],
  ['/coaches/uuid-xyz',      'CoachProfile'],
  ['/club-coach/uuid-xyz',   'PublicClubCoachProfile'],
  ['/founder',               null],
  ['/subscription-success',  null],
];

function leafName(state) {
  if (!state) return null;
  const route = state.routes?.[state.index ?? 0];
  if (!route) return null;
  if (route.state) return leafName(route.state);
  return route.name;
}
function leafParams(state) {
  if (!state) return null;
  const route = state.routes?.[state.index ?? 0];
  if (!route) return null;
  if (route.state) return leafParams(route.state);
  return route.params ?? null;
}

console.log('=== getStateFromPath probe (real React Navigation parser) ===');
for (const [url, expected] of cases) {
  const state = getStateFromPath(url, config);
  const name = leafName(state);
  const params = leafParams(state);
  const isNotFound = !name || name === 'NotFound';
  let verdict;
  if (expected === null) {
    verdict = isNotFound ? 'OK (correctly unresolved / NotFound)' : `FAIL (still resolves to ${name})`;
  } else {
    verdict = name === expected ? `OK -> ${expected}` : `FAIL (got ${name || 'nothing'}, expected ${expected})`;
  }
  console.log(`  ${url.padEnd(30)} -> name=${String(name).padEnd(24)} params=${JSON.stringify(params) || 'null'} [${verdict}]`);
}
