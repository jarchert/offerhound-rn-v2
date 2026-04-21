import React, { createContext, useContext } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, ViewStyle, TextStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface DialogCtx { open: boolean; onOpenChange: (v: boolean) => void; }
const Ctx = createContext<DialogCtx>({ open: false, onOpenChange: () => {} });

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  return <Ctx.Provider value={{ open, onOpenChange }}>{children}</Ctx.Provider>;
}

export function DialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const ctx = useContext(Ctx);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, { onPress: () => ctx.onOpenChange(true) });
  }
  return <Pressable onPress={() => ctx.onOpenChange(true)}>{children}</Pressable>;
}

export function DialogContent({ children, style, hideClose }: { children: React.ReactNode; style?: ViewStyle; hideClose?: boolean }) {
  const ctx = useContext(Ctx);
  return (
    <Modal visible={ctx.open} transparent animationType="fade" onRequestClose={() => ctx.onOpenChange(false)}>
      <Pressable style={s.overlay} onPress={() => ctx.onOpenChange(false)}>
        <Pressable style={[s.content, style]} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={s.scrollContent}>
            {children}
          </ScrollView>
          {!hideClose && (
            <Pressable style={s.closeBtn} onPress={() => ctx.onOpenChange(false)} hitSlop={8}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DialogHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.header, style]}>{children}</View>;
}
export function DialogFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.footer, style]}>{children}</View>;
}
export function DialogTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.title, style]}>{children}</Text>;
}
export function DialogDescription({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.description, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, maxWidth: 500, width: '100%', maxHeight: '90%', padding: spacing.lg, position: 'relative' },
  scrollContent: { gap: spacing.md },
  closeBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: 4 },
  header: { gap: 4, paddingRight: spacing.xl },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  description: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
});
