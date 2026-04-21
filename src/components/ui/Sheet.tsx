import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Modal, Animated, View, Text, Pressable, StyleSheet, Dimensions, ViewStyle, TextStyle, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

type Side = 'left' | 'right' | 'top' | 'bottom';
interface SheetCtx { open: boolean; onOpenChange: (v: boolean) => void; side: Side; }
const Ctx = createContext<SheetCtx>({ open: false, onOpenChange: () => {}, side: 'right' });

export function Sheet({ open, onOpenChange, side = 'right', children }: { open: boolean; onOpenChange: (v: boolean) => void; side?: Side; children: React.ReactNode }) {
  return <Ctx.Provider value={{ open, onOpenChange, side }}>{children}</Ctx.Provider>;
}

export function SheetTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const ctx = useContext(Ctx);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, { onPress: () => ctx.onOpenChange(true) });
  }
  return <Pressable onPress={() => ctx.onOpenChange(true)}>{children}</Pressable>;
}

export function SheetContent({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const ctx = useContext(Ctx);
  const { width, height } = Dimensions.get('window');
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: ctx.open ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [ctx.open, anim]);

  const dims: ViewStyle = { right: { width: Math.min(420, width * 0.9), height }, left: { width: Math.min(420, width * 0.9), height }, top: { width, height: '60%' as any }, bottom: { width, height: '60%' as any } }[ctx.side];
  const translate = (() => {
    if (ctx.side === 'right') return { transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [dims.width as number, 0] }) }] };
    if (ctx.side === 'left') return { transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-(dims.width as number), 0] }) }] };
    if (ctx.side === 'top') return { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.6, 0] }) }] };
    return { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, 0] }) }] };
  })();

  const align: ViewStyle = ({ right: { alignItems: 'flex-end' }, left: { alignItems: 'flex-start' }, top: { justifyContent: 'flex-start' }, bottom: { justifyContent: 'flex-end' } } as Record<string, ViewStyle>)[ctx.side];

  return (
    <Modal visible={ctx.open} transparent animationType="fade" onRequestClose={() => ctx.onOpenChange(false)}>
      <Pressable style={[s.overlay, align]} onPress={() => ctx.onOpenChange(false)}>
        <Animated.View style={[s.sheet, dims, translate, style]}>
          <Pressable style={s.sheetInner} onPress={(e) => e.stopPropagation()}>
            <ScrollView contentContainerStyle={s.scrollContent}>{children}</ScrollView>
            <Pressable style={s.closeBtn} onPress={() => ctx.onOpenChange(false)} hitSlop={8}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export function SheetHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.header, style]}>{children}</View>;
}
export function SheetTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.title, style]}>{children}</Text>;
}
export function SheetDescription({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.description, style]}>{children}</Text>;
}
export function SheetFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.footer, style]}>{children}</View>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.card },
  sheetInner: { flex: 1, padding: spacing.lg, position: 'relative' },
  scrollContent: { gap: spacing.md, paddingRight: spacing.xl },
  closeBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: 4 },
  header: { gap: 4, marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  description: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
});
