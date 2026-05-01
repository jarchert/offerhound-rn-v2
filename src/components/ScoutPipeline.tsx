// Ported from Lovable src/components/ScoutPipeline.tsx.
// Shows scout's recruiting pipeline with stages and athletes, supporting
// stage changes via a bottom-sheet action menu. Native RN doesn't have
// the Radix Select used on web; we use a simple ActionSheet-style Alert.
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Pressable,
  ActionSheetIOS,
  Alert,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing, radius } from '@/lib/theme';

type Stage = { id: string; name: string; color?: string | null; position?: number };
type PipelineAthlete = {
  id: string;
  stage_id: string;
  player_profiles?: {
    id: string;
    full_name: string;
    position?: string;
    school?: string;
    profile_image_url?: string;
  };
};

export function ScoutPipeline() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stages = [], isLoading: sl } = useQuery<Stage[]>({
    queryKey: ['scout-pipeline-stages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('scout_pipeline_stages' as any)
        .select('*')
        .eq('scout_user_id', user.id)
        .order('position');
      if (error) throw error;
      return (data as unknown as Stage[]) || [];
    },
    enabled: !!user,
  });

  const { data: athletes = [], isLoading: al } = useQuery<PipelineAthlete[]>({
    queryKey: ['scout-pipeline-athletes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('scout_athlete_pipeline_status' as any)
        .select(
          '*, player_profiles:athlete_profile_id(id, full_name, position, school, profile_image_url)'
        )
        .eq('scout_user_id', user.id);
      if (error) throw error;
      return (data as unknown as PipelineAthlete[]) || [];
    },
    enabled: !!user,
  });

  const move = useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const { error } = await supabase
        .from('scout_athlete_pipeline_status' as any)
        .update({ stage_id: stageId })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-pipeline-athletes'] });
    },
  });

  const openStagePicker = useCallback(
    (athleteId: string) => {
      const names = stages.map((st) => st.name);
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [...names, 'Cancel'],
            cancelButtonIndex: names.length,
            title: 'Move to stage',
          },
          (idx) => {
            if (idx < names.length) {
              move.mutate({ id: athleteId, stageId: stages[idx].id });
            }
          }
        );
      } else {
        Alert.alert(
          'Move to stage',
          undefined,
          [
            ...stages.map((st) => ({
              text: st.name,
              onPress: () => move.mutate({ id: athleteId, stageId: st.id }),
            })),
            { text: 'Cancel', style: 'cancel' as const },
          ]
        );
      }
    },
    [stages, move]
  );

  if (sl || al) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (stages.length === 0) {
    return (
      <View style={s.emptyCard}>
        <Users color={colors.foregroundSubtle} size={40} />
        <Text style={s.emptyTitle}>No Pipeline Stages</Text>
        <Text style={s.emptyBody}>
          Complete onboarding to set up your scout pipeline.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h2}>Scout Pipeline</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        {stages.map((stage) => {
          const sa = athletes.filter((a) => a.stage_id === stage.id);
          return (
            <View key={stage.id} style={s.stageCard}>
              <View style={s.stageHeader}>
                <View style={s.stageHeaderLeft}>
                  <View
                    style={[
                      s.stageDot,
                      { backgroundColor: stage.color || '#6366f1' },
                    ]}
                  />
                  <Text style={s.stageName}>{stage.name}</Text>
                </View>
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{sa.length}</Text>
                </View>
              </View>
              <View style={s.stageBody}>
                {sa.length === 0 ? (
                  <Text style={s.emptyStage}>Empty</Text>
                ) : (
                  sa.map((a) => {
                    const p = a.player_profiles;
                    const initials =
                      p?.full_name?.charAt(0)?.toUpperCase() || '?';
                    return (
                      <View key={a.id} style={s.athleteCard}>
                        <View style={s.athleteTopRow}>
                          {p?.profile_image_url ? (
                            <Image
                              source={{ uri: p.profile_image_url }}
                              style={s.avatar}
                            />
                          ) : (
                            <View style={[s.avatar, s.avatarFallback]}>
                              <Text style={s.avatarInitials}>{initials}</Text>
                            </View>
                          )}
                          <View style={s.athleteInfo}>
                            <Text style={s.athleteName} numberOfLines={1}>
                              {p?.full_name}
                            </Text>
                            {p?.position ? (
                              <Text style={s.athletePos} numberOfLines={1}>
                                {p.position}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <Pressable
                          style={s.moveBtn}
                          onPress={() => openStagePicker(a.id)}
                        >
                          <Text style={s.moveBtnText}>Move</Text>
                          <ChevronRight color={colors.foregroundSubtle} size={12} />
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default ScoutPipeline;

const s = StyleSheet.create({
  wrap: { gap: spacing.md },
  h2: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  row: { gap: spacing.md, paddingVertical: 4, paddingRight: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.size.base,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
  stageCard: {
    width: 260,
    minHeight: 200,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.xs,
  },
  stageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  stageName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.size.sm,
  },
  countBadge: {
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: 11,
  },
  stageBody: { padding: spacing.sm, gap: spacing.xs },
  emptyStage: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.xs,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  athleteCard: {
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  athleteTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.foreground,
    fontSize: 12,
  },
  athleteInfo: { flex: 1, minWidth: 0 },
  athleteName: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: 12,
  },
  athletePos: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: 11,
  },
  moveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moveBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: 11,
  },
});
