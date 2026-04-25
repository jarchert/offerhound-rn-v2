// Parity port from Lovable src/components/CampScheduleBuilder.tsx (verbatim logic).
// Web→RN translations:
//   <div>/<p>/<h2>/<h3> → <View>/<Text>
//   Tailwind classes → StyleSheet via @/lib/theme tokens
//   @/components/ui/* (lowercase) → PascalCase RN ports
//   lucide-react → lucide-react-native
//   onChange e.target.value → onChangeText
//   Input type="number" → keyboardType="number-pad"
//   Input type="time" → keyboardType="numbers-and-punctuation" + placeholder "HH:MM"
//     (RN has no native time picker UI; verbatim functional parity by using string input)
//   ToastAndroid via useToast hook (existing parity)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  GripVertical,
  Loader2,
  Clock,
  Target,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import { useUpdateCamp, type Camp } from '@/hooks/useCampManager';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography } from '@/lib/theme';

export interface DrillStation {
  id: string;
  station_number: number;
  name: string;
  duration_minutes: number;
  evaluator?: string;
  position_group?: string;
  notes?: string;
  start_time?: string;
}

interface CampScheduleBuilderProps {
  camp: Camp;
  onBack: () => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function CampScheduleBuilder({ camp, onBack }: CampScheduleBuilderProps) {
  const updateCamp = useUpdateCamp();
  const { toast } = useToast();
  const [stations, setStations] = useState<DrillStation[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const existing = (camp.drill_stations || []) as Partial<DrillStation>[];
    setStations(
      existing.map((s, i) => ({
        id: makeId(),
        station_number: typeof s.station_number === 'number' ? s.station_number : i + 1,
        name: s.name || `Station ${i + 1}`,
        duration_minutes:
          typeof s.duration_minutes === 'number' ? s.duration_minutes : 10,
        evaluator: s.evaluator,
        position_group: s.position_group,
        notes: s.notes,
        start_time: s.start_time,
      }))
    );
    setDirty(false);
  }, [camp.id, camp.drill_stations]);

