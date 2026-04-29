// AdminLetterAnalytics — letter send analytics (Build 31).
// Lovable parity ref: src/pages/AdminLetterAnalytics.tsx (uses
// letter_button_clicks). Mobile build aggregates from `letter_history`.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Search, X } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface LetterRow {
  id: string;
  user_id: string | null;
  letter_type: string | null;
  sent_at: string | null;
  created_at: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
}

export default function AdminLetterAnalytics() {
  const [search, setSearch] = useState('');
  const [tableMissing, setTableMissing] = useState(false);

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-letter-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('letter_history' as any)
        .select('id, user_id, letter_type, sent_at, created_at')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) {
        if ((error as any).code === 'PGRST205' || (error.message || '').includes('does not exist')) {
          setTableMissing(true);
          return [] as LetterRow[];
        }
        throw error;
      }
      return (data || []) as LetterRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.user_id || '').toLowerCase().includes(q) ||
        (r.letter_type || '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * DAY_MS;
    const monthAgo = now - 30 * DAY_MS;
    let week = 0;
    let month = 0;
    const coaches = new Set<string>();
    for (const r of filtered) {
      const t = new Date(r.sent_at || r.created_at).getTime();
      if (!Number.isFinite(t)) continue;
      if (t >= weekAgo) week++;
      if (t >= monthAgo) month++;
      if (r.user_id) coaches.add(r.user_id);
    }
    return { total: filtered.length, week, month, uniqueCoaches: coaches.size };
  }, [filtered]);

  const buckets = useMemo(() => {
    const today = startOfDay(new Date());
    const days = [] as { label: string; count: number; date: Date }[];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      days.push({ label: formatDay(d), count: 0, date: d });
    }
    for (const r of filtered) {
      const ts = new Date(r.sent_at || r.created_at);
      const day = startOfDay(ts).getTime();
      const idx = days.findIndex((b) => b.date.getTime() === day);
      if (idx >= 0) days[idx].count++;
    }
    const max = Math.max(1, ...days.map((d) => d.count));
    return { days, max };
  }, [filtered]);

  if (tableMissing) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <BarChart3 size={20} color={colors.primary} />
          <Text style={s.title}>Letter analytics</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Letter analytics not yet configured</Text>
          <Text style={s.emptyBody}>
            The `letter_history` table is missing in this Supabase project.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <BarChart3 size={20} color={colors.primary} />
        <Text style={s.title}>Letter analytics</Text>
      </View>

      <FlashList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
            <View style={s.statRow}>
              <StatCard label="Total" value={stats.total} />
              <StatCard label="This week" value={stats.week} />
              <StatCard label="This month" value={stats.month} />
              <StatCard label="Unique senders" value={stats.uniqueCoaches} />
            </View>

            <Card style={s.chartCard}>
              <Text style={s.chartTitle}>Last 7 days</Text>
              <View style={s.chart}>
                {buckets.days.map((d, i) => {
                  const h = Math.max(4, Math.round((d.count / buckets.max) * 100));
                  return (
                    <View key={i} style={s.barCol}>
                      <Text style={s.barCount}>{d.count}</Text>
                      <View style={s.barTrack}>
                        <View style={[s.bar, { height: h }]} />
                      </View>
                      <Text style={s.barLabel} numberOfLines={1}>
                        {d.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            <View style={s.searchWrap}>
              <Search size={14} color={colors.foregroundSubtle} style={{ marginRight: 6 }} />
              <TextInput
                style={s.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search by sender user_id or letter type"
                placeholderTextColor={colors.foregroundSubtle}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} style={{ padding: 4 }}>
                  <X size={14} color={colors.foregroundSubtle} />
                </Pressable>
              ) : null}
            </View>

            <Text style={s.sectionTitle}>Recent letters</Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={s.loading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No letters logged yet</Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <Card style={s.row}>
            <View style={s.rowTop}>
              {item.letter_type ? <Badge variant="outline">{item.letter_type}</Badge> : null}
              <View style={{ flex: 1 }} />
              <Text style={s.ts}>
                {new Date(item.sent_at || item.created_at).toLocaleString()}
              </Text>
            </View>
            {item.user_id ? (
              <Text style={s.kv} numberOfLines={1}>
                <Text style={s.kvLabel}>sender: </Text>
                {item.user_id}
              </Text>
            ) : null}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card style={s.statCard}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.sm + 2,
    gap: 2,
  },
  statValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.primary,
    letterSpacing: typography.letterSpacing.heading,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  chartCard: { padding: spacing.sm + 2, gap: spacing.sm },
  chartTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    height: 140,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: {
    width: 32,
    height: 100,
    justifyContent: 'flex-end',
    backgroundColor: colors.muted,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  bar: { width: 32, backgroundColor: colors.primary, borderRadius: radius.sm },
  barCount: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  barLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.foregroundSubtle,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foregroundSubtle,
    marginTop: spacing.xs,
  },
  row: { padding: spacing.sm + 2, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ts: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  kv: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  kvLabel: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
  loading: { paddingVertical: spacing.xl, alignItems: 'center' },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foregroundSubtle,
    textAlign: 'center',
  },
});
