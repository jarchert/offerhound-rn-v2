/**
 * SharePlayerCardDialog — lazy-mount ProfileCardGenerator (T2.A, build 124/96).
 *
 * The heavy card body (SVG radar, gradient card, QR code, expo-image
 * avatar) is deferred behind an InteractionManager.runAfterInteractions
 * tick so it doesn't compete with the modal open animation. Until the
 * heavy content is ready, a lightweight ActivityIndicator skeleton fills
 * the capture slot inside the same <View ref={captureRef}> wrapper.
 *
 * Invariants asserted here:
 *   1. Closed dialog  → ProfileCardGenerator NOT mounted (mock never called).
 *   2. Open + interactions PENDING → skeleton in tree, ProfileCardGenerator
 *      still not mounted.
 *   3. Open + interactions SETTLED → ProfileCardGenerator mounted, skeleton
 *      no longer in the tree.
 *   4. Close after mount → skeleton returns on reopen, ProfileCardGenerator
 *      unmounts on close.
 *
 * Uses the same tree-walk approach as SharePlayerCardDialogBug3.test.tsx
 * (this codebase does not use queryByTestId — RNTL 14 with jest-expo does
 * expose it, but the existing tests all standardized on toJSON walking).
 */
import React from 'react';
import { InteractionManager } from 'react-native';
import { render, act } from '@testing-library/react-native';

// Capture pending InteractionManager callbacks so the test can control when
// "interactions settle". Spy AFTER importing react-native rather than
// jest.mock()'ing the whole module — we only want to override one function.
let pendingCallbacks: Array<() => void> = [];
const runAfterInteractionsSpy = jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation(((cb: any) => {
    pendingCallbacks.push(typeof cb === 'function' ? cb : () => {});
    return {
      cancel: () => {
        pendingCallbacks = pendingCallbacks.filter((c) => c !== cb);
      },
      then: () => {},
      done: () => {},
    } as any;
  }) as any);

// Track ProfileCardGenerator mount/unmount count on `global` so the
// jest.mock factory (hoisted above local declarations) can reach them.
(global as any).__profileCardMountSpy = jest.fn();
(global as any).__profileCardUnmountSpy = jest.fn();
const profileCardMountSpy = (global as any).__profileCardMountSpy as jest.Mock;
const profileCardUnmountSpy = (global as any).__profileCardUnmountSpy as jest.Mock;

jest.mock('@/components/ProfileCardGenerator', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ProfileCardGenerator: function ProfileCardGeneratorMock() {
      React.useEffect(() => {
        (global as any).__profileCardMountSpy();
        return () => (global as any).__profileCardUnmountSpy();
      }, []);
      return React.createElement(View, { testID: 'profile-card-body' });
    },
  };
});

// CardShareActions — no-op stub (it lives outside the capture ref in the
// dialog tree so mounting it has no side effect here).
jest.mock('@/components/CardShareActions', () => ({
  CardShareActions: () => null,
}));

jest.mock('@/hooks/usePlayerProfile', () => ({
  usePlayerProfile: () => ({
    profile: { full_name: 'Test Athlete' },
    isLoading: false,
  }),
}));

// Import AFTER mocks.
import { SharePlayerCardDialog } from '@/components/SharePlayerCardDialog';

// ─── Tree walk helpers (parity with existing SharePlayerCardDialogBug3 test) ─
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

function flushPendingInteractions() {
  const toRun = pendingCallbacks.slice();
  pendingCallbacks = [];
  toRun.forEach((cb) => cb());
}

beforeEach(() => {
  pendingCallbacks = [];
  profileCardMountSpy.mockReset();
  profileCardUnmountSpy.mockReset();
  runAfterInteractionsSpy.mockClear();
});

afterAll(() => {
  runAfterInteractionsSpy.mockRestore();
});

describe('SharePlayerCardDialog — lazy-mount ProfileCardGenerator', () => {
  it('does NOT mount ProfileCardGenerator while closed', async () => {
    const tree: any = await render(
      <SharePlayerCardDialog open={false} onOpenChange={() => undefined} hideTrigger />,
    );
    await act(async () => {});

    expect(profileCardMountSpy).not.toHaveBeenCalled();
    // Closed Modal — its children aren't rendered.
    expect(findByTestID(tree.toJSON(), 'profile-card-body')).toBeNull();
    expect(findByTestID(tree.toJSON(), 'share-player-card-skeleton')).toBeNull();
  });

  it('while open + interactions pending: skeleton in tree, heavy card not mounted', async () => {
    const tree: any = await render(
      <SharePlayerCardDialog open onOpenChange={() => undefined} hideTrigger />,
    );
    // Let useEffect run and register the interaction callback.
    await act(async () => {});

    expect(runAfterInteractionsSpy).toHaveBeenCalled();
    expect(profileCardMountSpy).not.toHaveBeenCalled();
    const json = tree.toJSON();
    expect(findByTestID(json, 'profile-card-body')).toBeNull();
    expect(findByTestID(json, 'share-player-card-skeleton')).not.toBeNull();
    // Capture wrapper is present regardless (captureRef must stay valid).
    expect(findByTestID(json, 'share-player-card-capture')).not.toBeNull();
  });

  it('after interactions settle: mounts ProfileCardGenerator, drops skeleton', async () => {
    const tree: any = await render(
      <SharePlayerCardDialog open onOpenChange={() => undefined} hideTrigger />,
    );
    await act(async () => {});
    // Sanity: not mounted yet.
    expect(profileCardMountSpy).not.toHaveBeenCalled();

    await act(async () => {
      flushPendingInteractions();
    });

    expect(profileCardMountSpy).toHaveBeenCalledTimes(1);
    const json = tree.toJSON();
    expect(findByTestID(json, 'profile-card-body')).not.toBeNull();
    expect(findByTestID(json, 'share-player-card-skeleton')).toBeNull();
    // Capture wrapper still present — captureRef stability preserved.
    expect(findByTestID(json, 'share-player-card-capture')).not.toBeNull();
  });

  it('closing after mount: unmounts heavy card, re-shows skeleton on reopen', async () => {
    const tree: any = await render(
      <SharePlayerCardDialog open onOpenChange={() => undefined} hideTrigger />,
    );
    await act(async () => {});
    await act(async () => {
      flushPendingInteractions();
    });
    expect(profileCardMountSpy).toHaveBeenCalledTimes(1);

    // Close.
    await act(async () => {
      tree.rerender(
        <SharePlayerCardDialog open={false} onOpenChange={() => undefined} hideTrigger />,
      );
    });
    expect(profileCardUnmountSpy).toHaveBeenCalledTimes(1);

    // Reopen — heavyReady resets to false, so skeleton returns and the
    // heavy card has NOT re-mounted yet (still 1 total mount).
    await act(async () => {
      tree.rerender(
        <SharePlayerCardDialog open onOpenChange={() => undefined} hideTrigger />,
      );
    });
    expect(profileCardMountSpy).toHaveBeenCalledTimes(1);
    const midJson = tree.toJSON();
    expect(findByTestID(midJson, 'share-player-card-skeleton')).not.toBeNull();
    expect(findByTestID(midJson, 'profile-card-body')).toBeNull();

    // Settle interactions again — mounts a fresh copy.
    await act(async () => {
      flushPendingInteractions();
    });
    expect(profileCardMountSpy).toHaveBeenCalledTimes(2);
    expect(findByTestID(tree.toJSON(), 'profile-card-body')).not.toBeNull();
  });
});
