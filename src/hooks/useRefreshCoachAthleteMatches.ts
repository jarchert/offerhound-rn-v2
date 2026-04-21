import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useRefreshCoachAthleteMatches() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const refreshingRef = useRef(false);

  const refreshMatches = useCallback(async (options?: { force?: boolean }) => {
    if (refreshingRef.current) return { success: false, matchesCreated: 0 };
    refreshingRef.current = true;
    setIsRefreshing(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, matchesCreated: 0, error: 'Not authenticated' };
      const { data, error: invokeError } = await supabase.functions.invoke('refresh-coach-athlete-matches', {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (invokeError) throw invokeError;
      await queryClient.invalidateQueries({ queryKey: ['coach-athlete-matches'] });
      setLastRefresh(new Date());
      return { success: true, matchesCreated: data?.matchesCreated || 0 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh';
      setError(msg);
      return { success: false, matchesCreated: 0, error: msg };
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [lastRefresh, queryClient]);

  return { refreshMatches, isRefreshing, lastRefresh, error };
}
