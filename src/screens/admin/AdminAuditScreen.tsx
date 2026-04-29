// AdminAuditScreen — opt-out audit log viewer (Build 31).
// Lovable parity: src/pages/AdminOptOutAuditViewer.tsx.
// Queries `camp_notification_optout_audit` with scope/action filters,
// user_id search, paginated 25 rows/page, CSV export via expo-sharing.
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
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  ClipboardList,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';

const PAGE_SIZE = 25;
const EXPORT_LIMIT = 1000;

type ScopeFilter = 'all' | 'account' | 'camp';
type ActionFilter = 'all' | 'opted_out' | 'opted_in';

interface AuditRow {
  id: string;
  user_id: string;
  camp_id: string | null;
  action: 'opted_out' | 'opted_in';
  scope: 'account' | 'camp';
  changed_by: string | null;
  created_at: string;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function formatTs(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

export default function AdminAuditScreen() {
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [action, setAction] = useState<ActionFilter>('all');
  const [userSearch, setUserSearch] = useState('');
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-optout-audit', scope, action, userSearch, page],
    queryFn: async () => {
      let q = supabase
        .from('camp_notification_optout_audit' as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (scope !== 'all') q = q.eq('scope', scope);
      if (action !== 'all') q = q.eq('action', action);
      if (userSearch.trim()) q = q.eq('user_id', userSearch.trim());

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: rows, error, count } = await q.range(from, to);

      if (error) {
        if ((error as any).code === 'PGRST205' || (error.message || '').includes('does not exist')) {
          setTableMissing(true);
          return { rows: [] as AuditRow[], total: 0 };
        }
        throw error;
      }
      return { rows: (rows || []) as AuditRow[], total: count || 0 };
    },
  });

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtersActive = scope !== 'all' || action !== 'all' || !!userSearch.trim();

