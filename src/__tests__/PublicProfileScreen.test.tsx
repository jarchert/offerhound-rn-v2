// src/__tests__/PublicProfileScreen.test.tsx
//
// Tests for PublicProfileScreen:
//   1. Valid published non-minor profile → profile content renders
//   2. Invalid/nonexistent customUrl    → "Profile Not Found" renders
//   3. Under-15 profile                → "Profile Unavailable" renders (privacy regression guard)
//   4. Unauthenticated visitor          → Message + RequestTranscript buttons absent
//   5. Authenticated non-owner         → Message + RequestTranscript buttons present
//
// Supabase mock is keyed on the eq() value so each test controls what the
// screen's useQuery returns.
//
// Auth override pattern: Jest allows `mock`-prefixed module-level vars to be
// referenced inside jest.mock() factory functions (babel-jest allowlist).
// We use `mockAuthStore` as a mutable object; each test mutates its properties.
//
// RNTL@14: render() is async — must await.

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── AsyncStorage ─────────────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
    getAllKeys: jest.fn().mockResolvedValue([]),
  },
}));

// ─── Supabase — keyed mock ────────────────────────────────────────────────────
// The screen queries player_profiles by custom_url (then falls back to id).
// Each eq() call captures the filter value and closes it into the returned
// maybeSingle function — fully stateless per call chain, no shared mutable slot.
// Fixtures are set per-test via __setProfileFixture(); cleared in beforeEach.
const __profileFixtures: Record<string, any> = {};
const __setProfileFixture = (key: string, row: any) => { __profileFixtures[key] = row; };
const __clearProfileFixtures = () => { Object.keys(__profileFixtures).forEach(k => delete __profileFixtures[k]); };

jest.mock('@/integrations/supabase/client', () => {
  const makeMaybeSingle = (capturedVal: string) =>
    jest.fn().mockImplementation(async () => ({
      data: __profileFixtures[capturedVal] ?? null,
      error: null,
    }));
  const eq = jest.fn().mockImplementation((_col: string, val: string) => ({
    maybeSingle: makeMaybeSingle(val),
  }));
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  return {
    supabase: {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } },
        }),
      },
      from,
    },
  };
});

// ─── Auth — mock-prefixed mutable store (jest hoisting allowlist) ─────────────
// Jest's babel transform hoists jest.mock() calls above imports. Variables
// referenced inside factory functions must be in-scope at hoist time. Jest
// allows names starting with "mock" (case-insensitive) to bypass the
// out-of-scope guard. We use a mutable object so per-test overrides work.
const mockAuthStore = {
  user: null as any,
  userRole: null as string | null,
  isLoading: false,
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthStore,
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthStore,
}));

// ─── Role profile hooks ───────────────────────────────────────────────────────
jest.mock('@/hooks/useCoachProfile', () => ({ useCoachProfile: () => ({ data: null }) }));
jest.mock('@/hooks/useScoutProfile', () => ({ useScoutProfile: () => ({ data: null }) }));
jest.mock('@/hooks/useHSCoachProfile', () => ({ useHSCoachProfile: () => ({ data: null }) }));
jest.mock('@/hooks/useScoutOrganization', () => ({ useScoutOrganization: () => ({ data: null }) }));

// ─── Expo / native modules ────────────────────────────────────────────────────
jest.mock('expo-audio', () => ({}));
jest.mock('expo-iap', () => ({}));
jest.mock('expo-calendar', () => ({ requestCalendarPermissionsAsync: jest.fn() }));
jest.mock('expo-linear-gradient', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { LinearGradient: (p: any) => R.createElement(View, p) };
});
jest.mock('@react-native-masked-view/masked-view', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { default: (p: any) => R.createElement(View, p) };
});
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
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
jest.mock('expo-tracking-transparency', () => ({
  requestTrackingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
}));
jest.mock('expo-image', () => {
  const R = require('react');
  const { Image } = require('react-native');
  return { Image: (p: any) => R.createElement(Image, p) };
});
jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn().mockReturnValue({ play: jest.fn(), pause: jest.fn() }),
  VideoView: () => null,
}));
jest.mock('react-native-webview', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { default: () => R.createElement(View, null), WebView: () => R.createElement(View, null) };
});
jest.mock('react-native-toast-message', () => ({
  default: () => null,
  Toast: { show: jest.fn() },
}));

