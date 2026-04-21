import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useContactEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contact-events", user?.id],
    queryFn: async () => {
       if (!user) return [];
       const { data } = await supabase.from("contact_events").select("*").eq("user_id", user.id).order("contacted_at", { ascending: false });
       return data || [];
    },
    enabled: !!user,
  });
}

export function useUpdateContactStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
       const { error } = await supabase.from("contact_events").update({ status }).eq("id", id);
       if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-events"] }),
  });
}
