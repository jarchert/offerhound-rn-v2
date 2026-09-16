// AdminHomepageVideoAnalytics — read-only analytics for homepage_video_events.
//
// Columns used: video_id, event_type, viewer_mode, created_at
// Range selector: 7d / 30d / All time
// Summary tiles: Impressions, Tile Clicks, Plays, Pauses, Completions
// Per-video table: counts per event type + play-through %
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

// ── types ─────────────────────────────────────────────────────────────────

type EventType = 'impression' | 'tile_click' | 'play' | 'pause' | 'complete';
type RangeValue = '7' | '30' | 'all';

interface VideoEventRow {
  video_id: string;
  event_type: EventType;
  viewer_mode: 'athlete' | 'coach' | null;
  created_at: string;
}

// ── constants ─────────────────────────────────────────────────────────────

const VIDEO_LABELS: Record<string, string> = {
  athlete:    "For Athletes — Marcus's Journey",
  parent:     'For Parents — Staying In The Loop',
  coach:      'For College Coaches',
  clubcoach:  'For Club Coaches',
};

const EVENT_META: { key: EventType; label: string }[] = [
  { key: 'impression', label: 'Impressions' },
  { key: 'tile_click', label: 'Tile Clicks' },
  { key: 'play',       label: 'Plays' },
  { key: 'pause',      label: 'Pauses' },
  { key: 'complete',   label: 'Completions' },
];

const RANGES: { value: RangeValue; label: string }[] = [
  { value: '7',   label: '7d' },
  { value: '30',  label: '30d' },
  { value: 'all', label: 'All' },
];

// ── helpers ───────────────────────────────────────────────────────────────

function emptyTotals(): Record<EventType, number> {
  return { impression: 0, tile_click: 0, play: 0, pause: 0, complete: 0 };
}

// ── component ─────────────────────────────────────────────────────────────

export default function AdminHomepageVideoAnalytics() {
  const [range, setRange] = useState<RangeValue>('30');

  const { data: rows = [], isLoading } = useQuery<VideoEventRow[]>({
    queryKey: ['admin-homepage-video-analytics', range],
    queryFn: async () => {
      let query = supabase
        .from('homepage_video_events')
        .select('video_id,event_type,viewer_mode,created_at')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (range !== 'all') {
        const days = parseInt(range, 10);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = (query as any).gte('created_at', since);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as VideoEventRow[];
    },
  });

  const totals = useMemo(() => {
    const t = emptyTotals();
    for (const r of rows) t[r.event_type] = (t[r.event_type] ?? 0) + 1;
    return t;
  }, [rows]);

  const perVideo = useMemo(() => {
    const map = new Map<string, Record<EventType, number>>();
    const ensure = (id: string) => {
      if (!map.has(id)) map.set(id, emptyTotals());
      return map.get(id)!;
    };
    for (const r of rows) ensure(r.video_id)[r.event_type] += 1;
    return Array.from(map.entries())
      .map(([video_id, counts]) => ({ video_id, counts }))
      .sort((a, b) => b.counts.tile_click - a.counts.tile_click);
  }, [rows]);

  return (
    <ScrollView style={s.container} testID="homepage-video-analytics">
      <Text style={s.heading}>Homepage Video Analytics</Text>
      <Text style={s.subheading}>OfferHound Hub demo videos on the landing page</Text>

      {/* Range selector */}
      <View style={s.rangeRow} testID="range-selector">
        {RANGES.map((r) => (
          <Pressable
            key={r.value}
            testID={`range-btn-${r.value}`}
            style={[s.rangeBtn, range === r.value && s.rangeBtnActive]}
            onPress={() => setRange(r.value)}
          >
            <Text style={[s.rangeBtnText, range === r.value && s.rangeBtnTextActive]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator
          testID="video-analytics-loading"
          style={s.loader}
          color={colors.primary}
        />
      ) : (
        <>
          {/* Summary tiles */}
          <View style={s.tilesRow} testID="summary-tiles">
            {EVENT_META.map(({ key, label }) => (
              <View key={key} style={s.tile} testID={`tile-${key}`}>
                <Text style={s.tileLabel}>{label}</Text>
                <Text style={s.tileValue}>{totals[key].toLocaleString()}</Text>
              </View>
            ))}
          </View>

          {/* Per-video rows */}
          {perVideo.length === 0 ? (
            <Text style={s.empty} testID="video-analytics-empty">
              No video events recorded yet for this range.
            </Text>
          ) : (
            <View testID="video-table">
              {perVideo.map(({ video_id, counts }) => {
                const playThrough =
                  counts.play > 0 && counts.complete > 0
                    ? `${Math.round((counts.complete / counts.play) * 100)}%`
                    : '—';
                return (
                  <View key={video_id} style={s.videoRow} testID={`video-row-${video_id}`}>
                    <Text style={s.videoTitle} numberOfLines={1}>
                      {VIDEO_LABELS[video_id] ?? video_id}
                    </Text>
                    <Text style={s.videoId}>{video_id}</Text>
                    <View style={s.countsRow}>
                      {EVENT_META.map(({ key, label }) => (
                        <View key={key} style={s.countCell}>
                          <Text style={s.countLabel}>{label}</Text>
                          <Text style={s.countValue} testID={`video-${video_id}-${key}`}>
                            {counts[key].toLocaleString()}
                          </Text>
                        </View>
                      ))}
                      <View style={s.countCell}>
                        <Text style={s.countLabel}>Play-through</Text>
                        <Text style={s.countValue} testID={`video-${video_id}-playthrough`}>
                          {playThrough}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  heading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  rangeRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  rangeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rangeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  rangeBtnTextActive: { color: colors.primaryForeground },
  loader: { marginTop: spacing.xl },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  tile: {
    flex: 1,
    minWidth: 90,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  tileLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  tileValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
  },
  empty: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  videoRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  videoTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  videoId: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  countsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  countCell: { minWidth: 60 },
  countLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  countValue: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
});
