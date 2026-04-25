/**
 * InfluencerAnalytics — RN port of Lovable web component.
 * Source: offerhound-repo/src/components/influencer/InfluencerAnalytics.tsx
 *
 * Translations applied:
 *  - <Card>/<CardHeader>/<CardTitle>/<CardDescription>/<CardContent> → RN ui primitives
 *  - lucide-react → lucide-react-native
 *  - Tailwind grid grid-cols-2 md:grid-cols-5 → flex-wrap with percent widths
 *  - <p>/<div> → <View>/<Text>
 *  - Number.toLocaleString() preserved (works in RN/Hermes)
 *  - useQuery + supabase preserved verbatim
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Eye, Users, FileText, Calendar } from 'lucide-react-native';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

export function InfluencerAnalytics({ influencerId }: { influencerId: string }) {
  const { data: stats } = useQuery({
    queryKey: ['influencer-analytics', influencerId],
    queryFn: async () => {
      const [posts, blogs, gallery, follows, scheduled] = await Promise.all([
        supabase
          .from('influencer_activities' as any)
          .select('id', { count: 'exact', head: true })
          .eq('influencer_id', influencerId)
          .eq('post_status', 'published'),
        supabase
          .from('influencer_blog_posts' as any)
          .select('id', { count: 'exact', head: true })
          .eq('influencer_id', influencerId)
          .eq('status', 'published'),
        supabase
          .from('influencer_gallery' as any)
          .select('id', { count: 'exact', head: true })
          .eq('influencer_id', influencerId),
        supabase
          .from('influencer_follows' as any)
          .select('id', { count: 'exact', head: true })
          .eq('influencer_id', influencerId)
          .eq('is_following', true),
        supabase
          .from('influencer_activities' as any)
          .select('id', { count: 'exact', head: true })
          .eq('influencer_id', influencerId)
          .eq('post_status', 'scheduled'),
      ]);
      return {
        posts: posts.count || 0,
        blogs: blogs.count || 0,
        gallery: gallery.count || 0,
        followers: follows.count || 0,
        scheduled: scheduled.count || 0,
      };
    },
    enabled: !!influencerId,
  });

  const tiles = [
    { label: 'Followers', value: stats?.followers ?? 0, Icon: Users },
    { label: 'Posts published', value: stats?.posts ?? 0, Icon: FileText },
    { label: 'Blog posts', value: stats?.blogs ?? 0, Icon: FileText },
    { label: 'Media items', value: stats?.gallery ?? 0, Icon: Eye },
    { label: 'Scheduled', value: stats?.scheduled ?? 0, Icon: Calendar },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <View style={s.titleRow}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={s.titleText}>Analytics</Text>
          </View>
        </CardTitle>
        <CardDescription>Lifetime totals across your creator profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <View style={s.grid}>
          {tiles.map((t) => (
            <View key={t.label} style={s.tile}>
              <t.Icon size={20} color={colors.mutedForeground} />
              <Text style={s.value}>{t.value.toLocaleString()}</Text>
              <Text style={s.label}>{t.label}</Text>
            </View>
          ))}
        </View>
      </CardContent>
    </Card>
  );
}

export default InfluencerAnalytics;

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.lg,
  },
  // grid grid-cols-2 md:grid-cols-5 → use 48% width for 2 cols on mobile.
  // RN has no media queries here; mobile-first 2-col layout matches phone UX.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 4,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  value: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  label: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
});
