// Stat tile — used across athlete/coach/scout dashboards for KPI summaries.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';
import type { LucideIcon } from 'lucide-react-native';

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  color?: string;
}

export function StatTile({ label, value, icon: Icon, trend, color }: Props) {
  const tint = color || colors.primary;
  return (
    <View style={s.tile}>
      {Icon && (
        <View style={[s.iconWrap, { backgroundColor: tint + '22' }]}>
          <Icon size={18} color={tint} />
        </View>
      )}
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
      {trend && (
        <Text style={[s.trend, { color: trend.value >= 0 ? colors.success : colors.destructive }]}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label ?? ''}
        </Text>
      )}
    </View>
  );
}

export default StatTile;

const s = StyleSheet.create({
  tile: { flex: 1, minWidth: 140, padding: spacing.md, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 4 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  label: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  trend: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, marginTop: 2 },
});
