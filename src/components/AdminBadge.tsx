import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

export function AdminBadge() {
  return (
    <View style={s.badge}>
      <Shield size={10} color={colors.primaryForeground} />
      <Text style={s.text}>ADMIN</Text>
    </View>
  );
}

export default AdminBadge;

const s = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontFamily: typography.fontFamily.bodyBold, fontSize: 10, color: colors.primaryForeground, letterSpacing: 1 },
});
