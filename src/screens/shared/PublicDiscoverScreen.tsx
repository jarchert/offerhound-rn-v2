// PublicDiscoverScreen - Build 34: 10-tile public browse hub.
// Mirrors Lovable public nav surfaces for unauthenticated users.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { Users, Search, Building2, Tent, Newspaper, Mic, Star, Sparkles, Trophy, DollarSign } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '@/lib/theme';

const TILES = [
  { label: 'Browse Coaches',   desc: 'Find college coaches by sport, division and conference', accent: '#3b82f6',  Icon: Users,      route: 'CoachDirectory' },
  { label: 'Browse Athletes',  desc: 'Discover high school athletes seeking recruitment',    accent: '#10b981', Icon: Search,     route: 'AthleteSearch' },
  { label: 'Scout Agencies',   desc: 'Explore independent scouts and recruiting agencies',   accent: '#f59e0b', Icon: Building2,  route: 'ScoutDirectory' },
  { label: 'Camp Discovery',   desc: 'Find prospect camps, showcases and clinics near you',  accent: '#c9a84c', Icon: Tent,       route: 'CampStack' },
  { label: 'News and Learn',   desc: 'Recruiting news, NIL updates and how-to guides',       accent: '#8b5cf6', Icon: Newspaper,  route: 'NILIntelligence' },
  { label: 'Podcasts',         desc: 'Recruiting insider podcasts and interviews',            accent: '#ec4899', Icon: Mic,        route: 'PodcastsTab' },
  { label: 'Influencers',      desc: 'Sports media creators covering high school recruiting', accent: '#f97316', Icon: Star,       route: 'InfluencerBoard' },
  { label: 'NIL Intelligence', desc: 'AI-powered NIL deal insights and trends',               accent: '#22c55e', Icon: Sparkles,   route: 'NILIntelligence' },
  { label: 'Sample Athlete',   desc: 'See what a full athlete profile looks like',             accent: '#d97706', Icon: Trophy,     route: 'SampleAthlete' },
  { label: 'Pricing',          desc: 'See plans and features for athletes, coaches and scouts',accent: '#64748b', Icon: DollarSign, route: 'Pricing' },
] as const;

export default function PublicDiscoverScreen() {
  const nav = useNavigation<any>();

  const goTo = (route: string) => {
    try {
      if (route === 'PodcastsTab') {
        // PodcastsTab is a sibling tab in PublicTabs (BottomTabNavigator).
        // PublicDiscoverScreen is a direct tab child, so nav IS already scoped
        // to the tab navigator — nav.navigate() switches the active tab directly.
        nav.navigate('PodcastsTab' as any);
        return;
      }
      nav.navigate(route as any);
    } catch (e) {
      // Log navigation failures in dev so broken tile routes surface immediately.
      if (__DEV__) console.warn('[PublicDiscoverScreen] navigate failed for route:', route, e);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Explore OfferHound</Text>
          <Text style={styles.sub}>
            Browse the full recruiting platform. Sign up to unlock everything.
          </Text>
        </View>

        <View style={styles.grid}>
          {TILES.map((tile) => (
            <Pressable
              key={tile.label}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              onPress={() => goTo(tile.route)}
            >
              <View style={[styles.iconWrap, { backgroundColor: tile.accent + '20' }]}>
                <tile.Icon size={24} color={tile.accent} />
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
              <Text style={styles.tileDesc}>{tile.desc}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>Ready to get recruited?</Text>
          <Pressable style={styles.ctaBtn} onPress={() => goTo('SignUp')}>
            <Text style={styles.ctaBtnText}>Create Free Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  header: { marginBottom: spacing.xl },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  sub: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  tile: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tilePressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  tileLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  tileDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.mutedForeground,
    lineHeight: 15,
  },
  cta: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
  },
  ctaBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
  },
  ctaBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: '#ffffff',
  },
});
