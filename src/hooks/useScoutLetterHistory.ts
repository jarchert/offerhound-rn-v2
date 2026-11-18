import {useQuery,useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from './useAuth';
import {readLetterHistory,insertLetterHistory,removeLetterHistory} from '@/lib/letterHistory';
import Toast from 'react-native-toast-message';
export interface ScoutLetterHistoryEntry {
  id: string;
  scout_user_id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_type: string;
  organization_name: string | null;
  letter_type: string;
  letter_content: string;
  in_response_to_type: string | null;
  sent_at: string;
  created_at: string;
}

export function useScoutLetterHistory(){
 const {user}=useAuth(),qc=useQueryClient(),key=['scout-letter-history',user?.id];
 const query=useQuery({queryKey:key,enabled:!!user,queryFn:()=>readLetterHistory(supabase,user!.id,'scout')});
 const addToHistory=async(entry:any)=>{if(!user)throw Error('Sign in to save letter history.');await insertLetterHistory(supabase,user.id,'scout',entry);await qc.invalidateQueries({queryKey:key});};
 const deleteFromHistory=async(id:string)=>{try{if(!user)throw Error('Sign in required');await removeLetterHistory(supabase,user.id,'scout',id);await qc.invalidateQueries({queryKey:key});Toast.show({type:'success',text1:'Letter deleted from history'});}catch{Toast.show({type:'error',text1:'History removal not confirmed'});}};
 return {history:(query.data||[]) as ScoutLetterHistoryEntry[],isLoading:query.isLoading,error:query.error,addToHistory,deleteFromHistory,refetch:query.refetch};
}
