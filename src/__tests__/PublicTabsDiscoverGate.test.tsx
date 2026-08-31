// PublicTabsDiscoverGate.test.tsx — Group 4 #8
//
// Regression test: the "Discover" tab must be absent from PublicTabs when the
// current session is unauthenticated (the tab itself is removed from the tab
// bar, not just its content). Implementation: src/navigation/stacks/PublicTabs.tsx.
//
// Strategy:
//   Replace @react-navigation/bottom-tabs with a lightweight stub whose
//   Navigator renders every registered Tab.Screen name as a plain <Text>.
//   That gives us a deterministic view of which tabs the module registered
//   without depending on the real bottom-tab renderer, react-native-screens,
//   or any of its native deps. The auth context is mocked and toggled per test.

import React from 'react';
import { render } from '@testing-library/react-native';

// ─── Bottom-tab navigator stub ───────────────────────────────────────────────
jest.mock('@react-navigation/bottom-tabs', () => {
  const R = require('react');
  const { View, Text } = require('react-native');
  function collectScreens(children: any): Array<{ name: string; title?: string }> {
    const out: Array<{ name: string; title?: string }> = [];
    R.Children.forEach(children, (child: any) => {
      if (!child) return;
      const name = child?.props?.name;
      const title = child?.props?.options?.title;
      if (typeof name === 'string') out.push({ name, title });
    });
    return out;
  }
  function Navigator({ children }: any) {
    const screens = collectScreens(children);
    return R.createElement(
      View,
      { testID: 'tab-bar' },
      screens.map(s =>
        R.createElement(
          Text,
          { key: s.name, testID: `tab-${s.name}` },
          s.title ?? s.name,
        ),
      ),
    );
  }
  function Screen(_: any) { return null; }
  return {
    createBottomTabNavigator: () => ({ Navigator, Screen }),
  };
});

// ─── Theme constants used by PublicTabs (avoid heavy import) ─────────────────
jest.mock('@/lib/theme', () => ({
  colors: { background: '#000', border: '#111', primary: '#f00', foregroundSubtle: '#888' },
  typography: { fontFamily: { bodyMedium: 'System' } },
}));

// ─── Stub the tab screens (their internals are irrelevant here) ──────────────
jest.mock('@/screens/auth/LandingScreen', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View) };
});
jest.mock('@/screens/auth/SignInScreen', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View) };
});
jest.mock('@/screens/shared/PublicDiscoverScreen', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View) };
});
jest.mock('@/screens/influencer/PodcastScreen', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View) };
});
jest.mock('@/screens/shared/SportPickerScreen', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View) };
});

// ─── Auth mock (mutable per test) ────────────────────────────────────────────
const authState: { isAuthenticated: boolean } = { isAuthenticated: false };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.isAuthenticated ? { id: 'u1' } : null,
    userRole: null,
    isLoading: false,
    isAuthenticated: authState.isAuthenticated,
  }),
}));

// Import AFTER all mocks
import PublicTabs from '../navigation/stacks/PublicTabs';

describe('PublicTabs — Discover tab auth gate (Group 4 #8)', () => {
  it('hides the Discover tab when unauthenticated', async () => {
    authState.isAuthenticated = false;
    const { queryByTestId } = await render(<PublicTabs />);
    // Tab bar rendered
    expect(queryByTestId('tab-bar')).toBeTruthy();
    // Other tabs present
    expect(queryByTestId('tab-LandingTab')).toBeTruthy();
    expect(queryByTestId('tab-PodcastsTab')).toBeTruthy();
    expect(queryByTestId('tab-AccountTab')).toBeTruthy();
    // Discover tab absent
    expect(queryByTestId('tab-DiscoverTab')).toBeNull();
  });

  it('renders the Discover tab when authenticated', async () => {
    authState.isAuthenticated = true;
    const { queryByTestId } = await render(<PublicTabs />);
    expect(queryByTestId('tab-bar')).toBeTruthy();
    expect(queryByTestId('tab-DiscoverTab')).toBeTruthy();
  });
});
