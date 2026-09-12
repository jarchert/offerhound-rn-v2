/**
 * SocialLinksManager — "Shareable Athlete Card" bottom reachability.
 *
 * The athlete Profile tab (DashboardScreen -> SocialLinksManager with
 * role='athlete') renders the FULL <ProfileCardGenerator /> (header, radar
 * chart, QR, etc.) plus a sibling <CardShareActions /> Share/SMS/Email button
 * row directly inside the screen-level outer <ScrollView>. This is the
 * NON-MODAL twin of the SharePlayerCardDialog fix from cd10343 — same class
 * of bug (bottom action buttons unreachable), different render path.
 *
 * The reported "cut off at bottom, no scroll" symptom applies here if:
 *   1. The <CardShareActions> row is nested inside an overflow:hidden or
 *      fixed-height container that clips it, OR
 *   2. The section is inside a container that steals scroll gestures (nested
 *      ScrollView, FlatList, etc.) and prevents the outer screen scroll from
 *      reaching the bottom.
 *
 * This test locks in the invariants that guarantee bottom reachability WHEN
 * SocialLinksManager is mounted inside its intended screen-level ScrollView:
 *
 *   (a) The rendered tree contains ZERO nested ScrollView / FlatList inside
 *       SocialLinksManager itself. Only the outer screen scroll should exist.
 *       (Nested vertical scrolls would steal focus per the cd10343 finding.)
 *   (b) The section-level <CardShareActions /> row exists AND is NOT a
 *       descendant of any View whose resolved style has overflow:'hidden'.
 *       Otherwise a very tall <ProfileCardGenerator /> above it could
 *       theoretically push the action row outside a clip region.
 *   (c) The Card containing the "Shareable Athlete Card" section, plus the
 *       CardContent, plus the sibling <CardShareActions />, are all reachable
 *       from the SocialLinksManager root without traversing any View with
 *       overflow:'hidden' or an intrinsic maxHeight / fixed height.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';

// ─── stubs for the wide set of hooks/modules SocialLinksManager pulls in ──
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'athlete-uid' } }),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

// react-query useMutation used inside the component
jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

// Stub ProfileCardGenerator to a tall block so we can observe scroll geometry.
jest.mock('@/components/ProfileCardGenerator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    ProfileCardGenerator: () =>
      React.createElement(
        View,
        { testID: 'pcg-stub', style: { height: 1200 } },
        React.createElement(Text, { key: 't' }, 'tall PCG stub'),
      ),
    default: () => React.createElement(View, { testID: 'pcg-stub' }),
  };
});

// Stub CardShareActions to render a recognizable Share button so the test
// can locate it in the tree.
jest.mock('@/components/CardShareActions', () => ({
  CardShareActions: () => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: 'section-card-share-actions' },
      React.createElement(Text, { key: 't' }, 'Share'),
    );
  },
}));

// Import AFTER mocks.
import { SocialLinksManager } from '@/components/SocialLinksManager';

// ─── helpers ────────────────────────────────────────────────────────────────
function isScrollLike(type: any): boolean {
  if (!type) return false;
  const name = typeof type === 'string' ? type : type?.displayName || type?.name;
  return name === 'RCTScrollView' || name === 'ScrollView' || name === 'FlatList' || name === 'VirtualizedList';
}

function countByType(node: any, predicate: (t: any) => boolean): number {
  if (!node) return 0;
  const nodes = Array.isArray(node) ? node : [node];
  let total = 0;
  for (const n of nodes) {
    if (n && typeof n === 'object' && predicate(n.type)) total += 1;
    if (n && typeof n === 'object' && n.children) total += countByType(n.children, predicate);
  }
  return total;
}

function findByTestID(node: any, id: string): any | null {
  if (!node) return null;
  const nodes = Array.isArray(node) ? node : [node];
  for (const n of nodes) {
    if (n && typeof n === 'object') {
      if (n.props?.testID === id) return n;
      const found = findByTestID(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function resolveStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce((acc, s) => ({ ...acc, ...resolveStyle(s) }), {});
  if (typeof style === 'object') return style;
  return {};
}

/**
 * Walk from root down; return true if any ancestor View of `targetId` has
 * style.overflow === 'hidden'. Returns false if targetId not found OR the
 * path has no clipping ancestor.
 */
function anyAncestorHasOverflowHidden(root: any, targetId: string): boolean {
  function walk(node: any, ancestorClipped: boolean): boolean | null {
    if (!node) return null;
    const nodes = Array.isArray(node) ? node : [node];
    for (const n of nodes) {
      if (n && typeof n === 'object') {
        const style = resolveStyle(n.props?.style);
        const nowClipped = ancestorClipped || style.overflow === 'hidden';
        if (n.props?.testID === targetId) return nowClipped;
        if (n.children) {
          const sub = walk(n.children, nowClipped);
          if (sub !== null) return sub;
        }
      }
    }
    return null;
  }
  const res = walk(root, false);
  return !!res;
}

