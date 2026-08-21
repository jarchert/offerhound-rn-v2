// src/__tests__/InfluencerInboxTab.test.tsx
// Verifies that InfluencerTabs now includes InboxTab wired to InboxScreen,
// matching the Scout/Agency/Coach parity fix from the triage pass.
//
// Two tests:
//  1. Source-inspection: InfluencerTabs.tsx imports InboxScreen and registers InboxTab.
//  2. Render: InboxScreen mounts without crashing when rendered standalone
//     (same approach as CoachCampaignsScreen in Bug9Fixes).

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const makeQC = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

// ─── Supabase mock ────────────────────────────────────────────────────────────
jest.mock('@/integrations/supabase/client', () => {
  const chain: any = {};
  const methods = ['select', 'eq', 'neq', 'in', 'is', 'or', 'ilike',
    'order', 'limit', 'maybeSingle', 'single', 'update', 'delete', 'insert'];
  methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
  chain.then = (resolve: (v: any) => any) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);

  return {
    supabase: {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } },
        }),
      },
      from: jest.fn().mockReturnValue(chain),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
      }),
      removeChannel: jest.fn(),
    },
  };
});

// ─── Auth mock ────────────────────────────────────────────────────────────────
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'influencer-user-1', email: 'influencer@example.com' },
    session: { access_token: 'tok' },
    loading: false,
    isAuthenticated: true,
  }),
}));

// ─── Navigation mock ──────────────────────────────────────────────────────────
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn((cb: any) => { cb(); }),
  useIsFocused: jest.fn(() => true),
  useNavigationState: jest.fn((selector: (s: any) => any) => selector({ routes: [], index: 0 })),
}));

// useActiveRoleScope reads nav state to derive the active tab role.
// Stub only the hook; keep ROLE_LABEL from the real module so InboxScreen
// can call ROLE_LABEL[activeScope.role] without blowing up.
jest.mock('@/hooks/useActiveRoleScope', () => ({
  ...jest.requireActual('@/hooks/useActiveRoleScope'),
  useActiveRoleScope: () => ({
    role: 'influencer',
    label: 'Creator',
    notifTypes: null,
    convScope: 'all',
  }),
}));

// ─── lucide-react-native ────────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_t: any, name: string) =>
        name === '__esModule'
          ? true
          : ({ size, color, ...rest }: any) => require('react').createElement(View, rest),
    },
  );
});

// react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));

// ─── Stub heavy/irrelevant sub-components ─────────────────────────────────────
const Null = () => null;
jest.mock('@/components/Navbar', () => ({ Navbar: Null }));
jest.mock('@/components/BackButton', () => ({ BackButton: Null }));
jest.mock('@/components/Footer', () => ({ Footer: Null }));
jest.mock('@/components/SEO', () => ({ __esModule: true, default: Null }));
jest.mock('@/components/ui/Skeleton', () => ({ Skeleton: Null }));

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('InfluencerTabs — InboxTab addition', () => {
  it('InfluencerTabs source imports InboxScreen and registers InboxTab', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../navigation/role/InfluencerTabs.tsx'),
      'utf8',
    );

    // Import present
    expect(src).toContain("InboxScreen from '@/screens/shared/InboxScreen'");
    // Tab registration
    expect(src).toContain('name="InboxTab"');
    expect(src).toContain('component={InboxScreen}');
    // Title and icon
    expect(src).toContain("title: 'Inbox'");
    expect(src).toContain('Inbox');   // lucide icon import
    // Still 5 tabs total (not 4)
    const tabMatches = src.match(/name="[A-Za-z]+Tab"/g) ?? [];
    expect(tabMatches).toHaveLength(5);
    expect(tabMatches).toContain('name="InboxTab"');
  });

  it('InboxScreen renders without crashing when mounted for an influencer', async () => {
    const InboxScreen = require('@/screens/shared/InboxScreen').default;

    // Error boundary to surface the real underlying error from AggregateError
    class Boundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      constructor(props: any) { super(props); this.state = { error: null }; }
      static getDerivedStateFromError(e: Error) { return { error: e }; }
      render() {
        if (this.state.error) throw this.state.error;
        return this.props.children;
      }
    }

    await render(
      <Boundary>
        <QueryClientProvider client={makeQC()}>
          <InboxScreen />
        </QueryClientProvider>
      </Boundary>,
    );
    await act(async () => {});
    // render completing without throw is the assertion
    expect(true).toBe(true);
  });
});
