// OwnerNavGalleryTarget.test.tsx — Group 2 Bug 4
//
// Regression test: the OwnerNav "Gallery" item must navigate to the Gallery
// screen inside PublicProfileStack, NOT to PublicProfileStack's default
// initial route (PublicProfile) with no customUrl — that used to render
// "Profile Not Found" for every athlete who tapped the Gallery tab.
//
// Strategy:
//   Render OwnerNav in phone / bottom-nav layout, spy on navigation.navigate,
//   fire a press on the Gallery item, and assert the exact target/params.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Native / expo mocks ──────────────────────────────────────────────────────
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

// Force phone / bottom-nav layout regardless of the RN Jest default.
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

describe('OwnerNav — Gallery target (Group 2 Bug 4)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('navigates to PublicProfileStack -> Gallery when the Gallery item is tapped', async () => {
    const { findByText } = await render(<OwnerNav />);
    const galleryLabel = await findByText('Gallery');
    fireEvent.press(galleryLabel);

    // Must target the Gallery screen inside PublicProfileStack, not the
    // stack's default (PublicProfile with empty customUrl).
    expect(mockNavigate).toHaveBeenCalledWith(
      'PublicProfileStack',
      expect.objectContaining({ screen: 'Gallery' }),
    );
  });

  it('does not navigate with an empty PublicProfile target', async () => {
    const { findByText } = await render(<OwnerNav />);
    const galleryLabel = await findByText('Gallery');
    fireEvent.press(galleryLabel);

    // The old bug: navigate('PublicProfileStack', undefined) — assert we
    // never call the two-arg form with undefined params for this stack.
    const calls = mockNavigate.mock.calls.filter(
      ([route]) => route === 'PublicProfileStack',
    );
    for (const [, params] of calls) {
      expect(params).toBeDefined();
      expect(params).toEqual(expect.objectContaining({ screen: 'Gallery' }));
    }
  });
});
