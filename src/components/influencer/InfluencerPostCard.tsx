/**
 * InfluencerPostCard — RN port of Lovable web component.
 * Source: offerhound-repo/src/components/influencer/InfluencerPostCard.tsx
 *
 * Translations applied:
 *  - <Card>/<CardContent> → RN ui Card primitives
 *  - <Avatar> shadcn → RN Avatar (source/fallback)
 *  - <Badge variant="outline"|"secondary"> → RN Badge variants
 *  - <img>/<iframe> → RN <Image>; iframe is unsupported on RN, so we render
 *    a placeholder tile linking out via WebBrowser when an embed_url is set.
 *  - <a target="_blank"> → Pressable + Linking.openURL
 *  - Tailwind classes → StyleSheet using theme tokens (colors/typography/spacing/radius)
 *  - date-fns format() preserved (works in RN)
 */
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Linking } from 'react-native';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { OfferHoundWatermark } from './OfferHoundWatermark';
import { InfluencerShareButtons } from './InfluencerShareButtons';
import { buildInfluencerShareUrl } from '@/lib/influencerShare';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface PostInfluencer {
  id: string;
  handle: string;
  display_name: string;
  profile_image_url?: string | null;
}

interface PostData {
  id: string;
  title: string;
  description: string;
  media_url?: string | null;
  embed_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  sport_tags?: string[] | null;
  activity_type?: string | null;
  created_at: string;
}

export function InfluencerPostCard({
  post,
  influencer,
}: {
  post: PostData;
  influencer: PostInfluencer;
}) {
  const shareUrl = buildInfluencerShareUrl(influencer.handle, `?post=${post.id}`);

  const openCta = () => {
    if (post.cta_url) Linking.openURL(post.cta_url).catch(() => {});
  };
  const openEmbed = () => {
    if (post.embed_url) Linking.openURL(post.embed_url).catch(() => {});
  };

  return (
    <Card>
      <CardContent style={s.content}>
        {/* Author header */}
        <View style={s.headerRow}>
          <Avatar
            size={40}
            source={influencer.profile_image_url ? { uri: influencer.profile_image_url } : null}
            fallback={influencer.display_name?.slice(0, 2).toUpperCase()}
          />
          <View style={s.headerText}>
            <Text style={s.displayName} numberOfLines={1}>
              {influencer.display_name}
            </Text>
            <Text style={s.metaLine} numberOfLines={1}>
              @{influencer.handle} · {format(new Date(post.created_at), 'MMM d, yyyy')}
            </Text>
          </View>
          {post.activity_type && (
            <Badge variant="outline" style={s.activityBadge}>
              <Text style={s.activityBadgeText}>
                {capitalize(post.activity_type.replace(/_/g, ' '))}
              </Text>
            </Badge>
          )}
        </View>

        {/* Body */}
        <View>
          <Text style={s.title}>{post.title}</Text>
          {!!post.description && (
            <Text style={s.description}>{post.description}</Text>
          )}
        </View>

        {/* Media with watermark */}
        {post.media_url && (
          <View style={s.mediaTile}>
            <Image
              source={{ uri: post.media_url }}
              style={s.mediaImage}
              resizeMode="cover"
              accessibilityLabel={post.title}
            />
            <OfferHoundWatermark />
          </View>
        )}

        {post.embed_url && !post.media_url && (
          <Pressable onPress={openEmbed} style={s.embedTile}>
            <Text style={s.embedText} numberOfLines={2}>
              ▶ Open embedded media
            </Text>
            <OfferHoundWatermark />
          </Pressable>
        )}

        {/* Tags */}
        {post.sport_tags && post.sport_tags.length > 0 && (
          <View style={s.tagsRow}>
            {post.sport_tags.map((t) => (
              <Badge key={t} variant="secondary" style={s.tagBadge}>
                <Text style={s.tagBadgeText}>{capitalize(t)}</Text>
              </Badge>
            ))}
          </View>
        )}

        {/* Footer: CTA + share */}
        <View style={s.footerRow}>
          {post.cta_url ? (
            <Pressable onPress={openCta} hitSlop={6}>
              <Text style={s.ctaText}>{post.cta_label || 'Learn more →'}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <InfluencerShareButtons url={shareUrl} title={post.title} />
        </View>
      </CardContent>
    </Card>
  );
}

export default InfluencerPostCard;

function capitalize(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

const s = StyleSheet.create({
  content: { padding: spacing.md, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  displayName: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: typography.fontSize.base,
  },
  metaLine: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },
  activityBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  activityBadgeText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 10,
    color: colors.foreground,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    lineHeight: typography.fontSize.lg * 1.1,
  },
  description: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  mediaTile: {
    position: 'relative',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  mediaImage: { width: '100%', height: 240, maxHeight: 480 },
  embedTile: {
    position: 'relative',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  embedText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  tagBadgeText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 10,
    color: colors.secondaryForeground,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  ctaText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
});
