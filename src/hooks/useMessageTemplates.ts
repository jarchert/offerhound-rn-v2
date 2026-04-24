import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface MessageTemplate {
  id: string;
  coach_user_id: string;
  name: string;
  subject: string | null;
  content: string;
  template_type: "general" | "initial_outreach" | "camp_invite" | "follow_up" | "offer" | "visit_invite";
  variables: string[];
  is_active: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface BulkMessageJob {
  id: string;
  coach_user_id: string;
  template_id: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: "pending" | "processing" | "completed" | "failed";
  include_parents: boolean;
  created_at: string;
  completed_at: string | null;
}

export function useMessageTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["message-templates", user?.id],
    queryFn: async () => {
      if (!user) return [] as MessageTemplate[];

      const { data, error } = await (supabase as any)
        .from("message_templates")
        .select("*")
        .eq("coach_user_id", user.id)
        .eq("is_active", true)
        .order("use_count", { ascending: false });

      if (error) throw error;
      return (data || []) as MessageTemplate[];
    },
    enabled: !!user,
  });
}

export function useCreateMessageTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      name,
      subject,
      content,
      templateType,
      variables,
    }: {
      name: string;
      subject?: string;
      content: string;
      templateType?: MessageTemplate["template_type"];
      variables?: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("message_templates")
        .insert({
          coach_user_id: user.id,
          name,
          subject: subject || null,
          content,
          template_type: templateType || "general",
          variables: variables || ["{{athlete_name}}", "{{position}}", "{{school}}"],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast({
        title: "Template Created",
        description: "Your message template has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMessageTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      subject,
      content,
      templateType,
    }: {
      id: string;
      name?: string;
      subject?: string;
      content?: string;
      templateType?: MessageTemplate["template_type"];
    }) => {
      const updateData: Partial<MessageTemplate> = {};
      if (name !== undefined) updateData.name = name;
      if (subject !== undefined) updateData.subject = subject;
      if (content !== undefined) updateData.content = content;
      if (templateType !== undefined) updateData.template_type = templateType;

      const { data, error } = await (supabase as any)
        .from("message_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast({
        title: "Updated",
        description: "Template updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteMessageTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("message_templates")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast({
        title: "Deleted",
        description: "Template deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });
}

export function useBulkMessageJobs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bulk-message-jobs", user?.id],
    queryFn: async () => {
      if (!user) return [] as BulkMessageJob[];

      const { data, error } = await (supabase as any)
        .from("bulk_message_jobs")
        .select("*")
        .eq("coach_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as BulkMessageJob[];
    },
    enabled: !!user,
  });
}

export function useCreateBulkMessageJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      templateId,
      athleteIds,
      includeParents,
    }: {
      templateId: string;
      athleteIds: string[];
      includeParents?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Create the job
      const { data: job, error: jobError } = await (supabase as any)
        .from("bulk_message_jobs")
        .insert({
          coach_user_id: user.id,
          template_id: templateId,
          recipient_count: athleteIds.length,
          include_parents: includeParents || false,
          status: "pending",
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Create recipients
      const recipients = athleteIds.map((athleteId: string) => ({
        job_id: job.id,
        athlete_profile_id: athleteId,
        status: "pending" as const,
      }));

      const { error: recipientError } = await (supabase as any)
        .from("bulk_message_recipients")
        .insert(recipients);

      if (recipientError) throw recipientError;

      // Update template use count
      await (supabase as any)
        .from("message_templates")
        .update({ use_count: (supabase as any).rpc as any })
        .eq("id", templateId);

      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulk-message-jobs"] });
      toast({
        title: "Bulk Message Created",
        description: "Your bulk message job has been queued.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bulk message",
        variant: "destructive",
      });
    },
  });
}

export function applyTemplateVariables(
  template: string,
  athlete: {
    full_name?: string;
    position?: string;
    school?: string;
    city?: string;
    state?: string;
    graduation_year?: string;
  },
  coach?: {
    name?: string;
    title?: string;
    school?: string;
  }
): string {
  return template
    .replace(/\{\{athlete_name\}\}/g, athlete.full_name || "Athlete")
    .replace(/\{\{position\}\}/g, athlete.position || "your position")
    .replace(/\{\{school\}\}/g, athlete.school || "your school")
    .replace(/\{\{city\}\}/g, athlete.city || "your city")
    .replace(/\{\{state\}\}/g, athlete.state || "your state")
    .replace(/\{\{graduation_year\}\}/g, athlete.graduation_year || "your class")
    .replace(/\{\{coach_name\}\}/g, coach?.name || "Coach")
    .replace(/\{\{coach_title\}\}/g, coach?.title || "Coach")
    .replace(/\{\{coach_school\}\}/g, coach?.school || "our program");
}
