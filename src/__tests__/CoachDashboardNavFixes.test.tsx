// src/__tests__/CoachDashboardNavFixes.test.tsx
// Real RNTL tests for all 9 nav fixes.
//
// Bug 2  — ClubCoachDashboardScreen: 3× AthleteTabs → AthleteSearch
// Bug 3  — HSCoachDashboardScreen: Find Athletes + College Coaches QuickActions wired
// Bug 4  — HSCoachDashboardScreen: profile-summary "Search Athletes" onPress added
// Bug 5  — HSCoachDashboardScreen: AI Matches + Saved empty-state onPress added
// Bug 6  — HSCoachDashboardScreen: "View Profile" → PublicProfileStack
// Bug 7  — ClubCoachDashboardScreen: "View Profile" → PublicProfileStack
// New Bug A — ScoutDirectoryScreen: handleOpenProfile → PublicScoutProfile (not LetterComposer)
// New Bug B — CoachDirectoryScreen: Saved button → SavedCoaches
// New Bug D — PublicProfileScreen: coach viewer sees AI Letter button → LetterComposer

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ─── AsyncStorage ──────────────────────────────────────────────────────────────
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

// ─── Supabase ─────────────────────────────────────────────────────────────────
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockImplementation((cb: any) =>
        Promise.resolve(cb({ data: [], error: null })),
      ),
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// ─── react-query ─────────────────────────────────────────────────────────────
const mockUseQuery = jest.fn(() => ({ data: undefined, isLoading: false, error: null }));
const mockUseMutation = jest.fn(() => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn(),
  isLoading: false,
  isPending: false,
  isSuccess: false,
}));
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (...args: any[]) => mockUseQuery(...args),
    useMutation: (...args: any[]) => mockUseMutation(...args),
    useQueryClient: () => ({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
    }),
  };
});

// ─── Navigation ────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
let mockRouteParams: Record<string, any> = {};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      reset: jest.fn(),
      canGoBack: jest.fn(() => false),
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({ params: mockRouteParams, key: 'test', name: 'Test' }),
    NavigationContainer: ({ children }: any) => children,
  };
});

// ─── Platform ─────────────────────────────────────────────────────────────────
jest.mock('@/lib/platform', () => ({ isNativePlatform: jest.fn(() => true) }));

// ─── Auth contexts ─────────────────────────────────────────────────────────────
const MOCK_USER = { id: 'user-1' };

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: MOCK_USER,
    userRole: 'coach',
    isLoading: false,
    signOut: jest.fn(),
  }),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: MOCK_USER,
    isAuthenticated: true,
    loading: false,
    authLoading: false,
    signOut: jest.fn(),
  }),
}));
jest.mock('@/contexts/ImpersonationContext', () => ({
  ImpersonationProvider: ({ children }: any) => children,
  useImpersonation: () => ({ isImpersonating: false }),
}));

// ─── Profile hooks (mutable) ──────────────────────────────────────────────────
const mockCoachProfile = jest.fn(() => ({
  data: { id: 'cp-1', user_id: 'user-1', is_club_coach: true, full_name: 'Coach User' },
  isLoading: false,
  isFetched: true,
}));
const mockHSCoachProfile = jest.fn(() => ({
  data: { id: 'hs-1', user_id: 'user-1', school_name: 'Test HS', sport: 'Football' },
}));
const mockScoutProfile = jest.fn(() => ({ data: null }));
const mockPlayerProfile = jest.fn(() => ({ profile: null, isLoading: false }));

jest.mock('@/hooks/useCoachProfile', () => ({
  useCoachProfile: (...a: any[]) => mockCoachProfile(...a),
}));
jest.mock('@/hooks/useHSCoachProfile', () => ({
  useHSCoachProfile: (...a: any[]) => mockHSCoachProfile(...a),
  useUpdateHSCoachProfile: () => jest.fn(),
}));
jest.mock('@/hooks/useScoutProfile', () => ({
  useScoutProfile: (...a: any[]) => mockScoutProfile(...a),
}));
jest.mock('@/hooks/usePlayerProfile', () => ({
  usePlayerProfile: (...a: any[]) => mockPlayerProfile(...a),
}));

