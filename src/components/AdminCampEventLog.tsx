// AdminCampEventLog — paginated timeline of camp_event_log rows.
// Lovable parity: src/components/AdminCampEventLog.tsx.
//
// Schema (verified against MAIN + Lovable web reference):
//   id, event_type, camp_id, enrollment_id, waitlist_id,
//   athlete_user_id, athlete_email, details (jsonb), created_at
//
// Filters (5): camp UUID, athlete UUID, email substring, event_type,
// skipped_reason. Detail modal renders raw JSON. CSV export uses the
// same expo-file-system + expo-sharing pattern as AdminAuditScreen and
// honors the exact same WHERE-clause via buildEventQuery().
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  Activity,
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

const PAGE_SIZE = 50;
const EXPORT_LIMIT = 500;

export const EVENT_TYPE_OPTIONS = [
  'all',
  'enrollment_created',
  'enrollment_cancelled',
  'waitlist_joined',
  'waitlist_token_minted',
  'waitlist_claim_email_sent',
  'waitlist_claimed',
  'waitlist_token_expired',
  'email_send_skipped',
] as const;
type EventTypeFilter = (typeof EVENT_TYPE_OPTIONS)[number];

export const SKIPPED_REASON_OPTIONS = [
  'all',
  'opted_out',
  'no_recipient',
  'template_disabled',
] as const;
type SkippedReasonFilter = (typeof SKIPPED_REASON_OPTIONS)[number];

const EVENT_LABELS: Record<string, string> = {
  enrollment_created: 'Enrollment created',
  enrollment_cancelled: 'Enrollment cancelled',
  waitlist_joined: 'Joined waitlist',
  waitlist_token_minted: 'Claim token minted',
  waitlist_claim_email_sent: 'Claim email sent',
  waitlist_claimed: 'Spot claimed',
  waitlist_token_expired: 'Claim token expired',
  email_send_skipped: 'Email skipped',
};

const SKIPPED_REASON_LABELS: Record<string, string> = {
  opted_out: 'Opted out',
  no_recipient: 'No recipient',
  template_disabled: 'Template disabled',
};

function badgeVariantFor(eventType: string): 'default' | 'success' | 'destructive' | 'outline' {
  switch (eventType) {
    case 'enrollment_created':
    case 'waitlist_claimed':
      return 'success';
    case 'enrollment_cancelled':
    case 'waitlist_token_expired':
      return 'destructive';
    case 'email_send_skipped':
      return 'outline';
    default:
      return 'default';
  }
}

interface CampEventRow {
  id: string;
  event_type: string;
  camp_id: string | null;
  enrollment_id: string | null;
  waitlist_id: string | null;
  athlete_user_id: string | null;
  athlete_email: string | null;
  details: any;
  created_at: string;
}

interface Filters {
  campId: string;
  athleteId: string;
  email: string;
  eventType: EventTypeFilter;
  skippedReason: SkippedReasonFilter;
}

const EMPTY_FILTERS: Filters = {
  campId: '',
  athleteId: '',
  email: '',
  eventType: 'all',
  skippedReason: 'all',
};

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function formatTs(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

// Centralized query builder: applied by both the live paginated list
// and the CSV export so the export never contains rows the screen
// filtered out.
export function buildEventQuery(filters: Filters) {
  let q: any = supabase
    .from('camp_event_log' as any)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.campId.trim()) q = q.eq('camp_id', filters.campId.trim());
  if (filters.athleteId.trim()) q = q.eq('athlete_user_id', filters.athleteId.trim());
  if (filters.email.trim()) q = q.ilike('athlete_email', `%${filters.email.trim()}%`);
  if (filters.eventType !== 'all') q = q.eq('event_type', filters.eventType);

  // Skipped-reason implies event_type=email_send_skipped and narrows on
  // the JSON key details->>skipped_reason. This mirrors the MAIN web
  // component and prevents conflicting event_type combinations.
  if (filters.skippedReason !== 'all') {
    q = q
      .eq('event_type', 'email_send_skipped')
      .eq('details->>skipped_reason', filters.skippedReason);
  }

  return q;
}

