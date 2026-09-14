/**
 * useAthleteVisibilityProposal — RN port of MAIN src/hooks/useAthleteVisibilityProposal.ts
 *
 * Exact RPC calling conventions (p_ prefix required):
 *   propose_athlete_public_visibility(p_athlete_profile_id uuid)
 *   withdraw_visibility_proposal(p_proposal_id uuid)
 *
 * Both require a real user JWT — called via supabase.rpc() which automatically
 * uses the current session token from supabase.auth.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAgeBand, type AgeBand } from "@/lib/getAgeBand";

export type ProposalStatus =
  | "pending"
  | "pending_parent_invite"
  | "approved"
  | "denied"
  | "withdrawn"
  | "expired";

export interface VisibilityProposalState {
  ageBand: AgeBand;
  dateOfBirth: string | null;
  hasLinkedParent: boolean;
  openProposal: {
    id: string;
    status: ProposalStatus;
    proposed_at: string;
    awaiting_parent_user_id: string | null;
  } | null;
}

const OPEN_STATUSES: ProposalStatus[] = ["pending", "pending_parent_invite"];

export function useAthleteVisibilityProposal(
  athleteProfileId: string | null | undefined,
) {
  const qc = useQueryClient();
  const key = ["athlete-visibility-proposal", athleteProfileId];

  const query = useQuery<VisibilityProposalState | null>({
    queryKey: key,
    enabled: !!athleteProfileId,
    queryFn: async () => {
      if (!athleteProfileId) return null;

      // 1. Fetch DOB to determine age band
      const { data: profile } = await supabase
        .from("player_profiles")
        .select("id, date_of_birth, user_id")
        .eq("id", athleteProfileId)
        .maybeSingle();

      const dob = (profile as any)?.date_of_birth ?? null;
      const ageBand = getAgeBand(dob);

      // 2. Check for a linked, accepted parent
      const { data: parentRow } = await supabase
        .from("parent_athlete_relationships")
        .select("id")
        .eq("athlete_profile_id", athleteProfileId)
        .eq("invitation_accepted", true)
        .limit(1)
        .maybeSingle();

      // 3. Check for an open proposal
      const { data: openRow } = await supabase
        .from("athlete_visibility_proposals")
        .select("id, status, proposed_at, awaiting_parent_user_id")
        .eq("athlete_profile_id", athleteProfileId)
        .in("status", OPEN_STATUSES)
        .order("proposed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ageBand,
        dateOfBirth: dob,
        hasLinkedParent: !!parentRow,
        openProposal: openRow
          ? {
              id: openRow.id,
              status: openRow.status as ProposalStatus,
              proposed_at: openRow.proposed_at,
              awaiting_parent_user_id: openRow.awaiting_parent_user_id,
            }
          : null,
      };
    },
  });

  const propose = useMutation({
    mutationFn: async () => {
      if (!athleteProfileId) throw new Error("Missing athlete profile id");
      const { data, error } = await (supabase.rpc as any)(
        "propose_athlete_public_visibility",
        { p_athlete_profile_id: athleteProfileId },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const withdraw = useMutation({
    mutationFn: async () => {
      const proposalId = query.data?.openProposal?.id;
      if (!proposalId) throw new Error("No open proposal to withdraw");
      const { error } = await (supabase.rpc as any)("withdraw_visibility_proposal", {
        p_proposal_id: proposalId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...query, propose, withdraw };
}
