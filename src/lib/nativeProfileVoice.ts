import { supabase } from '@/integrations/supabase/client';
import type { CampVoiceNote } from '@/lib/nativeCampVoice';
export async function loadNativeProfileVoice(enrollmentId:string) {
 const enrollment=await supabase.from('camp_enrollments').select('camp_id').eq('id',enrollmentId).maybeSingle();
 if(enrollment.error)throw enrollment.error;if(!enrollment.data)return null;
 const campId=enrollment.data.camp_id;
 const access=await (supabase.rpc as any)('can_evaluate_camp',{p_camp_id:campId});if(access.error)throw access.error;if(access.data!==true)return null;
 const notes=await supabase.from('camp_voice_notes').select('*').eq('camp_id',campId).eq('enrollment_id',enrollmentId).order('created_at',{ascending:false});
 if(notes.error)throw notes.error;
 return {campId,notes:(notes.data||[]) as CampVoiceNote[]};
}
