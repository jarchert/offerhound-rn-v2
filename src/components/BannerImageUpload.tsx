// Ported verbatim (logic & UX) from Lovable:
//   offerhound-repo/src/components/BannerImageUpload.tsx
//
// Web → RN translation notes:
//   • <input type="file"> + drag/drop  → expo-image-picker.launchImageLibraryAsync()
//     RN has no DOM drag/drop; the "drop zone" becomes a tappable preview area.
//   • Supabase upload: web uploaded a File blob; in RN we build FormData with
//     { uri, name, type } and pass it to supabase.storage.upload(). Same bucket
//     ("profile-images") and same path convention (`athletes/{id}/banner-{ts}.{ext}`).
//   • Tailwind → StyleSheet (theme tokens from @/lib/theme).
//   • shadcn Button/Dialog → src/components/ui/* equivalents.
//   • lucide-react → lucide-react-native.
//   • <img> → <Image> (expo-image); animate-pulse/animate-spin → ActivityIndicator.
//   • Same toast copy, same validation thresholds (10MB, image/* mime check).

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Trash2, Image as ImageIconLucide, Maximize2 } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { supabase } from '@/integrations/supabase/client';
import { isMinorSafeAthlete } from '@/lib/isMinorSafeAthlete';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface BannerImageUploadProps {
  athleteId: string;
  currentImageUrl: string | null;
  onImageUpdated: (newUrl: string | null) => void;
  /** When true, all uploads are blocked (under-13 minor-safe profile). */
  isMinorSafe?: boolean;
}

// Best-effort mime inference from extension (ImagePicker assets don't always
// carry a mimeType on every platform/SDK). Falls back to image/jpeg.
function inferMimeType(uri: string, fallback = 'image/jpeg'): string {
  const ext = uri.split('.').pop()?.toLowerCase().split('?')[0] || '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    default:
      return fallback;
  }
}

