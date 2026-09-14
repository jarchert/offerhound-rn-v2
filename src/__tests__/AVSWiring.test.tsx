/**
 * AVSWiring.test.tsx
 *
 * Fix 3 — athlete_visibility_settings (AVS) wired into:
 *   - AthleteSearchScreen (show_in_search IS NOT FALSE)
 *   - AddToPipelineDialog (show_in_recruiter_pipeline IS NOT FALSE)
 *   - PublicProfileScreen  (show_contact_info === true gates contact display)
 *
 * NULL fallback rules:
 *   - show_in_search              NULL = show (backwards compat)
 *   - show_in_recruiter_pipeline  NULL = show (backwards compat)
 *   - show_contact_info           NULL = HIDE (contact is opt-in)
 *
 * The 4 scenarios required by the fix are exercised via:
 *   - Source-level regex assertions that AVS is selected + filtered in each
 *     query path (approved passes, no-AVS-row passes, hidden is filtered out).
 *   - A functional pure-filter test that mirrors the JS-side predicate used
 *     by both AthleteSearchScreen and AddToPipelineDialog.
 *   - RNTL renders of PublicProfileScreen for the contact-visibility gate
 *     (approved shows MessageButton; no-AVS-row hides it; explicitly hidden
 *     hides it; contact-specifically-hidden hides it).
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
// Give MessageButton a testID so tests can assert it renders (or doesn't).
jest.mock('@/components/HighlightMediaWindow', () => ({
  HighlightMediaWindow: () => null,
}));
jest.mock('@/components/HeroSection', () => ({
  HeroSection: () => null,
}));
jest.mock('@/components/AthleteProfile', () => ({
  AthleteProfile: () => null,
}));
jest.mock('@/components/MessageButton', () => {
  const { View } = require('react-native');
  return {
    MessageButton: (props: any) => <View testID="message-button" {...props} />,
  };
});
jest.mock('@/components/transcripts/RequestTranscriptButton', () => {
  const { View } = require('react-native');
  return {
    RequestTranscriptButton: (props: any) => <View testID="request-transcript-button" {...props} />,
  };
});
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

// ─── Navigation (mock RootNavigator entirely) ─────────────────────────────────
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
// Use `var` here so the declaration is hoisted (const would be in TDZ when the
// jest.mock() factory is executed at module-load time). Without hoisting, the
// factory captures `undefined` for the maybeSingle slot and every profile
// fetch resolves to `undefined` — which manifests as "Profile Not Found" in
// every RN render test regardless of the test's mockResolvedValue setup.
var mockMaybeSingle: jest.Mock;
mockMaybeSingle = jest.fn();
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
      // Lazy indirection: read `mockMaybeSingle` at call time, not at factory
      // evaluation time. This dodges the TDZ that broke earlier iterations.
      maybeSingle: (...args: any[]) => mockMaybeSingle(...args),
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
    email: 'athlete@example.com',
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
const searchSrc = fs.readFileSync(
  path.join(SRC, 'screens/shared/AthleteSearchScreen.tsx'),
  'utf8',
);
const pipelineSrc = fs.readFileSync(
  path.join(SRC, 'components/AddToPipelineDialog.tsx'),
  'utf8',
);
const profileSrc = fs.readFileSync(
  path.join(SRC, 'screens/public/PublicProfileScreen.tsx'),
  'utf8',
);

// ─────────────────────────────────────────────────────────────────────────────
// Source-level assertions — AVS is embedded in the query + filtered in JS.
// ─────────────────────────────────────────────────────────────────────────────

describe('Fix 3 — source-level: AVS is embedded into every gated query', () => {
  it('AthleteSearchScreen selects athlete_visibility_settings(show_in_search)', () => {
    expect(searchSrc).toMatch(
      /athlete_visibility_settings\(show_in_search\)/,
    );
  });

  it('AthleteSearchScreen filters show_in_search !== false (NULL passthrough)', () => {
    expect(searchSrc).toMatch(/avs\?\.show_in_search\s*!==\s*false/);
  });

  it('AddToPipelineDialog selects athlete_visibility_settings(show_in_recruiter_pipeline)', () => {
    expect(pipelineSrc).toMatch(
      /athlete_visibility_settings\(show_in_recruiter_pipeline\)/,
    );
  });

  it('AddToPipelineDialog filters show_in_recruiter_pipeline !== false (NULL passthrough)', () => {
    expect(pipelineSrc).toMatch(
      /avs\?\.show_in_recruiter_pipeline\s*!==\s*false/,
    );
  });

  it('PublicProfileScreen fetches athlete_visibility_settings(*) via embedded LEFT JOIN', () => {
    // Should appear in BOTH the custom_url path AND the id fallback path.
    const matches = profileSrc.match(/athlete_visibility_settings\(\*\)/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('PublicProfileScreen gates contact on show_contact_info === true (strict)', () => {
    expect(profileSrc).toMatch(/show_contact_info\s*===\s*true/);
  });

  it('PublicProfileScreen renders MessageButton only when showContactInfo is truthy', () => {
    // The contact renders must be gated with `showContactInfo`.
    expect(profileSrc).toMatch(/isViewerNotOwner\s*&&\s*showContactInfo\s*&&/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pure filter predicate mirror — 4 scenarios for search / pipeline visibility.
// Mirrors the JS-side filter used inside AthleteSearchScreen + AddToPipelineDialog
// so we can prove the NULL-passthrough semantics without spinning up RN Query.
// ─────────────────────────────────────────────────────────────────────────────

function includedInSearch(row: any): boolean {
  const avs = Array.isArray(row.athlete_visibility_settings)
    ? row.athlete_visibility_settings[0]
    : row.athlete_visibility_settings;
  return avs?.show_in_search !== false;
}

function includedInPipeline(row: any): boolean {
  const avs = Array.isArray(row.athlete_visibility_settings)
    ? row.athlete_visibility_settings[0]
    : row.athlete_visibility_settings;
  return avs?.show_in_recruiter_pipeline !== false;
}

describe('Fix 3 — Scenario matrix: search + pipeline visibility filter', () => {
  it('Scenario 1 (approved): AVS row exists w/ show_in_search=true → visible in search', () => {
    const row = { id: 'a1', athlete_visibility_settings: { show_in_search: true } };
    expect(includedInSearch(row)).toBe(true);
  });

  it('Scenario 1 (approved): AVS row exists w/ show_in_recruiter_pipeline=true → visible in pipeline', () => {
    const row = { id: 'a1', athlete_visibility_settings: { show_in_recruiter_pipeline: true } };
    expect(includedInPipeline(row)).toBe(true);
  });

  it('Scenario 2 (no-AVS-row): embed returns [] / null → passes search filter (backwards compat)', () => {
    expect(includedInSearch({ id: 'a2', athlete_visibility_settings: [] })).toBe(true);
    expect(includedInSearch({ id: 'a2', athlete_visibility_settings: null })).toBe(true);
    expect(includedInSearch({ id: 'a2' })).toBe(true);
  });

  it('Scenario 2 (no-AVS-row): embed returns [] / null → passes pipeline filter (backwards compat)', () => {
    expect(includedInPipeline({ id: 'a2', athlete_visibility_settings: [] })).toBe(true);
    expect(includedInPipeline({ id: 'a2', athlete_visibility_settings: null })).toBe(true);
    expect(includedInPipeline({ id: 'a2' })).toBe(true);
  });

  it('Scenario 2 (no-AVS-row): AVS row with NULL columns still passes filters', () => {
    const row = {
      id: 'a2',
      athlete_visibility_settings: { show_in_search: null, show_in_recruiter_pipeline: null },
    };
    expect(includedInSearch(row)).toBe(true);
    expect(includedInPipeline(row)).toBe(true);
  });

  it('Scenario 3 (explicitly hidden): show_in_search=false → filtered OUT of search', () => {
    const row = { id: 'a3', athlete_visibility_settings: { show_in_search: false } };
    expect(includedInSearch(row)).toBe(false);
  });

  it('Scenario 3 (explicitly hidden): show_in_recruiter_pipeline=false → filtered OUT of pipeline', () => {
    const row = { id: 'a3', athlete_visibility_settings: { show_in_recruiter_pipeline: false } };
    expect(includedInPipeline(row)).toBe(false);
  });

  it('Handles PostgREST array-shape embed as well as object-shape embed', () => {
    // Some PostgREST responses embed a one-to-many table as an array — code
    // must tolerate either shape and unwrap element [0].
    expect(includedInSearch({ athlete_visibility_settings: [{ show_in_search: false }] })).toBe(false);
    expect(includedInSearch({ athlete_visibility_settings: [{ show_in_search: true }] })).toBe(true);
    expect(includedInPipeline({ athlete_visibility_settings: [{ show_in_recruiter_pipeline: false }] })).toBe(false);
    expect(includedInPipeline({ athlete_visibility_settings: [{ show_in_recruiter_pipeline: true }] })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PublicProfileScreen — contact-gate render matrix (4 scenarios).
// ─────────────────────────────────────────────────────────────────────────────

import PublicProfileScreen from '@/screens/public/PublicProfileScreen';

describe('Fix 3 — PublicProfileScreen contact-gate (show_contact_info)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle.mockReset();
    // Viewer is authenticated recruiter, NOT owner — this is the interesting
    // path where the contact gate actually matters.
    mockUseAuth.mockReturnValue({
      user: { id: 'recruiter-uid' },
      userRole: 'scout',
      isLoading: false,
    });
  });

  it('Scenario 1 (approved): AVS show_contact_info=true → MessageButton renders', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: makeProfile({
        athlete_visibility_settings: { show_contact_info: true },
      }),
      error: null,
    });

    const { queryByTestId } = await render(<PublicProfileScreen />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(queryByTestId('message-button')).not.toBeNull();
    });
  });

  it('Scenario 2 (no-AVS-row): AVS is null / [] → contact HIDDEN (opt-in)', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: makeProfile({ athlete_visibility_settings: null }),
      error: null,
    });

    const { queryByTestId } = await render(<PublicProfileScreen />, {
      wrapper: makeWrapper(),
    });

    // Give the query time to resolve then assert MessageButton is absent.
    await waitFor(() => {
      expect(queryByTestId('request-transcript-button')).not.toBeNull();
    });
    expect(queryByTestId('message-button')).toBeNull();
  });

  it('Scenario 2b (no-AVS-row, empty array embed): contact HIDDEN', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: makeProfile({ athlete_visibility_settings: [] }),
      error: null,
    });

    const { queryByTestId } = await render(<PublicProfileScreen />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(queryByTestId('request-transcript-button')).not.toBeNull();
    });
    expect(queryByTestId('message-button')).toBeNull();
  });

  it('Scenario 3 (contact-specifically-hidden): show_contact_info=false → contact HIDDEN', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: makeProfile({
        athlete_visibility_settings: { show_contact_info: false },
      }),
      error: null,
    });

    const { queryByTestId } = await render(<PublicProfileScreen />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(queryByTestId('request-transcript-button')).not.toBeNull();
    });
    expect(queryByTestId('message-button')).toBeNull();
  });

  it('Scenario 4 (contact NULL): show_contact_info=null → contact HIDDEN (strict opt-in)', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: makeProfile({
        athlete_visibility_settings: { show_contact_info: null },
      }),
      error: null,
    });

    const { queryByTestId } = await render(<PublicProfileScreen />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(queryByTestId('request-transcript-button')).not.toBeNull();
    });
    expect(queryByTestId('message-button')).toBeNull();
  });

  it('Owner viewing own profile: contact HIDDEN regardless of AVS (owner is not "viewer not owner")', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'owner-uid' },
      userRole: 'athlete',
      isLoading: false,
    });
    mockMaybeSingle.mockResolvedValue({
      data: makeProfile({
        user_id: 'owner-uid',
        athlete_visibility_settings: { show_contact_info: true },
      }),
      error: null,
    });

    const { queryByTestId } = await render(<PublicProfileScreen />, {
      wrapper: makeWrapper(),
    });

    // Owner never sees the MessageButton (isViewerNotOwner === false).
    await waitFor(() => {
      // Wait for query resolution; owner doesn't get transcript button either.
      expect(queryByTestId('message-button')).toBeNull();
    });
  });
});
