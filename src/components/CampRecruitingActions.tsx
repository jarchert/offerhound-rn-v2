// Ported verbatim from Lovable src/components/CampRecruitingActions.tsx
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - useToast hook → @/components/ui/toast (toast() function)
//   - input onChange(e.target.value) → onChangeText(text)
//   - window.open(url, "_blank") → Linking.openURL(absoluteUrl) — uses
//     EXPO_PUBLIC_WEB_BASE_URL env (fallback https://offerhound.app) so the
//     coach gets sent to the public web profile page from the native app.
//   - Hover/transition/responsive utility classes are no-ops in RN
//   - Pressable wraps the row to retain the existing tap-to-expand behavior
//   - Filter sheet stays inline (no overflow popovers in RN)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Progress } from '@/components/ui/Progress';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Search,
  Filter,
  UserPlus,
  Tag,
  Trophy,
  Star,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  Bookmark,
  TrendingUp,
  Target,
  Zap,
  Wind,
} from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface CampRecruitingActionsProps {
  campId: string;
  campName: string;
  onBack: () => void;
}

type TagType = 'offer_watch' | 'priority' | 'sleeper' | 'developmental' | 'top_performer';

const TAG_CONFIG: Record<TagType, { label: string; bg: string; fg: string }> = {
  offer_watch: { label: 'Offer Watch', bg: colors.primary, fg: colors.primaryForeground },
  priority: { label: 'Priority', bg: colors.destructive, fg: colors.destructiveForeground },
  sleeper: { label: 'Sleeper', bg: colors.accent, fg: colors.accentForeground },
  developmental: { label: 'Developmental', bg: colors.secondary, fg: colors.secondaryForeground },
  top_performer: { label: 'Top Performer', bg: colors.primary, fg: colors.primaryForeground },
};

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_BASE_URL || 'https://offerhound.app';

