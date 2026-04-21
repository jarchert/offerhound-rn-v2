import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
* Recruiter-side: ask an athlete for transcript access.
*/
export function useRequestTranscript() {
  return useMutation({
    mutationFn: async (params: { athleteProfileId: string; reason?: string }) => {
       const { data, error } = await supabase.functions.invoke("request-transcript", {
         body: { athleteProfileId: params.athleteProfileId, reason: params.reason },
       });
       if (error) throw error;
       if ((data as any)?.error) throw new Error((data as any).error);
       return data as { requestId: string; status: string };
    },
  });
}
