// CoachNavRoleProp.test.tsx — Group 3 #7 ROLE 2 (Club Coach) pre-existing TS bug fix.
//
// Prior to this pass, ClubCoachDashboardScreen mounted `<CoachNav role="club_coach" />`
// at two sites, but CoachNav did not declare a `role` prop — a pre-existing
// TypeScript error. The fix: expose `CoachNavProps` with an optional
// `role?: 'coach' | 'club_coach'` so both college-coach and club-coach mounts
// type-check without a @ts-ignore.
//
// The prop is currently informational (both roles get the same cross-app nav
// items). This test locks in:
//   (1) the `CoachNavProps` / `CoachNavRole` types are exported (compile-time),
//   (2) CoachNav accepts `role="club_coach"` without throwing at runtime,
//   (3) CoachNav still accepts *no* role prop (college-coach mount path).

import React from 'react';
import { render } from '@testing-library/react-native';

// Stub theme so the component doesn't blow up on style tokens.
jest.mock('@/lib/theme', () => ({
  colors: {
    card: '#111', border: '#222', primary: '#f00', primaryForeground: '#fff',
    mutedForeground: '#888', foreground: '#eee', background: '#000',
    foregroundSubtle: '#666',
  },
  typography: { fontFamily: { bodyMedium: 'System' }, fontSize: { sm: 12, xs: 10 } },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
  radius: { lg: 8, xl: 12 },
  shadows: { card: {} },
}));

// Stub AsyncStorage — CoachNav hydrates a persisted collapsed flag on mount.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

// Stub react-navigation surface — CoachNav reads current route + navigate.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useNavigationState: (selector: any) => selector({ index: 0, routes: [{ name: 'ClubCoachTabs' }] }),
}));

// Stub safe-area context.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Import AFTER mocks.
import { CoachNav, type CoachNavProps, type CoachNavRole } from '../components/CoachNav';

describe('CoachNav — optional role prop (Group 3 #7 ROLE 2 TS bug fix)', () => {
  it('accepts role="club_coach" without runtime error (was a pre-existing TS-only bug)', async () => {
    const { toJSON } = await render(<CoachNav role="club_coach" />);
    expect(toJSON()).toBeTruthy();
  });

  it('accepts role="coach" without runtime error', async () => {
    const { toJSON } = await render(<CoachNav role="coach" />);
    expect(toJSON()).toBeTruthy();
  });

  it('still accepts no role prop (backward compatible with college-coach mount path)', async () => {
    const { toJSON } = await render(<CoachNav />);
    expect(toJSON()).toBeTruthy();
  });

  it('exports CoachNavProps and CoachNavRole types (compile-time surface)', () => {
    // The types below only compile because they are exported. Runtime is a no-op.
    const props: CoachNavProps = { role: 'club_coach' };
    const role: CoachNavRole = 'coach';
    expect(props.role).toBe('club_coach');
    expect(role).toBe('coach');
  });
});
