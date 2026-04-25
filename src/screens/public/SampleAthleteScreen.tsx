// Ported from Lovable web src/pages/SampleAthlete.tsx (124 LOC).
// Web → RN translation:
//   - <Link to="/auth"> → useNavigation().navigate('Auth')
//   - lucide-react → lucide-react-native
//   - <Card>/<Badge>/<Button> mapped to RN @/components/ui
//   - SEO is a no-op shim (RN has no <head>); kept for parity.
//   - PORT-PENDING: web imports `marcus-johnson-family.jpg` asset; RN port omits
//     the bundled image (left as empty string); HeroSection handles fallback.
//     Tracked under session-parity-port.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';

import { useAuth } from '@/hooks/useAuth';
import { HeroSection } from '@/components/HeroSection';
import { AthleteProfile } from '@/components/AthleteProfile';
import { Footer } from '@/components/Footer';
import { BackButton } from '@/components/BackButton';
import SEO from '@/components/SEO';
import { Badge, Button } from '@/components/ui';
import { colors, typography, spacing } from '@/lib/theme';

const marcusProfile = {
  full_name: 'Marcus Johnson',
  position: 'Wide Receiver',
  school: 'Lincoln High School',
  graduation_year: '2025',
  city: 'Dallas',
  state: 'TX',
  height: '6\'2"',
  weight: '195 lbs',
  gpa: '3.8',
  forty_yard: '4.48',
  arm_length: '32"',
  vertical: '36"',
  sport: 'Football',
  bio: 'Dual-threat wide receiver with elite route-running ability and sure hands. Team captain and honor roll student dedicated to excellence on and off the field. Known for making clutch catches in big moments and leading by example in the weight room and film room.',
  what_makes_me_special:
    'My combination of speed, body control, and football IQ sets me apart. I study film like a coach and run routes with precision that creates consistent separation. My hands are reliable in traffic and I\'m at my best when the game is on the line.',
  my_family:
    'I come from a family that lives and breathes sports. My dad played college football at Texas A&M and my mom ran track at Baylor. My younger sister is a rising volleyball star. Family dinners always end up as game-film sessions. They\'ve been my biggest supporters since day one.',
  why_i_love_football:
    'Football taught me discipline, brotherhood, and how to push through adversity. There\'s nothing like the Friday night lights, the roar of the crowd, and knowing your teammates have your back. Every snap is a chance to prove yourself and I live for that competition.',
  player_comparison: 'CeeDee Lamb',
  player_comparison_why:
    'Like CeeDee, I pride myself on route-running precision and the ability to win contested catches. I study his releases off the line and try to replicate his body control at the catch point. We share a similar build and I model my after-catch explosiveness after his game.',
  hudl_url: 'https://www.hudl.com',
  twitter_url: 'https://twitter.com',
  instagram_url: 'https://instagram.com',
  highlight_video_url: '',
  show_highlight_video: false,
  profile_image_url: '',
  hero_background_image_url: '',
  action_image_url: '',
  banner_image_url: '',
  family_image_url: '', // PORT-PENDING: bundled asset not yet ported
  player_comparison_image_url: '',
  custom_url: 'test-athlete',
  highlights: [
    '1st Team All-District WR (2024)',
    'District 6A Offensive MVP',
    '1,200+ receiving yards junior season',
    '14 touchdowns in 2024',
    '3x Player of the Week',
  ],
  traits: [
    'Elite Speed',
    'Route Precision',
    'Sure Hands',
    'Explosive Off the Line',
    'Red Zone Threat',
  ],
  intangibles: [
    'Team Captain',
    'Film Room Leader',
    'Coachable',
    'Clutch Performer',
    'High Motor',
  ],
  stats: [
    { season: '2024 (Junior)', games: 12, receptions: 78, yards: 1247, touchdowns: 14, note: 'All-District' },
    { season: '2023 (Sophomore)', games: 11, receptions: 52, yards: 840, touchdowns: 8 },
  ],
};

export default function SampleAthleteScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return (
    <View style={s.container}>
      <SEO
        title="Marcus Johnson - Sample Athlete Profile | OfferHound"
        description="See what an athlete profile looks like on OfferHound. View Marcus Johnson's full recruiting profile with stats, highlights, and more."
      />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.topBar}>
          <BackButton label="Back" />
          <Badge style={s.warnBadge}>⚠️ Sample Data — Not a Real Contact</Badge>
        </View>

        {/* Hero Section */}
        <HeroSection isOwnerView={false} profile={marcusProfile as any} />

        {/* Athlete Profile Section */}
        <AthleteProfile profile={marcusProfile as any} />

        {/* CTA for unauthenticated */}
        {!isAuthenticated && (
          <View style={s.cta}>
            <Text style={s.ctaTitle}>Want a Profile Like This?</Text>
            <Text style={s.ctaDesc}>
              Create your own professional recruiting profile and start
              connecting with college coaches today.
            </Text>
            <Button
              size="lg"
              onPress={() =>
                nav.dispatch(CommonActions.navigate({ name: 'Auth' as any }))
              }>
              Create Your Free Profile
            </Button>
          </View>
        )}

        <Footer />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  warnBadge: { alignSelf: 'flex-start' },
  cta: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 24,
    color: colors.foreground,
    textAlign: 'center',
  },
  ctaDesc: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
