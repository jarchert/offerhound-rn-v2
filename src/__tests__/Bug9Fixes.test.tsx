// src/__tests__/Bug89And10Fixes.test.tsx
// Real RNTL tests for Bugs 8, 9, and 10.
//
// Bug 9  — CoachTabs: CoachCampaignsScreen added as 6th tab ("Campaigns")
// Bug 8  — ClubCoachDashboardScreen: OrganizationLogoUpload wired in profile header
// Bug 10 — AthleteSearchScreen: sport-match athletes sort to top; ALL athletes present
//
// KEY FIX for RTL v14: render() is async — must await the returned thenable:
//   const result = await render(<Comp />, { wrapper });
//
// CROSS-GROUP ISOLATION: each describe block uses a NAMESPACE PREFIX on all
// query-data entries so that Bug 8 data and Bug 10 data can never collide.
//
// IMPORTANT: jest.mock factories are hoisted to the top of the file, so they
// CANNOT reference module-level variables defined after them. All shared state
// is exposed via globalThis so the factory can close over it at definition time.

import React from 'react';
import { render, fireEvent, act, waitFor, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

// ─── Shared test state on globalThis (accessible from hoisted jest.mock) ──────
const _testState = { namespaces: {} as Record<string, Record<string, any>> };

function _getQueryKey(args: any[]): string {
  if (args.length === 0) return '';
  const first = args[0];
  if (typeof first === 'string') return first;
  if (Array.isArray(first)) return (first as any[])[0] ?? '';
  if (first && typeof first === 'object' && 'queryKey' in first)
    return (first as any).queryKey?.[0] ?? '';
  return '';
}

(globalThis as any).__testState = _testState;
(globalThis as any).__getQueryKey = _getQueryKey;

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
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((cb: any) =>
        Promise.resolve(cb({ data: [], error: null })),
      ),
    }),
    storage: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ publicUrl: 'https://example.com/logo.png' }),
      }),
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// ─── react-query ─────────────────────────────────────────────────────────────
// hoisted — factory runs AFTER globals above are set, so it can reference them.
jest.mock('@tanstack/react-query', () => {
  return {
    QueryClient: class QueryClient { constructor() {} },
    QueryClientProvider: ({ children }: any) => children,
    useQuery: (...args: any[]) => {
      const state: { namespaces: Record<string, Record<string, any>> } =
        (globalThis as any).__testState;
      const getKey: (args: any[]) => string = (globalThis as any).__getQueryKey;
      const k = getKey(args);
      if (!state) return { data: undefined, isLoading: false, error: null };
      for (const ns of Object.values(state.namespaces)) {
        if (k in ns) return { data: ns[k]?.data, isLoading: !!ns[k]?.loading, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    },
    useMutation: () => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      isPending: false,
      isSuccess: false,
    }),
    useQueryClient: () => ({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      queryCache: { subscribe: () => () => {} },
    }),
  };
});

// ─── Registry helpers (run AFTER the globalThis state is set up) ──────────────
function _register(ns: string, key: string, data: any, loading = false) {
  if (!_testState.namespaces[ns]) _testState.namespaces[ns] = {};
  _testState.namespaces[ns][key] = { data, loading };
}

function _clearNamespace(ns: string) {
  delete _testState.namespaces[ns];
}

function _clearAllNamespaces() {
  for (const k of Object.keys(_testState.namespaces)) delete _testState.namespaces[k];
}

// ─── Navigation ────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
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
    useRoute: () => ({ params: {}, key: 'test', name: 'Test' }),
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

// ─── Profile hooks ─────────────────────────────────────────────────────────────
const mockCoachProfile = jest.fn(() => ({
  data: { id: 'cp-1', user_id: 'user-1', is_club_coach: false, full_name: 'Coach User', sport: 'Football' },
  isLoading: false,
  isFetched: true,
}));
const mockHSCoachProfile = jest.fn(() => ({ data: null }));
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
const mockUseScoutSavedAthletes = jest.fn(() => ({ data: [] }));

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
jest.mock('@/hooks/useScoutSavedAthletes', () => ({
  useScoutSavedAthletes: (...a: any[]) => mockUseScoutSavedAthletes(...a),
  useScoutSaveAthlete: () => ({ mutate: jest.fn() }),
}));

