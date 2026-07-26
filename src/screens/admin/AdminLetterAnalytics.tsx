// AdminLetterAnalytics — Letter click analytics screen.
//
// Now mirrors Lovable web src/pages/AdminLetterAnalytics.tsx which queries
// `letter_button_clicks` (surface / viewer_role / recipient_category /
// recipient_type / letter_type / created_at) with date-range + per-column
// filters and a "group-by" breakdown, instead of aggregating `letter_history`.
//
// Web→RN mapping:
//   - <div>/<h*>/<p>          → <View>/<Text>
//   - shadcn Card             → @/components/ui/Card
//   - shadcn Select           → @/components/ui/Select
//   - shadcn Button           → @/components/ui/Button
//   - lucide-react            → lucide-react-native
//   - <Navigate to="/" replace/> → nav.reset() to landing on non-admin
//   - grid-cols-2             → 2-up View row (RN has no CSS grid)
//   - percent bar (h-2 div)   → <View>/<View> track+fill
//
// Behavior preserved verbatim: filter list, date ranges, sort modes, ANY
// sentinel, groupBy(), uniqueValues(), reset behavior, empty-state tips.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart3, Filter, Inbox, Lightbulb } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface ClickRow {
  surface: string | null;
  viewer_role: string | null;
  recipient_category: string | null;
  recipient_type: string | null;
  letter_type: string | null;
  created_at: string | null;
}

type GroupKey =
  | 'surface'
  | 'viewer_role'
  | 'recipient_category'
  | 'recipient_type'
  | 'letter_type';

type SortMode = 'count-desc' | 'count-asc' | 'alpha';

const DATE_RANGES: Array<{ value: string; label: string; days: number | null }> = [
  { value: '24h', label: 'Last 24 hours', days: 1 },
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: 'all', label: 'All time', days: null },
];

const ANY = '__any__';

function uniqueValues(rows: ClickRow[], key: keyof ClickRow): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[key];
    if (typeof v === 'string' && v.length > 0) set.add(v);
  }
  return Array.from(set).sort();
}

function groupBy(rows: ClickRow[], key: GroupKey, sort: SortMode) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = (r[key] as string) || '(none)';
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const entries = Array.from(counts.entries());
  if (sort === 'alpha') entries.sort((a, b) => a[0].localeCompare(b[0]));
  else if (sort === 'count-asc') entries.sort((a, b) => a[1] - b[1]);
  else entries.sort((a, b) => b[1] - a[1]);
  return entries;
}

