import { supabase } from '@/integrations/supabase/client';
export const VOICE_BUCKET = 'camp-evaluation-audio';
export const VOICE_LIMIT_MS = 120000;
export type CampVoiceNote = { id: string; camp_id: string; enrollment_id: string; evaluator_user_id: string; performance_entry_id: string; drill_key: string; storage_path: string; duration_ms: number; size_bytes: number; created_at: string };
export type NativeVoiceDraft = { id: string; uri: string; durationMs: number; staffId: string };
export function newVoiceIdentity() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, letter => { const value = Math.floor(Math.random() * 16); return (letter === 'x' ? value : (value & 3) | 8).toString(16); });
}
export function nativeVoicePath(camp: string, enrollment: string, draft: NativeVoiceDraft) { return `${camp}/${enrollment}/${draft.staffId}/${draft.id}.m4a`; }
export async function persistNativeVoice(camp: string, enrollment: string, drill: string, draft: NativeVoiceDraft, bytes: ArrayBuffer) {
  if (!draft.staffId || draft.durationMs <= 0 || draft.durationMs > VOICE_LIMIT_MS || bytes.byteLength < 1 || bytes.byteLength > 10485760) throw Error('Record a voice note of up to two minutes and 10 MB.');
  const path = nativeVoicePath(camp, enrollment, draft);
  const upload = await supabase.storage.from(VOICE_BUCKET).upload(path, bytes, { contentType: 'audio/mp4', upsert: false });
  if (upload.error && String((upload.error as any).statusCode) !== '409') throw upload.error;
  const saved = await (supabase.rpc as any)('save_camp_voice_note', { p_id: draft.id, p_camp_id: camp, p_enrollment_id: enrollment, p_drill_key: drill, p_storage_path: path, p_mime_type: 'audio/mp4', p_duration_ms: draft.durationMs, p_size_bytes: bytes.byteLength });
  if (saved.error) throw saved.error;
  if (saved.data !== draft.id) throw Error('Voice note was not confirmed. Retry this draft.');
}
export async function nativeVoicePlayback(note: CampVoiceNote) {
  const result = await supabase.storage.from(VOICE_BUCKET).createSignedUrl(note.storage_path, 90);
  if (result.error) throw result.error;
  return result.data.signedUrl;
}
export async function removeNativeVoice(note: CampVoiceNote) {
  const file = await supabase.storage.from(VOICE_BUCKET).remove([note.storage_path]);
  if (file.error) throw file.error;
  const row = await supabase.from('camp_voice_notes').delete().eq('id', note.id).select('id');
  if (row.error) throw row.error;
  if (row.data?.length !== 1) throw Error('Voice note deletion was not authorized or confirmed.');
}
export async function discardNativeUpload(camp: string, enrollment: string, draft: NativeVoiceDraft) {
  const saved = await supabase.from('camp_voice_notes').select('id').eq('id', draft.id).maybeSingle();
  if (saved.error) throw saved.error;
  if (saved.data) return; // A lost reply may hide a committed save; never delete that audio as a draft.
  const removed = await supabase.storage.from(VOICE_BUCKET).remove([nativeVoicePath(camp, enrollment, draft)]);
  if (removed.error) throw removed.error;
}
