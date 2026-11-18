import {normalizeAthleteImageAsset,athleteGalleryPath,athleteMediaAllowed,validateMediaBytes,addAthleteGallery,removeAthleteGallery} from '@/lib/athleteMedia';
// GalleryImageManager — RN port of offerhound-repo/src/components/GalleryImageManager.tsx
//
// Multi-image picker that uploads to Supabase Storage `gallery` bucket and saves
// public URLs to player_profiles.gallery_images (jsonb array of { url, uploadedAt }).
//
// Web → RN:
//   - <input type="file" multiple> → ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true })
//   - <img> grid + delete button → <Image> tiles with absolute X overlay
//   - Tailwind grid → flexWrap StyleSheet computed widths (3-up grid)
//   - File blob → ArrayBuffer (RN-safe) + supabase.storage.upload
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Loader2, X } from 'lucide-react-native';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

export interface GalleryImage {
  url: string;
  caption?: string;
  uploadedAt?: string;
}

interface GalleryImageManagerProps {
  athleteId: string;
  galleryImages?: GalleryImage[];
  onImagesUpdated?: (images: GalleryImage[]) => void;
  /** Hard cap on gallery size, parity default: 12 */
  maxImages?: number;
}

export function GalleryImageManager({
  athleteId,
  galleryImages = [],
  onImagesUpdated,
  maxImages = 12,
}: GalleryImageManagerProps) {
  const [images, setImages] = useState<GalleryImage[]>(galleryImages);
  const [isUploading, setIsUploading] = useState(false);
  const removing=useRef(false);
  const [removingIndex,setRemovingIndex]=useState<number|null>(null);
  const { toast } = useToast();

  // Keep internal state in sync if parent reloads images
  useEffect(() => {
    setImages(galleryImages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(galleryImages)]);

  const acceptGallery=async(next:GalleryImage[])=>{setImages(next);await onImagesUpdated?.(next);};

  const pickAndUpload = async () => {
    if(!await athleteMediaAllowed(supabase,athleteId,message=>toast({title:'Upload unavailable',description:message,variant:'destructive'})))return;
    if (images.length >= maxImages) {
      toast({ title: `Max ${maxImages} images allowed`, variant: 'destructive' });
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast({
          title: 'Permission Required',
          description: 'Please allow photo library access to add gallery images.',
          variant: 'destructive',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, maxImages - images.length),
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      setIsUploading(true);
      const newItems: GalleryImage[] = [];
      for (const selected of result.assets) {
        const asset=await normalizeAthleteImageAsset(selected);
        // 5MB cap (parity with Lovable web)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) continue;

        const uriExt =
          asset.uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
        const fileExt = asset.fileName?.split('.').pop()?.toLowerCase() || uriExt;
        const mimeType = asset.mimeType || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
        const filePath = athleteGalleryPath(athleteId,fileExt);

        try {
          const response = await fetch(asset.uri);
          const arrayBuffer = await response.arrayBuffer();
      validateMediaBytes(arrayBuffer,10*1024*1024);
          const { error } = await supabase.storage
            .from('gallery')
            .upload(filePath, arrayBuffer, { contentType: mimeType, upsert: false });
          if (error) {
            console.error('gallery upload error:', error);
            continue;
          }
          const confirmed=await addAthleteGallery(supabase,athleteId,filePath);
          await acceptGallery(confirmed);
          newItems.push({url:filePath});
        } catch (err) {
          toast({title:'Image save not confirmed',description:(err as any)?.message||'Reload before retrying.',variant:'destructive'});
          break;
        }
      }

      if (newItems.length === 0) {
        toast({ title: 'Upload failed', variant: 'destructive' });
      } else {
        toast({ title: `${newItems.length} image(s) uploaded` });
      }
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

  const removeImage = async (index: number) => {
    if(isUploading||removing.current)return;
    const target=images[index];if(!target)return;
    removing.current=true;setRemovingIndex(index);
    try {
      await acceptGallery(await removeAthleteGallery(supabase,athleteId,target.url));
    } catch {toast({title:'Removal not confirmed',description:'Reload your gallery before trying again.',variant:'destructive'});}
    finally {removing.current=false;setRemovingIndex(null);}
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={s.grid}>
        {images.map((img, i) => (
          <View key={`${img.url}-${i}`} style={s.cell}>
            <Image source={{ uri: img.url }} style={s.image} contentFit="cover" />
            <Pressable style={s.removeBtn} disabled={isUploading||removingIndex!==null} accessibilityLabel="Remove gallery image" onPress={() => removeImage(i)}>
              <X size={14} color={colors.destructiveForeground} />
            </Pressable>
          </View>
        ))}
        {images.length < maxImages && (
          <Pressable style={[s.cell, s.addCell]} onPress={pickAndUpload} disabled={isUploading||removingIndex!==null}>
            {isUploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Plus size={24} color={colors.mutedForeground} />
                <Text style={s.addText}>Add</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
      <Text style={s.counter}>
        {images.length} / {maxImages} images
      </Text>
    </View>
  );
}

export default GalleryImageManager;

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCell: {
    borderStyle: 'dashed',
    borderWidth: 2,
    backgroundColor: 'transparent',
    gap: 4,
  },
  addText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  counter: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
});
