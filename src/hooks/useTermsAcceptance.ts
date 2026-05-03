import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface TermsVersion {
  id: string;
  version: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  activated_at: string | null;
}

// Fetch the current active terms version
export function useActiveTermsVersion() {
  return useQuery({
    queryKey: ["active-terms-version"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terms_versions")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching active terms version:", error);
        // Fall back to default version
        return { version: "1.0", id: null } as unknown as Partial<TermsVersion>;
      }

      return data as TermsVersion | null;
    },
  });
}

// Admin: Fetch all terms versions
export function useTermsVersions() {
  return useQuery({
    queryKey: ["terms-versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terms_versions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching terms versions:", error);
        throw error;
      }
      return (data as unknown) as TermsVersion[];
    },
  });
}

// Admin: Create new terms version
export function useCreateTermsVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { version: string; title: string; description?: string }) => {
      const { data, error } = await supabase
        .from("terms_versions" as any)
        .insert({
          version: params.version,
          title: params.title,
          description: params.description || null,
          is_active: false,
        })
        .select()
        .single();
      if (error) {
        console.error("Error creating terms version:", error);
        throw error;
      }
      return (data as unknown) as TermsVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terms-versions"] });
    },
  });
}

// Admin: Activate a terms version
export function useActivateTermsVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data, error } = await (supabase.rpc as any)("activate_terms_version", {
        version_id: versionId,
      });
      if (error) {
        console.error("Error activating terms version:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terms-versions"] });
      queryClient.invalidateQueries({ queryKey: ["active-terms-version"] });
      queryClient.invalidateQueries({ queryKey: ["terms-acceptance"] });
    },
  });
}

// Admin: Delete a terms version
export function useDeleteTermsVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase
        .from("terms_versions" as any)
        .delete()
        .eq("id", versionId);
      if (error) {
        console.error("Error deleting terms version:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terms-versions"] });
    },
  });
}

// Build 46 fix #27: refactored to react-query so useAcceptTerms can invalidate
// and the gate flips to `hasAccepted=true` immediately after mutation, instead
// of leaving the user stranded on the gate screen until a full app restart.
export function useHasAcceptedTerms() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["terms-acceptance", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("terms_acceptance" as any)
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      return !!(data && data.length > 0);
    },
  });
  // If no user, treat as accepted=true so the gate doesn't block pre-auth flows
  return {
    hasAccepted: user ? (query.data ?? false) : true,
    isLoading: !!user && query.isLoading,
  };
}

export function useAcceptTerms() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
       if (!user) throw new Error("Not authenticated");
       const { error } = await supabase.from("terms_acceptance" as any).insert({ user_id: user.id });
       if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate so the gate re-checks and lets the user through to their dashboard.
      queryClient.invalidateQueries({ queryKey: ["terms-acceptance", user?.id ?? null] });
      // Also seed the cache to true so navigation is instant (no flash of the gate).
      queryClient.setQueryData(["terms-acceptance", user?.id ?? null], true);
    },
  });
}

// Ported verbatim from Lovable (offerhound-repo/src/hooks/useTermsAcceptance.ts)
export function getCurrentTermsVersion() {
  // This is now deprecated - use useActiveTermsVersion hook instead
  return "1.0";
}
