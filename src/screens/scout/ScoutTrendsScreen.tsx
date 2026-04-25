// ScoutTrendsScreen — RN port of Lovable web ScoutTrends page.
// Source: offerhound-repo/src/pages/ScoutTrends.tsx (171 LOC)
//
// Adaptations (web → RN):
//   - 5x react-query queries hitting Supabase player_profiles preserved 1:1
//     (positions, states, grad years, sport breakdown, total athletes count).
//   - <div>/<h1>/<h3>/<p>            → <View>/<Text>
//   - className utility classes      → StyleSheet
//   - lucide-react                   → lucide-react-native
//   - Card / CardHeader / CardTitle / CardContent → @/components/ui/Card
//   - Badge variant="secondary"      → @/components/ui/Badge
//   - Progress (web shadcn)          → @/components/ui/Progress (value 0..100)
//   - Loader2 spinner                → ActivityIndicator
//   - SEO removed (no document head in RN)
//   - Footer rendered below scroll content
//   - Responsive 4-col / 2-col grid → uses useWindowDimensions @ 640px breakpoint
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  MapPin,
  Trophy,
  BarChart3,
  GraduationCap,
} from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { colors, typography, spacing } from '@/lib/theme';

type CountRow<TKey extends string> = Record<TKey, string> & { count: number };

