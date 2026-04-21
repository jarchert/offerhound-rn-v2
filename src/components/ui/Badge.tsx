import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const variantStyle = variantStyles[variant];
  const textColor = variantTextColors[variant];
  return (
    <View style={[s.badge, variantStyle, style]}>
      <Text style={[s.text, { color: textColor }]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs },
});

const variantStyles: Record<BadgeVariant, ViewStyle> = {
  default: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  destructive: { backgroundColor: colors.destructive },
  outline: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  success: { backgroundColor: colors.success || '#10b981' },
  warning: { backgroundColor: colors.warning || '#f59e0b' },
};

const variantTextColors: Record<BadgeVariant, string> = {
  default: colors.primaryForeground,
  secondary: colors.secondaryForeground,
  destructive: colors.destructiveForeground,
  outline: colors.foreground,
  success: '#ffffff',
  warning: '#000000',
};
