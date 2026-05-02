// AthleteHeroContent — RN port of Lovable src/components/landing/AthleteHeroContent.tsx.
// Verbatim copy/text. Web `text-gradient-gold` rendered with MaskedView+LinearGradient.
// Animations (`animate-fade-in`/`animate-slide-up`) approximated with simple Animated opacity.
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Trophy, UserCircle } from 'lucide-react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { PatentPendingBadge } from '@/components/ui/PatentPendingBadge';
import { colors, typography, spacing, radius, gradients } from '@/lib/theme';
import { SportType, getSportConfig, getSampleAthletePath } from '@/lib/data/sports';
import { useAuth } from '@/hooks/useAuth';

interface AthleteHeroContentProps {
  selectedSport: SportType;
  sportConfig: ReturnType<typeof getSportConfig>;
}

export function AthleteHeroContent({ selectedSport, sportConfig }: AthleteHeroContentProps) {
  const { isAuthenticated } = useAuth();
  const nav = useNavigation<any>();

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <View style={s.wrap}>
      {/* Badge - sport specific */}
      <Animated.View style={[s.badge, { opacity: fade }]}>
        <Trophy width={16} height={16} color={colors.primary} />
        <Text style={s.badgeText}>{sportConfig.tagline}</Text>
      </Animated.View>

      {/* Main headline */}
      <Animated.View style={{ opacity: fade, marginBottom: spacing.lg }}>
        <Text style={s.headline}>
          <Text style={s.headlineFg}>GET</Text>
          <GradientWord text=" RECRUITED." />
        </Text>
        <Text style={s.headline}>
          <Text style={s.headlineFg}>GET</Text>
          <GradientWord text=" NOTICED." />
        </Text>
      </Animated.View>

      <Text style={s.lead}>
        The only recruiting platform that uses{' '}
        <Text style={s.leadHighlight}>patent-pending artificial intelligence</Text>{' '}
        to maximize your chances of getting recruited.
      </Text>

      <Text style={s.subLead}>{sportConfig.description}</Text>

      <View style={s.badgeRow}>
        <PatentPendingBadge size="md" />
      </View>

      {/* CTA — only show sample profile for unauthenticated users */}
      {!isAuthenticated && (
        <View style={s.ctaRow}>
          <Button
            variant="ghost"
            size="xl"
            leftIcon={<UserCircle width={20} height={20} color={colors.mutedForeground} />}
            onPress={() => nav.navigate('PublicProfileStack' as any, { screen: 'PublicProfile', params: { slug: getSampleAthletePath(selectedSport).replace('/athlete/', '') } })}
          >
            Sample Profile
          </Button>
        </View>
      )}
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

export default AthleteHeroContent;

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
  subLead: {
    fontFamily: typography.fontFamily.body,
    fontSize: 17,
    color: 'rgba(128,136,151,0.8)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 480,
  },
  badgeRow: { alignItems: 'center', marginBottom: spacing.lg },
  ctaRow: { alignItems: 'center', marginTop: spacing.sm },
});
