import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps {
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children, onPress, variant = 'default', size = 'default',
  disabled, loading, style, textStyle, leftIcon, rightIcon,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const textColor = variantTextColors[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.base,
        variantStyle,
        sizeStyle,
        (disabled || loading) && s.disabled,
        pressed && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={s.content}>
          {leftIcon}
          {children && (
            <Text style={[s.text, { color: textColor }, textStyle]}>
              {children}
            </Text>
          )}
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  text: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  default: { backgroundColor: colors.primary },
  destructive: { backgroundColor: colors.destructive },
  outline: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  secondary: { backgroundColor: colors.secondary },
  ghost: { backgroundColor: 'transparent' },
  link: { backgroundColor: 'transparent' },
};

const variantTextColors: Record<ButtonVariant, string> = {
  default: colors.primaryForeground,
  destructive: colors.destructiveForeground,
  outline: colors.foreground,
  secondary: colors.secondaryForeground,
  ghost: colors.foreground,
  link: colors.primary,
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  default: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44 },
  sm: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minHeight: 36 },
  lg: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 52 },
  icon: { width: 44, height: 44 },
};
