// QRShareCard — RN-only (no Lovable equivalent file). Shows a QR code linking
// to the athlete's public profile + native Share button.
//
// Dependencies:
//   - react-native-qrcode-svg (just added in this commit) on top of
//     react-native-svg (already a dependency).
//   - React Native Share API for the share sheet.
import React, { useRef } from 'react';
import { View, Text, StyleSheet, Share, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Share2, Copy, ExternalLink, Linking as LinkIcon } from 'lucide-react-native';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

interface QRShareCardProps {
  /** Athlete's custom URL slug (e.g. "jordan-brown") — used to build the
   *  public profile link `https://offerhound.com/athlete/<custom_url>`. */
  customUrl: string | null | undefined;
  /** Athlete display name (used in the share sheet message). */
  athleteName: string;
}

const APP_PUBLIC_URL = 'https://offerhound.com';

export function QRShareCard({ customUrl, athleteName }: QRShareCardProps) {
  const { toast } = useToast();
  const qrRef = useRef<any>(null);
  const slug = (customUrl || '').trim();
  const link = slug ? `${APP_PUBLIC_URL}/athlete/${slug}` : '';

  const onShare = async () => {
    if (!link) return;
    try {
      await Share.share({
        message: `Check out ${athleteName}'s OfferHound profile: ${link}`,
        url: link,
        title: `${athleteName} on OfferHound`,
      });
    } catch {
      /* user cancelled */
    }
  };

  const onCopy = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    toast({ title: 'Link copied!' });
  };

  return (
    <Card>
      <CardHeader>
        <View style={s.titleRow}>
          <Share2 size={18} color={colors.foreground} />
          <CardTitle>Share Your Profile</CardTitle>
        </View>
      </CardHeader>
      <CardContent>
        {link ? (
          <View style={s.body}>
            <View style={s.qrWrap}>
              <QRCode
                value={link}
                size={180}
                getRef={(c) => (qrRef.current = c)}
                color={colors.foreground}
                backgroundColor={colors.background}
              />
            </View>
            <Pressable onPress={onCopy} style={s.linkBtn}>
              <LinkIcon size={14} color={colors.primary} />
              <Text style={s.linkText} numberOfLines={1}>
                {link}
              </Text>
            </Pressable>
            <View style={s.actionRow}>
              <Button
                variant="default"
                onPress={onShare}
                leftIcon={<Share2 size={14} color={colors.primaryForeground} />}
                style={{ flex: 1 }}
              >
                Share
              </Button>
              <Button
                variant="outline"
                onPress={onCopy}
                leftIcon={<Copy size={14} color={colors.foreground} />}
                style={{ flex: 1 }}
              >
                Copy
              </Button>
            </View>
          </View>
        ) : (
          <View style={s.empty}>
            <ExternalLink size={20} color={colors.mutedForeground} />
            <Text style={s.emptyText}>
              Set a custom URL on your profile to generate a shareable QR code.
            </Text>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

export default QRShareCard;

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  body: { alignItems: 'center', gap: spacing.md },
  qrWrap: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.muted,
    maxWidth: '100%',
  },
  linkText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
    flexShrink: 1,
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
