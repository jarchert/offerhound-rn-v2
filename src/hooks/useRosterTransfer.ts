/**
 * useRosterTransfer
 *
 * Club Coach: createTransferRequest — inserts a roster_transfer_requests row.
 * HS Coach:   useIncomingTransferRequests — polls requests where athlete_profile_id
 *             is on one of the HS Coach's teams, then approveRequest / declineRequest.
 *
 * Table: roster_transfer_requests
 *   id, athlete_profile_id, athlete_name, status (pending|approved|declined|completed),
 *   source_team_id, requested_by_user_id, decline_reason,
 *   completed_at, expires_at, created_at, updated_at
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransferRequest {
  id: string;
  athlete_profile_id: string | null;
  athlete_name: string;
  status: 'pending' | 'approved' | 'declined' | 'completed';
  source_team_id: string | null;
  requested_by_user_id: string | null;
  decline_reason: string | null;
  completed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Club Coach ───────────────────────────────────────────────────────────────

/**
 * Returns a mutation to request that an athlete be transferred
 * from the current club team to an HS program.
 */
export function useCreateTransferRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      athleteProfileId,
      athleteName,
      sourceTeamId,
    }: {
      athleteProfileId: string;
      athleteName: string;
      sourceTeamId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Prevent duplicates: check for an existing pending request
      const { data: existing } = await supabase
        .from('roster_transfer_requests')
        .select('id, status')
        .eq('athlete_profile_id', athleteProfileId)
        .eq('source_team_id', sourceTeamId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) throw new Error('A pending transfer request already exists for this athlete.');

      const { data, error } = await supabase
        .from('roster_transfer_requests')
        .insert({
          athlete_profile_id: athleteProfileId,
          athlete_name: athleteName,
          source_team_id: sourceTeamId,
          requested_by_user_id: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data as TransferRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roster-transfer-requests'] });
    },
  });
}

/**
 * Returns all pending transfer requests for a specific athlete+team,
 * so the Club Coach card can show "Request sent" state.
 */
export function useAthleteTransferStatus(
  athleteProfileId: string | null,
  sourceTeamId: string | null,
) {
  return useQuery({
    queryKey: ['roster-transfer-status', athleteProfileId, sourceTeamId],
    queryFn: async () => {
      if (!athleteProfileId || !sourceTeamId) return null;
      const { data } = await supabase
        .from('roster_transfer_requests')
        .select('id, status, created_at')
        .eq('athlete_profile_id', athleteProfileId)
        .eq('source_team_id', sourceTeamId)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as Pick<TransferRequest, 'id' | 'status' | 'created_at'> | null;
    },
    enabled: !!athleteProfileId && !!sourceTeamId,
  });
}

// ─── HS Coach ─────────────────────────────────────────────────────────────────

/**
 * Loads all transfer requests directed at athletes on the HS Coach's teams.
 * Join path: teams (coach_user_id = me) → team_rosters → athlete_profile_id
 *            → roster_transfer_requests.athlete_profile_id
 */
export function useIncomingTransferRequests(statusFilter: 'pending' | 'all' = 'pending') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['roster-transfer-requests', 'hs', user?.id, statusFilter],
    queryFn: async () => {
      if (!user) return [];

      // Step 1: collect athlete_profile_ids from HS Coach's team rosters
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('coach_user_id', user.id);

      if (!teams || teams.length === 0) return [];
      const teamIds = teams.map((t: { id: string }) => t.id);

      const { data: rosters } = await supabase
        .from('team_rosters')
        .select('athlete_profile_id')
        .in('team_id', teamIds)
        .not('athlete_profile_id', 'is', null);

      if (!rosters || rosters.length === 0) return [];
      const athleteIds = [
        ...new Set(
          rosters
            .map((r: { athlete_profile_id: string | null }) => r.athlete_profile_id)
            .filter(Boolean) as string[],
        ),
      ];

      // Step 2: fetch transfer requests for those athletes
      let query = supabase
        .from('roster_transfer_requests')
        .select('*')
        .in('athlete_profile_id', athleteIds)
        .order('created_at', { ascending: false });

      if (statusFilter === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TransferRequest[];
    },
    enabled: !!user,
  });
}

export function useApproveTransferRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('roster_transfer_requests')
        .update({ status: 'approved', completed_at: new Date().toISOString() })
        .eq('id', requestId)
        .select()
        .single();
      if (error) throw error;
      return data as TransferRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roster-transfer-requests'] });
    },
  });
}

export function useDeclineTransferRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      declineReason,
    }: {
      requestId: string;
      declineReason?: string;
    }) => {
      const { data, error } = await supabase
        .from('roster_transfer_requests')
        .update({
          status: 'declined',
          decline_reason: declineReason || null,
        })
        .eq('id', requestId)
        .select()
        .single();
      if (error) throw error;
      return data as TransferRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roster-transfer-requests'] });
    },
  });
}
