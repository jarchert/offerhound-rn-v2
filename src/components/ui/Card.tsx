import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function CardHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.header, style]}>{children}</View>;
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.title, style]}>{children}</Text>;
}

export function CardDescription({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.description, style]}>{children}</Text>;
}

export function CardContent({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.content, style]}>{children}</View>;
}

export function CardFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.footer, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { padding: spacing.md, gap: 4 },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  description: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  content: { padding: spacing.md, paddingTop: 0 },
  footer: { padding: spacing.md, paddingTop: 0, flexDirection: 'row', alignItems: 'center' },
});
