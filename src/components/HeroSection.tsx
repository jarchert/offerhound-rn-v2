// HeroSection — RN port of Lovable src/components/HeroSection.tsx (verbatim).
// Layout: full-screen hero with dark gradient bg, ghosted action image on the
// right, decorative blurred orbs, profile image + content (name, badge, stats,
// school, CTAs). Web Tailwind classes mapped to StyleSheet using @/lib/theme.
// Web→RN mappings:
//   • bg-gradient-dark           → <LinearGradient> (gradients.dark)
//   • text-gradient-gold         → <MaskedView>+<LinearGradient> (gradients.gold)
//   • lucide-react               → lucide-react-native
//   • react-router useNavigate   → @react-navigation/native useNavigation
//   • <img>                      → <Image>
//   • shadcn <Button>            → @/components/ui/Button
//   • blur-3xl on decorative orbs is approximated with low-opacity gold fill
//     (RN has no first-class CSS blur on a non-image View).
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Animated,
  Linking,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Play, Trophy } from 'lucide-react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, radius, gradients, shadows } from '@/lib/theme';
import { ATHLETE_ACTION_IMG } from '@/lib/assets';

// Local type — mirrors the fields HeroSection reads from PlayerProfile in
// Lovable (see src/hooks/usePlayerProfile.ts). Kept loose to match the web app
// which passes raw Supabase rows.
export interface PlayerProfile {
  full_name?: string | null;
  position?: string | null;
  graduation_year?: string | number | null;
  height?: string | null;
  weight?: string | null;
  arm_length?: string | null;
  forty_yard?: string | number | null;
  gpa?: string | number | null;
  school?: string | null;
  city?: string | null;
  state?: string | null;
  hudl_url?: string | null;
  profile_image_url?: string | null;
  hero_background_image_url?: string | null;
  action_image_url?: string | null;
}

interface HeroSectionProps {
  isOwnerView?: boolean;
  profile?: PlayerProfile;
}

