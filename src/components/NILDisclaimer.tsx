import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

// Required disclaimer for NIL-related AI advisor content.
export function NILDisclaimer() {
  return (
    <View style={s.box}>
      <Info size={14} color={colors.mutedForeground} />
      <Text style={s.text}>
        Information provided is for educational purposes only and is not legal or financial advice. NIL rules vary by state, institution, and conference. Consult an attorney or compliance officer before signing any NIL agreement.
      </Text>
    </View>
  );
}

export default NILDisclaimer;

const s = StyleSheet.create({
  box: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: 8, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
  text: { flex: 1, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, lineHeight: 16 },
});
