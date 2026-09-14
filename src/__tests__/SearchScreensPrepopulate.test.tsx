// SearchScreensPrepopulate.test.tsx — Group 4 #12
//
// Verifies that CoachDirectoryScreen, AthleteSearchScreen, and
// ScoutDirectoryScreen fire their data query on mount (no `enabled` gate,
// no search-text prerequisite) so that authenticated users see results
// immediately after navigating in \u2014 matching MAIN's behaviour.
//
// Strategy: mock useQuery to record the options it was called with; assert
// there is no `enabled: false` at mount. Also assert queryFn is defined so
// tanstack knows to run it once useQuery is called.

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockResolvedValue(null) },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-linear-gradient', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { LinearGradient: (p: any) => R.createElement(View, p) };
});
jest.mock('expo-audio', () => ({}));
jest.mock('expo-iap', () => ({}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, canGoBack: () => false, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
}));

// Authed session
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, userRole: 'athlete', isAuthenticated: true, loading: false }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, userRole: 'athlete', isAuthenticated: true, isLoading: false }),
}));

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Capture useQuery call options.
const capturedQueryOptions: any[] = [];
jest.mock('@tanstack/react-query', () => ({
  useQuery: (opts: any) => {
    capturedQueryOptions.push(opts);
    return { data: [], isLoading: false };
  },
  useMutation: () => ({ mutate: jest.fn() }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  QueryClient: class { mount() {} unmount() {} },
  QueryClientProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/usePlayerProfile', () => ({
  usePlayerProfile: () => ({ profile: null, isLoading: false }),
}));
jest.mock('@/hooks/useCoachProfile', () => ({
  useCoachProfile: () => ({ data: null }),
}));
jest.mock('@/hooks/useHSCoachProfile', () => ({
  useHSCoachProfile: () => ({ data: null }),
}));
jest.mock('@/hooks/useScoutProfile', () => ({
  useScoutProfile: () => ({ data: null }),
}));
jest.mock('@/hooks/useScoutOrganization', () => ({
  useScoutOrganization: () => ({ data: null }),
}));
jest.mock('@/hooks/useAthleteMatches', () => ({
  useAthleteMatches: () => ({ data: [] }),
}));
jest.mock('@/hooks/useSavedCoaches', () => ({
  useSavedCoaches: () => ({ data: [] }),
  useSaveCoach: () => ({ mutate: jest.fn() }),
  useRemoveSavedCoach: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/hooks/useScoutSavedAthletes', () => ({
  useScoutSavedAthletes: () => ({ data: [] }),
  useScoutSaveAthlete: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/components/Footer', () => {
  const { View } = require('react-native'); const R = require('react');
  return { Footer: () => R.createElement(View) };
});
jest.mock('@/components/BackButton', () => {
  const { View } = require('react-native'); const R = require('react');
  return { BackButton: () => R.createElement(View) };
});
jest.mock('@/components/Navbar', () => {
  const { View } = require('react-native'); const R = require('react');
  return { Navbar: () => R.createElement(View), default: () => R.createElement(View) };
});
jest.mock('@/components/CoachOutreachComposer', () => {
  const { View } = require('react-native'); const R = require('react');
  return { CoachOutreachComposer: () => R.createElement(View) };
});
jest.mock('@/components/coach/CoachMatchCard', () => {
  const { View } = require('react-native'); const R = require('react');
  return { CoachMatchCard: () => R.createElement(View) };
});
jest.mock('@/components/athlete/AthleteMatchCard', () => {
  const { View } = require('react-native'); const R = require('react');
  return { AthleteMatchCard: () => R.createElement(View) };
});
jest.mock('@/components/MessageButton', () => {
  const { View } = require('react-native'); const R = require('react');
  return { MessageButton: () => R.createElement(View) };
});

import CoachDirectoryScreen from '@/screens/shared/CoachDirectoryScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import ScoutDirectoryScreen from '@/screens/scout/ScoutDirectoryScreen';

describe('Search screens pre-populate on nav for authed users (Group 4 #12)', () => {
  beforeEach(() => {
    capturedQueryOptions.length = 0;
  });

  it('CoachDirectoryScreen fires its query on mount without an enabled gate', async () => {
    await render(<CoachDirectoryScreen />);
    const opt = capturedQueryOptions.find(o =>
      Array.isArray(o?.queryKey) && o.queryKey[0] === 'coach-directory',
    );
    expect(opt).toBeDefined();
    expect(typeof opt.queryFn).toBe('function');
    // No explicit enabled: false at mount.
    expect(opt.enabled === false).toBe(false);
  });

  it('AthleteSearchScreen fires its query on mount without an enabled gate', async () => {
    await render(<AthleteSearchScreen />);
    const opt = capturedQueryOptions.find(o =>
      Array.isArray(o?.queryKey) && o.queryKey[0] === 'athlete-search',
    );
    expect(opt).toBeDefined();
    expect(typeof opt.queryFn).toBe('function');
    expect(opt.enabled === false).toBe(false);
  });

  it('ScoutDirectoryScreen fires its query on mount without an enabled gate', async () => {
    await render(<ScoutDirectoryScreen />);
    const opt = capturedQueryOptions.find(o =>
      Array.isArray(o?.queryKey) && o.queryKey[0] === 'scout-directory',
    );
    expect(opt).toBeDefined();
    expect(typeof opt.queryFn).toBe('function');
    expect(opt.enabled === false).toBe(false);
  });
});
