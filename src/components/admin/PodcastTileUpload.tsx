// Verbatim port from Lovable web — RN-adapted.
// Source: offerhound-repo/src/components/admin/PodcastTileUpload.tsx
//
// Adaptations:
//   - <input type="file"> → expo-image-picker.launchImageLibraryAsync
//   - <img> → <Image>
//   - shadcn Button → @/components/ui/Button
//   - lucide-react → lucide-react-native
//   - useToast() shim (toast({title,...}))
import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Image as ImageIcon } from 'lucide-react-native';
import { colors, spacing, radius } from '@/lib/theme';

export const PodcastTileUpload = ({
  onUpload,
  currentUrl,
}: {
  onUpload?: (url: string) => void;
  currentUrl?: string | null;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handlePick = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast({ title: 'Permission needed', description: 'Allow photo access to upload', variant: 'destructive' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      base64: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const sizeBytes = asset.fileSize ?? 0;
    if (sizeBytes && sizeBytes > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
      const path = `podcasts/tile-${Date.now()}.${ext}`;
      // RN file upload pattern for supabase-js: pass FormData/Blob via fetch.
      const fileBody = {
        uri: asset.uri,
        name: `tile.${ext}`,
        type: asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      } as any;
      const { error } = await supabase.storage.from('profile-images').upload(path, fileBody, {
        upsert: true,
        contentType: fileBody.type,
      });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile-images').getPublicUrl(path);
      onUpload?.(publicUrl);
      toast({ title: 'Tile image uploaded' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={s.container}>
      {currentUrl ? <Image source={{ uri: currentUrl }} style={s.preview} /> : null}
      <Button
        variant="outline"
        size="sm"
        onPress={handlePick}
        disabled={uploading}
        leftIcon={uploading ? <Loader2 size={16} color={colors.foreground} /> : <ImageIcon size={16} color={colors.foreground} />}
      >
        {currentUrl ? 'Replace' : 'Upload'} Tile
      </Button>
    </View>
  );
};

export default PodcastTileUpload;

const s = StyleSheet.create({
  container: { gap: spacing.sm },
  preview: { width: 96, height: 96, borderRadius: radius.lg, backgroundColor: colors.muted },
});
