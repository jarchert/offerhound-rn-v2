#!/usr/bin/env node
/**
 * Static nav-trace verification for CampManagerDashboard.tsx.
 *
 * Purpose: after replacing three broken Linking.openURL('/coach/camps/:id/...'
 * and '/camps/:id/leaderboard') calls with nav.navigate('CampStack',
 * { screen: '...', params: { campId } }) jumps, confirm:
 *   1. All three target screen names exist in CampStack.
 *   2. All three target screens accept a { campId: string } route param
 *      (matches how the component supplies opsCamp.id).
 *   3. The old broken Linking.openURL strings are gone from the component.
 *   4. useNavigation is imported.
 *   5. Linking import is removed once it's no longer needed.
 *
 * Same style as scripts/nav-probe-clubsocial-createurl.mjs and
 * scripts/nav-probe-agency-trends.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COMPONENT = path.join(ROOT, 'src/components/CampManagerDashboard.tsx');
const STACK     = path.join(ROOT, 'src/navigation/stacks/CampStack.tsx');
const CHECKIN   = path.join(ROOT, 'src/screens/camps/CampMobileCheckinScreen.tsx');
const EVAL      = path.join(ROOT, 'src/screens/camps/CampEvaluatorScoringScreen.tsx');
const LEADERBRD = path.join(ROOT, 'src/screens/camps/CampLiveLeaderboardScreen.tsx');

const results = [];
function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail });
  const tag = cond ? 'OK  ' : 'FAIL';
  console.log(`  [${tag}] ${name}${detail ? '  -- ' + detail : ''}`);
}

const compSrc  = fs.readFileSync(COMPONENT, 'utf8');
const stackSrc = fs.readFileSync(STACK, 'utf8');
const checkSrc = fs.readFileSync(CHECKIN, 'utf8');
const evalSrc  = fs.readFileSync(EVAL, 'utf8');
const leadSrc  = fs.readFileSync(LEADERBRD, 'utf8');

console.log('=== nav-trace probe: CampManagerDashboard.tsx ===');

// 1. Old broken Linking.openURL for checkin/evaluate/leaderboard must be gone.
check(
  "component no longer calls Linking.openURL('/coach/camps/.../checkin')",
  !/Linking\.openURL\(`\/coach\/camps\/\$\{[^}]+\}\/checkin`\)/.test(compSrc),
);
check(
  "component no longer calls Linking.openURL('/coach/camps/.../evaluate')",
  !/Linking\.openURL\(`\/coach\/camps\/\$\{[^}]+\}\/evaluate`\)/.test(compSrc),
);
check(
  "component no longer calls Linking.openURL('/camps/.../leaderboard')",
  !/Linking\.openURL\(`\/camps\/\$\{[^}]+\}\/leaderboard`\)/.test(compSrc),
);

// 2. New nav.navigate calls in place, targeting CampStack -> right screens.
check(
  "component navigates via CampStack -> CampMobileCheckin with { campId }",
  /nav\.navigate\(\s*['"]CampStack['"][^)]*screen:\s*['"]CampMobileCheckin['"][^)]*params:\s*\{\s*campId:\s*opsCamp\.id\s*\}/.test(compSrc),
);
check(
  "component navigates via CampStack -> CampEvaluatorScoring with { campId }",
  /nav\.navigate\(\s*['"]CampStack['"][^)]*screen:\s*['"]CampEvaluatorScoring['"][^)]*params:\s*\{\s*campId:\s*opsCamp\.id\s*\}/.test(compSrc),
);
check(
  "component navigates via CampStack -> CampLeaderboard with { campId }",
  /nav\.navigate\(\s*['"]CampStack['"][^)]*screen:\s*['"]CampLeaderboard['"][^)]*params:\s*\{\s*campId:\s*opsCamp\.id\s*\}/.test(compSrc),
);

// 3. useNavigation imported + hook installed.
check(
  "useNavigation imported from @react-navigation/native",
  /import\s*\{[^}]*\buseNavigation\b[^}]*\}\s*from\s*['"]@react-navigation\/native['"]/.test(compSrc),
);
check(
  "useNavigation hook installed inside the component",
  /const\s+nav\s*=\s*useNavigation\s*<[^>]*>\s*\(\s*\)/.test(compSrc),
);

// 4. Linking import removed now that no Linking.* call remains in this file.
check(
  "Linking import removed from react-native import line (dead symbol cleanup)",
  !/import\s*\{[^}]*\bLinking\b[^}]*\}\s*from\s*['"]react-native['"]/.test(compSrc),
);
check(
  "no Linking.* usage anywhere in the component body",
  !/\bLinking\.[A-Za-z]/.test(compSrc),
);

// 5. CampStack registers all three target screens.
check(
  "CampStack registers 'CampMobileCheckin' screen",
  /name=['"]CampMobileCheckin['"]/.test(stackSrc),
);
check(
  "CampStack registers 'CampEvaluatorScoring' screen",
  /name=['"]CampEvaluatorScoring['"]/.test(stackSrc),
);
check(
  "CampStack registers 'CampLeaderboard' screen",
  /name=['"]CampLeaderboard['"]/.test(stackSrc),
);

// 6. All three target screens accept { campId } as route param (real prop shape).
check(
  "CampMobileCheckinScreen reads route.params?.campId",
  /route\.params\?\.campId/.test(checkSrc)
    || /RouteProp<CampStackParamList,\s*['"]CampMobileCheckin['"]>/.test(checkSrc),
);
check(
  "CampEvaluatorScoringScreen reads route.params?.campId",
  /route\.params\?\.campId/.test(evalSrc)
    || /RouteProp<CampStackParamList,\s*['"]CampEvaluatorScoring['"]>/.test(evalSrc),
);
check(
  "CampLiveLeaderboardScreen reads route.params?.campId",
  /route\.params\?\.campId/.test(leadSrc)
    || /RouteProp<CampStackParamList,\s*['"]CampLeaderboard['"]>/.test(leadSrc),
);

// 7. CampStackParamList declares { campId: string } for all three screens.
check(
  "CampStackParamList declares CampMobileCheckin: { campId: string }",
  /CampMobileCheckin:\s*\{\s*campId:\s*string\s*\}/.test(stackSrc),
);
check(
  "CampStackParamList declares CampEvaluatorScoring: { campId: string }",
  /CampEvaluatorScoring:\s*\{\s*campId:\s*string\s*\}/.test(stackSrc),
);
check(
  "CampStackParamList declares CampLeaderboard: { campId: string }",
  /CampLeaderboard:\s*\{\s*campId:\s*string\s*\}/.test(stackSrc),
);

const failed = results.filter(r => !r.ok);
console.log('');
console.log(`=== summary: ${results.length - failed.length}/${results.length} checks passed ===`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
process.exit(0);
