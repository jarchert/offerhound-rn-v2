import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { supabase } from '@/integrations/supabase/client';

const IMPERSONATION_KEY = 'admin_impersonation';

interface ImpersonationData {
  adminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  startedAt: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonationData: ImpersonationData | null;
  startImpersonation: (data: Omit<ImpersonationData, 'startedAt'>) => void;
  endImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUserId(session?.user?.id || null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(IMPERSONATION_KEY).then(stored => {
      if (stored) {
        try {
          const data = JSON.parse(stored) as ImpersonationData;
          const hoursDiff = (Date.now() - new Date(data.startedAt).getTime()) / 3600000;
          if (hoursDiff < 24) setImpersonationData(data);
          else AsyncStorage.removeItem(IMPERSONATION_KEY);
        } catch { AsyncStorage.removeItem(IMPERSONATION_KEY); }
      }
    });
  }, []);

  const startImpersonation = useCallback((data: Omit<ImpersonationData, 'startedAt'>) => {
    const fullData: ImpersonationData = { ...data, startedAt: new Date().toISOString() };
    AsyncStorage.setItem(IMPERSONATION_KEY, JSON.stringify(fullData));
    setImpersonationData(fullData);
  }, []);

  const endImpersonation = useCallback(async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(IMPERSONATION_KEY);
    setImpersonationData(null);
    Toast.show({ type: 'success', text1: 'Impersonation session ended' });
  }, []);

  const isActuallyImpersonating = !!(impersonationData && currentUserId && currentUserId === impersonationData.targetUserId);

  return (
    <ImpersonationContext.Provider value={{
      isImpersonating: isActuallyImpersonating,
      impersonationData: isActuallyImpersonating ? impersonationData : null,
      startImpersonation,
      endImpersonation,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) throw new Error('useImpersonation must be used within ImpersonationProvider');
  return context;
}