export default function AdminCampEventLog() {
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [selected, setSelected] = useState<CampEventRow | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-camp-event-log', applied, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: rows, error, count } = await buildEventQuery(applied).range(from, to);
      if (error) {
        if ((error as any).code === 'PGRST205' || (error.message || '').includes('does not exist')) {
          setTableMissing(true);
          return { rows: [] as CampEventRow[], total: 0 };
        }
        throw error;
      }
      return { rows: (rows || []) as CampEventRow[], total: count || 0 };
    },
  });

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtersActive = useMemo(
    () =>
      !!applied.campId ||
      !!applied.athleteId ||
      !!applied.email ||
      applied.eventType !== 'all' ||
      applied.skippedReason !== 'all',
    [applied],
  );

  const applyFilters = () => {
    setApplied(draft);
    setPage(0);
  };

  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(0);
  };

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { data: all, error } = await buildEventQuery(applied).limit(EXPORT_LIMIT);
      if (error) throw error;
      const eventRows = (all as CampEventRow[]) || [];

      const header = [
        'created_at',
        'event_type',
        'camp_id',
        'enrollment_id',
        'waitlist_id',
        'athlete_user_id',
        'athlete_email',
        'skipped_reason',
        'details',
      ];
      const lines = [header.join(',')];
      for (const r of eventRows) {
        lines.push(
          [
            csvEscape(r.created_at),
            csvEscape(r.event_type),
            csvEscape(r.camp_id),
            csvEscape(r.enrollment_id),
            csvEscape(r.waitlist_id),
            csvEscape(r.athlete_user_id),
            csvEscape(r.athlete_email),
            csvEscape(r.details?.skipped_reason ?? ''),
            csvEscape(r.details),
          ].join(','),
        );
      }
      const csv = lines.join('\n');
      const fname = `camp-events-${Date.now()}.csv`;
      const fileUri = (FileSystem as any).cacheDirectory + fname;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: (FileSystem as any).EncodingType?.UTF8 ?? 'utf8',
      });
      const can = await Sharing.isAvailableAsync();
      if (can) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export camp events',
        });
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
      <View style={s.root}>
        <View style={s.header}>
          <Activity size={20} color={colors.primary} />
          <Text style={s.title}>Camp events</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Camp event log not configured</Text>
          <Text style={s.emptyBody}>
            The `camp_event_log` table is not present in this Supabase project.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Activity size={20} color={colors.primary} />
        <Text style={s.title}>Camp events</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={exportCsv}
          disabled={exporting || rows.length === 0}
          style={[s.iconBtn, (exporting || rows.length === 0) && s.iconBtnDisabled]}
          testID="camp-events-export"
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
        <View style={s.searchWrap}>
          <Search size={14} color={colors.foregroundSubtle} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            value={draft.campId}
            onChangeText={(t) => setDraft((d) => ({ ...d, campId: t }))}
            placeholder="Camp UUID"
            placeholderTextColor={colors.foregroundSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            testID="filter-camp-id"
          />
          {draft.campId ? (
            <Pressable onPress={() => setDraft((d) => ({ ...d, campId: '' }))} style={s.searchClear}>
              <X size={14} color={colors.foregroundSubtle} />
            </Pressable>
          ) : null}
        </View>

        <View style={s.searchWrap}>
          <Search size={14} color={colors.foregroundSubtle} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            value={draft.athleteId}
            onChangeText={(t) => setDraft((d) => ({ ...d, athleteId: t }))}
            placeholder="Athlete UUID"
            placeholderTextColor={colors.foregroundSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            testID="filter-athlete-id"
          />
          {draft.athleteId ? (
            <Pressable
              onPress={() => setDraft((d) => ({ ...d, athleteId: '' }))}
              style={s.searchClear}
            >
              <X size={14} color={colors.foregroundSubtle} />
            </Pressable>
          ) : null}
        </View>

        <View style={s.searchWrap}>
          <Search size={14} color={colors.foregroundSubtle} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            value={draft.email}
            onChangeText={(t) => setDraft((d) => ({ ...d, email: t }))}
            placeholder="Email contains…"
            placeholderTextColor={colors.foregroundSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            testID="filter-email"
          />
          {draft.email ? (
            <Pressable onPress={() => setDraft((d) => ({ ...d, email: '' }))} style={s.searchClear}>
              <X size={14} color={colors.foregroundSubtle} />
            </Pressable>
          ) : null}
        </View>

        <FilterChips
          label="Event type"
          value={draft.eventType}
          options={EVENT_TYPE_OPTIONS.map((v) => ({
            v,
            l: v === 'all' ? 'All' : EVENT_LABELS[v] ?? v,
          }))}
          onChange={(v) => setDraft((d) => ({ ...d, eventType: v as EventTypeFilter }))}
        />

        <FilterChips
          label="Skipped reason"
          value={draft.skippedReason}
          options={SKIPPED_REASON_OPTIONS.map((v) => ({
            v,
            l: v === 'all' ? 'All' : SKIPPED_REASON_LABELS[v] ?? v,
          }))}
          onChange={(v) =>
            setDraft((d) => ({ ...d, skippedReason: v as SkippedReasonFilter }))
          }
        />

        <View style={s.applyRow}>
          <Pressable onPress={applyFilters} style={s.applyBtn} testID="camp-events-apply">
            <Text style={s.applyBtnText}>Apply</Text>
          </Pressable>
          {filtersActive ? (
            <Pressable onPress={resetFilters} style={s.resetInlineBtn} testID="camp-events-reset">
              <Text style={s.resetInlineBtnText}>Reset</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={s.meta}>
        {isLoading ? 'Loading…' : `${total} event${total === 1 ? '' : 's'}`}
        {filtersActive ? ' · filtered' : ''}
      </Text>

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No events found</Text>
          {filtersActive ? (
            <Pressable onPress={resetFilters} style={s.resetBtn}>
              <Text style={s.resetBtnText}>Reset filters</Text>
            </Pressable>
          ) : (
            <Text style={s.emptyBody}>No camp events have been logged yet.</Text>
          )}
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => {
            const label = EVENT_LABELS[item.event_type] ?? item.event_type;
            const skippedReason = item.details?.skipped_reason as string | undefined;
            return (
              <Pressable
                onPress={() => setSelected(item)}
                testID={`camp-event-row-${item.id}`}
              >
                <Card style={s.row}>
                  <View style={s.rowTop}>
                    <Badge variant={badgeVariantFor(item.event_type)}>{label}</Badge>
                    {skippedReason ? (
                      <Badge variant="outline">
                        {SKIPPED_REASON_LABELS[skippedReason] ?? skippedReason}
                      </Badge>
                    ) : null}
                    <View style={{ flex: 1 }} />
                    <Text style={s.ts}>{formatTs(item.created_at)}</Text>
                  </View>
                  {item.athlete_email ? (
                    <Text style={s.kv} numberOfLines={1}>
                      <Text style={s.kvLabel}>email: </Text>
                      {item.athlete_email}
                    </Text>
                  ) : null}
                  {item.camp_id ? (
                    <Text style={s.kv} numberOfLines={1}>
                      <Text style={s.kvLabel}>camp: </Text>
                      {item.camp_id}
                    </Text>
                  ) : null}
                  {item.athlete_user_id ? (
                    <Text style={s.kv} numberOfLines={1}>
                      <Text style={s.kvLabel}>athlete: </Text>
                      {item.athlete_user_id}
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      {rows.length > 0 ? (
        <View style={s.pager}>
          <Pressable
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={[s.pagerBtn, page === 0 && s.iconBtnDisabled]}
            testID="camp-events-prev"
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
            testID="camp-events-next"
          >
            <Text style={s.iconBtnText}>Next</Text>
            <ChevronRight size={16} color={colors.foreground} />
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard} testID="camp-event-detail-modal">
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} numberOfLines={1}>
                {selected ? EVENT_LABELS[selected.event_type] ?? selected.event_type : ''}
              </Text>
              <Pressable
                onPress={() => setSelected(null)}
                style={s.modalClose}
                testID="camp-event-detail-close"
              >
                <X size={18} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView style={s.modalBody}>
              <Text style={s.modalMeta}>
                {selected ? formatTs(selected.created_at) : ''}
              </Text>
              <Text style={s.modalJsonLabel}>Raw event</Text>
              <Text style={s.modalJson} selectable testID="camp-event-detail-json">
                {selected ? JSON.stringify(selected, null, 2) : ''}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterChips({
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
              testID={`filter-${label.replace(/\s+/g, '-').toLowerCase()}-${o.v}`}
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
  chipTextActive: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
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
  applyRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  applyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  applyBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primaryForeground,
  },
  resetInlineBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  resetInlineBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  meta: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  row: { padding: spacing.sm + 2, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  modalTitle: {
    flex: 1,
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h4,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  modalClose: { padding: 4 },
  modalBody: { padding: spacing.md, gap: spacing.sm },
  modalMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
    marginBottom: spacing.sm,
  },
  modalJsonLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
    marginBottom: 4,
  },
  modalJson: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.foreground,
    backgroundColor: colors.muted,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
});
