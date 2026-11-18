import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
/** Full owner-scoped totals; recent activity is only a preview, never a total. */
export function useRecruiterCounts(){
 const {user}=useAuth();
 return useQuery({queryKey:['recruiter-counts',user?.id],enabled:!!user?.id,queryFn:async()=>{
  if(!user?.id)throw new Error('Not authenticated');
  const activity=(type:string)=>supabase.from('scout_activity_log').select('id',{count:'exact',head:true}).eq('scout_user_id',user.id).eq('activity_type',type);
  const results=await Promise.all([activity('profile_view'),activity('search_performed'),supabase.from('scout_letter_history').select('id',{count:'exact',head:true}).eq('scout_user_id',user.id)]);
  for(const result of results){if(result.error)throw result.error;if(typeof result.count!=='number')throw new Error('Recruiter counts were not confirmed');}
  return {profilesViewed:results[0].count!,searches:results[1].count!,lettersSent:results[2].count!};
 }});
}
