// Parity port from Lovable src/components/CampAnalyticsPanel.tsx (verbatim logic).
// Web→RN mapping:
//   - shadcn Card/Badge/Button → src/components/ui/*
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet using @/lib/theme tokens
//   - Browser CSV download (Blob + <a download>) → expo-file-system + expo-sharing.
//     We write the CSV to the cache dir then invoke the share sheet; this is the
//     standard RN equivalent and matches other export flows in the app.
//   - window.location.hostname host-based "external link" heuristic is preserved
//     using a static placeholder hostname (web parity is a no-op on RN since the
//     referrer URL is server-supplied; we still try to detect an explicit utm_source
//     and known host prefixes — same as the web).
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader2, Users, TrendingUp, Link2, ExternalLink, Download } from 'lucide-react-native';
import { format, parseISO, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, radius } from '@/lib/theme';

interface CampAnalyticsPanelProps {
  campId: string;
  campName?: string;
  capacity?: number | null;
}

interface EnrollmentRow {
  id: string;
  created_at: string;
  status: string;
  notes: string | null;
  referrer_url: string | null;
}

const SELF_HOST = 'offerhound.app'; // RN equivalent of window.location.hostname

/**
 * Lightweight analytics surface for a single camp:
 *   - Headline: total active enrollments + capacity utilization
 *   - Sparkline-style bar chart: registrations per day
 *   - Top referrer breakdown (HUDL, profile pages, social, direct)
 */
