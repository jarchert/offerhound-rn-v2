// AdminModerationScreen — content moderation queue (Build 31).
// Reads `user_reports` and offers Resolve/Dismiss actions per row.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';

type StatusFilter = 'all' | 'pending' | 'resolved' | 'dismissed';

interface Report {
  id: string;
  reporter_user_id: string;
  reported_user_id: string | null;
  reported_entity_type: string | null;
  reported_entity_id: string | null;
  reason: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
}

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'destructive' | 'outline'> = {
  pending: 'warning',
  resolved: 'success',
  dismissed: 'destructive',
};

function formatTs(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function AdminModerationScreen() {
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [tableMissing, setTableMissing] = useState(false);
  const qc = useQueryClient();

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-moderation', status],
    queryFn: async () => {
      let q = supabase
        .from('user_reports' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) {
        if ((error as any).code === 'PGRST205' || (error.message || '').includes('does not exist')) {
          setTableMissing(true);
          return [] as Report[];
        }
        throw error;
      }
      return (data || []) as Report[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: 'resolved' | 'dismissed' }) => {
      const { error } = await supabase
        .from('user_reports' as any)
        .update({ status: next })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-moderation'] }),
    onError: (e: any) => Alert.alert('Update failed', e?.message || 'Unknown error'),
  });

  if (tableMissing) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <AlertTriangle size={20} color={colors.primary} />
          <Text style={s.title}>Moderation</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Moderation queue not configured</Text>
          <Text style={s.emptyBody}>
            No `user_reports` table found in this Supabase project. Once the schema migration runs,
            user-submitted reports will appear here for review.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <AlertTriangle size={20} color={colors.primary} />
        <Text style={s.title}>Moderation</Text>
      </View>

      <View style={s.tabs}>
        {(['all', 'pending', 'resolved', 'dismissed'] as StatusFilter[]).map((t) => {
          const active = status === t;
          return (
            <Pressable
              key={t}
              onPress={() => setStatus(t)}
              style={[s.tab, active && s.tabActive]}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>
            {status === 'pending'
              ? 'No pending reports. Keep up the great work!'
              : 'No reports found.'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <Card style={s.card}>
              <View style={s.cardTop}>
                <Badge variant={STATUS_VARIANT[item.status || 'pending'] || 'outline'}>
                  {item.status || 'pending'}
                </Badge>
                {item.reported_entity_type ? (
                  <Badge variant="outline">{item.reported_entity_type}</Badge>
                ) : null}
                <View style={{ flex: 1 }} />
                <Text style={s.ts}>{formatTs(item.created_at)}</Text>
              </View>
              {item.reason ? (
                <Text style={s.reason}>{item.reason}</Text>
              ) : null}
              {item.description ? (
                <Text style={s.desc} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}
              <View style={s.kvBlock}>
                <Text style={s.kv} numberOfLines={1}>
                  <Text style={s.kvLabel}>reporter: </Text>
                  {item.reporter_user_id}
                </Text>
                {item.reported_user_id ? (
                  <Text style={s.kv} numberOfLines={1}>
                    <Text style={s.kvLabel}>reported user: </Text>
                    {item.reported_user_id}
                  </Text>
                ) : null}
                {item.reported_entity_id ? (
                  <Text style={s.kv} numberOfLines={1}>
                    <Text style={s.kvLabel}>entity_id: </Text>
                    {item.reported_entity_id}
                  </Text>
                ) : null}
              </View>
              {item.status === 'pending' || !item.status ? (
                <View style={s.actions}>
                  <Pressable
                    onPress={() => updateStatus.mutate({ id: item.id, next: 'resolved' })}
                    style={[s.actionBtn, s.actionResolve]}
                  >
                    <ShieldCheck size={14} color={colors.successForeground} />
                    <Text style={[s.actionText, { color: colors.successForeground }]}>
                      Resolve
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateStatus.mutate({ id: item.id, next: 'dismissed' })}
                    style={[s.actionBtn, s.actionDismiss]}
                  >
                    <Trash2 size={14} color={colors.destructiveForeground} />
                    <Text style={[s.actionText, { color: colors.destructiveForeground }]}>
                      Dismiss
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          )}
        />
      )}
    </SafeAreaView>
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
  tabs: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  tab: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  tabTextActive: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  card: { padding: spacing.sm + 2, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ts: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  reason: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  desc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foregroundSubtle,
  },
  kvBlock: { gap: 2, marginTop: 4 },
  kv: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  kvLabel: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  actionResolve: { backgroundColor: colors.success },
  actionDismiss: { backgroundColor: colors.destructive },
  actionText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
  },
  loading: { paddingVertical: spacing.xl, alignItems: 'center' },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foregroundSubtle,
    textAlign: 'center',
  },
});
