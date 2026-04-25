// Ported verbatim from Lovable src/components/CampCrossCampTrending.tsx
// Web → RN mapping:
//   - Tailwind → StyleSheet using @/lib/theme tokens
//   - shadcn/ui → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - Position heatmap: Lovable uses `hsl(var(--primary) / opacity)`.
//     RN port computes the equivalent using primary hex + alpha overlay.
//   - md:grid-cols-4 responsive grid → flex wrap with ~50% basis (mobile-first)
//   - Hover utility classes are no-ops
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TrendingUp, Sparkles, Map as MapIcon } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Props {
  campIds?: string[];
}

interface AthleteAggregate {
  athleteProfileId: string;
  fullName: string;
  position: string | null;
  campsAttended: number;
  avgScore: number;
  bestScore: number;
  trendDelta: number;
  hiddenGem: boolean;
}

export function CampCrossCampTrending({ campIds }: Props) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['camp-cross-trending', user?.id, campIds],
    enabled: !!user,
    queryFn: async () => {
      let ownedIds = campIds || [];
      if (!ownedIds.length) {
        const { data: camps } = await supabase
          .from('camps')
          .select('id')
          .eq('coach_user_id', user!.id);
        ownedIds = (camps || []).map((c: any) => c.id);
      }
      if (!ownedIds.length)
        return { athletes: [] as AthleteAggregate[], heatmap: [] as { position: string; count: number; avgScore: number }[] };

      const { data: scores } = await supabase
        .from('camp_ai_scores')
        .select('athlete_profile_id, composite_score, camp_id, created_at, ai_rank')
        .in('camp_id', ownedIds)
        .not('athlete_profile_id', 'is', null)
        .order('created_at', { ascending: true });

      const athleteIds = Array.from(
        new Set((scores || []).map((s: any) => s.athlete_profile_id).filter(Boolean))
      ) as string[];

      const { data: profiles } = athleteIds.length
        ? await supabase.from('player_profiles').select('id, full_name, position').in('id', athleteIds)
        : { data: [] as any[] };

      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

      const byAthlete = new Map<string, any[]>();
      for (const s of scores || []) {
        if (!s.athlete_profile_id) continue;
        const arr = byAthlete.get(s.athlete_profile_id) || [];
        arr.push(s);
        byAthlete.set(s.athlete_profile_id, arr);
      }

      const athletes: AthleteAggregate[] = [];
      for (const [aid, list] of byAthlete.entries()) {
        const sorted = [...list].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const composites = sorted.map((s) => Number(s.composite_score) || 0);
        const avg = composites.reduce((a, b) => a + b, 0) / composites.length;
        const best = Math.max(...composites);
        const trendDelta = composites.length > 1 ? composites[composites.length - 1] - composites[0] : 0;
        const profile = profileById.get(aid);
        const everTopRanked = sorted.some((s) => s.ai_rank != null && s.ai_rank <= 3);
        const hiddenGem = avg >= 75 && !everTopRanked;
        athletes.push({
          athleteProfileId: aid,
          fullName: profile?.full_name || 'Unknown',
          position: profile?.position || null,
          campsAttended: sorted.length,
          avgScore: avg,
          bestScore: best,
          trendDelta,
          hiddenGem,
        });
      }

      const posMap = new Map<string, { count: number; total: number }>();
      for (const a of athletes) {
        const pos = a.position || 'Unknown';
        const cur = posMap.get(pos) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += a.avgScore;
        posMap.set(pos, cur);
      }
      const heatmap = Array.from(posMap.entries())
        .map(([position, v]) => ({ position, count: v.count, avgScore: v.total / v.count }))
        .sort((a, b) => b.avgScore - a.avgScore);

      return { athletes, heatmap };
    },
  });

  if (isLoading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );

  const athletes = data?.athletes || [];
  const heatmap = data?.heatmap || [];
  const risers = [...athletes]
    .filter((a) => a.campsAttended > 1)
    .sort((a, b) => b.trendDelta - a.trendDelta)
    .slice(0, 8);
  const hiddenGems = athletes
    .filter((a) => a.hiddenGem)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8);

  // primary = #e7af08; produce rgba with alpha 0.08 + intensity*0.35
  const primaryRgba = (alpha: number) => `rgba(231, 175, 8, ${alpha})`;

  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <CardHeader>
          <View style={s.titleRow}>
            <TrendingUp size={20} color={colors.primary} />
            <CardTitle>Cross-camp risers</CardTitle>
          </View>
          <CardDescription>Athletes whose AI composite improved most across multiple camps</CardDescription>
        </CardHeader>
        <CardContent>
          {risers.length === 0 ? (
            <Text style={s.muted}>Need athletes with multiple camp scores to detect risers.</Text>
          ) : (
            <View style={{ gap: spacing.xs }}>
              {risers.map((a) => (
                <View key={a.athleteProfileId} style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{a.fullName}</Text>
                    <Text style={s.metaXs}>{a.position || '—'} • {a.campsAttended} camps</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Badge variant={a.trendDelta >= 0 ? 'default' : 'destructive'}>
                      {`${a.trendDelta >= 0 ? '+' : ''}${a.trendDelta.toFixed(1)}`}
                    </Badge>
                    <Text style={[s.metaXs, { marginTop: 2 }]}>avg {a.avgScore.toFixed(1)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <View style={s.titleRow}>
            <Sparkles size={20} color={colors.primary} />
            <CardTitle>Hidden gem AI alerts</CardTitle>
          </View>
          <CardDescription>High-scoring athletes (avg ≥ 75) who never finished in the top 3</CardDescription>
        </CardHeader>
        <CardContent>
          {hiddenGems.length === 0 ? (
            <Text style={s.muted}>No hidden gems detected yet.</Text>
          ) : (
            <View style={{ gap: spacing.xs }}>
              {hiddenGems.map((a) => (
                <View key={a.athleteProfileId} style={[s.row, { backgroundColor: primaryRgba(0.05) }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{a.fullName}</Text>
                    <Text style={s.metaXs}>{a.position || '—'} • {a.campsAttended} camps</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Badge variant="secondary">avg {a.avgScore.toFixed(1)}</Badge>
                    <Text style={[s.metaXs, { marginTop: 2 }]}>best {a.bestScore.toFixed(1)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <View style={s.titleRow}>
            <MapIcon size={20} color={colors.primary} />
            <CardTitle>Position heatmap</CardTitle>
          </View>
          <CardDescription>Talent density and average score by position across your camps</CardDescription>
        </CardHeader>
        <CardContent>
          {heatmap.length === 0 ? (
            <Text style={s.muted}>No position data yet.</Text>
          ) : (
            <View style={s.heatGrid}>
              {heatmap.map((h) => {
                const intensity = Math.min(1, h.avgScore / 100);
                return (
                  <View
                    key={h.position}
                    style={[s.heatCell, { backgroundColor: primaryRgba(0.08 + intensity * 0.35) }]}
                  >
                    <Text style={s.heatPos}>{h.position}</Text>
                    <Text style={s.metaXs}>{h.count} {h.count === 1 ? 'athlete' : 'athletes'}</Text>
                    <Text style={s.heatAvg}>avg {h.avgScore.toFixed(1)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </CardContent>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  muted: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.body },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm },
  name: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  metaXs: { color: colors.mutedForeground, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.body },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  heatCell: { borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border, minWidth: '47%', flexGrow: 1 },
  heatPos: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  heatAvg: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.xs, color: colors.foreground, marginTop: 2 },
});
