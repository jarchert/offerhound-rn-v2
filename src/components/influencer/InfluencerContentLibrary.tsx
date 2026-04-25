/**
 * InfluencerContentLibrary — RN port of Lovable web component.
 * Source: offerhound-repo/src/components/influencer/InfluencerContentLibrary.tsx
 *
 * Translations applied:
 *  - <Card>/<CardHeader>/<CardContent> → RN ui Card primitives
 *  - <Tabs>/<TabsList>/<TabsTrigger>/<TabsContent> → RN Tabs (controlled value)
 *  - <Input>/<Label>/<Button>/<Badge> shadcn → RN equivalents
 *  - <img>/<video> → <Image> for images, placeholder tile for videos
 *    (Expo Video would require expo-av; we render an aspect-square thumb tile
 *     and let users tap "open" to view externally)
 *  - <input type="file"> → expo-image-picker (image/video) — RN has no DOM
 *    file input; we wrap upload logic to construct a File-shaped object the
 *    upload hook can consume (uri, name, type, size)
 *  - <a target="_blank"> → Pressable + Linking.openURL
 *  - sonner toast → RN toast wrapper (toast.success / toast.error)
 *  - lucide-react → lucide-react-native
 *  - tailwind classes → StyleSheet using theme tokens
 */
import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Upload, Link2, Trash2, ExternalLink, FolderOpen } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/toast';
import {
  useContentLibrary,
  useUploadLibraryAsset,
  useAddLibraryItem,
  useDeleteLibraryItem,
} from '@/hooks/useInfluencerHootsuite';
import { colors, typography, spacing, radius } from '@/lib/theme';

