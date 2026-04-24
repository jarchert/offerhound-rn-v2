import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Loader2, Trash2, Building2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

interface OrganizationLogoUploadProps {
  organizationId: string;
  currentLogoUrl: string | null;
  organizationName: string;
  onLogoUpdated: (newUrl: string | null) => void;
  isOwner: boolean;
}

export function OrganizationLogoUpload({
  organizationId,
  currentLogoUrl,
  organizationName,
  onLogoUpdated,
  isOwner,
}: OrganizationLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Parity with Lovable: h-24 w-24 = 96px
  const sizePx = 96;
  const iconPx = 40; // h-10 w-10

  const pickAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast({
          title: 'Permission Required',
          description: 'Please allow photo library access to upload a logo.',
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
      console.error('Logo pick error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to pick logo. Please try again.',
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
      const fileName = `${organizationId}/logo-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (currentLogoUrl) {
        const oldPath = currentLogoUrl.split('/organization-logos/')[1];
        if (oldPath) {
          await supabase.storage.from('organization-logos').remove([oldPath]);
        }
      }

      // Read file as ArrayBuffer for Supabase upload (fetch+blob is unreliable in RN)
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(fileName, arrayBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('scout_organizations')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      onLogoUpdated(urlData.publicUrl);

      toast({
        title: 'Logo Updated',
        description: 'Your organization logo has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!currentLogoUrl) return;

    setIsDeleting(true);

    try {
      const oldPath = currentLogoUrl.split('/organization-logos/')[1];
      if (oldPath) {
        await supabase.storage.from('organization-logos').remove([oldPath]);
      }

      const { error: updateError } = await supabase
        .from('scout_organizations')
        .update({ logo_url: null })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      onLogoUpdated(null);

      toast({
        title: 'Logo Removed',
        description: 'Your organization logo has been removed.',
      });
    } catch (error: any) {
      console.error('Logo delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to remove logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={isOwner ? pickAndUpload : undefined}
        disabled={!isOwner || isUploading || isDeleting}
        style={[
          styles.avatarWrap,
          { width: sizePx, height: sizePx, borderRadius: sizePx / 2 },
        ]}
      >
        {currentLogoUrl ? (
          <Avatar
            source={{ uri: currentLogoUrl }}
            fallback={organizationName?.charAt(0)}
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
            <Building2 size={iconPx} color={colors.primary} />
          </View>
        )}

        {isOwner && isUploading && (
          <View style={[styles.overlay, { borderRadius: sizePx / 2 }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </Pressable>

      {isOwner && (
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
            {isUploading ? 'Uploading...' : currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
          </Button>

          {currentLogoUrl && (
            <Button
              variant="ghost"
              size="sm"
              onPress={handleDeleteLogo}
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
      )}

      {isOwner && (
        <Text style={styles.helperText}>
          Upload a logo for your organization. Max 10MB, JPG/PNG recommended.
        </Text>
      )}
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
