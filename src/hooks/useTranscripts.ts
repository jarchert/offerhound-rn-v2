import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";

export interface AcademicTranscript {
  id: string;
  athlete_profile_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  semester: string | null;
  year: string | null;
  gpa: string | null;
  is_official: boolean;
  notes: string | null;
  access_mode: string;
  created_at: string;
  updated_at: string;
}

export function useTranscripts() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic_transcripts", user?.id],
    enabled: !!user,
    queryFn: async () => {
       const { data, error } = await supabase
         .from("academic_transcripts")
         .select("*")
         .eq("user_id", user!.id)
         .order("created_at", { ascending: false });
       if (error) throw error;
       return (data || []) as AcademicTranscript[];
    },
  });

  const upload = useMutation({
    mutationFn: async (params: {
       file: File;
       semester?: string;
       year?: string;
       gpa?: string;
       isOfficial?: boolean;
       notes?: string;
    }) => {
       if (!user || !profile?.id) throw new Error("Profile not ready");
       if (params.file.size > 10 * 1024 * 1024) throw new Error("File must be 10MB or less");
       if (params.file.type !== "application/pdf") throw new Error("Only PDF files are supported");

       const ts = Date.now();
        const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${ts}_${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("transcripts")
          .upload(path, params.file, { contentType: "application/pdf", upsert: false });
        if (uploadErr) throw uploadErr;

        const { data, error } = await supabase
          .from("academic_transcripts")
          .insert({
             user_id: user.id,
             athlete_profile_id: profile.id,
             file_name: params.file.name,
             file_path: path,
             file_size_bytes: params.file.size,
             semester: params.semester || null,
             year: params.year || null,
             gpa: params.gpa || null,
             is_official: params.isOfficial ?? false,
             notes: params.notes || null,
          })
          .select()
          .single();
        if (error) throw error;
        return data as AcademicTranscript;
     },
     onSuccess: () => queryClient.invalidateQueries({ queryKey: ["academic_transcripts"] }),
  });

  const remove = useMutation({
     mutationFn: async (transcript: AcademicTranscript) => {
        await supabase.storage.from("transcripts").remove([transcript.file_path]);
        const { error } = await supabase.from("academic_transcripts").delete().eq("id", transcript.id);
        if (error) throw error;
     },
     onSuccess: () => queryClient.invalidateQueries({ queryKey: ["academic_transcripts"] }),
  });

  const getDownloadUrl = async (transcript: AcademicTranscript): Promise<string | null> => {
     const { data, error } = await supabase.storage
        .from("transcripts")
        .createSignedUrl(transcript.file_path, 60 * 60); // 1 hour preview for owner
     if (error) return null;
     return data?.signedUrl || null;
  };

  return { ...query, upload, remove, getDownloadUrl };
}
