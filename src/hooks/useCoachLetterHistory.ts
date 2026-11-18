import {useQuery,useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from './useAuth';
import {readLetterHistory,insertLetterHistory,removeLetterHistory} from '@/lib/letterHistory';
import Toast from 'react-native-toast-message';
export interface CoachLetterHistoryEntry {
  id: string;
  coach_user_id: string;
  athlete_name: string;
  athlete_email: string;
  athlete_school: string | null;
  letter_type: string;
  letter_content: string;
  in_response_to_type: string | null;
  sent_at: string;
  created_at: string;
}

export function useCoachLetterHistory(){
 const {user}=useAuth(),qc=useQueryClient(),key=['coach-letter-history',user?.id];
 const query=useQuery({queryKey:key,enabled:!!user,queryFn:()=>readLetterHistory(supabase,user!.id,'coach')});
 const addToHistory=async(entry:any)=>{if(!user)throw Error('Sign in to save letter history.');await insertLetterHistory(supabase,user.id,'coach',entry);await qc.invalidateQueries({queryKey:key});};
 const deleteFromHistory=async(id:string)=>{try{if(!user)throw Error('Sign in required');await removeLetterHistory(supabase,user.id,'coach',id);await qc.invalidateQueries({queryKey:key});Toast.show({type:'success',text1:'Letter deleted from history'});}catch{Toast.show({type:'error',text1:'History removal not confirmed'});}};
 return {history:(query.data||[]) as CoachLetterHistoryEntry[],isLoading:query.isLoading,error:query.error,addToHistory,deleteFromHistory,refetch:query.refetch};
}
