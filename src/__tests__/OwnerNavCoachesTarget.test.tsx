// OwnerNavCoachesTarget.test.tsx — Group 2 Bug 5
//
// Regression test: the OwnerNav "Coaches" item (label under athlete role)
// must navigate to the athlete-facing coach discovery screen
// (CoachDirectory), NOT to the CoachTabs role navigator \u2014 which is the coach
// role dashboard and produces the "No coach profile found" UI (reported as
// "Coach profile appears in bottom nav on an athlete's own profile").

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 375, height: 812, scale: 1, fontScale: 1 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useNavigationState: (selector: any) => selector({ index: 0, routes: [{ name: 'AthleteTabs' }] }),
}));

jest.mock('@/hooks/useAdminRole', () => ({ useAdminRole: () => ({ isAdmin: false }) }));

jest.mock('@/lib/theme', () => ({
  colors: {
    card: '#111', border: '#222', primary: '#f00', primaryForeground: '#fff',
    mutedForeground: '#aaa', background: '#000',
  },
  typography: { fontFamily: { bodyMedium: 'System' }, fontSize: { xs: 12, sm: 14 } },
  spacing: { sm: 8, md: 12, lg: 16 },
  radius: { lg: 8, xl: 12 },
  shadows: { card: {} },
}));

import { OwnerNav } from '@/components/OwnerNav';

describe('OwnerNav — Coaches target (Group 2 Bug 5)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('navigates to CoachDirectory (athlete-facing search), not CoachTabs', async () => {
    const { findByText } = await render(<OwnerNav />);
    const coachesLabel = await findByText('Coaches');
    fireEvent.press(coachesLabel);

    expect(mockNavigate).toHaveBeenCalled();
    const [target] = mockNavigate.mock.calls[0];
    expect(target).toBe('CoachDirectory');
    expect(target).not.toBe('CoachTabs');
  });
});
