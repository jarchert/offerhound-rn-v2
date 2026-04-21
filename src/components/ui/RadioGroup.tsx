import React, { createContext, useContext } from 'react';
import { Pressable, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';

interface RadioGroupCtx { value: string | undefined; onValueChange?: (v: string) => void; }
const Ctx = createContext<RadioGroupCtx>({ value: undefined });

export function RadioGroup({ value, onValueChange, children, style }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode; style?: ViewStyle }) {
  return <Ctx.Provider value={{ value, onValueChange }}><View style={[s.group, style]}>{children}</View></Ctx.Provider>;
}

export function RadioGroupItem({ value, label }: { value: string; label?: string }) {
  const ctx = useContext(Ctx);
  const selected = ctx.value === value;
  return (
    <Pressable onPress={() => ctx.onValueChange?.(value)} style={s.row}>
      <View style={[s.outer, selected && s.outerSelected]}>
        {selected && <View style={s.inner} />}
      </View>
      {label && <Text style={s.label}>{label}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  outer: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  outerSelected: { borderColor: colors.primary },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  label: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.foreground },
});
