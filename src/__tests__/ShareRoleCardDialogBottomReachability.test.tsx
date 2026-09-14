/**
 * ShareRoleCardDialog — Bug 3 parity coverage for scout/club_coach/hs_coach.
 *
 * cd10343 fixed the athlete-side SharePlayerCardDialog by removing a nested
 * ScrollView. ShareRoleCardDialog (which serves scouts, club coaches, and HS
 * coaches from their respective dashboards) was never covered by an equivalent
 * structural test. The screen uses a raw <Modal> bottom-sheet with maxHeight:
 * 85% plus a single <ScrollView> for the card + action row (Share, Copy Link).
 *
 * The reported symptom category — "action buttons unreachable at the bottom
 * of the share card" — applies here for TWO reasons:
 *   1. Same structural risk (nested ScrollView) — this test locks in that ONLY
 *      one ScrollView exists between the Modal root and the action buttons.
 *   2. Bottom safe-area occlusion — the earlier contentContainerStyle had no
 *      paddingBottom beyond spacing.lg (24pt), so on devices with a home
 *      indicator / nav bar the last button sat behind the system UI. Fix
 *      adds flexGrow:1 + paddingBottom (spacing.xl + spacing.md = 48pt) to
 *      the ScrollView contentContainer.
 *
 * This test asserts:
 *   (a) Exactly ONE ScrollView between the Modal root and the action row.
 *   (b) The Share AND Copy Link buttons are BOTH descendants of that
 *       ScrollView (so they participate in scrolling — not siblings of the
 *       ScrollView pinned to the sheet bottom).
 *   (c) The ScrollView contentContainerStyle includes paddingBottom >= 32pt
 *       and flexGrow:1 — the exact hardening the fix applies.
 *
 * Runs for all three roles wired to this component: scout, club_coach,
 * hs_coach — the ones known to render <ShareRoleCardDialog> in the app.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';

// ─── Auth / profile hook stubs ──────────────────────────────────────────────
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@example.com' } }),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@/hooks/useCoachProfile', () => ({
  useCoachProfile: () => ({
    data: {
      name: 'Test Coach',
      position_coached: 'Head Coach',
      division: 'D1',
      school: 'Test University',
      email: 'coach@test.edu',
    },
  }),
}));
jest.mock('@/hooks/useScoutProfile', () => ({
  useScoutProfile: () => ({
    data: {
      name: 'Test Scout',
      title: 'Regional Scout',
      company: 'Scout Co',
      email: 'scout@test.co',
    },
  }),
}));
jest.mock('@/hooks/usePlayerProfile', () => ({
  usePlayerProfile: () => ({ profile: { full_name: 'Test Athlete' } }),
}));

// react-query hook for influencer (used inside component for role='influencer')
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: null, isLoading: false }),
}));

// Supabase client — not actually invoked with these role prop values but the
// module import must not blow up.
jest.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

// QR renderer — stub to avoid native SVG in jest
jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: () => React.createElement(View, { testID: 'qr-stub' }) };
});

// Import AFTER mocks.
import { ShareRoleCardDialog } from '@/components/ShareRoleCardDialog';

/** Walk the RNTL JSON tree and count nodes whose type matches predicate. */
function countByType(node: any, predicate: (t: any) => boolean): number {
  if (!node) return 0;
  const nodes = Array.isArray(node) ? node : [node];
  let total = 0;
  for (const n of nodes) {
    if (n && typeof n === 'object' && predicate(n.type)) total += 1;
    if (n && typeof n === 'object' && n.children) {
      total += countByType(n.children, predicate);
    }
  }
  return total;
}

function isScrollView(type: any): boolean {
  if (!type) return false;
  const name = typeof type === 'string' ? type : type?.displayName || type?.name;
  return name === 'RCTScrollView' || name === 'ScrollView';
}

function findScrollView(node: any): any | null {
  if (!node) return null;
  const nodes = Array.isArray(node) ? node : [node];
  for (const n of nodes) {
    if (n && typeof n === 'object' && isScrollView(n.type)) return n;
    if (n && typeof n === 'object' && n.children) {
      const found = findScrollView(n.children);
      if (found) return found;
    }
  }
  return null;
}

function findAllByText(node: any, text: string): any[] {
  const out: any[] = [];
  if (!node) return out;
  const nodes = Array.isArray(node) ? node : [node];
  for (const n of nodes) {
    if (n && typeof n === 'object') {
      // For Text nodes, RNTL puts the text string directly in children.
      if (n.children) {
        if (Array.isArray(n.children)) {
          for (const c of n.children) {
            if (typeof c === 'string' && c === text) {
              out.push(n);
              break;
            }
          }
        } else if (typeof n.children === 'string' && n.children === text) {
          out.push(n);
        }
        out.push(...findAllByText(n.children, text));
      }
    }
  }
  return out;
}

/**
 * Extract the resolved contentContainerStyle from a ScrollView node.
 * RN test renderer sometimes flattens style arrays; support both shapes.
 */
function resolveStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc, s) => ({ ...acc, ...resolveStyle(s) }), {});
  }
  if (typeof style === 'object') return style;
  return {};
}

describe.each(['scout', 'club_coach', 'hs_coach'] as const)(
  'ShareRoleCardDialog — bottom action button reachability (role=%s)',
  (role) => {
    it('renders exactly ONE ScrollView between the Modal root and the action buttons', async () => {
      const tree = await render(
        <ShareRoleCardDialog role={role} visible={true} onClose={() => undefined} />,
      );
      await act(async () => {});

      const json = tree.toJSON();
      const scrollCount = countByType(json, isScrollView);
      // Exactly 1 — DialogContent's / sheet's ScrollView, no nested inner one.
      expect(scrollCount).toBe(1);
    });

    it('renders BOTH the Share and Copy Link buttons as descendants of that ScrollView (so they scroll into view)', async () => {
      const tree = await render(
        <ShareRoleCardDialog role={role} visible={true} onClose={() => undefined} />,
      );
      await act(async () => {});

      const json = tree.toJSON();
      const scroll = findScrollView(json);
      expect(scroll).not.toBeNull();

      // Both action button labels must be found inside the ScrollView subtree —
      // if either is a sibling of the ScrollView (pinned to sheet bottom) it
      // could be occluded on devices with bottom safe-area insets.
      const shareInsideScroll = findAllByText(scroll, 'Share');
      const copyInsideScroll = findAllByText(scroll, 'Copy Link');
      expect(shareInsideScroll.length).toBeGreaterThan(0);
      expect(copyInsideScroll.length).toBeGreaterThan(0);
    });

    it("ScrollView contentContainerStyle has flexGrow:1 AND paddingBottom >= 32pt (safe-area clearance)", async () => {
      const tree = await render(
        <ShareRoleCardDialog role={role} visible={true} onClose={() => undefined} />,
      );
      await act(async () => {});

      const json = tree.toJSON();
      const scroll = findScrollView(json);
      expect(scroll).not.toBeNull();

      const contentContainerStyle = resolveStyle(scroll.props?.contentContainerStyle);
      // Fix invariant: flexGrow:1 so the container fills the available sheet
      // height, and paddingBottom generous enough to clear iPhone/Android
      // bottom safe-area insets. spacing.xl (32) + spacing.md (16) = 48pt.
      expect(contentContainerStyle.flexGrow).toBe(1);
      expect(contentContainerStyle.paddingBottom).toBeGreaterThanOrEqual(32);
    });
  },
);
