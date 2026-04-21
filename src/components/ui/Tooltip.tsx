// Tooltip — RN doesn't have hover, so this just shows a small label below the trigger
// when the user long-presses. For most platform-appropriate UX, prefer inline help text.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}

export function TooltipTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}

export function TooltipContent({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return null;
}

// Convenience: a long-press tooltip
export function LongPressTooltip({ tip, children }: { tip: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <Pressable onLongPress={() => setShow(true)} onPressOut={() => setShow(false)}>
        {children}
      </Pressable>
      {show && (
        <View style={s.tip}>
          <Text style={s.tipText}>{tip}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tip: { position: 'absolute', bottom: -32, alignSelf: 'center', backgroundColor: colors.foreground, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 6, zIndex: 100 },
  tipText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.background },
});
