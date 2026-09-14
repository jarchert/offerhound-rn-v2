// useMinorProfileInvitation — RN port of MAIN src/hooks/useMinorProfileInvitation.ts
//
// Calls:
//   get_minor_profile_invitation(p_token)        → state + invitation metadata
//   get_minor_invitation_parent_email(p_token)   → plain email (valid invites only)
//
// Re-exports the same shape as MAIN so ParentAthleteEditor / MinorProfileForm
// can be ported without field renames.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MinorInvitationState =
  | 'valid'
  | 'not_found'
  | 'expired'
  | 'voided'
  | 'consumed';

export interface MinorInvitationRow {
  state: MinorInvitationState;
  invitation_id: string | null;
  roster_id: string | null;
  athlete_name: string | null;
  team_name: string | null;
  club_name: string | null;
  parent_email_masked: string | null;
  expires_at: string | null;
  first_viewed_at: string | null;
}

export function useMinorProfileInvitation(token: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<MinorInvitationRow | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [parentEmail, setParentEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Missing invitation token');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data: sess } = await supabase.auth.getSession();
    setSessionUserId(sess.session?.user?.id ?? null);
    setSessionEmail(sess.session?.user?.email?.toLowerCase() ?? null);

    const { data, error: rpcErr } = await (supabase.rpc as any)(
      'get_minor_profile_invitation',
      { p_token: token },
    );

    if (rpcErr) {
      setError(rpcErr.message);
      setLoading(false);
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | MinorInvitationRow
      | null
      | undefined;

    const resolved: MinorInvitationRow = row ?? {
      state: 'not_found',
      invitation_id: null,
      roster_id: null,
      athlete_name: null,
      team_name: null,
      club_name: null,
      parent_email_masked: null,
      expires_at: null,
      first_viewed_at: null,
    };

    setInvitation(resolved);

    // Only valid invitations expose the exact parent address — this is what
    // prevents the email-mismatch case from ever being reachable.
    if (resolved.state === 'valid') {
      const { data: emailData } = await (supabase.rpc as any)(
        'get_minor_invitation_parent_email',
        { p_token: token },
      );
      setParentEmail(
        typeof emailData === 'string' ? emailData.toLowerCase() : null,
      );
    } else {
      setParentEmail(null);
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep session state in sync across sign-in/out events
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user?.id ?? null);
      setSessionEmail(session?.user?.email?.toLowerCase() ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    loading,
    error,
    invitation,
    state: invitation?.state ?? null,
    sessionUserId,
    sessionEmail,
    parentEmail,
    reload: load,
  };
}
