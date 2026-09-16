/**
 * AdminOnboardingStats.test.tsx
 *
 * Verifies AdminDashboard tab wiring:
 *   1. Three sub-tab buttons present: Stats, Sessions, Roles
 *   2. Default tab does NOT show AdminOnboardingStats
 *   3. Tapping Roles renders AdminOnboardingStats
 *   4. Switching to Roles hides AdminAnalyticsDashboard
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order:  jest.fn().mockReturnThis(),
      limit:  jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      not:    jest.fn().mockReturnThis(),
      is:     jest.fn().mockReturnThis(),
      then:   jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    })),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}));

jest.mock('@/components/Navbar',     () => ({ Navbar:     () => null }));
jest.mock('@/components/AdminBadge', () => ({ AdminBadge: () => null }));

jest.mock('@/components/AdminAnalyticsDashboard', () => ({
  AdminAnalyticsDashboard: () => {
    const { Text } = require('react-native');
    return <Text testID="admin-analytics-dashboard">AdminAnalyticsDashboard</Text>;
  },
}));

jest.mock('@/components/AdminSessionAnalytics', () => ({
  AdminSessionAnalytics: () => {
    const { Text } = require('react-native');
    return <Text testID="admin-session-analytics">AdminSessionAnalytics</Text>;
  },
}));

jest.mock('@/components/AdminOnboardingStats', () => ({
  AdminOnboardingStats: () => {
    const { Text } = require('react-native');
    return <Text testID="admin-onboarding-stats">AdminOnboardingStats</Text>;
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

import AdminDashboard from '@/screens/admin/AdminDashboard';

// ── 1. three sub-tab buttons ───────────────────────────────────────────────

describe('AdminDashboard — sub-tab buttons', () => {
  it('renders Stats, Sessions, and Roles tab buttons', async () => {
    const { findByTestId } = await render(wrap(<AdminDashboard />));
    const stats    = await findByTestId('overview-tab-stats');
    const sessions = await findByTestId('overview-tab-sessions');
    const roles    = await findByTestId('overview-tab-roles');
    expect(stats).toBeTruthy();
    expect(sessions).toBeTruthy();
    expect(roles).toBeTruthy();
  });
});

// ── 2-4. Roles sub-tab behaviour ──────────────────────────────────────────

describe('AdminDashboard — Roles sub-tab', () => {
  it('does not show AdminOnboardingStats on default Stats tab', async () => {
    const { queryByTestId } = await render(wrap(<AdminDashboard />));
    expect(queryByTestId('admin-onboarding-stats')).toBeNull();
  });

  it('renders AdminOnboardingStats after tapping Roles', async () => {
    const { findByTestId } = await render(wrap(<AdminDashboard />));
    const rolesBtn = await findByTestId('overview-tab-roles');
    fireEvent.press(rolesBtn);
    await waitFor(async () => {
      const el = await findByTestId('admin-onboarding-stats');
      expect(el).toBeTruthy();
    });
  });

  it('hides analytics dashboard after switching to Roles tab', async () => {
    const { findByTestId, queryByTestId } = await render(wrap(<AdminDashboard />));
    await findByTestId('admin-analytics-dashboard');
    const rolesBtn = await findByTestId('overview-tab-roles');
    fireEvent.press(rolesBtn);
    await waitFor(() => {
      expect(queryByTestId('admin-analytics-dashboard')).toBeNull();
    });
  });
});
