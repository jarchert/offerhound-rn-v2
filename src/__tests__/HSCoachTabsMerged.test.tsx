// HSCoachTabsMerged.test.tsx — Group 3 #7 ROLE 3 (Option C, variant b)
//
// Verifies that HSCoachTabs is the merged single-tab-bar navigator for the
// hs-coach role: the one previously-un-tab'd cross-app verb (CoachDirectory,
// reached via the "College Coaches" quick-action) is now a first-class
// Tab.Screen alongside the pre-existing Home / Athletes / Letters / Messages
// / Inbox tabs, and the compact 2-row grid tab bar renderer is wired because
// the final count (6) exceeds the 5-tab bottom-bar limit.
//
// Strategy: same lightweight bottom-tabs stub pattern as
// ClubCoachTabsMerged.test.tsx / AthleteTabsMerged.test.tsx — reflect over
// registered Tab.Screen names without pulling react-native-screens or the
// real navigator.

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
    const hasCustomTabBar = typeof tabBar === 'function' ? 'yes' : 'no';
    return R.createElement(
      View,
      { testID: 'tab-bar', accessibilityLabel: `custom-tabbar-${hasCustomTabBar}` },
      screens.map((s: { name: string; title?: string }) =>
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
  typography: { fontFamily: { bodyMedium: 'System', bodySemibold: 'System', heading: 'System' }, fontSize: { md: 14 } },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
}));

// ─── Stub every screen the navigator imports ─────────────────────────────────
const stub = () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View) };
};
jest.mock('@/screens/hs-coach/HSCoachDashboardScreen', () => stub());
jest.mock('@/screens/hs-coach/HSCoachLettersScreen', () => stub());
jest.mock('@/screens/shared/AthleteSearchScreen', () => stub());
jest.mock('@/screens/shared/MessagesScreen', () => stub());
jest.mock('@/screens/shared/InboxScreen', () => stub());
jest.mock('@/screens/shared/CoachDirectoryScreen', () => stub());

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
import HSCoachTabs from '../navigation/role/HSCoachTabs';

describe('HSCoachTabs — merged single-tab-bar (Group 3 #7 ROLE 3)', () => {
  it('registers every pre-existing hs-coach tab', async () => {
    const { queryByTestId, getByTestId } = await render(<HSCoachTabs />);
    expect(queryByTestId('tab-bar')).toBeTruthy();
    expect(queryByTestId('tab-DashboardTab')).toBeTruthy();
    expect(queryByTestId('tab-SearchTab')).toBeTruthy();
    expect(queryByTestId('tab-LettersTab')).toBeTruthy();
    expect(queryByTestId('tab-MessagesTab')).toBeTruthy();
    expect(queryByTestId('tab-InboxTab')).toBeTruthy();
    // The pre-existing SearchTab already covers navigate('AthleteSearch') —
    // banner "Search Athletes", quick-action "Find Athletes", saved-athletes
    // empty state "Search Athletes" — via AthleteSearchScreen. Its label is
    // user-facing "Athletes".
    expect(getByTestId('tab-SearchTab').props.children).toBe('Athletes');
  });

  it('lifts CoachesTab into the tab bar (was Root Stack navigate("CoachDirectory"))', async () => {
    const { queryByTestId, getByTestId } = await render(<HSCoachTabs />);
    // Real cross-app verb previously reached via
    //   navigation.navigate('CoachDirectory') (quick-action "College Coaches")
    // from HSCoachDashboardScreen.
    expect(queryByTestId('tab-CoachesTab')).toBeTruthy();
    expect(getByTestId('tab-CoachesTab').props.children).toBe('Coaches');
  });

  it('wires the compact 2-row grid tab bar renderer (6 tabs > 5, needs grid)', async () => {
    const { getByTestId } = await render(<HSCoachTabs />);
    // Bottom-tabs stub tags `accessibilityLabel` with whether a custom
    // `tabBar` prop was supplied to Tab.Navigator.
    expect(getByTestId('tab-bar').props.accessibilityLabel).toBe('custom-tabbar-yes');
  });
});
