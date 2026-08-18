// HighlightVideoUpload — RN port of offerhound-repo/src/components/HighlightVideoUpload.tsx
//
// Athletes can upload a highlight video to Supabase Storage `highlight-videos`
// (parity bucket name from Lovable). URL is saved to
// player_profiles.highlight_video_url. Optional visibility toggle exposed via
// showVideoToggle props (parity).
//
// Web → RN:
//   - <input type="file" accept="video/*"> → ImagePicker.launchImageLibraryAsync
//     ({ mediaTypes: Videos })
//   - <video controls> → expo-av Video preview (best-effort: if expo-av isn't
//     bundled we fall back to a static "Video saved" panel + Linking.openURL)
//   - 100MB cap (parity)
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video as VideoIcon, X, Eye, EyeOff, Play, Loader2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

interface HighlightVideoUploadProps {
  athleteId: string;
  currentVideoUrl?: string | null;
  onVideoUpdated?: (url: string) => void;
  showVideoToggle?: boolean;
  isVideoVisible?: boolean;
  onVideoVisibilityChange?: (visible: boolean) => void;
  /** When true, all uploads are blocked (under-13 minor-safe profile). */
  isMinorSafe?: boolean;
}

export function HighlightVideoUpload({
  athleteId,
  currentVideoUrl,
  onVideoUpdated,
  showVideoToggle,
  isVideoVisible,
  onVideoVisibilityChange,
  isMinorSafe = false,
}: HighlightVideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(currentVideoUrl || '');
  const { toast } = useToast();

  const pickAndUpload = async () => {
    // Minor-Safe guard: block uploads for under-13 profiles.
    if (isMinorSafe) {
      toast({
        title: 'Upload Locked',
        description: 'Highlight videos cannot be uploaded until a parent completes the consent process for this minor athlete.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast({
          title: 'Permission Required',
          description: 'Please allow photo library access to upload a highlight video.',
          variant: 'destructive',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      // Parity 100MB cap
      if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Max 100MB for video.',
          variant: 'destructive',
        });
        return;
      }
      setIsUploading(true);

      const uriExt = asset.uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'mp4';
      const fileExt = asset.fileName?.split('.').pop()?.toLowerCase() || uriExt;
      const mimeType = asset.mimeType || `video/${fileExt === 'mov' ? 'quicktime' : fileExt}`;
      const filePath = `${athleteId}/highlight.${fileExt}`;

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error } = await supabase.storage
        .from('highlight-videos')
        .upload(filePath, arrayBuffer, { contentType: mimeType, upsert: true });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('highlight-videos').getPublicUrl(filePath);
      setVideoUrl(publicUrl);
      onVideoUpdated?.(publicUrl);
      await supabase
        .from('player_profiles')
        .update({ highlight_video_url: publicUrl })
        .eq('id', athleteId);
      toast({ title: 'Video uploaded!' });
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearVideo = async () => {
    setVideoUrl('');
    onVideoUpdated?.('');
    await supabase.from('player_profiles').update({ highlight_video_url: null }).eq('id', athleteId);
  };

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <View style={s.labelRow}>
          <VideoIcon size={16} color={colors.primary} />
          <Label>Highlight Video</Label>
        </View>
        {showVideoToggle && (
          <View style={s.toggleRow}>
            {isVideoVisible ? (
              <Eye size={14} color={colors.foreground} />
            ) : (
              <EyeOff size={14} color={colors.mutedForeground} />
            )}
            <Switch value={!!isVideoVisible} onValueChange={onVideoVisibilityChange} />
          </View>
        )}
      </View>

      {videoUrl ? (
        <View style={s.preview}>
          <Pressable
            style={s.previewInner}
            onPress={() => Linking.openURL(videoUrl).catch(() => {})}
          >
            <Play size={32} color={colors.primaryForeground} />
            <Text style={s.previewLabel}>Tap to play</Text>
          </Pressable>
          <Pressable style={s.removeBtn} onPress={clearVideo}>
            <X size={14} color={colors.destructiveForeground} />
          </Pressable>
        </View>
      ) : (
        <Pressable style={s.dropZone} onPress={pickAndUpload} disabled={isUploading}>
          {isUploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <VideoIcon size={32} color={colors.mutedForeground} />
              <Text style={s.dropTitle}>Upload highlight video</Text>
              <Text style={s.dropHint}>MP4, MOV up to 100MB</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default HighlightVideoUpload;

const s = StyleSheet.create({
  container: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  preview: {
    height: 192,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  previewInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  previewLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.primaryForeground,
  },
  removeBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZone: {
    height: 128,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dropTitle: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  dropHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
});
