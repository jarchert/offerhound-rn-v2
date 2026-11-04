import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/components/CampEvaluatorVoiceNotes.tsx', import.meta.url), 'utf8');
// The installed expo-audio iOS implementation defers player-pause session
// deactivation by 100 ms and checks players/playlists, but not active recorders.
// Model that native boundary while exercising the actual component's Record action.
async function capture(text, unmountMode = '') {
  const effects = []; let recorderReleased = false, playerReleased = false;
  let active = false, recording = false, stopAt = Infinity, captured = 0;
  const hooks = []; let index = 0;
  const slot = factory => { const i = index++; return hooks[i] ??= factory(); };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: initial => { const value = slot(() => ({ value: initial })); return [value.value, next => { value.value = typeof next === 'function' ? next(value.value) : next; }]; },
    useRef: initial => slot(() => ({ current: initial })),
    useEffect: effect => { effects.push(effect); },
  };
  const recorder = { get isRecording() { if (recorderReleased) throw Error('Recorder already released'); return recording; }, async prepareToRecordAsync() { active = true; }, record() { recording = true; }, getStatus: () => ({ durationMillis: 9600 }), async stop() { recording = false; }, uri: 'file:///synthetic.m4a' };
  const audio = {
    RecordingPresets: { HIGH_QUALITY: {} }, useAudioRecorder: () => { effects.push(() => () => { recorderReleased = true; recording = false; }); return recorder; },
    useAudioRecorderState: () => ({ isRecording: recording, durationMillis: 0 }),
    useAudioPlayer: (_source, options = {}) => { effects.push(() => () => { playerReleased = true; }); return { pause() { if (playerReleased) throw Error('Player already released'); if (!options.keepAudioSessionActive) stopAt = 100; } }; },
    useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0 }),
    requestRecordingPermissionsAsync: async () => ({ granted: true }),
    setAudioModeAsync: async () => {},
  };
  const imports = {
    react: { __esModule: true, default: react, ...react },
    'react-native': { Alert: {}, AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) }, Linking: {}, Text: 'Text', View: 'View', StyleSheet: { create: v => v } },
    'expo-audio': audio, '@react-navigation/native': { useIsFocused: () => true },
    'expo-file-system': { File: class {} },
    '@tanstack/react-query': { useQuery: args => ({ data: args.queryKey[0] === 'camp-voice-access' ? true : [] }), useQueryClient: () => ({}) },
    '@/hooks/useAuth': { useAuth: () => ({ user: { id: 'staff' } }) },
    '@/integrations/supabase/client': { supabase: {} }, '@/components/ui/Button': { Button: 'Button' },
    '@/lib/theme': { colors: {}, spacing: {} }, '@/lib/nativeCampVoice': { VOICE_LIMIT_MS: 120000 },
  };
  const exports = {};
  const code = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  vm.runInNewContext(code, { exports, require: name => { assert(name in imports, `Unexpected dependency ${name}`); return imports[name]; } });
  index = 0;
  const tree = exports.CampEvaluatorVoiceNotes({ campId: 'camp', enrollmentId: 'attendee', drill: 'forty_yard_dash' });
  const find = node => {
    if (!node || typeof node !== 'object') return null;
    if (node.props?.testID === 'camp-voice-record') return node;
    for (const child of node.children?.flat(Infinity) || []) { const result = find(child); if (result) return result; }
    return null;
  };
  const cleanups = effects.map(effect => effect()).filter(Boolean);
  const unmount = () => { cleanups.forEach(cleanup => cleanup()); assert(recorderReleased && playerReleased); return 'unmounted'; };
  if (unmountMode === 'idle') return unmount();
  const record = find(tree); assert(record, 'Actual component must expose Record');
  record.props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert(recording && active, `Native recording must begin: ${JSON.stringify(hooks.map(h => h?.value).filter(v => typeof v === 'string'))}`);
  if (unmountMode === 'recording') return unmount();
  for (let ms = 0; ms < 9600; ms += 10) {
    if (ms >= stopAt) active = false;
    if (active && recording) captured += 10;
  }
  return captured;
}
assert.equal(await capture(source), 9600, 'Preview pause must not truncate an active recording');
const unsafe = source.replace('useAudioPlayer(null, { keepAudioSessionActive: true })', 'useAudioPlayer(null)');
assert.notEqual(unsafe, source, 'Regression variant must remove the session protection');
assert.equal(await capture(unsafe), 100, 'Regression harness must reproduce the reported 0.1-second clip');
console.log('Voice session regression: PASS (actual Record action; modeled iOS 100-ms deactivation, protected 9.6-second capture)');

assert.equal(await capture(source, 'idle'), 'unmounted', 'Leaving the athlete without recording must not call released native objects');
assert.equal(await capture(source, 'recording'), 'unmounted', 'Active recording unmount relies on Expo release and safely removes local state');
const unsafeCleanup = source.replace('sub.remove();', 'sub.remove(); player.pause();');
assert.notEqual(unsafeCleanup, source);
await assert.rejects(capture(unsafeCleanup, 'idle'), /Player already released/, 'Regression variant must reproduce the reported cleanup crash');
console.log('Voice unmount regression: PASS (actual component cleanup; modeled Expo hook release order, idle and recording navigation, failing old pause reproduced)');
