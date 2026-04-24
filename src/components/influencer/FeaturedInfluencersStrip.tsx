// Ported verbatim from Lovable web (offerhound-repo/src/components/influencer/FeaturedInfluencersStrip.tsx).
// RN adaptations:
//   - <section>/<div> → <View>; tailwind classes → StyleSheet
//   - horizontal overflow strip → <ScrollView horizontal>
//   - react-router <Link to> → Pressable + useNavigation().navigate('Influencers')
//   - lucide-react → lucide-react-native
//   - shadcn <Button asChild> → Pressable with ghost styling
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Star, ArrowRight } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';
import { InfluencerMatchCard } from '@/components/influencer/InfluencerMatchCard';

/**
 * Compact horizontal-scroll strip of recently active verified influencers.
 * Drops onto landing/news pages for discovery.
 */
export function FeaturedInfluencersStrip({ limit = 8 }: { limit?: number }) {
  const nav = useNavigation<any>();
  const { data: influencers = [], isLoading } = useQuery({
    queryKey: ['featured-influencers', limit],
    queryFn: async () => {
      const { data } = await supabase
        .from('influencer_profiles' as any)
        .select('id, handle, display_name, profile_image_url, primary_sport, affiliation_type, bio')
        .eq('verification_status', 'verified')
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data || []) as any[];
    },
  });

  if (isLoading || influencers.length === 0) return null;

  return (
    <View style={s.section}>
      <View style={s.container}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.eyebrowRow}>
              <Star width={16} height={16} color={colors.primary} />
              <Text style={s.eyebrow}>Featured Voices</Text>
            </View>
            <Text style={s.title}>Hear it from people who've been there.</Text>
          </View>
          <Pressable
            onPress={() => nav.navigate('Influencers')}
            style={({ pressed }) => [s.viewAllBtn, pressed && s.viewAllBtnPressed]}
          >
            <Text style={s.viewAllText}>View all</Text>
            <ArrowRight width={16} height={16} color={colors.foreground} style={s.viewAllIcon} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          snapToAlignment="start"
          decelerationRate="fast"
        >
          {influencers.map((inf) => (
            <View key={inf.id} style={s.cardSlot}>
              <InfluencerMatchCard influencer={inf} variant="full" />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

export default FeaturedInfluencersStrip;

const s = StyleSheet.create({
  // <section className="py-10 md:py-14 border-t bg-muted/20">
  section: {
    paddingVertical: spacing.xl + spacing.sm, // ~py-10
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.muted, // bg-muted/20 — RN can't easily do /20; muted is already low-contrast
  },
  // <div className="container px-4 md:px-6 max-w-6xl">
  container: {
    paddingHorizontal: spacing.md,
    maxWidth: 1152,
    width: '100%',
    alignSelf: 'center',
  },
  // <div className="flex items-end justify-between mb-5 gap-4">
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md + spacing.xs, // mb-5
    gap: spacing.md,
  },
  headerLeft: { flexShrink: 1 },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 4, // gap-2
    marginBottom: 6, // mb-1.5
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  // h2 font-display text-2xl md:text-3xl
  title: {
    fontFamily: typography.fontFamily.heading,
    color: colors.foreground,
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.fontSize['2xl'] * 1.2,
  },
  // ghost Button
  viewAllBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 6,
  },
  viewAllBtnPressed: { backgroundColor: colors.secondary },
  viewAllText: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
  },
  viewAllIcon: { marginLeft: 6 }, // ml-1.5
  // overflow-x-auto pb-3 -mx-4 px-4 → ScrollView contentContainer
  scrollContent: {
    gap: spacing.sm + 4, // gap-3
    paddingBottom: spacing.sm + 4,
    paddingRight: spacing.md, // give last card breathing room
  },
  // w-[280px] md:w-[320px] — pick mobile width (280)
  cardSlot: {
    width: 280,
    flexShrink: 0,
  },
});
