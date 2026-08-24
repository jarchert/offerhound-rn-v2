// src/__tests__/ParentAuthStep.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockSignInWithEmail = jest.fn();
const mockSignUpWithEmail = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signInWithEmail: mockSignInWithEmail,
    signUpWithEmail: mockSignUpWithEmail,
    signOut: mockSignOut,
  }),
}));

// jest.mock factories are hoisted above const declarations, so inline jest.fn()
// and retrieve the stable instance via jest.requireMock after module evaluation.
jest.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getUser: jest.fn() } },
}));

const mockGetUser = (
  jest.requireMock('@/integrations/supabase/client') as any
).supabase.auth.getUser as jest.Mock;

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const R = require('react');
  return new Proxy({}, {
    get: (_t, name) =>
      function MockIcon() { return R.createElement(View, { testID: 'icon-' + String(name) }); },
  });
});

import { ParentAuthStep } from '@/components/minor-invite/ParentAuthStep';

const PARENT_EMAIL = 'parent@example.com';
const GOOD_PASSWORD = 'SecurePass1';
const SHORT_PASSWORD = 'short1';

// Helper: type into a password input and flush state
async function typeInto(el: any, text: string) {
  await act(async () => { fireEvent.changeText(el, text); });
}

// Helper: press a Text node's Pressable parent (depth -2 from text node)
async function pressButton(textNode: any) {
  const pressable = textNode.parent?.parent;
  await act(async () => { fireEvent.press(pressable); });
}

async function setup(opts: { onAuthenticated?: jest.Mock; sessionEmail?: string | null } = {}) {
  const onAuthenticated = opts.onAuthenticated ?? jest.fn();
  const sessionEmail = opts.sessionEmail !== undefined ? opts.sessionEmail : null;
  const utils = await render(
    React.createElement(ParentAuthStep, { parentEmail: PARENT_EMAIL, sessionEmail, onAuthenticated }),
  );
  return { ...utils, onAuthenticated };
}

