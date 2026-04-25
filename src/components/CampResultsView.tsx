// Parity port from Lovable src/components/CampResultsView.tsx (verbatim logic).
// Web→RN translations:
//   <div>/<p>/<h2>/<h3> → <View>/<Text>
//   Tailwind classes → StyleSheet via @/lib/theme tokens
//   @/components/ui/* (lowercase) → PascalCase RN ports
//   lucide-react → lucide-react-native
//   onChange e.target.value → onChangeText
//   defaultValue on Tabs → controlled state (RN Tabs is controlled-only)
//   Canvas-based scorecard PNG → native View rendered offscreen, captured
//     via react-native-view-shot's captureRef → expo-sharing share sheet.
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs';
import {
  ArrowLeft,
  Trophy,
  Loader2,
  Search,
  Download,
  Share2,
  Award,
  TrendingUp,
} from 'lucide-react-native';
import type { Camp } from '@/hooks/useCampManager';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography, radius } from '@/lib/theme';

interface CampResultsViewProps {
  camp: Camp;
  onBack: () => void;
}

interface AIScoreRow {
  enrollment_id: string | null;
  athlete_profile_id: string | null;
  composite_score: number;
  ai_rank: number | null;
  ai_summary: string | null;
  speed_score: number | null;
  agility_score: number | null;
  explosiveness_score: number | null;
  position_score: number | null;
}

interface EnrollmentRow {
  id: string;
  user_id: string;
  athlete_profile_id: string | null;
  position_group: string | null;
  jersey_number: string | null;
  status: string;
}

