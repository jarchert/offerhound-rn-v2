// Verbatim port from Lovable web (offerhound-repo/src/hooks/useTestimonials.ts).
// Only change: '@/hooks/use-toast' import already resolves to the RN-compat shim,
// and '@/integrations/supabase/client' resolves to the RN supabase client.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Testimonial {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  rating: number;
  testimonial_text: string;
  is_featured: boolean;
  is_approved: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateTestimonialInput {
  user_email: string;
  user_name: string;
  user_role: string;
  rating: number;
  testimonial_text: string;
}

export function useTestimonials() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's own testimonials
  const { data: myTestimonials, isLoading: loadingMine } = useQuery({
    queryKey: ["my-testimonials"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Testimonial[];
    },
  });

  // Create testimonial
  const createTestimonial = useMutation({
    mutationFn: async (input: CreateTestimonialInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from("testimonials")
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-testimonials"] });
      toast({
        title: "Thank you!",
        description: "Your testimonial has been submitted for review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    myTestimonials,
    loadingMine,
    createTestimonial,
  };
}

export function useAdminTestimonials() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all testimonials (admin only)
  const { data: allTestimonials, isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Testimonial[];
    },
  });

  // Update testimonial
  const updateTestimonial = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Testimonial> }) => {
      const { data, error } = await supabase
        .from("testimonials")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({
        title: "Updated",
        description: "Testimonial updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete testimonial
  const deleteTestimonial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("testimonials")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({
        title: "Deleted",
        description: "Testimonial deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    allTestimonials,
    isLoading,
    updateTestimonial,
    deleteTestimonial,
  };
}
