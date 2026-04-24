import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline';

// React Native equivalent of the Lovable useDebouncedOnlineStatus hook.
// Uses NetInfo to observe connectivity and debounces changes to prevent flicker.
const useDebouncedOnlineStatus = (delay = 1000) => {
  const [isOnline, setIsOnline] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsOnline(next);
      }, delay);
    });
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      unsubscribe();
    };
  }, [delay]);

  return isOnline;
};

export const useSyncStatus = () => {
  // Use debounced status to prevent flickering
  const isOnline = useDebouncedOnlineStatus(1000);
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isOnline ? 'idle' : 'offline');
  const wasOfflineRef = useRef(false);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setSyncStatus('offline');
    } else if (wasOfflineRef.current && isOnline && !isSyncingRef.current) {
      // Coming back online - trigger sync
      isSyncingRef.current = true;
      setSyncStatus('syncing');

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries().then(() => {
        setSyncStatus('synced');
        // Reset to idle after showing synced status
        setTimeout(() => {
          setSyncStatus('idle');
          wasOfflineRef.current = false;
          isSyncingRef.current = false;
        }, 2000);
      }).catch(() => {
        setSyncStatus('idle');
        wasOfflineRef.current = false;
        isSyncingRef.current = false;
      });
    }
  }, [isOnline, queryClient]);

  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setSyncStatus('syncing');
    try {
      await queryClient.invalidateQueries();
      setSyncStatus('synced');
      setTimeout(() => {
        setSyncStatus('idle');
        isSyncingRef.current = false;
      }, 2000);
    } catch {
      setSyncStatus('idle');
      isSyncingRef.current = false;
    }
  }, [isOnline, queryClient]);

  return {
    syncStatus,
    isOnline,
    triggerSync,
  };
};
