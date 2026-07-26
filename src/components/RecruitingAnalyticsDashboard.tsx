// RN port of Lovable src/components/RecruitingAnalyticsDashboard.tsx.
//
// Web→RN mapping:
//   - <div>/<h*>/<p>       → <View>/<Text>
//   - shadcn Card          → @/components/ui/Card
//   - lucide-react         → lucide-react-native
//   - Tailwind className   → StyleSheet
//
// Behavior preserved verbatim: four parallel Supabase probes plus in-memory
// bucketing of coach_activity_log rows into `profile_view` and
// `athlete_contacted`. Renders a 6-up metric grid (2 cols on phone, 3 on
// tablet — we go 2-up mobile-first).

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Users,
  Eye,
  Star,
  MessageSquare,
  TrendingUp,
} from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface RecruitingStats {
  savedAthletes: number;
  profileViews: number;
  contacts: number;
  pipelineAthletes: number;
  lettersSent: number;
  totalActivities: number;
}

export const RecruitingAnalyticsDashboard = () => {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<RecruitingStats | null>({
    queryKey: ['recruiting-analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [savedRes, activityRes, pipelineRes, lettersRes] = await Promise.all([
        supabase
          .from('saved_athletes')
          .select('id', { count: 'exact', head: true })
          .eq('coach_user_id', user.id),
        supabase
          .from('coach_activity_log')
          .select('activity_type')
          .eq('coach_user_id', user.id),
        supabase
          .from('athlete_pipeline_status')
          .select('id', { count: 'exact', head: true })
          .eq('coach_user_id', user.id),
        supabase
          .from('coach_letter_history')
          .select('id', { count: 'exact', head: true })
          .eq('coach_user_id', user.id),
      ]);

      const activities = (activityRes.data as { activity_type: string }[] | null) || [];
      const profileViews = activities.filter(
        (a) => a.activity_type === 'profile_view',
      ).length;
      const contacts = activities.filter(
        (a) => a.activity_type === 'athlete_contacted',
      ).length;

      return {
        savedAthletes: savedRes.count || 0,
        profileViews,
        contacts,
        pipelineAthletes: pipelineRes.count || 0,
        lettersSent: lettersRes.count || 0,
        totalActivities: activities.length,
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
    tint: string;
  }[] = [
    { icon: Star, label: 'Saved Athletes', value: stats?.savedAthletes || 0, tint: '#eab308' },
    { icon: Eye, label: 'Profile Views', value: stats?.profileViews || 0, tint: colors.info },
    { icon: MessageSquare, label: 'Athletes Contacted', value: stats?.contacts || 0, tint: colors.success },
    { icon: Users, label: 'In Pipeline', value: stats?.pipelineAthletes || 0, tint: '#a855f7' },
    { icon: TrendingUp, label: 'Letters Sent', value: stats?.lettersSent || 0, tint: colors.warning },
    { icon: BarChart3, label: 'Total Activities', value: stats?.totalActivities || 0, tint: colors.primary },
  ];

  return (
    <View style={s.wrap}>
      <View style={s.titleRow}>
        <BarChart3 size={20} color={colors.primary} />
        <Text style={s.title}>Recruiting Analytics</Text>
      </View>

      <View style={s.grid}>
        {metrics.map(({ icon: Icon, label, value, tint }) => (
          <View key={label} style={s.cell}>
            <Card>
              <CardContent style={s.cardContent}>
                <View style={s.iconBubble}>
                  <Icon size={20} color={tint} />
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

export default RecruitingAnalyticsDashboard;

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
  cell: { width: '50%', paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
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
