// Ported from Lovable src/components/ScoutAnalyticsDashboard.tsx.
// Displays scout pipeline / letters / activity counts. Uses parallel count
// queries and renders a 3-card grid.
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, Eye, FileText } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing, radius } from '@/lib/theme';

export function ScoutAnalyticsDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['scout-analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [pipelineRes, lettersRes, activityRes] = await Promise.all([
        supabase
          .from('scout_athlete_pipeline_status' as any)
          .select('id', { count: 'exact', head: true })
          .eq('scout_user_id', user.id),
        supabase
          .from('scout_letter_history' as any)
          .select('id', { count: 'exact', head: true })
          .eq('scout_user_id', user.id),
        supabase
          .from('scout_activity_log' as any)
          .select('id', { count: 'exact', head: true })
          .eq('scout_user_id', user.id),
      ]);
      return {
        pipeline: pipelineRes.count || 0,
        letters: lettersRes.count || 0,
        activities: activityRes.count || 0,
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const metrics: Array<{
    icon: any;
    label: string;
    value: number;
  }> = [
    { icon: Users, label: 'In Pipeline', value: stats?.pipeline || 0 },
    { icon: FileText, label: 'Letters Sent', value: stats?.letters || 0 },
    { icon: Eye, label: 'Activities', value: stats?.activities || 0 },
  ];

  return (
    <View style={s.wrap}>
      <View style={s.titleRow}>
        <BarChart3 color={colors.primary} size={18} />
        <Text style={s.title}>Scout Analytics</Text>
      </View>
      <View style={s.grid}>
        {metrics.map(({ icon: Icon, label, value }) => (
          <View key={label} style={s.metricCard}>
            <View style={s.iconBubble}>
              <Icon color={colors.primary} size={18} />
            </View>
            <View>
              <Text style={s.metricValue}>{value}</Text>
              <Text style={s.metricLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default ScoutAnalyticsDashboard;

const s = StyleSheet.create({
  wrap: { gap: spacing.sm },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h4,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  grid: { flexDirection: 'row', gap: spacing.sm },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBubble: {
    padding: 8,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
  },
  metricValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  metricLabel: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.xs,
  },
});
