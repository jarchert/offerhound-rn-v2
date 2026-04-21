import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text, ViewStyle } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerStyle, style, ...props }, ref) => {
    return (
      <View style={[s.container, containerStyle]}>
        {label && <Text style={s.label}>{label}</Text>}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.mutedForeground}
          style={[s.input, error && s.inputError, style]}
          {...props}
        />
        {error && <Text style={s.error}>{error}</Text>}
      </View>
    );
  }
);
Input.displayName = 'Input';

const s = StyleSheet.create({
  container: { gap: 4 },
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.card, color: colors.foreground,
    fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base,
    minHeight: 44,
  },
  inputError: { borderColor: colors.destructive },
  error: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.destructive },
});
