import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface BackButtonProps {
  label?: string;
  style?: ViewStyle;
  onPress?: () => void;
}

export function BackButton({ label = 'Back', style, onPress }: BackButtonProps) {
  const nav = useNavigation();
  const handle = () => {
    if (onPress) return onPress();
    if (nav.canGoBack()) nav.goBack();
  };
  return (
    <Pressable style={[s.btn, style]} onPress={handle} hitSlop={8}>
      <ArrowLeft size={18} color={colors.foreground} />
      <Text style={s.label}>{label}</Text>
    </Pressable>
  );
}

export default BackButton;

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
});
