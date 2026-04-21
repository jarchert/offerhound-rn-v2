import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useLetterHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
     queryKey: ["letter-history", user?.id],
     queryFn: async () => {
        if (!user) return [];
        const { data } = await supabase.from("coach_letter_history" as any).select("*").eq("coach_user_id", user.id).order("sent_at", { ascending: false });
        return data || [];
     },
     enabled: !!user,
  });

  const addToHistory = async (entry: any) => {
     if (!user) return;
     await supabase.from("coach_letter_history" as any).insert({ ...entry, coach_user_id: user.id });
     queryClient.invalidateQueries({ queryKey: ["letter-history"] });
  };

  const deleteFromHistory = async (id: string) => {
     await supabase.from("coach_letter_history" as any).delete().eq("id", id);
     queryClient.invalidateQueries({ queryKey: ["letter-history"] });
  };

  return { history, isLoading, addToHistory, deleteFromHistory };
}
