import React, { createContext, useContext, useState } from 'react';
import { Modal, View, Text, Pressable, FlatList, StyleSheet, ViewStyle } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface SelectCtx {
  value: string | undefined;
  onValueChange: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  label: string;
  setLabel: (v: string) => void;
  items: { value: string; label: string }[];
  registerItem: (v: string, l: string) => void;
}
const Ctx = createContext<SelectCtx>({} as SelectCtx);

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [items, setItems] = useState<{ value: string; label: string }[]>([]);
  const registerItem = (v: string, l: string) => {
    setItems(prev => {
      if (prev.find(i => i.value === v)) return prev;
      return [...prev, { value: v, label: l }];
    });
  };

  React.useEffect(() => {
    const it = items.find(i => i.value === value);
    if (it) setLabel(it.label);
  }, [value, items]);

  return (
    <Ctx.Provider value={{
      value, open, setOpen, label, setLabel, items, registerItem,
      onValueChange: (v: string) => { onValueChange?.(v); setOpen(false); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function SelectTrigger({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  const ctx = useContext(Ctx);
  return (
    <Pressable onPress={() => ctx.setOpen(true)} style={[s.trigger, style]}>
      <View style={{ flex: 1 }}>{children ?? <SelectValue />}</View>
      <ChevronDown size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export function SelectValue({ placeholder = 'Select...' }: { placeholder?: string }) {
  const ctx = useContext(Ctx);
  return <Text style={[s.value, !ctx.label && s.placeholder]}>{ctx.label || placeholder}</Text>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  // Register items
  const itemChildren = React.Children.toArray(children);
  return (
    <Modal visible={ctx.open} transparent animationType="fade" onRequestClose={() => ctx.setOpen(false)}>
      <Pressable style={s.overlay} onPress={() => ctx.setOpen(false)}>
        <Pressable style={s.dropdown} onPress={(e) => e.stopPropagation()}>
          <FlatList
            data={itemChildren}
            keyExtractor={(_item, i) => String(i)}
            renderItem={({ item }) => item as any}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  const label = typeof children === 'string' ? children : String(children);

  React.useEffect(() => {
    ctx.registerItem(value, label);
  }, [value, label]);

  const selected = ctx.value === value;
  return (
    <Pressable style={[s.item, selected && s.itemSelected]} onPress={() => ctx.onValueChange(value)}>
      <Text style={s.itemText}>{children}</Text>
      {selected && <Check size={16} color={colors.primary} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.card, minHeight: 44, gap: spacing.sm },
  value: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.foreground },
  placeholder: { color: colors.mutedForeground },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.xl },
  dropdown: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, maxHeight: '70%' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44 },
  itemSelected: { backgroundColor: colors.muted },
  itemText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.foreground, flex: 1 },
});
