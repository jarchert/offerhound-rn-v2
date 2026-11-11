import { supabase } from '@/integrations/supabase/client';
export function safeCampClipUrl(value:string) {
 const url=new URL(value.trim());
 if(url.protocol!=='https:'||url.username||url.password)throw Error('Use a public HTTPS video link. Phone-local files cannot be shared.');
 return url.href;
}
async function actor(){const r=await supabase.auth.getUser();if(r.error||!r.data.user)throw Error('Sign in again to continue.');return r.data.user;}
export async function saveCampFeedback(campId:string,enrollmentId:string,score:number,comment:string){
 if(!Number.isInteger(score)||score<0||score>10)throw Error('Choose a rating from 0 to 10.');
 const user=await actor();const existing=await supabase.from('camp_nps_responses').select('id').eq('camp_id',campId).eq('user_id',user.id).maybeSingle();if(existing.error)throw existing.error;
 const payload={camp_id:campId,enrollment_id:enrollmentId,user_id:user.id,nps_score:score,written_feedback:comment.trim()||null,allow_as_testimonial:false};
 const r=existing.data?await supabase.from('camp_nps_responses').update(payload).eq('id',existing.data.id).select('id').single():await supabase.from('camp_nps_responses').insert(payload).select('id').single();if(r.error)throw r.error;return r.data;
}
export async function requestCampRefund(campId:string,enrollmentId:string,reason:string){
 if(reason.trim().length<10)throw Error('Please give a reason of at least 10 characters.');
 const user=await actor();const previous=await supabase.from('camp_refund_requests').select('id,status,reason,decision_notes').eq('camp_id',campId).eq('enrollment_id',enrollmentId).eq('athlete_user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();if(previous.error)throw previous.error;if(previous.data)return previous.data;
 const r=await supabase.from('camp_refund_requests').insert({camp_id:campId,enrollment_id:enrollmentId,athlete_user_id:user.id,reason:reason.trim()}).select('id,status,reason,decision_notes').single();if(r.error)throw r.error;return r.data;
}
