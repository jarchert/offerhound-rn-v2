import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAdminRole() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkAdmin = async () => {
       if (!user) {
         setIsAdmin(false);
         setLoading(false);
         return;
       }
       const { data } = await supabase
         .from("admin_profiles")
         .select("id")
         .eq("user_id", user.id)
         .maybeSingle();
       setIsAdmin(!!data);
       setLoading(false);
    };
    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
}
