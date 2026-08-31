/**
 * useRosterTransferConsentToken — RN port of MAIN src/hooks/useRosterTransferConsentToken.ts
 *
 * Exact RPC calling conventions (confirmed from MAIN source):
 *   get_roster_transfer_consent_token(p_token text) → RosterConsentTokenInfo
 *   parent_respond_to_roster_transfer(p_token, p_approve, p_confirm_email, p_decline_reason)
 *
 * p_confirm_email is required — identity confirmation step. Do not drop it.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RosterConsentTokenInfo {
  valid: boolean;
  reason: string | null;
  request_id: string | null;
  status: string | null;
  athlete_name: string | null;
  source_team_name: string | null;
  destination_team_name: string | null;
  destination_school: string | null;
  requesting_coach: string | null;
  note: string | null;
  parent_email_hint: string | null;
  expires_at: string | null;
  created_at: string | null;
}

export function useRosterTransferConsentToken(token: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<RosterConsentTokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Missing token');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await (supabase.rpc as any)(
      'get_roster_transfer_consent_token',
      { p_token: token },
    );
    if (rpcErr) {
      setError(rpcErr.message);
      setLoading(false);
      return;
    }
    setInfo((data as unknown as RosterConsentTokenInfo) ?? null);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submitDecision = useCallback(
    async (approve: boolean, confirmEmail: string, declineReason?: string) => {
      if (!token) throw new Error('Missing token');
      const { data, error: rpcErr } = await (supabase.rpc as any)(
        'parent_respond_to_roster_transfer',
        {
          p_token: token,
          p_approve: approve,
          p_confirm_email: confirmEmail.trim(),
          p_decline_reason: declineReason?.trim() || null,
        },
      );
      if (rpcErr) throw rpcErr;
      await load();
      return data as string;
    },
    [token, load],
  );

  return { loading, error, info, reload: load, submitDecision };
}
