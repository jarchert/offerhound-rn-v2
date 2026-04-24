// RN port of Lovable src/components/FounderRibbon.tsx.
// Gold-tinted banner with the founder quote and link to the full story.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Heart, ArrowRight } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

export function FounderRibbon() {
  const nav = useNavigation<any>();
  return (
    <View style={s.section}>
      <View style={s.container}>
        <View style={s.badge}>
          <Heart size={12} color={colors.primary} />
          <Text style={s.badgeText}>From Our Founder</Text>
        </View>
        <Text style={s.quote}>
          "I started OfferHound™ because I saw my son's dream slip away in a moment&mdash;and learned the recruiting
          system wasn't built for what comes after adversity. Every athlete deserves a real shot to be seen."
        </Text>
        <Pressable
          onPress={() => nav.navigate('FounderMessage' as never)}
          style={({ pressed }) => [s.ctaRow, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.ctaText}>Read the Full Story</Text>
          <ArrowRight size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    paddingVertical: spacing.xl,
    backgroundColor: 'rgba(231, 175, 8, 0.08)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(231, 175, 8, 0.2)',
  },
  container: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    maxWidth: 720,
    alignSelf: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(231, 175, 8, 0.1)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  quote: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ctaText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.primary,
  },
});
