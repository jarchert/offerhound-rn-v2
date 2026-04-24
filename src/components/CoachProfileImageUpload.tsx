import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Loader2, Trash2, User } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

interface CoachProfileImageUploadProps {
  coachId: string;
  currentImageUrl: string | null;
  coachName: string;
  onImageUpdated: (newUrl: string | null) => void;
}

export function CoachProfileImageUpload({
  coachId,
  currentImageUrl,
  coachName,
  onImageUpdated,
}: CoachProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Parity with Lovable: h-24 w-24 → 96px
  const sizePx = 96;
  const iconPx = 40; // h-10 w-10

  const pickAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast({
          title: 'Permission Required',
          description: 'Please allow photo library access to upload a profile photo.',
          variant: 'destructive',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      // Validate file size (max 10MB)
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
        description: error.message || 'Failed to pick photo. Please try again.',
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
      const fileName = `coaches/${coachId}/profile-${Date.now()}.${fileExt}`;

      // Delete old image if exists
      if (currentImageUrl) {
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
        .from('coach_profiles')
        .update({ image_url: urlData.publicUrl })
        .eq('id', coachId);

      if (updateError) throw updateError;

      onImageUpdated(urlData.publicUrl);

      toast({
        title: 'Photo Updated',
        description: 'Your profile photo has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload photo. Please try again.',
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
      const oldPath = currentImageUrl.split('/profile-images/')[1];
      if (oldPath) {
        await supabase.storage.from('profile-images').remove([oldPath]);
      }

      const { error: updateError } = await supabase
        .from('coach_profiles')
        .update({ image_url: null })
        .eq('id', coachId);

      if (updateError) throw updateError;

      onImageUpdated(null);

      toast({
        title: 'Photo Removed',
        description: 'Your profile photo has been removed.',
      });
    } catch (error: any) {
      console.error('Image delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to remove photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const fallbackChar = coachName?.charAt(0);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={pickAndUpload}
        disabled={isUploading || isDeleting}
        style={[
          styles.avatarWrap,
          { width: sizePx, height: sizePx, borderRadius: sizePx / 2 },
        ]}
      >
        {currentImageUrl || fallbackChar ? (
          <Avatar
            source={currentImageUrl ? { uri: currentImageUrl } : null}
            fallback={fallbackChar}
            size={sizePx}
            style={styles.avatar}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.fallbackIcon,
              { width: sizePx, height: sizePx, borderRadius: sizePx / 2 },
            ]}
          >
            <User size={iconPx} color={colors.primary} />
          </View>
        )}

        {isUploading && (
          <View style={[styles.overlay, { borderRadius: sizePx / 2 }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </Pressable>

      <View style={styles.buttonRow}>
        <Button
          variant="outline"
          size="sm"
          onPress={pickAndUpload}
          disabled={isUploading || isDeleting}
          leftIcon={
            isUploading ? (
              <Loader2 size={16} color={colors.foreground} />
            ) : (
              <Camera size={16} color={colors.foreground} />
            )
          }
        >
          {isUploading ? 'Uploading...' : currentImageUrl ? 'Change Photo' : 'Upload Photo'}
        </Button>

        {currentImageUrl && (
          <Button
            variant="ghost"
            size="sm"
            onPress={handleDeleteImage}
            disabled={isUploading || isDeleting}
            textStyle={{ color: colors.destructive }}
          >
            {isDeleting ? (
              <Loader2 size={16} color={colors.destructive} />
            ) : (
              <Trash2 size={16} color={colors.destructive} />
            )}
          </Button>
        )}
      </View>

      <Text style={styles.helperText}>
        Upload a profile photo. Max 10MB, JPG/PNG recommended.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  avatar: {
    borderWidth: 0,
  },
  fallbackIcon: {
    backgroundColor: 'rgba(231, 175, 8, 0.1)', // primary/10
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 19, 24, 0.8)', // background/80
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  helperText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    textAlign: 'center',
    maxWidth: 192,
  },
});
