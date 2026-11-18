import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {cleanupCreatorGalleryFiles,creatorGalleryPaths} from "@/lib/creatorGallery";
import * as Crypto from "expo-crypto";
import { useAuth } from "@/hooks/useAuth";

export function useInfluencerPosts(influencerId?: string) {
  return useQuery({
    queryKey: ["influencer-posts", influencerId],
    queryFn: async () => {
       if (!influencerId) return [];
       const { data, error } = await supabase
         .from("influencer_activities" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .eq("post_status","published").eq("moderation_status","approved").eq("visibility","public")
         .order("created_at", { ascending: false })
         .limit(50);
       if (error) throw error;
       return (data || []) as any[];
    },
    enabled: !!influencerId,
  });
}

export function useInfluencerBlogPosts(influencerId?: string, opts?: { includeDrafts?: boolean }) {
  return useQuery({
    queryKey: ["influencer-blog-posts", influencerId, opts?.includeDrafts],
    queryFn: async () => {
       if (!influencerId) return [];
       let q = supabase
         .from("influencer_blog_posts" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .order("published_at", { ascending: false, nullsFirst: false })
         .order("created_at", { ascending: false });
       if (!opts?.includeDrafts) q = q.eq("status", "published");
       const { data, error } = await q.limit(50);
       if (error) throw error;
       return (data || []) as any[];
    },
    enabled: !!influencerId,
  });
}

export function useInfluencerLinkedPodcasts(influencerId?: string) {
  return useQuery({
    queryKey: ["influencer-linked-podcasts", influencerId],
    queryFn: async () => {
       if (!influencerId) return [];
       const { data, error } = await supabase
         .from("influencer_linked_podcasts" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .order("is_featured", { ascending: false })
         .order("display_order", { ascending: true })
         .order("created_at", { ascending: false });
       if (error) throw error;
       return (data || []) as any[];
    },
    enabled: !!influencerId,
  });
}

export function useInfluencerGallery(influencerId?: string) {
  return useQuery({
    queryKey: ["influencer-gallery", influencerId],
    queryFn: async () => {
       if (!influencerId) return [];
       const { data, error } = await supabase
         .from("influencer_gallery" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .order("is_featured", { ascending: false })
         .order("display_order", { ascending: true })
         .order("created_at", { ascending: false });
       if (error) throw error;
       return (data || []) as any[];
    },
    enabled: !!influencerId,
  });
}

export function useInfluencerSocialLinks(influencerId?: string) {
  return useQuery({
    queryKey: ["influencer-social-links", influencerId],
    queryFn: async () => {
       if (!influencerId) return [];
       const { data, error } = await supabase
         .from("influencer_social_links" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .eq("is_public", true);
       if (error) throw error;
       return (data || []) as any[];
    },
    enabled: !!influencerId,
  });
}

export function useFollowerCount(influencerId?: string) {
  return useQuery({
    queryKey: ["influencer-follower-count", influencerId],
    queryFn: async () => {
       if (!influencerId) return 0;
       const { count, error } = await supabase
         .from("influencer_follows" as any)
         .select("id", { count: "exact", head: true })
         .eq("influencer_id", influencerId)
         .eq("is_following", true);
       if (error) throw error;
       if (typeof count !== 'number') throw new Error('Follower count was not confirmed');
       return count;
    },
    enabled: !!influencerId,
  });
}

// ---------- Mutations (creator dashboard) ----------

export function useCreateLinkedPodcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
       influencerId: string;
       title: string;
       description?: string;
       coverImageUrl?: string;
       externalUrl?: string;
       platform?: string;
       role?: string;
    }) => {
       const { error } = await supabase.from("influencer_linked_podcasts" as any).insert({
         influencer_id: input.influencerId,
         title: input.title,
         description: input.description || null,
         cover_image_url: input.coverImageUrl || null,
         external_url: input.externalUrl || null,
         platform: input.platform || "other",
         role: input.role || "host",
       });
       if (error) throw error;
    },
    onSuccess: (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-linked-podcasts", vars.influencerId] });
    },
  });
}

export function useUploadInfluencerMedia() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { influencerId: string; file: File; title?: string }) => {
       if (!user) throw new Error("Not authenticated");
       const types:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
       const ext=types[input.file.type];if(!ext)throw new Error('Choose a supported image or video.');
       const path = `${user.id}/gallery/${Crypto.randomUUID()}.${ext}`;

       if (!input.file.type.startsWith('image/') && !input.file.type.startsWith('video/')) throw new Error('Choose an image or video.');
       const file=input.file as File & {uri?:string};
       const bytes=file.uri ? await (await fetch(file.uri)).arrayBuffer() : await file.arrayBuffer();
       const max=input.file.type.startsWith('image/')?10:50;
       if (!bytes.byteLength || bytes.byteLength>max*1024*1024) throw new Error(`Choose a nonempty file under ${max}MB.`);
       // Native storage transport requires the selected file bytes.

       const { error: upErr } = await supabase.storage
         .from("influencer-media")
         .upload(path, bytes, { upsert: false, contentType: input.file.type });
       if (upErr) throw upErr;

       const fileType = input.file.type.startsWith("video") ? "video" : "image";
       const originalPub = supabase.storage.from("influencer-media").getPublicUrl(path).data.publicUrl;

       // 2. For images, ask the edge function to bake in the watermark.
       let displayUrl = originalPub;
       let isWatermarked = false;
       if (fileType === "image") {
         try {
           const { data, error: wmErr } = await supabase.functions.invoke(
              "watermark-influencer-media",
              { body: { path } },
           );
           const expected=supabase.storage.from('influencer-media').getPublicUrl(path.replace(/\.[^.]+$/,'_wm.png')).data.publicUrl;
           if (!wmErr && data?.success===true && data.watermarked_url===expected) {
              displayUrl=expected;isWatermarked=true;
           }
         } catch {
           // Keep the original and its unwatermarked status when processing is unconfirmed.
         }
       }

       // 3. Persist the gallery row.
       try {
       const { data: stored, error: rowErr } = await supabase.from("influencer_gallery" as any).insert({
         influencer_id: input.influencerId,
         user_id: user.id,
         file_url: displayUrl,
         file_type: fileType,
         title: input.title || null,
         original_path: path,
         is_watermarked: isWatermarked,
       }).select('id').single();
       if (rowErr || typeof (stored as any)?.id !== 'string' || !(stored as any).id) throw new Error('Gallery record was not confirmed.');
       } catch {
         const cleanup=await cleanupCreatorGalleryFiles(supabase,user.id,creatorGalleryPaths(user.id,path,fileType==='image'));
         throw new Error(cleanup.referenced?'Gallery save acknowledgment was not confirmed. Reload the gallery before retrying.':cleanup.cleanupPending?'Gallery save was not confirmed; file cleanup is pending. Reload before retrying.':'Gallery save was not confirmed. The unreferenced upload was discarded.');
       }
       return displayUrl;
    },
    onSuccess: (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-gallery", vars.influencerId] });
    },
  });
}
