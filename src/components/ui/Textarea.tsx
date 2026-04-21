import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text, ViewStyle } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface TextareaProps extends TextInputProps {
  label?: string;
  error?: string;
  rows?: number;
  containerStyle?: ViewStyle;
}

export const Textarea = forwardRef<TextInput, TextareaProps>(
  ({ label, error, rows = 4, containerStyle, style, ...props }, ref) => (
    <View style={[s.container, containerStyle]}>
      {label && <Text style={s.label}>{label}</Text>}
      <TextInput
        ref={ref}
        multiline
        numberOfLines={rows}
        textAlignVertical="top"
        placeholderTextColor={colors.mutedForeground}
        style={[s.input, { minHeight: rows * 24 }, error && s.inputError, style]}
        {...props}
      />
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  )
);
Textarea.displayName = 'Textarea';

const s = StyleSheet.create({
  container: { gap: 4 },
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.card, color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base },
  inputError: { borderColor: colors.destructive },
  error: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.destructive },
});
