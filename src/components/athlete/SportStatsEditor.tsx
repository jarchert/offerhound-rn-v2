// Ported from Lovable web: src/components/athlete/SportStatsEditor.tsx
// Translations:
//   <div>/<p>/<span> → <View>/<Text>; Pressable for tappable rows
//   Tailwind classes → StyleSheet using @/lib/theme tokens
//   @/components/ui/* (lowercase) → PascalCase imports
//   lucide-react → lucide-react-native
//   Native HTML <table> for EventsTable → ScrollView+View grid (parity look)
//   Data logic / props / persisted JSON shape unchanged
//   measurableMirrorFromStats helper preserved verbatim
/**
 * SportStatsEditor — shared, sport-aware stats editor used by both
 * Onboarding (Step 2) and ProfileManagement (Measurables card).
 *
 * - For 11 stat-based sports: renders a metric grid driven by SPORT_METRICS.
 * - For Track & Field / Swimming: renders a grouped event picker followed by
 *   per-event input rows (PB, Season Best, Placement, optional Splits/Record).
 *
 * Persisted shape on player_profiles.sport_stats (jsonb):
 *   - Stat sports:  { [metricKey]: stringValue }
 *   - Event sports: { events: AthleteEventEntry[] }
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Trash2 } from 'lucide-react-native';
import {
  AthleteEventEntry,
  SPORT_METRICS,
  getEventCatalogForSport,
  isEventBasedSport,
} from '@/lib/data/sportPositions';
import { colors, spacing, typography } from '@/lib/theme';

interface Props {
  sport: string;
  /** Full sport_stats object */
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  style?: ViewStyle;
}

export function SportStatsEditor({ sport, value, onChange, style }: Props) {
  const eventBased = isEventBasedSport(sport);

  if (eventBased) {
    return <EventSportEditor sport={sport} value={value} onChange={onChange} style={style} />;
  }
  return <MetricSportEditor sport={sport} value={value} onChange={onChange} style={style} />;
}

// ----------------------------------------------------------------------------
// Stat-based sports
// ----------------------------------------------------------------------------

