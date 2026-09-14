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
  const nav = useNavigation<any>();
  const handle = () => {
    if (onPress) return onPress();
    // canGoBack() only reports on the *current* navigator. When a BackButton
    // is rendered inside a screen that lives in a bottom-tab navigator, the
    // current navigator is the tab bar itself — which cannot go back — so
    // canGoBack() returns false and the button silently does nothing.
    //
    // Real fix: walk up the navigator ancestry, invoking goBack() on the
    // first parent that can go back. This is what React Navigation v6 did
    // implicitly via `dispatch(NavigationActions.back())`; v7 requires you
    // to be explicit.
    let current: any = nav;
    while (current) {
      if (typeof current.canGoBack === 'function' && current.canGoBack()) {
        current.goBack();
        return;
      }
      current = typeof current.getParent === 'function' ? current.getParent() : null;
    }
    // No ancestor could pop — stay silent (the button is at the true root).
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
