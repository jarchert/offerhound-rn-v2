// RN port of Lovable src/components/ScoutAnalyticsDashboard.tsx.
//
// Web→RN mapping:
//   - <div>/<h*>/<p>       → <View>/<Text>
//   - shadcn Card          → @/components/ui/Card
//   - lucide-react         → lucide-react-native
//   - Tailwind className   → StyleSheet
//
// Behavior preserved verbatim: three parallel COUNT(*) probes against
// scout_athlete_pipeline_status, scout_letter_history, scout_activity_log —
// each scoped to `scout_user_id = auth.user.id`. Renders a 3-up metric row.

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, Eye, FileText } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface ScoutStats {
  pipeline: number;
  letters: number;
  activities: number;
}

export const ScoutAnalyticsDashboard = () => {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<ScoutStats | null>({
    queryKey: ['scout-analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [pipelineRes, lettersRes, activityRes] = await Promise.all([
        supabase
          .from('scout_athlete_pipeline_status')
          .select('id', { count: 'exact', head: true })
          .eq('scout_user_id', user.id),
        supabase
          .from('scout_letter_history')
          .select('id', { count: 'exact', head: true })
          .eq('scout_user_id', user.id),
        supabase
          .from('scout_activity_log')
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
      <View style={s.loading}>
        <ActivityIndicator color={colors.mutedForeground} />
      </View>
    );
  }

  const metrics: {
    icon: React.ComponentType<any>;
    label: string;
    value: number;
  }[] = [
    { icon: Users, label: 'In Pipeline', value: stats?.pipeline || 0 },
    { icon: FileText, label: 'Letters Sent', value: stats?.letters || 0 },
    { icon: Eye, label: 'Activities', value: stats?.activities || 0 },
  ];

  return (
    <View style={s.wrap}>
      <View style={s.titleRow}>
        <BarChart3 size={20} color={colors.primary} />
        <Text style={s.title}>Scout Analytics</Text>
      </View>

      <View style={s.grid}>
        {metrics.map(({ icon: Icon, label, value }) => (
          <View key={label} style={s.cell}>
            <Card>
              <CardContent style={s.cardContent}>
                <View style={s.iconBubble}>
                  <Icon size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.metricValue}>{value}</Text>
                  <Text style={s.metricLabel}>{label}</Text>
                </View>
              </CardContent>
            </Card>
          </View>
        ))}
      </View>
    </View>
  );
};

export default ScoutAnalyticsDashboard;

const s = StyleSheet.create({
  wrap: { gap: spacing.md },
  loading: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  cell: { width: '33.3333%', paddingHorizontal: spacing.xs },
  cardContent: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBubble: {
    padding: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
  },
  metricValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  metricLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
});
