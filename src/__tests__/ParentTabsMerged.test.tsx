// ParentTabsMerged.test.tsx — Group 3 #7 ROLE 6 (Option C, variant b)
//
// Verifies that ParentTabs is the correct merged single-tab-bar navigator
// for the parent role.
//
// Ground-truth grep evidence (ParentDashboard.tsx + ParentTrustSafetyScreen.tsx
// + VisibilityDecisionScreen.tsx — every parent-reachable screen):
//
//   Navigate calls found:
//     L148  nav.dispatch(CommonActions.reset({...AuthStack...}))
//           → auth redirect, not a cross-app verb. No new tab.
//     L391  nav.navigate('AuthStack', { screen: 'VisibilityDecision', ... })
//           → deep-link to the visibility-decision modal in AuthStack.
//             Proposal banners in the dashboard trigger this; VisibilityDecision
//             is an action-confirmation screen, not a standing tab surface.
//             No new tab.
//     L590  nav.navigate('ParentTabs', { screen: 'TrustSafetyTab' })
//           → intra-tab navigation within ParentTabs itself (Safety card →
//             TrustSafetyTab). Already a tab. No new tab.
//
//   Companion nav mounts: NONE. No <ParentNav>, <OwnerNav>, <CoachNav>,
//   <HSCoachNav>, <ScoutNav>, or <OrganizationNav> exists in any
//   parent-reachable screen. Nothing to gate behind isWide.
//
//   ViewToggle / isOwnerView / isVisitorView: NONE found in src/screens/parent/.
//   Nothing to lift.
//
// Conclusion: ParentTabs is already the correct minimal-lift merged tab bar.
// 4 tabs (Dashboard, Messages, Inbox, Safety) — all real surfaces, no
// dead tabs, no missing verbs. Count 4 ≤ 5 → standard tab bar (no
// CompactGridTabBar needed).
//
// This test locks in the final tab set so regressions are caught.
//
// Strategy: same lightweight bottom-tabs stub pattern as all prior
// *TabsMerged tests. Reflect over registered Tab.Screen names without
// pulling react-native-screens or the real navigator.

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

// ─── Theme stub ───────────────────────────────────────────────────────────────
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
jest.mock('@/screens/parent/ParentDashboard', () => stub());
jest.mock('@/screens/parent/ParentTrustSafetyScreen', () => stub());
jest.mock('@/screens/shared/MessagesScreen', () => stub());
jest.mock('@/screens/shared/InboxScreen', () => stub());

jest.mock('@/navigation/role/roleTabScreenOptions', () => ({
  roleTabScreenOptions: {},
}));

// Import AFTER all mocks
import ParentTabs from '../navigation/role/ParentTabs';

describe('ParentTabs — merged single-tab-bar (Group 3 #7 ROLE 6)', () => {
  it('registers all four parent tabs', async () => {
    const { queryByTestId, getByTestId } = await render(<ParentTabs />);
    expect(queryByTestId('tab-bar')).toBeTruthy();
    expect(queryByTestId('tab-DashboardTab')).toBeTruthy();
    expect(queryByTestId('tab-MessagesTab')).toBeTruthy();
    expect(queryByTestId('tab-InboxTab')).toBeTruthy();
    expect(queryByTestId('tab-TrustSafetyTab')).toBeTruthy();

    expect(getByTestId('tab-DashboardTab').props.children).toBe('Home');
    expect(getByTestId('tab-MessagesTab').props.children).toBe('Messages');
    expect(getByTestId('tab-InboxTab').props.children).toBe('Inbox');
    expect(getByTestId('tab-TrustSafetyTab').props.children).toBe('Safety');
  });

  it('has exactly 4 tabs (minimal-lift — no new cross-app verbs found)', async () => {
    // grep evidence: the only navigate() calls in parent-reachable screens are:
    //   (a) auth redirect (CommonActions.reset → AuthStack)  — not a verb
    //   (b) AuthStack VisibilityDecision modal               — not a tab surface
    //   (c) ParentTabs TrustSafetyTab                       — already a tab
    // Result: 0 new verbs to lift; 4 tabs is the correct final count.
    const { queryAllByTestId } = await render(<ParentTabs />);
    const tabs = queryAllByTestId(/^tab-(?!bar$)/);
    expect(tabs).toHaveLength(4);
  });

  it('uses the standard tab bar (4 tabs ≤ 5 — no CompactGridTabBar needed)', async () => {
    const { getByTestId } = await render(<ParentTabs />);
    // Bottom-tabs stub tags accessibilityLabel with whether a custom
    // tabBar prop was supplied. Standard tab bar → 'custom-tabbar-no'.
    expect(getByTestId('tab-bar').props.accessibilityLabel).toBe('custom-tabbar-no');
  });
});
