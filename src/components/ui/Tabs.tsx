import React, { createContext, useContext } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface TabsCtx { value: string; onValueChange: (v: string) => void; }
const Ctx = createContext<TabsCtx>({ value: '', onValueChange: () => {} });

export function Tabs({ value, onValueChange, children, style }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode; style?: ViewStyle }) {
  return <Ctx.Provider value={{ value, onValueChange }}><View style={[s.root, style]}>{children}</View></Ctx.Provider>;
}

export function TabsList({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.listScroll}>
      <View style={[s.list, style]}>{children}</View>
    </ScrollView>
  );
}

export function TabsTrigger({ value, children, style, textStyle }: { value: string; children: React.ReactNode; style?: ViewStyle; textStyle?: TextStyle }) {
  const ctx = useContext(Ctx);
  const active = ctx.value === value;
  return (
    <Pressable style={[s.trigger, active && s.triggerActive, style]} onPress={() => ctx.onValueChange(value)}>
      <Text style={[s.triggerText, active && s.triggerTextActive, textStyle]}>{children}</Text>
    </Pressable>
  );
}

export function TabsContent({ value, children, style }: { value: string; children: React.ReactNode; style?: ViewStyle }) {
  const ctx = useContext(Ctx);
  if (ctx.value !== value) return null;
  return <View style={[s.content, style]}>{children}</View>;
}

const s = StyleSheet.create({
  root: { gap: spacing.md },
  listScroll: { flexGrow: 0 },
  list: { flexDirection: 'row', gap: 4, backgroundColor: colors.muted, padding: 4, borderRadius: 12 },
  trigger: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  triggerActive: { backgroundColor: colors.card },
  triggerText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  triggerTextActive: { color: colors.foreground },
  content: { flex: 1 },
});