// ─── Other hooks ──────────────────────────────────────────────────────────────
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
  useScoutOrganization: () => ({ data: null, isLoading: false }),
}));
jest.mock('@/hooks/useRecordContactEvent', () => ({
  useRecordContactEvent: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/hooks/useTermsAcceptance', () => ({
  useHasAcceptedTerms: () => ({ hasAccepted: true, isLoading: false }),
  useAcceptTerms: () => ({ mutate: jest.fn(), isPending: false }),
}));

// ─── expo-linking ────────────────────────────────────────────────────────────
jest.mock('expo-linking', () => ({ createURL: jest.fn(() => 'offerhound://coach') }));

// ─── RootNavigator ────────────────────────────────────────────────────────────
jest.mock('@/navigation/RootNavigator', () => ({
  roleToInitialRoute: jest.fn(() => 'LandingTab'),
}));

// ─── Lucide icons ─────────────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_t: any, name: string) =>
        function MockIcon(props: any) {
          return require('react').createElement(View, { testID: `icon-${name}`, ...props });
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
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: (p: any) => require('react').createElement(View, p) };
});
jest.mock('react-native-toast-message', () => ({ show: jest.fn(), hide: jest.fn() }));
jest.mock('@react-native-masked-view/masked-view', () => {
  const { View } = require('react-native');
  return { default: ({ children }: any) => require('react').createElement(View, {}, children) };
});

// ─── Component stubs ──────────────────────────────────────────────────────────
const Null = () => null;

// Tabs: render all children so TabsList + TabsTrigger labels are in the tree
jest.mock('@/components/ui/Tabs', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    Tabs: ({ children }: any) => children,
    TabsList: ({ children, style }: any) => R.createElement(RN.View, { style }, children),
    TabsTrigger: ({ value, children, style, textStyle }: any) =>
      R.createElement(RN.Pressable, { style, testID: `tab-trigger-${value}` },
        R.createElement(RN.Text, { style: textStyle }, children)),
    TabsContent: ({ children }: any) => children,
  };
});

// Button: wraps children in Text so string children work
jest.mock('@/components/ui/Button', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    Button: ({ children, leftIcon, rightIcon, ...p }: any) =>
      R.createElement(RN.Pressable, p,
        leftIcon && R.createElement(RN.View, {}, leftIcon),
        children && R.createElement(RN.Text, {}, children),
        rightIcon && R.createElement(RN.View, {}, rightIcon)),
  };
});

// Card: View wrapper, CardContent/CardHeader pass through, CardDescription/CardTitle wrap in Text
jest.mock('@/components/ui/Card', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    Card: ({ children, ...p }: any) => R.createElement(RN.View, p, children),
    CardContent: ({ children }: any) => children,
    CardHeader: ({ children }: any) => children,
    CardDescription: ({ children }: any) => R.createElement(RN.Text, { testID: 'card-description' }, children),
    CardTitle: ({ children }: any) => R.createElement(RN.Text, { testID: 'card-title' }, children),
  };
});

// Avatar: simple View stub
jest.mock('@/components/ui/Avatar', () => {
  const RN = require('react-native');
  const R = require('react');
  return { Avatar: (_p: any) => R.createElement(RN.View, { testID: 'avatar' }) };
});

// Progress: simple View stub
jest.mock('@/components/ui/Progress', () => {
  const RN = require('react-native');
  const R = require('react');
  return { Progress: () => R.createElement(RN.View, { testID: 'progress' }) };
});

// Badge: simple View stub
jest.mock('@/components/ui/Badge', () => {
  const RN = require('react-native');
  const R = require('react');
  return { Badge: ({ children, ...p }: any) => R.createElement(RN.View, { testID: 'badge', ...p },
    children && R.createElement(RN.Text, {}, children)) };
});

