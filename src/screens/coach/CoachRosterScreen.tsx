// CoachRosterScreen — full recruiting pipeline Kanban board for coaches.
// Fetches recruiting_pipeline_stages + athlete_pipeline_status (joined to
// player_profiles), groups athletes by stage, lets coaches move athletes
// between stages, search & add athletes to the pipeline.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Search, X, Plus, ChevronRight } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

const DEFAULT_STAGES = [
  { name: 'Identified', color: '#808897', display_order: 1 },
  { name: 'Contacted', color: '#0da2e7', display_order: 2 },
  { name: 'Offered', color: '#e7af08', display_order: 3 },
  { name: 'Committed', color: '#16a149', display_order: 4 },
  { name: 'Signed', color: '#22c55e', display_order: 5 },
  { name: 'Declined', color: '#dc2828', display_order: 6 },
];

interface Stage {
  id: string;
  coach_user_id: string;
  name: string;
  color: string | null;
  display_order: number;
}

interface PlayerProfile {
  id: string;
  full_name: string | null;
  position: string | null;
  school: string | null;
  graduation_year: number | null;
  profile_image_url?: string | null;
}

interface PipelineEntry {
  id: string;
  coach_user_id: string;
  athlete_profile_id: string;
  stage_id: string;
  notes?: string | null;
  player_profiles?: PlayerProfile | null;
}