// ─── Lucide ───────────────────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const R = require('react');
  const { View } = require('react-native');
  return new Proxy({}, {
    get: (_: any, name: string | symbol) =>
      () => R.createElement(View, { testID: 'icon-' + String(name) }),
  });
});

// ─── Heavy sub-components — stubbed to isolate PublicProfileScreen logic ──────
// HeroSection stub emits testID='hero-section' + athlete name/school/position
// so happy-path tests can confirm profile content rendered.
jest.mock('@/components/HeroSection', () => {
  const R = require('react');
  const { View, Text } = require('react-native');
  return {
    HeroSection: ({ profile }: any) =>
      R.createElement(View, { testID: 'hero-section' },
        R.createElement(Text, null, profile?.full_name ?? 'Unknown'),
        R.createElement(Text, null, profile?.school ?? ''),
        R.createElement(Text, null, profile?.position ?? ''),
      ),
  };
});
jest.mock('@/components/AthleteProfile', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { AthleteProfile: () => R.createElement(View, { testID: 'athlete-profile' }) };
});
jest.mock('@/components/HighlightMediaWindow', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { HighlightMediaWindow: () => R.createElement(View, { testID: 'highlight-window' }) };
});
jest.mock('@/components/Footer', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { Footer: () => R.createElement(View, { testID: 'footer' }) };
});
jest.mock('@/components/BackButton', () => {
  const R = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    BackButton: () =>
      R.createElement(TouchableOpacity, { testID: 'back-button' },
        R.createElement(Text, null, 'Back')),
  };
});
// SEO — default export, returns null
jest.mock('@/components/SEO', () => function SEOStub() { return null; });

// MessageButton and RequestTranscriptButton are kept real so we can assert
// on their rendered text. Their dependencies are mocked below.
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/hooks/useRequestTranscript', () => ({
  useRequestTranscript: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('@/components/ui/Dialog', () => {
  const R = require('react');
  const { View, Text } = require('react-native');
  const Passthrough = ({ children }: any) => R.createElement(View, null, children);
  // DialogDescription always wraps in Text since it only ever contains text nodes.
  // Using View here crashes when children are bare strings or string arrays.
  const TextPassthrough = ({ children }: any) => R.createElement(Text, null, children);
  return {
    Dialog: Passthrough,
    DialogContent: Passthrough,
    DialogHeader: Passthrough,
    DialogTitle: TextPassthrough,
    DialogDescription: TextPassthrough,
    DialogFooter: Passthrough,
  };
});
jest.mock('@/components/ui/Textarea', () => {
  const R = require('react');
  const { TextInput } = require('react-native');
  return { Textarea: (p: any) => R.createElement(TextInput, p) };
});
jest.mock('@/components/ui/Label', () => {
  const R = require('react');
  const { Text } = require('react-native');
  return { Label: ({ children }: any) => R.createElement(Text, null, children) };
});

// ─── Navigator + render helper ────────────────────────────────────────────────
import PublicProfileScreen from '../screens/public/PublicProfileScreen';

const Stack = createNativeStackNavigator();

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

/** Navigate immediately to PublicProfile with the given customUrl. */
async function renderProfile(customUrl: string) {
  function ProfileWrapper() {
    function InitScreen({ navigation }: any) {
      React.useEffect(() => { navigation.replace('PublicProfile', { customUrl }); }, []);
      return null;
    }
    const PublicTabsStub = () => {
      const { View, Text } = require('react-native');
      return <View><Text>PublicTabs</Text></View>;
    };
    return (
      <QueryClientProvider client={makeQC()}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Init" component={InitScreen} />
            <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
            <Stack.Screen name="PublicTabs" component={PublicTabsStub} />
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    );
  }
  return render(<ProfileWrapper />);
}

// ─── Fixture data ─────────────────────────────────────────────────────────────

/** 17-year-old athlete — teen age band, not blocked. */
const VALID_PROFILE = {
  id: 'profile-123',
  user_id: 'user-abc',
  custom_url: 'marcus-johnson',
  is_published: true,
  full_name: 'Marcus Johnson',
  position: 'QB',
  school: 'Lincoln High School',
  graduation_year: '2026',
  city: 'Austin',
  state: 'TX',
  date_of_birth: (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 17);
    return d.toISOString().slice(0, 10);
  })(),
  show_highlight_video: false,
  highlight_video_url: null,
  profile_image_url: null,
  stats: [],
  highlights: [],
};

