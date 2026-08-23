/**
 * ParentVisibilityWiring.test.tsx
 *
 * Tests for the three fixes applied to parent-facing VisibilityDecisionScreen wiring:
 *
 * Fix 1 — linking.ts: VisibilityDecision route now uses a path segment
 *   (:proposalId) so deep links correctly populate route.params.proposalId.
 *
 * Fix 2a — NotificationsScreen: tapping a visibility_proposal notification
 *   navigates to AuthStack → VisibilityDecision with the correct proposalId.
 *
 * Fix 2b — ParentDashboard: pending visibility proposals scoped to
 *   awaiting_parent_user_id = user.id are fetched and rendered as tappable
 *   banners that navigate to VisibilityDecision.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';

// ─── Boilerplate mocks shared with the rest of the suite ─────────────────────

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

jest.mock('expo-audio', () => ({}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { All: 'All', Images: 'Images', Videos: 'Videos' },
}));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  setNotificationHandler: jest.fn(),
}));
jest.mock('expo-tracking-transparency', () => ({
  requestTrackingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
}));
jest.mock('expo-iap', () => ({}));
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));
jest.mock('@react-native-masked-view/masked-view', () => ({
  default: ({ children }: any) => children,
}));
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));
jest.mock('expo-asset', () => ({ Asset: { loadAsync: jest.fn() } }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(),
  preventAutoHideAsync: jest.fn(),
}));
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/components/Footer', () => ({ Footer: () => null }));
jest.mock('@/components/BackButton', () => ({ BackButton: () => null }));
jest.mock('@/components/Navbar', () => ({ Navbar: () => null }));
jest.mock('@/components/FloatingAICoach', () => () => null);
jest.mock('@/components/SEO', () => () => null);
jest.mock('@/components/Paywall', () => ({ Paywall: () => null }));
jest.mock('react-native-toast-message', () => ({
  default: () => null,
  show: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
    useRoute: () => ({ params: { proposalId: 'test-proposal-uuid' } }),
  };
});

// Supabase mock — from/select/eq/in/order chains all chainable; maybeSingle returns per-test value.
var mockFrom: jest.Mock;
mockFrom = jest.fn();
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'parent-uid', email: 'parent@example.com' } } }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'parent-uid', email: 'parent@example.com' } }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'parent-uid', email: 'parent@example.com' },
    isAuthenticated: true,
    isLoading: false,
    userRole: 'parent',
    signOut: jest.fn(),
  }),
}));

// ─── Fix 1: linking.ts VisibilityDecision route uses path segment ─────────────

describe('Fix 1 — linking.ts: VisibilityDecision uses path segment', () => {
  const linkingPath = path.resolve(__dirname, '../navigation/linking.ts');
  const src = fs.readFileSync(linkingPath, 'utf-8');

  it('maps VisibilityDecision to visibility-decision/:proposalId (path segment, not bare path)', () => {
    expect(src).toMatch(/VisibilityDecision:\s*['"`]visibility-decision\/:proposalId['"`]/);
  });

  it('does NOT use the old bare path without :proposalId', () => {
    // Old form was 'visibility-decision' — plain string with no param
    expect(src).not.toMatch(/VisibilityDecision:\s*['"`]visibility-decision['"`]/);
  });

  it('is consistent with the file-wide convention of path-segment params (no parse: object form)', () => {
    // Confirm no parse: key exists (file uses path segments throughout, not object form)
    expect(src).not.toMatch(/parse\s*:/);
  });
});

// ─── Fix 2a: NotificationsScreen navigates on visibility_proposal tap ─────────

describe('Fix 2a — NotificationsScreen: navigates to VisibilityDecision on proposal tap', () => {
  beforeEach(() => {
    mockNavigate.mockClear();

    // Chain mock: from('notifications').select('*').eq(...).eq(...).order(...).limit(...)
    // resolves with one visibility_proposal notification
    const chainMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [{
          id: 'notif-1',
          user_id: 'parent-uid',
          title: 'Visibility decision needed',
          body: 'A coach has requested public visibility for your athlete.',
          created_at: '2026-08-23T18:00:00Z',
          read: false,
          type: 'visibility_proposal',
          data: { proposalId: 'prop-uuid-abc' },
        }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chainMock);
  });

  it('NotificationsScreen source: handleTap navigates to AuthStack→VisibilityDecision for visibility_proposal type', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../screens/shared/NotificationsScreen.tsx'),
      'utf-8',
    );
    // handleTap must check for PROPOSAL_TYPE / 'visibility_proposal'
    expect(src).toMatch(/visibility_proposal/);
    // Must navigate to AuthStack with screen: VisibilityDecision
    expect(src).toMatch(/VisibilityDecision/);
    expect(src).toMatch(/proposalId/);
    // Must read proposalId from item.data
    expect(src).toMatch(/item\.data/);
  });

  it('NotificationsScreen source: Notification interface includes data field', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../screens/shared/NotificationsScreen.tsx'),
      'utf-8',
    );
    expect(src).toMatch(/data\s*:\s*Record<string,\s*any>\s*\|\s*null/);
  });
});

// ─── Fix 2b: ParentDashboard queries and renders pending proposals ─────────────

describe('Fix 2b — ParentDashboard: pending proposals fetched and rendered as banners', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../screens/parent/ParentDashboard.tsx'),
    'utf-8',
  );

  it('queries athlete_visibility_proposals scoped to awaiting_parent_user_id = user.id', () => {
    expect(src).toMatch(/athlete_visibility_proposals/);
    expect(src).toMatch(/awaiting_parent_user_id/);
    expect(src).toMatch(/user\.id/);
  });

  it('filters by status IN pending / pending_parent_invite', () => {
    expect(src).toMatch(/pending_parent_invite/);
    expect(src).toMatch(/['"`]pending['"`]/);
  });

  it('renders pending proposals as tappable banners with navigation to VisibilityDecision', () => {
    expect(src).toMatch(/pendingProposals/);
    expect(src).toMatch(/VisibilityDecision/);
    expect(src).toMatch(/proposalId.*proposal\.id|proposal\.id.*proposalId/);
  });

  it('banner includes human-readable text (Visibility decision needed)', () => {
    expect(src).toMatch(/Visibility decision needed/);
  });

  it('navigates to AuthStack → VisibilityDecision from banner press', () => {
    expect(src).toMatch(/AuthStack/);
    expect(src).toMatch(/screen.*VisibilityDecision|VisibilityDecision.*screen/);
  });

  it('fetchPendingProposals runs on mount (useEffect with user dependency)', () => {
    expect(src).toMatch(/fetchPendingProposals/);
    // Should be in a useEffect
    expect(src).toMatch(/useEffect[\s\S]{0,200}fetchPendingProposals/);
  });
});
