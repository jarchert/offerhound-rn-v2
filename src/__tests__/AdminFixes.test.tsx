// src/__tests__/AdminFixes.test.tsx
//
// Tests for three admin fixes:
//  1. AdminUsersScreen — real table queries (user_roles + profile tables), no 'profiles'
//  2. useAdminRole — checks both user_roles AND admin_profiles; user_roles-only admin passes
//  3. Impersonate button — shows Alert instead of silent no-op

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ─── Shared supabase mock state (accessible from hoisted jest.mock factories) ─
const _sup: {
  userRoles: any[];
  playerProfiles: any[];
  coachProfiles: any[];
  scoutProfiles: any[];
  influencerProfiles: any[];
  adminProfiles: any[];
} = {
  userRoles: [],
  playerProfiles: [],
  coachProfiles: [],
  scoutProfiles: [],
  influencerProfiles: [],
  adminProfiles: [],
};
(globalThis as any).__adminSupState = _sup;

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

// ─── Supabase mock — per-table routing with real .in() filtering ──────────────
// The fetchAdminUsers queryFn calls:
//   .from('user_roles').select().order().limit()         → resolves via limit()
//   .from('player_profiles').select().in()               → resolves via then() (thenability)
// useAdminRole calls:
//   .from('user_roles').select().eq().in()               → resolves via then()
//   .from('admin_profiles').select().eq().maybeSingle()  → resolves via maybeSingle()
// The .in() mock must actually filter rows so role-filter tests work.
jest.mock('@/integrations/supabase/client', () => {
  function makeChain(getData: () => any[]) {
    let activePredicate: ((row: any) => boolean) | null = null;
    const effective = () => {
      const rows = getData();
      return activePredicate ? rows.filter(activePredicate) : rows;
    };
    const p = () => Promise.resolve({ data: effective(), error: null });
    const c: any = {
      select: () => c,
      eq: (col: string, val: any) => {
        // eq filters are cumulative
        const prev = activePredicate;
        activePredicate = (r) => (prev ? prev(r) : true) && r[col] === val;
        return c;
      },
      in: (col: string, vals: any[]) => {
        const prev = activePredicate;
        activePredicate = (r) => (prev ? prev(r) : true) && vals.includes(r[col]);
        return c;
      },
      order: () => c,
      limit: () => p(),
      maybeSingle: () => {
        const rows = effective();
        return Promise.resolve({ data: rows.length > 0 ? rows[0] : null, error: null });
      },
      then: (resolve: any, reject: any) => p().then(resolve, reject),
      catch: (cb: any) => p().catch(cb),
    };
    return c;
  }

  return {
    supabase: {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: 'admin-uid' } } },
          error: null,
        }),
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-uid' } },
          error: null,
        }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } },
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        const s: typeof _sup = (globalThis as any).__adminSupState;
        switch (table) {
          case 'user_roles':          return makeChain(() => s.userRoles);
          case 'player_profiles':     return makeChain(() => s.playerProfiles);
          case 'coach_profiles':      return makeChain(() => s.coachProfiles);
          case 'scout_profiles':      return makeChain(() => s.scoutProfiles);
          case 'influencer_profiles': return makeChain(() => s.influencerProfiles);
          case 'admin_profiles':      return makeChain(() => s.adminProfiles);
          default:                    return makeChain(() => []);
        }
      }),
      storage: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({ error: null }),
          remove: jest.fn().mockResolvedValue({ error: null }),
          getPublicUrl: jest.fn().mockReturnValue({ publicUrl: '' }),
        }),
      }),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      functions: {
        invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
  };
});

// ─── react-query — real QueryClient so queryFn actually executes ───────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const makeQC = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });

// ─── Navigation ───────────────────────────────────────────────────────────────
const mockReset = jest.fn();
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
      reset: mockReset,
      canGoBack: jest.fn(() => false),
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({ params: {}, key: 'test', name: 'Test' }),
    NavigationContainer: ({ children }: any) => children,
  };
});

// ─── ImpersonationContext ─────────────────────────────────────────────────────
jest.mock('@/contexts/ImpersonationContext', () => ({
  ImpersonationProvider: ({ children }: any) => children,
  useImpersonation: () => ({ isImpersonating: false, impersonationData: null }),
}));

// ─── Auth ─────────────────────────────────────────────────────────────────────
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'admin-uid' }, session: null }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-uid' }, session: null }),
  AuthProvider: ({ children }: any) => children,
}));