// ─── Saved athletes / coaches ─────────────────────────────────────────────────
const mockSavedAthletes = jest.fn(() => ({ data: [] }));
const mockSavedCoaches = jest.fn(() => ({ data: [] }));

jest.mock('@/hooks/useSavedAthletes', () => ({
  useSavedAthletes: (...a: any[]) => mockSavedAthletes(...a),
  useSaveAthlete: () => ({ mutate: jest.fn() }),
  useRemoveSavedAthlete: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/hooks/useSavedCoaches', () => ({
  useSavedCoaches: (...a: any[]) => mockSavedCoaches(...a),
  useSaveCoach: () => ({ mutate: jest.fn() }),
  useRemoveSavedCoach: () => ({ mutate: jest.fn() }),
}));

// ─── Other hooks ──────────────────────────────────────────────────────────────
const mockCoachAthleteMatches = jest.fn(() => ({ data: [], isLoading: false }));

jest.mock('@/hooks/useCoachAthleteMatches', () => ({
  useCoachAthleteMatches: (...a: any[]) => mockCoachAthleteMatches(...a),
}));
jest.mock('@/hooks/useRefreshCoachAthleteMatches', () => ({
  useRefreshCoachAthleteMatches: () => ({ refreshMatches: jest.fn(), isRefreshing: false }),
}));
jest.mock('@/hooks/useTermsAcceptance', () => ({
  useHasAcceptedTerms: () => ({ hasAccepted: true, isLoading: false }),
}));
jest.mock('@/hooks/useCoachActivity', () => ({
  useCoachActivityStats: () => ({ data: null }),
}));
jest.mock('@/hooks/useAthleteMatches', () => ({
  useAthleteMatches: () => ({ data: [], isLoading: false }),
  useCoachAthleteMatches: () => ({ data: [], isLoading: false }),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@/hooks/useScoutOrganization', () => ({
  useScoutOrganization: () => ({ organization: null, isLoading: false }),
}));
jest.mock('@/hooks/useRecordContactEvent', () => ({
  useRecordContactEvent: () => ({ mutate: jest.fn() }),
}));

// ─── RootNavigator ────────────────────────────────────────────────────────────
jest.mock('@/navigation/RootNavigator', () => ({
  roleToInitialRoute: jest.fn(() => 'LandingTab'),
}));

// ─── Lucide icons ─────────────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const R = require('react');
  return new Proxy(
    {},
    {
      get: (_t: any, name: string) =>
        function MockIcon(props: any) {
          return R.createElement(View, { testID: `icon-${name}`, ...props });
        },
    },
  );
});

// ─── Expo / native modules ────────────────────────────────────────────────────
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  shareAsync: jest.fn(),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { LinearGradient: (p: any) => R.createElement(View, p) };
});
jest.mock('react-native-toast-message', () => ({ show: jest.fn(), hide: jest.fn() }));
jest.mock('@react-native-masked-view/masked-view', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { default: ({ children }: any) => R.createElement(View, {}, children) };
});

