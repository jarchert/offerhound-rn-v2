/**
 * Bug 2 — "Rendered fewer hooks than expected" regression.
 *
 * Root cause (see FloatingAICoach.tsx history): the component early-returned
 * `null` when `keyboardVisible` was true BEFORE calling `useAnimatedStyle`,
 * which meant React saw a different hook count between renders. This test
 * mounts the FAB, fires a keyboard-show event, then a keyboard-hide event,
 * and asserts (a) no console.error containing the React "hooks" mismatch
 * warning was emitted, (b) toggling keyboard visibility doesn't throw.
 *
 * We intercept Keyboard.addListener to capture the show/hide callbacks so we
 * can invoke them directly — RN's Jest mock doesn't ship a working emitter.
 */
import React from 'react';
import { Keyboard, Animated } from 'react-native';
import { render, act } from '@testing-library/react-native';

import { FloatingAICoach } from '@/components/FloatingAICoach';

// Stub Animated.loop — the FAB kicks off a pulse animation on mount and, in
// the jest environment, RN's Animated tries to attach to a native tree that
// doesn't exist and throws "Unable to locate attached view in the native
// tree". Replacing loop with a no-op keeps focus on the hook-order behaviour
// this test actually cares about.
jest.spyOn(Animated, 'loop').mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
} as unknown as Animated.CompositeAnimation));

// Minimal AuthContext stub — FloatingAICoach only reads `user` to gate the
// unauthenticated dropdown/tooltip flow.
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    getState: () => ({ routes: [{ name: 'Home' }], index: 0 }),
  }),
  createNavigationContainerRef: () => ({
    isReady: () => false,
    navigate: jest.fn(),
    getState: jest.fn(),
    getCurrentRoute: jest.fn(),
    current: null,
  }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
}));

type KeyboardHandler = (e?: unknown) => void;

describe('FloatingAICoach — rules-of-hooks regression (Bug 2)', () => {
  let showHandler: KeyboardHandler | undefined;
  let hideHandler: KeyboardHandler | undefined;
  let addListenerSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    showHandler = undefined;
    hideHandler = undefined;
    addListenerSpy = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((event: string, handler: KeyboardHandler) => {
        if (event === 'keyboardDidShow') showHandler = handler;
        if (event === 'keyboardDidHide') hideHandler = handler;
        return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>;
      });
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    addListenerSpy.mockRestore();
    errorSpy.mockRestore();
    jest.useRealTimers();
  });

  it('does not throw or emit a hook-order error when the keyboard toggles', async () => {
    const { queryByLabelText } = await render(<FloatingAICoach />);

    // FAB is present in the initial state.
    expect(queryByLabelText(/OfferHound AI Coach/i)).not.toBeNull();

    // Fire the exact event that used to trigger the mismatch.
    expect(showHandler).toBeDefined();
    await act(async () => {
      showHandler?.({ endCoordinates: { height: 320 } });
    });

    // Behavioral: FAB hides while keyboard is visible.
    expect(queryByLabelText(/OfferHound AI Coach/i)).toBeNull();

    // Toggle back — this is the second render across a hook-count change,
    // which is where the original bug manifested.
    await act(async () => {
      hideHandler?.();
    });

    expect(queryByLabelText(/OfferHound AI Coach/i)).not.toBeNull();

    // No hook-order warning from React.
    const hookErrors = errorSpy.mock.calls.filter((call) =>
      call.some(
        (arg: unknown) =>
          typeof arg === 'string' &&
          (arg.includes('Rendered fewer hooks') ||
            arg.includes('Rendered more hooks') ||
            arg.includes('change in the order of Hooks')),
      ),
    );
    expect(hookErrors).toHaveLength(0);
  });

  it('renders as an accessible button in the initial state', async () => {
    const { queryByLabelText } = await render(<FloatingAICoach />);
    expect(queryByLabelText(/OfferHound AI Coach/i)).not.toBeNull();
  });
});
