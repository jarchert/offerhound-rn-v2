import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/* -------------------- Sports News Feed (scrape job) -------------------- */
export function useSportsNewsFeed(limit = 30) {
  return useQuery({
    queryKey: ["sports-news-feed", limit],
    queryFn: async () => {
       const [news, portal] = await Promise.all([
         supabase
            .from("sports_news_articles")
            .select("id, title, description, source_url, source_name, image_url, published_at, sport, category,tags")
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(limit),
         supabase
            .from("transfer_portal_news")
            .select("id, title, description, source_url, source_name, sport, created_at")
            .order("created_at", { ascending: false })
            .limit(Math.floor(limit / 2)),
       ]);

       const a = (news.data || []).map((n: any) => ({
         id: `news-${n.id}`,
         title: n.title,
         description: n.description,
         url: n.source_url,
         source: n.source_name || "News",
         image: n.image_url,
         sport: n.sport,
         date: n.published_at || null,
         category: n.category || "national",
         tags: n.tags || [],
       }));
       const b = (portal.data || []).map((p: any) => ({
         id: `portal-${p.id}`,
         title: p.title,
         description: p.description,
         url: p.source_url,
         source: p.source_name || "Transfer Portal",
         image: null,
         sport: p.sport,
         date: p.created_at,
         category: "transfer-portal",
         tags: [],
       }));
       return [...a, ...b]
         .sort((x, y) => (y.date || "").localeCompare(x.date || ""))
         .slice(0, limit);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/* -------------------- Content Library -------------------- */
export function useContentLibrary(influencerId?: string) {
  return useQuery({
    queryKey: ["influencer-content-library", influencerId],
    queryFn: async () => {
       if (!influencerId) return [];
       const { data } = await supabase
         .from("influencer_content_library" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .order("created_at", { ascending: false });
       return (data || []) as any[];
    },
    enabled: !!influencerId,
  });
}

export function useAddLibraryItem() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
       influencerId: string;
       title?: string;
       description?: string;
       assetType: "image" | "video" | "link" | "text" | "document";
       assetUrl?: string;
       thumbnailUrl?: string;
       tags?: string[];
       notes?: string;
    }) => {
       if (!user) throw new Error("Not authenticated");
       const { error } = await supabase.from("influencer_content_library" as any).insert({
         influencer_id: input.influencerId,
         user_id: user.id,
         title: input.title || null,
         description: input.description || null,
         asset_type: input.assetType,
         asset_url: input.assetUrl || null,
         thumbnail_url: input.thumbnailUrl || null,
         tags: input.tags || [],
         notes: input.notes || null,
       });
       if (error) throw error;
    },
    onSuccess: (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-content-library", vars.influencerId] });
    },
  });
}

export function useUploadLibraryAsset() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { influencerId: string; file: File; title?: string }) => {
       if (!user) throw new Error("Not authenticated");
       const ext = (input.file.name.split(".").pop() || "bin").toLowerCase();
       const path = `${user.id}/library/${crypto.randomUUID()}.${ext}`;
       const { error: upErr } = await supabase.storage
         .from("influencer-media")
         .upload(path, input.file, { upsert: false });
       if (upErr) throw upErr;
       const url = supabase.storage.from("influencer-media").getPublicUrl(path).data.publicUrl;
       const assetType = input.file.type.startsWith("video") ? "video" : "image";
       const { error: rowErr } = await supabase.from("influencer_content_library" as any).insert({
         influencer_id: input.influencerId,
         user_id: user.id,
         title: input.title || input.file.name,
         asset_type: assetType,
         asset_url: url,
         thumbnail_url: assetType === "image" ? url : null,
       });
       if (rowErr) throw rowErr;
       return url;
    },
    onSuccess: (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-content-library", vars.influencerId] });
    },
  });
}

export function useDeleteLibraryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; influencerId: string }) => {
       const { error } = await supabase
         .from("influencer_content_library" as any)
         .delete()
         .eq("id", input.id);
       if (error) throw error;
    },
    onSuccess: (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-content-library", vars.influencerId] });
    },
  });
}

/* -------------------- Scheduled Posts -------------------- */
export function useScheduledPosts(influencerId?: string) {
  return useQuery({
    queryKey: ["influencer-scheduled-posts", influencerId],
    queryFn: async () => {
       if (!influencerId) return [];
       const { data } = await supabase
         .from("influencer_activities" as any)
         .select("*")
         .eq("influencer_id", influencerId)
         .in("post_status", ["scheduled", "draft"])
         .order("scheduled_for", { ascending: true, nullsFirst: false });
       return (data || []) as any[];
    },
    enabled: !!influencerId,
  });
}