export function CampResultsView({ camp, onBack }: CampResultsViewProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [tab, setTab] = useState('leaderboard');
  const [scorecardData, setScorecardData] = useState<ScorecardData | null>(null);
  const scorecardRef = useRef<View>(null);

  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['camp-results-scores', camp.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_ai_scores')
        .select(
          'enrollment_id, athlete_profile_id, composite_score, ai_rank, ai_summary, speed_score, agility_score, explosiveness_score, position_score'
        )
        .eq('camp_id', camp.id)
        .order('composite_score', { ascending: false });
      if (error) throw error;
      return (data || []) as AIScoreRow[];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['camp-results-enrollments', camp.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_enrollments')
        .select('id, user_id, athlete_profile_id, position_group, jersey_number, status')
        .eq('camp_id', camp.id);
      if (error) throw error;
      return (data || []) as EnrollmentRow[];
    },
  });

  const profileIds = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...scores.map((sc) => sc.athlete_profile_id),
            ...enrollments.map((e) => e.athlete_profile_id),
          ].filter(Boolean) as string[]
        )
      ),
    [scores, enrollments]
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ['camp-results-profiles', camp.id, profileIds.join(',')],
    queryFn: async () => {
      if (profileIds.length === 0) return [];
      const { data, error } = await supabase
        .from('player_profiles')
        .select('id, full_name, position, graduation_year, school, profile_image_url')
        .in('id', profileIds);
      if (error) throw error;
      return data || [];
    },
    enabled: profileIds.length > 0,
  });

  const profileById = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of profiles) map.set((p as any).id, p);
    return map;
  }, [profiles]);

  const enrollmentById = useMemo(() => {
    const map = new Map<string, EnrollmentRow>();
    for (const e of enrollments) map.set(e.id, e);
    return map;
  }, [enrollments]);

  const rows = useMemo(() => {
    const ranked = scores.map((sc, i) => {
      const enrollment = sc.enrollment_id ? enrollmentById.get(sc.enrollment_id) : null;
      const profileId = sc.athlete_profile_id || enrollment?.athlete_profile_id;
      const profile = profileId ? profileById.get(profileId) : null;
      return {
        scoreId: `${sc.enrollment_id ?? 'x'}-${i}`,
        rank: sc.ai_rank ?? i + 1,
        name: profile?.full_name || 'Unrostered athlete',
        position: profile?.position || enrollment?.position_group || '—',
        graduation_year: profile?.graduation_year || null,
        school: profile?.school || null,
        composite: sc.composite_score,
        speed: sc.speed_score,
        agility: sc.agility_score,
        explosiveness: sc.explosiveness_score,
        positionScore: sc.position_score,
        summary: sc.ai_summary,
        jersey: enrollment?.jersey_number || null,
        profileImageUrl: profile?.profile_image_url || null,
        profileId,
      };
    });
    if (!search) return ranked;
    const q = search.toLowerCase();
    return ranked.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.position || '').toLowerCase().includes(q) ||
        (r.school || '').toLowerCase().includes(q)
    );
  }, [scores, enrollmentById, profileById, search]);

  const generateScorecard = async (row: (typeof rows)[number]) => {
    setScoringId(row.scoreId);
    try {
      // 1. Mount the offscreen scorecard with this athlete's data.
      const data: ScorecardData = {
        athleteName: row.name,
        position: row.position,
        graduationYear: row.graduation_year,
        school: row.school,
        composite: row.composite,
        speed: row.speed,
        agility: row.agility,
        explosiveness: row.explosiveness,
        positionScore: row.positionScore,
        rank: row.rank,
        campName: camp.name,
        campDate: camp.start_date,
      };
      setScorecardData(data);
      // Wait one frame so the offscreen view layout commits before capture.
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => setTimeout(r, 50));

      // 2. Capture the View as a PNG file URI.
      if (!scorecardRef.current) throw new Error('Scorecard view not mounted');
      const uri = await captureRef(scorecardRef, {
        format: 'png',
        quality: 1,
      });

      // 3. Surface the native share sheet.
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Scorecard',
          UTI: 'public.png',
        });
      } else {
        toast({
          title: 'Scorecard ready',
          description: `${row.name} — composite ${row.composite.toFixed(1)} (rank #${row.rank})`,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Could not generate scorecard.',
        variant: 'destructive',
      });
    } finally {
      setScoringId(null);
      setScorecardData(null);
    }
  };

  const handleSaveCampHistory = async () => {
    try {
      const archive = await buildCampHistoryArchive(camp, rows);
      // eslint-disable-next-line no-console
      console.log('[CampResultsView] camp history archive', archive);
      toast({
        title: 'Camp history saved',
        description: `Captured ${archive.athlete_count} athletes — see console for archive snapshot.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Could not export camp history.',
        variant: 'destructive',
      });
    }
  };

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Button variant="ghost" size="sm" onPress={onBack} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>
            Back to Camps
          </Button>
          <View>
            <Text style={s.title}>{camp.name}</Text>
            <Text style={s.subtitle}>Post-camp results & shareable scorecards</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Badge variant="secondary">
            <View style={s.badgeRow}>
              <TrendingUp size={12} color={colors.foreground} />
              <Text style={s.badgeText}>{scores.length} scored</Text>
            </View>
          </Badge>
          <Badge variant="secondary">
            <View style={s.badgeRow}>
              <Trophy size={12} color={colors.foreground} />
              <Text style={s.badgeText}>
                Top: {scores[0]?.composite_score?.toFixed(1) ?? '—'}
              </Text>
            </View>
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onPress={handleSaveCampHistory}
            disabled={rows.length === 0}
            leftIcon={<Download size={16} color={colors.foreground} />}
          >
            Save camp history
          </Button>
        </View>
      </View>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="podium">Podium</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <View style={s.searchWrap}>
            <Search size={16} color={colors.mutedForeground} style={s.searchIcon} />
            <Input
              placeholder="Search athlete, position, school…"
              value={search}
              onChangeText={setSearch}
              style={s.searchInput}
            />
          </View>

          {scoresLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent style={s.emptyContent}>
                <Trophy size={48} color={colors.mutedForeground} style={s.emptyIcon} />
                <Text style={s.emptyTitle}>No scored athletes yet</Text>
                <Text style={s.emptyDesc}>
                  Run AI Scoring after capturing performance data to populate the leaderboard.
                </Text>
              </CardContent>
            </Card>
          ) : (
            <View style={s.rowsList}>
              {rows.map((row) => (
                <Card key={row.scoreId}>
                  <CardContent style={s.rowContent}>
                    <View style={s.rankCircle}>
                      <Text style={s.rankText}>#{row.rank}</Text>
                    </View>
                    <View style={s.rowMain}>
                      <Text style={s.rowName}>{row.name}</Text>
                      <Text style={s.rowMeta}>
                        {[row.position, row.graduation_year, row.school]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </Text>
                    </View>
                    <View style={s.subBadges}>
                      {row.speed != null && (
                        <Badge variant="outline">Speed {row.speed.toFixed(1)}</Badge>
                      )}
                      {row.agility != null && (
                        <Badge variant="outline">Agility {row.agility.toFixed(1)}</Badge>
                      )}
                      {row.explosiveness != null && (
                        <Badge variant="outline">Explosive {row.explosiveness.toFixed(1)}</Badge>
                      )}
                    </View>
                    <View style={s.compositeWrap}>
                      <Text style={s.compositeNum}>{row.composite.toFixed(1)}</Text>
                      <Text style={s.compositeLbl}>Composite</Text>
                    </View>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => generateScorecard(row)}
                      disabled={scoringId === row.scoreId}
                      leftIcon={
                        scoringId === row.scoreId ? (
                          <Loader2 size={16} color={colors.foreground} />
                        ) : (
                          <Share2 size={16} color={colors.foreground} />
                        )
                      }
                    >
                      Scorecard
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </View>
          )}
        </TabsContent>

        <TabsContent value="podium">
          <View style={s.podiumGrid}>
            {[0, 1, 2].map((i) => {
              const r = rows[i];
              if (!r) {
                return (
                  <Card key={i} style={s.podiumEmpty}>
                    <CardContent style={s.podiumEmptyContent}>
                      <Text style={s.podiumEmptyText}>No athlete in #{i + 1}</Text>
                    </CardContent>
                  </Card>
                );
              }
              const podiumStyle =
                i === 0
                  ? s.podiumGold
                  : i === 1
                  ? s.podiumSilver
                  : s.podiumBronze;
              return (
                <Card key={r.scoreId} style={{ ...s.podiumCard, ...podiumStyle }}>
                  <CardHeader style={s.podiumHeader}>
                    <Award size={32} color={colors.primary} />
                    <CardTitle style={s.podiumRank}>#{i + 1}</CardTitle>
                    <CardDescription style={s.podiumName}>{r.name}</CardDescription>
                  </CardHeader>
                  <CardContent style={s.podiumBody}>
                    <Text style={s.podiumScore}>{r.composite.toFixed(1)}</Text>
                    <Text style={s.podiumMeta}>
                      {[r.position, r.school].filter(Boolean).join(' · ')}
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => generateScorecard(r)}
                      disabled={scoringId === r.scoreId}
                      leftIcon={
                        scoringId === r.scoreId ? (
                          <Loader2 size={16} color={colors.foreground} />
                        ) : (
                          <Download size={16} color={colors.foreground} />
                        )
                      }
                    >
                      Download
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </View>
        </TabsContent>
      </Tabs>

      {/* Offscreen scorecard for captureRef. Rendered absolutely off-screen
          so the user never sees it but the layout still commits and is
          captureable as a PNG. */}
      {scorecardData ? (
        <View pointerEvents="none" style={s.offscreen} collapsable={false}>
          <ScorecardView ref={scorecardRef} data={scorecardData} />
        </View>
      ) : null}
    </View>
  );
}

// ---- Scorecard renderer (captureRef → PNG share) -----------------------
// Visual layout ported from Lovable web's <canvas> drawing logic.
// Logical canvas is 1080×1350 (Instagram portrait); we render at native
// pixel density and let captureRef rasterize at quality 1.

interface ScorecardData {
  athleteName: string;
  position?: string | null;
  graduationYear?: string | number | null;
  school?: string | null;
  composite: number;
  speed?: number | null;
  agility?: number | null;
  explosiveness?: number | null;
  positionScore?: number | null;
  rank: number;
  campName: string;
  campDate: string;
}

function formatScorecardDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

const SCORECARD_W = 1080;
const SCORECARD_H = 1350;

const ScorecardView = React.forwardRef<View, { data: ScorecardData }>(
  function ScorecardView({ data }, ref) {
    const subParts = [
      data.position,
      data.graduationYear ? `Class of ${data.graduationYear}` : null,
      data.school,
    ]
      .filter(Boolean)
      .join(' · ');

    const subScores: Array<{ label: string; value: number | null | undefined }> = [
      { label: 'SPEED', value: data.speed },
      { label: 'AGILITY', value: data.agility },
      { label: 'EXPLOSIVE', value: data.explosiveness },
      { label: 'POSITION', value: data.positionScore },
    ];

    return (
      <View ref={ref} collapsable={false} style={sc.root}>
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Header band */}
        <View style={sc.headerBand}>
          <Text style={sc.headerBrand}>OFFERHOUND™</Text>
          <Text style={sc.headerLabel}>CAMP SCORECARD</Text>
        </View>

        {/* Camp meta */}
        <View style={sc.metaWrap}>
          <View style={{ flex: 1 }}>
            <Text style={sc.campName} numberOfLines={1}>
              {data.campName.toUpperCase()}
            </Text>
            <Text style={sc.campDate}>{formatScorecardDate(data.campDate)}</Text>
          </View>
          <View style={sc.rankChip}>
            <Text style={sc.rankChipText}>#{data.rank}</Text>
          </View>
        </View>

        {/* Athlete name */}
        <Text style={sc.athleteName} numberOfLines={2}>
          {data.athleteName.toUpperCase()}
        </Text>
        {subParts ? <Text style={sc.athleteSub}>{subParts}</Text> : null}

        {/* Composite hero */}
        <View style={sc.compositeWrap}>
          <Text style={sc.compositeNum}>{data.composite.toFixed(1)}</Text>
          <Text style={sc.compositeLabel}>COMPOSITE SCORE</Text>
        </View>

        {/* Sub-score grid */}
        <View style={sc.subGrid}>
          {subScores.map((sub) => (
            <View key={sub.label} style={sc.subCard}>
              <Text style={sc.subValue}>
                {sub.value != null ? sub.value.toFixed(1) : '—'}
              </Text>
              <Text style={sc.subLabel}>{sub.label}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={sc.footer}>
          AI-evaluated · Patent Pending · offerhound.com
        </Text>
      </View>
    );
  }
);

const sc = StyleSheet.create({
  root: {
    width: SCORECARD_W,
    height: SCORECARD_H,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  headerBand: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 80,
    backgroundColor: '#fb923c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 60,
  },
  headerBrand: {
    color: '#0f172a',
    fontSize: 36,
    fontWeight: 'bold',
  },
  headerLabel: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: 'bold',
  },
  metaWrap: {
    position: 'absolute',
    top: 120,
    left: 60,
    right: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  campName: {
    color: '#fed7aa',
    fontSize: 28,
    fontWeight: 'bold',
  },
  campDate: {
    color: '#94a3b8',
    fontSize: 20,
    marginTop: 6,
  },
  rankChip: {
    width: 160,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#fb923c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankChipText: {
    color: '#0f172a',
    fontSize: 56,
    fontWeight: 'bold',
  },
  athleteName: {
    position: 'absolute',
    top: 280,
    left: 60,
    right: 60,
    color: '#ffffff',
    fontSize: 72,
    fontWeight: 'bold',
    lineHeight: 78,
  },
  athleteSub: {
    position: 'absolute',
    top: 440,
    left: 60,
    right: 60,
    color: '#cbd5e1',
    fontSize: 28,
  },
  compositeWrap: {
    position: 'absolute',
    top: 520,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  compositeNum: {
    color: '#fb923c',
    fontSize: 220,
    fontWeight: 'bold',
    lineHeight: 230,
    textAlign: 'center',
  },
  compositeLabel: {
    color: '#94a3b8',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 8,
  },
  subGrid: {
    position: 'absolute',
    top: 870,
    left: 60,
    right: 60,
    flexDirection: 'row',
    gap: 30,
  },
  subCard: {
    flex: 1,
    height: 180,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subValue: {
    color: '#fb923c',
    fontSize: 56,
    fontWeight: 'bold',
  },
  subLabel: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    color: '#475569',
    fontSize: 20,
    textAlign: 'center',
  },
});

// ---- Camp history archive (RN-safe; no Blob/URL) ---------------------
async function buildCampHistoryArchive(
  camp: { id: string; name: string; start_date: string; end_date?: string | null },
  rows: Array<{
    profileId?: string | null;
    name: string;
    rank: number;
    composite: number;
    speed?: number | null;
    agility?: number | null;
    explosiveness?: number | null;
    positionScore?: number | null;
    summary?: string | null;
    position?: string | null;
    school?: string | null;
    graduation_year?: string | number | null;
  }>
) {
  const profileIds = rows.map((r) => r.profileId).filter(Boolean) as string[];
  const [{ data: performance }, { data: enrollments }, { data: profiles }] =
    await Promise.all([
      supabase.from('camp_performance_entries').select('*').eq('camp_id', camp.id),
      supabase.from('camp_enrollments').select('*').eq('camp_id', camp.id),
      profileIds.length > 0
        ? supabase.from('player_profiles').select('*').in('id', profileIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

  const profilesById = new Map<string, any>();
  for (const p of profiles || []) profilesById.set((p as any).id, p);

  const athletes = rows.map((r) => ({
    name: r.name,
    rank: r.rank,
    composite_score: r.composite,
    sub_scores: {
      speed: r.speed ?? null,
      agility: r.agility ?? null,
      explosiveness: r.explosiveness ?? null,
      position: r.positionScore ?? null,
    },
    ai_summary: r.summary ?? null,
    profile: r.profileId ? profilesById.get(r.profileId) ?? null : null,
    performance:
      (performance || []).filter((p: any) => p.athlete_profile_id === r.profileId) ?? [],
    enrollment:
      (enrollments || []).find((e: any) => e.athlete_profile_id === r.profileId) ?? null,
  }));

  return {
    camp: {
      id: camp.id,
      name: camp.name,
      start_date: camp.start_date,
      end_date: camp.end_date ?? null,
    },
    exported_at: new Date().toISOString(),
    athlete_count: athletes.length,
    athletes,
  };
}

const s = StyleSheet.create({
  root: { gap: spacing.md },
  offscreen: {
    position: 'absolute',
    left: -10000,
    top: 0,
    opacity: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h4,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.foreground,
  },
  searchWrap: { position: 'relative', maxWidth: 384, marginBottom: spacing.sm },
  searchIcon: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
  searchInput: { paddingLeft: 36 },
  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyContent: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyIcon: { marginBottom: spacing.sm },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  emptyDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  rowsList: { gap: spacing.sm },
  rowContent: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  rankCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(231,175,8,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.lg,
    color: colors.primary,
  },
  rowMain: { flex: 1, minWidth: 180 },
  rowName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  rowMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
  },
  subBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  compositeWrap: { alignItems: 'flex-end', minWidth: 80 },
  compositeNum: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.primary,
    lineHeight: typography.heading.h2,
  },
  compositeLbl: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  podiumGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  podiumCard: { flexBasis: '30%', flexGrow: 1, borderWidth: 2 },
  podiumEmpty: { flexBasis: '30%', flexGrow: 1, opacity: 0.5 },
  podiumEmptyContent: { paddingVertical: spacing.xl, alignItems: 'center' },
  podiumEmptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
  },
  podiumGold: { borderColor: colors.primary, backgroundColor: 'rgba(231,175,8,0.1)' },
  podiumSilver: { borderColor: colors.secondary, backgroundColor: 'rgba(39,43,52,0.3)' },
  podiumBronze: { borderColor: colors.accent, backgroundColor: 'rgba(237,189,42,0.2)' },
  podiumHeader: { alignItems: 'center', paddingBottom: spacing.sm, gap: 4 },
  podiumRank: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
  },
  podiumName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
  },
  podiumBody: { alignItems: 'center', gap: spacing.sm },
  podiumScore: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.primary,
  },
  podiumMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
