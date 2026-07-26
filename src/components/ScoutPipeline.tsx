// RN port of Lovable src/components/ScoutPipeline.tsx.
//
// Web→RN mapping:
//   - <div>/<h*>/<p>       → <View>/<Text>
//   - shadcn Card          → @/components/ui/Card
//   - shadcn Avatar/Badge  → @/components/ui/Avatar, @/components/ui/Badge
//   - shadcn Select        → @/components/ui/Select
//   - lucide-react         → lucide-react-native
//   - toast()              → @/components/ui/toast
//
// Behavior preserved:
//   - Two parallel queries: `scout_pipeline_stages` and
//     `scout_athlete_pipeline_status` joined with `player_profiles`.
//   - Mutation updates `scout_athlete_pipeline_status.stage_id`.
//   - Empty state, per-stage counts, per-athlete stage select.

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ChevronRight } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Stage {
  id: string;
  name: string;
  color?: string | null;
  position: number;
}

interface PipelineAthlete {
  id: string;
  stage_id: string;
  player_profiles: {
    id: string;
    full_name: string | null;
    position: string | null;
    school: string | null;
    profile_image_url: string | null;
  } | null;
}

export const ScoutPipeline = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stages = [], isLoading: sl } = useQuery<Stage[]>({
    queryKey: ['scout-pipeline-stages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('scout_pipeline_stages')
        .select('*')
        .eq('scout_user_id', user.id)
        .order('position');
      if (error) throw error;
      return (data as Stage[]) || [];
    },
    enabled: !!user,
  });

  const { data: athletes = [], isLoading: al } = useQuery<PipelineAthlete[]>({
    queryKey: ['scout-pipeline-athletes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('scout_athlete_pipeline_status')
        .select(
          '*, player_profiles:athlete_profile_id(id, full_name, position, school, profile_image_url)',
        )
        .eq('scout_user_id', user.id);
      if (error) throw error;
      return (data as PipelineAthlete[]) || [];
    },
    enabled: !!user,
  });

  const move = useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const { error } = await supabase
        .from('scout_athlete_pipeline_status')
        .update({ stage_id: stageId })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-pipeline-athletes'] });
      toast.success('Athlete moved');
    },
  });

  if (sl || al) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.mutedForeground} />
      </View>
    );
  }

  if (stages.length === 0) {
    return (
      <Card>
        <CardContent style={s.emptyCardContent}>
          <Users size={48} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>No Pipeline Stages</Text>
          <Text style={s.emptyDesc}>
            Complete onboarding to set up your scout pipeline.
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Scout Pipeline</Text>
      <View style={s.grid}>
        {stages.map((stage) => {
          const stageAthletes = athletes.filter((a) => a.stage_id === stage.id);
          return (
            <View key={stage.id} style={s.cell}>
              <Card>
                <CardHeader style={s.cardHeader}>
                  <View style={s.cardTitleRow}>
                    <View style={s.cardTitleLeft}>
                      <View
                        style={[
                          s.stageDot,
                          { backgroundColor: stage.color || '#6366f1' },
                        ]}
                      />
                      <CardTitle style={s.stageName}>{stage.name}</CardTitle>
                    </View>
                    <Badge variant="secondary">{stageAthletes.length}</Badge>
                  </View>
                </CardHeader>
                <CardContent style={s.stageContent}>
                  {stageAthletes.length === 0 ? (
                    <Text style={s.emptyStage}>Empty</Text>
                  ) : (
                    stageAthletes.map((a) => {
                      const p = a.player_profiles;
                      const fullName = p?.full_name || '';
                      return (
                        <View key={a.id} style={s.athleteRow}>
                          <View style={s.athleteHeader}>
                            <Avatar
                              size={32}
                              source={p?.profile_image_url ? { uri: p.profile_image_url } : null}
                              fallback={fullName.charAt(0)}
                            />
                            <View style={s.athleteMeta}>
                              <Text style={s.athleteName} numberOfLines={1}>
                                {fullName}
                              </Text>
                              <Text style={s.athletePosition} numberOfLines={1}>
                                {p?.position || ''}
                              </Text>
                            </View>
                          </View>
                          <Select
                            value={a.stage_id}
                            onValueChange={(v) =>
                              move.mutate({ id: a.id, stageId: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {stages.map((st) => (
                                <SelectItem key={st.id} value={st.id}>
                                  <View style={s.selectItemRow}>
                                    <ChevronRight
                                      size={12}
                                      color={colors.mutedForeground}
                                    />
                                    <Text style={s.selectItemText}>{st.name}</Text>
                                  </View>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </View>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default ScoutPipeline;

const s = StyleSheet.create({
  wrap: { gap: spacing.md },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
  },

  emptyCardContent: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  emptyDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  cell: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  cardHeader: { paddingBottom: spacing.xs },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  stageName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },

  stageContent: { gap: spacing.sm, minHeight: 120 },
  emptyStage: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  athleteRow: {
    padding: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  athleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  athleteMeta: { flex: 1, minWidth: 0 },
  athleteName: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  athletePosition: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  selectItemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  selectItemText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
});
