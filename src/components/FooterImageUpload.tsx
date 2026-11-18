import {normalizeAthleteImageAsset,athleteImagePath,athleteMediaAllowed,validateMediaBytes,saveAthleteMedia} from '@/lib/athleteMedia';
// FooterImageUpload — RN port of offerhound-repo/src/components/FooterImageUpload.tsx
//
// Uploads a footer image to Supabase Storage `profile-images` at
// `{athleteId}/footer.{ext}` and saves URL to player_profiles.footer_image_url.
// 5MB cap (parity).
import React, { useState,useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon } from 'lucide-react-native';
import { Label } from '@/components/ui/Label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  athleteId: string;
  currentImageUrl?: string | null;
  onImageUpdated?: (url: string | null) => void;
}

export function FooterImageUpload({ athleteId, currentImageUrl, onImageUpdated }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const { toast } = useToast();
  useEffect(()=>setPreviewUrl(currentImageUrl||null),[athleteId,currentImageUrl]);

  const pickAndUpload = async () => {
    if(!await athleteMediaAllowed(supabase,athleteId,message=>toast({title:'Upload unavailable',description:message,variant:'destructive'})))return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast({ title: 'Permission Required', variant: 'destructive' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = await normalizeAthleteImageAsset(result.assets[0]);
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        toast({ title: 'File too large', variant: 'destructive' });
        return;
      }
      setIsUploading(true);

      const uriExt = asset.uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
      const fileExt = asset.fileName?.split('.').pop()?.toLowerCase() || uriExt;
      const mimeType = asset.mimeType || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      const filePath = athleteImagePath(athleteId,'footer',fileExt);

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      validateMediaBytes(arrayBuffer,5*1024*1024);
      const { error } = await supabase.storage
        .from('profile-images')
        .upload(filePath, arrayBuffer, { contentType: mimeType, upsert: false });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile-images').getPublicUrl(filePath);
      await saveAthleteMedia(supabase,athleteId,{footer_image_url: publicUrl },{footer_image_url:currentImageUrl||null},value=>{setPreviewUrl(value);onImageUpdated?.(value);});
      setPreviewUrl(publicUrl);
      onImageUpdated?.(publicUrl);
      toast({ title: 'Footer image updated!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={s.labelRow}>
        <ImageIcon size={16} color={colors.primary} />
        <Label>Footer Image</Label>
      </View>
      <Pressable style={s.dropZone} onPress={pickAndUpload} disabled={isUploading}>
        {previewUrl ? (
          <Image source={{ uri: previewUrl }} style={s.image} contentFit="cover" />
        ) : isUploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <ImageIcon size={24} color={colors.mutedForeground} />
            <Text style={s.dropText}>Upload footer image</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

export default FooterImageUpload;

const s = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dropZone: {
    height: 96,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  dropText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 4,
  },
});
