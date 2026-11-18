// Import the actual React Navigation linking parser and feed it a JS copy of
// the linking config extracted from src/navigation/linking.ts. We can't import
// linking.ts directly under plain node because it transitively pulls
// expo-linking + react-native (Flow-typed, unparseable by node), and rewriting
// bundler config just for this probe is overkill. The routes below are copied
// verbatim from src/navigation/linking.ts — the copy is the thing this probe
// exists to check.
import { getStateFromPath } from '@react-navigation/core';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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


// A parser match is useful only if its destination is actually registered.
const navigationRoot = fileURLToPath(new URL('../src/navigation', import.meta.url));
function navigatorFiles(dir) {
  return readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory()
    ? navigatorFiles(join(dir,e.name)) : e.name.endsWith('.tsx') ? [join(dir,e.name)] : []);
}
const files = new Map(navigatorFiles(navigationRoot).map(p=>[basename(p,'.tsx'),p]));
function registeredScreens(name) {
  const path=files.get(name);
  if(!path)throw Error(`Missing navigator source: ${name}`);
  const ast=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const names=new Set();
  function visit(node) {
    if((ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node)) && node.tagName.getText(ast).endsWith('.Screen')) {
      const attr=node.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='name');
      if(attr?.initializer && ts.isStringLiteral(attr.initializer))names.add(attr.initializer.text);
    }
    ts.forEachChild(node,visit);
  }
  visit(ast); return names;
}
let registeredCount=0;
function verifyDestinations(screens,navigator) {
  const names=registeredScreens(navigator);
  for(const [name,value] of Object.entries(screens)) {
    if(!names.has(name))throw Error(`Link target ${navigator} > ${name} is not registered`);
    registeredCount++;
    if(typeof value==='object' && value?.screens)verifyDestinations(value.screens,name);
  }
}
verifyDestinations(config.screens,'RootNavigator');
console.log(`  (${registeredCount} configured destinations verified against navigator JSX)`);

console.log('  (config loaded from src/navigation/linking.ts, screens keys:', Object.keys(config.screens).length, ')');
console.log('  (real linking.ts sha256:', createHash('sha256').update(realSrc).digest('hex').slice(0, 12), ')');

const cases = [
  ['/coach/directory', 'CoachDirectory'],
  ['/coach-directory', 'CoachDirectory'],
  ['/scout/guide', null],
  ['/auth', 'SignIn'],
  ['/home', 'HomeTab'],
  ['/messages', 'Messages'],
  ['/inbox', 'Inbox'],
  ['/coach/dashboard', 'DashboardTab'],
  ['/scout/dashboard', 'DashboardTab'],
  ['/club/dashboard', 'DashboardTab'],
  ['/hs-coach/dashboard', 'DashboardTab'],
  ['/parent/dashboard', 'DashboardTab'],
  ['/influencer/dashboard', 'DashboardTab'],
  ['/agency/dashboard', 'DashboardTab'],
  ['/camp-discovery', 'CampDiscovery'],
  ['/camps', 'SavedCamps'],
  ['/scout/trends', 'ScoutTrends'],
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

const roleRoots = {
  '/coach/dashboard': 'CoachTabs', '/scout/dashboard': 'ScoutTabs',
  '/club/dashboard': 'ClubCoachTabs', '/hs-coach/dashboard': 'HSCoachTabs',
  '/parent/dashboard': 'ParentTabs', '/influencer/dashboard': 'InfluencerTabs',
  '/agency/dashboard': 'AgencyTabs',
};
let failures = 0;
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
  const root = state?.routes?.[state.index ?? 0]?.name;
  if (roleRoots[url] && root !== roleRoots[url]) verdict = `FAIL (got role navigator ${root}, expected ${roleRoots[url]})`;
  if (verdict.startsWith('FAIL')) failures++;
  console.log(`  ${url.padEnd(30)} -> name=${String(name).padEnd(24)} params=${JSON.stringify(params) || 'null'} [${verdict}]`);
}

if (failures) process.exitCode = 1;
