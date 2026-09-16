// AdminOnboardingStats — role count breakdown from user_roles.
// Ported from MAIN's AdminOnboarding.tsx (37 lines).
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface RoleCount {
  role: string;
  count: number;
}

export function AdminOnboardingStats() {
  const { data: roles = [], isLoading } = useQuery<RoleCount[]>({
    queryKey: ['admin-onboarding-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .limit(500);
      if (error) throw error;
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((r: any) => {
        counts[r.role] = (counts[r.role] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  if (isLoading) {
    return (
      <View style={s.centered} testID="onboarding-stats-loading">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (roles.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.empty} testID="onboarding-stats-empty">No role data found.</Text>
      </View>
    );
  }

  return (
    <View style={s.root} testID="onboarding-stats-list">
      <Text style={s.heading}>Users by Role</Text>
      {roles.map((r) => (
        <Card key={r.role} style={s.row}>
          <Text style={s.roleLabel}>
            {r.role.replace(/_/g, ' ')}
          </Text>
          <Badge variant="secondary" testID={`role-badge-${r.role}`}>
            {String(r.count)}
          </Badge>
        </Card>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: spacing.sm },
  heading: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm + 2,
  },
  roleLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    textTransform: 'capitalize',
    flex: 1,
  },
  centered: { paddingVertical: spacing.xl, alignItems: 'center' },
  empty: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});
