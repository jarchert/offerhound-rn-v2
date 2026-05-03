import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

// Build 51 C1: make `children` optional so callers that pass content via
// JSX children inference compile cleanly under TS strict.
type ViewWrap = { children?: React.ReactNode; style?: ViewStyle | ViewStyle[] };
type TextWrap = { children?: React.ReactNode; style?: TextStyle | TextStyle[] };

export function Card({ children, style }: ViewWrap) {
  return <View style={[s.card, style as any]}>{children}</View>;
}

export function CardHeader({ children, style }: ViewWrap) {
  return <View style={[s.header, style as any]}>{children}</View>;
}

export function CardTitle({ children, style }: TextWrap) {
  return <Text style={[s.title, style as any]}>{children}</Text>;
}

export function CardDescription({ children, style }: TextWrap) {
  return <Text style={[s.description, style as any]}>{children}</Text>;
}

export function CardContent({ children, style }: ViewWrap) {
  return <View style={[s.content, style as any]}>{children}</View>;
}

export function CardFooter({ children, style }: ViewWrap) {
  return <View style={[s.footer, style as any]}>{children}</View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { padding: spacing.md, gap: 4 },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  description: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  content: { padding: spacing.md, paddingTop: 0 },
  footer: { padding: spacing.md, paddingTop: 0, flexDirection: 'row', alignItems: 'center' },
});
