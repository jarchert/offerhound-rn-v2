/**
 * AdminOnboardingStatsComponent.test.tsx
 *
 * Tests the real AdminOnboardingStats component in isolation:
 *   1. Renders role rows from user_roles query
 *   2. Shows empty state when no data returned
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}));

// ── helpers ────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(ui: React.ReactElement) {
  return <QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>;
}

// ── import under test ──────────────────────────────────────────────────────

import { AdminOnboardingStats } from '@/components/AdminOnboardingStats';

// ── 1. renders role rows ───────────────────────────────────────────────────

describe('AdminOnboardingStats — renders role rows', () => {
  const { supabase } = require('@/integrations/supabase/client');

  beforeEach(() => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [
          { role: 'athlete' },
          { role: 'athlete' },
          { role: 'coach' },
          { role: 'admin' },
        ],
        error: null,
      }),
    });
  });

  it('renders role list after data loads', async () => {
    const { findByTestId } = await render(wrap(<AdminOnboardingStats />));
    const list = await findByTestId('onboarding-stats-list');
    expect(list).toBeTruthy();
  });

  it('renders a badge for each distinct role', async () => {
    const { findByTestId } = await render(wrap(<AdminOnboardingStats />));
    await findByTestId('onboarding-stats-list');
    const athleteBadge = await findByTestId('role-badge-athlete');
    const coachBadge   = await findByTestId('role-badge-coach');
    const adminBadge   = await findByTestId('role-badge-admin');
    expect(athleteBadge).toBeTruthy();
    expect(coachBadge).toBeTruthy();
    expect(adminBadge).toBeTruthy();
  });
});

// ── 2. empty state ─────────────────────────────────────────────────────────

describe('AdminOnboardingStats — empty state', () => {
  const { supabase } = require('@/integrations/supabase/client');

  beforeEach(() => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  it('shows empty message when no roles returned', async () => {
    const { findByTestId } = await render(wrap(<AdminOnboardingStats />));
    const el = await findByTestId('onboarding-stats-empty');
    expect(el).toBeTruthy();
  });
});
