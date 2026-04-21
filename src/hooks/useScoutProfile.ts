import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useScoutProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scout-profile", user?.id],
    queryFn: async () => {
       if (!user) return null;
       const { data, error } = await supabase
         .from("scout_profiles" as any)
         .select("*")
         .eq("user_id", user.id)
         .maybeSingle();
       if (error) return null;
       return data;
    },
    enabled: !!user,
  });
}

export function useCreateScoutProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileData: any) => {
       if (!user) throw new Error("Not authenticated");
       const { data, error } = await supabase
         .from("scout_profiles" as any)
         .insert({ ...profileData, user_id: user.id })
         .select()
         .single();
       if (error) throw error;
       return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scout-profile"] }),
  });
}

export function useUpdateScoutProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: any) => {
       if (!user) throw new Error("Not authenticated");
       const { data, error } = await supabase
         .from("scout_profiles" as any)
         .update(updates)
         .eq("user_id", user.id)
         .select()
         .single();
       if (error) throw error;
       return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scout-profile"] }),
  });
}