export function CampAnalyticsPanel({ campId, campName, capacity }: CampAnalyticsPanelProps) {
  const { toast } = useToast();
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['camp-analytics', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_enrollments')
        .select('id, created_at, status, notes, referrer_url')
        .eq('camp_id', campId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EnrollmentRow[];
    },
  });

  const stats = useMemo(() => {
    const rows = enrollments ?? [];
    const active = rows.filter((r) => r.status !== 'cancelled');
    const cancelled = rows.filter((r) => r.status === 'cancelled');

    const byDay = new Map<string, number>();
    let running = 0;
    const sortedActive = [...active].sort(
      (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
    );
    for (const row of sortedActive) {
      const key = format(startOfDay(parseISO(row.created_at)), 'yyyy-MM-dd');
      running += 1;
      byDay.set(key, running);
    }
    const dayKeys = Array.from(byDay.keys()).slice(-14);
    const series = dayKeys.map((d) => ({ day: d, total: byDay.get(d) ?? 0 }));

    const sources = new Map<string, number>();
    for (const row of active) {
      const referrerRaw = row.referrer_url || '';
      const notes = (row.notes || '').toLowerCase();
      let bucket = 'Direct';
      let utmSource: string | null = null;
      try {
        const u = new URL(referrerRaw);
        utmSource = u.searchParams.get('utm_source');
      } catch {
        // ignore unparseable referrer
      }
      const referrer = referrerRaw.toLowerCase();
      if (utmSource) {
        bucket = utmSource;
      } else if (referrer.includes('hudl') || notes.includes('hudl.com')) {
        bucket = 'HUDL';
      } else if (referrer.includes('twitter') || referrer.includes('x.com')) {
        bucket = 'Twitter / X';
      } else if (referrer.includes('instagram')) {
        bucket = 'Instagram';
      } else if (referrer.includes('facebook')) {
        bucket = 'Facebook';
      } else if (referrer.includes('/profile') || referrer.includes('/p/')) {
        bucket = 'Athlete profile';
      } else if (referrer && !referrer.includes(SELF_HOST)) {
        bucket = 'External link';
      }
      sources.set(bucket, (sources.get(bucket) ?? 0) + 1);
    }
    const topSources = Array.from(sources.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const utilization =
      capacity && capacity > 0 ? Math.min(100, Math.round((active.length / capacity) * 100)) : null;

    return {
      activeCount: active.length,
      cancelledCount: cancelled.length,
      utilization,
      series,
      topSources,
      maxOnSeries: Math.max(1, ...series.map((sx) => sx.total)),
    };
  }, [enrollments, capacity]);

  if (isLoading) {
    return (
      <Card>
        <CardContent style={s.loaderWrap}>
          <ActivityIndicator color={colors.primary} />
        </CardContent>
      </Card>
    );
  }

  const handleExportCsv = async () => {
    const rows = enrollments ?? [];
    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push('Enrollments');
    lines.push(['created_at', 'status', 'referrer_url', 'notes'].map(escape).join(','));
    for (const r of rows) {
      lines.push(
        [r.created_at, r.status, r.referrer_url || '', (r.notes || '').replace(/\n/g, ' | ')]
          .map(escape)
          .join(','),
      );
    }
    lines.push('');
    lines.push('Top referring sources');
    lines.push(['source', 'count'].map(escape).join(','));
    for (const [src, count] of stats.topSources) {
      lines.push([src, String(count)].map(escape).join(','));
    }
    const csv = lines.join('\n');
    try {
      const safe = (campName || campId).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const path = `${(FileSystem as any).cacheDirectory || ''}camp-analytics-${safe}.csv`;
      await (FileSystem as any).writeAsStringAsync(path, csv, { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Camp analytics CSV' });
      }
      toast({ title: 'Export ready', description: 'CSV saved to share sheet.' });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err?.message || 'Try again.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <View style={s.headerRow}>
          <View style={s.headerText}>
            <CardTitle>
              <View style={s.titleRow}>
                <TrendingUp size={20} color={colors.foreground} />
                <Text style={s.titleText}>Camp analytics</Text>
                {campName ? <Text style={s.titleSub}> · {campName}</Text> : null}
              </View>
            </CardTitle>
            <CardDescription>
              Real-time view of enrollments, capacity, and where signups are coming from.
            </CardDescription>
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={handleExportCsv}
            disabled={!enrollments || enrollments.length === 0}
          >
            <View style={s.btnRow}>
              <Download size={14} color={colors.foreground} />
              <Text style={s.btnTextOutline}>Export CSV</Text>
            </View>
          </Button>
        </View>
      </CardHeader>
      <CardContent>
        <View style={s.body}>
          {/* Headline metrics */}
          <View style={s.statsGrid}>
            <Stat label="Total registered" value={stats.activeCount} />
            <Stat
              label="Capacity"
              value={capacity ? `${stats.utilization}%` : '—'}
              sub={capacity ? `${stats.activeCount} / ${capacity}` : 'Unlimited'}
            />
            <Stat label="Cancellations" value={stats.cancelledCount} />
            <Stat label="Top source" value={stats.topSources[0]?.[0] ?? 'Direct'} />
          </View>

          {/* Capacity over time */}
          <View>
            <View style={s.sectionHeader}>
              <Users size={14} color={colors.foreground} />
              <Text style={s.sectionTitle}>Capacity over time</Text>
            </View>
            {stats.series.length === 0 ? (
              <Text style={s.muted}>
                No enrollments yet. Once athletes register, you'll see daily trends here.
              </Text>
            ) : (
              <View style={s.chartRow}>
                {stats.series.map((point) => {
                  const heightPct = Math.max(
                    6,
                    Math.round((point.total / stats.maxOnSeries) * 100),
                  );
                  return (
                    <View key={point.day} style={s.chartCol}>
                      <View style={[s.chartBar, { height: `${heightPct}%` as any }]} />
                      <Text style={s.chartLabel}>{format(parseISO(point.day), 'M/d')}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Top referrers */}
          <View>
            <View style={s.sectionHeader}>
              <Link2 size={14} color={colors.foreground} />
              <Text style={s.sectionTitle}>Top referring sources</Text>
            </View>
            {stats.topSources.length === 0 ? (
              <Text style={s.muted}>
                No referrer data yet. Share your camp's public link on HUDL, social, or your athletes' profiles to see traffic sources here.
              </Text>
            ) : (
              <View style={s.sourceList}>
                {stats.topSources.map(([source, count]) => (
                  <View key={source} style={s.sourceRow}>
                    <View style={s.sourceLeft}>
                      <ExternalLink size={13} color={colors.mutedForeground} />
                      <Text style={s.sourceText}>{source}</Text>
                    </View>
                    <Badge variant="secondary"><Text style={s.badgeText}>{count}</Text></Badge>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  loaderWrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  headerText: { flex: 1, minWidth: 200 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  titleText: { color: colors.foreground, fontSize: 18, fontWeight: '600' },
  titleSub: { color: colors.mutedForeground, fontSize: 16, fontWeight: '400' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTextOutline: { color: colors.foreground, fontWeight: '600', fontSize: 13 },
  body: { gap: spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexBasis: '48%', flexGrow: 1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.sm + 4 },
  statLabel: { fontSize: 11, color: colors.mutedForeground },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.foreground, fontVariant: ['tabular-nums'] },
  statSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm + 4 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  muted: { fontSize: 13, color: colors.mutedForeground },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 128 },
  chartCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', backgroundColor: colors.primary, opacity: 0.8, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  chartLabel: { fontSize: 9, color: colors.mutedForeground },
  sourceList: { gap: spacing.xs + 4 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.xs + 4, borderRadius: radius.md, backgroundColor: colors.muted },
  sourceLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sourceText: { fontSize: 13, color: colors.foreground },
  badgeText: { fontSize: 11, color: colors.foreground },
});