function GroupCard({
  title,
  entries,
  total,
}: {
  title: string;
  entries: [string, number][];
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent style={{ gap: spacing.sm }}>
        {entries.length === 0 && (
          <Text style={s.muted}>No data for this filter.</Text>
        )}
        {entries.map(([k, v]) => {
          const pct = total > 0 ? Math.round((v / total) * 100) : 0;
          return (
            <View key={k} style={{ gap: 4 }}>
              <View style={s.rowBetween}>
                <Text style={s.groupKey} numberOfLines={1}>
                  {k}
                </Text>
                <Text style={s.groupCount}>
                  {v} · {pct}%
                </Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${pct}%` }]} />
              </View>
            </View>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function AdminLetterAnalytics() {
  const nav = useNavigation<any>();
  const { isAdmin, loading: roleLoading } = useAdminRole();

  const [allRows, setAllRows] = useState<ClickRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ----- Filter + sort state -------------------------------------
  const [dateRange, setDateRange] = useState<string>('30d');
  const [surface, setSurface] = useState<string>(ANY);
  const [recipientCategory, setRecipientCategory] = useState<string>(ANY);
  const [recipientType, setRecipientType] = useState<string>(ANY);
  const [letterType, setLetterType] = useState<string>(ANY);
  const [sort, setSort] = useState<SortMode>('count-desc');

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from('letter_button_clicks')
        .select(
          'surface, viewer_role, recipient_category, recipient_type, letter_type, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(5000);
      setAllRows(((data as any) as ClickRow[]) || []);
      setLoading(false);
    })();
  }, [isAdmin]);

  // ----- Non-admin redirect (parity with web <Navigate to="/" replace />) --
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      try {
        nav.reset({
          index: 0,
          routes: [{ name: 'LandingScreen' as never }],
        });
      } catch {
        /* noop */
      }
    }
  }, [roleLoading, isAdmin, nav]);

  // ----- Distinct values for filter dropdowns --------------------
  const surfaces = useMemo(() => uniqueValues(allRows, 'surface'), [allRows]);
  const categories = useMemo(
    () => uniqueValues(allRows, 'recipient_category'),
    [allRows],
  );
  const types = useMemo(() => uniqueValues(allRows, 'recipient_type'), [allRows]);
  const letterTypes = useMemo(
    () => uniqueValues(allRows, 'letter_type'),
    [allRows],
  );

  // ----- Apply filters -------------------------------------------
  const rows = useMemo(() => {
    const range = DATE_RANGES.find((r) => r.value === dateRange);
    const cutoff =
      range && range.days !== null
        ? Date.now() - range.days * 24 * 60 * 60 * 1000
        : null;

    return allRows.filter((r) => {
      if (cutoff !== null) {
        const t = r.created_at ? new Date(r.created_at).getTime() : 0;
        if (!t || t < cutoff) return false;
      }
      if (surface !== ANY && r.surface !== surface) return false;
      if (recipientCategory !== ANY && r.recipient_category !== recipientCategory)
        return false;
      if (recipientType !== ANY && r.recipient_type !== recipientType)
        return false;
      if (letterType !== ANY && r.letter_type !== letterType) return false;
      return true;
    });
  }, [allRows, dateRange, surface, recipientCategory, recipientType, letterType]);

  const groups = useMemo(
    () => ({
      surface: groupBy(rows, 'surface', sort),
      viewer_role: groupBy(rows, 'viewer_role', sort),
      recipient_category: groupBy(rows, 'recipient_category', sort),
      recipient_type: groupBy(rows, 'recipient_type', sort),
      letter_type: groupBy(rows, 'letter_type', sort),
    }),
    [rows, sort],
  );

  const resetFilters = () => {
    setDateRange('30d');
    setSurface(ANY);
    setRecipientCategory(ANY);
    setRecipientType(ANY);
    setLetterType(ANY);
    setSort('count-desc');
  };

  if (roleLoading) {
    return (
      <View style={s.loaderRoot}>
        <ActivityIndicator size="large" color={colors.mutedForeground} />
      </View>
    );
  }
  if (!isAdmin) return null;

  const filtersActive =
    surface !== ANY ||
    recipientCategory !== ANY ||
    recipientType !== ANY ||
    letterType !== ANY ||
    dateRange !== '30d';

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.titleRow}>
          <BarChart3 size={20} color={colors.primary} />
          <Text style={s.title}>Letter Click Analytics</Text>
        </View>
        <Text style={s.subtitle}>
          {rows.length} Letter button click{rows.length === 1 ? '' : 's'} matching the current filters.
        </Text>

        {/* ----- Filters ------------------------------------------ */}
        <Card style={{ marginBottom: spacing.md }}>
          <CardHeader style={{ paddingBottom: spacing.xs }}>
            <View style={s.filterHeaderRow}>
              <Filter size={16} color={colors.foreground} />
              <CardTitle>Filters</CardTitle>
            </View>
          </CardHeader>
          <CardContent style={{ gap: spacing.sm }}>
            <View style={s.filterGrid}>
              <FilterCell label="Date range">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterCell>

              <FilterCell label="Surface">
                <Select value={surface} onValueChange={setSurface}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any surface</SelectItem>
                    {surfaces.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterCell>

              <FilterCell label="Recipient category">
                <Select value={recipientCategory} onValueChange={setRecipientCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any category</SelectItem>
                    {categories.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterCell>

              <FilterCell label="Recipient type">
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any type</SelectItem>
                    {types.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterCell>

              <FilterCell label="Letter type">
                <Select value={letterType} onValueChange={setLetterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any letter type</SelectItem>
                    {letterTypes.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterCell>

              <FilterCell label="Sort">
                <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count-desc">Most clicks first</SelectItem>
                    <SelectItem value="count-asc">Fewest clicks first</SelectItem>
                    <SelectItem value="alpha">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </FilterCell>
            </View>

            {filtersActive && (
              <View style={{ alignItems: 'flex-end' }}>
                <Button variant="ghost" size="sm" onPress={resetFilters}>
                  Reset filters
                </Button>
              </View>
            )}
          </CardContent>
        </Card>

        {/* ----- Results ----------------------------------------- */}
        {loading ? (
          <View style={s.loaderRoot}>
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          </View>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent style={s.emptyContent}>
              <View style={s.emptyIconBubble}>
                <Inbox size={28} color={colors.mutedForeground} />
              </View>
              <Text style={s.emptyHeadline}>No Letter clicks found</Text>
              <Text style={s.emptyBody}>
                {filtersActive
                  ? 'No clicks match the current filters. Try widening the date range or clearing filters.'
                  : 'No Letter button clicks have been recorded yet. Once users start engaging with Letter CTAs across the platform, analytics will appear here.'}
              </Text>
              <View style={s.tipsBox}>
                <View style={s.tipsHeader}>
                  <Lightbulb size={14} color={colors.primary} />
                  <Text style={s.tipsHeaderText}>Tips</Text>
                </View>
                <Text style={s.tip}>• Try the All time date range to confirm any data exists.</Text>
                <Text style={s.tip}>
                  • Clear the Surface filter — surface tags are added at click time and may
                  not match older rows.
                </Text>
                <Text style={s.tip}>
                  • Verify the letter_button_clicks table has rows in the database.
                </Text>
                <Text style={s.tip}>
                  • Check that LetterButton instances on Athlete cards include a surface prop.
                </Text>
              </View>
              {filtersActive && (
                <Button variant="outline" size="sm" onPress={resetFilters}>
                  Reset filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <View style={s.resultsGrid}>
            <View style={s.resultCell}>
              <GroupCard title="By surface" entries={groups.surface} total={rows.length} />
            </View>
            <View style={s.resultCell}>
              <GroupCard title="By viewer role" entries={groups.viewer_role} total={rows.length} />
            </View>
            <View style={s.resultCell}>
              <GroupCard
                title="By recipient category"
                entries={groups.recipient_category}
                total={rows.length}
              />
            </View>
            <View style={s.resultCell}>
              <GroupCard
                title="By recipient type"
                entries={groups.recipient_type}
                total={rows.length}
              />
            </View>
            <View style={s.resultCell}>
              <GroupCard title="By letter type" entries={groups.letter_type} total={rows.length} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.filterCell}>
      <Label style={s.filterLabel}>{label}</Label>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.sm },
  loaderRoot: {
    flex: 1,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },

  filterHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  filterCell: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  filterLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },

  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  resultCell: {
    width: '100%',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },

  muted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  groupKey: {
    flex: 1,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  groupCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },

  barTrack: {
    height: 8,
    backgroundColor: colors.secondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },

  emptyContent: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIconBubble: {
    padding: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  emptyHeadline: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 360,
  },

  tipsBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  tipsHeaderText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  tip: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
});
