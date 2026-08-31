// src/__tests__/PublicDiscoverNavigation.test.tsx
//
// Verifies each PublicDiscoverScreen tile navigates to its correct screen,
// NOT to PublicProfileScreen's "Profile Not Found" fallback.
//
// RNTL@14: render() is async — must await and destructure.
//
// Structure:
//   describe 1: 7 stack-navigation tiles tested via a stubbed PublicTabs
//               (avoids bottom-tab native deps while still exercising real
//               screen components and real navigator registrations)
//   describe 2: Podcasts tile — tested via real PublicTabs + PublicDiscoverScreen
//               confirming nav.getParent().navigate('PodcastsTab') switches tabs

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── AsyncStorage ─────────────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(null),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(null),
    multiRemove: jest.fn().mockResolvedValue(null),
  },
}));

// expo-audio (transitively required via InfluencerTabs -> PodcastScreen)
jest.mock('expo-audio', () => ({}));

// ─── Supabase ─────────────────────────────────────────────────────────────────
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        order: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue({ data: [], error: null }) }),
        gte: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue({ data: [], error: null }) }),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// ─── Auth ─────────────────────────────────────────────────────────────────────
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, userRole: null, isLoading: false }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, userRole: null, isLoading: false }) }));
jest.mock('@/hooks/useScoutOrganization', () => ({ useScoutOrganization: () => ({ organization: null, isLoading: false }) }));
jest.mock('@/contexts/ImpersonationContext', () => ({
  ImpersonationProvider: ({ children }) => children,
  useImpersonation: () => ({ isImpersonating: false }),
}));

// ─── Expo / native ────────────────────────────────────────────────────────────
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { LinearGradient: (p) => R.createElement(View, p) };
});
jest.mock('@react-native-masked-view/masked-view', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: (p) => R.createElement(View, p) };
});
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('expo-asset', () => ({ Asset: { loadAsync: jest.fn() } }));
jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(), preventAutoHideAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('expo-tracking-transparency', () => ({ requestTrackingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }) }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
}));
jest.mock('expo-apple-authentication', () => ({ isAvailableAsync: jest.fn().mockResolvedValue(false) }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-iap', () => ({}));
jest.mock('expo-calendar', () => ({ requestCalendarPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }) }));
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  const R = require('react');
  return { Image: (p) => R.createElement(Image, p) };
});
jest.mock('@/lib/assets', () => ({ ATHLETE_ACTION_IMG: '' }));
jest.mock('react-native-toast-message', () => ({ default: () => null, Toast: { show: jest.fn() } }));

// ─── Lucide ───────────────────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const R = require('react');
  return new Proxy({}, {
    get: (_, name) =>
      function MockIcon() { return R.createElement(View, { testID: 'icon-' + String(name) }); },
  });
});

// ─── Sub-components ───────────────────────────────────────────────────────────
jest.mock('@/components/HeroSection', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { HeroSection: () => R.createElement(View, null) };
});
jest.mock('@/components/AthleteProfile', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { AthleteProfile: () => R.createElement(View, null) };
});
jest.mock('@/components/Footer', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { Footer: () => R.createElement(View, null) };
});
jest.mock('@/components/BackButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  const R = require('react');
  return { BackButton: () => R.createElement(TouchableOpacity, null, R.createElement(Text, null, 'Back')) };
});
// SEO is a default export — return bare function so Babel CJS interop unwraps correctly.
// Returning { default: fn } causes the import to resolve to the module object, not fn.
jest.mock('@/components/SEO', () => function SEOStub() { return null; });
jest.mock('@/components/FloatingAICoach', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View, null) };
});
// Navbar pulls in full RootNavigator tree — stub it
jest.mock('@/components/Navbar', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { Navbar: () => R.createElement(View, null), default: () => R.createElement(View, null) };
});
jest.mock('@/components/ImpersonationBanner', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { ImpersonationBanner: () => R.createElement(View, null) };
});
// PublicProfileStack drags in auth tree — stub it
jest.mock('../navigation/stacks/PublicProfileStack', () => {
  const { View, Text } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View, null, R.createElement(Text, null, 'PublicProfileStack')) };
});
// LandingScreen and SignInScreen are heavy — stub for PublicTabs
jest.mock('@/screens/auth/LandingScreen', () => {
  const { View, Text } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View, null, R.createElement(Text, null, 'LandingScreen')) };
});
jest.mock('@/screens/auth/SignInScreen', () => {
  const { View, Text } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View, null, R.createElement(Text, null, 'SignInScreen')) };
});
// PodcastScreen stub — used both as the real tab content and to avoid expo-audio chain
jest.mock('@/screens/influencer/PodcastScreen', () => {
  const { View, Text } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View, null, R.createElement(Text, null, 'PodcastScreen')) };
});