export function CampRecruitingActions({ campId, campName, onBack }: CampRecruitingActionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [scoreMin, setScoreMin] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pipelineDialog, setPipelineDialog] = useState<{ athleteId: string; name: string } | null>(null);
  const [pipelineNote, setPipelineNote] = useState('');
  const [pipelinePriority, setPipelinePriority] = useState('medium');
  const [selectedStage, setSelectedStage] = useState('');
  const [tagDialog, setTagDialog] = useState<{ athleteId: string; name: string } | null>(null);

  // Fetch AI scores with athlete profiles
  const { data: scores = [], isLoading } = useQuery({
    queryKey: ['camp-recruiting-scores', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_ai_scores')
        .select('*')
        .eq('camp_id', campId)
        .order('ai_rank', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const athleteIds = scores.map((s: any) => s.athlete_profile_id).filter(Boolean);

  const { data: athletes = [] } = useQuery({
    queryKey: ['camp-recruit-athletes', athleteIds],
    queryFn: async () => {
      if (athleteIds.length === 0) return [];
      const { data } = await supabase
        .from('player_profiles')
        .select('id, full_name, position, graduation_year, city, state, school')
        .in('id', athleteIds);
      return data || [];
    },
    enabled: athleteIds.length > 0,
  });

  // Fetch pipeline stages
  const { data: stages = [] } = useQuery({
    queryKey: ['recruiting-stages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('recruiting_pipeline_stages')
        .select('*')
        .eq('coach_user_id', user.id)
        .order('display_order');
      return data || [];
    },
    enabled: !!user,
  });

  // Check which athletes are already in pipeline
  const { data: pipelineEntries = [] } = useQuery({
    queryKey: ['pipeline-entries-camp', user?.id, athleteIds],
    queryFn: async () => {
      if (!user || athleteIds.length === 0) return [];
      const { data } = await supabase
        .from('athlete_pipeline_status')
        .select('athlete_profile_id, stage_id')
        .eq('coach_user_id', user.id)
        .in('athlete_profile_id', athleteIds);
      return data || [];
    },
    enabled: !!user && athleteIds.length > 0,
  });

  // Fetch existing tags from coach_activity_log
  const { data: activityTags = [] } = useQuery({
    queryKey: ['camp-athlete-tags', campId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('coach_activity_log')
        .select('*')
        .eq('coach_user_id', user.id)
        .eq('activity_type', 'camp_tag')
        .in('athlete_profile_id', athleteIds);
      return data || [];
    },
    enabled: !!user && athleteIds.length > 0,
  });

  // Save to pipeline mutation
  const saveToPipeline = useMutation({
    mutationFn: async ({ athleteId, stageId, notes, priority }: { athleteId: string; stageId: string; notes: string; priority: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('athlete_pipeline_status').upsert({
        coach_user_id: user.id,
        athlete_profile_id: athleteId,
        stage_id: stageId,
        notes,
        priority,
      }, { onConflict: 'coach_user_id,athlete_profile_id' });
      if (error) throw error;

      // Log activity
      await supabase.from('coach_activity_log').insert({
        coach_user_id: user.id,
        athlete_profile_id: athleteId,
        activity_type: 'added_from_camp',
        details: { camp_id: campId, camp_name: campName, stage_id: stageId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-entries-camp'] });
      toast.success('Added to Pipeline', 'Athlete saved to your recruiting board.');
      setPipelineDialog(null);
      setPipelineNote('');
    },
    onError: (err: Error) => {
      toast.error('Error', err.message);
    },
  });

  // Tag athlete mutation
  const tagAthlete = useMutation({
    mutationFn: async ({ athleteId, tag }: { athleteId: string; tag: TagType }) => {
      if (!user) throw new Error('Not authenticated');
      await supabase.from('coach_activity_log').insert({
        coach_user_id: user.id,
        athlete_profile_id: athleteId,
        activity_type: 'camp_tag',
        details: { camp_id: campId, tag },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-athlete-tags'] });
      toast.success('Tag Applied');
      setTagDialog(null);
    },
  });

  const getAthlete = (id: string | null) => {
    if (!id) return null;
    return athletes.find((a: any) => a.id === id);
  };

  const isInPipeline = (athleteId: string) =>
    pipelineEntries.some((e: any) => e.athlete_profile_id === athleteId);

  const getAthleteTag = (athleteId: string) => {
    const entry = activityTags.find((t: any) => t.athlete_profile_id === athleteId);
    return entry ? ((entry.details as any)?.tag as TagType) : null;
  };

  // Get unique positions for filter
  const positions = [...new Set(athletes.map((a: any) => a.position).filter(Boolean))] as string[];

  // Filter scores
  const filtered = scores.filter((s: any) => {
    const athlete = getAthlete(s.athlete_profile_id);
    if (search && athlete && !athlete.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (positionFilter !== 'all' && athlete?.position !== positionFilter) return false;
    if (scoreMin && Number(s.composite_score) < Number(scoreMin)) return false;
    return true;
  });

  const scoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.destructive;
  };

  const openProfile = (athleteId: string) => {
    Linking.openURL(`${WEB_BASE}/p/${athleteId}`).catch(() => {
      toast.error('Could not open profile');
    });
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.rootContent}>
      {/* Header */}
      <View style={s.headerRow}>
        <Button variant="ghost" size="sm" onPress={onBack}>
          <View style={s.iconTextRow}>
            <ArrowLeft width={16} height={16} color={colors.foreground} />
            <Text style={s.btnGhostText}>Back</Text>
          </View>
        </Button>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Target width={20} height={20} color={colors.primary} />
            <Text style={s.h2}>Recruiting Actions — {campName}</Text>
          </View>
          <Text style={s.muted}>Review scored athletes, tag prospects, and add to your pipeline</Text>
        </View>
      </View>

      {/* Filters */}
      <Card>
        <CardContent style={s.filterCardContent}>
          <View style={s.filterRow}>
            <View style={s.searchWrap}>
              <View style={s.searchIcon} pointerEvents="none">
                <Search width={16} height={16} color={colors.mutedForeground} />
              </View>
              <Input
                placeholder="Search athletes..."
                value={search}
                onChangeText={setSearch}
                style={s.searchInput}
              />
            </View>
            <View style={s.selectWrap}>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger>
                  <View style={s.iconTextRow}>
                    <Filter width={12} height={12} color={colors.foreground} />
                    <SelectValue placeholder="Position" />
                  </View>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {positions.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={s.minScoreWrap}>
              <Input
                keyboardType="numeric"
                placeholder="Min score"
                value={scoreMin}
                onChangeText={setScoreMin}
              />
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Summary */}
      <View style={s.summaryGrid}>
        <Card style={s.summaryCard}>
          <CardContent style={s.summaryContent}>
            <Text style={s.summaryValue}>{filtered.length}</Text>
            <Text style={s.summaryLabel}>Athletes</Text>
          </CardContent>
        </Card>
        <Card style={s.summaryCard}>
          <CardContent style={s.summaryContent}>
            <Text style={s.summaryValue}>{filtered.filter((s2: any) => Number(s2.composite_score) >= 80).length}</Text>
            <Text style={s.summaryLabel}>Elite (80+)</Text>
          </CardContent>
        </Card>
        <Card style={s.summaryCard}>
          <CardContent style={s.summaryContent}>
            <Text style={s.summaryValue}>{pipelineEntries.length}</Text>
            <Text style={s.summaryLabel}>In Pipeline</Text>
          </CardContent>
        </Card>
        <Card style={s.summaryCard}>
          <CardContent style={s.summaryContent}>
            <Text style={s.summaryValue}>{activityTags.length}</Text>
            <Text style={s.summaryLabel}>Tagged</Text>
          </CardContent>
        </Card>
      </View>

      {/* Athlete List */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.mutedForeground} />
        </View>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent style={s.emptyContent}>
            <Target width={48} height={48} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>No Scored Athletes</Text>
            <Text style={s.muted}>Run AI Scoring first to generate the recruiting list.</Text>
          </CardContent>
        </Card>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {filtered.map((score: any) => {
            const athlete = getAthlete(score.athlete_profile_id);
            const expanded = expandedId === score.id;
            const inPipeline = score.athlete_profile_id && isInPipeline(score.athlete_profile_id);
            const tag = score.athlete_profile_id ? getAthleteTag(score.athlete_profile_id) : null;
            const composite = Number(score.composite_score);

            return (
              <Card key={score.id}>
                <CardContent style={s.athleteCardContent}>
                  <Pressable
                    style={s.athleteHeaderRow}
                    onPress={() => setExpandedId(expanded ? null : score.id)}
                  >
                    {/* Rank */}
                    <View style={s.rankCell}>
                      {score.ai_rank <= 3 ? (
                        <Badge variant="default">
                          <View style={s.rankBadgeInner}>
                            {score.ai_rank === 1 ? (
                              <Trophy width={12} height={12} color={colors.primaryForeground} />
                            ) : null}
                            <Text style={s.rankBadgeText}>#{score.ai_rank}</Text>
                          </View>
                        </Badge>
                      ) : (
                        <Text style={s.rankPlain}>#{score.ai_rank}</Text>
                      )}
                    </View>

                    {/* Info */}
                    <View style={s.athleteInfo}>
                      <Text style={s.athleteName} numberOfLines={1}>
                        {athlete?.full_name || 'Unknown'}
                      </Text>
                      <View style={s.athleteMetaRow}>
                        {athlete?.position ? (
                          <Badge variant="outline">{athlete.position}</Badge>
                        ) : null}
                        {athlete?.graduation_year ? (
                          <Text style={s.metaText}>Class of {athlete.graduation_year}</Text>
                        ) : null}
                        {athlete?.city && athlete?.state ? (
                          <Text style={s.metaText}>· {athlete.city}, {athlete.state}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Tags & Status */}
                    <View style={s.statusCol}>
                      {tag ? (
                        <View style={[s.customTagBadge, { backgroundColor: TAG_CONFIG[tag]?.bg }]}>
                          <Text style={[s.customTagText, { color: TAG_CONFIG[tag]?.fg }]}>
                            {TAG_CONFIG[tag]?.label}
                          </Text>
                        </View>
                      ) : null}
                      {inPipeline ? (
                        <Badge variant="secondary">
                          <View style={s.iconTextRow}>
                            <Bookmark width={12} height={12} color={colors.secondaryForeground} />
                            <Text style={s.pipelineBadgeText}>Pipeline</Text>
                          </View>
                        </Badge>
                      ) : null}
                    </View>

                    {/* Score */}
                    <Text style={[s.compositeScore, { color: scoreColor(composite) }]}>
                      {composite.toFixed(0)}
                    </Text>
                    {expanded ? (
                      <ChevronUp width={16} height={16} color={colors.foreground} />
                    ) : (
                      <ChevronDown width={16} height={16} color={colors.foreground} />
                    )}
                  </Pressable>

                  {expanded ? (
                    <View style={s.expandedWrap}>
                      {/* Score breakdown */}
                      <View style={s.breakdownGrid}>
                        {[
                          { label: 'Speed', value: score.speed_score, Icon: Wind },
                          { label: 'Agility', value: score.agility_score, Icon: TrendingUp },
                          { label: 'Explosiveness', value: score.explosiveness_score, Icon: Zap },
                          { label: 'Position', value: score.position_score, Icon: Target },
                        ].map(({ label, value, Icon }) => (
                          <View key={label} style={s.breakdownItem}>
                            <View style={s.breakdownLabelRow}>
                              <Icon width={12} height={12} color={colors.mutedForeground} />
                              <Text style={s.breakdownLabel}>{label}</Text>
                            </View>
                            <Progress value={Number(value)} />
                            <Text style={s.breakdownValue}>{Number(value).toFixed(0)}/100</Text>
                          </View>
                        ))}
                      </View>

                      {/* AI Summary */}
                      {score.ai_summary ? (
                        <View style={s.aiSummaryBox}>
                          <Text style={s.aiSummaryLabel}>AI Scouting Report</Text>
                          <Text style={s.aiSummaryText}>{score.ai_summary}</Text>
                        </View>
                      ) : null}

                      {/* Actions */}
                      <View style={s.actionsRow}>
                        {score.athlete_profile_id && !inPipeline ? (
                          <Button
                            size="sm"
                            onPress={() => {
                              setPipelineDialog({
                                athleteId: score.athlete_profile_id,
                                name: athlete?.full_name || 'Athlete',
                              });
                              if (stages.length > 0) setSelectedStage((stages[0] as any).id);
                            }}
                          >
                            <View style={s.iconTextRow}>
                              <UserPlus width={12} height={12} color={colors.primaryForeground} />
                              <Text style={s.btnPrimaryText}>Add to Pipeline</Text>
                            </View>
                          </Button>
                        ) : null}
                        {score.athlete_profile_id && inPipeline ? (
                          <Button size="sm" variant="secondary" disabled>
                            <View style={s.iconTextRow}>
                              <Bookmark width={12} height={12} color={colors.secondaryForeground} />
                              <Text style={s.btnSecondaryText}>Already in Pipeline</Text>
                            </View>
                          </Button>
                        ) : null}
                        {score.athlete_profile_id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onPress={() =>
                              setTagDialog({
                                athleteId: score.athlete_profile_id,
                                name: athlete?.full_name || 'Athlete',
                              })
                            }
                          >
                            <View style={s.iconTextRow}>
                              <Tag width={12} height={12} color={colors.foreground} />
                              <Text style={s.btnOutlineText}>Tag</Text>
                            </View>
                          </Button>
                        ) : null}
                        {score.athlete_profile_id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onPress={() => openProfile(score.athlete_profile_id)}
                          >
                            <View style={s.iconTextRow}>
                              <Eye width={12} height={12} color={colors.foreground} />
                              <Text style={s.btnOutlineText}>View Profile</Text>
                            </View>
                          </Button>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </View>
      )}

      {/* Add to Pipeline Dialog */}
      <Dialog open={!!pipelineDialog} onOpenChange={(v) => { if (!v) setPipelineDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Recruiting Pipeline</DialogTitle>
            <DialogDescription>
              Save {pipelineDialog?.name} to your recruiting board
            </DialogDescription>
          </DialogHeader>
          <View style={s.dialogBody}>
            <View style={s.fieldGroup}>
              <Label>Pipeline Stage</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((st: any) => (
                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={s.fieldGroup}>
              <Label>Priority</Label>
              <Select value={pipelinePriority} onValueChange={setPipelinePriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </View>
            <View style={s.fieldGroup}>
              <Label>Notes</Label>
              <Textarea
                value={pipelineNote}
                onChangeText={setPipelineNote}
                placeholder="Camp notes, observations..."
              />
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setPipelineDialog(null)}>
              Cancel
            </Button>
            <Button
              onPress={() => {
                if (!pipelineDialog || !selectedStage) return;
                saveToPipeline.mutate({
                  athleteId: pipelineDialog.athleteId,
                  stageId: selectedStage,
                  notes: pipelineNote,
                  priority: pipelinePriority,
                });
              }}
              disabled={saveToPipeline.isPending || !selectedStage}
            >
              <View style={s.iconTextRow}>
                {saveToPipeline.isPending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <UserPlus width={16} height={16} color={colors.primaryForeground} />
                )}
                <Text style={s.btnPrimaryText}>Add to Pipeline</Text>
              </View>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={!!tagDialog} onOpenChange={(v) => { if (!v) setTagDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tag {tagDialog?.name}</DialogTitle>
            <DialogDescription>Apply a recruiting tag to this athlete</DialogDescription>
          </DialogHeader>
          <View style={s.tagGrid}>
            {(Object.entries(TAG_CONFIG) as [TagType, { label: string; bg: string; fg: string }][]).map(([key, config]) => (
              <View key={key} style={s.tagBtnWrap}>
                <Button
                  variant="outline"
                  onPress={() => {
                    if (!tagDialog) return;
                    tagAthlete.mutate({ athleteId: tagDialog.athleteId, tag: key });
                  }}
                >
                  <View style={s.iconTextRow}>
                    <Star width={12} height={12} color={colors.foreground} />
                    <Text style={s.btnOutlineText}>{config.label}</Text>
                  </View>
                </Button>
              </View>
            ))}
          </View>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}

export default CampRecruitingActions;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  rootContent: { padding: spacing.md, gap: spacing.md },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  h2: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    flexShrink: 1,
  },
  muted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  iconTextRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnGhostText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  btnPrimaryText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primaryForeground,
  },
  btnSecondaryText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.secondaryForeground,
  },
  btnOutlineText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },

  // Filter bar
  filterCardContent: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  searchWrap: { flex: 1, minWidth: 200, position: 'relative' },
  searchIcon: { position: 'absolute', left: spacing.sm, top: 0, bottom: 0, justifyContent: 'center', zIndex: 2 },
  searchInput: { paddingLeft: spacing.lg + spacing.xs },
  selectWrap: { width: 150 },
  minScoreWrap: { width: 120 },

  // Summary grid
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryCard: {
    flexBasis: Platform.select({ default: '47%' }),
    flexGrow: 1,
    minWidth: 130,
  },
  summaryContent: { paddingVertical: spacing.md, alignItems: 'center' },
  summaryValue: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
  },
  summaryLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },

  // Loading / empty
  loadingWrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyContent: { paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },

  // Athlete card
  athleteCardContent: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  athleteHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rankCell: { width: 40, alignItems: 'center' },
  rankBadgeInner: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rankBadgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.primaryForeground,
  },
  rankPlain: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  athleteInfo: { flex: 1, minWidth: 0 },
  athleteName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  athleteMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  statusCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pipelineBadgeText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.secondaryForeground,
  },
  customTagBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  customTagText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
  },
  compositeScore: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    minWidth: 40,
    textAlign: 'right',
  },

  // Expanded
  expandedWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  breakdownItem: { flexBasis: '47%', flexGrow: 1, minWidth: 130, gap: 4 },
  breakdownLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breakdownLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  breakdownValue: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
    marginTop: 2,
  },
  aiSummaryBox: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  aiSummaryLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  aiSummaryText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },

  // Dialog
  dialogBody: { gap: spacing.md, paddingVertical: spacing.sm },
  fieldGroup: { gap: spacing.xs },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingVertical: spacing.sm },
  tagBtnWrap: { flexBasis: '48%', flexGrow: 1 },
});
