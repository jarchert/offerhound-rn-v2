import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

export function FounderRibbon() {
  return (
    <View style={s.ribbon}>
      <Star size={10} color={colors.primaryForeground} />
      <Text style={s.text}>FOUNDER</Text>
    </View>
  );
}

export default FounderRibbon;

const s = StyleSheet.create({
  ribbon: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontFamily: typography.fontFamily.bodyBold, fontSize: 10, color: colors.primaryForeground, letterSpacing: 1 },
});
