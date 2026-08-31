// SearchGateWiring.test.tsx — Group 4 #9-#11 (per-screen wiring)
//
// Confirms that CoachDirectoryScreen, AthleteSearchScreen, and
// ScoutDirectoryScreen render the RegisterSearchGate (with the right
// message) when the current session is unauthenticated, and the normal
// search UI when authenticated.
//
// The three screens pull in a lot of infrastructure (supabase, tanstack
// query, several profile hooks, CoachOutreachComposer, etc.). We mock the
// data hooks so the tests are fast and deterministic \u2014 the point isn't to
// exercise the data flow, it's to verify the auth gate wiring.

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Global RN / expo stubs ───────────────────────────────────────────────────
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

// ── Navigation stubs ─────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, canGoBack: () => false, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
  NavigationProp: undefined,
}));

// ── Auth mock, toggled per test ──────────────────────────────────────────────
const authState: { user: any } = { user: null };
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: authState.user,
    userRole: null,
    isAuthenticated: !!authState.user,
    loading: false,
  }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    userRole: null,
    isAuthenticated: !!authState.user,
    isLoading: false,
  }),
}));

// ── Supabase / tanstack query ────────────────────────────────────────────────
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isLoading: false }),
  useMutation: () => ({ mutate: jest.fn() }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  QueryClient: class { mount() {} unmount() {} },
  QueryClientProvider: ({ children }: any) => children,
}));

// ── Profile / directory hooks (return empty by default) ──────────────────────
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

// ── Sub-components that pull in more RN infra ────────────────────────────────
jest.mock('@/components/Footer', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { Footer: () => R.createElement(View, null) };
});
jest.mock('@/components/BackButton', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { BackButton: () => R.createElement(View, null) };
});
jest.mock('@/components/Navbar', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { Navbar: () => R.createElement(View, null), default: () => R.createElement(View, null) };
});
jest.mock('@/components/CoachOutreachComposer', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { CoachOutreachComposer: () => R.createElement(View, null) };
});
jest.mock('@/components/coach/CoachMatchCard', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { CoachMatchCard: () => R.createElement(View, null) };
});
jest.mock('@/components/athlete/AthleteMatchCard', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { AthleteMatchCard: () => R.createElement(View, null) };
});
jest.mock('@/components/MessageButton', () => {
  const { View } = require('react-native');
  const R = require('react');
  return { MessageButton: () => R.createElement(View, null) };
});

// Import screens after all mocks are in place
import CoachDirectoryScreen from '@/screens/shared/CoachDirectoryScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import ScoutDirectoryScreen from '@/screens/scout/ScoutDirectoryScreen';

describe('Search gate wiring — unauth renders RegisterSearchGate (Group 4 #9-#11)', () => {
  beforeEach(() => {
    authState.user = null;
    mockNavigate.mockClear();
  });

  it('CoachDirectoryScreen shows the coach gate message when unauth', async () => {
    const { getByText, queryByTestId, queryByText } = await render(<CoachDirectoryScreen />);
    expect(getByText('Register to find your coach and program match')).toBeTruthy();
    expect(queryByTestId('register-search-gate')).toBeTruthy();
    // Search / directory UI is REPLACED, not overlaid \u2014 confirm the title text
    // that only appears in the authenticated branch is absent.
    expect(queryByText('Coach Directory')).toBeNull();
  });

  it('AthleteSearchScreen shows the athlete gate message when unauth', async () => {
    const { getByText, queryByTestId, queryByText } = await render(<AthleteSearchScreen />);
    expect(getByText('Register to find your AI matched players')).toBeTruthy();
    expect(queryByTestId('register-search-gate')).toBeTruthy();
    expect(queryByText('Athlete Search')).toBeNull();
  });

  it('ScoutDirectoryScreen shows the scout gate message when unauth', async () => {
    const { getByText, queryByTestId, queryByText } = await render(<ScoutDirectoryScreen />);
    expect(getByText('Register to connect with verified scouts')).toBeTruthy();
    expect(queryByTestId('register-search-gate')).toBeTruthy();
    expect(queryByText('Scout Directory')).toBeNull();
  });
});

describe('Search gate wiring — auth renders the normal search UI', () => {
  beforeEach(() => {
    authState.user = { id: 'test-user' };
    mockNavigate.mockClear();
  });

  it('CoachDirectoryScreen shows the directory (no gate) when authed', async () => {
    const { queryByText, queryByTestId } = await render(<CoachDirectoryScreen />);
    expect(queryByTestId('register-search-gate')).toBeNull();
    expect(queryByText('Coach Directory')).toBeTruthy();
  });

  it('AthleteSearchScreen shows the search UI (no gate) when authed', async () => {
    const { queryByText, queryByTestId } = await render(<AthleteSearchScreen />);
    expect(queryByTestId('register-search-gate')).toBeNull();
    expect(queryByText('Athlete Search')).toBeTruthy();
  });

  it('ScoutDirectoryScreen shows the directory (no gate) when authed', async () => {
    const { queryByText, queryByTestId } = await render(<ScoutDirectoryScreen />);
    expect(queryByTestId('register-search-gate')).toBeNull();
    expect(queryByText('Scout Directory')).toBeTruthy();
  });
});