export default function CoachRosterScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const [showAddModal, setShowAddModal] = useState(false);

  // Stages query, with auto-seed of defaults when missing.
  const stagesQuery = useQuery<Stage[]>({
    queryKey: ['recruiting-pipeline-stages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('recruiting_pipeline_stages' as any)
        .select('*')
        .eq('coach_user_id', user.id)
        .order('display_order');
      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed defaults
        const rows = DEFAULT_STAGES.map(s => ({ ...s, coach_user_id: user.id }));
        const { data: inserted, error: insertErr } = await supabase
          .from('recruiting_pipeline_stages' as any)
          .insert(rows)
          .select();
        if (insertErr) {
          // Fall back to in-memory defaults if insert blocked.
          return rows.map((r, i) => ({ id: `default-${i}`, ...r })) as any;
        }
        return (inserted || []) as any;
      }
      return data as any;
    },
    enabled: !!user,
  });

  // Athletes query (pipeline entries joined to player profiles).
  const athletesQuery = useQuery<PipelineEntry[]>({
    queryKey: ['recruiting-pipeline-athletes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('athlete_pipeline_status' as any)
        .select('*, player_profiles:athlete_profile_id(id, full_name, position, school, graduation_year, profile_image_url)')
        .eq('coach_user_id', user.id);
      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!user,
  });

  const moveAthlete = useMutation({
    mutationFn: async ({ athleteRowId, newStageId }: { athleteRowId: string; newStageId: string }) => {
      const { error } = await supabase
        .from('athlete_pipeline_status' as any)
        .update({ stage_id: newStageId })
        .eq('id', athleteRowId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting-pipeline-athletes'] });
      Toast.show({ type: 'success', text1: 'Athlete moved' });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: 'Move failed', text2: e?.message ?? '' });
    },
  });

  const addAthlete = useMutation({
    mutationFn: async ({ athleteProfileId }: { athleteProfileId: string }) => {
      if (!user) throw new Error('Not signed in');
      const stages = stagesQuery.data ?? [];
      const firstStage = stages[0];
      if (!firstStage) throw new Error('No pipeline stages available');
      const { error } = await supabase
        .from('athlete_pipeline_status' as any)
        .insert({
          coach_user_id: user.id,
          athlete_profile_id: athleteProfileId,
          stage_id: firstStage.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting-pipeline-athletes'] });
      Toast.show({ type: 'success', text1: 'Athlete added to pipeline' });
      setShowAddModal(false);
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: 'Add failed', text2: e?.message ?? '' });
    },
  });

  const stages = stagesQuery.data ?? [];
  const athletes = athletesQuery.data ?? [];
  const isLoading = stagesQuery.isLoading || athletesQuery.isLoading;
  const error = stagesQuery.error || athletesQuery.error;

  const grouped = useMemo(
    () => stages.map(stage => ({
      stage,
      entries: athletes.filter(a => a.stage_id === stage.id),
    })),
    [stages, athletes],
  );

  const openAthleteProfile = (athleteProfileId: string) => {
    (nav as any).navigate('PublicProfileStack', { screen: 'PublicProfile', params: { profileId: athleteProfileId } });
  };

  const goToSearch = () => {
    (nav as any).navigate('AthleteSearch');
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Recruiting Pipeline</Text>
          <Text style={s.subtitle}>{athletes.length} athletes · {stages.length} stages</Text>
        </View>
        <Button size="sm" onPress={() => setShowAddModal(true)} leftIcon={<Plus size={16} color={colors.primaryForeground} />}>
          Add Athlete
        </Button>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>Failed to load pipeline.</Text>
          <Text style={s.errorSub}>{(error as any)?.message ?? 'Unknown error'}</Text>
          <Button variant="outline" size="sm" onPress={() => { stagesQuery.refetch(); athletesQuery.refetch(); }} style={{ marginTop: spacing.md }}>
            Retry
          </Button>
        </View>
      ) : athletes.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No athletes in pipeline yet</Text>
          <Text style={s.emptyText}>Search athletes to start building your board.</Text>
          <Button onPress={goToSearch} style={{ marginTop: spacing.md }} leftIcon={<Search size={16} color={colors.primaryForeground} />}>
            Search Athletes
          </Button>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.board}>
          {grouped.map(({ stage, entries }) => (
            <View key={stage.id} style={s.column}>
              <View style={s.colHeader}>
                <View style={s.colTitleRow}>
                  <View style={[s.colDot, { backgroundColor: stage.color || colors.mutedForeground }]} />
                  <Text style={s.colTitle} numberOfLines={1}>{stage.name}</Text>
                </View>
                <Badge variant="secondary">{String(entries.length)}</Badge>
              </View>
              <View style={s.colList}>
                {entries.length === 0 ? (
                  <Text style={s.colEmpty}>No athletes</Text>
                ) : (
                  entries.map(entry => {
                    const profile = entry.player_profiles;
                    const initial = (profile?.full_name ?? 'A').charAt(0).toUpperCase();
                    return (
                      <Card key={entry.id} style={s.entryCard}>
                        <Pressable onPress={() => openAthleteProfile(entry.athlete_profile_id)} style={s.entryHead}>
                          <View style={s.avatar}>
                            <Text style={s.avatarText}>{initial}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.athleteName} numberOfLines={1}>
                              {profile?.full_name ?? 'Unknown'}
                            </Text>
                            <Text style={s.athleteMeta} numberOfLines={1}>
                              {[profile?.position, profile?.graduation_year ? `'${String(profile.graduation_year).slice(-2)}` : null]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </Text>
                            {profile?.school ? (
                              <Text style={s.athleteSchool} numberOfLines={1}>{profile.school}</Text>
                            ) : null}
                          </View>
                          <ChevronRight size={16} color={colors.mutedForeground} />
                        </Pressable>
                        <Select
                          value={entry.stage_id}
                          onValueChange={(newStageId) => {
                            if (newStageId !== entry.stage_id) {
                              moveAthlete.mutate({ athleteRowId: entry.id, newStageId });
                            }
                          }}
                        >
                          <SelectTrigger style={s.selectTrigger}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map(st => (
                              <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Card>
                    );
                  })
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <AddAthleteModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        existingProfileIds={athletes.map(a => a.athlete_profile_id)}
        onSelect={(profileId) => addAthlete.mutate({ athleteProfileId: profileId })}
        loading={addAthlete.isPending}
      />
    </SafeAreaView>
  );
}

// ---------- Add Athlete Modal ----------

interface AddModalProps {
  visible: boolean;
  onClose: () => void;
  existingProfileIds: string[];
  onSelect: (profileId: string) => void;
  loading: boolean;
}

function AddAthleteModal({ visible, onClose, existingProfileIds, onSelect, loading }: AddModalProps) {
  const [query, setQuery] = useState('');

  const searchQuery = useQuery<PlayerProfile[]>({
    queryKey: ['athlete-search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data, error } = await supabase
        .from('player_profiles' as any)
        .select('id, full_name, position, school, graduation_year, profile_image_url')
        .ilike('full_name', `%${query.trim()}%`)
        .limit(20);
      if (error) throw error;
      return (data || []) as any;
    },
    enabled: visible && query.trim().length >= 2,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add Athlete</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={s.searchRow}>
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search athletes by name…"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              style={s.searchInput}
            />
          </View>
          {searchQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
          ) : (
            <FlatList
              data={searchQuery.data ?? []}
              keyExtractor={p => p.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                query.trim().length < 2 ? (
                  <Text style={s.modalHint}>Type at least 2 characters to search.</Text>
                ) : (
                  <Text style={s.modalHint}>No athletes found for “{query}”.</Text>
                )
              }
              renderItem={({ item }) => {
                const inPipeline = existingProfileIds.includes(item.id);
                return (
                  <Pressable
                    disabled={inPipeline || loading}
                    onPress={() => onSelect(item.id)}
                    style={({ pressed }) => [s.resultRow, pressed && { opacity: 0.6 }]}
                  >
                    <View style={s.avatarSm}>
                      <Text style={s.avatarText}>{(item.full_name ?? 'A').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.athleteName} numberOfLines={1}>{item.full_name ?? 'Unknown'}</Text>
                      <Text style={s.athleteMeta} numberOfLines={1}>
                        {[item.position, item.school, item.graduation_year].filter(Boolean).join(' · ') || '—'}
                      </Text>
                    </View>
                    {inPipeline ? (
                      <Badge variant="secondary">Added</Badge>
                    ) : (
                      <Plus size={18} color={colors.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xs },
  errorText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.destructive },
  errorSub: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xs },
  emptyTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },

  board: { gap: spacing.md, padding: spacing.md },
  column: {
    width: 280,
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.sm,
    minHeight: 200,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  colTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1, minWidth: 0 },
  colDot: { width: 10, height: 10, borderRadius: 999 },
  colTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colList: { gap: spacing.xs },
  colEmpty: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    padding: spacing.md,
  },

  entryCard: { padding: spacing.sm, gap: spacing.xs },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 999,
    backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  avatarSm: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  athleteName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  athleteMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  athleteSchool: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  selectTrigger: { height: 32 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: colors.overlayStrong, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.md,
    maxHeight: '80%',
    minHeight: 320,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  modalHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    padding: spacing.md,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
