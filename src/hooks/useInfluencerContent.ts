import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useInfluencerPosts(influencerId?: string) {
  return useQuery({
    queryKey: ["influencer-posts", influencerId],
    queryFn: async () => {
       if (!influencerId) return [];
       const { data } = await supabase
         .from("influencer_activities" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .order("created_at", { ascending: false })
         .limit(50);
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
       const { data } = await q.limit(50);
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
       const { data } = await supabase
         .from("influencer_linked_podcasts" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .order("is_featured", { ascending: false })
         .order("display_order", { ascending: true })
         .order("created_at", { ascending: false });
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
       const { data } = await supabase
         .from("influencer_gallery" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .order("is_featured", { ascending: false })
         .order("display_order", { ascending: true })
         .order("created_at", { ascending: false });
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
       const { data } = await supabase
         .from("influencer_social_links" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .eq("is_public", true);
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
       const { count } = await supabase
         .from("influencer_follows" as any)
         .select("id", { count: "exact", head: true })
         .eq("influencer_id", influencerId)
         .eq("is_following", true);
       return count || 0;
    },
    enabled: !!influencerId,
  });
}

// ---------- Mutations (creator dashboard) ----------

export function useCreateInfluencerPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
       influencerId: string;
       title: string;
       description: string;
       mediaUrl?: string;
       embedUrl?: string;
       ctaLabel?: string;
       ctaUrl?: string;
       sportTags?: string[];
       activityType?: string;
    }) => {
       const { error } = await supabase.from("influencer_activities" as any).insert({
         influencer_id: input.influencerId,
         title: input.title,
         description: input.description,
         media_url: input.mediaUrl || null,
         embed_url: input.embedUrl || null,
         cta_label: input.ctaLabel || null,
         cta_url: input.ctaUrl || null,
         sport_tags: input.sportTags || [],
         activity_type: (input.activityType || "new_post") as any,
         moderation_status: "approved" as any,
         visibility: "public" as any,
       });
       if (error) throw error;
    },
    onSuccess: async (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-posts", vars.influencerId] });
       // Fire-and-forget syndication
       try {
         await supabase.functions.invoke("syndicate-influencer-content", {
           body: {
              influencerId: vars.influencerId,
              contentType: "post",
              title: vars.title,
              description: vars.description,
              imageUrl: vars.mediaUrl,
              tags: vars.sportTags,
              url: vars.ctaUrl,
           },
         });
       } catch { /* non-fatal */ }
    },
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
       influencerId: string;
       title: string;
       excerpt?: string;
       bodyMarkdown: string;
       heroImageUrl?: string;
       tags?: string[];
       sportTags?: string[];
       status: "draft" | "published";
       visibility?: "public" | "logged_in_only" | "followers_only";
    }) => {
       const { error } = await supabase.from("influencer_blog_posts" as any).insert({
         influencer_id: input.influencerId,
         title: input.title,
         slug: "", // server trigger generates
         excerpt: input.excerpt || null,
         body_markdown: input.bodyMarkdown,
         hero_image_url: input.heroImageUrl || null,
         tags: input.tags || [],
         sport_tags: input.sportTags || [],
         status: input.status,
         visibility: input.visibility || "public",
       });
       if (error) throw error;
    },
    onSuccess: async (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-blog-posts", vars.influencerId] });
       if (vars.status === "published") {
         try {
           await supabase.functions.invoke("syndicate-influencer-content", {
             body: {
                influencerId: vars.influencerId,
                contentType: "blog",
                title: vars.title,
                description: vars.excerpt,
                imageUrl: vars.heroImageUrl,
                tags: [...(vars.tags || []), ...(vars.sportTags || [])],
             },
           });
         } catch { /* non-fatal */ }
       }
    },
  });
}

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
       const ext = (input.file.name.split(".").pop() || "bin").toLowerCase();
       const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

       // 1. Upload the original.
       const { error: upErr } = await supabase.storage
         .from("influencer-media")
         .upload(path, input.file, { upsert: false });
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
           if (!wmErr && (data as any)?.success && (data as any)?.watermarked_url) {
              displayUrl = (data as any).watermarked_url as string;
              isWatermarked = true;
           }
         } catch {
           // Non-fatal — fall back to the CSS overlay on the raw file.
         }
       }

       // 3. Persist the gallery row.
       const { error: rowErr } = await supabase.from("influencer_gallery" as any).insert({
         influencer_id: input.influencerId,
         user_id: user.id,
         file_url: displayUrl,
         file_type: fileType,
         title: input.title || null,
         original_path: path,
         is_watermarked: isWatermarked,
       });
       if (rowErr) throw rowErr;
       return displayUrl;
    },
    onSuccess: (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-gallery", vars.influencerId] });
    },
  });
}