// ─── Component stubs ──────────────────────────────────────────────────────────
const Null = () => null;
jest.mock('@/components/Footer', () => ({ Footer: Null }));
jest.mock('@/components/SEO', () => ({ __esModule: true, default: Null }));
jest.mock('@/components/BackButton', () => ({ BackButton: Null }));
jest.mock('@/components/HeroSection', () => ({ HeroSection: Null }));
jest.mock('@/components/AthleteProfile', () => ({ AthleteProfile: Null }));
jest.mock('@/components/HighlightMediaWindow', () => ({ HighlightMediaWindow: Null }));
jest.mock('@/components/MessageButton', () => ({ MessageButton: Null }));
jest.mock('@/components/transcripts/RequestTranscriptButton', () => ({
  RequestTranscriptButton: Null,
}));
jest.mock('@/components/athlete/AthleteMatchCard', () => ({
  __esModule: true,
  default: Null,
  AthleteMatchCard: Null,
}));
jest.mock('@/components/ClubTeamManagement', () => ({ ClubTeamManagement: Null }));
jest.mock('@/components/CoachNav', () => ({ CoachNav: Null }));
jest.mock('@/components/ClubCoachCRM', () => ({ ClubCoachCRM: Null }));
jest.mock('@/components/ClubCoachMessagingHub', () => ({ ClubCoachMessagingHub: Null }));
jest.mock('@/components/StaffManager', () => ({ StaffManager: Null }));
jest.mock('@/components/StaffMessaging', () => ({ StaffMessaging: Null }));
jest.mock('@/components/ClubMediaGallery', () => ({ ClubMediaGallery: Null }));
jest.mock('@/components/ClubEventCalendar', () => ({ ClubEventCalendar: Null }));
jest.mock('@/components/ClubSocialLinks', () => ({ ClubSocialLinks: Null }));
jest.mock('@/components/club/ClubCoachDirectoryTab', () => ({ ClubCoachDirectoryTab: Null }));
jest.mock('@/components/TransferPortalFeed', () => ({ TransferPortalFeed: Null }));
jest.mock('@/components/CampManagerDashboard', () => ({ CampManagerDashboard: Null }));
jest.mock('@/components/ShareRoleCardDialog', () => ({ ShareRoleCardDialog: Null }));
jest.mock('@/components/club/WebsiteIntegrationDecisionModal', () => ({
  WebsiteIntegrationDecisionModal: Null,
}));
jest.mock('@/components/TermsAcceptanceGate', () => ({
  TermsAcceptanceGate: ({ children }: any) => children,
}));
jest.mock('@/components/PositionNeedsBoard', () => ({ PositionNeedsBoard: Null }));
jest.mock('@/components/RecruitingPipeline', () => ({ RecruitingPipeline: Null }));
jest.mock('@/components/CoachProfileImageUpload', () => ({
  __esModule: true,
  default: Null,
  CoachProfileImageUpload: Null,
}));
jest.mock('@/components/hs-coach/HSClubRosterBrowse', () => ({ HSClubRosterBrowse: Null }));
jest.mock('@/components/hs-coach/HSCoachEndorsementComposer', () => ({
  HSCoachEndorsementComposer: Null,
}));
jest.mock('@/components/hs-coach/HSCoachFilmVerificationTab', () => ({
  HSCoachFilmVerificationTab: Null,
}));
jest.mock('@/components/hs-coach/HSCoachReferralPanel', () => ({
  HSCoachReferralPanel: Null,
}));
jest.mock('@/components/hs-coach/HSCoachTranscriptVerificationTab', () => ({
  HSCoachTranscriptVerificationTab: Null,
}));
jest.mock('@/components/hs-coach/HSTransferRequests', () => ({
  HSTransferRequests: Null,
}));
jest.mock('@/components/DashboardCoachDirectory', () => ({
  __esModule: true,
  default: Null,
}));

// ─── lib utils ────────────────────────────────────────────────────────────────
jest.mock('@/lib/utils/nameSorting', () => ({
  partitionByFullName: (arr: any[], _fn: any) => arr,
  compareByFullNamePresence: () => 0,
}));
jest.mock('@/lib/utils/sportMatching', () => ({
  extractSports: () => [],
  sportsOverlap: () => true,
}));
jest.mock('@/lib/getAgeBand', () => ({
  getAgeBand: () => 'teen',
}));

