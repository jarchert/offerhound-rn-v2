// src/__tests__/Layer2SpacingParity.test.tsx
//
// Layer 2 (component/layout parity) — spacing tokens must match MAIN's
// Tailwind conventions where we've explicitly aligned them.
//
// Enforces the two spacing fixes from tonight's Layer 2 review:
//
//   1. Button icon-label gap: 8px (matches MAIN's Tailwind `gap-2` on the
//      button flex container). Was previously 4px which read visibly
//      cramped between leftIcon/text/rightIcon.
//
//   2. AthleteSearchScreen results-column card gap: 12px (matches MAIN's
//      `gap-3` on the results grid). Was previously 8px which is denser
//      than MAIN and visually differs from the web app's card rhythm.
//
// These tests are structural (assert the exact numeric values on the
// StyleSheet objects), not visual — they will fail loudly if anyone
// changes the spacing token used, which is the desired parity guard.
//
// Related: LAYER2_PARITY_REPORT.md rows #3 and #8.

import { StyleSheet } from 'react-native';
import { spacing } from '@/lib/theme';

// Sanity-check the theme scale before we rely on it below. If someone ever
// changes spacing.sm or spacing.sm2 to a different pixel value, both these
// tests AND the sanity check below fire — three-layer parity guard.
describe('Theme spacing scale (Layer 2 parity anchor)', () => {
  it('spacing.sm equals 8px (matches Tailwind space-2)', () => {
    expect(spacing.sm).toBe(8);
  });
  it('spacing.sm2 equals 12px (matches Tailwind space-3)', () => {
    expect(spacing.sm2).toBe(12);
  });
});

describe('Layer 2 spacing parity — Button icon-label gap (8px, matches MAIN gap-2)', () => {
  // Re-import Button to pick up its StyleSheet in this test file's module
  // scope. jest.isolateModules avoids leaking cached theme values across
  // spec files.
  it('Button content style uses spacing.sm (8px) for icon-label gap', () => {
    // Extract the raw style object by rendering the internal stylesheet.
    // Button's style dict is created inline in the module; the reliable way
    // to introspect it is to re-read the source file and grep the token.
    // But the cleanest test is to render a Button with left+right icons and
    // walk the tree. Given RN's testing constraints, we instead read the
    // component's stylesheet indirectly by requiring the module fresh and
    // then evaluating the SPACING import against the source.
    //
    // The simplest structural assertion: the spacing token used for the
    // content style is spacing.sm (8), not spacing.xs (4). Any regression
    // that flips it back to spacing.xs would fail this test.
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../components/ui/Button.tsx'),
      'utf8',
    );
    // The regex is deliberately narrow: it matches the exact content style
    // definition we wrote, not any other gap-using property. If the style
    // block moves or is renamed, this fails loudly and we update the test.
    const match = src.match(/content:\s*\{[^}]*gap:\s*spacing\.(\w+)/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('sm');
    // Cross-check that spacing.sm resolves to the expected pixel value.
    expect(spacing.sm).toBe(8);
  });

  it('Button content style does NOT use spacing.xs (the pre-fix value)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../components/ui/Button.tsx'),
      'utf8',
    );
    // Regression guard: reject the old 4px value.
    expect(src).not.toMatch(/content:\s*\{[^}]*gap:\s*spacing\.xs/);
  });

  // Sanity that the StyleSheet.create-based style dict actually renders
  // with the expected numeric value at runtime — belt and suspenders in
  // case someone changes spacing.sm's numeric value.
  it('StyleSheet.create with { gap: spacing.sm } produces gap=8 at runtime', () => {
    const s = StyleSheet.create({ x: { gap: spacing.sm } });
    // Under both react-native-web and RN core, StyleSheet.flatten returns
    // the raw dict, so gap is the underlying number.
    expect(StyleSheet.flatten(s.x)).toEqual({ gap: 8 });
  });
});

describe('Layer 2 spacing parity — AthleteSearchScreen results column gap (12px, matches MAIN gap-3)', () => {
  it('resultsCol style uses spacing.sm2 (12px) for the card gap', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../screens/shared/AthleteSearchScreen.tsx'),
      'utf8',
    );
    const match = src.match(/resultsCol:\s*\{[^}]*gap:\s*spacing\.(\w+)/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('sm2');
    // Cross-check that spacing.sm2 resolves to 12.
    expect(spacing.sm2).toBe(12);
  });

  it('resultsCol style does NOT use spacing.sm (the pre-fix value)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../screens/shared/AthleteSearchScreen.tsx'),
      'utf8',
    );
    // Regression guard: reject the old 8px value.
    expect(src).not.toMatch(/resultsCol:\s*\{[^}]*gap:\s*spacing\.sm[^2]/);
  });

  it('StyleSheet.create with { gap: spacing.sm2 } produces gap=12 at runtime', () => {
    const s = StyleSheet.create({ x: { gap: spacing.sm2 } });
    expect(StyleSheet.flatten(s.x)).toEqual({ gap: 12 });
  });
});
