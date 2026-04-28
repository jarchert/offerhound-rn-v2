import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/integrations/supabase/types';
import type { User, Session, Provider } from '@supabase/supabase-js';
import Toast from 'react-native-toast-message';

import { signInWithApple as nativeAppleSignIn, isAppleSignInAvailable } from '@/lib/appleSignIn';
import { registerForPushNotifications } from '@/lib/push';

const REDIRECT_SCHEME = 'offerhoundv2://';

const toast = {
  success: (text1: string) => Toast.show({ type: 'success', text1 }),
  error: (text1: string) => Toast.show({ type: 'error', text1 }),
};

type AuthResult = { error: Error | null };
type AuthDataResult = { data: any; error: Error | null };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  loading: boolean;
  userRole: AppRole | null;
  isAuthenticated: boolean;
  signOut: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithApple: () => Promise<AuthResult>;
  // Legacy aliases (back-compat with the old @/hooks/useAuth API).
  signIn: (email: string, password: string) => Promise<AuthDataResult>;
  signUp: (email: string, password: string) => Promise<AuthDataResult>;
  signInWithProvider: (provider: Provider) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  updateEmail: (newEmail: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        registerForPushNotifications(session.user.id).catch(e => console.warn('[push] register failed', e));
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        registerForPushNotifications(session.user.id).catch(e => console.warn('[push] register failed', e));
      } else setUserRole(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) setUserRole(data.role as AppRole);
    else setUserRole(null);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    return { error: (error as Error | null) ?? null };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: REDIRECT_SCHEME },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: REDIRECT_SCHEME },
    });
    return { error: error as Error | null };
  };

  const signInWithApple = async () => {
    try {
      if (await isAppleSignInAvailable()) {
        await nativeAppleSignIn();
        return { error: null };
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple', options: { redirectTo: REDIRECT_SCHEME },
      });
      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  // ---- Legacy aliases ----
  const signIn = async (email: string, password: string): Promise<AuthDataResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) toast.error('Invalid email or password. Please try again.');
      else toast.error(error.message);
      return { data: null, error: error as Error };
    }
    return { data, error: null };
  };

  const signUp = async (email: string, password: string): Promise<AuthDataResult> => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: REDIRECT_SCHEME },
    });
    if (error) {
      if (error.message.includes('already registered')) toast.error('This email is already registered. Please sign in instead.');
      else toast.error(error.message);
      return { data: null, error: error as Error };
    }
    return { data, error: null };
  };

  const signInWithProvider = async (provider: Provider) => {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: REDIRECT_SCHEME } });
    if (error) toast.error(error.message);
    return { error: error as Error | null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${REDIRECT_SCHEME}auth?mode=reset` });
    if (error) toast.error(error.message);
    else toast.success('Password reset email sent! Check your inbox.');
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else toast.success('Password updated successfully!');
    return { error: error as Error | null };
  };

  const updateEmail = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) toast.error(error.message);
    else toast.success('Email update initiated. Check your new email for confirmation.');
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, loading: isLoading, userRole, isAuthenticated: !!session,
      signOut, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple,
      signIn, signUp, signInWithProvider, resetPassword, updatePassword, updateEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
