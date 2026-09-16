// src/__tests__/ParentAthleteEditor.test.tsx
// RNTL 14: render() is async. All 8 states + navigation + header.
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

// jest.mock factories are hoisted above const declarations, so we inline jest.fn()
// directly in the factory and retrieve the mocks back via jest.requireMock.
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
const mockReset = jest.fn();
let mockRouteParams: Record<string, any> = { token: 'test-token-abc' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, reset: mockReset }),
  useRoute: () => ({ params: mockRouteParams }),
}));

// Retrieve the stable mock fns from the hoisted factory at module evaluation time
// (after jest.mock has been processed). These are the same jest.fn() instances
// that were registered inside the factory.
const _sb = () => (jest.requireMock('@/integrations/supabase/client') as any).supabase;
const mockGetSession = _sb().auth.getSession as jest.Mock;
const mockRpc = _sb().rpc as jest.Mock;
const mockOnAuthStateChange = _sb().auth.onAuthStateChange as jest.Mock;
const mockGetUser = _sb().auth.getUser as jest.Mock;

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signInWithEmail: jest.fn().mockResolvedValue({ error: null }),
    signUpWithEmail: jest.fn().mockResolvedValue({ error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  }),
}));

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const R = require('react');
  return new Proxy({}, {
    get: (_t, name) =>
      function MockIcon() { return R.createElement(View, { testID: 'icon-' + String(name) }); },
  });
});

// This flag is read by the MinorProfileForm stub. Set true before render to simulate onCreated.
let _triggerOnCreated = false;
function setTriggerOnCreated(v: boolean) { _triggerOnCreated = v; }

jest.mock('@/components/minor-invite/MinorProfileForm', () => ({
  MinorProfileForm: (props: any) => {
    const { View, Text } = require('react-native');
    const R = require('react');
    R.useEffect(() => {
      // _triggerOnCreated is closed over from the outer module scope
      if ((global as any).__mpf_trigger) { props.onCreated('profile-xyz'); }
    });
    return R.createElement(View, { testID: 'minor-profile-form' },
      R.createElement(Text, null, 'MinorProfileForm-stub token=' + props.token));
  },
}));

jest.mock('@/components/minor-invite/ParentAuthStep', () => ({
  ParentAuthStep: (props: any) => {
    const { View, Text } = require('react-native');
    const R = require('react');
    return R.createElement(View, { testID: 'parent-auth-step' },
      R.createElement(Text, null, 'ParentAuthStep-stub parentEmail=' + props.parentEmail));
  },
}));

import { ParentAthleteEditor } from '@/components/ParentAthleteEditor';

const BASE_INVITATION = {
  state: 'valid',
  invitation_id: 'inv-1',
  roster_id: 'roster-1',
  athlete_name: 'Alex Smith',
  team_name: 'Varsity Elite',
  club_name: 'Reynolds Elite',
  parent_email_masked: 't***@example.com',
  expires_at: '2026-08-01T00:00:00Z',
  first_viewed_at: null,
};

function setupRpc(state: string, overrides: object = {}) {
  mockRpc.mockImplementation((fnName: string) => {
    if (fnName === 'get_minor_profile_invitation') {
      return Promise.resolve({ data: [{ ...BASE_INVITATION, state, ...overrides }], error: null });
    }
    if (fnName === 'get_minor_invitation_parent_email') {
      return Promise.resolve({ data: 'parent@example.com', error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
}

function setupRpcError(message: string) {
  mockRpc.mockImplementation(() => Promise.resolve({ data: null, error: { message } }));
}

function mockSignedOut() {
  mockGetSession.mockResolvedValue({ data: { session: null } });
}

function mockSignedIn(email: string) {
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: 'uid-1', email } } },
  });
}

