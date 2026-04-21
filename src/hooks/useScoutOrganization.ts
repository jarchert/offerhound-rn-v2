import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useScoutOrganization() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scout-organization", user?.id],
    queryFn: async () => {
       if (!user) return { organization: null, isOwner: false, isMember: false, memberRole: null };

       // Check if owner
       const { data: ownedOrg, error: ownedErr } = await supabase
         .from("scout_organizations" as any)
         .select("*")
         .eq("owner_user_id", user.id)
         .maybeSingle();
       if (!ownedErr && ownedOrg) {
         return { organization: ownedOrg, isOwner: true, isMember: true, memberRole: "owner" };
       }

       // Check if member of an agency via organization_members
       const { data: membership, error: memErr } = await supabase
         .from("organization_members")
         .select("*, organization:organization_id(id, name, logo_url, description, contact_email, contact_phone, website_url, owner_user_id)")
         .eq("user_id", user.id)
         .eq("invitation_accepted", true)
         .maybeSingle();
       if (!memErr && membership && (membership as any).organization) {
         return {
            organization: (membership as any).organization,
            isOwner: false,
            isMember: true,
            memberRole: (membership as any).role,
         };
       }

       return { organization: null, isOwner: false, isMember: false, memberRole: null };
    },
    enabled: !!user,
  });
}

export function useCreateScoutOrganization() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orgData: any) => {
       if (!user) throw new Error("Not authenticated");
       const { data, error } = await supabase
         .from("scout_organizations" as any)
         .insert({ ...orgData, owner_user_id: user.id })
         .select()
         .single();
       if (error) throw error;
       return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scout-organization"] }),
  });
}
