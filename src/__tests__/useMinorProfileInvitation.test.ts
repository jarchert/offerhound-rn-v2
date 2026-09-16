// src/__tests__/useMinorProfileInvitation.test.ts
// Hook state-machine tests. RNTL 14: renderHook is async — await every call.
import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

// Pull the mock fns out after the registry is populated
import { supabase } from '@/integrations/supabase/client';
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;

import { useMinorProfileInvitation } from '@/hooks/useMinorProfileInvitation';

const TOKEN = 'test-token-abc123';

const BASE_ROW = {
  invitation_id: 'inv-uuid-1',
  roster_id: 'roster-uuid-1',
  athlete_name: 'Alex Smith',
  team_name: 'Varsity Elite',
  club_name: 'Reynolds Elite',
  parent_email_masked: 't***@example.com',
  expires_at: '2026-08-01T00:00:00Z',
  first_viewed_at: null,
};

function mockSignedOut() {
  mockGetSession.mockResolvedValue({ data: { session: null } });
}

function mockSignedIn(email: string) {
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: 'user-uuid-1', email } } },
  });
}

function mockInvitationRpc(state: string, overrides: object = {}) {
  mockRpc.mockImplementation((fnName: string) => {
    if (fnName === 'get_minor_profile_invitation') {
      return Promise.resolve({ data: [{ ...BASE_ROW, state, ...overrides }], error: null });
    }
    if (fnName === 'get_minor_invitation_parent_email') {
      return Promise.resolve({ data: 'parent@example.com', error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
}

function mockInvitationRpcError(message: string) {
  mockRpc.mockImplementation((fnName: string) => {
    if (fnName === 'get_minor_profile_invitation') {
      return Promise.resolve({ data: null, error: { message } });
    }
    return Promise.resolve({ data: null, error: null });
  });
}

describe('useMinorProfileInvitation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockSignedOut();
  });

  it('starts in loading state', async () => {
    mockRpc.mockImplementation(() => new Promise(() => {})); // never resolves
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    expect(result.current.loading).toBe(true);
    expect(result.current.invitation).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('resolves to valid state with parentEmail populated', async () => {
    mockInvitationRpc('valid');
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invitation?.state).toBe('valid');
    expect(result.current.parentEmail).toBe('parent@example.com');
    expect(result.current.error).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith('get_minor_profile_invitation', { p_token: TOKEN });
    expect(mockRpc).toHaveBeenCalledWith('get_minor_invitation_parent_email', { p_token: TOKEN });
  });

  it('resolves to not_found — parentEmail is null, parentEmail RPC not called', async () => {
    mockInvitationRpc('not_found');
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invitation?.state).toBe('not_found');
    expect(result.current.parentEmail).toBeNull();
    expect(mockRpc).not.toHaveBeenCalledWith('get_minor_invitation_parent_email', expect.anything());
  });

  it('resolves to expired — parentEmail is null', async () => {
    mockInvitationRpc('expired');
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invitation?.state).toBe('expired');
    expect(result.current.parentEmail).toBeNull();
  });

  it('resolves to voided — parentEmail is null', async () => {
    mockInvitationRpc('voided');
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invitation?.state).toBe('voided');
    expect(result.current.parentEmail).toBeNull();
  });

  it('resolves to consumed — parentEmail is null', async () => {
    mockInvitationRpc('consumed');
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invitation?.state).toBe('consumed');
    expect(result.current.parentEmail).toBeNull();
  });

  it('sets error when RPC returns an error object', async () => {
    mockInvitationRpcError('network failure');
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network failure');
    expect(result.current.invitation).toBeNull();
  });

  it('sets error when token is undefined', async () => {
    const { result } = await renderHook(() => useMinorProfileInvitation(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Missing invitation token');
    expect(result.current.invitation).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('handles null RPC data by defaulting to not_found', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invitation?.state).toBe('not_found');
  });

  it('captures sessionEmail when a session exists', async () => {
    mockSignedIn('coach@example.com');
    mockInvitationRpc('valid');
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessionEmail).toBe('coach@example.com');
  });

  it('sessionEmail is null when signed out', async () => {
    mockSignedOut();
    mockInvitationRpc('valid');
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessionEmail).toBeNull();
  });

  it('updates sessionEmail when auth state changes to SIGNED_IN', async () => {
    mockSignedOut();
    mockInvitationRpc('valid');

    let authCallback: ((event: string, session: any) => void) | null = null;
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessionEmail).toBeNull();

    await act(async () => {
      authCallback!('SIGNED_IN', { user: { id: 'new-user', email: 'parent@example.com' } });
    });

    expect(result.current.sessionEmail).toBe('parent@example.com');
  });

  it('exposes reload() that re-fetches and updates state', async () => {
    mockInvitationRpc('valid');
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockRpc).toHaveBeenCalledTimes(2); // invitation + parentEmail

    mockInvitationRpc('consumed');
    await act(async () => { result.current.reload(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invitation?.state).toBe('consumed');
  });

  it('state shorthand matches invitation.state', async () => {
    mockInvitationRpc('expired');
    const { result } = await renderHook(() => useMinorProfileInvitation(TOKEN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state).toBe('expired');
    expect(result.current.state).toBe(result.current.invitation?.state);
  });
});
