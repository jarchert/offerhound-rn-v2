import {insertLetterHistory,removeLetterHistory} from '@/lib/letterHistory';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Toast from "react-native-toast-message";
const toast = (opts: any) => Toast.show(opts);

// Generic unified letter history that piggy-backs on coach_letter_history
// for any sender role. Stored entries use coach_user_id as the sender ID
// regardless of role; the role is implied by the page context.
export function useUnifiedLetterHistory(senderRole: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["unified-letter-history", senderRole, user?.id];

  const { data: history = [], isLoading, refetch, error:historyError } = useQuery({
     queryKey,
     queryFn: async () => {
        if (!user) return [];
        const { data,error } = await supabase
          .from("coach_letter_history" as any)
          .select("*")
          .eq("coach_user_id", user.id)
          .order("sent_at", { ascending: false });
        if(error)throw error;
        return (data as any[]) || [];
     },
     enabled: !!user,
  }) as any;

  const addToHistory = async (entry: any) => {
     if (!user) throw Error("Sign in required");
     await insertLetterHistory(supabase,user.id,'coach',{
        athlete_name: entry.recipient_name || entry.athlete_name || "Recipient",
        athlete_email: entry.recipient_email || entry.athlete_email || "",
        athlete_school: entry.organization_name || entry.athlete_school || null,
        letter_type: entry.letter_type,
        letter_content: entry.letter_content,
        in_response_to_type: entry.in_response_to_type || null,
     });
     queryClient.invalidateQueries({ queryKey });
  };

  const deleteFromHistory = async (id: string) => {
     try{if(!user)throw Error('Sign in required');await removeLetterHistory(supabase,user.id,'coach',id);}catch{Toast.show({type:'error',text1:'History removal not confirmed'});return;}
     queryClient.invalidateQueries({ queryKey });
     Toast.show({ type: "success", text1: "Letter deleted" });
  };

  return { history: (history as any[]) ?? [], isLoading, error:historyError, addToHistory, deleteFromHistory, refetch };
}
