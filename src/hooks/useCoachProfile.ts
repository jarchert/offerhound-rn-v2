import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useCoachProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["coach-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
         .from("coach_profiles")
         .select("*")
         .eq("user_id", user.id)
         .maybeSingle();
       if (error) throw error;
       return data;
    },
    enabled: !!user,
  });
}

export function useCreateCoachProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData: {
       name: string;
       title: string;
       school: string;
       conference: string;
       division: string;
       position_coached: string;
       sport: string;
       email: string;
       phone: string | null;
       twitter: string | null;
       bio: string | null;
    }) => {
       if (!user) throw new Error("Not authenticated");
       const { data, error } = await supabase
         .from("coach_profiles")
         .insert({ ...profileData, user_id: user.id })
         .select()
         .single();
       if (error) throw error;
       return data;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["coach-profile"] });
    },
  });
}