export function HeroSection({ isOwnerView = true, profile }: HeroSectionProps) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isLg = width >= 1024; // Tailwind `lg:` breakpoint
  const isMd = width >= 768;  // Tailwind `md:` breakpoint
  const isSm = width >= 640;  // Tailwind `sm:` breakpoint

  const goToCoaches = () => {
    // Mirrors Lovable: navigate("/activity", { state: { scrollTo: "coaches-section" } }).
    navigation.navigate('CoachDirectory' as never);
  };

  // Fallback values for when profile is not provided
  const name = profile?.full_name || 'Athlete';
  const nameParts = name.split(' ');
  const firstName = nameParts[0] || 'Athlete';
  const lastName = nameParts.slice(1).join(' ') || '';
  const position = profile?.position || 'Athlete';
  const classYear = profile?.graduation_year || '20XX';
  const height = profile?.height || '-';
  const weight = profile?.weight || '-';
  const armLength = profile?.arm_length;
  const fortyYard = profile?.forty_yard;
  const gpa = profile?.gpa || '-';
  const school = profile?.school || 'High School';
  const city = profile?.city || 'City';
  const state = profile?.state || 'State';
  const rawHudlUrl = profile?.hudl_url;
  // Ensure URL has a protocol to prevent 404 from relative path navigation
  const hudlUrl =
    rawHudlUrl && !rawHudlUrl.startsWith('http') ? `https://${rawHudlUrl}` : rawHudlUrl;
  const profileImage = profile?.profile_image_url;

  // Animation refs (animate-fade-in / animate-slide-up / animate-bounce).
  const fadeProfile = useRef(new Animated.Value(0)).current;
  const fadeBadge = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const fadeHead = useRef(new Animated.Value(0)).current;
  const fadeStats = useRef(new Animated.Value(0)).current;
  const fadeSchool = useRef(new Animated.Value(0)).current;
  const fadeCtas = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeProfile, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeBadge, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeHead, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeStats, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeSchool, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeCtas, {
        toValue: 1,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous bounce for the scroll indicator (animate-bounce).
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -8, duration: 500, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ).start();
  }, [fadeProfile, fadeBadge, fadeHead, slideUp, fadeStats, fadeSchool, fadeCtas, bounce]);

  // Headline sizes — Tailwind text-5xl / md:text-7xl / lg:text-8xl.
  const headlineSize = isLg ? 96 : isMd ? 72 : 48;
  // Profile image — w-64 h-64 / md:w-80 md:h-80.
  const avatarSize = isMd ? 320 : 256;
  // Layout direction
  const flexRow = isLg;
  const textAlignStyle = isLg ? 'left' : 'center';
  const justifyContent = isLg ? 'flex-start' : 'center';

  const heroBgSource = profile?.hero_background_image_url
    ? { uri: profile.hero_background_image_url }
    : profile?.action_image_url
    ? { uri: profile.action_image_url }
    : ATHLETE_ACTION_IMG;

  const initials = nameParts.map((n) => n[0] || '').join('');

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.section}>
        {/* Background gradient (bg-gradient-dark) */}
        <LinearGradient
          colors={gradients.dark}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Ghosted action image on right side (w-1/2, opacity 0.225, blur ~1px). */}
        <View style={s.ghostWrap} pointerEvents="none">
          <Image source={heroBgSource} style={s.ghostImg} resizeMode="cover" />
          {/* bg-gradient-to-l from-transparent via-background/50 to-background */}
          <LinearGradient
            colors={['transparent', 'rgba(16,19,24,0.5)', colors.background]}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Decorative blurred orbs (top-left primary/10, bottom-right primary/5).
            Lovable web uses `blur-3xl` which makes these nearly invisible soft glows.
            RN has no blur-3xl equivalent on plain Views, so rendering them as solid
            circles at even ~5–10% opacity produces a harsh "two yellow circles" artifact.
            Removed on mobile: the dark gradient bg already provides sufficient depth. */}

        {/* Container */}
        <View style={s.container}>
          <View
            style={[
              s.row,
              { flexDirection: flexRow ? 'row' : 'column', alignItems: 'center' },
            ]}
          >
            {/* Profile Image */}
            <Animated.View style={[s.avatarBlock, { opacity: fadeProfile }]}>
              <View>
                <View
                  style={[
                    s.avatarFrame,
                    { width: avatarSize, height: avatarSize },
                  ]}
                >
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      style={s.avatarImg}
                      resizeMode="cover"
                      accessibilityLabel={`${name} - ${position}`}
                    />
                  ) : (
                    <View style={s.avatarFallback}>
                      <Text style={s.avatarInitials}>{initials}</Text>
                    </View>
                  )}
                </View>
                {/* Decorative accent (offset border) */}
                <View
                  style={[
                    s.avatarAccent,
                    { width: avatarSize, height: avatarSize },
                  ]}
                />
              </View>
            </Animated.View>

            {/* Content */}
            <View
              style={[
                s.contentBlock,
                {
                  alignItems: isLg ? 'flex-start' : 'center',
                },
              ]}
            >
              {/* Badge */}
              <Animated.View style={[s.badge, { opacity: fadeBadge }]}>
                <Trophy width={16} height={16} color={colors.primary} />
                <Text style={s.badgeText}>
                  Class of {classYear} • {position}
                </Text>
              </Animated.View>

              {/* Main headline */}
              <Animated.View
                style={{
                  opacity: fadeHead,
                  transform: [{ translateY: slideUp }],
                  marginBottom: spacing.lg,
                  alignItems: isLg ? 'flex-start' : 'center',
                }}
              >
                <Text
                  style={[
                    s.headline,
                    { fontSize: headlineSize, color: colors.foreground, textAlign: textAlignStyle },
                  ]}
                >
                  {firstName}
                </Text>
                {/* text-gradient-gold for last name */}
                <MaskedView
                  maskElement={
                    <Text
                      style={[
                        s.headline,
                        {
                          fontSize: headlineSize,
                          backgroundColor: 'transparent',
                          textAlign: textAlignStyle,
                        },
                      ]}
                    >
                      {lastName || 'Athlete'}
                    </Text>
                  }
                >
                  <LinearGradient
                    colors={gradients.gold}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text
                      style={[
                        s.headline,
                        {
                          fontSize: headlineSize,
                          opacity: 0,
                          textAlign: textAlignStyle,
                        },
                      ]}
                    >
                      {lastName || 'Athlete'}
                    </Text>
                  </LinearGradient>
                </MaskedView>
              </Animated.View>

              {/* Stats row */}
              <Animated.View
                style={[
                  s.statsRow,
                  {
                    opacity: fadeStats,
                    justifyContent: isLg ? 'flex-start' : 'center',
                  },
                ]}
              >
                <View style={s.stat}>
                  <Text style={s.statValue}>{height}</Text>
                  <Text style={s.statLabel}>HEIGHT</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statValue}>{weight}</Text>
                  <Text style={s.statLabel}>WEIGHT</Text>
                </View>
                {armLength ? (
                  <View style={s.stat}>
                    <Text style={s.statValue}>{armLength}</Text>
                    <Text style={s.statLabel}>ARM LENGTH</Text>
                  </View>
                ) : null}
                {fortyYard ? (
                  <View style={s.stat}>
                    <Text style={s.statValue}>{fortyYard}s</Text>
                    <Text style={s.statLabel}>40-YARD</Text>
                  </View>
                ) : null}
                <View style={s.stat}>
                  <Text style={s.statValue}>{gpa}</Text>
                  <Text style={s.statLabel}>GPA</Text>
                </View>
              </Animated.View>

              {/* School info */}
              <Animated.Text
                style={[
                  s.school,
                  { opacity: fadeSchool, textAlign: textAlignStyle },
                ]}
              >
                {school} • {city}, {state}
              </Animated.Text>

              {/* CTA buttons */}
              <Animated.View
                style={[
                  s.ctaRow,
                  {
                    opacity: fadeCtas,
                    flexDirection: isSm ? 'row' : 'column',
                    justifyContent,
                  },
                ]}
              >
                {isOwnerView && (
                  <View style={{ alignItems: 'center' }}>
                    <Button variant="hero" size="xl" onPress={goToCoaches}>
                      Find Coaches
                    </Button>
                    {/* Scroll indicator — bouncing ChevronDown under the button */}
                    <Pressable onPress={goToCoaches} style={{ marginTop: spacing.md }}>
                      <Animated.View style={{ transform: [{ translateY: bounce }] }}>
                        <ChevronDown
                          width={32}
                          height={32}
                          color={colors.mutedForeground}
                        />
                      </Animated.View>
                    </Pressable>
                  </View>
                )}
                {hudlUrl ? (
                  <Button
                    variant="outline"
                    size="xl"
                    onPress={() => Linking.openURL(hudlUrl)}
                    leftIcon={<Play width={20} height={20} color={colors.foreground} />}
                  >
                    Watch Highlights
                  </Button>
                ) : null}
              </Animated.View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export default HeroSection;

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  section: {
    minHeight: 700, // RN proxy for "min-h-screen" in a scrollable hero.
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostWrap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    overflow: 'hidden',
  },
  ghostImg: {
    width: '100%',
    height: '100%',
    opacity: 0.225,
    // RN does not support CSS `blur(1px)` on arbitrary Views; the alpha + dark
    // gradient overlay below are the closest visual proxy.
  },
  // Decorative orbs — primary/10 and primary/5 at very low opacity to mimic
  // the blurred halos in Lovable. RN cannot blur a plain View so we use solid
  // gold at low opacity which renders as a soft glow against the dark bg.
  orbTopLeft: {
    position: 'absolute',
    top: 80,
    left: 40,
    width: 288,
    height: 288,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
  orbBottomRight: {
    position: 'absolute',
    bottom: 80,
    right: 40,
    width: 384,
    height: 384,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    opacity: 0.05,
  },
  container: {
    position: 'relative',
    zIndex: 10,
    paddingHorizontal: 24,
    paddingVertical: 80,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  row: {
    width: '100%',
    maxWidth: 1024,
    alignSelf: 'center',
    gap: 48,
  },
  avatarBlock: { flexShrink: 0 },
  avatarFrame: {
    borderRadius: radius.xl + 6, // ~rounded-2xl (1rem)
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(231, 175, 8, 0.3)', // border-primary/30
    ...shadows.card,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 60, // text-6xl
    color: colors.mutedForeground,
  },
  avatarAccent: {
    position: 'absolute',
    bottom: -12,
    right: -12,
    borderWidth: 4,
    borderColor: 'rgba(231, 175, 8, 0.2)', // border-primary/20
    borderRadius: radius.xl + 6,
    zIndex: -1,
  },
  contentBlock: { flex: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: 9999,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.secondaryForeground,
  },
  headline: {
    fontFamily: typography.fontFamily.heading,
    lineHeight: undefined, // leading-none — RN headline lines render tightly by default.
    letterSpacing: typography.letterSpacing.heading,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginBottom: spacing.xl,
  },
  stat: { alignItems: 'center' },
  statValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1.2, // tracking-wider
  },
  school: {
    fontSize: typography.fontSize.lg,
    color: colors.mutedForeground,
    marginBottom: spacing.xl,
    fontFamily: typography.fontFamily.body,
  },
  ctaRow: {
    gap: 16,
    alignItems: 'center',
  },
});
