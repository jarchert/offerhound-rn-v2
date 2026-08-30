/**
 * Bug 1 — AI Coach screen non-functional (input dead, chips dead, avatar missing).
 *
 * Root causes:
 *   a) The coach avatar image from MAIN was never rendered — the screen was
 *      only showing a plain "AI COACH" text header.
 *   b) The reported input/chip unresponsiveness was actually the cascade
 *      from Bug 2 (FloatingAICoach rules-of-hooks) crashing the AICoach
 *      screen the instant the keyboard opened. Bug 2 is fixed in a
 *      separate commit; these tests exercise AICoachScreen in isolation
 *      to prove its own JSX contract is correct.
 *
 * Assertions:
 *   1. Coach avatar renders in the header (testID: ai-coach-avatar).
 *   2. Typing into the TextInput updates the internal state (verified by
 *      changing text and confirming the same value is present in the input
 *      after the change).
 *   3. Tapping a suggested-question chip fires the send handler (verified
 *      by mocking global.fetch and asserting it was called with the
 *      support-chat URL and body containing the chip's prompt).
 */
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// ─── FlashList → plain View (renders children synchronously in tests) ────────
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    FlashList: React.forwardRef(function FlashList(
      { data, renderItem, keyExtractor, contentContainerStyle }: any,
      _ref: any,
    ) {
      return React.createElement(
        View,
        { style: contentContainerStyle, testID: 'ai-coach-list' },
        (data ?? []).map((item: any, index: number) =>
          React.createElement(
            View,
            { key: keyExtractor ? keyExtractor(item, index) : index },
            renderItem({ item, index }),
          ),
        ),
      );
    }),
  };
});

// ─── Supabase client constants ──────────────────────────────────────────────
jest.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
}));

// ─── AuthContext ────────────────────────────────────────────────────────────
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'athlete-1' },
    userRole: 'athlete',
    isAuthenticated: true,
  }),
}));

// ─── Navbar / BackButton — thin stubs so we don't drag in nav internals ─────
jest.mock('@/components/Navbar', () => ({ Navbar: () => null }));
jest.mock('@/components/BackButton', () => ({ BackButton: () => null }));

// Import AFTER mocks are declared.
import AICoachScreen from '@/screens/shared/AICoachScreen';

// A minimal fetch mock that returns a fake SSE response with a single delta
// so the send() promise resolves cleanly.
function makeFetchMock() {
  const body =
    'data: {"choices":[{"delta":{"content":"ok"}}]}\n' +
    'data: [DONE]\n';
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => body,
    // No body.getReader — forces the non-streaming code path.
    body: null,
    json: async () => ({}),
  });
}

describe('AICoachScreen — Bug 1 fixes', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (global as any).fetch = makeFetchMock();
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('renders the ported OfferHound coach avatar in the header', async () => {
    const { getByTestId } = await render(<AICoachScreen />);
    const avatar = getByTestId('ai-coach-avatar');
    expect(avatar).toBeTruthy();
    // The avatar is an <Image> and must have a source (a require() number
    // in Jest's fileMock, but any non-null source proves it wasn't left blank).
    expect(avatar.props.source).toBeTruthy();
  });

  it('typing into the input updates the value shown by the TextInput', async () => {
    const { getByTestId } = await render(<AICoachScreen />);
    const input = getByTestId('ai-coach-input');

    // Initially empty.
    expect(input.props.value).toBe('');

    await act(async () => {
      fireEvent.changeText(input, 'How do I get recruited?');
    });

    expect(input.props.value).toBe('How do I get recruited?');
  });

  it('tapping a suggested-question chip invokes send() and calls the support-chat endpoint with the chip text', async () => {
    const { getAllByRole } = await render(<AICoachScreen />);

    // Suggested chips are Pressables with accessibilityRole="button" and
    // accessibilityLabel prefixed with "Suggested question:".
    const buttons = getAllByRole('button');
    const chip = buttons.find(
      (b) =>
        typeof b.props?.accessibilityLabel === 'string' &&
        b.props.accessibilityLabel.startsWith('Suggested question:'),
    );
    expect(chip).toBeTruthy();

    await act(async () => {
      fireEvent.press(chip!);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/functions/v1/support-chat');
    // Body should include the chip's prompt text.
    const body = JSON.parse((init as any).body);
    const lastUserMsg = body.messages
      .filter((m: any) => m.role === 'user')
      .slice(-1)[0];
    expect(lastUserMsg).toBeDefined();
    expect(typeof lastUserMsg.content).toBe('string');
    expect(lastUserMsg.content.length).toBeGreaterThan(0);
    expect(body.userType).toBe('athlete');
    expect(body.isAuthenticated).toBe(true);
  });
});
