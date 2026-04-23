// SportPickerScreen — single-screen replacement for Lovable's 13 individual sport landings.
// LOCKED DECISION (Session 0): one picker → filtered public athlete directory.
// Part 42 of the conversion guide describes public discovery; we diverge from 13
// landings to one picker for product velocity.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '@/lib/theme';

// The 13 sports Lovable supports. Hero backgrounds are stubbed to the Lovable
// hero for now; Session 6/8 can swap to per-sport assets.
const SPORTS = [
  { id: 'football',   label: 'Football',   emoji: '🏈' },
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'baseball',   label: 'Baseball',   emoji: '⚾' },
  { id: 'softball',   label: 'Softball',   emoji: '🥎' },
  { id: 'soccer',     label: 'Soccer',     emoji: '⚽' },
  { id: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { id: 'lacrosse',   label: 'Lacrosse',   emoji: '🥍' },
  { id: 'track',      label: 'Track & Field', emoji: '🏃' },
  { id: 'wrestling',  label: 'Wrestling',  emoji: '🤼' },
  { id: 'swimming',   label: 'Swimming',   emoji: '🏊' },
  { id: 'tennis',     label: 'Tennis',     emoji: '🎾' },
  { id: 'golf',       label: 'Golf',       emoji: '⛳' },
  { id: 'hockey',     label: 'Hockey',     emoji: '🏒' },
];

export default function SportPickerScreen() {
  const navigation = useNavigation<any>();
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Image source={require('../../assets/logo-wordmark.png')} style={s.logo} resizeMode="contain" />
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
            onPress={() => navigation.navigate('DiscoverTab', { sport: sport.id })}>
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
  logo: { width: 220, height: 70, marginBottom: spacing.md },
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
