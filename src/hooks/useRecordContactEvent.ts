import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RecordContactEventInput {
  coach_id: string;
  coach_name: string;
  school?: string | null;
  contact_type?: "email" | "message" | "letter" | "phone" | string;
  status?: "sent" | "opened" | "replied" | "pending" | string;
  notes?: string | null;
}

export function useRecordContactEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordContactEventInput) => {
       if (!user) return null;
       const { error } = await supabase.from("contact_events").insert({
         user_id: user.id,
         coach_id: input.coach_id,
         coach_name: input.coach_name,
         school: input.school || "",
         contact_type: input.contact_type || "message",
         status: input.status || "sent",
         notes: input.notes || null,
       });
       if (error) throw error;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["contact-events"] });
       queryClient.invalidateQueries({ queryKey: ["activity-stats"] });
    },
  });
}
