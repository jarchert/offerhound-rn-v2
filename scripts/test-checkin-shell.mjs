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
