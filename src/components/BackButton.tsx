import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface BackButtonProps {
  label?: string;
  style?: ViewStyle;
  onPress?: () => void;
  fallback?: { name: string; params?: object };
}

export function BackButton({ label = 'Back', style, onPress, fallback }: BackButtonProps) {
  const nav = useNavigation();
  const handle = () => {
    if (onPress) return onPress();
    if (nav.canGoBack()) return nav.goBack();
    if (fallback) (nav.navigate as any)(fallback.name, fallback.params);
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={[s.btn, style]} onPress={handle} hitSlop={8}>
      <ArrowLeft size={18} color={colors.foreground} />
      <Text style={s.label}>{label}</Text>
    </Pressable>
  );
}

export default BackButton;

const s = StyleSheet.create({
  btn: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
});
