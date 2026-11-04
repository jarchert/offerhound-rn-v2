import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let keyboardVisible = false;
let activeRoute = 'CampMobileCheckin';
let hooks;
let stateIndex;
const react = {
  createElement: (...args) => args,
  useState: () => { hooks.push('state'); return [stateIndex++ === 0 ? activeRoute : keyboardVisible, () => {}]; },
  useEffect: () => { hooks.push('effect'); },
  useRef: value => { hooks.push('ref'); return { current: value }; },
};
function load(path, imports) {
  const exports = {};
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { exports, require(name) { assert(name in imports, name); return imports[name]; } });
  return exports;
}
const overlay = load('../src/components/FloatingAICoach.tsx', {
  react: { __esModule: true, default: react, ...react },
  'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: value => value }, Keyboard: {}, Animated: { Value: class {}, View: 'Animated.View' }, Easing: {} },
  'lucide-react-native': { Sparkles: 'Sparkles' },
  '@/navigation/navigationRef': { getCurrentRouteName: () => activeRoute, navigate: () => {} },
  '@/lib/theme': { colors: {}, spacing: { lg: 16 }, shadows: { gold: {} } },
});
let baseline;
for (const [keyboard, route, hidden] of [[false, 'CampMobileCheckin', false], [true, 'CampMobileCheckin', true], [false, 'CampMobileCheckin', false], [false, 'AICoach', true]]) {
  keyboardVisible = keyboard; activeRoute = route; hooks = []; stateIndex = 0;
  const rendered = overlay.FloatingAICoach();
  if (!baseline) baseline = hooks;
  assert.deepEqual(hooks, baseline, 'Keyboard and route changes must preserve hook order');
  assert.equal(rendered === null, hidden);
}
const notifications = load('../src/hooks/use-toast.ts', { 'react-native-toast-message': { __esModule: true, default: { show() {}, hide() {} } } });
const first = notifications.useToast();
for (let render = 0; render < 20; render++) {
  const next = notifications.useToast();
  assert.equal(next.toast, first.toast, 'Toast callback must not restart check-in subscriptions');
  assert.equal(next.dismiss, first.dismiss);
}
console.log('Check-in shell: PASS (keyboard/route hook order and stable notification callbacks)');

// Exercise the actual root component across auth transitions. Shared camp
// routes must not survive logout, and a cold public deep link is left intact.
let signedInUser = null;
let previousUserRef;
let rootEffects = [];
const rootReact = {
  createElement: (...args) => args,
  useRef: value => previousUserRef ??= { current: value },
  useEffect: fn => rootEffects.push(fn),
};
const resets = [];
const rootSource = fs.readFileSync(new URL('../src/navigation/RootNavigator.tsx', import.meta.url), 'utf8');
const rootImports = Object.fromEntries(ts.preProcessFile(rootSource).importedFiles.map(file => [file.fileName, { __esModule: true, default: 'Screen' }]));
Object.assign(rootImports, {
  react: { __esModule: true, default: rootReact, ...rootReact },
  'react-native': { ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', SafeAreaView: 'SafeAreaView', Text: 'Text', View: 'View' },
  '@react-navigation/native-stack': { createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Screen' }) },
  '@/contexts/AuthContext': { useAuth: () => ({ user: signedInUser, userRole: signedInUser ? 'coach' : null, isLoading: false }) },
  '@/navigation/navigationRef': { navigationRef: { isReady: () => true, resetRoot: state => resets.push(state) } },
  '@/hooks/useScoutOrganization': { useScoutOrganization: () => ({ data: null, isPending: false, isError: false }) },
  '@/lib/theme': { colors: {} },
});
const root = load('../src/navigation/RootNavigator.tsx', rootImports);
for (const [id, expectedResets] of [[null, 0], ['owner-a', 0], [null, 1], [null, 1], ['staff-b', 1], [null, 2]]) {
  signedInUser = id ? { id } : null; rootEffects = [];
  root.default(); rootEffects.forEach(effect => effect());
  assert.equal(resets.length, expectedResets, 'Ending an authenticated session must discard the shared camp route');
}
assert(resets.every(state => state.index === 0 && state.routes.length === 1 && state.routes[0].name === 'PublicTabs'));
console.log('Root logout reset: PASS (two independent sessions; cold public navigation preserved)');
