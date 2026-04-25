// CampLiveLeaderboardScreen — RN port of Lovable web src/pages/CampLiveLeaderboard.tsx (307 LOC).
// Live drill leaderboard for a single camp; polls performance + enrollments every 15s.
// Read-only view aimed at coaches/spectators on the sideline.
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowLeft, Timer, Trophy } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing } from '@/lib/theme';
import type { CampStackParamList } from '@/navigation/stacks/CampStack';

interface CampInfo {
  id: string;
  name: string;
  sport: string;
  start_date: string;
  status: string;
}

interface PerfRow {
  id: string;
  enrollment_id: string | null;
  athlete_profile_id: string | null;
  forty_yard_dash: number[] | null;
  shuttle_5_10_5: number[] | null;
  three_cone_drill: number[] | null;
  vertical_jump: number[] | null;
  broad_jump: number[] | null;
  updated_at: string;
}

interface EnrollmentLite {
  id: string;
  jersey_number: string | null;
  position_group: string | null;
}

const TIMED_DRILLS = [
  { key: 'forty_yard_dash', label: '40-yard dash', unit: 's', lowerBetter: true },
  { key: 'shuttle_5_10_5', label: '5-10-5 shuttle', unit: 's', lowerBetter: true },
  { key: 'three_cone_drill', label: '3-cone drill', unit: 's', lowerBetter: true },
] as const;

const JUMP_DRILLS = [
  { key: 'vertical_jump', label: 'Vertical jump', unit: '"', lowerBetter: false },
  { key: 'broad_jump', label: 'Broad jump', unit: '"', lowerBetter: false },
] as const;

type DrillKey =
  | 'forty_yard_dash'
  | 'shuttle_5_10_5'
  | 'three_cone_drill'
  | 'vertical_jump'
  | 'broad_jump';

interface LeaderRow {
  enrollmentId: string | null;
  jersey: string | null;
  position: string | null;
  best: number;
}

function bestOf(values: number[] | null | undefined, lowerBetter: boolean): number | null {
  if (!values || values.length === 0) return null;
  return lowerBetter ? Math.min(...values) : Math.max(...values);
}

