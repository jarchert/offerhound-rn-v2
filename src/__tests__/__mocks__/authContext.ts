// src/__tests__/__mocks__/authContext.ts
// AuthContext mock — lets tests control signIn/signUp/signOut results.

export const mockSignInWithEmail = jest.fn();
export const mockSignUpWithEmail = jest.fn();
export const mockSignOutCtx = jest.fn();

export let mockAuthState = {
  user: null as any,
  session: null as any,
  isLoading: false,
  loading: false,
  userRole: null as any,
  isAuthenticated: false,
};

export function setMockAuthState(overrides: Partial<typeof mockAuthState>) {
  mockAuthState = { ...mockAuthState, ...overrides };
}

// Default: no error
mockSignInWithEmail.mockResolvedValue({ error: null });
mockSignUpWithEmail.mockResolvedValue({ error: null });
mockSignOutCtx.mockResolvedValue({ error: null });

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    ...mockAuthState,
    signInWithEmail: mockSignInWithEmail,
    signUpWithEmail: mockSignUpWithEmail,
    signOut: mockSignOutCtx,
  }),
}));
