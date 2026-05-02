// CoachHeroContent — RN port of Lovable src/components/landing/CoachHeroContent.tsx.
// Verbatim copy/text. Web `text-gradient-gold` rendered with MaskedView+LinearGradient.
// Animations (`animate-fade-in`/`animate-slide-up`) approximated with simple Animated opacity.
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, Users, Shield } from 'lucide-react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { PatentPendingBadge } from '@/components/ui/PatentPendingBadge';
import { colors, typography, spacing, radius, gradients } from '@/lib/theme';
import { SportType, getSportConfig } from '@/lib/data/sports';
import { useAuth } from '@/hooks/useAuth';

interface CoachHeroContentProps {
  selectedSport: SportType;
  sportConfig: ReturnType<typeof getSportConfig>;
}

export function CoachHeroContent({ selectedSport: _selectedSport, sportConfig }: CoachHeroContentProps) {
  const { isAuthenticated } = useAuth();
  const nav = useNavigation<any>();

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <View style={s.wrap}>
      {/* Badge */}
      <Animated.View style={[s.badge, { opacity: fade }]}>
        <Search width={16} height={16} color={colors.primary} />
        <Text style={s.badgeText}>For Coaches & Scouts</Text>
      </Animated.View>

      {/* Main headline */}
      <Animated.View style={{ opacity: fade, marginBottom: spacing.lg }}>
        <Text style={s.headline}>
          <Text style={s.headlineFg}>FIND YOUR</Text>
        </Text>
        <Text style={s.headline}>
          <GradientWord text="NEXT RECRUIT." />
        </Text>
      </Animated.View>

      <Text style={s.lead}>
        Search our growing database of{' '}
        <Text style={s.leadHighlight}>{sportConfig.name.toLowerCase()} athletes</Text>{' '}
        using <Text style={s.leadHighlight}>patent-pending AI</Text>.
      </Text>

      <View style={s.badgeRow}>
        <PatentPendingBadge size="md" />
      </View>

      <View style={s.ctaRow}>
        <Button
          variant="hero"
          size="xl"
          leftIcon={<Search width={20} height={20} color={colors.primaryForeground} />}
          onPress={() => nav.navigate('AthleteSearch' as never)}
        >
          Search Athletes
        </Button>

        {!isAuthenticated && (
          <>
            <Button
              variant="outline"
              size="xl"
              leftIcon={<Users width={20} height={20} color={colors.foreground} />}
              onPress={() => nav.navigate('OnboardingStack' as never, { screen: 'CoachOnboarding' } as never)}
            >
              Register as Coach
            </Button>
            <Button
              variant="ghost"
              size="xl"
              leftIcon={<Shield width={20} height={20} color={colors.mutedForeground} />}
              onPress={() => nav.navigate('OnboardingStack' as never, { screen: 'ScoutOnboarding' } as never)}
            >
              Register as Scout
            </Button>
          </>
        )}
      </View>
    </View>
  );
}

// Inline word with gold gradient — mirrors Lovable .text-gradient-gold span.
function GradientWord({ text }: { text: string }) {
  return (
    <MaskedView maskElement={<Text style={[s.headline, s.headlineFg]}>{text}</Text>}>
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[s.headline, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

export default CoachHeroContent;

const s = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.secondary, borderRadius: radius.full,
    marginBottom: spacing.xl,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.secondaryForeground,
    fontSize: typography.size.sm,
  },
  headline: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 56,
    lineHeight: 56,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.heading,
  },
  headlineFg: { color: colors.foreground },
  lead: {
    fontFamily: typography.fontFamily.body,
    fontSize: 20,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xs,
    maxWidth: 560,
  },
  leadHighlight: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  badgeRow: { alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.sm },
  ctaRow: { alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
});