export function InfluencerContentLibrary({ influencerId }: { influencerId: string }) {
  const { data: items = [] } = useContentLibrary(influencerId);
  const upload = useUploadLibraryAsset();
  const addLink = useAddLibraryItem();
  const remove = useDeleteLibraryItem();
  const [tab, setTab] = useState('grid');
  const [linkForm, setLinkForm] = useState({ title: '', url: '', notes: '' });

  const pickAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error('Media library permission denied');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const sizeBytes = asset.fileSize ?? 0;
      if (sizeBytes && sizeBytes > 50 * 1024 * 1024) {
        toast.error('File must be under 50MB');
        return;
      }
      // Construct a File-shaped object for the upload hook. RN doesn't have
      // the DOM File class, so we hand the hook a {uri, name, type, size} blob.
      const fileName = asset.fileName || asset.uri.split('/').pop() || `upload-${Date.now()}`;
      const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
      const file: any = {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
        size: sizeBytes,
      };
      await upload.mutateAsync({ influencerId, file, title: fileName });
      toast.success('Added to library');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    }
  };

  const onAddLink = async () => {
    if (!linkForm.url.trim()) {
      toast.error('URL required');
      return;
    }
    try {
      await addLink.mutateAsync({
        influencerId,
        assetType: 'link',
        title: linkForm.title || linkForm.url,
        assetUrl: linkForm.url,
        notes: linkForm.notes,
      });
      toast.success('Link saved');
      setLinkForm({ title: '', url: '', notes: '' });
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <View style={s.titleRow}>
          <FolderOpen size={20} color={colors.primary} />
          <CardTitle>Content Library</CardTitle>
        </View>
        <CardDescription>
          Reusable bin of media, links, and snippets you can drop into any post.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="grid">{`Library (${(items as any[]).length})`}</TabsTrigger>
            <TabsTrigger value="upload">Upload Media</TabsTrigger>
            <TabsTrigger value="link">Add Link / Snippet</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" style={s.tabContent}>
            {(items as any[]).length === 0 ? (
              <Text style={s.emptyText}>
                Your library is empty. Upload media or save links to build your content bin.
              </Text>
            ) : (
              <View style={s.grid}>
                {(items as any[]).map((it: any) => (
                  <View key={it.id} style={s.gridCell}>
                    {it.asset_type === 'image' && it.asset_url ? (
                      <Image
                        source={{ uri: it.thumbnail_url || it.asset_url }}
                        style={s.tileImage}
                        resizeMode="cover"
                        accessibilityLabel={it.title || ''}
                      />
                    ) : it.asset_type === 'video' && it.asset_url ? (
                      <View style={[s.tileImage, s.videoTile]}>
                        <Text style={s.videoLabel}>▶ Video</Text>
                      </View>
                    ) : (
                      <View style={[s.tileImage, s.linkTile]}>
                        <Link2 size={24} color={colors.mutedForeground} />
                        <Text style={s.linkTileText} numberOfLines={3}>
                          {it.title || it.asset_url}
                        </Text>
                      </View>
                    )}
                    <View style={s.tileBadge}>
                      <Badge variant="secondary" style={s.tileBadgeBox}>{it.asset_type}</Badge>
                    </View>
                    <View style={s.tileActions}>
                      {it.asset_url ? (
                        <Pressable
                          onPress={() => Linking.openURL(it.asset_url).catch(() => {})}
                          style={({ pressed }) => [s.tileBtn, s.tileBtnSecondary, pressed && s.tileBtnPressed]}
                        >
                          <ExternalLink size={14} color={colors.secondaryForeground} />
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() => remove.mutate({ id: it.id, influencerId })}
                        style={({ pressed }) => [s.tileBtn, s.tileBtnDestructive, pressed && s.tileBtnPressed]}
                      >
                        <Trash2 size={14} color={colors.destructiveForeground} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </TabsContent>

          <TabsContent value="upload" style={s.tabContent}>
            <Pressable
              onPress={pickAndUpload}
              disabled={upload.isPending}
              style={({ pressed }) => [s.dropzone, pressed && s.dropzonePressed]}
            >
              <Upload size={32} color={colors.mutedForeground} />
              <Text style={s.dropzonePrimary}>
                {upload.isPending ? 'Uploading…' : 'Tap to add image or video'}
              </Text>
              <Text style={s.dropzoneHint}>Max 50MB</Text>
            </Pressable>
          </TabsContent>

          <TabsContent value="link" style={s.linkFormContent}>
            <View style={s.field}>
              <Label>Title</Label>
              <Input
                value={linkForm.title}
                onChangeText={(t) => setLinkForm((f) => ({ ...f, title: t }))}
                placeholder="Optional label"
              />
            </View>
            <View style={s.field}>
              <Label>URL *</Label>
              <Input
                value={linkForm.url}
                onChangeText={(t) => setLinkForm((f) => ({ ...f, url: t }))}
                placeholder="https://…"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <View style={s.field}>
              <Label>Notes</Label>
              <Input
                value={linkForm.notes}
                onChangeText={(t) => setLinkForm((f) => ({ ...f, notes: t }))}
                placeholder="What's this for?"
              />
            </View>
            <Button
              onPress={onAddLink}
              disabled={addLink.isPending}
              leftIcon={<Link2 size={16} color={colors.primaryForeground} />}
            >
              Save to Library
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default InfluencerContentLibrary;

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabContent: { marginTop: spacing.md },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  // grid grid-cols-2 md:grid-cols-4 gap-3 — pick mobile (2 cols)
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 },
  gridCell: {
    width: '48%',
    position: 'relative',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tileImage: { width: '100%', aspectRatio: 1 },
  videoTile: {
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  linkTile: {
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm + 4,
    gap: 6,
  },
  linkTileText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
    textAlign: 'center',
  },
  tileBadge: { position: 'absolute', top: 4, left: 4 },
  tileBadgeBox: { paddingHorizontal: 6, paddingVertical: 1 },
  tileActions: { position: 'absolute', top: 4, right: 4, flexDirection: 'row', gap: 4 },
  tileBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBtnSecondary: { backgroundColor: colors.secondary },
  tileBtnDestructive: { backgroundColor: colors.destructive },
  tileBtnPressed: { opacity: 0.75 },

  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
  },
  dropzonePressed: { borderColor: colors.primary, opacity: 0.85 },
  dropzonePrimary: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  dropzoneHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },

  linkForm: { gap: spacing.sm + 4 },
  linkFormContent: { marginTop: spacing.md, gap: spacing.sm + 4 },
  field: { gap: 6 },
});