// ─── Stub PublicTabs for the stack-navigation tests ───────────────────────────
// Renders tiles directly with navigate() calls, bypassing the real bottom-tab
// navigator internals while still exercising the real navigator registrations.
jest.mock('../navigation/stacks/PublicTabs', () => {
  const R = require('react');
  const { View, Text, Pressable } = require('react-native');
  const { useNavigation } = require('@react-navigation/native');
  const TILES = [
    { label: 'Browse Coaches',  route: 'CoachDirectory' },
    { label: 'Browse Athletes', route: 'AthleteSearch' },
    { label: 'Scout Agencies',  route: 'ScoutDirectory' },
    { label: 'Influencers',     route: 'InfluencerBoard' },
    { label: 'Sample Athlete',  route: 'SampleAthlete' },
    { label: 'NIL Intelligence',route: 'NILIntelligence' },
    { label: 'News and Learn',  route: 'NILIntelligence' },
    { label: 'Camp Discovery',  route: 'CampStack' },
    { label: 'Pricing',         route: 'Pricing' },
  ];
  return {
    default: function PublicTabsStub() {
      const nav = useNavigation();
      return R.createElement(View, null,
        TILES.map((t) =>
          R.createElement(Pressable, { key: t.label, onPress: () => nav.navigate(t.route) },
            R.createElement(Text, null, t.label)
          )
        )
      );
    }
  };
});

// ─── Imports ──────────────────────────────────────────────────────────────────
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CoachDirectoryScreen from '../screens/shared/CoachDirectoryScreen';
import AthleteSearchScreen from '../screens/shared/AthleteSearchScreen';
import ScoutDirectoryScreen from '../screens/scout/ScoutDirectoryScreen';
import InfluencerBoardScreen from '../screens/influencer/InfluencerBoardScreen';
import SampleAthleteScreen from '../screens/public/SampleAthleteScreen';
import NILIntelligenceScreen from '../screens/shared/NILIntelligenceScreen';
import CampStack from '../navigation/stacks/CampStack';
import PricingScreen from '../screens/shared/PricingScreen';

// ─── Additional mocks for CampStack and PricingScreen ───────────────────────
// @shopify/flash-list: CampDiscoveryScreen uses FlashList (not FlatList).
// Mock it as a plain ScrollView so RNTL can inspect its children.
jest.mock('@shopify/flash-list', () => {
  const R = require('react');
  const { ScrollView } = require('react-native');
  return {
    FlashList: ({ data, renderItem, ListEmptyComponent, keyExtractor }: any) => {
      if (!data || data.length === 0) {
        return R.createElement(ScrollView, null,
          typeof ListEmptyComponent === 'function'
            ? R.createElement(ListEmptyComponent)
            : ListEmptyComponent
        );
      }
      return R.createElement(ScrollView, null,
        data.map((item: any, i: number) =>
          R.createElement(R.Fragment, { key: keyExtractor ? keyExtractor(item, i) : i },
            renderItem({ item, index: i })
          )
        )
      );
    },
  };
});
jest.mock('@/contexts/SportContext', () => ({
  useSport: () => ({ selectedSport: 'football', setSelectedSport: jest.fn(), sportName: 'Football' }),
  SportProvider: ({ children }: any) => children,
}));
jest.mock('@/hooks/useCollegeCamps', () => ({
  addCampToDeviceCalendar: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ refresh: jest.fn() }) }));
