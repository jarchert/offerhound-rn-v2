// Ported from Lovable src/components/ViewToggle.tsx.
// Toggles between owner view (private stats) and public preview for profiles.
import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

export function ViewToggle({
  isOwnerView,
  onToggle,
}: {
  isOwnerView: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={s.wrap}>
      <EyeOff color={colors.foregroundSubtle} size={14} />
      <Switch
        value={isOwnerView}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.foreground}
      />
      <Eye color={colors.foreground} size={14} />
      <Text style={s.label}>{isOwnerView ? 'Owner View' : 'Public View'}</Text>
    </View>
  );
}

export default ViewToggle;

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: typography.size.sm,
  },
});
