// SportPickerScreen — single-screen replacement for Lovable's 13 individual sport landings.
// LOCKED DECISION (Session 0): one picker → filtered public athlete directory.
// Part 42 of the conversion guide describes public discovery; we diverge from 13
// landings to one picker for product velocity.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '@/lib/theme';
import { SPORTS_CONFIG } from '@/lib/data/sports';

import { BackButton } from '@/components/BackButton';
// Build picker list from SPORTS_CONFIG — the single source of truth for all 13 sports.
const SPORTS = Object.values(SPORTS_CONFIG).map(s => ({
  id: s.id,
  label: s.name,
  emoji: EMOJI_MAP[s.id] ?? '🏃',
}));

const EMOJI_MAP: Record<string, string> = {
  football: '🏈',
  basketball: '🏀',
  baseball: '⚾',
  softball: '🥎',
  soccer: '⚽',
  volleyball: '🏐',
  lacrosse: '🥍',
  'track-field': '🏃',
  wrestling: '🤼',
  swimming: '🏊',
  tennis: '🎾',
  golf: '⛳',
  hockey: '🏒',
  cheerleading: '💃',
};

export default function SportPickerScreen() {
  const navigation = useNavigation<any>();
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <BackButton />
      <View style={s.header}>
        {/* parity/2026-04-29 #12 — use square transparent mark (was wordmark,
            which rendered cropped + haloed on the Discover picker). */}
        <Image source={require('../../../assets/logo-mark.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.eyebrow}>DISCOVER</Text>
        <Text style={s.title}>Pick your sport</Text>
        <Text style={s.subtitle}>
          Browse athletes, coaches, and camps in your discipline.
        </Text>
      </View>

      <View style={s.grid}>
        {SPORTS.map((sport) => (
          <Pressable
            key={sport.id}
            style={s.card}
            onPress={() => navigation.navigate('AthleteSearch' as any, { sport: sport.id })}>
            <Text style={s.emoji}>{sport.emoji}</Text>
            <Text style={s.cardLabel}>{sport.label}</Text>
            <Text style={s.cardCta}>Explore →</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { width: 96, height: 96, marginBottom: spacing.md, backgroundColor: 'transparent' },
  eyebrow: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h1,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.foregroundSubtle,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 130,
    justifyContent: 'center',
  },
  emoji: { fontSize: 44, marginBottom: spacing.sm },
  cardLabel: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h4,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  cardCta: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
});
