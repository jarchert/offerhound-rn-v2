import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  style,
}: {
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={() => onCheckedChange?.(!checked)}
      disabled={disabled}
      style={[s.base, checked && s.checked, disabled && s.disabled, style]}
    >
      {checked && <View style={s.dot} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
  disabled: { opacity: 0.5 },
  dot: { width: 10, height: 10, borderRadius: 2, backgroundColor: colors.primaryForeground },
});
