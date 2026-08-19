/**
 * IsPublishedGate.test.tsx
 *
 * Tests for:
 * Fix 1 — AthleteSearchScreen: query must include .eq('is_published', true)
 *   Source-level assertion: no render needed, just check the query chain text.
 *
 * Fix 2 — PublicProfileScreen: non-owner visitors cannot view unpublished profiles.
 *   RNTL rendering with a fully mocked native dep stack (same discipline as
 *   PublicDiscoverNavigation.test.tsx).
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
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

// ─── Expo native deps ─────────────────────────────────────────────────────────
jest.mock('expo-audio', () => ({}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { All: 'All', Images: 'Images', Videos: 'Videos' },
}));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  setNotificationHandler: jest.fn(),
}));
jest.mock('expo-tracking-transparency', () => ({
  requestTrackingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
}));
jest.mock('expo-iap', () => ({}));
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));
jest.mock('@react-native-masked-view/masked-view', () => ({
  default: ({ children }: any) => children,
}));
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));
jest.mock('expo-asset', () => ({ Asset: { loadAsync: jest.fn() } }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(),
  preventAutoHideAsync: jest.fn(),
}));
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
}));

// ─── Heavy components with native video/media deps ────────────────────────────
jest.mock('@/components/HighlightMediaWindow', () => ({
  HighlightMediaWindow: () => null,
}));
jest.mock('@/components/HeroSection', () => ({
  HeroSection: () => null,
}));
jest.mock('@/components/AthleteProfile', () => ({
  AthleteProfile: () => null,
}));
jest.mock('@/components/MessageButton', () => ({
  MessageButton: () => null,
}));
jest.mock('@/components/transcripts/RequestTranscriptButton', () => ({
  RequestTranscriptButton: () => null,
}));
jest.mock('@/components/SEO', () => () => null);
jest.mock('@/components/Footer', () => ({ Footer: () => null }));
jest.mock('@/components/BackButton', () => ({ BackButton: () => null }));
jest.mock('@/components/FloatingAICoach', () => ({ FloatingAICoach: () => null }));
jest.mock('@/components/Paywall', () => ({ Paywall: () => null }));
jest.mock('@shopify/flash-list', () => ({ FlashList: () => null }));
jest.mock('@/lib/assets', () => ({ ATHLETE_ACTION_IMG: '' }));
jest.mock('@/lib/pricing', () => ({ PRICING_TIERS: [] }));
jest.mock('@/lib/platform', () => ({ shouldHidePricingUI: () => true }));
jest.mock('@/lib/iap', () => ({
  initIAP: jest.fn(),
  getProducts: jest.fn().mockResolvedValue([]),
}));

// ─── Navigation (mock RootNavigator entirely — requireActual pulls in CoachTabs/CampManagerPaywall) ──
jest.mock('@/navigation/RootNavigator', () => ({
  default: () => null,
  roleToInitialRoute: (role: string | null) => {
    switch (role) {
      case 'athlete': return 'AthleteTabs';
      case 'coach': return 'CoachTabs';
      case 'scout': return 'ScoutTabs';
      case 'parent': return 'ParentTabs';
      default: return 'LandingTab';
    }
  },
}));
jest.mock('@/navigation/stacks/PublicProfileStack', () => ({ PublicProfileStack: () => null }));
jest.mock('react-native-toast-message', () => ({
  default: () => null,
  Toast: { show: jest.fn() },
}));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ refresh: jest.fn() }) }));
jest.mock('@/contexts/SportContext', () => ({
  useSport: () => ({ sport: 'Football' }),
  SportProvider: ({ children }: any) => children,
}));
jest.mock('@/contexts/ImpersonationContext', () => ({
  useImpersonation: () => ({ isImpersonating: false }),
  ImpersonationProvider: ({ children }: any) => children,
}));

// ─── Supabase ─────────────────────────────────────────────────────────────────
const mockMaybeSingle = jest.fn();
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  SUPABASE_URL: 'https://test.supabase.co',
}));

// ─── Auth ─────────────────────────────────────────────────────────────────────
const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

// ─── Downstream hooks ─────────────────────────────────────────────────────────
jest.mock('@/hooks/useCoachProfile', () => ({ useCoachProfile: () => ({ data: null }) }));
jest.mock('@/hooks/useScoutProfile', () => ({ useScoutProfile: () => ({ data: null }) }));
jest.mock('@/hooks/useHSCoachProfile', () => ({ useHSCoachProfile: () => ({ data: null }) }));
jest.mock('@/hooks/useScoutSavedAthletes', () => ({
  useScoutSavedAthletes: () => ({ data: [] }),
  useScoutSaveAthlete: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/hooks/useScoutOrganization', () => ({
  useScoutOrganization: () => ({ organization: null, isLoading: false }),
}));

// ─── Navigation mock ──────────────────────────────────────────────────────────
const mockDispatch = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: jest.fn(() => ({ params: { customUrl: 'test-slug' } })),
    useNavigation: jest.fn(() => ({
      dispatch: mockDispatch,
      navigate: jest.fn(),
      goBack: jest.fn(),
    })),
  };
});

// ─── lucide-react-native stub ─────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prof-1',
    user_id: 'owner-uid',
    full_name: 'Test Athlete',
    is_published: true,
    is_minor_safe: false,
    date_of_birth: '2005-01-01',
    custom_url: 'test-slug',
    position: 'WR',
    sport: 'Football',
    school: 'Test High',
    graduation_year: '2024',
    city: 'Austin',
    state: 'TX',
    profile_image_url: null,
    banner_image_url: null,
    highlight_video_url: null,
    show_highlight_video: false,
    ...overrides,
  };
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <NavigationContainer>{children}</NavigationContainer>
    </QueryClientProvider>
  );
}

const SRC = path.resolve(__dirname, '..');

// ─────────────────────────────────────────────────────────────────────────────
// Fix 1: AthleteSearchScreen — is_published source assertion
// ─────────────────────────────────────────────────────────────────────────────

describe('Fix 1 — AthleteSearchScreen: is_published filter added to query', () => {
  const src = fs.readFileSync(
    path.join(SRC, 'screens/shared/AthleteSearchScreen.tsx'),
    'utf8',
  );

  it("query chain contains .eq('is_published', true)", () => {
    expect(src).toMatch(/\.eq\(['"]is_published['"],\s*true\)/);
  });

  it('is_published filter appears before the DOB cutoff .or() in the query chain', () => {
    const pubIdx = src.indexOf("eq('is_published', true)");
    const dobIdx = src.indexOf('.or(`date_of_birth.is.null');
    expect(pubIdx).toBeGreaterThan(-1);
    expect(dobIdx).toBeGreaterThan(-1);
    // is_published must be chained before the DOB .or()
    expect(pubIdx).toBeLessThan(dobIdx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fix 2: PublicProfileScreen — is_published gate rendering
// ─────────────────────────────────────────────────────────────────────────────

import PublicProfileScreen from '@/screens/public/PublicProfileScreen';

describe('Fix 2 — PublicProfileScreen: is_published gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle.mockReset();
    // Default auth: unauthenticated
    mockUseAuth.mockReturnValue({ user: null, userRole: null, isLoading: false });
  });

  it('shows "Profile Not Found" when is_published=false and viewer is a different user', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'other-uid' }, userRole: 'scout', isLoading: false });
    mockMaybeSingle.mockResolvedValue({
      data: makeProfile({ is_published: false, user_id: 'owner-uid' }),
      error: null,
    });

    const { getByText } = await render(<PublicProfileScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(getByText('Profile Not Found')).toBeTruthy();
    });
  });

  it('shows "Profile Not Found" when is_published=false and viewer is unauthenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null, userRole: null, isLoading: false });
    mockMaybeSingle.mockResolvedValue({
      data: makeProfile({ is_published: false }),
      error: null,
    });

    const { getByText } = await render(<PublicProfileScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(getByText('Profile Not Found')).toBeTruthy();
    });
  });

  it('does NOT gate when is_published=false and viewer IS the profile owner (draft preview)', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'owner-uid' },
      userRole: 'athlete',
      isLoading: false,
    });
    mockMaybeSingle.mockResolvedValue({
      data: makeProfile({ is_published: false, user_id: 'owner-uid' }),
      error: null,
    });

    const { queryByText } = await render(<PublicProfileScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      // Profile renders, gate screen does not
      expect(queryByText('Profile Not Found')).toBeNull();
    });
  });

  it('renders the profile normally when is_published=true regardless of viewer', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'recruiter-uid' },
      userRole: 'scout',
      isLoading: false,
    });
    mockMaybeSingle.mockResolvedValue({
      data: makeProfile({ is_published: true }),
      error: null,
    });

    const { queryByText } = await render(<PublicProfileScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(queryByText('Profile Not Found')).toBeNull();
    });
  });
});
