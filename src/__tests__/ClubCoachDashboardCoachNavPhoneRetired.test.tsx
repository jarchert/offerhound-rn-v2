// ClubCoachDashboardCoachNavPhoneRetired.test.tsx — Group 3 #7 ROLE 2
//
// Regression guard: ClubCoachDashboardScreen must NOT mount the CoachNav
// phone bottom-bar overlay. Every render of CoachNav from this screen must
// be gated behind the wide-layout breakpoint so the wide sidebar path stays
// intact while the phone-bottom-bar mount is retired.
//
// This is a source-level assertion — it reads the ClubCoachDashboardScreen
// source file and confirms both mount sites are behind an `isWide` gate,
// not a bare `<CoachNav role="club_coach" />`. That gives us a low-noise
// regression signal without spinning up the whole dashboard render tree.

import * as fs from 'fs';
import * as path from 'path';

describe('ClubCoachDashboardScreen — CoachNav phone-bottom-bar mount retired (Group 3 #7 ROLE 2)', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens', 'club', 'ClubCoachDashboardScreen.tsx'),
    'utf8',
  );

  // Strip line comments first (they may contain stray `/*` sequences that
  // would otherwise start a spurious block-comment match), then block
  // comments (including JSX `{/* ... */}` blocks).
  const stripComments = (src: string) => {
    // Line comments only when `//` appears at start-of-line or after
    // whitespace — avoids matching `://` in URLs. Strips through EOL.
    let out = src.replace(/(^|\s)\/\/[^\n]*/g, '$1');
    // Block comments (non-greedy).
    out = out.replace(/\/\*[\s\S]*?\*\//g, '');
    return out;
  };
  const code = stripComments(source);

  it('no longer mounts <CoachNav /> unconditionally on phone', () => {
    // Retired pattern: bare `<CoachNav role="club_coach" />` sitting
    // directly under <TermsAcceptanceGate> (or any parent), NOT preceded by
    // an `isWide && ` guard. Every occurrence in real JSX (comments
    // already stripped) must have `&&` somewhere in the ~30 chars before it.
    const mountRe = /<CoachNav\s+role="club_coach"\s*\/>/g;
    let m: RegExpExecArray | null;
    let bareCount = 0;
    while ((m = mountRe.exec(code)) !== null) {
      const contextBefore = code.slice(Math.max(0, m.index - 30), m.index);
      // The gate must be `isWide && ` immediately before the JSX element.
      if (!/&&\s*$/.test(contextBefore)) bareCount++;
    }
    expect(bareCount).toBe(0);
  });

  it('wide-only mount is present (isWide gate) at both mount sites', () => {
    // The replacement wide-layout mount must AND against `isWide`. There
    // are two mount sites (loading/onboarding fallback + main dashboard),
    // and both must be gated.
    const gated = code.match(/\{isWide\s*&&\s*<CoachNav\s+role="club_coach"\s*\/>\}/g) || [];
    expect(gated.length).toBeGreaterThanOrEqual(2);
  });

  it('imports LG_BREAKPOINT from OwnerNav (breakpoint source of truth)', () => {
    // ClubCoach reuses OwnerNav's LG_BREAKPOINT export so Athlete + ClubCoach
    // share a single breakpoint constant.
    expect(source).toMatch(/import\s*\{\s*LG_BREAKPOINT\s*\}\s*from\s*['\"]@\/components\/OwnerNav['\"]/);
  });

  it('derives isWide from useWindowDimensions()', () => {
    expect(source).toMatch(/useWindowDimensions\(\)/);
    expect(source).toMatch(/const\s+isWide\s*=\s*width\s*>=\s*LG_BREAKPOINT/);
  });
});
