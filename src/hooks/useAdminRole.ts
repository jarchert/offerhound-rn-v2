import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Matches AuthContext's isAdmin logic exactly:
//   isAdmin = row in admin_profiles  OR  role in ('admin','moderator') in user_roles
// This keeps RN's client-side admin check consistent with:
//   - AuthContext (which checks both tables before routing to AdminTabs)
//   - The DB's is_admin() function (which reads from user_roles)
// A user granted admin via either table passes both checks.
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

      const [adminProfileRes, userRolesRes] = await Promise.all([
        supabase
          .from("admin_profiles" as any)
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "moderator"]),
      ]);

      const hasAdminProfile = !!(adminProfileRes.data as any);
      const hasAdminRole =
        Array.isArray(userRolesRes.data) && userRolesRes.data.length > 0;

      setIsAdmin(hasAdminProfile || hasAdminRole);
      setLoading(false);
    };

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
}
