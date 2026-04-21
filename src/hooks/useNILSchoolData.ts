import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const STATE_TAX_DATA: Record<string, { rate: number; hasLuxury: boolean; localRate: number; notes: string }> = {
   "Alabama": { rate: 5.0, hasLuxury: false, localRate: 0, notes: "Flat state income tax" },
   "Alaska": { rate: 0, hasLuxury: false, localRate: 0, notes: "No state income tax" },
   "Arizona": { rate: 2.5, hasLuxury: false, localRate: 0, notes: "Flat tax rate" },
   "California": { rate: 13.3, hasLuxury: true, localRate: 1.0, notes: "Highest state tax; jock tax applies" },
   "Colorado": { rate: 4.4, hasLuxury: false, localRate: 0, notes: "Flat tax rate" },
   "Connecticut": { rate: 6.99, hasLuxury: false, localRate: 0, notes: "Progressive tax" },
   "Florida": { rate: 0, hasLuxury: false, localRate: 0, notes: "No state income tax — NIL-friendly" },
   "Georgia": { rate: 5.49, hasLuxury: false, localRate: 0, notes: "Flat tax rate" },
   "Illinois": { rate: 4.95, hasLuxury: false, localRate: 0, notes: "Flat tax rate" },
   "Indiana": { rate: 3.05, hasLuxury: false, localRate: 1.0, notes: "County taxes apply" },
   "Iowa": { rate: 5.7, hasLuxury: false, localRate: 0, notes: "Flat tax effective 2025" },
   "Kansas": { rate: 5.7, hasLuxury: false, localRate: 0, notes: "Progressive tax" },
   "Kentucky": { rate: 4.0, hasLuxury: false, localRate: 0, notes: "Flat tax" },
   "Louisiana": { rate: 4.25, hasLuxury: false, localRate: 0, notes: "Progressive tax" },
   "Maryland": { rate: 5.75, hasLuxury: false, localRate: 3.2, notes: "County taxes significant" },
   "Massachusetts": { rate: 5.0, hasLuxury: true, localRate: 0, notes: "Millionaire surtax 4% on $1M+" },
   "Michigan": { rate: 4.25, hasLuxury: false, localRate: 0, notes: "Flat tax" },
   "Minnesota": { rate: 9.85, hasLuxury: false, localRate: 0, notes: "High progressive tax" },
   "Mississippi": { rate: 5.0, hasLuxury: false, localRate: 0, notes: "Flat tax" },
   "Missouri": { rate: 4.8, hasLuxury: false, localRate: 1.0, notes: "KC/STL local taxes" },
   "Nebraska": { rate: 6.64, hasLuxury: false, localRate: 0, notes: "Progressive tax" },
   "Nevada": { rate: 0, hasLuxury: false, localRate: 0, notes: "No state income tax" },
   "New Jersey": { rate: 10.75, hasLuxury: true, localRate: 0, notes: "High top rate; jock tax" },
   "New York": { rate: 10.9, hasLuxury: true, localRate: 3.88, notes: "NYC tax adds significantly" },
   "North Carolina": { rate: 4.5, hasLuxury: false, localRate: 0, notes: "Flat tax" },
   "Ohio": { rate: 3.75, hasLuxury: false, localRate: 2.5, notes: "Municipal income taxes common" },
   "Oklahoma": { rate: 4.75, hasLuxury: false, localRate: 0, notes: "Progressive tax" },
   "Oregon": { rate: 9.9, hasLuxury: false, localRate: 0, notes: "High progressive tax; no sales tax" },
   "Pennsylvania": { rate: 3.07, hasLuxury: false, localRate: 3.75, notes: "Philadelphia local tax high" },
   "South Carolina": { rate: 6.4, hasLuxury: false, localRate: 0, notes: "Progressive tax" },
   "Tennessee": { rate: 0, hasLuxury: false, localRate: 0, notes: "No state income tax — NIL-friendly" },
   "Texas": { rate: 0, hasLuxury: false, localRate: 0, notes: "No state income tax — NIL-friendly" },
   "Utah": { rate: 4.65, hasLuxury: false, localRate: 0, notes: "Flat tax" },
   "Virginia": { rate: 5.75, hasLuxury: false, localRate: 0, notes: "Progressive tax" },
   "Washington": { rate: 0, hasLuxury: false, localRate: 0, notes: "No state income tax" },
   "West Virginia": { rate: 5.12, hasLuxury: false, localRate: 0, notes: "Progressive tax" },
   "Wisconsin": { rate: 7.65, hasLuxury: false, localRate: 0, notes: "Progressive tax" },
   "Wyoming": { rate: 0, hasLuxury: false, localRate: 0, notes: "No state income tax" },
};

export function useNILSchoolData(athleteProfileId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schoolInterests, isLoading: interestsLoading } = useQuery({
     queryKey: ["nil-school-interests", athleteProfileId],
     queryFn: async () => {
        if (!athleteProfileId) return [];
        const { data, error } = await supabase
          .from("nil_school_interests")
          .select("*")
          .eq("athlete_profile_id", athleteProfileId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
     },
     enabled: !!athleteProfileId,
  });

  const { data: schoolData, isLoading: schoolDataLoading } = useQuery({
     queryKey: ["nil-school-data"],
     queryFn: async () => {
        const { data, error } = await supabase.from("nil_school_data").select("*").order("school_name");
        if (error) throw error;
        return data || [];
     },
  });

  const addSchoolInterest = useMutation({
     mutationFn: async (school: { school_name: string; city?: string; state?: string; conference?: string; division?: string; interest_level?: string }) => {
        if (!athleteProfileId) throw new Error("No athlete profile");
        const { error } = await supabase.from("nil_school_interests").insert({
          athlete_profile_id: athleteProfileId,
          ...school,
        });
        if (error) throw error;
     },
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["nil-school-interests"] });
        toast({ title: "School added to interests" });
     },
  });

  const removeSchoolInterest = useMutation({
     mutationFn: async (id: string) => {
        const { error } = await supabase.from("nil_school_interests").delete().eq("id", id);
        if (error) throw error;
     },
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["nil-school-interests"] });
        toast({ title: "School removed" });
     },
  });

  return {
     schoolInterests: schoolInterests || [],
     schoolData: schoolData || [],
     interestsLoading,
     schoolDataLoading,
     addSchoolInterest,
     removeSchoolInterest,
  };
}
