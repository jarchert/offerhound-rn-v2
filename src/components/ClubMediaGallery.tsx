// Ported from Lovable: offerhound-repo/src/components/ClubMediaGallery.tsx
// RN-adapted verbatim. Web <img> → RN <Image>, external links → Linking.
// File uploads use expo-image-picker (images only); YouTube/video remain URL-only.
import { useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, Image as RNImage, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Image as ImageIcon, Video, Plus, Trash2, Star, Search, Loader2, ExternalLink,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, typography, spacing, radius } from "@/lib/theme";

type PickedAsset = { uri: string; name: string; mimeType: string };

export function ClubMediaGallery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [teamId, setTeamId] = useState("");
  const [eventName, setEventName] = useState("");
  const [tags, setTags] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PickedAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: teams = [] } = useQuery({
    queryKey: ["club-media-teams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("teams").select("id, name").eq("coach_user_id", user.id).neq("status", "archived");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: mediaItems = [], isLoading } = useQuery({
    queryKey: ["club-media-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("club_media")
        .select("*, teams(name)")
        .eq("coach_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      let finalUrl = url;

      // Upload file if selected (RN: fetch local URI → blob → supabase storage)
      if (selectedFile) {
        setUploading(true);
        const ext = (selectedFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `club-media/${user.id}/${Date.now()}.${ext}`;
        const resp = await fetch(selectedFile.uri);
        const blob = await resp.blob();
        const { error: uploadError } = await supabase.storage
          .from("club-media")
          .upload(path, blob, { contentType: selectedFile.mimeType });
        if (uploadError) {
          throw new Error("File upload failed. Please provide a URL instead.");
        }
        const { data: publicData } = supabase.storage.from("club-media").getPublicUrl(path);
        finalUrl = publicData.publicUrl;
      }

      if (!finalUrl.trim()) throw new Error("URL or file is required");

      const tagArr = tags.split(",").map(t => t.trim()).filter(Boolean);
      const { error } = await supabase.from("club_media").insert({
        coach_user_id: user.id,
        url: finalUrl,
        media_type: mediaType,
        caption: caption || null,
        team_id: teamId || null,
        event_name: eventName || null,
        tags: tagArr.length > 0 ? tagArr : null,
        is_featured: isFeatured,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-media-items"] });
      queryClient.invalidateQueries({ queryKey: ["club-media-count"] });
      setShowAddDialog(false);
      resetForm();
      toast({ title: "Media Added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("club_media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-media-items"] });
      queryClient.invalidateQueries({ queryKey: ["club-media-count"] });
      toast({ title: "Media Deleted" });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("club_media").update({ is_featured: featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["club-media-items"] }),
  });

  const resetForm = () => {
    setUrl(""); setCaption(""); setMediaType("image"); setTeamId(""); setEventName(""); setTags(""); setIsFeatured(false); setSelectedFile(null);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast({ title: "Permission required", description: "Please grant photo library access.", variant: "destructive" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const uriName = asset.fileName || asset.uri.split("/").pop() || `upload-${Date.now()}.jpg`;
    const ext = (uriName.split(".").pop() || "jpg").toLowerCase();
    const mimeType = asset.mimeType || (ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg");
    setSelectedFile({ uri: asset.uri, name: uriName, mimeType });
  };

  const filtered = mediaItems.filter((m: any) => {
    const matchTeam = filterTeam === "all" || m.team_id === filterTeam;
    const matchType = filterType === "all" || m.media_type === filterType;
    const matchSearch = !searchQuery ||
      (m.caption || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.event_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.tags || []).some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchTeam && matchType && matchSearch;
  });

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <ImageIcon size={20} color={colors.foreground} />
            <Text style={s.title}>Media Gallery</Text>
          </View>
          <Text style={s.subtitle}>Photos, videos, and embedded content organized by team and event</Text>
        </View>
        <Button onPress={() => { resetForm(); setShowAddDialog(true); }}>
          <Plus size={16} color={colors.primaryForeground} />
          <Text style={s.btnPrimaryText}>Add Media</Text>
        </Button>
      </View>

      {/* Filters */}
      <View style={s.filters}>
        <View style={s.searchWrap}>
          <Search size={16} color={colors.mutedForeground} style={s.searchIcon} />
          <Input
            placeholder="Search by caption, event, tag..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={s.searchInput}
          />
        </View>
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger style={{ width: 160 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger style={{ width: 140 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
      </View>

      {/* Gallery Grid */}
      {isLoading ? (
        <View style={s.centerPad}><ActivityIndicator size="large" color={colors.mutedForeground} /></View>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent style={s.emptyCard}>
            <ImageIcon size={48} color={colors.mutedForeground} style={{ marginBottom: spacing.md }} />
            <Text style={s.emptyTitle}>No media yet</Text>
            <Text style={s.emptySubtitle}>Upload photos and videos to showcase your teams</Text>
          </CardContent>
        </Card>
      ) : (
        <View style={s.grid}>
          {filtered.map((item: any) => (
            <Card key={item.id} style={s.gridCard}>
              <View style={s.mediaBox}>
                {item.media_type === "video" || item.media_type === "youtube" ? (
                  <Pressable onPress={() => Linking.openURL(item.url)} style={s.videoPlaceholder}>
                    <Video size={32} color={colors.mutedForeground} />
                  </Pressable>
                ) : (
                  <RNImage source={{ uri: item.url }} style={s.mediaImage} resizeMode="cover" />
                )}
                {item.is_featured && (
                  <View style={s.featuredBadgeWrap}>
                    <Badge>
                      <Star size={10} color={colors.primaryForeground} />
                      <Text style={s.badgeTextTiny}>Featured</Text>
                    </Badge>
                  </View>
                )}
              </View>
              <CardContent style={s.cardBody}>
                {item.caption ? <Text style={s.caption} numberOfLines={1}>{item.caption}</Text> : null}
                <View style={s.badgeRow}>
                  {item.teams?.name ? <Badge variant="outline"><Text style={s.badgeTextTiny}>{item.teams.name}</Text></Badge> : null}
                  {item.event_name ? <Badge variant="secondary"><Text style={s.badgeTextTiny}>{item.event_name}</Text></Badge> : null}
                  <Badge variant="outline"><Text style={s.badgeTextTiny}>{item.media_type}</Text></Badge>
                </View>
                {item.tags && item.tags.length > 0 ? (
                  <View style={s.badgeRow}>
                    {item.tags.slice(0, 3).map((t: string) => (
                      <Badge key={t} variant="secondary"><Text style={s.badgeTextMicro}>{t}</Text></Badge>
                    ))}
                  </View>
                ) : null}
                <View style={s.actionRow}>
                  <Button variant="ghost" size="sm" onPress={() => toggleFeatured.mutate({ id: item.id, featured: !item.is_featured })}>
                    <Star size={12} color={item.is_featured ? colors.primary : colors.foreground} fill={item.is_featured ? colors.primary : "transparent"} />
                  </Button>
                  <Button variant="ghost" size="sm" onPress={() => Linking.openURL(item.url)}>
                    <ExternalLink size={12} color={colors.foreground} />
                  </Button>
                  <View style={{ flex: 1 }} />
                  <Button variant="ghost" size="sm" onPress={() => deleteMutation.mutate(item.id)}>
                    <Trash2 size={12} color={colors.destructive} />
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent style={{ maxWidth: 520 }}>
          <DialogHeader><DialogTitle>Add Media</DialogTitle></DialogHeader>
          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={s.dialogBody}>
            <View style={s.fieldGroup}>
              <Label>Media Type</Label>
              <Select value={mediaType} onValueChange={setMediaType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="youtube">YouTube Embed</SelectItem>
                </SelectContent>
              </Select>
            </View>
            <View style={s.fieldGroup}>
              <Label>URL</Label>
              <Input value={url} onChangeText={setUrl} placeholder="https://..." />
              <Text style={s.helpText}>Direct image/video URL or YouTube link</Text>
            </View>
            {mediaType === "image" ? (
              <View style={s.fieldGroup}>
                <Label>Or Upload from Library</Label>
                <Button variant="outline" onPress={pickImage}>
                  <Text style={s.btnOutlineText}>{selectedFile ? "Replace Image" : "Pick Image"}</Text>
                </Button>
                {selectedFile ? (
                  <Text style={s.helpText} numberOfLines={1}>Selected: {selectedFile.name}</Text>
                ) : null}
              </View>
            ) : null}
            <View style={s.twoCol}>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Label>Team (optional)</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </View>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Label>Event Name (optional)</Label>
                <Input value={eventName} onChangeText={setEventName} placeholder="e.g. Spring Tournament" />
              </View>
            </View>
            <View style={s.fieldGroup}>
              <Label>Caption</Label>
              <Input value={caption} onChangeText={setCaption} />
            </View>
            <View style={s.fieldGroup}>
              <Label>Tags (comma-separated)</Label>
              <Input value={tags} onChangeText={setTags} placeholder="e.g. highlights, defense" />
            </View>
            <View style={s.switchRow}>
              <Switch value={isFeatured} onValueChange={setIsFeatured} />
              <Label>Featured content</Label>
            </View>
          </ScrollView>
          <DialogFooter>
            <Button variant="outline" onPress={() => setShowAddDialog(false)}>
              <Text style={s.btnOutlineText}>Cancel</Text>
            </Button>
            <Button
              onPress={() => addMutation.mutate()}
              disabled={(!url.trim() && !selectedFile) || addMutation.isPending || uploading}
            >
              {(addMutation.isPending || uploading) ? <Loader2 size={16} color={colors.primaryForeground} /> : null}
              <Text style={s.btnPrimaryText}>Add Media</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}

export default ClubMediaGallery;

const s = StyleSheet.create({
  root: { gap: spacing.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md, flexWrap: "wrap" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.xl, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.mutedForeground, marginTop: 2 },
  btnPrimaryText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.primaryForeground, fontSize: typography.size.sm, marginLeft: spacing.xs },
  btnOutlineText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.size.sm },
  filters: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", alignItems: "center" },
  searchWrap: { flex: 1, minWidth: 200, position: "relative", justifyContent: "center" },
  searchIcon: { position: "absolute", left: spacing.sm, zIndex: 1 },
  searchInput: { paddingLeft: spacing.xl },
  centerPad: { paddingVertical: spacing.xxxl, alignItems: "center" },
  emptyCard: { alignItems: "center", paddingVertical: spacing.xxxl },
  emptyTitle: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.size.base, marginBottom: spacing.xs },
  emptySubtitle: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.size.sm, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  gridCard: { width: "48%", overflow: "hidden" },
  mediaBox: { aspectRatio: 16 / 9, backgroundColor: colors.muted, position: "relative" },
  mediaImage: { width: "100%", height: "100%" },
  videoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted },
  featuredBadgeWrap: { position: "absolute", top: spacing.xs, left: spacing.xs },
  cardBody: { padding: spacing.sm, gap: spacing.xs },
  caption: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, color: colors.foreground },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" },
  badgeTextTiny: { fontFamily: typography.fontFamily.body, fontSize: 10, color: colors.foreground, marginLeft: 2 },
  badgeTextMicro: { fontFamily: typography.fontFamily.body, fontSize: 9, color: colors.foreground },
  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingTop: spacing.xs },
  dialogBody: { gap: spacing.md, paddingVertical: spacing.sm },
  fieldGroup: { gap: spacing.xs },
  twoCol: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  helpText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.mutedForeground },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