export default function ScoutTrendsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const summaryCols = isWide ? 4 : 2;

  const { data: topPositions = [], isLoading: posLoading } = useQuery({
    queryKey: ['scout-trends-positions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('player_profiles')
        .select('position')
        .not('position', 'is', null)
        .limit(500);
      if (!data) return [] as CountRow<'position'>[];
      const counts: Record<string, number> = {};
      data.forEach((p: any) => {
        if (p.position) counts[p.position] = (counts[p.position] || 0) + 1;
      });
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([position, count]) => ({ position, count }));
    },
  });

  const { data: topStates = [] } = useQuery({
    queryKey: ['scout-trends-states'],
    queryFn: async () => {
      const { data } = await supabase
        .from('player_profiles')
        .select('state')
        .not('state', 'is', null)
        .limit(500);
      if (!data) return [] as CountRow<'state'>[];
      const counts: Record<string, number> = {};
      data.forEach((p: any) => {
        if (p.state) counts[p.state] = (counts[p.state] || 0) + 1;
      });
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([state, count]) => ({ state, count }));
    },
  });

  const { data: gradYears = [] } = useQuery({
    queryKey: ['scout-trends-gradyears'],
    queryFn: async () => {
      const { data } = await supabase
        .from('player_profiles')
        .select('graduation_year')
        .not('graduation_year', 'is', null)
        .limit(500);
      if (!data) return [] as { year: string; count: number }[];
      const counts: Record<string, number> = {};
      data.forEach((p: any) => {
        if (p.graduation_year) counts[p.graduation_year] = (counts[p.graduation_year] || 0) + 1;
      });
      return Object.entries(counts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([year, count]) => ({ year, count }));
    },
  });

  const { data: sportBreakdown = [] } = useQuery({
    queryKey: ['scout-trends-sports'],
    queryFn: async () => {
      const { data } = await supabase
        .from('player_profiles')
        .select('sport')
        .not('sport', 'is', null)
        .limit(500);
      if (!data) return [] as CountRow<'sport'>[];
      const counts: Record<string, number> = {};
      data.forEach((p: any) => {
        if (p.sport) counts[p.sport] = (counts[p.sport] || 0) + 1;
      });
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([sport, count]) => ({ sport, count }));
    },
  });

  const { data: totalAthletes = 0 } = useQuery({
    queryKey: ['scout-trends-total'],
    queryFn: async () => {
      const { count } = await supabase
        .from('player_profiles')
        .select('id', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const maxPos = useMemo(
    () => (topPositions.length > 0 ? Math.max(...topPositions.map(p => p.count)) : 1),
    [topPositions],
  );
  const maxState = useMemo(
    () => (topStates.length > 0 ? Math.max(...topStates.map(s => s.count)) : 1),
    [topStates],
  );
  const maxSport = useMemo(
    () => (sportBreakdown.length > 0 ? Math.max(...sportBreakdown.map(s => s.count)) : 1),
    [sportBreakdown],
  );

  const summary: Array<{ label: string; value: number; icon: typeof Users }> = [
    { label: 'Total Athletes', value: totalAthletes, icon: Users },
    { label: 'Positions Tracked', value: topPositions.length, icon: Trophy },
    { label: 'States Represented', value: topStates.length, icon: MapPin },
    { label: 'Grad Years', value: gradYears.length, icon: GraduationCap },
  ];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <View style={s.header}>
          <TrendingUp size={28} color={colors.primary} />
          <View style={s.headerText}>
            <Text style={s.title}>Scouting Trends</Text>
            <Text style={s.subtitle}>Talent pool insights and market analytics</Text>
          </View>
        </View>

        {/* Summary stats */}
        <View style={[s.summaryGrid, { gap: spacing.sm }]}>
          {summary.map(stat => {
            const Icon = stat.icon;
            return (
              <View key={stat.label} style={[s.summaryCell, { width: `${100 / summaryCols - 2}%` }]}>
                <Card>
                  <CardContent style={s.summaryContent}>
                    <Icon size={20} color={colors.primary} />
                    <View style={{ flexShrink: 1 }}>
                      <Text style={s.summaryValue}>{posLoading ? '—' : String(stat.value)}</Text>
                      <Text style={s.summaryLabel}>{stat.label}</Text>
                    </View>
                  </CardContent>
                </Card>
              </View>
            );
          })}
        </View>

        {posLoading ? (
          <View style={s.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={[s.cardsWrap, isWide && s.cardsWrapWide]}>
            {/* Top Positions */}
            <Card style={[s.chartCard, isWide && s.chartCardWide]}>
              <View style={s.chartHeader}>
                <Trophy size={18} color={colors.primary} />
                <Text style={s.cardTitleText}>Top Positions</Text>
              </View>
              <CardContent style={s.chartContent}>
                {topPositions.length === 0 ? (
                  <Text style={s.emptyText}>No data yet</Text>
                ) : (
                  topPositions.map((p, i) => (
                    <View key={p.position} style={s.row}>
                      <View style={s.rowHead}>
                        <Text style={s.rowLabel}>
                          <Text style={s.rowIndex}>{i + 1}. </Text>
                          {p.position}
                        </Text>
                        <Badge variant="secondary">{p.count}</Badge>
                      </View>
                      <Progress value={(p.count / maxPos) * 100} />
                    </View>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top States */}
            <Card style={[s.chartCard, isWide && s.chartCardWide]}>
              <View style={s.chartHeader}>
                <MapPin size={18} color={colors.primary} />
                <Text style={s.cardTitleText}>Top States</Text>
              </View>
              <CardContent style={s.chartContent}>
                {topStates.length === 0 ? (
                  <Text style={s.emptyText}>No data yet</Text>
                ) : (
                  topStates.map((st, i) => (
                    <View key={st.state} style={s.row}>
                      <View style={s.rowHead}>
                        <Text style={s.rowLabel}>
                          <Text style={s.rowIndex}>{i + 1}. </Text>
                          {st.state}
                        </Text>
                        <Badge variant="secondary">{st.count}</Badge>
                      </View>
                      <Progress value={(st.count / maxState) * 100} />
                    </View>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Sport Breakdown */}
            <Card style={[s.chartCard, isWide && s.chartCardWide]}>
              <View style={s.chartHeader}>
                <BarChart3 size={18} color={colors.primary} />
                <Text style={s.cardTitleText}>Sport Breakdown</Text>
              </View>
              <CardContent style={s.chartContent}>
                {sportBreakdown.length === 0 ? (
                  <Text style={s.emptyText}>No data yet</Text>
                ) : (
                  sportBreakdown.map(sb => (
                    <View key={sb.sport} style={s.row}>
                      <View style={s.rowHead}>
                        <Text style={s.rowLabel}>{sb.sport}</Text>
                        <Badge variant="secondary">{sb.count}</Badge>
                      </View>
                      <Progress value={(sb.count / maxSport) * 100} />
                    </View>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Grad Year Distribution */}
            <Card style={[s.chartCard, isWide && s.chartCardWide]}>
              <View style={s.chartHeader}>
                <GraduationCap size={18} color={colors.primary} />
                <Text style={s.cardTitleText}>Graduation Year</Text>
              </View>
              <CardContent style={s.chartContent}>
                {gradYears.length === 0 ? (
                  <Text style={s.emptyText}>No data yet</Text>
                ) : (
                  gradYears.map(g => (
                    <View key={g.year} style={s.gradRow}>
                      <Text style={s.gradLabel}>Class of {g.year}</Text>
                      <Badge variant="secondary">{g.count}</Badge>
                    </View>
                  ))
                )}
              </CardContent>
            </Card>
          </View>
        )}

        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  headerText: { flexShrink: 1 },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryCell: { flexGrow: 1, minWidth: 140 },
  summaryContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  summaryValue: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize['2xl'], color: colors.foreground },
  summaryLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  loaderWrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
  cardsWrap: { gap: spacing.md },
  cardsWrapWide: { flexDirection: 'row', flexWrap: 'wrap' },
  chartCard: { width: '100%' },
  chartCardWide: { width: '48.5%' },
  chartContent: { gap: spacing.sm, padding: spacing.md },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, paddingBottom: 0 },
  cardTitleText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  row: { gap: 4 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
  rowIndex: { color: colors.mutedForeground },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  gradRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  gradLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
});