export function BannerImageUpload({
  athleteId,
  currentImageUrl,
  onImageUpdated,
  isMinorSafe = false,
}: BannerImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { toast } = useToast();

  const pickImage = async () => {
    // Minor-Safe guard (prop fast-path + DB verification).
    const minorSafeLocked = isMinorSafe || (await isMinorSafeAthlete(athleteId));
    if (minorSafeLocked) {
      toast({
        title: 'Upload Locked',
        description: 'Banner images cannot be uploaded until a parent completes the consent process for this minor athlete.',
        variant: 'destructive',
      });
      return;
    }
    // Request permission (no-op on web; safe on native).
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast({
        title: 'Permission Required',
        description: 'Please allow photo library access to upload a banner image.',
        variant: 'destructive',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
      exif: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const asset = result.assets[0];

    // Validate file size (max 10MB) — verbatim from Lovable.
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    const mimeType =
      (asset as any).mimeType || inferMimeType(asset.uri);

    // Validate file type — verbatim from Lovable.
    if (!mimeType.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image file (JPG, PNG, GIF, etc.)',
        variant: 'destructive',
      });
      return;
    }

    await uploadImage(asset.uri, mimeType, asset.fileName ?? undefined);
  };

  const uploadImage = async (uri: string, mimeType: string, originalName?: string) => {
    setIsUploading(true);

    try {
      // Generate unique filename — same convention as Lovable.
      const fileExt =
        (originalName?.split('.').pop() ||
          uri.split('.').pop()?.split('?')[0] ||
          'jpg').toLowerCase();
      const fileName = `athletes/${athleteId}/banner-${Date.now()}.${fileExt}`;

      // Delete old image if exists — same path parsing as Lovable.
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split('/profile-images/')[1];
        if (oldPath) {
          await supabase.storage.from('profile-images').remove([oldPath]);
        }
      }

      // In RN, supabase-js accepts FormData for binary uploads.
      // See: https://supabase.com/docs/reference/javascript/storage-from-upload
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName.split('/').pop() || `banner-${Date.now()}.${fileExt}`,
        type: mimeType,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, formData as any, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        });

      if (uploadError) throw uploadError;

      // Get public URL.
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // Update player profile with new image URL.
      const { error: updateError } = await supabase
        .from('player_profiles')
        .update({ banner_image_url: urlData.publicUrl })
        .eq('id', athleteId);

      if (updateError) throw updateError;

      onImageUpdated(urlData.publicUrl);

      toast({
        title: 'Banner Updated',
        description: 'Your profile background banner has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error?.message || 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!currentImageUrl) return;

    setIsDeleting(true);

    try {
      // Extract path from URL — same parsing as Lovable.
      const oldPath = currentImageUrl.split('/profile-images/')[1];
      if (oldPath) {
        await supabase.storage.from('profile-images').remove([oldPath]);
      }

      // Update player profile to remove image URL.
      const { error: updateError } = await supabase
        .from('player_profiles')
        .update({ banner_image_url: null })
        .eq('id', athleteId);

      if (updateError) throw updateError;

      onImageUpdated(null);

      toast({
        title: 'Banner Removed',
        description: 'Your profile background banner has been removed.',
      });
    } catch (error: any) {
      console.error('Image delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error?.message || 'Failed to remove image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const disabled = isUploading || isDeleting;

  return (
    <View style={s.container}>
      {/* Header label */}
      <View style={s.headerRow}>
        <ImageIconLucide size={16} color={colors.mutedForeground} />
        <Text style={s.headerText}>Profile Page Background Banner</Text>
      </View>

      {/* Preview / drop-zone area (tap to preview or upload) */}
      <Pressable
        onPress={() => (currentImageUrl ? setLightboxOpen(true) : pickImage())}
        disabled={disabled}
        style={({ pressed }) => [
          s.preview,
          currentImageUrl ? s.previewFilled : s.previewEmpty,
          pressed && currentImageUrl && s.previewPressed,
        ]}
      >
        {currentImageUrl ? (
          <>
            <Image
              source={{ uri: currentImageUrl }}
              style={s.previewImage}
              contentFit="cover"
            />
            {/* Gradient overlay approximation (bottom fade) */}
            <View style={s.previewGradientOverlay} />
            <View style={s.badgeUploaded}>
              <Text style={s.badgeUploadedText}>✓ Uploaded</Text>
            </View>
            <View style={s.badgePreview}>
              <Maximize2 size={12} color={colors.mutedForeground} />
              <Text style={s.badgePreviewText}>Tap to preview</Text>
            </View>
          </>
        ) : (
          <View style={s.emptyInner}>
            <ImageIconLucide size={32} color={colors.mutedForeground} />
            <Text style={s.emptyText}>Tap to upload banner image</Text>
          </View>
        )}
      </Pressable>

      {/* Buttons */}
      <View style={s.buttonRow}>
        <Button
          variant="outline"
          size="sm"
          onPress={pickImage}
          disabled={disabled}
          loading={isUploading}
          leftIcon={
            isUploading ? undefined : (
              <ImagePlus size={16} color={colors.foreground} />
            )
          }
          style={s.flex1}
        >
          {isUploading
            ? 'Uploading...'
            : currentImageUrl
              ? 'Change Banner'
              : 'Upload Banner'}
        </Button>

        {currentImageUrl ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={handleDeleteImage}
            disabled={disabled}
            style={s.deleteBtn}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Trash2 size={16} color={colors.destructive} />
            )}
          </Button>
        ) : null}
      </View>

      <Text style={s.helperText}>
        This image appears as the full-width background at the top of your
        profile page. Use a wide action shot, field/court image, or stadium
        photo.
      </Text>

      {/* Lightbox modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent style={s.lightboxContent}>
          <DialogHeader>
            <View style={s.lightboxTitleRow}>
              <ImageIconLucide size={20} color={colors.foreground} />
              <DialogTitle>Profile Banner Image</DialogTitle>
            </View>
          </DialogHeader>
          {currentImageUrl ? (
            <View style={s.lightboxImageWrap}>
              <Image
                source={{ uri: currentImageUrl }}
                style={s.lightboxImage}
                contentFit="contain"
              />
            </View>
          ) : null}
        </DialogContent>
      </Dialog>
    </View>
  );
}

export default BannerImageUpload;

const s = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  headerText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },

  // Preview container — maps `w-full h-24 rounded-lg overflow-hidden border-2`
  preview: {
    width: '100%',
    height: 96,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    position: 'relative',
  },
  previewFilled: {
    borderColor: colors.border,
    borderStyle: 'solid',
  },
  previewEmpty: {
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPressed: {
    opacity: 0.85,
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Approximation of bg-gradient-to-t from-background/60
    backgroundColor: 'rgba(16, 19, 24, 0.35)',
  },
  badgeUploaded: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(16, 19, 24, 0.8)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeUploadedText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  badgePreview: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(16, 19, 24, 0.8)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgePreviewText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },

  emptyInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  deleteBtn: {
    paddingHorizontal: spacing.md,
  },

  helperText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    lineHeight: typography.fontSize.xs * 1.4,
  },

  lightboxContent: {
    maxWidth: 800,
    padding: 0,
  },
  lightboxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lightboxImageWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  lightboxImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 500,
  },
});