export function useSchedulePost() {
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
       tags?: string[];
       scheduledFor?: string | null; // ISO; null = publish now
       syndicationTargets?: string[]; // e.g. ["webhook"]
       asDraft?: boolean;
    }) => {
       const status = input.asDraft
         ? "draft"
         : input.scheduledFor
            ? "scheduled"
            : "published";
       const { data, error } = await supabase
         .from("influencer_activities" as any)
         .insert({
            influencer_id: input.influencerId,
            title: input.title,
            description: input.description,
            media_url: input.mediaUrl || null,
            embed_url: input.embedUrl || null,
            cta_label: input.ctaLabel || null,
            cta_url: input.ctaUrl || null,
            sport_tags: input.tags || [],
            activity_type: "new_post" as any,
            moderation_status: status === "published" ? ("approved" as any) : ("pending" as any),
            visibility: "public" as any,
            post_status: status,
            scheduled_for: input.scheduledFor || null,
            published_at: status === "published" ? new Date().toISOString() : null,
            syndication_targets: input.syndicationTargets || [],
         })
         .select("id")
         .single();
       if (error) throw error;

       // If publishing now, fire syndication webhook (non-blocking).
       if (status === "published" && (input.syndicationTargets || []).includes("webhook")) {
         try {
           await supabase.functions.invoke("syndicate-influencer-content", {
             body: {
                influencerId: input.influencerId,
                contentType: "post",
                title: input.title,
                description: input.description,
                imageUrl: input.mediaUrl,
                tags: input.tags,
                url: input.ctaUrl,
             },
           });
         } catch { /* non-fatal */ }
       }
       return data;
    },
    onSuccess: (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-scheduled-posts", vars.influencerId] });
       qc.invalidateQueries({ queryKey: ["influencer-posts", vars.influencerId] });
    },
  });
}

export function useDeleteScheduledPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; influencerId: string }) => {
       const { error } = await supabase
         .from("influencer_activities" as any)
         .delete()
         .eq("id", input.id);
       if (error) throw error;
    },
    onSuccess: (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-scheduled-posts", vars.influencerId] });
    },
  });
}

/* -------------------- Parent Approval Gate -------------------- */
export function useMessageApprovalStatus(athleteUserId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["influencer-msg-approval", user?.id, athleteUserId],
    queryFn: async () => {
       if (!user || !athleteUserId) return null;
       const { data } = await supabase
         .from("influencer_message_approvals" as any)
         .select("id, status, athlete_profile_id")
         .eq("influencer_user_id", user.id)
         .eq("athlete_user_id", athleteUserId)
         .maybeSingle();
       return data as any;
    },
    enabled: !!user && !!athleteUserId,
  });
}

export function useRequestMessageApproval() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
       athleteUserId: string;
       athleteProfileId: string;
       initialMessage?: string;
    }) => {
       if (!user) throw new Error("Not authenticated");
       const { error } = await supabase
         .from("influencer_message_approvals" as any)
         .insert({
           influencer_user_id: user.id,
           athlete_user_id: input.athleteUserId,
           athlete_profile_id: input.athleteProfileId,
           initial_message: input.initialMessage || null,
         });
       if (error && (error as any).code !== "23505") throw error; // unique violation = already requested
    },
    onSuccess: (_d, vars) => {
       qc.invalidateQueries({ queryKey: ["influencer-msg-approval", user?.id, vars.athleteUserId] });
    },
  });
}

/* Parent-side: list pending requests for their linked athletes */
export function useParentInfluencerApprovals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["parent-influencer-approvals", user?.id],
    queryFn: async () => {
       if (!user) return [];
       const { data } = await supabase
         .from("influencer_message_approvals" as any)
         .select("*")
         .order("created_at", { ascending: false });
       return (data || []) as any[];
    },
    enabled: !!user,
  });
}

export function useRespondToApproval() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: "approved" | "denied"; note?: string }) => {
       const { error } = await supabase
         .from("influencer_message_approvals" as any)
         .update({
            status: input.status,
            parent_user_id: user?.id || null,
            parent_note: input.note || null,
            responded_at: new Date().toISOString(),
         })
         .eq("id", input.id);
       if (error) throw error;
    },
    onSuccess: () => {
       qc.invalidateQueries({ queryKey: ["parent-influencer-approvals"] });
    },
  });
}

/* Helper: is an athlete profile a minor? */
export function useIsAthleteMinor(athleteProfileId?: string) {
  return useQuery({
    queryKey: ["is-athlete-minor", athleteProfileId],
    queryFn: async () => {
       if (!athleteProfileId) return false;
       const { data } = await supabase.rpc("is_athlete_minor", { profile_id: athleteProfileId });
       return !!data;
    },
    enabled: !!athleteProfileId,
  });
}
