// Ported from Lovable web (src/components/MediaShareButtons.tsx) → React Native.
// RN adaptations:
//   - navigator.clipboard          → expo-clipboard
//   - window.open                  → Linking.openURL
//   - sonner toast                 → @/components/ui/toast
//   - Popover (Radix)              → RN Modal pressable backdrop (no Popover primitive in v2 yet)
//   - lucide-react                 → lucide-react-native (Copy, Share2; Check → CircleCheck per v1.x rename)
//   - react-icons (FA brand icons) → @expo/vector-icons FontAwesome5/6 (X via FontAwesome6 'x-twitter';
//                                    Facebook/Instagram/TikTok via FontAwesome5)
//   - Tailwind className           → StyleSheet + theme tokens (visual parity, not pixel-perfect)
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ViewStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';
import { Copy, Share2, CircleCheck as Check } from 'lucide-react-native';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/toast';
import { colors, spacing, typography } from '@/lib/theme';

type IconRenderer = (size: number, color: string) => React.ReactNode;

const SHARE_PLATFORMS: Array<{
  key: string;
  label: string;
  icon: IconRenderer;
  url: (text: string, link: string) => string;
}> = [
  {
    key: 'x',
    label: 'X',
    icon: (size, color) => <FontAwesome6 name="x-twitter" size={size} color={color} />,
    url: (text, link) => `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: (size, color) => <FontAwesome5 name="facebook-f" size={size} color={color} />,
    url: (_, link) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: (size, color) => <FontAwesome5 name="instagram" size={size} color={color} />,
    url: () => 'https://instagram.com',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: (size, color) => <FontAwesome5 name="tiktok" size={size} color={color} />,
    url: () => 'https://tiktok.com/upload',
  },
];

interface MediaShareButtonsProps {
  mediaUrl: string;
  mediaTitle?: string;
  caption?: string;
  /** Track which platforms this media was shared to */
  sharedTo?: string[];
  onSharedTo?: (platforms: string[]) => void;
  compact?: boolean;
}

export function MediaShareButtons({
  mediaUrl,
  mediaTitle = 'Check out my highlight',
  caption,
  sharedTo = [],
  onSharedTo,
  compact = false,
}: MediaShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const shareText = caption || `${mediaTitle} 🏆 #OfferHound #Recruiting`;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(mediaUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platformKey: string) => {
    const platform = SHARE_PLATFORMS.find((p) => p.key === platformKey);
    if (!platform) return;

    Clipboard.setStringAsync(mediaUrl);
    Linking.openURL(platform.url(shareText, mediaUrl)).catch(() => toast.error('Could not open link'));

    // Track the share
    if (onSharedTo && !sharedTo.includes(platformKey)) {
      onSharedTo([...sharedTo, platformKey]);
    }

    toast.success(`Opening ${platform.label}... Link copied to clipboard!`);
  };

  if (compact) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => setPopoverOpen(true)}
          leftIcon={<Share2 size={14} color={colors.foreground} />}
          style={styles.compactTrigger}
        >
          Share
        </Button>
        <Modal visible={popoverOpen} transparent animationType="fade" onRequestClose={() => setPopoverOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setPopoverOpen(false)}>
            <Pressable style={styles.popover} onPress={(e) => e.stopPropagation()}>
              <View style={styles.popoverList}>
                <Pressable onPress={handleCopyLink} style={styles.popoverItem}>
                  {copied ? (
                    <Check size={14} color={colors.success ?? '#22c55e'} />
                  ) : (
                    <Copy size={14} color={colors.foreground} />
                  )}
                  <Text style={styles.popoverItemText}>Copy Link</Text>
                </Pressable>
                {SHARE_PLATFORMS.map((p) => {
                  const wasShared = sharedTo.includes(p.key);
                  return (
                    <Pressable key={p.key} onPress={() => handleShare(p.key)} style={styles.popoverItemBetween}>
                      <View style={styles.popoverItemLeft}>
                        {p.icon(14, colors.foreground)}
                        <Text style={styles.popoverItemText}>{p.label}</Text>
                      </View>
                      {wasShared && <Check size={12} color={colors.success ?? '#22c55e'} />}
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <View style={styles.row}>
      <Button
        variant="outline"
        size="sm"
        onPress={handleCopyLink}
        leftIcon={
          copied ? <Check size={14} color={colors.foreground} /> : <Copy size={14} color={colors.foreground} />
        }
      >
        {copied ? 'Copied' : 'Copy Link'}
      </Button>
      {SHARE_PLATFORMS.map((p) => {
        const wasShared = sharedTo.includes(p.key);
        const iconColor = wasShared ? colors.primaryForeground ?? '#fff' : colors.foreground;
        return (
          <Button
            key={p.key}
            variant={wasShared ? 'default' : 'outline'}
            size="sm"
            onPress={() => handleShare(p.key)}
            leftIcon={p.icon(14, iconColor)}
            rightIcon={wasShared ? <Check size={12} color={iconColor} /> : undefined}
          >
            {''}
          </Button>
        );
      })}
      {sharedTo.length > 0 && (
        <Badge variant="secondary">
          Shared to {sharedTo.length} platform{sharedTo.length !== 1 ? 's' : ''}
        </Badge>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  compactTrigger: {
    height: 28,
    paddingHorizontal: spacing.sm,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.md,
  },
  popover: {
    width: 192,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  popoverList: {
    gap: 4,
  } as ViewStyle,
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 4,
  },
  popoverItemBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 4,
  },
  popoverItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  popoverItemText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
});
