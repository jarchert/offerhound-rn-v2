import { supabase } from '@/integrations/supabase/client';

export type NativeGuestEntry = {
  requestKey: string;
  staffId: string;
  fullName: string;
  emailAddress: string;
  jerseyNumber: string;
  position: string;
};

export function makeGuestRequestKey(): string {
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function nativeGuestArguments(campId: string, draft: NativeGuestEntry) {
  const fullName = draft.fullName.trim();
  const emailAddress = draft.emailAddress.trim();
  const jerseyNumber = draft.jerseyNumber.trim();
  if (fullName.length < 1 || fullName.length > 120 || /[\u0000-\u001f\u007f]/.test(fullName)) throw new Error('Enter a guest name of up to 120 characters.');
  if (emailAddress && (emailAddress.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress))) throw new Error('Check the optional email address or leave it empty.');
  if (jerseyNumber.length > 12 || /[\u0000-\u001f\u007f]/.test(jerseyNumber)) throw new Error('The jersey number must be 12 characters or fewer.');
  if (!draft.staffId || !/^[A-Za-z0-9_-]{8,100}$/.test(draft.requestKey)) throw new Error('Sign in as camp staff and start a new guest entry.');
  return {
    p_camp_id: campId,
    p_request_key: draft.requestKey,
    p_actor_user_id: draft.staffId,
    p_guest_name: fullName,
    p_guest_email: emailAddress || null,
    p_jersey_number: jerseyNumber || null,
    p_position_group: draft.position.trim() || null,
  };
}

export async function saveNativeGuest(campId: string, draft: NativeGuestEntry): Promise<string> {
  const response = await (supabase.rpc as any)('register_camp_guest', nativeGuestArguments(campId, draft));
  if (response.error) {
    if (response.error.code === 'PGRST202') throw new Error('Guest registration is not available yet. Ask camp staff for help.');
    throw response.error;
  }
  if (typeof response.data !== 'string') throw new Error('Registration was not confirmed. Retry this guest entry.');
  return response.data;
}

export function savedGuestStaff(payload: Record<string, any>): string | undefined {
  return payload.staffId ?? payload.user_id;
}

export function recoverNativeGuest(payload: Record<string, any>, queueId: string): NativeGuestEntry {
  if (typeof payload.fullName === 'string') {
    return { requestKey: payload.requestKey || queueId, staffId: payload.staffId,
      fullName: payload.fullName, emailAddress: payload.emailAddress || '',
      jerseyNumber: payload.jerseyNumber || '', position: payload.position || '' };
  }
  const prefix = 'Walk-up — Name:';
  const note = String(payload.notes || '');
  const parts = note.startsWith(prefix) ? note.slice(prefix.length).split(' | Email:') : [''];
  return { requestKey: queueId, staffId: payload.user_id, fullName: parts[0].trim(),
    emailAddress: (parts[1] || '').trim(), jerseyNumber: payload.jersey_number || '', position: payload.position_group || '' };
}
