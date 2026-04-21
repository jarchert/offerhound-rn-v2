import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { colors, typography, spacing } from '@/lib/theme';

export function ImpersonationBanner() {
  const { isImpersonating, impersonationData, endImpersonation } = useImpersonation();
  if (!isImpersonating || !impersonationData) return null;
  return (
    <View style={s.banner}>
      <AlertTriangle size={16} color={colors.warningForeground} />
      <Text style={s.text} numberOfLines={1}>
        Impersonating {impersonationData.targetUserEmail}
      </Text>
      <Pressable onPress={endImpersonation} style={s.btn}>
        <Text style={s.btnText}>End</Text>
      </Pressable>
    </View>
  );
}

export default ImpersonationBanner;

const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warning, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  text: { flex: 1, fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.warningForeground },
  btn: { paddingHorizontal: spacing.sm, paddingVertical: 4, backgroundColor: colors.warningForeground, borderRadius: 6 },
  btnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.warning },
});