  const resetFilters = () => {
    setScope('all');
    setAction('all');
    setUserSearch('');
    setPage(0);
  };

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      let q = supabase
        .from('camp_notification_optout_audit' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(EXPORT_LIMIT);
      if (scope !== 'all') q = q.eq('scope', scope);
      if (action !== 'all') q = q.eq('action', action);
      if (userSearch.trim()) q = q.eq('user_id', userSearch.trim());
      const { data: all, error } = await q;
      if (error) throw error;

      const header = ['id', 'created_at', 'action', 'scope', 'user_id', 'camp_id', 'changed_by'];
      const lines = [header.join(',')];
      for (const r of (all as AuditRow[]) || []) {
        lines.push(
          [
            csvEscape(r.id),
            csvEscape(r.created_at),
            csvEscape(r.action),
            csvEscape(r.scope),
            csvEscape(r.user_id),
            csvEscape(r.camp_id),
            csvEscape(r.changed_by),
          ].join(','),
        );
      }
      const csv = lines.join('\n');
      const fname = `optout-audit-${Date.now()}.csv`;
      const fileUri = (FileSystem as any).cacheDirectory + fname;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: (FileSystem as any).EncodingType?.UTF8 ?? 'utf8',
      });
      const can = await Sharing.isAvailableAsync();
      if (can) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export audit log' });
      } else {
        Alert.alert('Export saved', `CSV written to ${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  if (tableMissing) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <ClipboardList size={20} color={colors.primary} />
          <Text style={s.title}>Opt-out audit</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Audit log not configured</Text>
          <Text style={s.emptyBody}>
            The `camp_notification_optout_audit` table is not present in this Supabase project.
            Run the migration that creates the audit trigger to enable this screen.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <ClipboardList size={20} color={colors.primary} />
        <Text style={s.title}>Opt-out audit</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={exportCsv}
          disabled={exporting || rows.length === 0}
          style={[s.iconBtn, (exporting || rows.length === 0) && s.iconBtnDisabled]}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <Download size={16} color={colors.foreground} />
          )}
          <Text style={s.iconBtnText}>CSV</Text>
        </Pressable>
      </View>

      <View style={s.filters}>
        <FilterRow
          label="Scope"
          value={scope}
          options={[
            { v: 'all', l: 'All' },
            { v: 'account', l: 'Account' },
            { v: 'camp', l: 'Camp' },
          ]}
          onChange={(v) => {
            setScope(v as ScopeFilter);
            setPage(0);
          }}
        />
        <FilterRow
          label="Action"
          value={action}
          options={[
            { v: 'all', l: 'All' },
            { v: 'opted_out', l: 'Opted out' },
            { v: 'opted_in', l: 'Opted in' },
          ]}
          onChange={(v) => {
            setAction(v as ActionFilter);
            setPage(0);
          }}
        />
        <View style={s.searchWrap}>
          <Search size={14} color={colors.foregroundSubtle} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            value={userSearch}
            onChangeText={(t) => {
              setUserSearch(t);
              setPage(0);
            }}
            placeholder="Search by user_id (UUID)"
            placeholderTextColor={colors.foregroundSubtle}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {userSearch ? (
            <Pressable
              onPress={() => {
                setUserSearch('');
                setPage(0);
              }}
              style={s.searchClear}
            >
              <X size={14} color={colors.foregroundSubtle} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={s.meta}>
        {isLoading ? 'Loading…' : `${total} record${total === 1 ? '' : 's'}`}
        {filtersActive ? ' · filtered' : ''}
      </Text>

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No audit records found</Text>
          {filtersActive ? (
            <Pressable onPress={resetFilters} style={s.resetBtn}>
              <Text style={s.resetBtnText}>Reset filters</Text>
            </Pressable>
          ) : (
            <Text style={s.emptyBody}>No opt-out actions have been logged yet.</Text>
          )}
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => (
            <Card style={s.row}>
              <View style={s.rowTop}>
                <Badge variant={item.action === 'opted_out' ? 'destructive' : 'success'}>
                  {item.action === 'opted_out' ? 'Opted out' : 'Opted in'}
                </Badge>
                <Badge variant="outline">{item.scope}</Badge>
                <View style={{ flex: 1 }} />
                <Text style={s.ts}>{formatTs(item.created_at)}</Text>
              </View>
              <Text style={s.kv} numberOfLines={1}>
                <Text style={s.kvLabel}>user_id: </Text>
                {item.user_id}
              </Text>
              {item.camp_id ? (
                <Text style={s.kv} numberOfLines={1}>
                  <Text style={s.kvLabel}>camp_id: </Text>
                  {item.camp_id}
                </Text>
              ) : null}
              {item.changed_by ? (
                <Text style={s.kv} numberOfLines={1}>
                  <Text style={s.kvLabel}>changed_by: </Text>
                  {item.changed_by}
                </Text>
              ) : null}
            </Card>
          )}
        />
      )}

      {rows.length > 0 ? (
        <View style={s.pager}>
          <Pressable
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={[s.pagerBtn, page === 0 && s.iconBtnDisabled]}
          >
            <ChevronLeft size={16} color={colors.foreground} />
            <Text style={s.iconBtnText}>Prev</Text>
          </Pressable>
          <Text style={s.pagerText}>
            Page {page + 1} / {totalPages}
          </Text>
          <Pressable
            onPress={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages}
            style={[s.pagerBtn, page + 1 >= totalPages && s.iconBtnDisabled]}
          >
            <Text style={s.iconBtnText}>Next</Text>
            <ChevronRight size={16} color={colors.foreground} />
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.filterRow}>
      <Text style={s.filterLabel}>{label}</Text>
      <View style={s.filterChips}>
        {options.map((o) => {
          const active = value === o.v;
          return (
            <Pressable
              key={o.v}
              onPress={() => onChange(o.v)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{o.l}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  iconBtnDisabled: { opacity: 0.45 },
  iconBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  filters: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.sm },
  filterRow: { gap: 4 },
  filterLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  filterChips: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  chipTextActive: { color: colors.primaryForeground, fontFamily: typography.fontFamily.bodySemiBold },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  searchClear: { padding: 4 },
  meta: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
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
  resetBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  resetBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primaryForeground,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  pagerText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foregroundSubtle,
  },
});
