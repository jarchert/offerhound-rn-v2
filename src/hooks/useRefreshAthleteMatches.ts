import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface RefreshResult {
  success: boolean;
  matchesCreated: number;
  topScore?: number;
  priorities?: {
     high: number;
     medium: number;
     low: number;
  };
  error?: string;
}

export function useRefreshAthleteMatches() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const refreshingRef = useRef(false);
  const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

  const refreshMatches = useCallback(async (options?: {
     force?: boolean;
     athleteProfileId?: string;
  }): Promise<RefreshResult> => {
     const { force = false, athleteProfileId } = options || {};

     if (refreshingRef.current) {
       return { success: false, matchesCreated: 0, error: 'Refresh already in progress' };
     }

     if (!force && lastRefresh) {
       const timeSinceLastRefresh = Date.now() - lastRefresh.getTime();
       if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL_MS) {
         return { success: true, matchesCreated: 0 };
       }
     }

     refreshingRef.current = true;
     setIsRefreshing(true);
     setError(null);

     try {
       const { data: { session } } = await supabase.auth.getSession();

       if (!session) {
         return { success: false, matchesCreated: 0, error: 'Not authenticated' };
       }

       const requestBody = athleteProfileId ? { athleteProfileId } : {};

       const { data, error: invokeError } = await supabase.functions.invoke('refresh-athlete-matches', {
          body: requestBody,
          headers: {
             Authorization: `Bearer ${session.access_token}`,
          },
       });

       if (invokeError) throw invokeError;

       if (data?.error) {
          if (data.error === 'No athlete profile found') {
             return { success: true, matchesCreated: 0 };
          }
          throw new Error(data.error);
       }

       await queryClient.invalidateQueries({ queryKey: ['athlete-matches'] });

       setLastRefresh(new Date());

       return {
          success: true,
          matchesCreated: data.matchesCreated || 0,
          topScore: data.topScore,
          priorities: data.priorities,
       };

     } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Failed to refresh matches';
       console.error('Match refresh error:', errorMessage);
       setError(errorMessage);
       return { success: false, matchesCreated: 0, error: errorMessage };
     } finally {
       refreshingRef.current = false;
       setIsRefreshing(false);
     }
  }, [lastRefresh, queryClient]);

  const reset = useCallback(() => {
     setLastRefresh(null);
     setError(null);
     setIsRefreshing(false);
     refreshingRef.current = false;
  }, []);

  return {
     refreshMatches,
     isRefreshing,
     lastRefresh,
     error,
     reset,
  };
}