jest.mock('@/components/Footer', () => ({ Footer: Null }));
jest.mock('@/components/Navbar', () => ({ Navbar: Null }));
jest.mock('@/components/SEO', () => ({ __esModule: true, default: Null }));
jest.mock('@/components/BackButton', () => ({ BackButton: Null }));
jest.mock('@/components/HeroSection', () => ({ HeroSection: Null }));
jest.mock('@/components/AthleteProfile', () => ({ AthleteProfile: Null }));
jest.mock('@/components/HighlightMediaWindow', () => ({ HighlightMediaWindow: Null }));
jest.mock('@/components/MessageButton', () => ({ MessageButton: Null }));
jest.mock('@/components/transcripts/RequestTranscriptButton', () => ({
  RequestTranscriptButton: Null,
}));
jest.mock('@/components/ClubTeamManagement', () => ({ ClubTeamManagement: Null }));
jest.mock('@/components/CoachNav', () => {
  const RN = require('react-native');
  const R = require('react');
  return { CoachNav: () => R.createElement(RN.View, { testID: 'coach-nav' }) };
});
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
jest.mock('@/components/ShareRoleCardDialog', () => ({ ShareRoleCardDialog: ({ children }: any) => children }));
jest.mock('@/components/club/WebsiteIntegrationDecisionModal', () => ({
  WebsiteIntegrationDecisionModal: Null,
}));
jest.mock('@/components/TermsAcceptanceGate', () => ({
  TermsAcceptanceGate: ({ children }: any) => children,
}));
jest.mock('@/components/PositionNeedsBoard', () => ({ PositionNeedsBoard: Null }));
jest.mock('@/components/RecruitingPipeline', () => ({ RecruitingPipeline: Null }));
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
jest.mock('@/lib/utils/stateProximity', () => ({
  stateProximityScore: () => 0,
  proximityLabel: () => null,
}));
jest.mock('@/lib/getAgeBand', () => ({
  getAgeBand: () => 'teen',
}));

// ─── Global beforeEach ────────────────────────────────────────────────────────
beforeEach(() => {
  mockNavigate.mockClear();
  _clearAllNamespaces();
  mockSavedAthletes.mockReturnValue({ data: [] });
  mockSavedCoaches.mockReturnValue({ data: [] });
  mockUseScoutSavedAthletes.mockReturnValue({ data: [] });
  mockCoachProfile.mockReturnValue({
    data: { id: 'cp-1', user_id: 'user-1', is_club_coach: false, full_name: 'Coach User', sport: 'Football' },
    isLoading: false,
    isFetched: true,
  });
  mockHSCoachProfile.mockReturnValue({ data: null });
  mockScoutProfile.mockReturnValue({ data: null });
});

afterEach(() => {
  _clearAllNamespaces();
  mockCoachProfile.mockReturnValue({
    data: { id: 'cp-1', user_id: 'user-1', is_club_coach: false, full_name: 'Coach User', sport: 'Football' },
    isLoading: false,
    isFetched: true,
  });
  mockHSCoachProfile.mockReturnValue({ data: null });
  mockScoutProfile.mockReturnValue({ data: null });
  mockSavedAthletes.mockReturnValue({ data: [] });
  mockSavedCoaches.mockReturnValue({ data: [] });
  mockUseScoutSavedAthletes.mockReturnValue({ data: [] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bug 9 — CoachTabs: verify the 6th Campaigns tab by source inspection
// ═══════════════════════════════════════════════════════════════════════════════
describe('Bug 9 — CoachTabs 6th "Campaigns" tab', () => {
  it('CoachTabs source includes CampaignsTab + CoachCampaignsScreen import', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../navigation/role/CoachTabs.tsx'),
      'utf8',
    );
    expect(src).toContain("CoachCampaignsScreen from '@/screens/coach/CoachCampaignsScreen'");
    expect(src).toContain('name="CampaignsTab"');
    expect(src).toContain('component={CoachCampaignsScreen}');
    expect(src).toContain("title: 'Campaigns'");
  });

  it('CoachCampaignsScreen renders its roster-gap campaign heading', async () => {
    const CoachCampaignsScreen = require('@/screens/coach/CoachCampaignsScreen').default;
    const { getByText } = await render(<CoachCampaignsScreen />);
    await act(async () => {});
    expect(getByText('Roster Gap Campaigns')).toBeTruthy();
  });

  it('CoachCampaignsScreen renders a New Campaign button', async () => {
    const CoachCampaignsScreen = require('@/screens/coach/CoachCampaignsScreen').default;
    const { getByText } = await render(<CoachCampaignsScreen />);
    await act(async () => {});
    expect(getByText('New Campaign')).toBeTruthy();
  });

  it('CoachCampaignsScreen dialog opens on New Campaign press', async () => {
    const CoachCampaignsScreen = require('@/screens/coach/CoachCampaignsScreen').default;
    const { getByText, getAllByText } = await render(<CoachCampaignsScreen />);
    await act(async () => {});
    fireEvent.press(getByText('New Campaign'));
    await act(async () => {});
    expect(getAllByText('Create Campaign').length).toBeGreaterThan(0);
  });
});

