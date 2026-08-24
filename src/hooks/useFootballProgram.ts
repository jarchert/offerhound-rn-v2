// useFootballProgram — fetch + upsert for hs_football_program.
// One row per owner_user_id (UNIQUE constraint). Uses onConflict upsert.
//
// Confirmed columns (live introspection 2026-08-24):
//   id, owner_user_id, program_name, school_name, city, state,
//   classification, head_coach_name, head_coach_email, head_coach_phone,
//   created_at, updated_at
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type FootballProgram = {
  id?: string;
  owner_user_id?: string;
  program_name: string;
  school_name: string;
  city: string;
  state: string;
  classification: string;
  head_coach_name: string;
  head_coach_email: string;
  head_coach_phone: string;
  created_at?: string;
  updated_at?: string;
};

export type ProgramPayload = Omit<FootballProgram, 'id' | 'created_at' | 'updated_at'>;

export const PROGRAM_EMPTY: Omit<FootballProgram, 'id' | 'owner_user_id' | 'created_at' | 'updated_at'> = {
  program_name: '',
  school_name: '',
  city: '',
  state: '',
  classification: '',
  head_coach_name: '',
  head_coach_email: '',
  head_coach_phone: '',
};

export function useFootballProgram() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery<FootballProgram | null>({
    queryKey: ['hs-football-program', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('hs_football_program')
        .select('*')
        .eq('owner_user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as FootballProgram | null;
    },
    enabled: !!user,
  });

  const mutation = useMutation<FootballProgram, Error, ProgramPayload>({
    mutationFn: async (payload: ProgramPayload) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('hs_football_program')
        .upsert(payload, { onConflict: 'owner_user_id' })
        .select()
        .single();
      if (error) throw error;
      return data as FootballProgram;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hs-football-program'] });
      toast({ title: 'Program saved', description: 'Your program info has been updated.' });
    },
    onError: (err) => {
      toast({ title: 'Save failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    },
  });

  return {
    program:     query.data ?? null,
    isLoading:   query.isLoading,
    isPending:   mutation.isPending,
    saveProgram: (payload: ProgramPayload) => mutation.mutate(payload),
  };
}
