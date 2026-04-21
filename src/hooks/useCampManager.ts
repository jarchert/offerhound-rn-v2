import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Camp {
  id: string;
  coach_user_id: string;
  name: string;
  description: string | null;
  camp_type: string;
  sport: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  positions: string[];
  drill_stations: any[];
  capacity: number | null;
  is_free: boolean;
  price_cents: number;
  premium_price_cents: number | null;
  registration_url: string | null;
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampManagerSubscription {
  id: string;
  coach_user_id: string;
  plan_type: string;
  status: string;
  events_used: number;
  events_limit: number | null;
  starts_at: string;
  expires_at: string | null;
}

export function useCampManagerSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["camp-manager-subscription", user?.id],
    queryFn: async () => {
       if (!user) return null;
       const { data, error } = await supabase
         .from("camp_manager_subscriptions")
         .select("*")
         .eq("coach_user_id", user.id)
         .eq("status", "active")
         .maybeSingle();
       if (error) throw error;
       return data as CampManagerSubscription | null;
    },
    enabled: !!user,
  });
}

export function useCamps() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["camps", user?.id],
    queryFn: async () => {
       if (!user) return [];
       const { data, error } = await supabase
         .from("camps")
         .select("*")
         .eq("coach_user_id", user.id)
         .order("start_date", { ascending: false });
       if (error) throw error;
       return (data || []) as Camp[];
    },
    enabled: !!user,
  });
}

export function useCreateCamp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campData: Partial<Camp>) => {
       if (!user) throw new Error("Not authenticated");
       const { data, error } = await supabase
         .from("camps")
         .insert({ ...campData, coach_user_id: user.id } as any)
         .select()
         .single();
       if (error) throw error;
       return data;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["camps"] });
    },
  });
}

export function useUpdateCamp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Camp>) => {
       const { data, error } = await supabase
         .from("camps")
         .update(updates as any)
         .eq("id", id)
         .select()
         .single();
       if (error) throw error;
       return data;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["camps"] });
    },
  });
}

export function useDeleteCamp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campId: string) => {
       const { error } = await supabase
         .from("camps")
         .delete()
         .eq("id", campId);
       if (error) throw error;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["camps"] });
    },
  });
}

export function useCampStaff(campId: string | null) {
  return useQuery({
    queryKey: ["camp-staff", campId],
    queryFn: async () => {
       if (!campId) return [];
       const { data, error } = await supabase
         .from("camp_staff")
         .select("*")
         .eq("camp_id", campId);
       if (error) throw error;
       return data || [];
    },
    enabled: !!campId,
  });
}

export function useAddCampStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staffData: { camp_id: string; name: string; email?: string; role: string }) => {
       const { data, error } = await supabase
         .from("camp_staff")
         .insert(staffData as any)
         .select()
         .single();
       if (error) throw error;
       return data;
    },
    onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ["camp-staff", variables.camp_id] });
    },
  });
}
