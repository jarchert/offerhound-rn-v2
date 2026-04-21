import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors, typography } from '@/lib/theme';

export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.label, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
});