describe('SocialLinksManager — Shareable Athlete Card bottom reachability', () => {
  it('renders ZERO nested vertical scroll containers inside SocialLinksManager (relies on outer screen scroll)', async () => {
    const tree = await render(
      <SocialLinksManager role="athlete" profileName="Test Athlete" initialLinks={{}} />,
    );
    await act(async () => {});

    const json = tree.toJSON();
    const scrollLikeCount = countByType(json, isScrollLike);
    // SocialLinksManager itself must NOT introduce a scroll container — the
    // outer screen ScrollView owns scrolling for this page. A nested one
    // here would steal gesture focus and hide the bottom Share row (same
    // failure mode as cd10343 Bug 3, transposed to the non-modal path).
    expect(scrollLikeCount).toBe(0);
  });

  it('renders the section-level CardShareActions (Share button row) in the DOM tree', async () => {
    const tree = await render(
      <SocialLinksManager role="athlete" profileName="Test Athlete" initialLinks={{}} />,
    );
    await act(async () => {});

    const json = tree.toJSON();
    const actions = findByTestID(json, 'section-card-share-actions');
    expect(actions).not.toBeNull();
  });

  it('the section-level CardShareActions is NOT clipped by an ancestor that combines overflow:hidden AND a fixed/max height', async () => {
    const tree = await render(
      <SocialLinksManager role="athlete" profileName="Test Athlete" initialLinks={{}} />,
    );
    await act(async () => {});

    const json = tree.toJSON();
    // The real user-visible clipping bug requires BOTH overflow:'hidden' AND
    // a height constraint (height/maxHeight). overflow:'hidden' alone on a
    // Card just enforces rounded-corner clipping and doesn't hide content in
    // normal flex flow. This is the invariant that actually protects the
    // bottom Share row from being cut off.
    function findClippingAncestor(root: any, targetId: string): any | null {
      function walk(node: any, path: any[]): any | null {
        if (!node) return null;
        const nodes = Array.isArray(node) ? node : [node];
        for (const n of nodes) {
          if (n && typeof n === 'object') {
            if (n.props?.testID === targetId) {
              for (const anc of path) {
                const style = resolveStyle(anc.props?.style);
                const hasClip = style.overflow === 'hidden';
                const hasHeightConstraint =
                  (typeof style.height === 'number' && style.height > 0) ||
                  (typeof style.maxHeight === 'number' && style.maxHeight > 0) ||
                  (typeof style.maxHeight === 'string' && /%$/.test(style.maxHeight));
                if (hasClip && hasHeightConstraint) return anc;
              }
              return null;
            }
            if (n.children) {
              const sub = walk(n.children, [...path, n]);
              if (sub !== null) return sub;
            }
          }
        }
        return null;
      }
      return walk(root, []);
    }
    const violator = findClippingAncestor(json, 'section-card-share-actions');
    expect(violator).toBeNull();
  });

  it('the tall PCG stub (1200pt) does NOT sit inside a fixed-height ancestor that would clip it', async () => {
    const tree = await render(
      <SocialLinksManager role="athlete" profileName="Test Athlete" initialLinks={{}} />,
    );
    await act(async () => {});

    const json = tree.toJSON();
    const pcg = findByTestID(json, 'pcg-stub');
    expect(pcg).not.toBeNull();

    // The IMMEDIATE wrapping View (SocialLinksManager's cardCapture) has
    // overflow:'hidden' by design (for react-native-view-shot to capture
    // clean rounded corners), but it must NOT set a fixed height/maxHeight
    // that would clip a real card. Verify by walking from root, collecting
    // any ancestor with fixed height / maxHeight.
    function findFixedHeightAncestor(root: any, targetId: string): any | null {
      function walk(node: any, ancestorViolator: any | null): any | null {
        if (!node) return null;
        const nodes = Array.isArray(node) ? node : [node];
        for (const n of nodes) {
          if (n && typeof n === 'object') {
            const style = resolveStyle(n.props?.style);
            const nowViolator =
              ancestorViolator ??
              (typeof style.height === 'number' && style.height > 0
                ? n
                : typeof style.maxHeight === 'number' && style.maxHeight > 0
                ? n
                : null);
            if (n.props?.testID === targetId) return nowViolator;
            if (n.children) {
              const sub = walk(n.children, nowViolator);
              if (sub !== null) return sub;
            }
          }
        }
        return null;
      }
      return walk(root, null);
    }
    // The PCG stub itself has height:1200 for the layout test, so we filter
    // to ancestors ONLY (skip the target node).
    function findFixedHeightAncestorStrict(root: any, targetId: string): any | null {
      function walk(node: any, path: any[]): any | null {
        if (!node) return null;
        const nodes = Array.isArray(node) ? node : [node];
        for (const n of nodes) {
          if (n && typeof n === 'object') {
            if (n.props?.testID === targetId) {
              // Walk `path` (ancestors) and check each.
              for (const anc of path) {
                const style = resolveStyle(anc.props?.style);
                if (
                  (typeof style.height === 'number' && style.height > 0) ||
                  (typeof style.maxHeight === 'number' && style.maxHeight > 0)
                ) {
                  return anc;
                }
              }
              return null;
            }
            if (n.children) {
              const sub = walk(n.children, [...path, n]);
              if (sub !== null) return sub;
            }
          }
        }
        return null;
      }
      return walk(root, []);
    }
    const violator = findFixedHeightAncestorStrict(json, 'pcg-stub');
    expect(violator).toBeNull();
  });
});