// ─── Global beforeEach ────────────────────────────────────────────────────────
beforeEach(() => {
  mockNavigate.mockClear();
  // Use mockClear (not mockReset) to clear call history while preserving
  // implementations. mockReset would wipe the mock entirely, breaking
  // subsequent test files that share the same mock module.
  mockUseQuery.mockClear();
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  mockSavedAthletes.mockReturnValue({ data: [] });
  mockSavedCoaches.mockReturnValue({ data: [] });
  mockCoachAthleteMatches.mockReturnValue({ data: [], isLoading: false });
  mockCoachProfile.mockReturnValue({
    data: { id: 'cp-1', user_id: 'user-1', is_club_coach: true, full_name: 'Coach User' },
    isLoading: false,
    isFetched: true,
  });
  mockHSCoachProfile.mockReturnValue({
    data: { id: 'hs-1', user_id: 'user-1', school_name: 'Test HS', sport: 'Football' },
  });
  mockPlayerProfile.mockReturnValue({ profile: null, isLoading: false });
  mockRouteParams = {};
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bug 2 + Bug 7 — ClubCoachDashboardScreen
// ═══════════════════════════════════════════════════════════════════════════════
describe('ClubCoachDashboardScreen — Bugs 2 & 7', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ClubCoach: React.ComponentType<any>;

  const CLUB_PROFILE = {
    id: 'club-1',
    user_id: 'user-1',
    club_name: 'Club FC',
    sport: 'Soccer',
    city: 'Austin',
    state: 'TX',
    is_club_coach: true,
  };

  beforeAll(() => {
    ClubCoach = require('@/screens/club/ClubCoachDashboardScreen').default;
  });

  beforeEach(() => {
    // ClubCoachDashboardScreen guard: `if (!profile || !clubProfile) return null`
    // clubProfile comes from useQuery(['club-coach-profile-full', ...])
    // We must return a real value for that key or the screen renders null.
    mockUseQuery.mockImplementation(({ queryKey }: any) => {
      const k = Array.isArray(queryKey) ? queryKey[0] : null;
      if (k === 'club-coach-profile-full') {
        return { data: CLUB_PROFILE, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });
  });

  it('Bug 2a: banner Search → AthleteSearch, not AthleteTabs', async () => {
    const { getByText } = await render(<ClubCoach />);
    await act(async () => {});
    fireEvent.press(getByText('Search'));
    expect(mockNavigate).toHaveBeenCalledWith('AthleteSearch');
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'AthleteTabs',
      expect.anything(),
    );
  });

  it('Bug 2b: Quick Actions Find Athletes → AthleteSearch', async () => {
    const { getByText } = await render(<ClubCoach />);
    await act(async () => {});
    fireEvent.press(getByText('Find Athletes'));
    expect(mockNavigate).toHaveBeenCalledWith('AthleteSearch');
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'AthleteTabs',
      expect.anything(),
    );
  });

  it('Bug 2c: Saved empty-state Search Athletes → AthleteSearch', async () => {
    mockSavedAthletes.mockReturnValue({ data: [] });
    const { getAllByText } = await render(<ClubCoach />);
    await act(async () => {});
    // Switch to the Saved (athletes) tab inside act to settle state
    await act(async () => {
      const savedTabs = getAllByText('Saved');
      fireEvent.press(savedTabs[0]);
    });
    const btns = getAllByText('Search Athletes');
    fireEvent.press(btns[btns.length - 1]);
    expect(mockNavigate).toHaveBeenCalledWith('AthleteSearch');
    expect(mockNavigate).not.toHaveBeenCalledWith('AthleteTabs');
  });

  it('Bug 7: View Profile in saved list → PublicProfileStack/PublicProfile', async () => {
    mockSavedAthletes.mockReturnValue({
      data: [
        {
          id: 'sa-1',
          athlete: {
            id: 'ath-1',
            full_name: 'Test Athlete',
            position: 'QB',
            school: 'Test HS',
            custom_url: 'test-athlete',
          },
          priority: 'high',
        },
      ],
    });
    const { getAllByText, getByText } = await render(<ClubCoach />);
    await act(async () => {});
    // Switch to Saved tab inside act to settle state
    await act(async () => {
      const savedTabs = getAllByText('Saved');
      fireEvent.press(savedTabs[0]);
    });
    fireEvent.press(getByText('View Profile'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'PublicProfileStack',
      expect.objectContaining({ screen: 'PublicProfile', params: expect.objectContaining({ customUrl: 'test-athlete' }) }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bugs 3, 4, 5, 6 — HSCoachDashboardScreen
// ═══════════════════════════════════════════════════════════════════════════════
describe('HSCoachDashboardScreen — Bugs 3, 4, 5, 6', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let HSCoach: React.ComponentType<any>;

  beforeAll(() => {
    // HS coach has no club-coach profile
    mockCoachProfile.mockReturnValue({ data: null, isLoading: false, isFetched: true });
    HSCoach = require('@/screens/hs-coach/HSCoachDashboardScreen').default;
  });

  beforeEach(() => {
    mockCoachProfile.mockReturnValue({ data: null, isLoading: false, isFetched: true });
  });

  it('Bug 4: profile-summary Search Athletes has onPress → AthleteSearch', async () => {
    const { getAllByText } = await render(<HSCoach />);
    await act(async () => {});
    const btns = getAllByText('Search Athletes');
    fireEvent.press(btns[0]);
    expect(mockNavigate).toHaveBeenCalledWith('AthleteSearch');
  });

  it('Bug 3a: Quick Actions Find Athletes → AthleteSearch', async () => {
    const { getByText } = await render(<HSCoach />);
    await act(async () => {});
    fireEvent.press(getByText('Find Athletes'));
    expect(mockNavigate).toHaveBeenCalledWith('AthleteSearch');
  });

  it('Bug 3b: Quick Actions College Coaches → CoachDirectory', async () => {
    const { getByText } = await render(<HSCoach />);
    await act(async () => {});
    fireEvent.press(getByText('College Coaches'));
    expect(mockNavigate).toHaveBeenCalledWith('CoachDirectory');
  });

  it('Bug 5a: AI Matches empty-state Search Athletes → AthleteSearch', async () => {
    mockCoachAthleteMatches.mockReturnValue({ data: [], isLoading: false });
    const { getAllByText } = await render(<HSCoach />);
    await act(async () => {});
    const btns = getAllByText('Search Athletes');
    fireEvent.press(btns[0]);
    expect(mockNavigate).toHaveBeenCalledWith('AthleteSearch');
  });

  it('Bug 5b: Saved empty-state Search Athletes → AthleteSearch', async () => {
    mockSavedAthletes.mockReturnValue({ data: [] });
    const { getAllByText } = await render(<HSCoach />);
    await act(async () => {});
    const btns = getAllByText('Search Athletes');
    fireEvent.press(btns[btns.length - 1]);
    expect(mockNavigate).toHaveBeenCalledWith('AthleteSearch');
  });

  it('Bug 6: View Profile in saved list → PublicProfileStack/PublicProfile', async () => {
    mockSavedAthletes.mockReturnValue({
      data: [
        {
          id: 'sv-1',
          athlete: {
            id: 'ath-2',
            full_name: 'Jane Doe',
            position: 'WR',
            school: 'Central HS',
          },
          priority: 'normal',
        },
      ],
    });
    const { getByText } = await render(<HSCoach />);
    await act(async () => {});
    // Switch to the Saved (athletes) tab inside act to settle state
    await act(async () => {
      fireEvent.press(getByText('Saved'));
    });
    fireEvent.press(getByText('View Profile'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'PublicProfileStack',
      expect.objectContaining({ screen: 'PublicProfile' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// New Bug A — ScoutDirectoryScreen
// ═══════════════════════════════════════════════════════════════════════════════
describe('ScoutDirectoryScreen — New Bug A', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ScoutDir: React.ComponentType<any>;

  beforeAll(() => {
    mockCoachProfile.mockReturnValue({ data: null, isLoading: false, isFetched: true });
    mockScoutProfile.mockReturnValue({ data: null });
    mockPlayerProfile.mockReturnValue({ profile: { id: 'ath-1' }, isLoading: false });
    ScoutDir = require('@/screens/scout/ScoutDirectoryScreen').default;
  });

  it('tapping a scout card → PublicScoutProfile, not LetterComposer', async () => {
    mockUseQuery.mockImplementation(({ queryKey }: any) => {
      const k = Array.isArray(queryKey) ? queryKey[0] : null;
      if (k === 'scout-directory') {
        return {
          data: [
            {
              id: 'sc-1',
              name: 'John Scout',
              title: 'Regional Scout',
              company: 'Acme Sports',
              email: 'js@acme.com',
              is_verified: true,
            },
          ],
          isLoading: false,
        };
      }
      return { data: undefined, isLoading: false };
    });

    const { getByText } = await render(<ScoutDir />);
    await act(async () => {});

    // The outer Pressable wraps CoachMatchCard which renders coach.name
    fireEvent.press(getByText('John Scout'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'PublicProfileStack',
      expect.objectContaining({
        screen: 'PublicScoutProfile',
        params: expect.objectContaining({ scoutId: 'sc-1' }),
      }),
    );
    // Must NOT fall back to LetterComposer
    const letterCalls = mockNavigate.mock.calls.filter((c: any) => c[0] === 'LetterComposer');
    expect(letterCalls).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// New Bug B — CoachDirectoryScreen
// ═══════════════════════════════════════════════════════════════════════════════
describe('CoachDirectoryScreen — New Bug B', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let CoachDir: React.ComponentType<any>;

  beforeAll(() => {
    mockCoachProfile.mockReturnValue({
      data: {
        id: 'cp-1',
        user_id: 'user-1',
        is_club_coach: false,
        full_name: 'College Coach',
      },
      isLoading: false,
      isFetched: true,
    });
    CoachDir = require('@/screens/shared/CoachDirectoryScreen').default;
  });

  beforeEach(() => {
    mockCoachProfile.mockReturnValue({
      data: {
        id: 'cp-1',
        user_id: 'user-1',
        is_club_coach: false,
        full_name: 'College Coach',
      },
      isLoading: false,
      isFetched: true,
    });
    mockSavedCoaches.mockReturnValue({ data: [] });
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it('"Saved (0)" button → SavedCoaches', async () => {
    const { getByText } = await render(<CoachDir />);
    await act(async () => {});
    const btn = getByText(/Saved/);
    fireEvent.press(btn);
    // navigate is called with a single arg ('SavedCoaches') — no params object
    expect(mockNavigate).toHaveBeenCalledWith('SavedCoaches');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// New Bug D — PublicProfileScreen
// ═══════════════════════════════════════════════════════════════════════════════
describe('PublicProfileScreen — New Bug D', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PubProfile: React.ComponentType<any>;

  const PROFILE = {
    id: 'athlete-1',
    user_id: 'other-user',
    full_name: 'Jane Doe',
    position: 'QB',
    is_published: true,
    date_of_birth: '2000-01-01',
    athlete_visibility_settings: [{ show_contact_info: true }],
  };

  beforeAll(() => {
    PubProfile = require('@/screens/public/PublicProfileScreen').default;
  });

  beforeEach(() => {
    mockRouteParams = { customUrl: 'jane-doe' };
    mockUseQuery.mockImplementation(({ queryKey }: any) => {
      const k = Array.isArray(queryKey) ? queryKey[0] : null;
      if (k === 'public-profile') {
        return { data: PROFILE, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });
  });

  it('college coach viewer sees AI Letter button', async () => {
    mockCoachProfile.mockReturnValue({
      data: { id: 'cp-1', is_club_coach: false },
      isLoading: false,
      isFetched: true,
    });
    mockHSCoachProfile.mockReturnValue({ data: null });

    const { getByText } = await render(<PubProfile />);
    await act(async () => {});
    expect(getByText('AI Letter')).toBeTruthy();
  });

  it('college coach AI Letter → LetterComposer with athlete seed', async () => {
    mockCoachProfile.mockReturnValue({
      data: { id: 'cp-1', is_club_coach: false },
      isLoading: false,
      isFetched: true,
    });
    mockHSCoachProfile.mockReturnValue({ data: null });

    const { getByText } = await render(<PubProfile />);
    await act(async () => {});
    fireEvent.press(getByText('AI Letter'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'LetterComposer',
      expect.objectContaining({
        seed: expect.objectContaining({ prefillAthleteId: 'athlete-1' }),
      }),
    );
  });

  it('HS coach sees AI Letter button and fires LetterComposer', async () => {
    mockCoachProfile.mockReturnValue({ data: null, isLoading: false, isFetched: true });
    mockHSCoachProfile.mockReturnValue({ data: { id: 'hs-1' } });

    const { getByText } = await render(<PubProfile />);
    await act(async () => {});
    fireEvent.press(getByText('AI Letter'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'LetterComposer',
      expect.objectContaining({
        seed: expect.objectContaining({ prefillAthleteId: 'athlete-1' }),
      }),
    );
  });

  it('non-coach viewer does NOT see AI Letter button', async () => {
    mockCoachProfile.mockReturnValue({ data: null, isLoading: false, isFetched: true });
    mockHSCoachProfile.mockReturnValue({ data: null });

    const { queryByText } = await render(<PubProfile />);
    await act(async () => {});
    expect(queryByText('AI Letter')).toBeNull();
  });
});
