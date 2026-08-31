// DashboardScreenOwnerNavPhoneRetired.test.tsx — Group 3 #7 (Option C, variant b)
//
// Regression guard: DashboardScreen must NOT mount the OwnerNav phone
// bottom-bar overlay. Every render of OwnerNav from this screen must be
// gated behind the wide-layout breakpoint so the wide sidebar path stays
// intact while the phone-bottom-bar mount is retired.
//
// This is a source-level assertion — it reads the DashboardScreen source
// file and confirms the mount site is behind an `isWide` gate, not a bare
// `{isOwnerView && <OwnerNav />}`. That gives us a low-noise regression
// signal without spinning up the whole dashboard render tree.

import * as fs from 'fs';
import * as path from 'path';

describe('DashboardScreen — OwnerNav phone-bottom-bar mount retired (Group 3 #7)', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens', 'shared', 'DashboardScreen.tsx'),
    'utf8',
  );

  it('no longer mounts <OwnerNav /> unconditionally on phone', () => {
    // The retired pattern was: `{isOwnerView && <OwnerNav />}`. It must be
    // gone from the source — the wide-only replacement uses `isWide` too.
    const retiredPatterns = [
      /\{isOwnerView\s*&&\s*<OwnerNav\s*\/>\}/,
      /\{isOwnerView\s*&&\s*<OwnerNav\s*><\/OwnerNav>\}/,
    ];
    for (const p of retiredPatterns) {
      expect(source).not.toMatch(p);
    }
  });

  it('wide-only mount is present (isWide gate)', () => {
    // The replacement wide-layout mount must AND against `isWide`.
    expect(source).toMatch(/isOwnerView\s*&&\s*isWide\s*&&\s*<OwnerNav\s*\/>/);
  });

  it('imports LG_BREAKPOINT from OwnerNav (breakpoint source of truth)', () => {
    expect(source).toMatch(/OwnerNav,\s*LG_BREAKPOINT/);
  });
});
