// ClubCoachTabsMerged.test.tsx — Group 3 #7 ROLE 2 (Option C, variant b)
//
// Verifies that ClubCoachTabs is the merged single-tab-bar navigator for the
// club-coach role: every real cross-app verb that used to live behind the
// phone CoachNav overlay (Athletes, Settings) is now a first-class Tab.Screen
// in this navigator, alongside the pre-existing Home / Camps / Letters /
// Messages / Inbox tabs.
//
// Strategy: same lightweight bottom-tabs stub pattern as
// AthleteTabsMerged.test.tsx — reflect over the registered Tab.Screen names
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
jest.mock('@/screens/club/ClubCoachDashboardScreen', () => stub());
jest.mock('@/screens/club/ClubCoachLettersScreen', () => stub());
jest.mock('@/screens/coach/CoachCampsScreen', () => stub());
jest.mock('@/screens/shared/MessagesScreen', () => stub());
jest.mock('@/screens/shared/InboxScreen', () => stub());
jest.mock('@/screens/shared/AthleteSearchScreen', () => stub());
jest.mock('@/navigation/stacks/SettingsStack', () => stub());

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
import ClubCoachTabs from '../navigation/role/ClubCoachTabs';

describe('ClubCoachTabs — merged single-tab-bar (Group 3 #7 ROLE 2)', () => {
  it('registers every pre-existing club-coach tab', async () => {
    const { queryByTestId } = await render(<ClubCoachTabs />);
    expect(queryByTestId('tab-bar')).toBeTruthy();
    expect(queryByTestId('tab-DashboardTab')).toBeTruthy();
    expect(queryByTestId('tab-CampsTab')).toBeTruthy();
    expect(queryByTestId('tab-LettersTab')).toBeTruthy();
    expect(queryByTestId('tab-MessagesTab')).toBeTruthy();
    expect(queryByTestId('tab-InboxTab')).toBeTruthy();
  });

  it('lifts AthletesTab and SettingsTab into the tab bar (was CoachNav phone overlay)', async () => {
    const { queryByTestId, getByTestId } = await render(<ClubCoachTabs />);
    // Real cross-app verbs previously reached via
    //   navigation.navigate('AthleteSearch') (banner Search / quick-action Find Athletes)
    //   navigation.navigate('SettingsStack') (Profile-tab Edit Profile Settings)
    // from ClubCoachDashboardScreen on phone.
    expect(queryByTestId('tab-AthletesTab')).toBeTruthy();
    expect(queryByTestId('tab-SettingsTab')).toBeTruthy();
    // Titles are user-facing labels (roleTabScreenOptions is stubbed empty).
    expect(getByTestId('tab-AthletesTab').props.children).toBe('Athletes');
    expect(getByTestId('tab-SettingsTab').props.children).toBe('Settings');
  });

  it('wires the compact 2-row grid tab bar renderer (7 tabs > 5, needs grid)', async () => {
    const { getByTestId } = await render(<ClubCoachTabs />);
    // Bottom-tabs stub tags `accessibilityLabel` with whether a custom
    // `tabBar` prop was supplied to Tab.Navigator.
    expect(getByTestId('tab-bar').props.accessibilityLabel).toBe('custom-tabbar-yes');
  });
});