// ─── UI stubs ─────────────────────────────────────────────────────────────────
jest.mock('@/components/Navbar', () => ({ Navbar: () => null }));
jest.mock('@/components/ui/Card', () => {
  const { View } = require('react-native');
  return { Card: ({ children, style }: any) => <View style={style}>{children}</View> };
});
jest.mock('@/components/ui/Badge', () => {
  const { Text } = require('react-native');
  return { Badge: ({ children }: any) => <Text testID="badge">{children}</Text> };
});
jest.mock('@/components/ui/Avatar', () => ({ Avatar: () => null }));
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: (props: any) => <FlatList {...props} /> };
});
jest.mock('lucide-react-native', () => ({
  UserCog: () => null,
  AlertTriangle: () => null,
  Users: () => null,
  Mail: () => null,
  BarChart2: () => null,
  FileText: () => null,
  ClipboardList: () => null,
  Settings: () => null,
  ChevronRight: () => null,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Wrapper({ children }: any) {
  const qc = React.useMemo(() => makeQC(), []);
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function reset() {
  jest.clearAllMocks();
  _sup.userRoles = [];
  _sup.playerProfiles = [];
  _sup.coachProfiles = [];
  _sup.scoutProfiles = [];
  _sup.influencerProfiles = [];
  _sup.adminProfiles = [];
  mockReset.mockClear();
  mockNavigate.mockClear();
}

// ─────────────────────────────────────────────────────────────────────────────
// Fix 1 — AdminUsersScreen: real table queries, no profiles table
// ─────────────────────────────────────────────────────────────────────────────
describe('Fix 1 — AdminUsersScreen: real table queries, no profiles table', () => {
  const getScreen = () => require('../screens/admin/AdminUsersScreen').default;

  beforeEach(reset);

  it('renders rows from user_roles merged with player_profiles', async () => {
    _sup.userRoles = [
      { user_id: 'uid-1', role: 'athlete', created_at: '2024-01-01T00:00:00Z' },
      { user_id: 'uid-2', role: 'admin',   created_at: '2024-01-02T00:00:00Z' },
    ];
    _sup.playerProfiles = [
      { user_id: 'uid-1', full_name: 'Alice Athlete', profile_image_url: null },
    ];

    const AdminUsersScreen = getScreen();
    const { findByText, findAllByTestId, getAllByText } = await render(
      <Wrapper><AdminUsersScreen /></Wrapper>,
    );

    await findByText('Alice Athlete');
    // uid-2 has no profile row — falls back to full userId string (appears in name + userId fields)
    const uid2Els = getAllByText('uid-2');
    expect(uid2Els.length).toBeGreaterThanOrEqual(1);

    const badges = await findAllByTestId('badge');
    const texts = badges.map((b: any) => b.props.children);
    expect(texts).toContain('athlete');
    expect(texts).toContain('admin');
  });

  it('renders coach display name from coach_profiles', async () => {
    _sup.userRoles = [
      { user_id: 'uid-coach', role: 'coach', created_at: '2024-01-03T00:00:00Z' },
    ];
    _sup.coachProfiles = [
      { user_id: 'uid-coach', full_name: 'Coach Carter', profile_image_url: null },
    ];

    const AdminUsersScreen = getScreen();
    const { findByText } = await render(
      <Wrapper><AdminUsersScreen /></Wrapper>,
    );
    await findByText('Coach Carter');
    await findByText('coach');
  });

  it('renders influencer display_name (not full_name) from influencer_profiles', async () => {
    _sup.userRoles = [
      { user_id: 'uid-inf', role: 'influencer', created_at: '2024-01-04T00:00:00Z' },
    ];
    _sup.influencerProfiles = [
      { user_id: 'uid-inf', display_name: 'InfluencerMike', profile_image_url: null },
    ];

    const AdminUsersScreen = getScreen();
    const { findByText } = await render(
      <Wrapper><AdminUsersScreen /></Wrapper>,
    );
    await findByText('InfluencerMike');
  });

  it('shows "0 users" subtitle when user_roles returns nothing', async () => {
    _sup.userRoles = [];

    const AdminUsersScreen = getScreen();
    const { findByText } = await render(
      <Wrapper><AdminUsersScreen /></Wrapper>,
    );
    await findByText('0 users');
  });

  it('deduplicates user with multiple roles — keeps higher-priority admin role', async () => {
    _sup.userRoles = [
      { user_id: 'uid-multi', role: 'athlete', created_at: '2024-01-01T00:00:00Z' },
      { user_id: 'uid-multi', role: 'admin',   created_at: '2024-01-01T00:00:00Z' },
    ];
    _sup.playerProfiles = [
      { user_id: 'uid-multi', full_name: 'Multi Role', profile_image_url: null },
    ];

    const AdminUsersScreen = getScreen();
    const { findByText, findAllByTestId } = await render(
      <Wrapper><AdminUsersScreen /></Wrapper>,
    );
    await findByText('Multi Role');

    const badges = await findAllByTestId('badge');
    const adminBadges = badges.filter((b: any) => b.props.children === 'admin');
    const athleteBadges = badges.filter((b: any) => b.props.children === 'athlete');
    expect(adminBadges).toHaveLength(1);
    expect(athleteBadges).toHaveLength(0);
  });

  it('subtitle reflects filtered count after search', async () => {
    _sup.userRoles = [
      { user_id: 'uid-1', role: 'athlete', created_at: '2024-01-01T00:00:00Z' },
      { user_id: 'uid-2', role: 'coach',   created_at: '2024-01-02T00:00:00Z' },
    ];
    _sup.playerProfiles = [
      { user_id: 'uid-1', full_name: 'Alice', profile_image_url: null },
    ];
    _sup.coachProfiles = [
      { user_id: 'uid-2', full_name: 'Bob Coach', profile_image_url: null },
    ];

    const AdminUsersScreen = getScreen();
    const { findByText, getByPlaceholderText } = await render(
      <Wrapper><AdminUsersScreen /></Wrapper>,
    );
    await findByText('2 users');

    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText('Search by name, role, or user ID\u2026'),
        'alice',
      );
    });

    await findByText('1 users');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fix 2 — useAdminRole: user_roles-only admin passes; both tables checked
// ─────────────────────────────────────────────────────────────────────────────
describe('Fix 2 — useAdminRole: user_roles-only admin passes; both tables checked', () => {
  function AdminRoleProbe({ cb }: { cb: (v: { isAdmin: boolean; loading: boolean }) => void }) {
    const { useAdminRole } = require('../hooks/useAdminRole');
    const result = useAdminRole();
    React.useEffect(() => { cb({ isAdmin: result.isAdmin, loading: result.loading }); });
    return null;
  }

  beforeEach(reset);

  async function probe() {
    const results: Array<{ isAdmin: boolean; loading: boolean }> = [];
    await act(async () => {
      await render(<AdminRoleProbe cb={(r) => results.push(r)} />);
    });
    await waitFor(() => {
      expect(results.some((r) => !r.loading)).toBe(true);
    }, { timeout: 3000 });
    const settled = results.filter((r) => !r.loading);
    return settled[settled.length - 1];
  }

  it('returns isAdmin=true for user with ONLY a user_roles admin entry (no admin_profiles row)', async () => {
    _sup.adminProfiles = [];
    _sup.userRoles = [{ id: 'r1', user_id: 'admin-uid', role: 'admin', created_at: '' }];
    expect((await probe()).isAdmin).toBe(true);
  });

  it('returns isAdmin=true for moderator in user_roles (no admin_profiles row)', async () => {
    _sup.adminProfiles = [];
    _sup.userRoles = [{ id: 'r2', user_id: 'admin-uid', role: 'moderator', created_at: '' }];
    expect((await probe()).isAdmin).toBe(true);
  });

  it('returns isAdmin=true for user with ONLY an admin_profiles row (no user_roles entry)', async () => {
    _sup.adminProfiles = [{ id: 'ap-1', user_id: 'admin-uid' }];
    _sup.userRoles = [];
    expect((await probe()).isAdmin).toBe(true);
  });

  it('returns isAdmin=false when neither table has a matching row', async () => {
    _sup.adminProfiles = [];
    _sup.userRoles = [];
    expect((await probe()).isAdmin).toBe(false);
  });

  it('non-admin role in user_roles (athlete) does not pass', async () => {
    _sup.adminProfiles = [];
    // Only an athlete row — not in ['admin','moderator'] filter
    _sup.userRoles = [{ id: 'r3', user_id: 'admin-uid', role: 'athlete', created_at: '' }];
    expect((await probe()).isAdmin).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fix 3 — Impersonate button shows Alert, not silent no-op
// ─────────────────────────────────────────────────────────────────────────────
describe('Fix 3 — Impersonate button shows Alert, not silent no-op', () => {
  beforeEach(() => {
    reset();
    jest.spyOn(Alert, 'alert');
    _sup.userRoles = [
      { user_id: 'uid-target', role: 'athlete', created_at: '2024-01-01T00:00:00Z' },
    ];
    _sup.playerProfiles = [
      { user_id: 'uid-target', full_name: 'Target User', profile_image_url: null },
    ];
  });

  it('shows "Not available on mobile" Alert when Impersonate is tapped', async () => {
    const AdminUsersScreen = require('../screens/admin/AdminUsersScreen').default;
    const { findByText, getAllByText } = await render(
      <Wrapper><AdminUsersScreen /></Wrapper>,
    );

    await findByText('Target User');
    const impBtns = getAllByText('Impersonate');
    await act(async () => { fireEvent.press(impBtns[0]); });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Not available on mobile',
      expect.stringContaining('web admin panel'),
      expect.any(Array),
    );
  });

  it('does NOT call supabase.functions.invoke on Impersonate press', async () => {
    const { supabase } = require('@/integrations/supabase/client');
    const AdminUsersScreen = require('../screens/admin/AdminUsersScreen').default;
    const { findByText, getAllByText } = await render(
      <Wrapper><AdminUsersScreen /></Wrapper>,
    );

    await findByText('Target User');
    const impBtns = getAllByText('Impersonate');
    await act(async () => { fireEvent.press(impBtns[0]); });

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('does NOT write to AsyncStorage on Impersonate press', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const AdminUsersScreen = require('../screens/admin/AdminUsersScreen').default;
    const { findByText, getAllByText } = await render(
      <Wrapper><AdminUsersScreen /></Wrapper>,
    );

    await findByText('Target User');
    const impBtns = getAllByText('Impersonate');
    await act(async () => { fireEvent.press(impBtns[0]); });

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
