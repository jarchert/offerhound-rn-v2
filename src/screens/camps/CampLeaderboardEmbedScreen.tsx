// CampLeaderboardEmbedScreen — RN port of Lovable web src/pages/CampLeaderboardEmbed.tsx (103 LOC).
// Embeddable mini-leaderboard that polls every 30s. The web URL accepted query
// params (?metric=&limit=&theme=); in RN those map onto optional route params
// (CampStackParamList types `campId` only — metric/limit/theme are read defensively).
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';
import type { CampStackParamList } from '@/navigation/stacks/CampStack';

interface PublicRow {
  enrollment_id: string;
  jersey_number: string | null;
  position_group: string | null;
  forty_yard_dash: number | null;
  shuttle_5_10_5: number | null;
  three_cone_drill: number | null;
  vertical_jump: number | null;
  broad_jump: number | null;
  composite_score: number | null;
}

const COLS = [
  { key: 'forty_yard_dash' as const, label: '40', lower: true, fmt: (v: number) => v.toFixed(2) },
  { key: 'shuttle_5_10_5' as const, label: '5-10-5', lower: true, fmt: (v: number) => v.toFixed(2) },
  { key: 'three_cone_drill' as const, label: '3-cone', lower: true, fmt: (v: number) => v.toFixed(2) },
  { key: 'vertical_jump' as const, label: 'Vert', lower: false, fmt: (v: number) => v.toFixed(1) },
  { key: 'broad_jump' as const, label: 'Broad', lower: false, fmt: (v: number) => v.toFixed(1) },
];

export default function CampLeaderboardEmbedScreen() {
  const route = useRoute<RouteProp<CampStackParamList, 'CampLeaderboardEmbed'>>();
  const params = (route.params || {}) as { campId: string; metric?: string; limit?: number | string; theme?: string };
  const campId = params.campId;
  const metric = params.metric ?? 'composite_score';
  const limit = Math.min(parseInt(String(params.limit ?? '10'), 10) || 10, 25);
  const theme = params.theme === 'light' ? 'light' : 'dark';

  const { data = [], isLoading } = useQuery({
    queryKey: ['embed-leaderboard', campId],
    enabled: !!campId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_camp_leaderboard_public', { p_camp_id: campId! });
      if (error) throw error;
      return (data ?? []) as PublicRow[];
    },
  });

  const col = COLS.find((c) => c.key === metric);
  const isComposite = metric === 'composite_score';

  const ranked = [...data]
    .filter((r) => {
      const v = isComposite ? r.composite_score : (r as any)[metric];
      return v != null;
    })
    .sort((a, b) => {
      const av = isComposite ? a.composite_score! : ((a as any)[metric] as number);
      const bv = isComposite ? b.composite_score! : ((b as any)[metric] as number);
      if (isComposite) return bv - av;
      return col?.lower ? av - bv : bv - av;
    })
    .slice(0, limit);

  const isLight = theme === 'light';
  const dyn = {
    bg: isLight ? '#ffffff' : '#020617',
    fg: isLight ? '#0f172a' : '#f1f5f9',
    border: isLight ? '#e2e8f0' : '#1e293b',
    muted: isLight ? '#64748b' : '#94a3b8',
  };

  return (
    <ScrollView style={[s.container, { backgroundColor: dyn.bg }]} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <Text style={[s.headerTitle, { color: dyn.fg }]}>
          {(isComposite ? 'AI Composite' : col?.label ?? metric).toUpperCase()} · TOP {limit}
        </Text>
        <Text style={[s.brand, { color: dyn.muted }]}>OfferHound™</Text>
      </View>

      {isLoading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={dyn.muted} />
        </View>
      ) : ranked.length === 0 ? (
        <Text style={[s.empty, { color: dyn.muted }]}>No scores yet.</Text>
      ) : (
        <View style={s.list}>
          {ranked.map((r, idx) => {
            const v = isComposite ? r.composite_score! : ((r as any)[metric] as number);
            const display = isComposite ? Number(v).toFixed(1) : col!.fmt(v);
            return (
              <View key={r.enrollment_id} style={[s.row, { borderColor: dyn.border }]}>
                <Text style={[s.rank, { color: idx === 0 ? '#f59e0b' : dyn.muted }]}>{idx + 1}</Text>
                {r.jersey_number ? (
                  <Text style={[s.jersey, { color: dyn.fg }]}>#{r.jersey_number}</Text>
                ) : null}
                {r.position_group ? (
                  <Text style={[s.position, { color: dyn.muted }]}>{r.position_group.toUpperCase()}</Text>
                ) : null}
                <Text style={[s.value, { color: dyn.fg }]}>{display}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.sm + 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  headerTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.xs,
    letterSpacing: typography.letterSpacing.wide,
  },
  brand: { fontSize: 10, opacity: 0.6 },
  loadingRow: { paddingVertical: spacing.lg, alignItems: 'center' },
  empty: { textAlign: 'center', fontSize: typography.fontSize.xs, paddingVertical: spacing.md, opacity: 0.6 },
  list: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  rank: { width: 20, textAlign: 'right', fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.sm },
  jersey: { width: 32, textAlign: 'center', fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.sm },
  position: { fontSize: 10, opacity: 0.6 },
  value: { marginLeft: 'auto', fontFamily: 'Courier', fontSize: typography.fontSize.sm },
});
