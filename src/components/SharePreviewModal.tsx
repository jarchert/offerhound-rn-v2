// Parity port from Lovable src/components/SharePreviewModal.tsx.
// Web→RN translations:
//   <div>/<p>/<a> → <View>/<Text>/<Pressable> (with Linking.openURL)
//   <img> → <Image>
//   shadcn ui (lowercase) → PascalCase RN ports
//   lucide-react → lucide-react-native
//   Tailwind → StyleSheet via @/lib/theme tokens
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Linking } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Copy, Check, Twitter, Facebook, Linkedin } from 'lucide-react-native';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography, radius } from '@/lib/theme';

interface SharePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  description?: string;
  ogImageUrl?: string;
}

/**
 * Lightweight preview of how the camp will look when shared on social media.
 * Mirrors the OG/Twitter card layout (image + title + description + URL).
 */
export function SharePreviewModal({
  open,
  onOpenChange,
  url,
  title,
  description,
  ogImageUrl,
}: SharePreviewModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast({ title: 'Link copied', description: url });
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();

  const openExternal = (target: string) => {
    void Linking.openURL(target);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={s.content}>
        <DialogHeader>
          <DialogTitle>Share preview</DialogTitle>
          <DialogDescription>
            Here's how this camp will look when shared on social media.
          </DialogDescription>
        </DialogHeader>

        <View style={s.body}>
          {/* OG card preview */}
          <View style={s.ogCard}>
            {ogImageUrl ? (
              <View style={s.ogImageWrap}>
                <Image
                  source={{ uri: ogImageUrl }}
                  style={s.ogImage}
                  resizeMode="cover"
                  accessibilityLabel="Social share preview"
                />
              </View>
            ) : (
              <View style={[s.ogImageWrap, s.ogPlaceholder]}>
                <Text style={s.ogPlaceholderText}>Preview image not available</Text>
              </View>
            )}
            <View style={s.ogMeta}>
              <Text style={s.ogHost} numberOfLines={1}>{host}</Text>
              <Text style={s.ogTitle} numberOfLines={2}>{title}</Text>
              {description ? (
                <Text style={s.ogDesc} numberOfLines={2}>{description}</Text>
              ) : null}
            </View>
          </View>

          {/* URL row */}
          <View style={s.urlRow}>
            <View style={s.urlInputWrap}>
              <Input
                editable={false}
                value={url}
                style={s.monoInput}
              />
            </View>
            <Button
              variant="outline"
              size="icon"
              onPress={handleCopy}
            >
              {copied ? (
                <Check size={16} color={colors.foreground} />
              ) : (
                <Copy size={16} color={colors.foreground} />
              )}
            </Button>
          </View>

          {/* Quick share buttons */}
          <View style={s.shareRow}>
            <Button
              variant="outline"
              size="sm"
              onPress={() => openExternal(tweetUrl)}
              leftIcon={<Twitter size={16} color={colors.foreground} />}
            >
              Tweet
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={() => openExternal(fbUrl)}
              leftIcon={<Facebook size={16} color={colors.foreground} />}
            >
              Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={() => openExternal(liUrl)}
              leftIcon={<Linkedin size={16} color={colors.foreground} />}
            >
              LinkedIn
            </Button>
          </View>
        </View>
      </DialogContent>
    </Dialog>
  );
}

const s = StyleSheet.create({
  content: { maxWidth: 512 },
  body: { gap: spacing.md },
  ogCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  ogImageWrap: {
    width: '100%',
    aspectRatio: 1200 / 630,
    backgroundColor: colors.muted,
  },
  ogImage: { width: '100%', height: '100%' },
  ogPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  ogPlaceholderText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
  },
  ogMeta: {
    padding: spacing.sm,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ogHost: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
    fontFamily: typography.fontFamily.body,
  },
  ogTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    color: colors.foreground,
  },
  ogDesc: {
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  urlRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  urlInputWrap: { flex: 1 },
  monoInput: {
    fontFamily: 'Courier',
    fontSize: typography.size.xs,
    color: colors.foreground,
  },
  shareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
