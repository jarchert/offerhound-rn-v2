// CampEvaluatorScoringScreen — RN port of Lovable web src/pages/CampEvaluatorScoring.tsx (441 LOC).
// Quick mobile interface for evaluators to record drill scores during a camp. Athletes are
// pickable from a searchable list; selecting one reveals the drill picker, score input,
// and notes field. Scores upsert into camp_performance_entries (per evaluator, latest row).
//
// PORT-PENDING (voice notes):
//   Web uses MediaRecorder + getUserMedia(audio). RN equivalent is `expo-av` or
//   `react-native-audio-recorder-player`, neither of which is installed yet. The voice
//   button is rendered but disabled with an explanatory toast. When audio recording lands,
//   wire startRecording/stopRecording back into a real recorder.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronRight,
  Mic,
  Save,
  Search,
  Timer,
} from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { colors, spacing } from '@/lib/theme';
import type { CampStackParamList } from '@/navigation/stacks/CampStack';

interface EnrollmentRow {
  id: string;
  status: string;
  jersey_number: string | null;
  position_group: string | null;
  notes: string | null;
  athlete_profile_id: string | null;
}

interface CampInfo {
  id: string;
  name: string;
  positions: string[] | null;
  drill_stations: any;
}

const DRILL_OPTIONS = [
  { key: 'forty_yard_dash', label: '40-yard dash', unit: 's', step: 0.01 },
  { key: 'shuttle_5_10_5', label: '5-10-5 shuttle', unit: 's', step: 0.01 },
  { key: 'three_cone_drill', label: '3-cone drill', unit: 's', step: 0.01 },
  { key: 'vertical_jump', label: 'Vertical jump', unit: '"', step: 0.5 },
  { key: 'broad_jump', label: 'Broad jump', unit: '"', step: 1 },
] as const;

type DrillKey = (typeof DRILL_OPTIONS)[number]['key'];

