import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";

export interface TranscriptAccessRequest {
  id: string;
  transcript_id: string;
  requester_user_id: string;
  athlete_profile_id: string;
  status: "pending" | "approved" | "denied";
  reason: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
}

/**
* Athlete-side: list & respond to inbound transcript access requests.
*/
export function useTranscriptRequests() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["transcript_access_requests", profile?.id],
    enabled: !!user && !!profile?.id,
    queryFn: async () => {
       const { data, error } = await supabase
         .from("transcript_access_requests")
         .select("*")
         .eq("athlete_profile_id", profile!.id)
         .order("created_at", { ascending: false });
       if (error) throw error;
       return (data || []) as TranscriptAccessRequest[];
    },
  });

  const respond = useMutation({
    mutationFn: async (params: { requestId: string; decision: "approved" | "denied" }) => {
       const { data, error } = await supabase.functions.invoke("notify-transcript-decision", {
         body: { requestId: params.requestId, decision: params.decision },
       });
       if (error) throw error;
       if ((data as any)?.error) throw new Error((data as any).error);
       return data;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["transcript_access_requests"] });
    },
  });

  return { ...query, respond };
}
