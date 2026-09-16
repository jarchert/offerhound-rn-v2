/**
 * SharePlayerCardDialog — Bug 3 hardening: tall-content variant.
 *
 * The existing SharePlayerCardDialogBug3.test.tsx verifies scroll STRUCTURE
 * (exactly one ScrollView, no nested wrappers). That's necessary but not
 * sufficient — the reported bug can also surface when the real
 * <ProfileCardGenerator /> is populated with a fully filled athlete profile
 * (header, badges, measurables, contacts, socials, stat strip, events table,
 * radar chart, QR row, action bar). At that content height (~1500-2000pt
 * combined) the DialogContent's outer <ScrollView> must:
 *   (a) still scroll — never be replaced with a non-scrolling container,
 *   (b) contain the bottom Share row as a descendant (so it participates
 *       in the scroll, rather than being pinned outside),
 *   (c) not be nested inside another vertical scroll or clipped by any
 *       ancestor that combines overflow:'hidden' AND a height constraint
 *       tighter than the Modal's own 90% viewport cap.
 *
 * This test uses a realistically-tall ProfileCardGenerator stub (fixed
 * height 2000pt to simulate the fully-populated real card + radar) and
 * asserts each of those invariants explicitly. It complements the base
 * Bug 3 test with a stress case that would catch: silent height caps,
 * added maxHeight props, wrapping in fixed-size views, or accidental
 * regression to the pre-cd10343 nested-scroll pattern.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';

// ─── Realistically-tall ProfileCardGenerator stub ──────────────────────────
// 2000pt tall — approximates a fully populated athlete card (bio + socials
// + contacts + measurables + stat strip + radar + QR + action bar).
jest.mock('@/components/ProfileCardGenerator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    ProfileCardGenerator: () =>
      React.createElement(
        View,
        { testID: 'profile-card-body-tall', style: { height: 2000 } },
        [
          React.createElement(Text, { key: 't', testID: 'card-top-tall' }, 'CARD TOP'),
          React.createElement(Text, { key: 'm', testID: 'card-middle-tall' }, 'CARD MIDDLE (radar area)'),
          React.createElement(
            Text,
            { key: 'b', testID: 'card-bottom-share-tall' },
            'Share Buttons (bottom of tall card)',
          ),
        ],
      ),
    default: () => React.createElement(View, { testID: 'profile-card-body-tall' }),
  };
});

jest.mock('@/components/CardShareActions', () => ({
  CardShareActions: () => null,
}));

jest.mock('@/hooks/usePlayerProfile', () => ({
  usePlayerProfile: () => ({
    profile: {
      full_name: 'Fully Populated Test Athlete',
      bio: 'Long bio content that would push the card taller in real use.',
      social_links: {
        instagram: 'testathlete',
        twitter: 'testathlete',
        hudl: 'testathlete',
      },
    },
    isLoading: false,
  }),
}));

// Import AFTER mocks.
import { SharePlayerCardDialog } from '@/components/SharePlayerCardDialog';

// ─── helpers ────────────────────────────────────────────────────────────────
function isScrollView(type: any): boolean {
  if (!type) return false;
  const name = typeof type === 'string' ? type : type?.displayName || type?.name;
  return name === 'RCTScrollView' || name === 'ScrollView';
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

function resolveStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce((acc, s) => ({ ...acc, ...resolveStyle(s) }), {});
  if (typeof style === 'object') return style;
  return {};
}

describe('SharePlayerCardDialog — Bug 3 hardening (tall content)', () => {
  it('with a 2000pt-tall ProfileCardGenerator, still contains exactly ONE ScrollView', async () => {
    const tree = await render(
      <SharePlayerCardDialog open onOpenChange={() => undefined} hideTrigger />,
    );
    await act(async () => {});

    const json = tree.toJSON();
    const count = countByType(json, isScrollView);
    // Exactly 1 — no nested scroll snuck back in under stress conditions.
    expect(count).toBe(1);
  });

  it('the bottom Share sentinel is a descendant of the (single) ScrollView', async () => {
    const tree = await render(
      <SharePlayerCardDialog open onOpenChange={() => undefined} hideTrigger />,
    );
    await act(async () => {});

    const json = tree.toJSON();
    const scroll = findScrollView(json);
    expect(scroll).not.toBeNull();

    // The bottom-of-card sentinel MUST live inside the ScrollView subtree —
    // otherwise it can't be scrolled into view when content overflows the
    // dialog's 90% viewport cap.
    const bottomInsideScroll = findByTestID(scroll, 'card-bottom-share-tall');
    expect(bottomInsideScroll).not.toBeNull();
  });

  it("the ScrollView is not nested inside another vertical scroll or a fixed-height clipping ancestor tighter than the Modal's own maxHeight", async () => {
    const tree = await render(
      <SharePlayerCardDialog open onOpenChange={() => undefined} hideTrigger />,
    );
    await act(async () => {});

    const json = tree.toJSON();

    // Walk from root, collect ancestors of the ScrollView.
    function findAncestorsOf(root: any, predicate: (n: any) => boolean): any[] | null {
      function walk(node: any, path: any[]): any[] | null {
        if (!node) return null;
        const nodes = Array.isArray(node) ? node : [node];
        for (const n of nodes) {
          if (n && typeof n === 'object') {
            if (predicate(n)) return path;
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
    const ancestors = findAncestorsOf(json, (n) => isScrollView(n.type));
    expect(ancestors).not.toBeNull();

    for (const anc of ancestors!) {
      // Assert no ancestor is another ScrollView (would nest the two).
      expect(isScrollView(anc.type)).toBe(false);

      // Assert no ancestor combines overflow:'hidden' AND a fixed-pt height
      // that would clip the ScrollView tighter than intended. Percent-based
      // maxHeight (e.g. Dialog's '90%') is fine — that's what allows the
      // Modal to leave room for backdrop. Fixed-pt height caps in an
      // ancestor would silently break scrolling for tall content.
      const style = resolveStyle(anc.props?.style);
      if (style.overflow === 'hidden') {
        const heightIsFixedPt =
          (typeof style.height === 'number' && style.height > 0) ||
          (typeof style.maxHeight === 'number' && style.maxHeight > 0);
        expect(heightIsFixedPt).toBe(false);
      }
    }
  });

  it('all three sentinel positions (top, middle, bottom) render inside the ScrollView subtree', async () => {
    const tree = await render(
      <SharePlayerCardDialog open onOpenChange={() => undefined} hideTrigger />,
    );
    await act(async () => {});

    const json = tree.toJSON();
    const scroll = findScrollView(json);
    expect(scroll).not.toBeNull();
    expect(findByTestID(scroll, 'card-top-tall')).not.toBeNull();
    expect(findByTestID(scroll, 'card-middle-tall')).not.toBeNull();
    expect(findByTestID(scroll, 'card-bottom-share-tall')).not.toBeNull();
  });
});
