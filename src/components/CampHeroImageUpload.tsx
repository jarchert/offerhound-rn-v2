// Parity port from Lovable src/components/CampHeroImageUpload.tsx (verbatim logic).
// Web→RN mapping:
//   - <input type="file"> + Image.onload → expo-image-picker (returns width/height
//     via the asset, no DOM Image needed).
//   - shadcn Button/Label/Tooltip → src/components/ui/* (Tooltip lives in app, used
//     for the Info hint in label).
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet using @/lib/theme tokens
//   - File upload to Supabase storage uses a fetch→blob bridge (the same pattern
//     used elsewhere in the app, e.g. AthleteProfileImageUpload).
//   - crypto.randomUUID() → globalThis.crypto?.randomUUID() with a Math.random fallback
//     (expo-crypto not installed; matches randomUUID convention used elsewhere).
//   - URL cache-bust ?v=Date.now() preserved.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image as RNImage } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageIcon, Loader2, X, RefreshCw, AlertCircle, Info } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { CAMP_HERO_IMAGE_RULES } from '@/lib/data/campManagerSports';
import { colors, spacing, radius } from '@/lib/theme';

async function logHeroImageAudit(opts: {
  campId?: string;
  userId?: string;
  eventType: 'camp_hero_image_replaced' | 'camp_hero_image_removed';
  details?: Record<string, unknown>;
}) {
  if (!opts.campId || !opts.userId) return;
  try {
    await supabase.from('camp_audit_events').insert({
      camp_id: opts.campId,
      actor_user_id: opts.userId,
      subject_user_id: opts.userId,
      event_type: opts.eventType,
      details: (opts.details || {}) as any,
    } as any);
  } catch (err) {
    console.warn('hero image audit log failed:', err);
  }
}

interface CampHeroImageUploadProps {
  campId?: string;
  currentImageUrl?: string | null;
  onUploaded: (publicUrl: string) => void;
  onRemoved?: () => void;
  label?: string;
  helpText?: string;
}

const ACCEPTED_MIMES = CAMP_HERO_IMAGE_RULES.acceptedTypes as readonly string[];
const MAX_BYTES = CAMP_HERO_IMAGE_RULES.maxSize;
const MIN_WIDTH = CAMP_HERO_IMAGE_RULES.minWidth;
const MIN_AR = CAMP_HERO_IMAGE_RULES.minAspectRatio;
const MAX_AR = CAMP_HERO_IMAGE_RULES.maxAspectRatio;

