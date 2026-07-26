// Static verification that AgencyDashboardScreen's Trends button now targets a
// screen name that (a) exists in the root navigator and (b) has a linking path
// registration that matches Lovable MAIN's /scout/trends route.
//
// We can't spin up a real Metro/simulator here, so this probe traces the
// navigation call statically: it reads the source of AgencyDashboardScreen,
// extracts the Trends-button onPress body, and confirms the target screen
// name resolves in both RootNavigator.tsx and linking.ts.
import { readFileSync } from 'node:fs';

const agencySrc = readFileSync(
  new URL('../src/screens/agency/AgencyDashboardScreen.tsx', import.meta.url),
  'utf8',
);
const rootSrc = readFileSync(
  new URL('../src/navigation/RootNavigator.tsx', import.meta.url),
  'utf8',
);
const linkingSrc = readFileSync(
  new URL('../src/navigation/linking.ts', import.meta.url),
  'utf8',
);

// 1. Extract the Trends button's onPress from AgencyDashboardScreen. Locate
//    the last <Button> tag before the literal `Trends` label, then walk back
//    to find its onPress attribute.
const trendsIdx = agencySrc.indexOf('>\n              Trends\n            </Button>');
let labelIdx = trendsIdx;
if (labelIdx < 0) {
  // Fallback: find any occurrence of `>Trends<` or `>\s*Trends\s*<`.
  const flex = agencySrc.match(/>\s*Trends\s*<\/Button>/);
  labelIdx = flex ? flex.index : -1;
}
if (labelIdx < 0) {
  console.error('FAIL: could not find a >Trends</Button> label in AgencyDashboardScreen');
  process.exit(1);
}
// Slice back to the nearest preceding <Button tag.
const preceding = agencySrc.slice(0, labelIdx);
const btnOpen = preceding.lastIndexOf('<Button');
if (btnOpen < 0) {
  console.error('FAIL: could not find the <Button opening tag for Trends');
  process.exit(1);
}
const btnBlock = agencySrc.slice(btnOpen, labelIdx + 200);
const onPressLineMatch = btnBlock.match(/onPress=\{[^}]*\}/);
if (!onPressLineMatch) {
  console.error('FAIL: Trends button has no onPress');
  process.exit(1);
}
const onPressLine = onPressLineMatch[0];
console.log('  Trends button onPress:');
console.log('    ' + onPressLine);

// 2. Assert it no longer targets the removed TrendsTab.
if (/TrendsTab/.test(onPressLine)) {
  console.error("FAIL: Trends button still references 'TrendsTab' (should target 'ScoutTrends' now)");
  process.exit(1);
}
console.log("  [OK] onPress no longer references 'TrendsTab'");

// 3. Extract the new target screen name.
const targetMatch = onPressLine.match(/navigate\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/);
if (!targetMatch) {
  console.error('FAIL: could not parse the target screen name out of the onPress body');
  process.exit(1);
}
const target = targetMatch[1];
console.log(`  [OK] onPress calls navigate('${target}', ...)`);

// 4. Confirm `${target}` is declared as a <Stack.Screen> in RootNavigator.
const rootScreenPattern = new RegExp(
  `<Stack\\.Screen\\s+name=["']${target}["']\\s+component=`,
);
if (!rootScreenPattern.test(rootSrc)) {
  console.error(`FAIL: RootNavigator.tsx does not register a <Stack.Screen name="${target}">`);
  process.exit(1);
}
console.log(`  [OK] RootNavigator.tsx registers <Stack.Screen name="${target}">`);

// 5. Confirm the same target has a linking path in linking.ts.
const linkingPattern = new RegExp(
  `\\b${target}\\s*:\\s*['"]([^'"]+)['"]`,
);
const linkingMatch = linkingSrc.match(linkingPattern);
if (!linkingMatch) {
  console.error(`FAIL: linking.ts does not map ${target} to any path`);
  process.exit(1);
}
console.log(`  [OK] linking.ts maps ${target} -> '${linkingMatch[1]}'`);

// 6. Sanity check the linking path against Lovable MAIN's expectation.
if (target === 'ScoutTrends' && linkingMatch[1] !== 'scout/trends') {
  console.error(
    `FAIL: expected ScoutTrends -> 'scout/trends' (MAIN /scout/trends), got '${linkingMatch[1]}'`,
  );
  process.exit(1);
}
console.log(`  [OK] path matches Lovable MAIN's /scout/trends route`);

console.log('\n=== agency-trends-nav probe passed ===');
console.log(`  Trends button in AgencyDashboardScreen now navigates to '${target}',`);
console.log(`  a registered top-level screen at path '${linkingMatch[1]}'`);
console.log(`  (matches MAIN AnimatedRoutes.tsx line 196: /scout/trends -> <ScoutTrends />).`);
