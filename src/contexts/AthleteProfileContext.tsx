import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PlayerProfile } from '@/integrations/supabase/types';

export type PlayerProfileUpdate = Partial<PlayerProfile>;

interface AthleteProfileContextType {
  profile: PlayerProfile | null;
  isParentView: boolean;
  hasAccess: boolean;
  isLoading: boolean;
  linkedAthletes: PlayerProfile[];
  selectedAthleteId: string | null;
  selectAthlete: (athleteId: string) => void;
  updateProfile: (data: PlayerProfileUpdate) => Promise<PlayerProfile | null>;
  publishProfile: () => Promise<PlayerProfile | null>;
  unpublishProfile: () => Promise<PlayerProfile | null>;
  refetch: () => void;
}

const AthleteProfileContext = createContext<AthleteProfileContextType | null>(null);

export function AthleteProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    setProfile(data as PlayerProfile | null);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = async (data: PlayerProfileUpdate): Promise<PlayerProfile | null> => {
    if (!profile) return null;
    const { data: updated } = await supabase
      .from('player_profiles')
      .update(data)
      .eq('id', profile.id)
      .select()
      .maybeSingle();
    if (updated) setProfile(updated as PlayerProfile);
    return updated as PlayerProfile | null;
  };

  const publishProfile = async () => updateProfile({ is_published: true });
  const unpublishProfile = async () => updateProfile({ is_published: false });

  return (
    <AthleteProfileContext.Provider
      value={{
        profile,
        isParentView: false,
        hasAccess: !!profile,
        isLoading,
        linkedAthletes: [],
        selectedAthleteId: null,
        selectAthlete: () => {},
        updateProfile,
        publishProfile,
        unpublishProfile,
        refetch: fetchProfile,
      }}
    >
      {children}
    </AthleteProfileContext.Provider>
  );
}

export function useAthleteProfile() {
  const context = useContext(AthleteProfileContext);
  if (!context) throw new Error('useAthleteProfile must be used within AthleteProfileProvider');
  return context;
}