describe('ParentAuthStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { email: PARENT_EMAIL } } });
    mockSignInWithEmail.mockResolvedValue({ error: null });
    mockSignUpWithEmail.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('renders the locked email field with helper text', async () => {
    const { getByDisplayValue, getByText } = await setup();
    expect(getByDisplayValue(PARENT_EMAIL)).toBeTruthy();
    expect(getByText(/set by the invitation and cannot be changed/i)).toBeTruthy();
  });

  it('renders the lock icon', async () => {
    const { getByTestId } = await setup();
    expect(getByTestId('icon-Lock')).toBeTruthy();
  });

  it('defaults to sign-in tab — no confirm password field', async () => {
    const { getAllByText, queryByText } = await setup();
    expect(getAllByText('Sign in').length).toBeGreaterThan(0);
    expect(getAllByText('Create account').length).toBeGreaterThan(0);
    expect(queryByText('Confirm password')).toBeNull();
  });

  it('switching to sign-up tab shows confirm password field', async () => {
    const { getAllByText, queryByText } = await setup();
    await pressButton(getAllByText('Create account')[0]);
    await waitFor(() => expect(queryByText('Confirm password')).toBeTruthy());
  });

  it('switching tabs clears field error', async () => {
    const { getAllByDisplayValue, getAllByText, getByText, queryByText } = await setup();
    await typeInto(getAllByDisplayValue('')[0], SHORT_PASSWORD);
    const signInBtns = getAllByText('Sign in');
    await pressButton(signInBtns[signInBtns.length - 1]);
    await waitFor(() => expect(getByText(/at least 8 characters/i)).toBeTruthy());
    await pressButton(getAllByText('Create account')[0]);
    await waitFor(() => expect(queryByText(/at least 8 characters/i)).toBeNull());
  });

  it('shows validation error and does not call signIn when password is too short', async () => {
    const { getAllByDisplayValue, getAllByText, getByText } = await setup();
    await typeInto(getAllByDisplayValue('')[0], SHORT_PASSWORD);
    const signInBtns = getAllByText('Sign in');
    await pressButton(signInBtns[signInBtns.length - 1]);
    await waitFor(() => expect(getByText(/at least 8 characters/i)).toBeTruthy());
    expect(mockSignInWithEmail).not.toHaveBeenCalled();
  });

  it('shows specific copy for invalid login credentials', async () => {
    mockSignInWithEmail.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const { getAllByDisplayValue, getAllByText, getByText } = await setup();
    await typeInto(getAllByDisplayValue('')[0], GOOD_PASSWORD);
    const signInBtns = getAllByText('Sign in');
    await pressButton(signInBtns[signInBtns.length - 1]);
    await waitFor(() => expect(getByText(/doesn't match this email/i)).toBeTruthy());
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('auto-switches to sign-in tab on already-registered signup error', async () => {
    mockSignUpWithEmail.mockResolvedValue({ error: { message: 'User already registered' } });
    const { getAllByText, getByText, queryByText, getByPlaceholderText, getAllByDisplayValue } = await setup();
    await pressButton(getAllByText('Create account')[0]);
    await waitFor(() => expect(queryByText('Confirm password')).toBeTruthy());
    // Fill password field
    await typeInto(getByPlaceholderText('Min. 8 characters'), GOOD_PASSWORD);
    // Fill confirm field — it has no placeholder; it's the last empty-value input
    const emptyInputs = getAllByDisplayValue('');
    await typeInto(emptyInputs[emptyInputs.length - 1], GOOD_PASSWORD);
    const createBtns = getAllByText('Create account');
    await pressButton(createBtns[createBtns.length - 1]);
    await waitFor(() =>
      expect(getByText(/An account already exists for this email/i)).toBeTruthy(),
    );
    expect(queryByText('Confirm password')).toBeNull();
  });

  it('calls onAuthenticated after successful sign-in when getUser email matches', async () => {
    const { getAllByDisplayValue, getAllByText, onAuthenticated } = await setup();
    await typeInto(getAllByDisplayValue('')[0], GOOD_PASSWORD);
    const signInBtns = getAllByText('Sign in');
    await pressButton(signInBtns[signInBtns.length - 1]);
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onAuthenticated and signs out when getUser email mismatches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: 'attacker@evil.com' } } });
    const { getAllByDisplayValue, getAllByText, getByText, onAuthenticated } = await setup();
    await typeInto(getAllByDisplayValue('')[0], GOOD_PASSWORD);
    const signInBtns = getAllByText('Sign in');
    await pressButton(signInBtns[signInBtns.length - 1]);
    await waitFor(() => expect(getByText(/session mismatch/i)).toBeTruthy());
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('does NOT call getUser when sign-in returns an error', async () => {
    mockSignInWithEmail.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const { getAllByDisplayValue, getAllByText, getByText } = await setup();
    await typeInto(getAllByDisplayValue('')[0], GOOD_PASSWORD);
    const signInBtns = getAllByText('Sign in');
    await pressButton(signInBtns[signInBtns.length - 1]);
    await waitFor(() => expect(getByText(/doesn't match this email/i)).toBeTruthy());
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('shows wrong-account prompt when sessionEmail differs from parentEmail', async () => {
    const { getByText, getAllByText, queryByText } = await setup({ sessionEmail: 'other@example.com' });
    expect(getByText(/You're signed in as/i)).toBeTruthy();
    expect(getAllByText(/Sign out/i).length).toBeGreaterThan(0);
    expect(queryByText('Password')).toBeNull();
  });

  it('calls signOut when sign-out button is pressed in wrong-account view', async () => {
    const { getAllByText } = await setup({ sessionEmail: 'other@example.com' });
    const signOutBtns = getAllByText(/Sign out/i);
    await pressButton(signOutBtns[signOutBtns.length - 1]);
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });

  it('shows normal form when sessionEmail is null', async () => {
    const { getAllByText } = await setup({ sessionEmail: null });
    expect(getAllByText('Sign in').length).toBeGreaterThan(0);
  });

  it('shows normal form when sessionEmail matches parentEmail', async () => {
    const { getAllByText } = await setup({ sessionEmail: PARENT_EMAIL });
    expect(getAllByText('Sign in').length).toBeGreaterThan(0);
  });

  it('shows error when signup passwords do not match', async () => {
    const { getAllByText, getByText, getByPlaceholderText, getAllByDisplayValue } = await setup();
    await pressButton(getAllByText('Create account')[0]);
    await waitFor(() => expect(getByText('Confirm password')).toBeTruthy());
    await typeInto(getByPlaceholderText('Min. 8 characters'), GOOD_PASSWORD);
    // confirm field has no placeholder — last empty-value input after switching tabs
    const emptyInputs = getAllByDisplayValue('');
    await typeInto(emptyInputs[emptyInputs.length - 1], 'DifferentPass1');
    const createBtns = getAllByText('Create account');
    await pressButton(createBtns[createBtns.length - 1]);
    await waitFor(() => expect(getByText(/passwords do not match/i)).toBeTruthy());
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });
});