// CoachTabsMerged.test.tsx — Group 3 #7 ROLE 7 (College Coach, Option C variant b)
//
// Verifies that CoachTabs is the merged single-tab-bar navigator for the
// college-coach role: the two previously-un-tab'd cross-app verbs
// (AthleteSearch from CoachRosterScreen.tsx L179, Messages from
// CoachDashboard.tsx L147 + CoachAthleteMatchesScreen.tsx L50) are now
// first-class Tab.Screens alongside the pre-existing tabs, and the compact
// 2-row grid tab bar renderer is wired because the final count (8) exceeds
// the 5-tab bottom-bar limit.
//
// Strategy: same lightweight bottom-tabs stub pattern as
// AgencyTabsMerged.test.tsx / ScoutTabsMerged.test.tsx /
// HSCoachTabsMerged.test.tsx / ClubCoachTabsMerged.test.tsx /
// AthleteTabsMerged.test.tsx — reflect over registered Tab.Screen names
// without pulling react-native-screens or the real navigator.

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

// ─── Theme ───────────────────────────────────────────────────────────────────
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
jest.mock('@/screens/coach/CoachDashboard', () => stub());
jest.mock('@/screens/coach/CoachRosterScreen', () => stub());
jest.mock('@/screens/shared/AthleteSearchScreen', () => stub());
jest.mock('@/screens/shared/CampsScreen', () => stub());
jest.mock('@/screens/shared/LetterComposerScreen', () => stub());
jest.mock('@/screens/shared/CoachDirectoryScreen', () => stub());
jest.mock('@/screens/shared/MessagesScreen', () => stub());
jest.mock('@/screens/coach/CoachCampaignsScreen', () => stub());

// Stub CompactGridTabBar so this test stays focused on Screen wiring.
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
import CoachTabs from '../navigation/role/CoachTabs';

describe('CoachTabs — merged single-tab-bar (Group 3 #7 ROLE 7 College Coach)', () => {
  it('registers every pre-existing college-coach tab', async () => {
    const { queryByTestId, getByTestId } = await render(<CoachTabs />);
    expect(queryByTestId('tab-bar')).toBeTruthy();
    expect(queryByTestId('tab-DashboardTab')).toBeTruthy();
    expect(queryByTestId('tab-PipelineTab')).toBeTruthy();
    expect(queryByTestId('tab-CampsTab')).toBeTruthy();
    expect(queryByTestId('tab-LettersTab')).toBeTruthy();
    expect(queryByTestId('tab-DirectoryTab')).toBeTruthy();
    expect(queryByTestId('tab-CampaignsTab')).toBeTruthy();
    expect(getByTestId('tab-DashboardTab').props.children).toBe('Home');
    expect(getByTestId('tab-PipelineTab').props.children).toBe('Pipeline');
    expect(getByTestId('tab-CampsTab').props.children).toBe('Camps');
    expect(getByTestId('tab-LettersTab').props.children).toBe('Letters');
    expect(getByTestId('tab-DirectoryTab').props.children).toBe('Directory');
    expect(getByTestId('tab-CampaignsTab').props.children).toBe('Campaigns');
  });

  it('lifts SearchTab into the tab bar (was Root Stack navigate("AthleteSearch") from CoachRosterScreen L179)', async () => {
    const { queryByTestId, getByTestId } = await render(<CoachTabs />);
    // Real cross-app verb previously reached via
    //   (nav as any).navigate('AthleteSearch')
    // from CoachRosterScreen.tsx L179.
    expect(queryByTestId('tab-SearchTab')).toBeTruthy();
    expect(getByTestId('tab-SearchTab').props.children).toBe('Athletes');
  });

  it('lifts MessagesTab into the tab bar (was Root Stack navigate("Messages") from CoachDashboard L147 + CoachAthleteMatchesScreen L50)', async () => {
    const { queryByTestId, getByTestId } = await render(<CoachTabs />);
    // Real cross-app verb previously reached via
    //   (nav as any).navigate('Messages', …) from CoachDashboard.tsx L147
    //   nav.navigate('Messages')            from CoachAthleteMatchesScreen.tsx L50
    expect(queryByTestId('tab-MessagesTab')).toBeTruthy();
    expect(getByTestId('tab-MessagesTab').props.children).toBe('Messages');
  });

  it('wires the compact 2-row grid tab bar renderer (8 tabs > 5, needs grid)', async () => {
    const { getByTestId } = await render(<CoachTabs />);
    // Bottom-tabs stub tags accessibilityLabel with whether a custom
    // tabBar prop was supplied to Tab.Navigator.
    expect(getByTestId('tab-bar').props.accessibilityLabel).toBe('custom-tabbar-yes');
  });
});
