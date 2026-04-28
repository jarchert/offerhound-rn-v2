// SportStatsEditor — RN port of offerhound-repo/src/components/athlete/SportStatsEditor.tsx
//
// Two modes:
//   - MetricSportEditor: standard sports → grid of labeled inputs from SPORT_METRICS
//   - EventSportEditor:  Track & Field / Swimming → category-grouped event chip
//                        picker + per-event PB/season-best/placement/splits inputs
//
// Web → RN translations:
//   - shadcn Input/Label/Badge/Button → src/components/ui/* equivalents
//   - lucide-react → lucide-react-native
//   - Tailwind grid → flexWrap StyleSheet
//   - Reads SPORT_METRICS / isEventBasedSport / getEventCatalogForSport from
//     src/lib/data/sportPositions.ts (already ported in this repo)
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import {
  AthleteEventEntry,
  SPORT_METRICS,
  getEventCatalogForSport,
  isEventBasedSport,
} from '@/lib/data/sportPositions';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  sport: string;
  /** Full sport_stats object */
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}

export function SportStatsEditor({ sport, value, onChange }: Props) {
  if (isEventBasedSport(sport)) {
    return <EventSportEditor sport={sport} value={value} onChange={onChange} />;
  }
  return <MetricSportEditor sport={sport} value={value} onChange={onChange} />;
}

// ---------------------------------------------------------------------------
// Stat-based sports
// ---------------------------------------------------------------------------
function MetricSportEditor({ sport, value, onChange }: Props) {
  const metrics = SPORT_METRICS[sport] || [];
  if (metrics.length === 0) {
    return <Text style={s.empty}>No standard metrics for this sport yet.</Text>;
  }
  return (
    <View style={s.metricsGrid}>
      {metrics.map((m) => (
        <View key={m.key} style={s.metricCell}>
          <Label>{m.label}</Label>
          <Input
            value={String(value?.[m.key] ?? '')}
            onChangeText={(text) => onChange({ ...value, [m.key]: text })}
            placeholder={m.placeholder}
          />
          {m.hint && <Text style={s.metricHint}>{m.hint}</Text>}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Event-based sports (Track & Swim)
// ---------------------------------------------------------------------------
function EventSportEditor({ sport, value, onChange }: Props) {
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
    onChange({ ...value, events: events.map((e) => (e.key === eventKey ? { ...e, ...patch } : e)) });
  };
  const removeEvent = (eventKey: string) => {
    onChange({ ...value, events: events.filter((e) => e.key !== eventKey) });
  };

  const selectedDetails = events
    .map((e) => {
      const cat = catalog.find((c) => c.key === e.category);
      const opt = cat?.events.find((ev) => ev.key === e.key);
      return opt ? { entry: e, opt, categoryLabel: cat?.label || '' } : null;
    })
    .filter(Boolean) as Array<{ entry: AthleteEventEntry; opt: any; categoryLabel: string }>;

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Event picker */}
      <View style={{ gap: spacing.md }}>
        <View>
          <Text style={s.sectionTitle}>Select your events</Text>
          <Text style={s.sectionHint}>
            Pick every event you compete in. You'll add times and stats for each one below.
          </Text>
        </View>
        {catalog.map((cat) => (
          <View key={cat.key} style={{ gap: spacing.sm }}>
            <Text style={s.categoryLabel}>{cat.label}</Text>
            <View style={s.chipRow}>
              {cat.events.map((ev) => {
                const selected = isSelected(ev.key);
                return (
                  <Pressable
                    key={ev.key}
                    onPress={() => toggleEvent(cat.key, ev.key, ev.label)}
                    style={[s.chip, selected && s.chipActive]}
                  >
                    <Text style={[s.chipText, selected && s.chipTextActive]}>{ev.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* Per-event inputs */}
      {selectedDetails.length > 0 && (
        <View style={{ gap: spacing.md }}>
          <Text style={s.sectionTitle}>Your performance</Text>
          {selectedDetails.map(({ entry, opt, categoryLabel }) => {
            const isTime = opt.format === 'time';
            const placeholder = isTime
              ? 'mm:ss.xx or ss.xx'
              : opt.format === 'height'
              ? `e.g. 6'4"`
              : opt.format === 'score'
              ? 'e.g. 6200'
              : `e.g. 22'6"`;
            return (
              <View key={entry.key} style={s.eventCard}>
                <View style={s.eventHeader}>
                  <View>
                    <Text style={s.eventTitle}>{entry.label}</Text>
                    <Text style={s.eventCategory}>{categoryLabel}</Text>
                  </View>
                  <Button variant="ghost" size="sm" onPress={() => removeEvent(entry.key)}>
                    <Trash2 size={14} color={colors.foreground} />
                  </Button>
                </View>
                <View style={s.fieldsGrid}>
                  <View style={s.field}>
                    <Label>Personal Best</Label>
                    <Input value={entry.pb || ''} placeholder={placeholder} onChangeText={(t) => updateEvent(entry.key, { pb: t })} />
                  </View>
                  <View style={s.field}>
                    <Label>Season Best</Label>
                    <Input value={entry.seasonBest || ''} placeholder={placeholder} onChangeText={(t) => updateEvent(entry.key, { seasonBest: t })} />
                  </View>
                  <View style={s.field}>
                    <Label>Placement (optional)</Label>
                    <Input value={entry.placement || ''} placeholder="e.g. 2nd at State" onChangeText={(t) => updateEvent(entry.key, { placement: t })} />
                  </View>
                  <View style={s.field}>
                    <Label>Win-Loss Record (optional)</Label>
                    <Input value={entry.record || ''} placeholder="e.g. 12-2" onChangeText={(t) => updateEvent(entry.key, { record: t })} />
                  </View>
                  {opt.hasSplits && (
                    <View style={[s.field, { width: '100%' }]}>
                      <Label>Splits (optional)</Label>
                      <Input value={entry.splits || ''} placeholder="e.g. 22.4 / 23.1 / 23.8 / 24.5" onChangeText={(t) => updateEvent(entry.key, { splits: t })} />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default SportStatsEditor;

// Mirror helper used by Onboarding & ProfileManagement to copy common
// measurables out of sport_stats into dedicated player_profile columns.
export const measurableMirrorFromStats = (
  stats: Record<string, any> | null | undefined
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

const s = StyleSheet.create({
  empty: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricCell: { width: '48%', gap: 4 },
  metricHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.mutedForeground,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  sectionHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  categoryLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  chipTextActive: { color: colors.primaryForeground },
  eventCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    padding: spacing.md,
    gap: spacing.md,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  eventCategory: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.mutedForeground,
  },
  fieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  field: { width: '48%', gap: 4 },
});
