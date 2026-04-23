// Placeholder screen for routes that will be fully implemented in later sessions.
// Renders a centered message indicating which session will land the real screen.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface PlaceholderScreenProps {
  title: string;
  session: string;
  note?: string;
}

export function PlaceholderScreen({ title, session, note }: PlaceholderScreenProps) {
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.eyebrow}>COMING SOON</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.session}>{session}</Text>
        {note ? <Text style={s.note}>{note}</Text> : null}
      </View>
    </ScrollView>
  );
}

/** Factory: create a named placeholder screen component in one line. */
export function makePlaceholder(title: string, session: string, note?: string) {
  const Screen = () => <PlaceholderScreen title={title} session={session} note={note} />;
  Screen.displayName = `Placeholder(${title})`;
  return Screen;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  session: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  note: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default PlaceholderScreen;
