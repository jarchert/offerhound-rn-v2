// Verbatim port from Lovable web — RN-adapted.
// Source: offerhound-repo/src/components/SocialSyndicationCenter.tsx
//
// Adaptations:
//   - <input type="file" multiple> → expo-image-picker.launchImageLibraryAsync
//     (images + videos, multi-select via allowsMultipleSelection)
//   - <img>/<div> → <Image>/<View>
//   - Tailwind → StyleSheet
//   - useToast() shim
//   - Embedded SocialPostComposer uses its new `bare` prop so there's no
//     nested Card chrome.
import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon, Video, Megaphone } from 'lucide-react-native';
import { SocialPostComposer } from '@/components/SocialPostComposer';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface UploadedMedia {
  url: string;
  path: string;
  type: 'image' | 'video';
  name: string;
}

interface SocialSyndicationCenterProps {
  /** Display name shown in the default post text (e.g. club, athlete, coach name) */
  entityName?: string;
  /** Public URL appended to every post */
  profileUrl?: string;
  /** Default post copy override */
  defaultText?: string;
}

export function SocialSyndicationCenter({
  entityName,
  profileUrl,
  defaultText,
}: SocialSyndicationCenterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast({ title: 'Permission needed', description: 'Allow media access to upload', variant: 'destructive' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    const next: UploadedMedia[] = [];

    for (const asset of result.assets) {
      const size = asset.fileSize ?? 0;
      if (size && size > 50 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${asset.fileName || 'file'} exceeds 50MB`, variant: 'destructive' });
        continue;
      }
      const isVideo = asset.type === 'video' || (asset.mimeType?.startsWith('video/') ?? false);
      const bucket = isVideo ? 'highlight-videos' : 'gallery';
      const ext = (asset.uri.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase();
      const path = `${user.id}/syndication/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const fileBody = {
        uri: asset.uri,
        name: asset.fileName || `media.${ext}`,
        type: asset.mimeType || (isVideo ? `video/${ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`),
      } as any;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, fileBody, { upsert: false, contentType: fileBody.type });
      if (error) {
        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        continue;
      }
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      next.push({
        url: pub.publicUrl,
        path,
        type: isVideo ? 'video' : 'image',
        name: asset.fileName || `media.${ext}`,
      });
    }

    setMedia((prev) => [...prev, ...next]);
    setUploading(false);
    if (next.length) toast({ title: `${next.length} file${next.length > 1 ? 's' : ''} uploaded` });
  };

  const removeMedia = (idx: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  };

  const computedDefault =
    defaultText ?? (entityName ? `Big things happening at ${entityName}! 🏆` : '');

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <View style={s.titleRow}>
            <Megaphone size={20} color={colors.primary} />
            <Text style={s.titleText}>Social Syndication Center</Text>
          </View>
        </CardTitle>
        <Text style={s.subtitle}>
          Compose a post, attach media, and publish to every connected platform in one flow.
        </Text>
      </CardHeader>
      <CardContent>
        <View style={{ gap: spacing.md }}>
          {/* Media uploader */}
          <View style={{ gap: spacing.sm }}>
            <Label>Media (photos & videos)</Label>
            <Pressable onPress={pickAndUpload} style={s.dropzone}>
              {uploading ? (
                <View style={s.dzRow}>
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                  <Text style={s.dzHint}>Uploading...</Text>
                </View>
              ) : (
                <>
                  <Upload size={24} color={colors.mutedForeground} />
                  <Text style={s.dzText}>Tap to upload photos or videos</Text>
                  <Text style={s.dzHint}>Max 50MB per file</Text>
                </>
              )}
            </Pressable>

            {media.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.thumbRow}>
                  {media.map((m, idx) => (
                    <View key={idx} style={s.thumb}>
                      {m.type === 'image' ? (
                        <Image source={{ uri: m.url }} style={s.thumbImage} />
                      ) : (
                        <View style={s.thumbVideo}>
                          <Video size={32} color={colors.mutedForeground} />
                        </View>
                      )}
                      <Pressable style={s.thumbX} onPress={() => removeMedia(idx)}>
                        <X size={12} color={colors.foreground} />
                      </Pressable>
                      <View style={s.thumbBadge}>
                        <Badge variant="secondary">
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            {m.type === 'image' ? (
                              <ImageIcon size={10} color={colors.foreground} />
                            ) : (
                              <Video size={10} color={colors.foreground} />
                            )}
                          </View>
                        </Badge>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Composer */}
          <SocialPostComposer
            bare
            defaultText={computedDefault}
            profileUrl={profileUrl}
            mediaUrl={media[0]?.url}
          />

          <View style={s.tip}>
            <Text style={s.tipText}>
              💡 <Text style={s.tipStrong}>How it works:</Text> Your text & link are copied to your clipboard, then each selected platform opens in a new tab. Attach your uploaded media in the platform's composer.
            </Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

export default SocialSyndicationCenter;

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 4 },
  dropzone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: colors.muted,
  },
  dzText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
  dzHint: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  dzRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumbRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  thumb: {
    width: 96, height: 96, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.muted,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbVideo: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  thumbX: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(16,19,24,0.9)', borderRadius: radius.full, padding: 4,
  },
  thumbBadge: { position: 'absolute', bottom: 4, left: 4 },
  tip: {
    backgroundColor: colors.muted, borderRadius: radius.md,
    padding: spacing.sm,
  },
  tipText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  tipStrong: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
});
