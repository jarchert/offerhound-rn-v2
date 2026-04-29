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
    // Canonical role resolution mirrors Lovable's Navbar.tsx logic.
    // Hierarchy (highest priority wins):
    //   admin (admin_profiles row)
    //   high_school_coach (user_roles.role = 'high_school_coach')
    //   club_coach (coach_profiles.is_club_coach = true)
    //   coach (coach_profiles row)
    //   scout (scout_profiles row) — agency variant resolved downstream by useScoutOrganization
    //   influencer (influencer_profiles row OR user_roles has 'influencer')
    //   athlete (default; parents with linked athletes also get 'athlete' so the parent
    //            overlay can render on top of AthleteTabs — matches Lovable behavior
    //            where parent-only is the rare case and parent-with-athlete is treated
    //            as athlete + parent overlay).
    //   parent (parent-only: parent_athlete_relationships accepted AND no other role)
    try {
      const [
        rolesRes,
        adminRes,
        coachRes,
        scoutRes,
        influencerRes,
        parentRes,
      ] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('admin_profiles' as any).select('id').eq('user_id', userId).maybeSingle(),
        supabase.from('coach_profiles').select('id, is_club_coach').eq('user_id', userId).maybeSingle(),
        supabase.from('scout_profiles').select('id').eq('user_id', userId).maybeSingle(),
        supabase.from('influencer_profiles' as any).select('id').eq('user_id', userId).maybeSingle(),
        supabase
          .from('parent_athlete_relationships' as any)
          .select('id')
          .eq('parent_user_id', userId)
          .eq('invitation_accepted', true)
          .limit(1),
      ]);

      const roleSet = new Set(((rolesRes.data ?? []) as Array<{ role: string }>).map(r => r.role));
      const isAdmin = !!(adminRes.data as any) || roleSet.has('admin') || roleSet.has('moderator');
      const isHSCoach = roleSet.has('high_school_coach');
      const coachData = coachRes.data as any;
      const isClubCoach = !!coachData?.is_club_coach;
      const isCoach = !!coachData;
      const isScout = !!(scoutRes.data as any);
      const isInfluencer = !!(influencerRes.data as any) || roleSet.has('influencer');
      const hasParentLink = Array.isArray(parentRes.data) && parentRes.data.length > 0;
      const isAthleteRow = roleSet.has('athlete');

      let resolved: AppRole;
      if (isAdmin) resolved = 'admin' as AppRole;
      else if (isHSCoach) resolved = 'high_school_coach' as AppRole;
      else if (isClubCoach) resolved = 'club_coach' as AppRole;
      else if (isCoach) resolved = 'coach' as AppRole;
      else if (isScout) resolved = 'scout' as AppRole;
      else if (isInfluencer) resolved = 'influencer' as AppRole;
      else if (isAthleteRow) resolved = 'athlete' as AppRole;
      else if (hasParentLink) resolved = 'parent' as AppRole;
      else resolved = 'athlete' as AppRole; // safest fallback (Lovable default)

      setUserRole(resolved);
    } catch (e) {
      console.warn('[auth] fetchUserRole failed; defaulting to athlete', e);
      setUserRole('athlete' as AppRole);
    }
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
