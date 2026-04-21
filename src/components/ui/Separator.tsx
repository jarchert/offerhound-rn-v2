import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

export function Separator({ orientation = 'horizontal', style }: { orientation?: 'horizontal' | 'vertical'; style?: ViewStyle }) {
  return <View style={[orientation === 'horizontal' ? s.h : s.v, style]} />;
}

const s = StyleSheet.create({
  h: { height: 1, backgroundColor: colors.border, width: '100%' },
  v: { width: 1, backgroundColor: colors.border, height: '100%' },
});
