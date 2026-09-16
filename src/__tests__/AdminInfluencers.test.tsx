/**
 * AdminInfluencers.test.tsx
 *
 * 1. AdminInfluencersScreen — real component
 *    a. renders influencer cards from influencer_profiles query
 *    b. shows handle, affiliation_type·primary_sport subtitle, badges
 *    c. shows empty state when no data returned
 *    d. filters by search input
 *
 * 2. AdminUsersScreen — tab wiring
 *    a. renders All Users and Influencers tab buttons
 *    b. default tab does not show influencer search input
 *    c. tapping Influencers tab renders influencer search input
 *    d. switching back to All Users hides influencer search input
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}));

jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});

jest.mock('@/components/Navbar',        () => ({ Navbar:     () => null }));
jest.mock('@/components/AdminBadge',    () => ({ AdminBadge: () => null }));
jest.mock('@/components/ui/Avatar',     () => ({ Avatar:     () => null }));
jest.mock('@/components/ui/Card',       () => ({
  Card: ({ children, testID, style }: any) => {
    const { View } = require('react-native');
    return <View testID={testID} style={style}>{children}</View>;
  },
}));
jest.mock('@/components/ui/Badge',      () => ({
  Badge: ({ children, testID }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID}>{children}</Text>;
  },
}));

// ── imports ────────────────────────────────────────────────────────────────

import AdminInfluencersScreen from '@/screens/admin/AdminInfluencersScreen';
import AdminUsersScreen       from '@/screens/admin/AdminUsersScreen';

// ── helpers ────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(ui: React.ReactElement) {
  return <QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>;
}

const SAMPLE_INFLUENCERS = [
  {
    id: 'inf-1',
    user_id: 'u-1',
    display_name: 'Jordan Rivers',
    handle: 'jordanrivers',
    bio: null,
    profile_image_url: null,
    follower_count: 12500,
    verification_status: 'verified',
    affiliation_type: 'college',
    primary_sport: 'football',
    board_visibility: 'public',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'inf-2',
    user_id: 'u-2',
    display_name: 'Casey Brooks',
    handle: 'caseyb',
    bio: null,
    profile_image_url: null,
    follower_count: 800,
    verification_status: 'pending',
    affiliation_type: 'high_school',
    primary_sport: 'basketball',
    board_visibility: 'private',
    created_at: '2024-02-01T00:00:00Z',
  },
];

function mockSupabaseFrom(data: any[], error: any = null) {
  const { supabase } = require('@/integrations/supabase/client');
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    limit:  jest.fn().mockResolvedValue({ data, error }),
    in:     jest.fn().mockResolvedValue({ data, error }),
  });
}

// ── 1a. renders influencer cards ───────────────────────────────────────────

describe('AdminInfluencersScreen — renders influencer cards', () => {
  beforeEach(() => mockSupabaseFrom(SAMPLE_INFLUENCERS));
  afterEach(() => jest.clearAllMocks());

  it('renders a card for each influencer', async () => {
    const { findByTestId } = await render(wrap(<AdminInfluencersScreen />));
    await findByTestId('influencer-card-inf-1');
    await findByTestId('influencer-card-inf-2');
  });

  it('shows display_name and handle', async () => {
    const { findByText } = await render(wrap(<AdminInfluencersScreen />));
    await findByText('Jordan Rivers');
    await findByText('@jordanrivers');
  });

  it('shows affiliation_type · primary_sport as subtitle', async () => {
    const { findByText } = await render(wrap(<AdminInfluencersScreen />));
    await findByText('college · football');
    await findByText('high_school · basketball');
  });

  it('shows verification_status badge', async () => {
    const { findByTestId } = await render(wrap(<AdminInfluencersScreen />));
    await findByTestId('influencer-verification-inf-1');
    await findByTestId('influencer-verification-inf-2');
  });

  it('shows board_visibility badge', async () => {
    const { findByTestId } = await render(wrap(<AdminInfluencersScreen />));
    await findByTestId('influencer-visibility-inf-1');
    await findByTestId('influencer-visibility-inf-2');
  });
});

// ── 1b. empty state ────────────────────────────────────────────────────────

describe('AdminInfluencersScreen — empty state', () => {
  beforeEach(() => mockSupabaseFrom([]));
  afterEach(() => jest.clearAllMocks());

  it('shows empty message when no influencers', async () => {
    const { findByTestId } = await render(wrap(<AdminInfluencersScreen />));
    await findByTestId('influencers-empty');
  });
});

// ── 1c. search filter ──────────────────────────────────────────────────────

describe('AdminInfluencersScreen — search filter', () => {
  beforeEach(() => mockSupabaseFrom(SAMPLE_INFLUENCERS));
  afterEach(() => jest.clearAllMocks());

  it('filters cards by search input', async () => {
    const { findByTestId, queryByTestId, findByPlaceholderText } = await render(
      wrap(<AdminInfluencersScreen />),
    );
    await findByTestId('influencer-card-inf-1');
    const input = await findByPlaceholderText('Search by name, handle, sport…');
    fireEvent.changeText(input, 'basketball');
    await waitFor(() => {
      expect(queryByTestId('influencer-card-inf-1')).toBeNull();
    });
    await findByTestId('influencer-card-inf-2');
  });
});

// ── 2. AdminUsersScreen — tab wiring ──────────────────────────────────────

describe('AdminUsersScreen — tab wiring', () => {
  beforeEach(() => {
    const { supabase } = require('@/integrations/supabase/client');
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      order:  jest.fn().mockReturnThis(),
      limit:  jest.fn().mockResolvedValue({ data: [], error: null }),
      in:     jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
  });
  afterEach(() => jest.clearAllMocks());

  it('renders All Users and Influencers tab buttons', async () => {
    const { findByTestId } = await render(wrap(<AdminUsersScreen />));
    await findByTestId('users-tab-all');
    await findByTestId('users-tab-influencers');
  });

  it('default tab does not show influencer search input', async () => {
    const { queryByTestId } = await render(wrap(<AdminUsersScreen />));
    expect(queryByTestId('influencer-search-input')).toBeNull();
  });

  it('tapping Influencers tab renders influencer search input', async () => {
    const { findByTestId } = await render(wrap(<AdminUsersScreen />));
    fireEvent.press(await findByTestId('users-tab-influencers'));
    await findByTestId('influencer-search-input');
  });

  it('switching back to All Users hides influencer search input', async () => {
    const { findByTestId, queryByTestId } = await render(wrap(<AdminUsersScreen />));
    fireEvent.press(await findByTestId('users-tab-influencers'));
    await findByTestId('influencer-search-input');
    fireEvent.press(await findByTestId('users-tab-all'));
    await waitFor(() => {
      expect(queryByTestId('influencer-search-input')).toBeNull();
    });
  });
});