describe('ParentAthleteEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { token: 'test-token-abc' };
    mockSignedOut();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  // --- State 1: loading ---
  it('renders loading spinner while RPC is in flight', async () => {
    mockRpc.mockImplementation(() => new Promise(() => {}));
    const { getByText } = await render(React.createElement(ParentAthleteEditor));
    expect(getByText(/Checking your invitation/i)).toBeTruthy();
  });

  // --- State 2: error ---
  it('renders error card when RPC returns an error', async () => {
    setupRpcError('network failure');
    const { getByText } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() => expect(getByText(/Something went wrong/i)).toBeTruthy());
    expect(getByText(/network failure/i)).toBeTruthy();
  });

  // --- State 3: not_found ---
  it('renders not_found card', async () => {
    setupRpc('not_found');
    const { getByText } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() => expect(getByText(/Invitation not found/i)).toBeTruthy());
    expect(getByText(/check that you copied the full link/i)).toBeTruthy();
  });

  // --- State 4: expired ---
  it('renders expired card', async () => {
    setupRpc('expired');
    const { getByText } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() => expect(getByText(/Invitation expired/i)).toBeTruthy());
    expect(getByText(/Ask your child.*coach to resend/i)).toBeTruthy();
  });

  // --- State 5: voided ---
  it('renders voided card', async () => {
    setupRpc('voided');
    const { getByText } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() => expect(getByText(/Invitation replaced/i)).toBeTruthy());
    expect(getByText(/newer invitation/i)).toBeTruthy();
  });

  // --- State 6: consumed ---
  it('renders consumed card', async () => {
    setupRpc('consumed');
    const { getByText } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() => expect(getByText(/Profile already created/i)).toBeTruthy());
    expect(getByText(/already been used/i)).toBeTruthy();
  });

  // --- State 7a: valid + signed out => ParentAuthStep ---
  it('shows ParentAuthStep when valid and signed out', async () => {
    mockSignedOut();
    setupRpc('valid');
    const { getByTestId, getAllByText } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() => expect(getByTestId('parent-auth-step')).toBeTruthy());
    expect(getAllByText(/Alex Smith/).length).toBeGreaterThan(0);
    expect(getAllByText(/Varsity Elite/).length).toBeGreaterThan(0);
  });

  it('shows ParentAuthStep when valid and wrong email signed in', async () => {
    mockSignedIn('wrong@example.com');
    setupRpc('valid');
    const { getByTestId } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() => expect(getByTestId('parent-auth-step')).toBeTruthy());
  });

  it('passes parentEmail correctly to ParentAuthStep', async () => {
    mockSignedOut();
    setupRpc('valid');
    const { getByText } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() =>
      expect(getByText(/ParentAuthStep-stub parentEmail=parent@example.com/)).toBeTruthy(),
    );
  });

  // --- State 7b: valid + matching email => MinorProfileForm ---
  it('shows MinorProfileForm when valid and email matches', async () => {
    mockSignedIn('parent@example.com');
    setupRpc('valid');
    const { getByTestId } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() => expect(getByTestId('minor-profile-form')).toBeTruthy());
  });

  it('passes token to MinorProfileForm', async () => {
    mockSignedIn('parent@example.com');
    setupRpc('valid');
    const { getByText } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() =>
      expect(getByText(/MinorProfileForm-stub token=test-token-abc/)).toBeTruthy(),
    );
  });

  // --- State 8: created (createdProfileId set) ---
  it('shows success card after MinorProfileForm fires onCreated', async () => {
    mockSignedIn('parent@example.com');
    setupRpc('valid');
    (global as any).__mpf_trigger = true;
    try {
      const { getByText } = await render(React.createElement(ParentAthleteEditor));
      await waitFor(() => expect(getByText(/Profile created/i)).toBeTruthy());
      expect(getByText(/Go to my parent dashboard/i)).toBeTruthy();
      expect(getByText(/profile is created and linked to your parent account/i)).toBeTruthy();
    } finally {
      (global as any).__mpf_trigger = false;
    }
  });

  // --- Header always visible ---
  it('renders brand header on every state', async () => {
    mockRpc.mockImplementation(() => new Promise(() => {}));
    const { getByText } = await render(React.createElement(ParentAthleteEditor));
    expect(getByText('OFFERHOUND™')).toBeTruthy();
    expect(getByText('Parent Profile Invitation')).toBeTruthy();
  });

  // --- goHome button ---
  it('goHome button calls navigate or reset on not_found card', async () => {
    setupRpc('not_found');
    const { getByText } = await render(React.createElement(ParentAthleteEditor));
    await waitFor(() => expect(getByText(/Return to OfferHound/i)).toBeTruthy());
    fireEvent.press(getByText(/Return to OfferHound/i));
    expect(mockNavigate).toHaveBeenCalledWith('ParentTabs');
  });

  // --- custom token from route params ---
  it('passes custom token from route params to the hook', async () => {
    mockRouteParams = { token: 'custom-deep-link-token' };
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_minor_profile_invitation') {
        return Promise.resolve({ data: [{ ...BASE_INVITATION, state: 'valid' }], error: null });
      }
      if (fnName === 'get_minor_invitation_parent_email') {
        return Promise.resolve({ data: 'parent@example.com', error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    await render(React.createElement(ParentAthleteEditor));
    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('get_minor_profile_invitation', {
        p_token: 'custom-deep-link-token',
      }),
    );
  });
});
