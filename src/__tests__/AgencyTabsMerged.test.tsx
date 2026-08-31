// AgencyTabsMerged.test.tsx — Group 3 #7 ROLE 5 (Option C, variant b)
//
// Verifies that AgencyTabs is the merged single-tab-bar navigator for
// the agency role: the one previously-un-tab'd cross-app verb
// (ScoutTrends, reached via the "Trends" quick-action on
// AgencyDashboardScreen L144) is now a first-class Tab.Screen alongside
// the pre-existing Home / Athletes / Letters / Messages / Inbox tabs,
// and the compact 2-row grid tab bar renderer is wired because the
// final count (6) exceeds the 5-tab bottom-bar limit.
//
// Strategy: same lightweight bottom-tabs stub pattern as
// ScoutTabsMerged.test.tsx / HSCoachTabsMerged.test.tsx /
// ClubCoachTabsMerged.test.tsx / AthleteTabsMerged.test.tsx — reflect
// over registered Tab.Screen names without pulling react-native-screens
// or the real navigator.

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
jest.mock('@/screens/agency/AgencyDashboardScreen', () => stub());
jest.mock('@/screens/scout/ScoutLettersScreen', () => stub());
jest.mock('@/screens/scout/ScoutTrendsScreen', () => stub());
jest.mock('@/screens/shared/AthleteSearchScreen', () => stub());
jest.mock('@/screens/shared/MessagesScreen', () => stub());
jest.mock('@/screens/shared/InboxScreen', () => stub());

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
import AgencyTabs from '../navigation/role/AgencyTabs';

describe('AgencyTabs — merged single-tab-bar (Group 3 #7 ROLE 5)', () => {
  it('registers every pre-existing agency tab', async () => {
    const { queryByTestId, getByTestId } = await render(<AgencyTabs />);
    expect(queryByTestId('tab-bar')).toBeTruthy();
    expect(queryByTestId('tab-DashboardTab')).toBeTruthy();
    expect(queryByTestId('tab-SearchTab')).toBeTruthy();
    expect(queryByTestId('tab-LettersTab')).toBeTruthy();
    expect(queryByTestId('tab-MessagesTab')).toBeTruthy();
    expect(queryByTestId('tab-InboxTab')).toBeTruthy();
    // Pre-existing SearchTab covers the "browse athletes" intent
    // (AthleteDashboard `Search Athletes` quick-action at
    // AgencyDashboardScreen.tsx L131 navigates to CoachTabs/DirectoryTab —
    // divergent path, same destination shape). User-facing label "Athletes".
    expect(getByTestId('tab-SearchTab').props.children).toBe('Athletes');
    // MessagesTab covers agency-reachable Messages navigate calls
    // (including AthleteSearchScreen.tsx L376).
    expect(getByTestId('tab-MessagesTab').props.children).toBe('Messages');
    // LettersTab is the "scout-flavored" letters surface, kept from Build 25.
    expect(getByTestId('tab-LettersTab').props.children).toBe('Letters');
  });

  it('lifts TrendsTab into the tab bar (was Root Stack navigate("ScoutTrends"))', async () => {
    const { queryByTestId, getByTestId } = await render(<AgencyTabs />);
    // Real cross-app verb previously reached via
    //   nav.navigate('ScoutTrends')
    // from AgencyDashboardScreen.tsx L144 ("Trends" quick-action in the
    // header actionsRow, immediately after "Letter Center").
    expect(queryByTestId('tab-TrendsTab')).toBeTruthy();
    expect(getByTestId('tab-TrendsTab').props.children).toBe('Trends');
  });

  it('wires the compact 2-row grid tab bar renderer (6 tabs > 5, needs grid)', async () => {
    const { getByTestId } = await render(<AgencyTabs />);
    // Bottom-tabs stub tags `accessibilityLabel` with whether a custom
    // `tabBar` prop was supplied to Tab.Navigator.
    expect(getByTestId('tab-bar').props.accessibilityLabel).toBe('custom-tabbar-yes');
  });
});
