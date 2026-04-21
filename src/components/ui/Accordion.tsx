import React, { createContext, useContext, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface AccordionCtx {
  type: 'single' | 'multiple';
  value: string | string[] | undefined;
  onValueChange: (v: string) => void;
}
const Ctx = createContext<AccordionCtx>({ type: 'single', value: undefined, onValueChange: () => {} });

export function Accordion({ type = 'single', defaultValue, children, style }: { type?: 'single' | 'multiple'; defaultValue?: string | string[]; children: React.ReactNode; style?: ViewStyle }) {
  const [value, setValue] = useState<string | string[] | undefined>(defaultValue);

  const onValueChange = (v: string) => {
    if (type === 'single') {
      setValue(value === v ? undefined : v);
    } else {
      const arr = Array.isArray(value) ? value : [];
      setValue(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
    }
  };

  return (
    <Ctx.Provider value={{ type, value, onValueChange }}>
      <View style={style}>{children}</View>
    </Ctx.Provider>
  );
}

const ItemCtx = createContext<{ value: string }>({ value: '' });

export function AccordionItem({ value, children, style }: { value: string; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <ItemCtx.Provider value={{ value }}>
      <View style={[s.item, style]}>{children}</View>
    </ItemCtx.Provider>
  );
}

export function AccordionTrigger({ children }: { children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  const item = useContext(ItemCtx);
  const open = ctx.type === 'single' ? ctx.value === item.value : Array.isArray(ctx.value) && ctx.value.includes(item.value);
  return (
    <Pressable style={s.trigger} onPress={() => ctx.onValueChange(item.value)}>
      <Text style={s.triggerText}>{children}</Text>
      <ChevronDown size={16} color={colors.mutedForeground} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
    </Pressable>
  );
}

export function AccordionContent({ children }: { children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  const item = useContext(ItemCtx);
  const open = ctx.type === 'single' ? ctx.value === item.value : Array.isArray(ctx.value) && ctx.value.includes(item.value);
  if (!open) return null;
  return <View style={s.content}>{typeof children === 'string' ? <Text style={s.contentText}>{children}</Text> : children}</View>;
}

const s = StyleSheet.create({
  item: { borderBottomWidth: 1, borderBottomColor: colors.border },
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  triggerText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground, flex: 1 },
  content: { paddingBottom: spacing.md },
  contentText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground },
});
