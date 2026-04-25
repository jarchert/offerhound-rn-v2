// Ported from Lovable src/components/CampAIScoring.tsx (web → RN).
// AI scoring / leaderboard for a camp — verbatim logic, RN-adapted UI.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain, Loader2, ArrowLeft, Trophy, Zap, Wind, Target,
  TrendingUp, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface CampAIScoringProps {
  campId: string;
  campName: string;
  onBack: () => void;
}

export function CampAIScoring({ campId, campName, onBack }: CampAIScoringProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ['camp-ai-scores', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_ai_scores')
        .select('*')
        .eq('camp_id', campId)
        .order('ai_rank', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const athleteIds = scores.map((s: any) => s.athlete_profile_id).filter(Boolean);
  const { data: athletes = [] } = useQuery({
    queryKey: ['camp-score-athletes', athleteIds],
    queryFn: async () => {
      if (athleteIds.length === 0) return [];
      const { data } = await supabase
        .from('player_profiles')
        .select('id, full_name, position, graduation_year')
        .in('id', athleteIds);
      return data || [];
    },
    enabled: athleteIds.length > 0,
  });

  const runScoring = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/camp-ai-scoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ camp_id: campId }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Scoring failed');
      }
      return resp.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['camp-ai-scores', campId] });
      toast({ title: 'AI Scoring Complete', description: `${data.scored} athletes scored and ranked.` });
    },
    onError: (err: Error) => {
      toast({ title: 'Scoring Error', description: err.message, variant: 'destructive' });
    },
  });

  const getAthleteName = (profileId: string | null) => {
    if (!profileId) return 'Unknown Athlete';
    const a = athletes.find((a: any) => a.id === profileId);
    return a ? a.full_name : 'Athlete';
  };

  const getAthleteInfo = (profileId: string | null) => {
    if (!profileId) return null;
    return athletes.find((a: any) => a.id === profileId);
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <Badge>
          <View style={s.rankInline}>
            <Trophy size={12} color={colors.primaryForeground} />
            <Text style={[s.badgeInlineText, { color: colors.primaryForeground }]}>1st</Text>
          </View>
        </Badge>
      );
    }
    if (rank === 2) return <Badge variant="secondary">2nd</Badge>;
    if (rank === 3) return <Badge variant="outline">3rd</Badge>;
    return <Badge variant="outline">{`#${rank}`}</Badge>;
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return '#16a34a'; // green-600
    if (score >= 60) return '#ca8a04'; // yellow-600
    return '#ef4444';                  // red-500
  };

  const maxScore = scores.length > 0
    ? Math.max(...scores.map((s: any) => Number(s.composite_score))).toFixed(0)
    : '0';
  const avgScore = scores.length > 0
    ? (scores.reduce((a: number, s: any) => a + Number(s.composite_score), 0) / scores.length).toFixed(0)
    : '0';
  const eliteCount = scores.filter((s: any) => Number(s.composite_score) >= 75).length;

  return (
    <ScrollView contentContainerStyle={s.root}>
      {/* Header row */}
      <View style={s.headerRow}>
        <Button variant="ghost" size="sm" onPress={onBack} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>
          Back
        </Button>
        <View style={s.headerText}>
          <View style={s.titleRow}>
            <Brain size={20} color={colors.primary} />
            <Text style={s.title}>{`AI Scoring — ${campName}`}</Text>
          </View>
          <Text style={s.subtitle}>AI-powered composite scoring and ranking engine</Text>
        </View>
        <Button
          onPress={() => runScoring.mutate()}
          disabled={runScoring.isPending}
          leftIcon={runScoring.isPending
            ? <Loader2 size={16} color={colors.primaryForeground} />
            : <RefreshCw size={16} color={colors.primaryForeground} />}
        >
          {runScoring.isPending ? 'Scoring...' : (scores.length > 0 ? 'Re-Score' : 'Run AI Scoring')}
        </Button>
      </View>

      {isLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={colors.mutedForeground} />
        </View>
      ) : scores.length === 0 ? (
        <Card>
          <CardContent style={s.emptyBox}>
            <Brain size={48} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>No AI Scores Yet</Text>
            <Text style={s.emptyBody}>
              Capture performance data first, then run AI scoring to generate composite scores and rankings.
            </Text>
            <Button
              onPress={() => runScoring.mutate()}
              disabled={runScoring.isPending}
              leftIcon={<Zap size={16} color={colors.primaryForeground} />}
            >
              Run AI Scoring
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <View style={s.statsGrid}>
            <View style={s.statCell}>
              <Card><CardContent style={s.statContent}>
                <Text style={s.statNum}>{scores.length}</Text>
                <Text style={s.statLabel}>Athletes Scored</Text>
              </CardContent></Card>
            </View>
            <View style={s.statCell}>
              <Card><CardContent style={s.statContent}>
                <Text style={s.statNum}>{maxScore}</Text>
                <Text style={s.statLabel}>Top Score</Text>
              </CardContent></Card>
            </View>
            <View style={s.statCell}>
              <Card><CardContent style={s.statContent}>
                <Text style={s.statNum}>{avgScore}</Text>
                <Text style={s.statLabel}>Average Score</Text>
              </CardContent></Card>
            </View>
            <View style={s.statCell}>
              <Card><CardContent style={s.statContent}>
                <Text style={s.statNum}>{eliteCount}</Text>
                <Text style={s.statLabel}>Elite (75+)</Text>
              </CardContent></Card>
            </View>
          </View>

          {/* Leaderboard */}
          <View style={s.leaderboard}>
            {scores.map((score: any) => {
              const info = getAthleteInfo(score.athlete_profile_id);
              const expanded = expandedId === score.id;
              return (
                <Card key={score.id}>
                  <CardContent style={s.rowContent}>
                    <Pressable
                      style={s.rowHead}
                      onPress={() => setExpandedId(expanded ? null : score.id)}
                    >
                      <View style={s.rankCell}>{renderRankBadge(score.ai_rank)}</View>
                      <View style={s.rowMain}>
                        <Text style={s.rowName} numberOfLines={1}>{getAthleteName(score.athlete_profile_id)}</Text>
                        {info && (
                          <Text style={s.rowMeta}>
                            {`${info.position} · Class of ${info.graduation_year}`}
                          </Text>
                        )}
                      </View>
                      <Text style={[s.rowScore, { color: scoreColor(Number(score.composite_score)) }]}>
                        {Number(score.composite_score).toFixed(0)}
                      </Text>
                      {expanded
                        ? <ChevronUp size={16} color={colors.foreground} />
                        : <ChevronDown size={16} color={colors.foreground} />}
                    </Pressable>

                    {expanded && (
                      <View style={s.expandBody}>
                        <View style={s.metricsGrid}>
                          <MetricCell icon={<Wind size={12} color={colors.mutedForeground} />} label="Speed" value={Number(score.speed_score)} />
                          <MetricCell icon={<TrendingUp size={12} color={colors.mutedForeground} />} label="Agility" value={Number(score.agility_score)} />
                          <MetricCell icon={<Zap size={12} color={colors.mutedForeground} />} label="Explosiveness" value={Number(score.explosiveness_score)} />
                          <MetricCell icon={<Target size={12} color={colors.mutedForeground} />} label="Position" value={Number(score.position_score)} />
                        </View>
                        {score.ai_summary && (
                          <View style={s.aiBox}>
                            <Text style={s.aiLabel}>AI Analysis</Text>
                            <Text style={s.aiBody}>{score.ai_summary}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function MetricCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <View style={s.metricCell}>
      <View style={s.metricLabelRow}>
        {icon}
        <Text style={s.metricLabel}>{label}</Text>
      </View>
      <Progress value={value} />
      <Text style={s.metricValue}>{`${value.toFixed(0)}/100`}</Text>
    </View>
  );
}

export default CampAIScoring;

const s = StyleSheet.create({
  root: { padding: spacing.md, gap: spacing.md },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  headerText: { flex: 1, minWidth: 180 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    flexShrink: 1,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },

  loadingBox: { paddingVertical: spacing.xxxl, alignItems: 'center', justifyContent: 'center' },

  emptyBox: { paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  statCell: { width: '50%', padding: spacing.xs },
  statContent: { paddingVertical: spacing.md, alignItems: 'center' },
  statNum: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },

  leaderboard: { gap: spacing.sm },

  rowContent: { paddingVertical: spacing.sm + 2 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rankCell: { width: 48, alignItems: 'flex-start' },
  rankInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeInlineText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
  },

  rowMain: { flex: 1, minWidth: 0 },
  rowName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  rowMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  rowScore: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
  },

  expandBody: {
    marginTop: spacing.md,
    paddingTop: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm + 4,
  },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  metricCell: { width: '50%', padding: spacing.xs, gap: 4 },
  metricLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  metricValue: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
    marginTop: 2,
  },

  aiBox: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
  },
  aiLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  aiBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
});
