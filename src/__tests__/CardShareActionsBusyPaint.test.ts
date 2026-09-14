/**
 * CardShareActions.withCapture() must yield one InteractionManager tick
 * between setBusy(true) and captureCardImage() so the loading indicator
 * paints on the triggering button (PNG / JPEG / Send card) before the
 * native view-shot bridge kicks in.
 *
 * A full functional test would need to mock react-native-view-shot,
 * expo-file-system, expo-sharing, react-native-safe-area-context, and
 * a small mountain of ui/* atoms. That's disproportionate to the fix
 * (one added `await`). Instead, this test does a text-based structural
 * assertion on the module source: after busy is flipped true we must
 * yield via InteractionManager BEFORE calling captureCardImage. If a
 * future refactor drops the yield, this test fails and forces the
 * reviewer to re-evaluate the paint-before-capture guarantee.
 *
 * Build 124/96 follow-up (T1.3 / T2.D).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '../components/CardShareActions.tsx'),
  'utf8',
);

describe('CardShareActions — view-shot busy-paint guarantee', () => {
  it('imports InteractionManager from react-native', () => {
    expect(SRC).toMatch(/from 'react-native'/);
    // Must be imported alongside View / Text / StyleSheet, not shadowed.
    expect(SRC).toMatch(/InteractionManager/);
    const importLine = SRC.match(/import\s*\{[^}]*\}\s*from\s*'react-native'/);
    expect(importLine).not.toBeNull();
    expect(importLine![0]).toMatch(/InteractionManager/);
  });

  it('yields via InteractionManager.runAfterInteractions inside withCapture', () => {
    // Locate the withCapture function body.
    const bodyStart = SRC.indexOf('async function withCapture');
    expect(bodyStart).toBeGreaterThan(-1);
    // Grab a generous slice through the closing brace of the function.
    const slice = SRC.slice(bodyStart, bodyStart + 1500);
    expect(slice).toMatch(/InteractionManager\.runAfterInteractions/);
  });

  it('yields AFTER setBusy(true) and BEFORE captureCardImage(...)', () => {
    const bodyStart = SRC.indexOf('async function withCapture');
    const slice = SRC.slice(bodyStart, bodyStart + 1500);

    const setBusyIdx = slice.indexOf('setBusy(true)');
    const yieldIdx = slice.indexOf('InteractionManager.runAfterInteractions');
    const captureIdx = slice.indexOf('captureCardImage(');

    expect(setBusyIdx).toBeGreaterThan(-1);
    expect(yieldIdx).toBeGreaterThan(-1);
    expect(captureIdx).toBeGreaterThan(-1);

    // Ordering: setBusy(true) → InteractionManager yield → captureCardImage
    expect(yieldIdx).toBeGreaterThan(setBusyIdx);
    expect(captureIdx).toBeGreaterThan(yieldIdx);
  });

  it('the yield is awaited (not fire-and-forget)', () => {
    const bodyStart = SRC.indexOf('async function withCapture');
    const slice = SRC.slice(bodyStart, bodyStart + 1500);
    // The line kicking off runAfterInteractions must be preceded by `await`.
    expect(slice).toMatch(
      /await\s+new\s+Promise[^;]*InteractionManager\.runAfterInteractions/,
    );
  });
});
