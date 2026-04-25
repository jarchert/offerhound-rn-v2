// Ported verbatim from Lovable src/components/CampPerformanceCapture.tsx.
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - useToast → @/components/ui/toast
//   - <button> → Pressable
//   - <input type="number"> → TextInput keyboardType="numeric"
//   - <input type="range"> → not available in core RN; we keep numeric +/-
//     buttons + numeric input as a parity-preserving fallback
//   - Tabs in RN UI use controlled value/onValueChange (no defaultValue)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/toast';
import {
  Ruler,
  Weight,
  Timer,
  ChevronRight,
  Loader2,
  Save,
  Plus,
  Search,
  ArrowLeft,
  Zap,
  TrendingUp,
  ClipboardList,
  X,
} from 'lucide-react-native';
import {
  getCampSportMetrics,
  CAMP_PERF_COLUMN_METRICS,
  type CampSportMetric,
} from '@/lib/data/campManagerSports';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface PerformanceEntry {
  id: string;
  camp_id: string;
  enrollment_id: string | null;
  athlete_profile_id: string | null;
  evaluator_user_id: string;
  height_inches: number | null;
  weight_lbs: number | null;
  wingspan_inches: number | null;
  hand_size_inches: number | null;
  forty_yard_dash: number[];
  shuttle_5_10_5: number[];
  three_cone_drill: number[];
  vertical_jump: number[];
  broad_jump: number[];
  position_specific_scores: Record<string, any>;
  coach_notes: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface Enrollment {
  id: string;
  jersey_number: string | null;
  position_group: string | null;
  group_assignment: string | null;
  status: string;
}

interface CampPerformanceCaptureProps {
  campId: string;
  campName: string;
  sport?: string;
  positions?: string[];
}

const DEFAULT_METRICS: CampSportMetric[] = [
  { key: 'forty_yard_dash', label: '40-Yard Dash', unit: 'sec', lowerIsBetter: true, step: 0.01, placeholder: '4.55' },
  { key: 'shuttle_5_10_5', label: '5-10-5 Shuttle', unit: 'sec', lowerIsBetter: true, step: 0.01, placeholder: '4.20' },
  { key: 'three_cone_drill', label: '3-Cone Drill', unit: 'sec', lowerIsBetter: true, step: 0.01, placeholder: '6.90' },
  { key: 'vertical_jump', label: 'Vertical Jump', unit: 'in', step: 0.5, placeholder: '34.5' },
  { key: 'broad_jump', label: 'Broad Jump', unit: 'in', step: 0.5, placeholder: '118' },
];

export function CampPerformanceCapture({ campId, campName, sport, positions = [] }: CampPerformanceCaptureProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDrillDialog, setShowDrillDialog] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  const enrollmentsQuery = useQuery({
    queryKey: ['camp-perf-enrollments', campId],
    queryFn: async (): Promise<Enrollment[]> => {
      const { data, error } = await supabase
        .from('camp_enrollments')
        .select('id, jersey_number, position_group, group_assignment, status')
        .eq('camp_id', campId)
        .in('status', ['checked_in', 'registered', 'paid'])
        .order('jersey_number', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Enrollment[];
    },
  });
  const enrollments: Enrollment[] = enrollmentsQuery.data ?? [];
  const enrollLoading = enrollmentsQuery.isLoading;

  const entriesQuery = useQuery({
    queryKey: ['camp-performance-entries', campId],
    queryFn: async (): Promise<PerformanceEntry[]> => {
      const { data, error } = await supabase
        .from('camp_performance_entries')
        .select('*')
        .eq('camp_id', campId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PerformanceEntry[];
    },
  });
  const entries: PerformanceEntry[] = entriesQuery.data ?? [];
  const entriesLoading = entriesQuery.isLoading;

  const saveMutation = useMutation({
    mutationFn: async (entry: Partial<PerformanceEntry> & { enrollment_id: string }) => {
      const existing = entries.find((e) => e.enrollment_id === entry.enrollment_id);
      const isUpdate = !!existing;
      let entryId: string;
      if (existing) {
        const { error } = await supabase
          .from('camp_performance_entries')
          .update(entry as any)
          .eq('id', existing.id);
        if (error) throw error;
        entryId = existing.id;
      } else {
        const { data, error } = await supabase
          .from('camp_performance_entries')
          .insert({
            camp_id: campId,
            evaluator_user_id: user!.id,
            ...entry,
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        entryId = data.id;
      }

      try {
        await supabase.from('camp_audit_events').insert({
          camp_id: campId,
          actor_user_id: user!.id,
          subject_user_id: user!.id,
          event_type: isUpdate ? 'camp_sport_metrics_updated' : 'camp_sport_metrics_created',
          details: {
            performance_entry_id: entryId,
            enrollment_id: entry.enrollment_id,
            sport: sport ?? null,
            metric_keys_changed: Object.keys(entry).filter((k) => k !== 'enrollment_id'),
          } as any,
        } as any);
      } catch (err) {
        console.warn('metric audit log failed:', err);
      }

      return entryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-performance-entries', campId] });
    },
  });

  const saveDrill = useMutation({
    mutationFn: async (drill: { performance_entry_id: string; drill_name: string; score: number; tags?: string[]; evaluator_notes?: string }) => {
      const { error } = await supabase.from('camp_drill_evaluations').insert(drill as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Drill Evaluation Saved');
    },
  });

  const getEntryForEnrollment = (enrollmentId: string) =>
    entries.find((e) => e.enrollment_id === enrollmentId);

  const filteredEnrollments = enrollments.filter((e: Enrollment) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      e.jersey_number?.toLowerCase().includes(t) ||
      e.position_group?.toLowerCase().includes(t) ||
      e.group_assignment?.toLowerCase().includes(t) ||
      e.id.toLowerCase().includes(t)
    );
  });

  if (selectedEnrollment) {
    return (
      <AthletePerformanceCard
        enrollment={selectedEnrollment}
        entry={getEntryForEnrollment(selectedEnrollment.id)}
        campId={campId}
        userId={user?.id || ''}
        sport={sport}
        onSave={async (data) => {
          const entryId = await saveMutation.mutateAsync({ ...data, enrollment_id: selectedEnrollment.id as string });
          setCurrentEntryId(entryId);
          toast.success('Performance Data Saved');
        }}
        onDrillEval={(entryId) => {
          setCurrentEntryId(entryId);
          setShowDrillDialog(true);
        }}
        onBack={() => setSelectedEnrollment(null)}
        saving={saveMutation.isPending}
      />
    );
  }

  const totalEntries = entries.length;
  const withMetrics = entries.filter(
    (e) => (e.forty_yard_dash?.length || 0) > 0 || (e.vertical_jump?.length || 0) > 0,
  ).length;

  return (
    <View style={s.root}>
      <View>
        <Text style={s.h3}>Performance Capture — {campName}</Text>
        <Text style={s.muted}>Tap an athlete to enter measurables and performance data</Text>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <Card style={s.statCard}>
          <CardContent style={s.statContent}>
            <View style={s.statHeader}>
              <ClipboardList size={16} color={colors.primary} />
              <Text style={s.statValue}>{totalEntries}</Text>
            </View>
            <Text style={s.statLabel}>Entries</Text>
          </CardContent>
        </Card>
        <Card style={s.statCard}>
          <CardContent style={s.statContent}>
            <View style={s.statHeader}>
              <Zap size={16} color={'#d97706'} />
              <Text style={s.statValue}>{withMetrics}</Text>
            </View>
            <Text style={s.statLabel}>With Metrics</Text>
          </CardContent>
        </Card>
        <Card style={s.statCard}>
          <CardContent style={s.statContent}>
            <View style={s.statHeader}>
              <Timer size={16} color={colors.success} />
              <Text style={s.statValue}>{enrollments.length - totalEntries}</Text>
            </View>
            <Text style={s.statLabel}>Remaining</Text>
          </CardContent>
        </Card>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchIcon} pointerEvents="none">
          <Search size={16} color={colors.mutedForeground} />
        </View>
        <Input
          placeholder="Search by jersey #, position, group..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={s.searchInput}
        />
      </View>

      {/* Athlete list */}
      {enrollLoading || entriesLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filteredEnrollments.length === 0 ? (
        <Card>
          <CardContent style={s.emptyContent}>
            <Text style={s.muted}>No athletes found</Text>
          </CardContent>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {filteredEnrollments.map((enrollment) => {
            const entry = getEntryForEnrollment(enrollment.id);
            const hasData = !!entry;
            const hasMetrics =
              hasData &&
              ((entry!.forty_yard_dash?.length || 0) > 0 ||
                (entry!.vertical_jump?.length || 0) > 0);

            return (
              <Pressable
                key={enrollment.id}
                onPress={() => setSelectedEnrollment(enrollment)}
                style={s.enrollRow}
              >
                {enrollment.jersey_number ? (
                  <View style={s.jerseyBubble}>
                    <Text style={s.jerseyText}>{enrollment.jersey_number}</Text>
                  </View>
                ) : (
                  <View style={s.jerseyBubbleEmpty}>
                    <Ruler size={16} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.row}>
                    <Text style={s.enrollName}>#{enrollment.id.slice(0, 8)}</Text>
                    {enrollment.position_group && (
                      <Badge variant="outline">{enrollment.position_group}</Badge>
                    )}
                    {enrollment.group_assignment && (
                      <Badge variant="secondary">Grp {enrollment.group_assignment}</Badge>
                    )}
                  </View>
                  <View style={[s.row, { marginTop: 4 }]}>
                    {hasMetrics ? (
                      <Badge variant="success">Metrics Captured</Badge>
                    ) : hasData ? (
                      <Badge variant="secondary">Measurables Only</Badge>
                    ) : (
                      <Text style={s.smallMuted}>No data yet</Text>
                    )}
                    {entry && entry.forty_yard_dash?.length > 0 && (
                      <Text style={s.smallMuted}>
                        40yd: {Math.min(...entry.forty_yard_dash).toFixed(2)}s
                      </Text>
                    )}
                  </View>
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </Pressable>
            );
          })}
        </View>
      )}

      <DrillEvaluationDialog
        open={showDrillDialog}
        onOpenChange={setShowDrillDialog}
        entryId={currentEntryId}
        positions={positions}
        onSave={(drill) => {
          if (currentEntryId) {
            saveDrill.mutate({ ...drill, performance_entry_id: currentEntryId });
          }
        }}
        saving={saveDrill.isPending}
      />
    </View>
  );
}

// ─── Athlete Performance Card ─────────────────────
interface AthletePerformanceCardProps {
  enrollment: Enrollment;
  entry?: PerformanceEntry;
  campId: string;
  userId: string;
  sport?: string;
  onSave: (data: Partial<PerformanceEntry>) => Promise<void>;
  onDrillEval: (entryId: string) => void;
  onBack: () => void;
  saving: boolean;
}

function AthletePerformanceCard({
  enrollment,
  entry,
  sport,
  onSave,
  onDrillEval,
  onBack,
  saving,
}: AthletePerformanceCardProps) {
  const [tab, setTab] = useState<string>('measurables');
  const [form, setForm] = useState({
    height_inches: entry?.height_inches != null ? String(entry.height_inches) : '',
    weight_lbs: entry?.weight_lbs != null ? String(entry.weight_lbs) : '',
    wingspan_inches: entry?.wingspan_inches != null ? String(entry.wingspan_inches) : '',
    hand_size_inches: entry?.hand_size_inches != null ? String(entry.hand_size_inches) : '',
    coach_notes: entry?.coach_notes ?? '',
  });

  const sportMetrics = (() => {
    const cfg = getCampSportMetrics(sport);
    return cfg.length > 0 ? cfg : DEFAULT_METRICS;
  })();

  const initialMetrics: Record<string, number[]> = {};
  for (const m of sportMetrics) {
    if (CAMP_PERF_COLUMN_METRICS.has(m.key)) {
      initialMetrics[m.key] = (entry?.[m.key as keyof PerformanceEntry] as number[]) || [];
    } else {
      const stored = entry?.position_specific_scores?.[m.key];
      initialMetrics[m.key] = Array.isArray(stored)
        ? stored.filter((v: any) => typeof v === 'number')
        : [];
    }
  }
  const [metrics, setMetrics] = useState<Record<string, number[]>>(initialMetrics);
  const [newAttempt, setNewAttempt] = useState<Record<string, string>>({});

  const addAttempt = (key: string) => {
    const val = parseFloat(newAttempt[key] || '');
    if (isNaN(val) || val <= 0) return;
    setMetrics((prev) => ({ ...prev, [key]: [...(prev[key] || []), val] }));
    setNewAttempt((prev) => ({ ...prev, [key]: '' }));
  };

  const removeAttempt = (key: string, idx: number) => {
    setMetrics((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    const columnMetrics: Record<string, number[]> = {};
    const customMetrics: Record<string, number[]> = {};
    for (const m of sportMetrics) {
      const arr = metrics[m.key] || [];
      if (CAMP_PERF_COLUMN_METRICS.has(m.key)) columnMetrics[m.key] = arr;
      else if (arr.length > 0) customMetrics[m.key] = arr;
    }
    const mergedPss = { ...(entry?.position_specific_scores || {}), ...customMetrics };

    await onSave({
      height_inches: form.height_inches ? Number(form.height_inches) : null,
      weight_lbs: form.weight_lbs ? Number(form.weight_lbs) : null,
      wingspan_inches: form.wingspan_inches ? Number(form.wingspan_inches) : null,
      hand_size_inches: form.hand_size_inches ? Number(form.hand_size_inches) : null,
      coach_notes: form.coach_notes || null,
      ...columnMetrics,
      position_specific_scores: mergedPss,
    } as any);
  };

  const measurableFields = [
    { key: 'height_inches', label: 'Height (in)', placeholder: '72' },
    { key: 'weight_lbs', label: 'Weight (lbs)', placeholder: '185' },
    { key: 'wingspan_inches', label: 'Wingspan (in)', placeholder: '74' },
    { key: 'hand_size_inches', label: 'Hand Size (in)', placeholder: '9.5' },
  ] as const;

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <Button variant="ghost" size="sm" onPress={onBack}>
          <ArrowLeft size={16} color={colors.foreground} />
          <Text style={s.btnGhostText}> Back</Text>
        </Button>
        <View style={{ flex: 1 }}>
          <View style={s.row}>
            {enrollment.jersey_number && (
              <Text style={s.headerJersey}>#{enrollment.jersey_number}</Text>
            )}
            <Text style={s.smallMuted}>Athlete #{enrollment.id.slice(0, 8)}</Text>
          </View>
          <View style={[s.row, { marginTop: 2 }]}>
            {enrollment.position_group && (
              <Badge variant="outline">{enrollment.position_group}</Badge>
            )}
            {enrollment.group_assignment && (
              <Badge variant="secondary">Group {enrollment.group_assignment}</Badge>
            )}
          </View>
        </View>
        <Button onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Save size={16} color={colors.primaryForeground} />
          )}
          <Text style={s.btnPrimaryText}> Save</Text>
        </Button>
      </View>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="measurables">
            <View style={s.tabInner}>
              <Ruler size={14} color={colors.foreground} />
              <Text style={s.tabText}> Measurables</Text>
            </View>
          </TabsTrigger>
          <TabsTrigger value="performance">
            <View style={s.tabInner}>
              <Timer size={14} color={colors.foreground} />
              <Text style={s.tabText}> Performance</Text>
            </View>
          </TabsTrigger>
          <TabsTrigger value="notes">
            <View style={s.tabInner}>
              <ClipboardList size={14} color={colors.foreground} />
              <Text style={s.tabText}> Notes</Text>
            </View>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="measurables">
          <Card>
            <CardContent style={s.measurableGrid}>
              {measurableFields.map(({ key, label, placeholder }) => (
                <View key={key} style={s.measurableCell}>
                  <Label>{label}</Label>
                  <Input
                    keyboardType="numeric"
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, [key]: text }))}
                    style={s.measurableInput}
                  />
                </View>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <View style={{ gap: spacing.md }}>
            {sportMetrics.map((m) => {
              const arr = metrics[m.key] || [];
              const Icon = m.lowerIsBetter ? Timer : TrendingUp;
              const best = arr.length > 0
                ? m.lowerIsBetter
                  ? Math.min(...arr)
                  : Math.max(...arr)
                : null;
              return (
                <Card key={m.key}>
                  <CardHeader style={s.metricHeader}>
                    <CardTitle style={s.metricTitle}>
                      <Icon size={14} color={colors.primary} />
                      <Text style={s.metricLabel}> {m.label}</Text>
                    </CardTitle>
                    {best !== null && (
                      <Badge variant="secondary">
                        Best: {best} {m.unit}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent style={{ gap: spacing.sm }}>
                    {arr.length > 0 && (
                      <View style={s.attemptsRow}>
                        {arr.map((val, idx) => {
                          const isBest = m.lowerIsBetter
                            ? val === Math.min(...arr)
                            : val === Math.max(...arr);
                          return (
                            <View
                              key={idx}
                              style={[
                                s.attemptChip,
                                isBest ? s.attemptChipBest : null,
                              ]}
                            >
                              <Text
                                style={[
                                  s.attemptText,
                                  isBest ? s.attemptTextBest : null,
                                ]}
                              >
                                {val.toFixed(2)} {m.unit}
                              </Text>
                              <Pressable
                                onPress={() => removeAttempt(m.key, idx)}
                                style={s.attemptX}
                                hitSlop={6}
                              >
                                <X size={12} color={colors.mutedForeground} />
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    <View style={s.addAttemptRow}>
                      <Input
                        keyboardType="numeric"
                        placeholder={
                          m.placeholder ? `${m.placeholder} ${m.unit}` : `Enter ${m.unit}...`
                        }
                        value={newAttempt[m.key] || ''}
                        onChangeText={(text) =>
                          setNewAttempt((prev) => ({ ...prev, [m.key]: text }))
                        }
                        onSubmitEditing={() => addAttempt(m.key)}
                        style={{ flex: 1 }}
                      />
                      <Button size="sm" variant="outline" onPress={() => addAttempt(m.key)}>
                        <Plus size={16} color={colors.foreground} />
                      </Button>
                    </View>
                  </CardContent>
                </Card>
              );
            })}

            {entry?.id && (
              <Button variant="outline" onPress={() => onDrillEval(entry.id)}>
                <ClipboardList size={16} color={colors.foreground} />
                <Text style={s.btnGhostText}> Add Position-Specific Drill Evaluation</Text>
              </Button>
            )}
          </View>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent>
              <Label>Coach Notes</Label>
              <Textarea
                placeholder="Observations, strengths, areas for improvement..."
                value={form.coach_notes}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, coach_notes: text }))
                }
                numberOfLines={6}
                style={{ marginTop: spacing.sm }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </View>
  );
}

// ─── Drill Evaluation Dialog ─────────────────────
function DrillEvaluationDialog({
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entryId: string | null;
  positions: string[];
  onSave: (drill: { drill_name: string; score: number; tags?: string[]; evaluator_notes?: string }) => void;
  saving: boolean;
}) {
  const [drill, setDrill] = useState({
    drill_name: '',
    score: 5,
    tags: [] as string[],
    evaluator_notes: '',
  });

  const handleSave = () => {
    if (!drill.drill_name) return;
    onSave(drill);
    setDrill({ drill_name: '', score: 5, tags: [], evaluator_notes: '' });
    onOpenChange(false);
  };

  const adjustScore = (delta: number) => {
    setDrill((prev) => ({
      ...prev,
      score: Math.max(1, Math.min(10, prev.score + delta)),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Position-Specific Drill Evaluation</DialogTitle>
          <DialogDescription>Score this drill from 1 (lowest) to 10 (highest)</DialogDescription>
        </DialogHeader>
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Label>Drill Name</Label>
            <Input
              placeholder="e.g. Route Running, Ball Handling, Serve Accuracy..."
              value={drill.drill_name}
              onChangeText={(text) => setDrill((prev) => ({ ...prev, drill_name: text }))}
            />
          </View>
          <View style={{ gap: spacing.xs }}>
            <Label>
              <Text>Score (1–10): </Text>
              <Text style={s.scoreValue}>{drill.score}</Text>
            </Label>
            {/* RN core has no <input type=range>; parity preserved with +/- buttons */}
            <View style={s.scoreRow}>
              <Button size="sm" variant="outline" onPress={() => adjustScore(-1)}>
                <Text style={s.btnGhostText}>−</Text>
              </Button>
              <View style={s.scoreTrack}>
                <View
                  style={[
                    s.scoreFill,
                    { width: `${((drill.score - 1) / 9) * 100}%` },
                  ]}
                />
              </View>
              <Button size="sm" variant="outline" onPress={() => adjustScore(1)}>
                <Text style={s.btnGhostText}>+</Text>
              </Button>
            </View>
            <View style={s.scoreLegend}>
              <Text style={s.smallMuted}>1 — Poor</Text>
              <Text style={s.smallMuted}>5 — Average</Text>
              <Text style={s.smallMuted}>10 — Elite</Text>
            </View>
          </View>
          <View style={{ gap: spacing.xs }}>
            <Label>Notes</Label>
            <Textarea
              placeholder="Observations..."
              value={drill.evaluator_notes}
              onChangeText={(text) =>
                setDrill((prev) => ({ ...prev, evaluator_notes: text }))
              }
              numberOfLines={3}
            />
          </View>
        </View>
        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text style={s.btnGhostText}>Cancel</Text>
          </Button>
          <Button onPress={handleSave} disabled={saving || !drill.drill_name}>
            {saving && <ActivityIndicator color={colors.primaryForeground} size="small" />}
            <Text style={s.btnPrimaryText}> Save Evaluation</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CampPerformanceCapture;

const s = StyleSheet.create({
  root: { gap: spacing.lg },
  h3: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 18,
    color: colors.foreground,
    fontWeight: '700',
  },
  muted: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  smallMuted: { fontSize: 12, color: colors.mutedForeground },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1 },
  statContent: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 20,
    color: colors.primary,
  },
  statLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },

  searchWrap: { position: 'relative' },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  searchInput: { paddingLeft: spacing.lg + spacing.sm },

  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyContent: { paddingVertical: spacing.xl, alignItems: 'center' },

  enrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  jerseyBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyBubbleEmpty: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyText: {
    fontFamily: typography.fontFamily.heading,
    color: colors.primary,
    fontWeight: '700',
  },
  enrollName: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.foreground,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerJersey: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  btnGhostText: { color: colors.foreground, fontSize: 14 },
  btnPrimaryText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '600' },

  tabInner: { flexDirection: 'row', alignItems: 'center' },
  tabText: { color: colors.foreground, fontSize: 13 },

  measurableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  measurableCell: { width: '47%', gap: 6 },
  measurableInput: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 18,
  },

  metricHeader: {
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricTitle: { flexDirection: 'row', alignItems: 'center', fontSize: 14 },
  metricLabel: { fontSize: 14, color: colors.foreground, fontWeight: '600' },

  attemptsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  attemptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  attemptChipBest: {
    backgroundColor: colors.primary + '1A',
    borderWidth: 1,
    borderColor: colors.primary + '4D',
  },
  attemptText: { fontFamily: 'Menlo', fontSize: 13, color: colors.foreground },
  attemptTextBest: { color: colors.primary },
  attemptX: { marginLeft: 2 },

  addAttemptRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },

  scoreValue: {
    fontFamily: typography.fontFamily.heading,
    color: colors.primary,
    fontSize: 18,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scoreTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scoreLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
});
