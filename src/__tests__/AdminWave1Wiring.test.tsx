/**
 * AdminWave1Wiring.test.tsx
 *
 * Verifies the 6 Wave 1 wiring points:
 *   1. AdminDashboard "Stats" sub-tab renders AdminAnalyticsDashboard
 *   2. AdminDashboard "Sessions" sub-tab renders AdminSessionAnalytics
 *   3. AdminModerationScreen "Reports" section renders existing queue UI
 *   4. AdminModerationScreen "Camps" section renders AdminCampModeration
 *   5. AdminContentScreen renders AdminInvitationCards alongside PodcastTileUpload
 *   6. AdminSocialScreen / AdminBetaScreen render their wrapped components;
 *      linking.ts includes new deep-link paths
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fs from 'fs';
import * as nodePath from 'path';

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
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
}));

jest.mock('@/components/Navbar', () => ({ Navbar: () => null }));
jest.mock('@/components/AdminBadge', () => ({ AdminBadge: () => null }));
jest.mock('@/components/SectionHeader', () => ({ SectionHeader: () => null }));

jest.mock('@/components/StatTile', () => ({
  StatTile: ({ label }: { label: string }) => {
    const { Text } = require('react-native');
    return <Text>{label}</Text>;
  },
}));

jest.mock('@/components/AdminAnalyticsDashboard', () => ({
  AdminAnalyticsDashboard: () => {
    const { Text } = require('react-native');
    return <Text testID="admin-analytics-dashboard">AdminAnalyticsDashboard</Text>;
  },
  default: () => {
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

jest.mock('@/components/AdminCampModeration', () => ({
  AdminCampModeration: () => {
    const { Text } = require('react-native');
    return <Text testID="admin-camp-moderation">AdminCampModeration</Text>;
  },
}));

jest.mock('@/components/admin/PodcastTileUpload', () => ({
  PodcastTileUpload: () => {
    const { Text } = require('react-native');
    return <Text testID="podcast-tile-upload">PodcastTileUpload</Text>;
  },
}));

jest.mock('@/components/AdminInvitationCards', () => ({
  AdminInvitationCards: () => {
    const { Text } = require('react-native');
    return <Text testID="admin-invitation-cards">AdminInvitationCards</Text>;
  },
}));

jest.mock('@/components/AdminTestimonialManager', () => ({
  AdminTestimonialManager: () => {
    const { Text } = require('react-native');
    return <Text testID="admin-testimonial-manager">AdminTestimonialManager</Text>;
  },
}));

jest.mock('@/components/AdminBetaFeedbackDashboard', () => ({
  AdminBetaFeedbackDashboard: () => {
    const { Text } = require('react-native');
    return <Text testID="admin-beta-feedback-dashboard">AdminBetaFeedbackDashboard</Text>;
  },
}));

jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});

// ── helpers ────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(ui: React.ReactElement) {
  return <QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>;
}

// ── imports under test ─────────────────────────────────────────────────────

import AdminDashboard from '@/screens/admin/AdminDashboard';
import AdminModerationScreen from '@/screens/admin/AdminModerationScreen';
import AdminContentScreen from '@/screens/admin/AdminContentScreen';
import AdminBetaScreen from '@/screens/admin/AdminBetaScreen';
import AdminSocialScreen from '@/screens/admin/AdminSocialScreen';
import AdminTabs from '@/navigation/role/AdminTabs';

// ── 1. AdminDashboard — "Stats" sub-tab shows AdminAnalyticsDashboard ──────

describe('AdminDashboard — Stats sub-tab', () => {
  it('renders AdminAnalyticsDashboard on Stats tab (default)', async () => {
    const { findByTestId } = await render(wrap(<AdminDashboard />));
    const el = await findByTestId('admin-analytics-dashboard');
    expect(el).toBeTruthy();
  });

  it('Stats tab button is present', async () => {
    const { findByTestId } = await render(wrap(<AdminDashboard />));
    const btn = await findByTestId('overview-tab-stats');
    expect(btn).toBeTruthy();
  });
});

// ── 2. AdminDashboard — "Sessions" sub-tab shows AdminSessionAnalytics ─────

describe('AdminDashboard — Sessions sub-tab', () => {
  it('renders AdminSessionAnalytics after tapping Sessions', async () => {
    const { findByTestId, queryByTestId } = await render(wrap(<AdminDashboard />));

    // Default is Stats tab — analytics dashboard visible
    await findByTestId('admin-analytics-dashboard');

    // Tap Sessions
    const sessionsBtn = await findByTestId('overview-tab-sessions');
    fireEvent.press(sessionsBtn);

    await waitFor(async () => {
      const el = await findByTestId('admin-session-analytics');
      expect(el).toBeTruthy();
    });

    // Analytics dashboard no longer rendered after switching
    expect(queryByTestId('admin-analytics-dashboard')).toBeNull();
  });
});

// ── 3. AdminModerationScreen — "Reports" section is default ───────────────

describe('AdminModerationScreen — Reports section', () => {
  it('shows Reports section by default', async () => {
    const { findByTestId } = await render(wrap(<AdminModerationScreen />));
    const btn = await findByTestId('mod-section-reports');
    expect(btn).toBeTruthy();
  });

  it('does not show AdminCampModeration when Reports section active', async () => {
    const { queryByTestId } = await render(wrap(<AdminModerationScreen />));
    expect(queryByTestId('admin-camp-moderation')).toBeNull();
  });
});

// ── 4. AdminModerationScreen — "Camps" section shows AdminCampModeration ───

describe('AdminModerationScreen — Camps section', () => {
  it('renders AdminCampModeration after tapping Camps', async () => {
    const { findByTestId } = await render(wrap(<AdminModerationScreen />));

    const campsBtn = await findByTestId('mod-section-camps');
    fireEvent.press(campsBtn);

    await waitFor(async () => {
      const el = await findByTestId('admin-camp-moderation');
      expect(el).toBeTruthy();
    });
  });
});

// ── 5. AdminContentScreen — both components render in same tree ────────────

describe('AdminContentScreen', () => {
  it('renders PodcastTileUpload', async () => {
    const { findByTestId } = await render(wrap(<AdminContentScreen />));
    const el = await findByTestId('podcast-tile-upload');
    expect(el).toBeTruthy();
  });

  it('renders AdminInvitationCards', async () => {
    const { findByTestId } = await render(wrap(<AdminContentScreen />));
    const el = await findByTestId('admin-invitation-cards');
    expect(el).toBeTruthy();
  });

  it('renders both in the same render tree', async () => {
    const { findByTestId } = await render(wrap(<AdminContentScreen />));
    const pod = await findByTestId('podcast-tile-upload');
    const inv = await findByTestId('admin-invitation-cards');
    expect(pod).toBeTruthy();
    expect(inv).toBeTruthy();
  });
});

// ── 6a. AdminBetaScreen — renders AdminBetaFeedbackDashboard ───────────────

describe('AdminBetaScreen', () => {
  it('renders AdminBetaFeedbackDashboard', async () => {
    const { findByTestId } = await render(wrap(<AdminBetaScreen />));
    const el = await findByTestId('admin-beta-feedback-dashboard');
    expect(el).toBeTruthy();
  });
});

// ── 6b. AdminSocialScreen — renders AdminTestimonialManager ────────────────

describe('AdminSocialScreen', () => {
  it('renders AdminTestimonialManager', async () => {
    const { findByTestId } = await render(wrap(<AdminSocialScreen />));
    const el = await findByTestId('admin-testimonial-manager');
    expect(el).toBeTruthy();
  });
});

// ── 6c. Module-level shape checks ──────────────────────────────────────────

describe('AdminTabs navigation structure', () => {
  it('AdminBetaScreen exports a default component', () => {
    expect(typeof AdminBetaScreen).toBe('function');
  });

  it('AdminSocialScreen exports a default component', () => {
    expect(typeof AdminSocialScreen).toBe('function');
  });

  it('AdminTabs exports a default component', () => {
    expect(typeof AdminTabs).toBe('function');
  });
});

// ── 6d. linking.ts — new deep-link paths present (source-file check) ────────

describe('linking.ts — Wave 1 admin deep-link paths', () => {
  const linkingSrc = fs.readFileSync(
    nodePath.resolve(__dirname, '../navigation/linking.ts'),
    'utf-8',
  );

  it('includes LettersAnalyticsTab mapped to admin/letter-analytics', () => {
    expect(linkingSrc).toMatch(/LettersAnalyticsTab.*admin\/letter-analytics/);
  });

  it('includes SocialTab mapped to admin/social', () => {
    expect(linkingSrc).toMatch(/SocialTab.*admin\/social/);
  });

  it('includes BetaTab mapped to admin/beta', () => {
    expect(linkingSrc).toMatch(/BetaTab.*admin\/beta/);
  });
});
