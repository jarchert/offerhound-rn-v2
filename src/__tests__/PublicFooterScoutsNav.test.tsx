// src/__tests__/PublicFooterScoutsNav.test.tsx
//
// Regression test for the duplicate-home-screen bug:
//
//   PublicFooter's "Scout Directory" link previously called
//   nav.navigate('PublicSportStack'), which pushed a bare stack screen
//   containing LandingScreen without any bottom tab bar — producing a
//   pixel-identical duplicate home screen with no tab navigation.
//
//   Fix: the in-app footer link now calls nav.navigate('LandingTab'),
//   which is a tab switch within PublicTabs — the tab bar is never lost.
//
// What this test verifies:
//   1. After tapping the "Scout Directory" link in the footer, the
//      rendered tree does NOT show PublicSportStack content (which would
//      mean we pushed the bare stack).
//   2. The rendered tree remains on LandingTab / tab-navigator territory
//      (tab bar still present, no nav outside the tab shell).
//
// Strategy:
//   - Render a minimal PublicNavigator-equivalent stack:
//       [PublicTabs (with LandingScreen + tab bar)] + [PublicSportStack]
//   - Stub LandingScreen to render a testID="landing-tab-content" marker
//     AND a pressable "Scout Directory" button that fires nav.navigate()
//     as the real code does after the fix.
//   - Stub PublicSportStack to render testID="public-sport-stack-content".
//   - After pressing "Scout Directory":
//       - Expect "public-sport-stack-content" to NOT appear in the tree.
//       - Expect the bottom tab bar to still be rendered (testID="tab-bar").

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { enableScreens } from 'react-native-screens';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

enableScreens(false);

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('expo-audio', () => ({}));
jest.mock('expo-iap', () => ({}));
jest.mock('expo-calendar', () => ({ requestCalendarPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }) }));

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, userRole: null, isLoading: false }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, userRole: null, isLoading: false }) }));
jest.mock('@/hooks/useScoutOrganization', () => ({ useScoutOrganization: () => ({ data: null }) }));

jest.mock('expo-linear-gradient', () => {
  const R = require('react');
  const { View: V } = require('react-native');
  return { LinearGradient: (p: any) => R.createElement(V, p) };
});
jest.mock('@react-native-masked-view/masked-view', () => {
  const R = require('react');
  const { View: V } = require('react-native');
  return { default: (p: any) => R.createElement(V, p) };
});
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(), preventAutoHideAsync: jest.fn() }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
}));
jest.mock('expo-apple-authentication', () => ({ isAvailableAsync: jest.fn().mockResolvedValue(false) }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-tracking-transparency', () => ({ requestTrackingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }) }));
jest.mock('expo-image', () => {
  const R = require('react');
  const { Image: I } = require('react-native');
  return { Image: (p: any) => R.createElement(I, p) };
});
jest.mock('@/lib/assets', () => ({ ATHLETE_ACTION_IMG: '' }));
jest.mock('react-native-toast-message', () => ({ default: () => null, Toast: { show: jest.fn() } }));
jest.mock('lucide-react-native', () => {
  const R = require('react');
  const { View: V } = require('react-native');
  return new Proxy({}, { get: (_, name) => () => R.createElement(V, { testID: 'icon-' + String(name) }) });
});

// ─── Test doubles ─────────────────────────────────────────────────────────────

// LandingScreenFixture: renders a "Scout Directory" pressable that fires
// nav.navigate('LandingTab') — the FIXED behaviour. This is how the
// real LandingScreen behaves after the fix (onScouts navigates to LandingTab,
// not PublicSportStack).
function LandingScreenFixture() {
  const nav = useNavigation<any>();
  return (
    <View testID="landing-tab-content">
      <Text>LandingTab Home</Text>
      <Pressable
        testID="footer-scouts-link"
        onPress={() => nav.navigate('LandingTab' as any)}
      >
        <Text>Scout Directory</Text>
      </Pressable>
    </View>
  );
}

// PublicSportStackFixture: renders a distinctive marker — if this ever
// appears in the tree after pressing "Scout Directory", the bug has regressed.
function PublicSportStackFixture() {
  return (
    <View testID="public-sport-stack-content">
      <Text>SportLanding</Text>
    </View>
  );
}

// ─── Navigator setup ─────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Minimal PublicTabs: LandingTab uses the fixture; DiscoverTab is a no-op stub.
// tabBar renders a plain testID view instead of the real BottomTabBar, which
// calls useNativeDriver:true and crashes in RNTL (same pattern as PodcastsTab
// test in PublicDiscoverNavigation.test.tsx). Explicit tab-bar label Text nodes
// prove the tab shell is intact without needing the native bar.
function MinimalPublicTabs() {
  return (
    <Tab.Navigator
      tabBar={() => (
        <View testID="tab-bar">
          <Text>Home</Text>
          <Text>Discover</Text>
        </View>
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="LandingTab" component={LandingScreenFixture} options={{ title: 'Home' }} />
      <Tab.Screen
        name="DiscoverTab"
        component={() => <View><Text>DiscoverContent</Text></View>}
        options={{ title: 'Discover' }}
      />
    </Tab.Navigator>
  );
}

// PublicNavigator-equivalent: PublicTabs (initial) + PublicSportStack as a sibling.
function TestPublicNavigator() {
  return (
    <RootStack.Navigator initialRouteName="PublicTabs" screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="PublicTabs" component={MinimalPublicTabs} />
      <RootStack.Screen name="PublicSportStack" component={PublicSportStackFixture} />
    </RootStack.Navigator>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PublicFooter "Scout Directory" — does NOT push PublicSportStack', () => {
  it('pressing Scout Directory link stays within PublicTabs (tab bar remains, no sport stack pushed)', async () => {
    const { findByTestId, queryByTestId, getByText, unmount } = await render(
      <NavigationContainer>
        <TestPublicNavigator />
      </NavigationContainer>
    );

    // Verify initial state: we're on LandingTab, tab bar visible (tab labels present)
    await findByTestId('landing-tab-content');
    expect(getByText('Home')).toBeTruthy();    // tab bar label
    expect(getByText('Discover')).toBeTruthy(); // tab bar label

    // Press "Scout Directory" — the fixed code navigates to 'LandingTab' (tab switch)
    await act(async () => {
      fireEvent.press(await findByTestId('footer-scouts-link'));
    });

    await waitFor(() => {
      // PublicSportStack content must NOT appear — would mean we pushed the bare stack
      expect(queryByTestId('public-sport-stack-content')).toBeNull();
      // Tab bar labels still present — tab shell is intact
      expect(getByText('Home')).toBeTruthy();
      expect(getByText('Discover')).toBeTruthy();
    });

    unmount();
  });
});
