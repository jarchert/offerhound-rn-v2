// Section header — used on dashboards to group content blocks.
import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, style }: Props) {
  return (
    <View style={[s.row, style]}>
      <View style={s.text}>
        <Text style={s.title}>{title}</Text>
        {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={s.action} hitSlop={8}>
          <Text style={s.actionText}>{actionLabel}</Text>
          <ChevronRight size={14} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

export default SectionHeader;

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  text: { flex: 1 },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primary },
});