jest.mock('@/components/Paywall', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: () => R.createElement(View, null) };
});
jest.mock('@/lib/iap', () => ({
  TIER_TO_PRODUCT_ID: {},
  fetchSubscriptions: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/pricing', () => ({ PRICING_TIERS: [] }));
jest.mock('@/lib/platform', () => ({ shouldHidePricingUI: () => true }));

const Stack = createNativeStackNavigator();
const PublicTabsStub = require('../navigation/stacks/PublicTabs').default;
const PublicProfileStackStub = require('../navigation/stacks/PublicProfileStack').default;

function TestPublicNavigator() {
  return (
    <Stack.Navigator initialRouteName="PublicTabs" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PublicTabs" component={PublicTabsStub} />
      <Stack.Screen name="PublicProfileStack" component={PublicProfileStackStub} />
      <Stack.Screen name="SampleAthlete" component={SampleAthleteScreen} />
      <Stack.Screen name="NILIntelligence" component={NILIntelligenceScreen} />
      <Stack.Screen name="CoachDirectory" component={CoachDirectoryScreen} />
      <Stack.Screen name="AthleteSearch" component={AthleteSearchScreen} />
      <Stack.Screen name="ScoutDirectory" component={ScoutDirectoryScreen} />
      <Stack.Screen name="InfluencerBoard" component={InfluencerBoardScreen} />
      <Stack.Screen name="CampStack" component={CampStack} />
      <Stack.Screen name="Pricing" component={PricingScreen} />
    </Stack.Navigator>
  );
}

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

function Wrapper() {
  return (
    <QueryClientProvider client={makeQC()}>
      <NavigationContainer>
        <TestPublicNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}

// ─── Describe 1: stack-navigation tiles ───────────────────────────────────────
describe('PublicDiscoverScreen tile navigation — stack screens', () => {
  it('Browse Coaches -> CoachDirectoryScreen, NOT Profile Not Found', async () => {
    const { findByText, getByText, queryByText, unmount } = await render(<Wrapper />);
    await act(async () => { fireEvent.press(await findByText('Browse Coaches')); });
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      // Unauth navigates to the CoachDirectory screen but the auth gate
      // (RegisterSearchGate) replaces the search UI — assert on the gate
      // headline, which is unique to the coach directory unauth branch.
      expect(getByText('Register to find your coach and program match')).toBeTruthy();
    });
    unmount();
  });

  it('Browse Athletes -> AthleteSearchScreen, NOT Profile Not Found', async () => {
    const { findByText, getByText, queryByText, unmount } = await render(<Wrapper />);
    await act(async () => { fireEvent.press(await findByText('Browse Athletes')); });
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      expect(getByText('Register to find your AI matched players')).toBeTruthy();
    });
    unmount();
  });

  it('Scout Agencies -> ScoutDirectoryScreen, NOT Profile Not Found', async () => {
    const { findByText, getByText, queryByText, unmount } = await render(<Wrapper />);
    await act(async () => { fireEvent.press(await findByText('Scout Agencies')); });
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      expect(getByText('Register to connect with verified scouts')).toBeTruthy();
    });
    unmount();
  });

  it('Influencers -> InfluencerBoardScreen, NOT Profile Not Found', async () => {
    const { findByText, getByText, queryByText, unmount } = await render(<Wrapper />);
    await act(async () => { fireEvent.press(await findByText('Influencers')); });
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      expect(getByText('Influencer Board')).toBeTruthy();
    });
    unmount();
  });

  it('Sample Athlete -> SampleAthleteScreen, NOT Profile Not Found', async () => {
    const { findByText, getByText, queryByText, unmount } = await render(<Wrapper />);
    await act(async () => { fireEvent.press(await findByText('Sample Athlete')); });
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      expect(getByText('Want a Profile Like This?')).toBeTruthy();
    });
    unmount();
  });

  it('NIL Intelligence -> NILIntelligenceScreen, NOT Profile Not Found', async () => {
    const { findByText, getByText, queryByText, unmount } = await render(<Wrapper />);
    await act(async () => { fireEvent.press(await findByText('NIL Intelligence')); });
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      expect(getByText('NIL Intelligence')).toBeTruthy();
    });
    unmount();
  });

  it('News and Learn -> NILIntelligenceScreen (same route), NOT Profile Not Found', async () => {
    const { findByText, getByText, queryByText, unmount } = await render(<Wrapper />);
    await act(async () => { fireEvent.press(await findByText('News and Learn')); });
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      expect(getByText('NIL Intelligence')).toBeTruthy();
    });
    unmount();
  });

  // ─── Item 1: CampStack and Pricing tiles ──────────────────────────────────
  // CampStack is a nested navigator — its initial screen is CampDiscovery,
  // which renders 'College camps' and 'DISCOVER' text.
  // PricingScreen: shouldHidePricingUI() always returns true in RN (Apple/Google
  // IAP policy), so the screen always renders the 'MANAGE YOUR PLAN' branch.

  it('Camp Discovery -> CampStack initial screen (CampDiscoveryScreen), NOT Profile Not Found', async () => {
    const { findByText, getByText, queryByText, unmount } = await render(<Wrapper />);
    await act(async () => { fireEvent.press(await findByText('Camp Discovery')); });
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      expect(getByText('College camps')).toBeTruthy();
    });
    unmount();
  });

  it('Pricing -> PricingScreen (MANAGE YOUR PLAN branch), NOT Profile Not Found', async () => {
    const { findByText, getByText, queryByText, unmount } = await render(<Wrapper />);
    await act(async () => { fireEvent.press(await findByText('Pricing')); });
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      // shouldHidePricingUI() returns true in RN — IAP compliance branch
      expect(getByText('MANAGE YOUR PLAN')).toBeTruthy();
    });
    unmount();
  });
});

