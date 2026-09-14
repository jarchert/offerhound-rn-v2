// useFootballRoster — fetch + upsert/delete for hs_football_roster.
// One row per athlete per owner_user_id. Uses id-based upsert for edits,
// insert for new rows, and hard-delete for removals.
//
// Confirmed columns (schema design 2026-08-24):
//   id, owner_user_id, athlete_name, jersey_number, position, class_year,
//   height, weight, gpa, hudl_url, highlight_video_urls (text[]),
//   twitter_handle, instagram_handle, tiktok_handle, youtube_handle,
//   notes, is_active, display_order, created_at, updated_at
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type RosterAthlete = {
  id?: string;
  owner_user_id?: string;
  athlete_name: string;
  jersey_number: string;
  position: string;
  class_year: string;
  height: string;
  weight: string;
  gpa: string;
  hudl_url: string;
  highlight_video_urls: string[];
  twitter_handle: string;
  instagram_handle: string;
  tiktok_handle: string;
  youtube_handle: string;
  notes: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
};

export type RosterAthletePayload = Omit<RosterAthlete, 'id' | 'created_at' | 'updated_at'>;

export const ROSTER_ATHLETE_EMPTY: Omit<RosterAthlete, 'id' | 'owner_user_id' | 'created_at' | 'updated_at'> = {
  athlete_name:         '',
  jersey_number:        '',
  position:             '',
  class_year:           '',
  height:               '',
  weight:               '',
  gpa:                  '',
  hudl_url:             '',
  highlight_video_urls: [],
  twitter_handle:       '',
  instagram_handle:     '',
  tiktok_handle:        '',
  youtube_handle:       '',
  notes:                '',
  is_active:            true,
  display_order:        0,
};

export function useFootballRoster() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery<RosterAthlete[]>({
    queryKey: ['hs-football-roster', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('hs_football_roster')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RosterAthlete[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation<RosterAthlete, Error, { id?: string; payload: RosterAthletePayload }>({
    mutationFn: async ({ id, payload }) => {
      if (!user) throw new Error('Not authenticated');
      if (id) {
        const { data, error } = await supabase
          .from('hs_football_roster')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('owner_user_id', user.id)
          .select()
          .single();
        if (error) throw error;
        return data as RosterAthlete;
      } else {
        const { data, error } = await supabase
          .from('hs_football_roster')
          .insert({ ...payload, owner_user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        return data as RosterAthlete;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hs-football-roster'] });
      toast({ title: 'Athlete saved', description: 'Roster updated.' });
    },
    onError: (err) => {
      toast({ title: 'Save failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('hs_football_roster')
        .delete()
        .eq('id', id)
        .eq('owner_user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hs-football-roster'] });
      toast({ title: 'Athlete removed', description: 'Removed from roster.' });
    },
    onError: (err) => {
      toast({ title: 'Delete failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    },
  });

  return {
    athletes:    query.data ?? [],
    isLoading:   query.isLoading,
    isSaving:    saveMutation.isPending,
    isDeleting:  deleteMutation.isPending,
    saveAthlete: (id: string | undefined, payload: RosterAthletePayload) =>
      saveMutation.mutate({ id, payload }),
    deleteAthlete: (id: string) => deleteMutation.mutate(id),
  };
}