  const update = (id: string, patch: Partial<DrillStation>) => {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const addStation = () => {
    setStations((prev) => [
      ...prev,
      {
        id: makeId(),
        station_number: prev.length + 1,
        name: `Station ${prev.length + 1}`,
        duration_minutes: 10,
      },
    ]);
    setDirty(true);
  };

  const removeStation = (id: string) => {
    setStations((prev) => prev.filter((s) => s.id !== id));
    setDirty(true);
  };

  const move = (id: string, direction: -1 | 1) => {
    setStations((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const next = idx + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      const normalized = stations.map((s, i) => ({
        station_number: i + 1,
        name: s.name?.trim() || `Station ${i + 1}`,
        duration_minutes: Number.isFinite(s.duration_minutes)
          ? Math.max(1, s.duration_minutes)
          : 10,
        evaluator: s.evaluator?.trim() || null,
        position_group: s.position_group?.trim() || null,
        notes: s.notes?.trim() || null,
        start_time: s.start_time || null,
      }));
      await updateCamp.mutateAsync({
        id: camp.id,
        drill_stations: normalized,
      } as any);
      toast({ title: 'Schedule saved' });
      setDirty(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const totalMinutes = stations.reduce(
    (sum, s) => sum + (Number.isFinite(s.duration_minutes) ? s.duration_minutes : 0),
    0
  );

  const positionOptions = ['All', ...(camp.positions || [])];

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Button variant="ghost" size="sm" onPress={onBack} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>
            Back to Camps
          </Button>
          <View>
            <Text style={s.title}>{camp.name}</Text>
            <Text style={s.subtitle}>Drill stations & schedule builder</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Badge variant="secondary">
            <View style={s.badgeRow}>
              <Clock size={12} color={colors.foreground} />
              <Text style={s.badgeText}>{totalMinutes} min total</Text>
            </View>
          </Badge>
          <Badge variant="secondary">
            <View style={s.badgeRow}>
              <Target size={12} color={colors.foreground} />
              <Text style={s.badgeText}>{stations.length} stations</Text>
            </View>
          </Badge>
          <Button
            onPress={handleSave}
            disabled={!dirty || updateCamp.isPending}
            size="sm"
            leftIcon={
              updateCamp.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Save size={16} color={colors.primaryForeground} />
              )
            }
          >
            Save Schedule
          </Button>
        </View>
      </View>

      {stations.length === 0 ? (
        <Card>
          <CardContent style={s.emptyContent}>
            <Target size={48} color={colors.mutedForeground} style={s.emptyIcon} />
            <Text style={s.emptyTitle}>No drill stations yet</Text>
            <Text style={s.emptyDesc}>
              Define the stations athletes will rotate through during this camp.
            </Text>
            <Button onPress={addStation} leftIcon={<Plus size={16} color={colors.primaryForeground} />}>
              Add First Station
            </Button>
          </CardContent>
        </Card>
      ) : (
        <View style={s.stationsList}>
          {stations.map((st, idx) => (
            <Card key={st.id}>
              <CardHeader style={s.stationHeader}>
                <View style={s.stationHeaderRow}>
                  <View style={s.stationTitleRow}>
                    <GripVertical size={16} color={colors.mutedForeground} />
                    <CardTitle style={s.stationTitle}>Station {idx + 1}</CardTitle>
                  </View>
                  <View style={s.stationActions}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={() => move(st.id, -1)}
                      disabled={idx === 0}
                    >
                      <ChevronUp size={16} color={colors.foreground} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={() => move(st.id, 1)}
                      disabled={idx === stations.length - 1}
                    >
                      <ChevronDown size={16} color={colors.foreground} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={() => removeStation(st.id)}
                    >
                      <Trash2 size={16} color={colors.destructive} />
                    </Button>
                  </View>
                </View>
              </CardHeader>
              <CardContent style={s.stationGrid}>
                <View style={s.fieldFull}>
                  <Label style={s.fieldLabel}>Drill name</Label>
                  <Input
                    value={st.name}
                    onChangeText={(v) => update(st.id, { name: v })}
                    placeholder="40-yard dash, route tree, agility shuttle…"
                  />
                </View>
                <View style={s.fieldHalf}>
                  <Label style={s.fieldLabel}>Duration (minutes)</Label>
                  <Input
                    keyboardType="number-pad"
                    value={String(st.duration_minutes)}
                    onChangeText={(v) =>
                      update(st.id, {
                        duration_minutes: parseInt(v || '0', 10) || 0,
                      })
                    }
                  />
                </View>
                <View style={s.fieldHalf}>
                  <Label style={s.fieldLabel}>Anchor start time (optional)</Label>
                  <Input
                    placeholder="HH:MM"
                    value={st.start_time || ''}
                    onChangeText={(v) => update(st.id, { start_time: v })}
                  />
                </View>
                <View style={s.fieldHalf}>
                  <Label style={s.fieldLabel}>Evaluator</Label>
                  <Input
                    value={st.evaluator || ''}
                    onChangeText={(v) => update(st.id, { evaluator: v })}
                    placeholder="Coach name"
                  />
                </View>
                <View style={s.fieldHalf}>
                  <Label style={s.fieldLabel}>Position group</Label>
                  <Select
                    value={st.position_group || 'All'}
                    onValueChange={(v) =>
                      update(st.id, { position_group: v === 'All' ? '' : v })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {positionOptions.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </View>
                <View style={s.fieldFull}>
                  <Label style={s.fieldLabel}>Notes</Label>
                  <Input
                    value={st.notes || ''}
                    onChangeText={(v) => update(st.id, { notes: v })}
                    placeholder="Equipment, coaching points, etc."
                  />
                </View>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onPress={addStation} leftIcon={<Plus size={16} color={colors.foreground} />}>
            Add Station
          </Button>
        </View>
      )}

      {dirty && (
        <Card style={s.dirtyCard}>
          <CardContent style={s.dirtyContent}>
            <CardDescription>You have unsaved changes.</CardDescription>
            <Button
              onPress={handleSave}
              size="sm"
              disabled={updateCamp.isPending}
              leftIcon={
                updateCamp.isPending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Save size={16} color={colors.primaryForeground} />
                )
              }
            >
              Save
            </Button>
          </CardContent>
        </Card>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h4,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.mutedForeground },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.foreground },
  emptyContent: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyIcon: { marginBottom: spacing.sm },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  emptyDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  stationsList: { gap: spacing.sm },
  stationHeader: { paddingBottom: spacing.sm },
  stationHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  stationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stationTitle: { fontSize: typography.size.base },
  stationActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  stationGrid: { gap: spacing.sm, flexDirection: 'row', flexWrap: 'wrap' },
  fieldFull: { width: '100%', gap: 4 },
  fieldHalf: { width: '100%', gap: 4 },
  fieldLabel: { fontSize: typography.size.xs },
  dirtyCard: { borderColor: colors.warning, backgroundColor: 'rgba(244,158,10,0.05)' },
  dirtyContent: {
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
