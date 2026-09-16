// AthleteTabsMerged.test.tsx — Group 3 #7 (Option C, variant b)
//
// Verifies that AthleteTabs is the merged single-tab-bar navigator for the
// athlete role: every real cross-app verb that used to live behind the phone
// OwnerNav overlay (Coaches, Camps) is now a first-class Tab.Screen in this
// navigator, alongside the pre-existing Home / Matches / Messages / Letters /
// Profile tabs.
//
// Strategy: same lightweight bottom-tabs stub pattern as
// PublicTabsDiscoverGate.test.tsx — reflect over the registered Tab.Screen
// names without pulling react-native-screens or the real navigator.

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
  function Navigator({ children, tabBar }: any) {
    const screens = collectScreens(children);
    // Expose whether a custom tabBar renderer was supplied so tests can
    // lock in that AthleteTabs wires the CompactGridTabBar.
    const hasCustomTabBar = typeof tabBar === 'function' ? 'yes' : 'no';
    return R.createElement(
      View,
      { testID: 'tab-bar', accessibilityLabel: `custom-tabbar-${hasCustomTabBar}` },
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

// ─── Theme (used indirectly by roleTabScreenOptions) ─────────────────────────
jest.mock('@/lib/theme', () => ({
  colors: { background: '#000', border: '#111', primary: '#f00', foregroundSubtle: '#888', foreground: '#fff' },
  typography: { fontFamily: { bodyMedium: 'System', bodySemibold: 'System' }, fontSize: { md: 14 } },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
}));

// ─── Stub every screen the navigator imports ─────────────────────────────────
const stub = () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View) };
};
jest.mock('@/screens/shared/DashboardScreen', () => stub());
jest.mock('@/screens/athlete/AthleteMatchesScreen', () => stub());
jest.mock('@/screens/athlete/LettersScreen', () => stub());
jest.mock('@/screens/shared/MessagesScreen', () => stub());
jest.mock('@/screens/shared/ProfileScreen', () => stub());
jest.mock('@/screens/shared/CoachDirectoryScreen', () => stub());
jest.mock('@/navigation/stacks/CampStack', () => stub());

jest.mock('@/components/ParentAthleteSwitcher', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { ParentAthleteSwitcher: () => R.createElement(View) };
});

// Stub the CompactGridTabBar so this test stays focused on Screen wiring,
// not on the tab-bar renderer (which has its own dedicated test file).
jest.mock('@/components/CompactGridTabBar', () => {
  const R = require('react');
  const { View } = require('react-native');
  return {
    CompactGridTabBar: () => R.createElement(View, { testID: 'stub-grid-bar' }),
  };
});

jest.mock('@/navigation/role/roleTabScreenOptions', () => ({
  roleTabScreenOptions: {},
}));

// Import AFTER all mocks
import AthleteTabs from '../navigation/role/AthleteTabs';

describe('AthleteTabs — merged single-tab-bar (Group 3 #7)', () => {
  it('registers every pre-existing athlete tab', async () => {
    const { queryByTestId } = await render(<AthleteTabs />);
    expect(queryByTestId('tab-bar')).toBeTruthy();
    expect(queryByTestId('tab-HomeTab')).toBeTruthy();
    expect(queryByTestId('tab-MatchesTab')).toBeTruthy();
    expect(queryByTestId('tab-MessagesTab')).toBeTruthy();
    expect(queryByTestId('tab-LettersTab')).toBeTruthy();
    expect(queryByTestId('tab-ProfileTab')).toBeTruthy();
  });

  it('lifts CoachesTab and CampsTab into the tab bar (was OwnerNav phone overlay)', async () => {
    const { queryByTestId, getByTestId } = await render(<AthleteTabs />);
    // Real cross-app verbs previously reached via `navigation.navigate('CoachDirectory')`
    // and `navigation.navigate('CampStack')` from OwnerNav on phone.
    expect(queryByTestId('tab-CoachesTab')).toBeTruthy();
    expect(queryByTestId('tab-CampsTab')).toBeTruthy();
    // Titles are user-facing labels (roleTabScreenOptions is stubbed empty).
    expect(getByTestId('tab-CoachesTab').props.children).toBe('Coaches');
    expect(getByTestId('tab-CampsTab').props.children).toBe('Camps');
  });

  it('wires the compact 2-row grid tab bar renderer (Group 3 #7 follow-up)', async () => {
    const { getByTestId } = await render(<AthleteTabs />);
    // Our @react-navigation/bottom-tabs stub tags `accessibilityLabel` with
    // whether a custom `tabBar` prop was supplied to Tab.Navigator.
    expect(getByTestId('tab-bar').props.accessibilityLabel).toBe('custom-tabbar-yes');
  });
});
