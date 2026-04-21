import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import Toast from 'react-native-toast-message';

// Toast helpers to match the `react-hot-toast` style the original web code used.
const toast = {
  success: (text1: string) => Toast.show({ type: 'success', text1 }),
  error: (text1: string) => Toast.show({ type: 'error', text1 }),
};

// Deep-link scheme (registered in app.json) — replaces window.location.origin for OAuth redirects.
const REDIRECT_SCHEME = 'offerhound://';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (event === 'TOKEN_REFRESHED') console.log('Session token refreshed');
        if (event === 'SIGNED_OUT') { setSession(null); setUser(null); }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
      } finally {
        if (isMounted) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: REDIRECT_SCHEME } });
    if (error) {
      if (error.message.includes('already registered')) toast.error('This email is already registered. Please sign in instead.');
      else toast.error(error.message);
      return { data: null, error };
    }
    toast.success('Account created successfully! You are now signed in.');
    return { data, error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) toast.error('Invalid email or password. Please try again.');
      else toast.error(error.message);
      return { data: null, error };
    }
    toast.success('Signed in successfully!');
    return { data, error: null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error('Error signing out: ' + error.message); return { error }; }
    toast.success('Signed out successfully');
    return { error: null };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${REDIRECT_SCHEME}auth?mode=reset` });
    if (error) { toast.error(error.message); return { error }; }
    toast.success('Password reset email sent! Check your inbox.');
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error(error.message); return { error }; }
    toast.success('Password updated successfully!');
    return { error: null };
  }, []);

  const updateEmail = useCallback(async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) { toast.error(error.message); return { error }; }
    toast.success('Email update initiated. Check your new email for confirmation.');
    return { error: null };
  }, []);

  const signInWithProvider = useCallback(async (provider: Provider) => {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: REDIRECT_SCHEME } });
    if (error) { toast.error(error.message); return { error }; }
    return { error: null };
  }, []);

  return {
    user, session, loading, signUp, signIn, signOut, resetPassword,
    updatePassword, updateEmail, signInWithProvider, isAuthenticated: !!session,
  };
}