export default function CampEvaluatorScoringScreen() {
  const route = useRoute<RouteProp<CampStackParamList, 'CampEvaluatorScoring'>>();
  const navigation = useNavigation<NavigationProp<any>>();
  const campId = route.params?.campId;
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeEnrollment, setActiveEnrollment] = useState<EnrollmentRow | null>(null);
  const [drillKey, setDrillKey] = useState<DrillKey>('forty_yard_dash');
  const [scoreInput, setScoreInput] = useState('');
  const [coachNotes, setCoachNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigation.navigate('AuthStack' as never);
    }
  }, [authLoading, isAuthenticated, navigation]);

  const { data: camp, isLoading: campLoading } = useQuery({
    queryKey: ['evaluator-camp', campId],
    queryFn: async () => {
      if (!campId) return null;
      const { data, error } = await supabase
        .from('camps')
        .select('id, name, positions, drill_stations')
        .eq('id', campId)
        .maybeSingle();
      if (error) throw error;
      return data as CampInfo | null;
    },
    enabled: !!campId,
  });

  const { data: enrollments = [], isLoading: enrLoading } = useQuery({
    queryKey: ['evaluator-enrollments', campId],
    queryFn: async () => {
      if (!campId) return [];
      const { data, error } = await supabase
        .from('camp_enrollments')
        .select('id, status, jersey_number, position_group, notes, athlete_profile_id')
        .eq('camp_id', campId)
        .order('jersey_number', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as EnrollmentRow[];
    },
    enabled: !!campId,
    refetchInterval: 10_000,
  });

  const filteredEnrollments = useMemo(() => {
    if (!search.trim()) return enrollments;
    const term = search.toLowerCase();
    return enrollments.filter(
      (e) =>
        e.jersey_number?.toLowerCase().includes(term) ||
        e.position_group?.toLowerCase().includes(term) ||
        e.id.toLowerCase().includes(term) ||
        e.notes?.toLowerCase().includes(term),
    );
  }, [enrollments, search]);

  const saveScore = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign-in required');
      if (!campId || !activeEnrollment) throw new Error('Select an athlete');
      const numeric = Number(scoreInput);
      if (!Number.isFinite(numeric)) throw new Error('Enter a valid score');

      const { data: existing } = await supabase
        .from('camp_performance_entries')
        .select(
          'id, forty_yard_dash, shuttle_5_10_5, three_cone_drill, vertical_jump, broad_jump, coach_notes',
        )
        .eq('camp_id', campId)
        .eq('enrollment_id', activeEnrollment.id)
        .eq('evaluator_user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevValues: number[] = (existing?.[drillKey] as number[] | null) ?? [];
      const updatedValues = [...prevValues, numeric];

      if (existing) {
        const { error } = await supabase
          .from('camp_performance_entries')
          .update({
            [drillKey]: updatedValues,
            coach_notes:
              coachNotes.trim().length > 0
                ? `${existing.coach_notes ? existing.coach_notes + '\n' : ''}${coachNotes.trim()}`
                : existing.coach_notes,
          } as any)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('camp_performance_entries').insert({
          camp_id: campId,
          enrollment_id: activeEnrollment.id,
          athlete_profile_id: activeEnrollment.athlete_profile_id,
          evaluator_user_id: user.id,
          [drillKey]: updatedValues,
          coach_notes: coachNotes.trim() || null,
          data_source: 'evaluator_mobile',
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: '✓ Score saved' });
      setScoreInput('');
      setCoachNotes('');
      queryClient.invalidateQueries({ queryKey: ['leaderboard-perf', campId] });
    },
    onError: (err: any) => {
      toast({
        title: 'Could not save',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // PORT-PENDING: hook expo-av or similar when audio recording is added.
  const handleVoicePress = () => {
    toast({
      title: 'Voice notes coming soon',
      description: 'Native audio capture is not yet wired in this build.',
    });
  };

  if (authLoading || campLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!camp) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Camp not found.</Text>
        <Button variant="outline" onPress={() => navigation.goBack()}>
          Back to camps
        </Button>
      </SafeAreaView>
    );
  }

  const drillMeta = DRILL_OPTIONS.find((d) => d.key === drillKey)!;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {camp.name}
            </Text>
            <Text style={styles.subtitle}>Evaluator scoring</Text>
          </View>
        </View>
        <Badge variant="secondary" style={styles.modeBadge}>
          <Timer size={12} color={colors.foreground} />
          <Text style={styles.modeBadgeText}> Quick mode</Text>
        </Badge>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!activeEnrollment ? (
          <Card>
            <CardHeader style={{ paddingBottom: spacing.xs }}>
              <CardTitle>Pick an athlete</CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.searchWrap}>
                <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
                <View style={{ flex: 1 }}>
                  <Input
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Jersey, position, or ID"
                    style={{ paddingLeft: 32 }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={{ marginTop: spacing.sm }}>
                {enrLoading ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : filteredEnrollments.length === 0 ? (
                  <Text style={[styles.muted, { textAlign: 'center', paddingVertical: 16 }]}>
                    No matches
                  </Text>
                ) : (
                  filteredEnrollments.slice(0, 30).map((e) => (
                    <Pressable
                      key={e.id}
                      onPress={() => setActiveEnrollment(e)}
                      style={({ pressed }) => [
                        styles.athleteRow,
                        pressed && { opacity: 0.7 },
                      ]}>
                      <View style={styles.athleteLeft}>
                        {e.jersey_number ? (
                          <Text style={styles.jersey}>{e.jersey_number}</Text>
                        ) : null}
                        <Text style={styles.athleteId} numberOfLines={1}>
                          #{e.id.slice(0, 8)}
                        </Text>
                        {e.position_group ? (
                          <Badge variant="outline" style={styles.posBadge}>
                            <Text style={styles.posBadgeText}>{e.position_group}</Text>
                          </Badge>
                        ) : null}
                      </View>
                      <ChevronRight size={16} color={colors.mutedForeground} />
                    </Pressable>
                  ))
                )}
              </View>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader style={styles.activeHeader}>
              <View style={{ flexShrink: 1 }}>
                <CardTitle>
                  {activeEnrollment.jersey_number
                    ? `#${activeEnrollment.jersey_number}`
                    : `Athlete ${activeEnrollment.id.slice(0, 6)}`}
                </CardTitle>
                {activeEnrollment.position_group ? (
                  <Badge variant="outline" style={{ ...styles.posBadge, marginTop: 4 }}>
                    <Text style={styles.posBadgeText}>{activeEnrollment.position_group}</Text>
                  </Badge>
                ) : null}
              </View>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => {
                  setActiveEnrollment(null);
                  setScoreInput('');
                  setCoachNotes('');
                }}>
                Change
              </Button>
            </CardHeader>
            <CardContent>
              <View style={styles.field}>
                <Label>Drill</Label>
                <Select value={drillKey} onValueChange={(v) => setDrillKey(v as DrillKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRILL_OPTIONS.map((d) => (
                      <SelectItem key={d.key} value={d.key}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>

              <View style={styles.field}>
                <Label>Score ({drillMeta.unit})</Label>
                <Input
                  value={scoreInput}
                  onChangeText={setScoreInput}
                  keyboardType="decimal-pad"
                  placeholder={`e.g. ${drillKey === 'vertical_jump' ? '32.5' : '4.55'}`}
                />
              </View>

              <View style={styles.field}>
                <View style={styles.notesHeaderRow}>
                  <Label>Notes</Label>
                  <Button size="sm" variant="outline" onPress={handleVoicePress}>
                    <Mic size={12} color={colors.foreground} />
                    <Text style={{ marginLeft: 4, color: colors.foreground }}>Voice</Text>
                  </Button>
                </View>
                <Textarea
                  value={coachNotes}
                  onChangeText={setCoachNotes}
                  placeholder="Optional comments…"
                  numberOfLines={3}
                />
              </View>

              <Button
                onPress={() => saveScore.mutate()}
                disabled={saveScore.isPending || !scoreInput.trim()}
                style={{ marginTop: spacing.sm }}>
                {saveScore.isPending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Save size={14} color={colors.primaryForeground} />
                    <Text style={styles.saveText}> Save score</Text>
                  </>
                )}
              </Button>

              <Text style={styles.footnote}>
                Scores feed the live leaderboard within ~15 seconds.
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    gap: 12,
  },
  muted: { color: colors.mutedForeground, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, color: colors.foreground, fontWeight: '700' },
  subtitle: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  modeBadge: { flexDirection: 'row', alignItems: 'center' },
  modeBadgeText: { fontSize: 11, color: colors.foreground },
  scroll: { padding: 16, paddingBottom: 96, gap: spacing.md },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: 10, top: 12, zIndex: 1 },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.secondary,
    marginBottom: 6,
  },
  athleteLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  jersey: {
    width: 28,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.foreground,
  },
  athleteId: { fontSize: 12, color: colors.foreground, flexShrink: 1 },
  posBadge: { paddingHorizontal: 6, paddingVertical: 1 },
  posBadgeText: { fontSize: 10, color: colors.foreground },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  field: { marginTop: spacing.sm, gap: 6 },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveText: { color: colors.primaryForeground, fontWeight: '600' },
  footnote: {
    fontSize: 11,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
