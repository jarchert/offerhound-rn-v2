// Back-compat shim: legacy callers import { useAuth } from '@/hooks/useAuth'.
// All auth state now lives in @/contexts/AuthContext (single source of truth).
// The context exposes both the new API (signInWithEmail, isLoading, …) and the
// legacy API (signIn, signUp, signInWithProvider, resetPassword, loading, …).
export { useAuth } from '@/contexts/AuthContext';
