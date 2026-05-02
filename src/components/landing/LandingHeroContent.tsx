// RN port of Lovable src/components/landing/AthleteHeroContent.tsx +
// src/components/landing/CoachHeroContent.tsx merged into one parameterised component.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Trophy, UserCircle, Search, Users, Shield } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, radius } from '@/lib/theme';
import { SportType, getSportConfig } from '@/lib/data/sports';

type ViewerType = 'athlete' | 'coach';

interface LandingHeroContentProps {
  viewerType: ViewerType;
  selectedSport: SportType;
  isAuthenticated: boolean;
}

export function LandingHeroContent({
  viewerType,
  selectedSport,
  isAuthenticated,
}: LandingHeroContentProps) {
  const nav = useNavigation<any>();
  const cfg = getSportConfig(selectedSport);

  if (viewerType === 'athlete') {
    return (
      <View>
        <View style={s.badge}>
          <Trophy size={14} color={colors.primary} />
          <Text style={s.badgeText}>{cfg.tagline}</Text>
        </View>

        <Text style={s.h1}>
          <Text>GET</Text><Text style={s.goldText}> RECRUITED.{'\n'}</Text>
          <Text>GET</Text><Text style={s.goldText}> NOTICED.</Text>
        </Text>

        <Text style={s.subtitle}>
          The only recruiting platform that uses{' '}
          <Text style={s.goldBold}>patent-pending artificial intelligence</Text>{' '}
          to maximize your chances of getting recruited.
        </Text>

        <Text style={s.description}>{cfg.description}</Text>

        <View style={s.patentPendingRow}>
          <View style={s.ppBadgeLarge}>
            <Text style={s.ppBadgeLargeText}>PATENT PENDING</Text>
          </View>
        </View>

        {!isAuthenticated && (
          <View style={s.ctas}>
            <Button
              variant="ghost"
              size="xl"
              onPress={() => nav.navigate('PublicProfileStack' as never, { screen: 'SampleAthlete', params: { sport: selectedSport } } as never)}
              leftIcon={<UserCircle size={20} color={colors.foregroundSubtle} />}
              textStyle={{ color: colors.foregroundSubtle }}
            >
              Sample Profile
            </Button>
          </View>
        )}
      </View>
    );
  }

  // Coach / Scout
  return (
    <View>
      <View style={s.badge}>
        <Search size={14} color={colors.primary} />
        <Text style={s.badgeText}>For Coaches & Scouts</Text>
      </View>

      <Text style={s.h1}>
        <Text>FIND YOUR{'\n'}</Text>
        <Text style={s.goldText}>NEXT RECRUIT.</Text>
      </Text>

      <Text style={s.subtitle}>
        Search our growing database of{' '}
        <Text style={s.goldBold}>{cfg.name.toLowerCase()} athletes</Text>{' '}
        by position, traits, intangibles, and academic fit using{' '}
        <Text style={s.goldBold}>patent-pending AI</Text>.
      </Text>

      <Text style={s.description}>
        Build your recruiting board, save prospects, and connect directly with athletes and
        families—all for free.
      </Text>

      <View style={s.patentPendingRow}>
        <View style={s.ppBadgeLarge}>
          <Text style={s.ppBadgeLargeText}>PATENT PENDING</Text>
        </View>
      </View>

      <View style={s.ctas}>
        <Button
          variant="hero"
          size="xl"
          onPress={() => nav.navigate('AthleteSearch' as never)}
          leftIcon={<Search size={20} color={colors.primaryForeground} />}
        >
          Search Athletes
        </Button>
        {!isAuthenticated && (
          <>
            <Button
              variant="outline"
              size="xl"
              onPress={() => nav.navigate('OnboardingStack' as never, { screen: 'CoachOnboarding' } as never)}
              leftIcon={<Users size={20} color={colors.foreground} />}
            >
              Register as Coach
            </Button>
            <Button
              variant="ghost"
              size="xl"
              onPress={() => nav.navigate('OnboardingStack' as never, { screen: 'ScoutOnboarding' } as never)}
              leftIcon={<Shield size={20} color={colors.foregroundSubtle} />}
              textStyle={{ color: colors.foregroundSubtle }}
            >
              Register as Scout
            </Button>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    marginBottom: spacing.xl,
    alignSelf: 'center',
  },
  badgeText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.secondaryForeground,
  },
  h1: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 56,
    lineHeight: 56,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.heading,
    marginBottom: spacing.md,
  },
  goldText: { color: colors.primary },
  goldBold: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primary,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xl,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    lineHeight: typography.fontSize.xl * typography.lineHeight.relaxed,
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    opacity: 0.8,
    marginBottom: spacing.lg,
  },
  patentPendingRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ppBadgeLarge: {
    backgroundColor: 'rgba(231, 175, 8, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(231, 175, 8, 0.3)',
  },
  ppBadgeLargeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    letterSpacing: 1,
  },
  ctas: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
