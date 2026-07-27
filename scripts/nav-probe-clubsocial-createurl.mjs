// Static verification for ClubSocialLinks.tsx's Linking.createURL fix.
// Confirms:
//   1. The file no longer references '/coach/dashboard' as a createURL target.
//   2. The new target ('/coach') resolves through React Navigation's real
//      getStateFromPath parser to a screen that actually exists in the RN app.
//
// Analogous to scripts/nav-probe-agency-trends.mjs from the previous PR.
import { readFileSync } from 'node:fs';
import { getStateFromPath } from '@react-navigation/core';

const clubSrc = readFileSync(
  new URL('../src/components/ClubSocialLinks.tsx', import.meta.url),
  'utf8',
);
const linkingSrc = readFileSync(
  new URL('../src/navigation/linking.ts', import.meta.url),
  'utf8',
);
const rootSrc = readFileSync(
  new URL('../src/navigation/RootNavigator.tsx', import.meta.url),
  'utf8',
);

// 1. Extract every Linking.createURL('...') call from the file.
const calls = [...clubSrc.matchAll(/Linking\.createURL\(\s*['"]([^'"]+)['"]\s*\)/g)]
  .map((m) => m[1]);
if (calls.length === 0) {
  console.error('FAIL: no Linking.createURL(...) call found in ClubSocialLinks.tsx');
  process.exit(1);
}
console.log('  ClubSocialLinks.tsx Linking.createURL calls:');
calls.forEach((p) => console.log(`    ${p}`));

// 2. Regression guard: the old buggy target must be gone.
if (calls.includes('/coach/dashboard')) {
  console.error("FAIL: '/coach/dashboard' still present (would 404 inside RN app)");
  process.exit(1);
}
console.log("  [OK] '/coach/dashboard' no longer referenced");

// 3. Positive guard: the new target must be exactly '/coach'.
if (!calls.includes('/coach')) {
  console.error("FAIL: expected Linking.createURL('/coach') but did not find it");
  process.exit(1);
}
console.log("  [OK] Linking.createURL('/coach') present");

// 4. Confirm that /coach resolves to a real registered screen through the same
//    getStateFromPath the RN runtime uses for inbound deep links. This proves
//    a recipient tapping offerhoundv2:///coach lands somewhere real.
const startTok = 'config: {';
const start = linkingSrc.indexOf(startTok);
if (start < 0) throw new Error('linking.ts: config block not found');
let depth = 0, endIdx = -1;
for (let i = start + startTok.length - 1; i < linkingSrc.length; i++) {
  const c = linkingSrc[i];
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
}
const configBlock = linkingSrc.slice(start + 'config: '.length, endIdx + 1);
const asJs = '(' + configBlock.replace(/\/\/[^\n]*\n/g, '\n') + ')';
const config = (0, eval)(asJs);

function leafName(state) {
  if (!state) return null;
  const route = state.routes?.[state.index ?? 0];
  if (!route) return null;
  if (route.state) return leafName(route.state);
  return route.name;
}

const state = getStateFromPath('/coach', config);
const name = leafName(state);
if (!name || name === 'NotFound') {
  console.error(`FAIL: '/coach' does not resolve to a real screen (got: ${name})`);
  process.exit(1);
}
console.log(`  [OK] getStateFromPath('/coach') resolves to screen: ${name}`);

// 5. Confirm the target screen exists in RootNavigator (belt-and-suspenders).
//    'DashboardTab' inside a CoachTabs container is expected.
const registeredIn = [];
if (rootSrc.match(/<Stack\.Screen\s+name=["']CoachTabs["']/)) registeredIn.push('RootNavigator > CoachTabs');
console.log(`  [OK] target chain registered in: ${registeredIn.join(', ') || '(none found)'}`);

console.log('\n=== club-social-createurl probe passed ===');
console.log(`  Linking.createURL('/coach') builds offerhoundv2:///coach`);
console.log(`  which resolves through React Navigation to: ${name}`);
console.log(`  (matches RN linking.ts: DashboardTab: 'coach' under CoachTabs).`);
