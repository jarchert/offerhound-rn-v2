import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useHasAcceptedTerms() {
  const { user } = useAuth();
  const [hasAccepted, setHasAccepted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    const check = async () => {
       const { data } = await supabase.from("terms_acceptance" as any).select("id").eq("user_id", user.id).limit(1);
       setHasAccepted(!!(data && data.length > 0));
       setIsLoading(false);
    };
    check();
  }, [user]);

  return { hasAccepted, isLoading };
}

export function useAcceptTerms() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
       if (!user) throw new Error("Not authenticated");
       const { error } = await supabase.from("terms_acceptance" as any).insert({ user_id: user.id });
       if (error) throw error;
    },
  });
}
