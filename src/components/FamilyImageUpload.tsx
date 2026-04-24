import { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Loader2, Trash2, Users, Maximize2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

interface FamilyImageUploadProps {
  athleteId: string;
  currentImageUrl: string | null;
  onImageUpdated: (newUrl: string | null) => void;
}

export function FamilyImageUpload({
  athleteId,
  currentImageUrl,
  onImageUpdated,
}: FamilyImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { toast } = useToast();

  const pickAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast({
          title: 'Permission Required',
          description: 'Please allow photo library access to upload a family photo.',
          variant: 'destructive',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      // Validate MIME type (parity with Lovable: file.type.startsWith("image/"))
      const mimeType = asset.mimeType || '';
      if (mimeType && !mimeType.startsWith('image/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload an image file (JPG, PNG, GIF, etc.)',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 10MB, parity with Lovable)
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please upload an image smaller than 10MB.',
          variant: 'destructive',
        });
        return;
      }

      await uploadImage(asset);
    } catch (error: any) {
      console.error('Image pick error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to pick image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsUploading(true);

    try {
      // Derive extension + mime type from asset
      const uriExt = asset.uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
      const fileExt = asset.fileName?.split('.').pop()?.toLowerCase() || uriExt || 'jpg';
      const mimeType = asset.mimeType || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      const fileName = `athletes/${athleteId}/family-${Date.now()}.${fileExt}`;

      if (currentImageUrl && currentImageUrl.includes('/profile-images/')) {
        const oldPath = currentImageUrl.split('/profile-images/')[1];
        if (oldPath) {
          await supabase.storage.from('profile-images').remove([oldPath]);
        }
      }

      // Read file as ArrayBuffer for Supabase upload (fetch+blob is unreliable in RN)
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, arrayBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('player_profiles')
        .update({ family_image_url: urlData.publicUrl })
        .eq('id', athleteId);

      if (updateError) throw updateError;

      onImageUpdated(urlData.publicUrl);

      toast({
        title: 'Family Photo Updated',
        description: 'Your family photo has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentImageUrl) return;

    setIsDeleting(true);

    try {
      if (currentImageUrl.includes('/profile-images/')) {
        const oldPath = currentImageUrl.split('/profile-images/')[1];
        if (oldPath) {
          await supabase.storage.from('profile-images').remove([oldPath]);
        }
      }

      const { error: updateError } = await supabase
        .from('player_profiles')
        .update({ family_image_url: null })
        .eq('id', athleteId);

      if (updateError) throw updateError;

      onImageUpdated(null);

      toast({
        title: 'Family Photo Removed',
        description: 'Your family photo has been removed.',
      });
    } catch (error: any) {
      console.error('Image delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Users size={20} color={colors.mutedForeground} />
        <Text style={styles.heading}>Family Photo</Text>
      </View>
      <Text style={styles.description}>
        Upload a photo of your family to share with coaches in the "My Family" section.
      </Text>

      {currentImageUrl ? (
        <View style={styles.previewWrap}>
          <Pressable
            style={styles.imageWrap}
            onPress={() => setLightboxOpen(true)}
          >
            <Image
              source={{ uri: currentImageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.expandBadge}>
              <Maximize2 size={16} color={colors.foreground} />
            </View>
          </Pressable>
          <View style={styles.buttonRow}>
            <Button
              variant="outline"
              size="sm"
              onPress={pickAndUpload}
              disabled={isUploading}
              leftIcon={
                isUploading ? (
                  <Loader2 size={16} color={colors.foreground} />
                ) : (
                  <ImagePlus size={16} color={colors.foreground} />
                )
              }
            >
              Change Photo
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onPress={handleDelete}
              disabled={isDeleting}
              leftIcon={
                isDeleting ? (
                  <Loader2 size={16} color={colors.destructiveForeground} />
                ) : (
                  <Trash2 size={16} color={colors.destructiveForeground} />
                )
              }
            >
              Remove
            </Button>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.dropZone}
          onPress={pickAndUpload}
          disabled={isUploading}
        >
          <Users size={48} color={colors.mutedForeground} style={styles.dropIcon} />
          <Text style={styles.dropText}>
            Tap to browse and upload a family photo
          </Text>
          <Button
            variant="outline"
            onPress={pickAndUpload}
            disabled={isUploading}
            leftIcon={
              isUploading ? (
                <Loader2 size={16} color={colors.foreground} />
              ) : (
                <ImagePlus size={16} color={colors.foreground} />
              )
            }
          >
            Upload Family Photo
          </Button>
          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </Pressable>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent style={styles.lightboxContent}>
          <DialogHeader>
            <DialogTitle>Family Photo</DialogTitle>
          </DialogHeader>
          {currentImageUrl && (
            <Image
              source={{ uri: currentImageUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </View>
  );
}

export default FamilyImageUpload;

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heading: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.base,
  },
  description: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  previewWrap: {
    gap: spacing.md,
  },
  imageWrap: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: 192, // h-48
  },
  expandBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(16, 19, 24, 0.6)',
    padding: spacing.xs,
    borderRadius: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(128, 136, 151, 0.25)', // muted-foreground/25
    borderRadius: 8,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  dropIcon: {
    marginBottom: spacing.xs,
  },
  dropText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 19, 24, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  lightboxContent: {
    maxWidth: 896, // max-w-4xl
    width: '95%',
  },
  lightboxImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
});