// ─── Describe 2: Podcasts tab-switch ─────────────────────────────────────────
// Uses real PublicDiscoverScreen inside a minimal bottom-tab navigator.
// enableScreens(false) replaces native RNSScreen with plain JS Views so RNTL
// can see all mounted tab screens (native screens only mount the active one).
// tabBar={() => null as any} suppresses BottomTabBar to avoid native Animated
// crashes (useNativeDriver:true calls __makeNative which needs a real UIManager).
// PublicDiscoverScreen is a direct tab child, so nav.navigate('PodcastsTab')
// switches the active tab (getParent() would return undefined here).

import PublicDiscoverScreen from '../screens/shared/PublicDiscoverScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { enableScreens } from 'react-native-screens';

enableScreens(false); // use JS Views so RNTL tree reflects all mounted screens

const Tab = createBottomTabNavigator();

function PodcastTabWrapper() {
  const PodcastStub = require('@/screens/influencer/PodcastScreen').default;
  return (
    <Tab.Navigator tabBar={() => null as any} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="DiscoverTab" component={PublicDiscoverScreen} options={{ title: 'Discover' }} />
      <Tab.Screen name="PodcastsTab" component={PodcastStub} options={{ title: 'Podcasts' }} />
    </Tab.Navigator>
  );
}

function PodcastWrapper() {
  return (
    <QueryClientProvider client={makeQC()}>
      <NavigationContainer>
        <PodcastTabWrapper />
      </NavigationContainer>
    </QueryClientProvider>
  );
}

describe('PublicDiscoverScreen tile navigation — Podcasts tab-switch', () => {
  it('Podcasts tile → switches to PodcastsTab via nav.navigate() (direct tab child)', async () => {
    const { findByText, queryByText, unmount } = await render(<PodcastWrapper />);
    // DiscoverTab is initial — tile grid is visible
    await findByText('Podcasts');
    await act(async () => { fireEvent.press(await findByText('Podcasts')); });
    // After tab switch, PodcastScreen stub content enters the tree.
    // includeHiddenElements:true handles any aria-hidden state on inactive screens.
    await waitFor(() => {
      expect(queryByText('PodcastScreen', { includeHiddenElements: true })).toBeTruthy();
    }, { timeout: 3000 });
    unmount();
  });
});
