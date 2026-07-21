// RN port of Lovable src/components/ViewToggle.tsx.
//
// Web→RN mapping:
//   - <div>                → <View>
//   - shadcn Switch/Label  → @/components/ui/Switch + Label
//   - lucide-react         → lucide-react-native
//   - Tailwind className   → StyleSheet
//
// Behavior preserved verbatim: two-state pill with EyeOff/Switch/Eye and a
// dynamic "Owner View" / "Public View" label.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Switch } from '@/components/ui/Switch';
import { colors, typography, spacing, radius } from '@/lib/theme';

export interface ViewToggleProps {
  isOwnerView: boolean;
  onToggle: (v: boolean) => void;
}

export const ViewToggle = ({ isOwnerView, onToggle }: ViewToggleProps) => {
  return (
    <View style={s.wrap}>
      <EyeOff size={16} color={colors.mutedForeground} />
      <Switch value={isOwnerView} onValueChange={onToggle} />
      <Pressable
        onPress={() => onToggle(!isOwnerView)}
        style={s.labelRow}
        accessibilityRole="button"
        hitSlop={4}
      >
        <Eye size={16} color={colors.foreground} />
        <Text style={s.labelText}>
          {isOwnerView ? 'Owner View' : 'Public View'}
        </Text>
      </Pressable>
    </View>
  );
};

export default ViewToggle;

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  labelText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
});
