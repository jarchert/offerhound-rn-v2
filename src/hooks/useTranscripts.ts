import * as Crypto from 'expo-crypto';
import {uploadTranscriptFile} from '@/lib/transcriptUpload';
import { removeDocument } from '@/lib/removeDocument';
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
       if (!user || !profile?.id) throw new Error('Profile not ready');
       return await uploadTranscriptFile(supabase,{userId:user.id,athleteProfileId:profile.id,uploadId:Crypto.randomUUID(),...params}) as AcademicTranscript;
     },
     onSuccess: () => queryClient.invalidateQueries({ queryKey: ["academic_transcripts"] }),
  });

  const remove = useMutation({
     mutationFn: async (transcript: AcademicTranscript) => {
        if (!user || transcript.user_id !== user.id) throw Error('Sign in as the document owner.');
        const result=await removeDocument(supabase,{table:'academic_transcripts',bucket:'transcripts',id:transcript.id,path:transcript.file_path,scope:{user_id:user.id}});
        if(result.cleanupPending)throw Error('Transcript removed from your list; private file cleanup could not be confirmed.');
     },
     onSettled: () => queryClient.invalidateQueries({ queryKey: ["academic_transcripts"] }),
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
