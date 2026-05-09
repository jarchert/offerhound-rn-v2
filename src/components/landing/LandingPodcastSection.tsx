// RN port of Lovable LandingPodcastSection.tsx — verbatim copy/structure, RN-adapted.
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Headphones, ArrowRight } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';

interface PodcastEpisode {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  podcast_id: string | null;
}

export function LandingPodcastSection() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();

  const { data: episodes = [], isLoading } = useQuery<PodcastEpisode[]>({
    queryKey: ['landing-podcasts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('podcast_episodes')
        .select('id, title, description, thumbnail_url, published_at, podcast_id')
        .order('published_at', { ascending: false })
        .limit(6);
      return (data as PodcastEpisode[]) || [];
    },
  });

  if (isLoading) {
    return (
      <View style={s.section}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (episodes.length === 0) return null;

  // Responsive columns: 1 (xs), 2 (sm >= 640), 3 (lg >= 1024)
  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const gap = spacing.md;
  const horizontalPadding = spacing.md * 2;
  const cardWidth = (width - horizontalPadding - gap * (cols - 1)) / cols;
  const isWide = width >= 640;

  const goAll = () => nav.navigate('PodcastsTab');
  const goEpisode = (id: string) =>
    nav.navigate('PodcastEpisodeDetail' as any, { id });

  return (
    <View style={s.section}>
      <View style={s.container}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={s.badge}>
              <Headphones size={12} color={colors.foregroundSubtle} />
              <Text style={s.badgeText}>Recruiting Roundup</Text>
            </View>
            <Text style={s.heading}>Latest Recruiting Content</Text>
            <Text style={s.subheading}>
              Curated insights across all 13 sports — updated weekly
            </Text>
          </View>
          {isWide && (
            <Pressable onPress={goAll} style={s.outlineBtn}>
              <Text style={s.outlineBtnText}>View All</Text>
              <ArrowRight size={16} color={colors.foreground} />
            </Pressable>
          )}
        </View>

        <View style={[s.grid, { gap }]}>
          {episodes.map((ep) => {
            const desc = (ep.description || '').replace(/Source:.*$/s, '').trim();
            const dateStr = ep.published_at
              ? new Date(ep.published_at).toLocaleDateString()
              : '';
            return (
              <Pressable
                key={ep.id}
                onPress={() => goEpisode(ep.id)}
                style={({ pressed }) => [
                  s.card,
                  { width: cardWidth },
                  pressed && s.cardPressed,
                ]}
              >
                <View style={s.cardContent}>
                  {ep.thumbnail_url ? (
                    <Image
                      source={{ uri: ep.thumbnail_url }}
                      style={s.thumb}
                      resizeMode="cover"
                    />
                  ) : null}
                  <Text style={s.cardTitle} numberOfLines={2}>
                    {ep.title}
                  </Text>
                  {desc ? (
                    <Text style={s.cardDesc} numberOfLines={2}>
                      {desc}
                    </Text>
                  ) : null}
                  <Text style={s.cardDate}>{dateStr}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {!isWide && (
          <View style={s.mobileBtnWrap}>
            <Pressable onPress={goAll} style={s.outlineBtn}>
              <Text style={s.outlineBtnText}>View All</Text>
              <ArrowRight size={16} color={colors.foreground} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export default LandingPodcastSection;

const s = StyleSheet.create({
  // py-16 px-4 bg-muted/30
  section: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(43, 48, 58, 0.3)',
  },
  // max-w-6xl mx-auto
  container: { maxWidth: 1152, width: '100%', alignSelf: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  heading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    color: colors.foreground,
  },
  subheading: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  outlineBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: colors.cardHigh,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardPressed: { opacity: 0.85 },
  cardContent: { padding: spacing.md, gap: spacing.xs },
  thumb: {
    width: '100%',
    height: 128,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  cardDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
  cardDate: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  mobileBtnWrap: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});