function MetricSportEditor({ sport, value, onChange, style }: Props) {
  const metrics = SPORT_METRICS[sport] || [];

  if (metrics.length === 0) {
    return (
      <Text style={[s.emptyText, style as any]}>
        No standard metrics for this sport yet.
      </Text>
    );
  }

  return (
    <View style={[s.metricGrid, style]}>
      {metrics.map((m) => (
        <View key={m.key} style={s.metricCell}>
          <Label style={s.metricLabel}>{m.label}</Label>
          <Input
            value={value?.[m.key] ?? ''}
            onChangeText={(t) => onChange({ ...value, [m.key]: t })}
            placeholder={m.placeholder}
          />
          {m.hint ? <Text style={s.metricHint}>{m.hint}</Text> : null}
        </View>
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Event-based sports (Track & Swim)
// ----------------------------------------------------------------------------

function EventSportEditor({ sport, value, onChange, style }: Props) {
  const catalog = useMemo(() => getEventCatalogForSport(sport), [sport]);
  const events: AthleteEventEntry[] = Array.isArray(value?.events) ? value.events : [];

  const isSelected = (eventKey: string) => events.some((e) => e.key === eventKey);

  const toggleEvent = (categoryKey: string, eventKey: string, label: string) => {
    let next: AthleteEventEntry[];
    if (isSelected(eventKey)) {
      next = events.filter((e) => e.key !== eventKey);
    } else {
      next = [...events, { key: eventKey, category: categoryKey, label }];
    }
    onChange({ ...value, events: next });
  };

  const updateEvent = (eventKey: string, patch: Partial<AthleteEventEntry>) => {
    const next = events.map((e) => (e.key === eventKey ? { ...e, ...patch } : e));
    onChange({ ...value, events: next });
  };

  const removeEvent = (eventKey: string) => {
    onChange({ ...value, events: events.filter((e) => e.key !== eventKey) });
  };

  // Build a lookup for selected events with their option metadata
  const selectedDetails = events
    .map((e) => {
      const cat = catalog.find((c) => c.key === e.category);
      const opt = cat?.events.find((ev) => ev.key === e.key);
      return opt ? { entry: e, opt, categoryLabel: cat?.label || '' } : null;
    })
    .filter(Boolean) as Array<{ entry: AthleteEventEntry; opt: any; categoryLabel: string }>;

  return (
    <View style={[s.column, style]}>
      {/* Event picker */}
      <View style={s.column}>
        <View>
          <Text style={s.sectionTitle}>Select your events</Text>
          <Text style={s.sectionHint}>
            Pick every event you compete in. You'll add times and stats for each one below.
          </Text>
        </View>
        {catalog.map((cat) => (
          <View key={cat.key} style={s.categoryBlock}>
            <Text style={s.categoryLabel}>{cat.label}</Text>
            <View style={s.badgeRow}>
              {cat.events.map((ev) => {
                const selected = isSelected(ev.key);
                return (
                  <Pressable
                    key={ev.key}
                    onPress={() => toggleEvent(cat.key, ev.key, ev.label)}
                  >
                    <Badge variant={selected ? 'default' : 'outline'}>
                      {ev.label}
                    </Badge>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* Per-event inputs */}
      {selectedDetails.length > 0 && (
        <View style={s.column}>
          <Text style={s.sectionTitle}>Your performance</Text>
          <View style={s.column}>
            {selectedDetails.map(({ entry, opt, categoryLabel }) => {
              const isTime = opt.format === 'time';
              const pbPlaceholder = isTime
                ? 'mm:ss.xx or ss.xx'
                : opt.format === 'height'
                ? `e.g. 6'4"`
                : opt.format === 'score'
                ? 'e.g. 6200'
                : `e.g. 22'6"`;
              return (
                <View key={entry.key} style={s.eventCard}>
                  <View style={s.eventHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.eventName}>{entry.label}</Text>
                      <Text style={s.eventCategory}>{categoryLabel}</Text>
                    </View>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => removeEvent(entry.key)}
                      leftIcon={<Trash2 size={14} color={colors.foreground} />}
                    />
                  </View>
                  <View style={s.fieldGrid}>
                    <View style={s.fieldCell}>
                      <Label style={s.fieldLabel}>Personal Best</Label>
                      <Input
                        value={entry.pb || ''}
                        onChangeText={(t) => updateEvent(entry.key, { pb: t })}
                        placeholder={pbPlaceholder}
                      />
                    </View>
                    <View style={s.fieldCell}>
                      <Label style={s.fieldLabel}>Season Best</Label>
                      <Input
                        value={entry.seasonBest || ''}
                        onChangeText={(t) => updateEvent(entry.key, { seasonBest: t })}
                        placeholder={pbPlaceholder}
                      />
                    </View>
                    <View style={s.fieldCell}>
                      <Label style={s.fieldLabel}>Placement (optional)</Label>
                      <Input
                        value={entry.placement || ''}
                        onChangeText={(t) => updateEvent(entry.key, { placement: t })}
                        placeholder="e.g. 2nd at State"
                      />
                    </View>
                    <View style={s.fieldCell}>
                      <Label style={s.fieldLabel}>Win-Loss Record (optional)</Label>
                      <Input
                        value={entry.record || ''}
                        onChangeText={(t) => updateEvent(entry.key, { record: t })}
                        placeholder="e.g. 12-2"
                      />
                    </View>
                    {opt.hasSplits && (
                      <View style={[s.fieldCell, s.fieldCellFull]}>
                        <Label style={s.fieldLabel}>Splits (optional)</Label>
                        <Input
                          value={entry.splits || ''}
                          onChangeText={(t) => updateEvent(entry.key, { splits: t })}
                          placeholder="e.g. 22.4 / 23.1 / 23.8 / 24.5"
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Mirror helper used by Onboarding & ProfileManagement to copy common
// measurables out of sport_stats into dedicated player_profile columns,
// so the radar pre-populates from cross-sport keys.
// ----------------------------------------------------------------------------

export const measurableMirrorFromStats = (
  stats: Record<string, any> | null | undefined,
): Record<string, string | null> => {
  const mirror: Record<string, string | null> = {};
  if (!stats) return mirror;
  const map: Record<string, string> = {
    forty_yard: 'forty_yard',
    vertical: 'vertical',
    bench_press: 'bench_press',
    squat: 'squat',
    arm_length: 'arm_length',
  };
  Object.entries(map).forEach(([statKey, columnKey]) => {
    const v = stats?.[statKey];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      mirror[columnKey] = String(v).trim();
    }
  });
  return mirror;
};

// ----------------------------------------------------------------------------
// Read-only Events table for public profile / cards (Track & Swim)
// ----------------------------------------------------------------------------

export function EventsTable({
  sport,
  sportStats,
  style,
}: {
  sport: string;
  sportStats: any;
  style?: ViewStyle;
}) {
  if (!isEventBasedSport(sport)) return null;
  const events: AthleteEventEntry[] = Array.isArray(sportStats?.events) ? sportStats.events : [];
  if (events.length === 0) return null;

  const catalog = getEventCatalogForSport(sport);
  // Group by category
  const byCategory: Record<string, AthleteEventEntry[]> = {};
  events.forEach((e) => {
    const k = e.category || 'other';
    (byCategory[k] = byCategory[k] || []).push(e);
  });

  return (
    <View style={[s.column, style]}>
      {Object.entries(byCategory).map(([catKey, catEvents]) => {
        const catLabel = catalog.find((c) => c.key === catKey)?.label || catKey;
        return (
          <View key={catKey} style={s.categoryBlock}>
            <Text style={s.categoryLabel}>{catLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tableWrap}>
              <View>
                {/* Header */}
                <View style={[s.tableRow, s.tableHeaderRow]}>
                  <Text style={[s.tableCell, s.tableHeaderCell, { width: 160 }]}>Event</Text>
                  <Text style={[s.tableCell, s.tableHeaderCell, { width: 100 }]}>PB</Text>
                  <Text style={[s.tableCell, s.tableHeaderCell, { width: 110 }]}>Season Best</Text>
                  <Text style={[s.tableCell, s.tableHeaderCell, { width: 140 }]}>Placement</Text>
                </View>
                {catEvents.map((e) => (
                  <View key={e.key} style={s.tableRow}>
                    <Text style={[s.tableCell, s.tableCellMain, { width: 160 }]}>{e.label}</Text>
                    <Text style={[s.tableCell, s.tableCellPrimary, { width: 100 }]}>{e.pb || '—'}</Text>
                    <Text style={[s.tableCell, s.tableCellMuted, { width: 110 }]}>{e.seasonBest || '—'}</Text>
                    <Text style={[s.tableCell, s.tableCellMuted, { width: 140 }]}>{e.placement || '—'}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  column: { gap: spacing.md },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  // Metric grid
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCell: {
    flexBasis: '100%',
    gap: 4,
  },
  metricLabel: { fontSize: typography.fontSize.sm },
  metricHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.mutedForeground,
  },
  // Sections
  sectionTitle: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  sectionHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  categoryBlock: { gap: spacing.sm },
  categoryLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Event card
  eventCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary + '33',
    padding: spacing.sm + 4,
    gap: spacing.sm + 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eventName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  eventCategory: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.mutedForeground,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 4,
  },
  fieldCell: { flexBasis: '100%', gap: 4 },
  fieldCellFull: { flexBasis: '100%' },
  fieldLabel: { fontSize: typography.fontSize.xs },
  // Read-only events table
  tableWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableHeaderRow: {
    backgroundColor: colors.secondary,
    borderTopWidth: 0,
  },
  tableCell: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  tableHeaderCell: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
  },
  tableCellMain: { fontFamily: typography.fontFamily.bodyMedium },
  tableCellPrimary: { color: colors.primary },
  tableCellMuted: { color: colors.mutedForeground },
});
