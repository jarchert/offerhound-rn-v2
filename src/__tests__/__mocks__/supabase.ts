// src/__tests__/__mocks__/supabase.ts
// Canonical Supabase mock shared across all tests.
// Each test overrides individual methods via jest.mocked() or mockResolvedValueOnce.

export const mockGetSession = jest.fn();
export const mockRpc = jest.fn();
export const mockGetUser = jest.fn();
export const mockSignInWithPassword = jest.fn();
export const mockSignUp = jest.fn();
export const mockSignOut = jest.fn();
export const mockOnAuthStateChange = jest.fn(() => ({
  data: { subscription: { unsubscribe: jest.fn() } },
}));

export const supabase = {
  auth: {
    getSession: mockGetSession,
    getUser: mockGetUser,
    signInWithPassword: mockSignInWithPassword,
    signUp: mockSignUp,
    signOut: mockSignOut,
    onAuthStateChange: mockOnAuthStateChange,
  },
  rpc: mockRpc,
};

// Default session: signed out
mockGetSession.mockResolvedValue({ data: { session: null } });
mockGetUser.mockResolvedValue({ data: { user: null } });
mockOnAuthStateChange.mockReturnValue({
  data: { subscription: { unsubscribe: jest.fn() } },
});
