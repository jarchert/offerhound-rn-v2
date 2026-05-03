import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/integrations/supabase/types';
import type { User, Session } from '@supabase/supabase-js';

import { signInWithApple as nativeAppleSignIn, isAppleSignInAvailable } from '@/lib/appleSignIn';
import { registerForPushNotifications } from '@/lib/push';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userRole: AppRole | null;
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        registerForPushNotifications(session.user.id).catch(e => console.warn('[push] register failed', e));
        // Build 51 A5: one-shot "Signed in with Google/Apple" toast on SIGNED_IN.
        if (event === 'SIGNED_IN') {
          const provider = (session.user.app_metadata as any)?.provider;
          if (provider === 'google' || provider === 'apple') {
            const flagKey = `oauth-toast-shown:${session.user.id}`;
            AsyncStorage.getItem(flagKey).then((seen) => {
              if (!seen) {
                AsyncStorage.setItem(flagKey, '1').catch(() => {});
                const label = provider === 'google' ? 'Google' : 'Apple';
                Toast.show({
                  type: 'success',
                  text1: `Signed in with ${label}`,
                  text2: session.user.email || undefined,
                });
              }
            }).catch(() => {});
          }
        }
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
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    try {
      // Build 48 parity #15 — properly complete Supabase OAuth flow in a native Expo app.
      const WebBrowser = await import('expo-web-browser');
      const Linking = await import('expo-linking');
      const redirectTo = (Linking as any).createURL('/auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) return { error: error as Error | null };
      const authUrl = (data as any)?.url as string | undefined;
      if (!authUrl) return { error: new Error('No auth URL returned from Supabase') };
      const result = await (WebBrowser as any).openAuthSessionAsync(authUrl, redirectTo);
      if (result?.type !== 'success' || !result.url) return { error: null };
      // Parse the callback URL for tokens and set the session.
      const parsed = new URL(String(result.url).replace('#', '?'));
      const access_token = parsed.searchParams.get('access_token') || undefined;
      const refresh_token = parsed.searchParams.get('refresh_token') || undefined;
      const code = parsed.searchParams.get('code') || undefined;
      if (access_token && refresh_token) {
        const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token });
        return { error: sErr as Error | null };
      }
      if (code) {
        const { error: cErr } = await supabase.auth.exchangeCodeForSession(code);
        return { error: cErr as Error | null };
      }
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signInWithApple = async () => {
    try {
      if (await isAppleSignInAvailable()) {
        await nativeAppleSignIn();
        return { error: null };
      }
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, userRole,
      signOut, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple,
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
