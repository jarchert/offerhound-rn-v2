import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

export function Progress({ value = 0, style }: { value?: number; style?: ViewStyle }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={[s.track, style]}>
      <View style={[s.fill, { width: `${clamped}%` }]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: { height: 8, backgroundColor: colors.muted, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
});