/** 13-year-old athlete — child band, hard-blocked. */
const MINOR_PROFILE = {
  ...VALID_PROFILE,
  id: 'profile-minor',
  user_id: 'user-minor',
  custom_url: 'under15-athlete',
  full_name: 'Young Athlete',
  date_of_birth: (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    return d.toISOString().slice(0, 10);
  })(),
};

// ─── Setup / teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  // Reset auth to unauthenticated before every test
  mockAuthStore.user = null;
  mockAuthStore.userRole = null;
  mockAuthStore.isLoading = false;
  __clearProfileFixtures();
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('PublicProfileScreen', () => {

  // Test 1 ── valid profile → profile body renders, not error state ────────────
  it('valid non-minor profile: profile content renders, not Profile Not Found', async () => {
    __setProfileFixture('marcus-johnson', VALID_PROFILE);
    __setProfileFixture('profile-123', VALID_PROFILE); // id-based fallback lookup

    const { findByTestId, queryByText } = await renderProfile('marcus-johnson');

    await findByTestId('hero-section');
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      expect(queryByText('Profile Unavailable')).toBeNull();
      expect(queryByText('Marcus Johnson')).toBeTruthy();
      expect(queryByText('QB')).toBeTruthy();
      expect(queryByText('Lincoln High School')).toBeTruthy();
    });
  });

  // Test 2 ── nonexistent slug → "Profile Not Found" ───────────────────────────
  it('nonexistent customUrl: "Profile Not Found" renders', async () => {
    // No fixture → both maybeSingle calls return null → not-found branch
    const { findByText, queryByTestId } = await renderProfile('no-such-profile');

    await findByText('Profile Not Found');
    await waitFor(() => {
      expect(queryByTestId('hero-section')).toBeNull();
      expect(queryByTestId('athlete-profile')).toBeNull();
    });
  });

  // Test 3 ── under-15 → "Profile Unavailable" (privacy regression guard) ──────
  it('under-15 profile: "Profile Unavailable" renders, not profile body', async () => {
    __setProfileFixture('under15-athlete', MINOR_PROFILE);
    __setProfileFixture('profile-minor', MINOR_PROFILE);

    const { findByText, queryByText, queryByTestId } = await renderProfile('under15-athlete');

    await findByText('Profile Unavailable');
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      expect(queryByTestId('hero-section')).toBeNull();
      expect(queryByTestId('athlete-profile')).toBeNull();
    });
  });

  // Test 4 ── unauthenticated viewer → action buttons absent ───────────────────
  // isViewerNotOwner = !!profile?.id && !!user && user.id !== profile.user_id
  // user=null → isViewerNotOwner=false → Message + RequestTranscript hidden
  it('unauthenticated viewer: Message and Request Transcript buttons absent', async () => {
    // mockAuthStore.user is already null from beforeEach
    __setProfileFixture('marcus-johnson', VALID_PROFILE);
    __setProfileFixture('profile-123', VALID_PROFILE);

    const { findByTestId, queryByText } = await renderProfile('marcus-johnson');

    await findByTestId('hero-section');
    await waitFor(() => {
      // Share Profile is always visible (not gated on auth)
      expect(queryByText('Share Profile')).toBeTruthy();
      // Auth-gated buttons must be absent for anonymous viewer
      expect(queryByText('Message')).toBeNull();
      expect(queryByText('Request Transcript')).toBeNull();
    });
  });

  // Test 5 ── authenticated non-owner → action buttons present ─────────────────
  // user.id='other-user' !== profile.user_id='user-abc' → isViewerNotOwner=true
  // Contact gate: AVS row with show_contact_info:true → Message button renders.
  it('authenticated non-owner: Message and Request Transcript buttons present', async () => {
    mockAuthStore.user = { id: 'other-user' };
    mockAuthStore.userRole = 'athlete';
    const PROFILE_WITH_CONTACT = {
      ...VALID_PROFILE,
      athlete_visibility_settings: { show_contact_info: true },
    };
    __setProfileFixture('marcus-johnson', PROFILE_WITH_CONTACT);
    __setProfileFixture('profile-123', PROFILE_WITH_CONTACT);

    const { findByTestId, queryByText } = await renderProfile('marcus-johnson');

    await findByTestId('hero-section');
    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
      expect(queryByText('Message')).toBeTruthy();
      expect(queryByText('Request Transcript')).toBeTruthy();
    });
  });
});