function randomUuid(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // RFC4122 v4-ish fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function inferMimeFromUri(uri: string, fallback?: string | null): string {
  if (fallback) return fallback;
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export function CampHeroImageUpload({
  campId,
  currentImageUrl,
  onUploaded,
  onRemoved,
  label = 'Camp Hero Image',
  helpText = 'Banner on the public camp page. JPG / PNG / WEBP, max 10MB. Recommended 1600×600 (16:6 aspect).',
}: CampHeroImageUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const validateAsset = (asset: ImagePicker.ImagePickerAsset, mime: string, size: number): string | null => {
    if (!ACCEPTED_MIMES.includes(mime as any)) {
      return 'Unsupported file type. Please upload a JPG, PNG, or WEBP image.';
    }
    if (size > MAX_BYTES) {
      const mb = (size / 1024 / 1024).toFixed(1);
      return `File is ${mb}MB. Max allowed is 10MB — please compress or resize.`;
    }
    const w = asset.width ?? 0;
    const h = asset.height ?? 0;
    if (!w || !h) {
      return "We couldn't read that file as an image. Try exporting it again as JPG or PNG.";
    }
    if (w < MIN_WIDTH) {
      return `Image is ${w}px wide. Please use one at least ${MIN_WIDTH}px wide so the hero stays sharp.`;
    }
    const ratio = w / h;
    if (ratio < MIN_AR || ratio > MAX_AR) {
      return `Aspect ratio ${ratio.toFixed(2)}:1 is outside the recommended range (${MIN_AR.toFixed(2)}:1 – ${MAX_AR.toFixed(2)}:1). Try a wide banner like 1600×600.`;
    }
    return null;
  };

  const pickAndUpload = async () => {
    setValidationError(null);

    if (!user) {
      toast({ title: 'Not signed in', variant: 'destructive' });
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast({ title: 'Permission required', description: 'Allow photo library access to upload.', variant: 'destructive' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      exif: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    const mime = inferMimeFromUri(asset.uri, asset.mimeType);
    const size = asset.fileSize ?? 0;
    const error = validateAsset(asset, mime, size);
    if (error) {
      setValidationError(error);
      toast({ title: 'Image not accepted', description: error, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Bridge file:// → blob for supabase storage upload
      const resp = await fetch(asset.uri);
      const blob = await resp.blob();
      const ext = (asset.fileName?.split('.').pop() || mime.split('/')[1] || 'jpg').toLowerCase();
      const key = campId || randomUuid();
      const path = `${user.id}/${key}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('camp-images')
        .upload(path, blob as any, { upsert: true, contentType: mime });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('camp-images').getPublicUrl(path);
      const busted = `${publicUrl}?v=${Date.now()}`;
      const wasReplacement = !!previewUrl;
      setPreviewUrl(busted);
      onUploaded(busted);
      toast({ title: wasReplacement ? 'Hero image replaced' : 'Hero image uploaded' });
      logHeroImageAudit({
        campId,
        userId: user.id,
        eventType: 'camp_hero_image_replaced',
        details: {
          file_name: asset.fileName || `${key}.${ext}`,
          file_size_bytes: size,
          content_type: mime,
          replaced_existing: wasReplacement,
        },
      });
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Try a smaller image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setValidationError(null);
    onRemoved?.();
    logHeroImageAudit({
      campId,
      userId: user?.id,
      eventType: 'camp_hero_image_removed',
    });
  };

  const acceptedExt = ACCEPTED_MIMES.map((t) => t.replace('image/', '').toUpperCase()).join(' / ');
  const maxMb = (MAX_BYTES / 1024 / 1024).toFixed(0);
  const minRatio = MIN_AR.toFixed(2);
  const maxRatio = MAX_AR.toFixed(2);

  return (
    <View style={s.root}>
      <View style={s.labelRow}>
        <ImageIcon size={16} color={colors.primary} />
        <Label>{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <View style={s.infoBtn}>
                <Info size={13} color={colors.mutedForeground} />
              </View>
            </TooltipTrigger>
            <TooltipContent>
              <View style={s.tipBody}>
                <Text style={s.tipTitle}>Hero image requirements</Text>
                <View style={s.tipList}>
                  <Text style={s.tipItem}><Text style={s.tipBold}>Type:</Text> {acceptedExt}</Text>
                  <Text style={s.tipItem}><Text style={s.tipBold}>Max size:</Text> {maxMb}MB</Text>
                  <Text style={s.tipItem}><Text style={s.tipBold}>Min width:</Text> {MIN_WIDTH}px</Text>
                  <Text style={s.tipItem}>
                    <Text style={s.tipBold}>Aspect ratio:</Text> {minRatio}:1 – {maxRatio}:1{' '}
                    <Text style={s.tipMuted}>(recommended 16:6 ≈ 2.67:1)</Text>
                  </Text>
                </View>
                <Text style={s.tipMutedTop}>
                  Tip: a 1600×600 banner gives the cleanest result on the public camp page.
                </Text>
              </View>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </View>

      <Pressable
        onPress={pickAndUpload}
        disabled={uploading}
        style={s.dropzone}
      >
        {previewUrl ? (
          <RNImage source={{ uri: previewUrl }} style={s.preview} resizeMode="cover" />
        ) : uploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={s.placeholder}>
            <ImageIcon size={32} color={colors.mutedForeground} />
            <Text style={s.placeholderText}>Tap to upload school or brand hero image</Text>
          </View>
        )}
        {previewUrl && !uploading && (
          <View style={s.overlay} pointerEvents="none">
            <Text style={s.overlayText}>Tap to replace</Text>
          </View>
        )}
      </Pressable>

      {validationError && (
        <View style={s.errorBox}>
          <AlertCircle size={13} color={colors.destructive} />
          <Text style={s.errorText}>{validationError}</Text>
        </View>
      )}

      <View style={s.footer}>
        <Text style={s.helpText}>{helpText}</Text>
        <View style={s.footerActions}>
          {previewUrl && (
            <Button variant="outline" size="sm" onPress={pickAndUpload} disabled={uploading}>
              <View style={s.btnRow}>
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.foreground} />
                ) : (
                  <RefreshCw size={12} color={colors.foreground} />
                )}
                <Text style={s.btnTextOutline}>Replace</Text>
              </View>
            </Button>
          )}
          {previewUrl && onRemoved && (
            <Button variant="ghost" size="sm" onPress={handleRemove} disabled={uploading}>
              <View style={s.btnRow}>
                <X size={12} color={colors.destructive} />
                <Text style={s.btnTextDestructive}>Remove</Text>
              </View>
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: spacing.xs + 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoBtn: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tipBody: { gap: 4, maxWidth: 280 },
  tipTitle: { fontSize: 12, fontWeight: '700', color: colors.foreground },
  tipList: { gap: 2 },
  tipItem: { fontSize: 11, color: colors.foreground },
  tipBold: { fontWeight: '600' },
  tipMuted: { color: colors.mutedForeground },
  tipMutedTop: { color: colors.mutedForeground, fontSize: 11, paddingTop: 4 },
  dropzone: { aspectRatio: 16 / 6, width: '100%', borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
  preview: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', paddingHorizontal: spacing.md, gap: 4 },
  placeholderText: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  overlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.destructive, backgroundColor: 'rgba(220,40,40,0.1)', padding: spacing.xs + 4 },
  errorText: { fontSize: 11, color: colors.destructive, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, flexWrap: 'wrap' },
  helpText: { fontSize: 11, color: colors.mutedForeground, flex: 1, minWidth: 200 },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnTextOutline: { color: colors.foreground, fontSize: 11, fontWeight: '600' },
  btnTextDestructive: { color: colors.destructive, fontSize: 11, fontWeight: '600' },
});
