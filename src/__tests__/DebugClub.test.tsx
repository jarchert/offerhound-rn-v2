import React from 'react';
import { render, act } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn(), getAllKeys: jest.fn().mockResolvedValue([]), multiGet: jest.fn().mockResolvedValue([]), multiSet: jest.fn(), multiRemove: jest.fn() } }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }), getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }), onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }) }, from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), neq: jest.fn().mockReturnThis(), ilike: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), gte: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }), single: jest.fn().mockResolvedValue({ data: null, error: null }), then: jest.fn().mockImplementation((cb: any) => Promise.resolve(cb({ data: [], error: null }))) }), rpc: jest.fn().mockResolvedValue({ data: null, error: null }) } }));
const mockUQ = jest.fn(() => ({ data: undefined, isLoading: false }));
jest.mock('@tanstack/react-query', () => { const a = jest.requireActual('@tanstack/react-query'); return { ...a, useQuery: (...args: any[]) => mockUQ(...args), useMutation: () => ({ mutate: jest.fn(), isPending: false }), useQueryClient: () => ({ invalidateQueries: jest.fn() }) }; });
const mockNav = jest.fn();
jest.mock('@react-navigation/native', () => { const a = jest.requireActual('@react-navigation/native'); return { ...a, useNavigation: () => ({ navigate: mockNav, goBack: jest.fn(), dispatch: jest.fn(), setOptions: jest.fn() }), useRoute: () => ({ params: {} }) }; });
jest.mock('@/lib/platform', () => ({ isNativePlatform: jest.fn(() => true) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, userRole: 'coach', isLoading: false, signOut: jest.fn() }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' }, isAuthenticated: true, loading: false, authLoading: false, signOut: jest.fn() }) }));
jest.mock('@/contexts/ImpersonationContext', () => ({ ImpersonationProvider: ({children}: any) => children, useImpersonation: () => ({ isImpersonating: false }) }));
jest.mock('@/hooks/useCoachProfile', () => ({ useCoachProfile: () => ({ data: { id: 'cp1', user_id: 'u1', is_club_coach: true, full_name: 'Coach', name: 'Coach' }, isLoading: false, isFetched: true }) }));
jest.mock('@/hooks/useHSCoachProfile', () => ({ useHSCoachProfile: () => ({ data: null }), useUpdateHSCoachProfile: () => jest.fn() }));
jest.mock('@/hooks/useScoutProfile', () => ({ useScoutProfile: () => ({ data: null }) }));
jest.mock('@/hooks/usePlayerProfile', () => ({ usePlayerProfile: () => ({ profile: null, isLoading: false }) }));
jest.mock('@/hooks/useSavedAthletes', () => ({ useSavedAthletes: () => ({ data: [{ id:'sa1', athlete: {id:'a1',full_name:'Test Athlete',position:'QB',school:'HS'}, priority:'high' }] }), useSaveAthlete: () => ({ mutate: jest.fn() }), useRemoveSavedAthlete: () => ({ mutate: jest.fn() }) }));
jest.mock('@/hooks/useSavedCoaches', () => ({ useSavedCoaches: () => ({ data: [] }), useSaveCoach: () => ({ mutate: jest.fn() }), useRemoveSavedCoach: () => ({ mutate: jest.fn() }) }));
jest.mock('@/hooks/useCoachAthleteMatches', () => ({ useCoachAthleteMatches: () => ({ data: [], isLoading: false }) }));
jest.mock('@/hooks/useRefreshCoachAthleteMatches', () => ({ useRefreshCoachAthleteMatches: () => ({ refreshMatches: jest.fn(), isRefreshing: false }) }));
jest.mock('@/hooks/useTermsAcceptance', () => ({ useHasAcceptedTerms: () => ({ hasAccepted: true, isLoading: false }) }));
jest.mock('@/hooks/useCoachActivity', () => ({ useCoachActivityStats: () => ({ data: null }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/navigation/RootNavigator', () => ({ roleToInitialRoute: jest.fn(() => 'LandingTab') }));
jest.mock('lucide-react-native', () => { const {View}=require('react-native');const R=require('react'); return new Proxy({},{get:(_:any,n:string)=>function I(){return R.createElement(View,{testID:'i-'+n})}}); });
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(() => Promise.resolve(false)), shareAsync: jest.fn() }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn().mockResolvedValue(null), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), MediaTypeOptions: { Images: 'Images' } }));
jest.mock('expo-linear-gradient', () => { const {View}=require('react-native');const R=require('react'); return { LinearGradient: (p:any)=>R.createElement(View,p) }; });
jest.mock('react-native-toast-message', () => ({ show: jest.fn(), hide: jest.fn() }));
jest.mock('@react-native-masked-view/masked-view', () => { const {View}=require('react-native');const R=require('react'); return { default: ({children}:any)=>R.createElement(View,{},children) }; });
const Null = () => null;
jest.mock('@/components/Footer', () => ({ Footer: Null }));
jest.mock('@/components/athlete/AthleteMatchCard', () => ({ __esModule: true, default: Null, AthleteMatchCard: Null }));
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
jest.mock('@/components/club/WebsiteIntegrationDecisionModal', () => ({ WebsiteIntegrationDecisionModal: Null }));
jest.mock('@/components/TermsAcceptanceGate', () => ({ TermsAcceptanceGate: ({children}:any)=>children }));
jest.mock('@/components/PositionNeedsBoard', () => ({ PositionNeedsBoard: Null }));
jest.mock('@/components/RecruitingPipeline', () => ({ RecruitingPipeline: Null }));
jest.mock('@/components/CoachProfileImageUpload', () => ({ __esModule: true, default: Null, CoachProfileImageUpload: Null }));

beforeEach(() => {
  mockUQ.mockReset();
  mockUQ.mockImplementation(({ queryKey }: any) => {
    const k = Array.isArray(queryKey) ? queryKey[0] : null;
    if (k === 'club-coach-profile-full') {
      return { data: { id:'club1', user_id:'u1', club_name:'Club FC', sport:'Soccer', city:'Austin', state:'TX' }, isLoading: false };
    }
    return { data: undefined, isLoading: false };
  });
});

it('debug: Bug 7 - text nodes when savedAthletes has data', async () => {
  const ClubCoach = require('@/screens/club/ClubCoachDashboardScreen').default;
  const { toJSON, getAllByText, queryByText } = await render(<ClubCoach />);
  await act(async () => {});
  
  const json = JSON.stringify(toJSON());
  console.log('JSON len:', json?.length || 0);
  
  // Extract all text
  const texts: string[] = [];
  const ex = (n: any) => {
    if (!n) return;
    if (typeof n === 'string') texts.push(n);
    if (n.children) n.children.forEach(ex);
  };
  ex(toJSON());
  console.log('TEXTS:', JSON.stringify(texts.filter((t:any) => t.trim())));
  
  const savedEl = queryByText('Saved');
  console.log('Saved element found:', !!savedEl);
  const viewProfile = queryByText('View Profile');
  console.log('View Profile found:', !!viewProfile);
  
  expect(true).toBe(true);
});