export default function CampLiveLeaderboardScreen() {
  const route = useRoute<RouteProp<CampStackParamList, 'CampLeaderboard'>>();
  const navigation = useNavigation<NavigationProp<any>>();
  const campId = route.params?.campId;

  const { data: camp, isLoading: campLoading } = useQuery({
    queryKey: ['leaderboard-camp', campId],
    queryFn: async () => {
      if (!campId) return null;
      const { data, error } = await supabase
        .from('camps')
        .select('id, name, sport, start_date, status')
        .eq('id', campId)
        .maybeSingle();
      if (error) throw error;
      return data as CampInfo | null;
    },
    enabled: !!campId,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['leaderboard-enrollments', campId],
    queryFn: async () => {
      if (!campId) return [];
      const { data, error } = await supabase
        .from('camp_enrollments')
        .select('id, jersey_number, position_group')
        .eq('camp_id', campId);
      if (error) throw error;
      return (data || []) as EnrollmentLite[];
    },
    enabled: !!campId,
    refetchInterval: 15_000,
  });

  const { data: perfRows = [], isLoading: perfLoading } = useQuery({
    queryKey: ['leaderboard-perf', campId],
    queryFn: async () => {
      if (!campId) return [];
      const { data, error } = await supabase
        .from('camp_performance_entries')
        .select(
          'id, enrollment_id, athlete_profile_id, forty_yard_dash, shuttle_5_10_5, three_cone_drill, vertical_jump, broad_jump, updated_at',
        )
        .eq('camp_id', campId);
      if (error) throw error;
      return (data || []) as PerfRow[];
    },
    enabled: !!campId,
    refetchInterval: 15_000,
  });

  const enrollmentMap = useMemo(() => {
    const m = new Map<string, EnrollmentLite>();
    enrollments.forEach((e) => m.set(e.id, e));
    return m;
  }, [enrollments]);

  function leaderboardFor(key: DrillKey, lowerBetter: boolean): LeaderRow[] {
    const rows: LeaderRow[] = [];
    perfRows.forEach((row) => {
      const best = bestOf(row[key] as number[] | null, lowerBetter);
      if (best === null) return;
      const enr = row.enrollment_id ? enrollmentMap.get(row.enrollment_id) : null;
      rows.push({
        enrollmentId: row.enrollment_id,
        jersey: enr?.jersey_number ?? null,
        position: enr?.position_group ?? null,
        best,
      });
    });
    rows.sort((a, b) => (lowerBetter ? a.best - b.best : b.best - a.best));
    return rows.slice(0, 10);
  }

  if (campLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!camp) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Camp not found or leaderboard unavailable.</Text>
        <Button variant="outline" onPress={() => navigation.navigate('CampsList' as never)}>
          Go home
        </Button>
      </SafeAreaView>
    );
  }

  const renderRows = (key: DrillKey, lowerBetter: boolean, decimals: number, unit: string) => {
    const rows = leaderboardFor(key, lowerBetter);
    if (rows.length === 0) {
      return <Text style={styles.noScores}>No scores yet</Text>;
    }
    return rows.map((row, idx) => (
      <View key={`${key}-${row.enrollmentId ?? idx}`} style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={[styles.rank, idx === 0 ? styles.rankTop : styles.rankRest]}>
            {idx + 1}
          </Text>
          {row.jersey ? <Text style={styles.jersey}>{row.jersey}</Text> : null}
          {row.position ? (
            <Badge variant="outline" style={styles.posBadge}>
              <Text style={styles.posBadgeText}>{row.position}</Text>
            </Badge>
          ) : null}
        </View>
        <Text style={styles.score}>
          {row.best.toFixed(decimals)}
          {unit}
        </Text>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to camps"
            onPress={() => navigation.goBack()}
            style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {camp.name}
            </Text>
            <Text style={styles.subtitle}>Live leaderboard · refreshes automatically</Text>
          </View>
        </View>
        <Badge variant="secondary" style={styles.liveBadge}>
          <Activity size={12} color={colors.foreground} />
          <Text style={styles.liveBadgeText}> Live</Text>
        </Badge>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {perfLoading ? (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : perfRows.length === 0 ? (
          <Card>
            <CardContent style={{ paddingVertical: 48 }}>
              <Text style={[styles.muted, { textAlign: 'center' }]}>
                No drill scores recorded yet. Leaderboards appear here as evaluators submit results.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Timer size={14} color={colors.mutedForeground} />
                <Text style={styles.sectionHeadText}>Timed drills (lower is better)</Text>
              </View>
              {TIMED_DRILLS.map((d) => (
                <Card key={d.key} style={{ marginBottom: spacing.sm }}>
                  <CardHeader style={{ paddingBottom: spacing.xs }}>
                    <CardTitle>{d.label}</CardTitle>
                  </CardHeader>
                  <CardContent>{renderRows(d.key as DrillKey, d.lowerBetter, 2, d.unit)}</CardContent>
                </Card>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Trophy size={14} color={colors.mutedForeground} />
                <Text style={styles.sectionHeadText}>Jumps (higher is better)</Text>
              </View>
              {JUMP_DRILLS.map((d) => (
                <Card key={d.key} style={{ marginBottom: spacing.sm }}>
                  <CardHeader style={{ paddingBottom: spacing.xs }}>
                    <CardTitle>{d.label}</CardTitle>
                  </CardHeader>
                  <CardContent>{renderRows(d.key as DrillKey, d.lowerBetter, 1, d.unit)}</CardContent>
                </Card>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
    paddingHorizontal: 16,
  },
  muted: { color: colors.mutedForeground, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, color: colors.foreground, fontWeight: '700' },
  subtitle: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center' },
  liveBadgeText: { fontSize: 11, color: colors.foreground, marginLeft: 4 },
  scroll: { padding: 16, paddingBottom: 48, gap: spacing.lg },
  section: { marginBottom: spacing.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  sectionHeadText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.mutedForeground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  rank: { width: 20, textAlign: 'right', fontWeight: '700' },
  rankTop: { color: colors.primary },
  rankRest: { color: colors.mutedForeground },
  jersey: {
    width: 28,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.foreground,
  },
  posBadge: { paddingHorizontal: 6, paddingVertical: 1 },
  posBadgeText: { fontSize: 10, color: colors.foreground },
  score: { fontFamily: 'Courier', fontSize: 14, color: colors.foreground },
  noScores: { fontSize: 12, color: colors.mutedForeground },
});
