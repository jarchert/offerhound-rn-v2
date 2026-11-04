import { supabase } from '@/integrations/supabase/client';
const completeToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function decodeCampToken(input: string): string {
  let value = input.trim();
  if (!completeToken.test(value)) {
    try {
      const url = new URL(value);
      if (!['offer-hound.com', 'www.offer-hound.com', 'offerhound.app', 'www.offerhound.app'].includes(url.hostname) && !['offerhoundv2:', 'offerhound-staging:'].includes(url.protocol)) throw Error();
      value = url.searchParams.get('token') || url.pathname.split('/').filter(Boolean).pop() || '';
    } catch { throw new Error('Scan or enter a complete OfferHound enrollment QR code.'); }
  }
  if (!completeToken.test(value)) throw new Error('Use the complete QR token; partial codes are not accepted.');
  return value.toLowerCase();
}
export async function checkInNativeToken(campId: string, input: string, staffId: string) {
  if (!staffId) throw new Error('Sign in as camp registration staff.');
  const response = await (supabase.rpc as any)('check_in_camp_token', { p_camp_id: campId, p_token: decodeCampToken(input), p_actor_user_id: staffId });
  if (response.error) throw response.error;
  if (!response.data || !['checked_in', 'already_checked_in'].includes(response.data.status)) throw new Error('Check-in was not confirmed. Retry the same QR code.');
  return response.data as { enrollment_id: string; status: 'checked_in' | 'already_checked_in' };
}
