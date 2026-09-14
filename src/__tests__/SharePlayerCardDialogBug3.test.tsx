/**
 * Bug 3 — Shareable athlete card cut off at bottom (Share button unreachable).
 *
 * Root cause: SharePlayerCardDialog wrapped <ProfileCardGenerator /> in an
 * inner <ScrollArea /> that itself sat inside DialogContent's outer
 * <ScrollView>. RN doesn't cleanly handle nested same-axis vertical scrolls
 * — the inner ScrollView captures gesture focus and its content height
 * exceeds the visible dialog viewport, so the Share buttons at the bottom
 * of ProfileCardGenerator are unreachable on shorter phones.
 *
 * Fix: rely on DialogContent's built-in ScrollView; drop the inner
 * <ScrollArea /> around <ProfileCardGenerator />.
 *
 * This test asserts the structural invariant: only ONE ScrollView exists
 * between the Modal root and the capture <View> that ProfileCardGenerator
 * mounts inside. If someone re-adds a nested ScrollArea, this test breaks.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { render, act } from '@testing-library/react-native';

// ─── ProfileCardGenerator stub with recognizable top & bottom sentinels ─────
jest.mock('@/components/ProfileCardGenerator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    ProfileCardGenerator: () =>
      React.createElement(View, { testID: 'profile-card-body' }, [
        React.createElement(
          Text,
          { key: 't', testID: 'card-top' },
          'card-top-sentinel',
        ),
        React.createElement(
          Text,
          { key: 'b', testID: 'card-bottom-share-button' },
          'Share Buttons (bottom)',
        ),
      ]),
    default: () =>
      React.createElement(View, { testID: 'profile-card-body' }, []),
  };
});

// ─── CardShareActions stub — no work, just renders null with hideTriggers ──
jest.mock('@/components/CardShareActions', () => ({
  CardShareActions: () => null,
}));

// ─── usePlayerProfile — minimal stub ────────────────────────────────────────
jest.mock('@/hooks/usePlayerProfile', () => ({
  usePlayerProfile: () => ({
    profile: { full_name: 'Test Athlete' },
    isLoading: false,
  }),
}));

// Import AFTER mocks.
import { SharePlayerCardDialog } from '@/components/SharePlayerCardDialog';

/** Walk the RNTL JSON tree and count nodes whose type matches predicate. */
function countByType(
  node: any,
  predicate: (t: any) => boolean,
): number {
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

describe('SharePlayerCardDialog — Bug 3 (share card cut off)', () => {
  it('does not nest a ScrollView inside DialogContent\'s ScrollView', async () => {
    const tree = await render(
      <SharePlayerCardDialog open onOpenChange={() => undefined} hideTrigger />,
    );

    // Give the Modal / act a tick to settle.
    await act(async () => {});

    const json = tree.toJSON();

    // Count ScrollViews inside the whole tree. DialogContent contributes
    // exactly 1. Bug 3's regression added a second (the redundant
    // ScrollArea). Any count > 1 is a regression.
    const scrollViewCount = countByType(json, (type: any) => {
      if (!type) return false;
      const name = typeof type === 'string' ? type : type?.displayName || type?.name;
      return name === 'RCTScrollView' || name === 'ScrollView';
    });

    expect(scrollViewCount).toBeLessThanOrEqual(1);

    // Sanity: the capture area IS present and contains the bottom Share
    // sentinel from our ProfileCardGenerator stub.
    const capture = findByTestID(json, 'share-player-card-capture');
    expect(capture).not.toBeNull();
    const bottom = findByTestID(json, 'card-bottom-share-button');
    expect(bottom).not.toBeNull();
  });

  it('renders the ProfileCardGenerator directly inside the capture View (no wrapper ScrollView)', async () => {
    const tree = await render(
      <SharePlayerCardDialog open onOpenChange={() => undefined} hideTrigger />,
    );
    await act(async () => {});

    const json = tree.toJSON();
    const capture = findByTestID(json, 'share-player-card-capture');
    expect(capture).not.toBeNull();

    // Walk capture's descendants — must NOT include a ScrollView.
    const nestedScrolls = countByType(capture, (type: any) => {
      if (!type) return false;
      const name = typeof type === 'string' ? type : type?.displayName || type?.name;
      return name === 'RCTScrollView' || name === 'ScrollView';
    });
    expect(nestedScrolls).toBe(0);
  });
});
