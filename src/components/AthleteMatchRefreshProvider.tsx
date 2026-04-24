import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRefreshAthleteMatches } from '@/hooks/useRefreshAthleteMatches';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

/**
 * Provider component that automatically refreshes athlete matches on login.
 * Place this component high in the component tree to ensure matches are
 * refreshed whenever an athlete logs in.
 */
export function AthleteMatchRefreshProvider({ children }: { children: React.ReactNode }) {
  const { refreshMatches } = useRefreshAthleteMatches();
  const { profile } = usePlayerProfile();
  const hasRefreshedRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only refresh on SIGNED_IN event (login)
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in - triggering match refresh');
        // Small delay to ensure profile is loaded, then verify session still active
        setTimeout(async () => {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            refreshMatches({ force: true });
          }
        }, 1500);
      }
      
      // Clear refresh tracking on sign out
      if (event === 'SIGNED_OUT') {
        hasRefreshedRef.current = null;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshMatches]);

  // Also refresh when profile becomes available (handles page refresh case)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // If profile just loaded and we haven't refreshed for this profile yet
    if (profile?.id && hasRefreshedRef.current !== profile.id) {
      console.log('Profile loaded - checking if match refresh needed');
      hasRefreshedRef.current = profile.id;
      
      // Check last refresh time from matches data
      refreshMatches();
    }
  }, [profile?.id, refreshMatches]);

  return <>{children}</>;
}
