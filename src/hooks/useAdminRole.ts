import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { nativeAdminAccess, type NativeAdminCheck } from '@/lib/nativeAdminAccess';

export function useAdminRole() {
  const [check, setCheck] = useState<NativeAdminCheck>(null);
  const { user, isLoading: restoringSession } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    let active = true;
    if (restoringSession || !userId) {
      setCheck(null);
    } else {
      const verify = async () => {
        try {
          // Use the database authorization decision, not an editable profile.
          const { data, error } = await supabase.rpc('is_admin');
          if (active) setCheck({ userId, allowed: !error && data === true });
        } catch {
          if (active) setCheck({ userId, allowed: false });
        }
      };
      void verify();
    }
    return () => { active = false; };
  }, [restoringSession, userId]);

  const decision = nativeAdminAccess(restoringSession, userId, check);
  return { isAdmin: decision === 'allowed', loading: decision === 'loading' };
}
