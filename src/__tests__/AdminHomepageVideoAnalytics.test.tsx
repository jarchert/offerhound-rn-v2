/**
 * AdminHomepageVideoAnalytics.test.tsx
 *
 * 1. AdminHomepageVideoAnalytics — real component
 *    a. renders summary tiles for all 5 event types
 *    b. shows per-video rows with counts and play-through %
 *    c. shows empty state when no events
 *    d. range selector buttons render (7d, 30d, All)
 *    e. play-through shows — when play count is 0
 *
 * 2. AdminDashboard — Videos tab wiring
 *    a. Videos tab button renders
 *    b. tapping Videos tab shows homepage-video-analytics
 *    c. switching away from Videos hides it
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

jest.mock('@/components/Navbar',                  () => ({ Navbar:                  () => null }));
jest.mock('@/components/AdminBadge',              () => ({ AdminBadge:              () => null }));
jest.mock('@/components/StatTile',                () => ({ StatTile:                () => null }));
jest.mock('@/components/AdminAnalyticsDashboard', () => ({ AdminAnalyticsDashboard: () => null }));
jest.mock('@/components/AdminSessionAnalytics',   () => ({ AdminSessionAnalytics:   () => null }));
jest.mock('@/components/AdminOnboardingStats',    () => ({ AdminOnboardingStats:    () => null }));

// ── imports ────────────────────────────────────────────────────────────────

import AdminHomepageVideoAnalytics from '@/components/AdminHomepageVideoAnalytics';
import AdminDashboard              from '@/screens/admin/AdminDashboard';

// ── helpers ────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(ui: React.ReactElement) {
  return <QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>;
}

const SAMPLE_EVENTS = [
  { video_id: 'athlete',   event_type: 'impression', viewer_mode: 'athlete', created_at: '2024-01-01T00:00:00Z' },
  { video_id: 'athlete',   event_type: 'tile_click', viewer_mode: 'athlete', created_at: '2024-01-01T00:01:00Z' },
  { video_id: 'athlete',   event_type: 'play',       viewer_mode: 'athlete', created_at: '2024-01-01T00:02:00Z' },
  { video_id: 'athlete',   event_type: 'pause',      viewer_mode: 'athlete', created_at: '2024-01-01T00:03:00Z' },
  { video_id: 'athlete',   event_type: 'complete',   viewer_mode: 'athlete', created_at: '2024-01-01T00:04:00Z' },
  { video_id: 'coach',     event_type: 'impression', viewer_mode: 'coach',   created_at: '2024-01-02T00:00:00Z' },
  { video_id: 'coach',     event_type: 'play',       viewer_mode: 'coach',   created_at: '2024-01-02T00:01:00Z' },
];

function mockSupabaseVideoEvents(data: any[], error: any = null) {
  const { supabase } = require('@/integrations/supabase/client');
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    limit:  jest.fn().mockReturnThis(),
    gte:    jest.fn().mockResolvedValue({ data, error }),
    // when range === 'all', limit resolves directly
    then:   jest.fn().mockResolvedValue({ data, error }),
  });
  // make limit also resolve for 'all' path
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    limit:  jest.fn((n: number) => ({
      gte: jest.fn().mockResolvedValue({ data, error }),
      then: (resolve: any) => resolve({ data, error }),
      // for 'all' range, limit itself is the terminal call
      ...{ data, error },
    })),
  });
}

function mockSupabaseVideoEventsSimple(data: any[], error: any = null) {
  const { supabase } = require('@/integrations/supabase/client');
  const terminal = { data, error };
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    gte:    jest.fn().mockResolvedValue(terminal),
    limit:  jest.fn().mockResolvedValue(terminal),
  };
  // gte needs to also be chainable from limit
  chain.limit.mockReturnValue({ gte: jest.fn().mockResolvedValue(terminal) });
  supabase.from.mockReturnValue(chain);
}

function mockDashboardSupabase() {
  const { supabase } = require('@/integrations/supabase/client');
  const countChain = { select: jest.fn().mockResolvedValue({ count: 0, error: null }) };
  const videoChain: any = {
    select: jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    limit:  jest.fn().mockReturnValue({
      gte: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };
  videoChain.limit.mockResolvedValue({ data: [], error: null });
  supabase.from.mockImplementation((table: string) => {
    if (table === 'homepage_video_events') return videoChain;
    return countChain;
  });
}

// ── 1a. summary tiles ──────────────────────────────────────────────────────

describe('AdminHomepageVideoAnalytics — summary tiles', () => {
  beforeEach(() => mockSupabaseVideoEventsSimple(SAMPLE_EVENTS));
  afterEach(() => jest.clearAllMocks());

  it('renders a tile for each event type', async () => {
    const { findByTestId } = await render(wrap(<AdminHomepageVideoAnalytics />));
    await findByTestId('tile-impression');
    await findByTestId('tile-tile_click');
    await findByTestId('tile-play');
    await findByTestId('tile-pause');
    await findByTestId('tile-complete');
  });
});

// ── 1b. per-video rows ─────────────────────────────────────────────────────

describe('AdminHomepageVideoAnalytics — per-video rows', () => {
  beforeEach(() => mockSupabaseVideoEventsSimple(SAMPLE_EVENTS));
  afterEach(() => jest.clearAllMocks());

  it('renders a row for each distinct video_id', async () => {
    const { findByTestId } = await render(wrap(<AdminHomepageVideoAnalytics />));
    await findByTestId('video-row-athlete');
    await findByTestId('video-row-coach');
  });

  it('shows correct impression count for athlete video', async () => {
    const { findByTestId } = await render(wrap(<AdminHomepageVideoAnalytics />));
    const cell = await findByTestId('video-athlete-impression');
    expect(cell.props.children).toBe('1');
  });

  it('shows 100% play-through for athlete (1 play, 1 complete)', async () => {
    const { findByTestId } = await render(wrap(<AdminHomepageVideoAnalytics />));
    const cell = await findByTestId('video-athlete-playthrough');
    expect(cell.props.children).toBe('100%');
  });

  it('shows — play-through for coach (1 play, 0 complete)', async () => {
    const { findByTestId } = await render(wrap(<AdminHomepageVideoAnalytics />));
    const cell = await findByTestId('video-coach-playthrough');
    expect(cell.props.children).toBe('—');
  });
});

// ── 1c. empty state ────────────────────────────────────────────────────────

describe('AdminHomepageVideoAnalytics — empty state', () => {
  beforeEach(() => mockSupabaseVideoEventsSimple([]));
  afterEach(() => jest.clearAllMocks());

  it('shows empty message when no events', async () => {
    const { findByTestId } = await render(wrap(<AdminHomepageVideoAnalytics />));
    await findByTestId('video-analytics-empty');
  });
});

// ── 1d. range selector ─────────────────────────────────────────────────────

describe('AdminHomepageVideoAnalytics — range selector', () => {
  beforeEach(() => mockSupabaseVideoEventsSimple([]));
  afterEach(() => jest.clearAllMocks());

  it('renders 7d, 30d, and All range buttons', async () => {
    const { findByTestId } = await render(wrap(<AdminHomepageVideoAnalytics />));
    await findByTestId('range-btn-7');
    await findByTestId('range-btn-30');
    await findByTestId('range-btn-all');
  });
});

// ── 2. AdminDashboard — Videos tab wiring ─────────────────────────────────

describe('AdminDashboard — Videos tab wiring', () => {
  beforeEach(() => mockDashboardSupabase());
  afterEach(() => jest.clearAllMocks());

  it('renders Videos tab button', async () => {
    const { findByTestId } = await render(wrap(<AdminDashboard />));
    await findByTestId('overview-tab-videos');
  });

  it('tapping Videos tab shows homepage-video-analytics', async () => {
    const { findByTestId } = await render(wrap(<AdminDashboard />));
    fireEvent.press(await findByTestId('overview-tab-videos'));
    await findByTestId('homepage-video-analytics');
  });

  it('switching to Stats hides homepage-video-analytics', async () => {
    const { findByTestId, queryByTestId } = await render(wrap(<AdminDashboard />));
    fireEvent.press(await findByTestId('overview-tab-videos'));
    await findByTestId('homepage-video-analytics');
    fireEvent.press(await findByTestId('overview-tab-stats'));
    await waitFor(() => {
      expect(queryByTestId('homepage-video-analytics')).toBeNull();
    });
  });
});
