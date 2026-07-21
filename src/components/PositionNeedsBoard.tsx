// RN port of Lovable src/components/PositionNeedsBoard.tsx.
//
// Web→RN mapping:
//   - <div>/<span>/<h*>/<p>       → <View>/<Text>
//   - Tailwind className          → StyleSheet
//   - lucide-react                → lucide-react-native
//   - react-router-dom useNavigate → @react-navigation/native useNavigation
//   - shadcn Card/Badge/Button/Input/Label/Select/Dialog/Progress → @/components/ui/*
//   - `useToast()` (shadcn)       → `toast` (react-native-toast-message wrapper)
//
// Behavior preserved verbatim:
//   * Reads `position_needs` filtered by coach_user_id, ordered priority desc.
//   * Adds via mutation with default filled_count=0.
//   * Deletes via mutation.
//   * "Find Prospects" navigates to the athletes/scouts screen with the same
//     seeded params (position, gradYear, fromNeed, needPriority). Web used
//     `/athletes?...`; RN uses `Athletes` root screen (or the coach's
//     `AthletesTab`, if it exists) — fall back to `AthletesTab` inside
//     `CoachTabs`.
//   * Progress bar shows filled_count/target_count percentage.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Target, Trash2, Search } from 'lucide-react-native';
import {
  Card,
  CardContent,
} from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
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
  DialogFooter,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Progress } from '@/components/ui/Progress';
import { toast } from '@/components/ui/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getPositionsForSport } from '@/lib/data/sportPositions';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface PositionNeed {
  id: string;
  position: string;
  class_year: string;
  target_count: number;
  filled_count: number;
  priority: 'high' | 'medium' | 'low' | string;
}

interface NewNeed {
  position: string;
  class_year: string;
  target_count: number;
  priority: string;
}

const priorityToVariant = (p: string): BadgeVariant =>
  p === 'high' ? 'destructive' : p === 'low' ? 'outline' : 'secondary';

export const PositionNeedsBoard = ({ sport = 'football' }: { sport?: string }) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNeed, setNewNeed] = useState<NewNeed>({
    position: '',
    class_year: '2026',
    target_count: 1,
    priority: 'medium',
  });

  const { data: needs = [], isLoading } = useQuery<PositionNeed[]>({
    queryKey: ['position-needs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('position_needs')
        .select('*')
        .eq('coach_user_id', user.id)
        .order('priority', { ascending: false });
      if (error) throw error;
      return (data || []) as PositionNeed[];
    },
    enabled: !!user,
  });

  const addNeed = useMutation({
    mutationFn: async (need: NewNeed) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('position_needs').insert({
        coach_user_id: user.id,
        position: need.position,
        class_year: need.class_year,
        target_count: need.target_count,
        priority: need.priority,
        filled_count: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position-needs'] });
      setShowAddDialog(false);
      setNewNeed({ position: '', class_year: '2026', target_count: 1, priority: 'medium' });
      toast.success('Position need added');
    },
    onError: (err: any) => {
      toast.error('Failed to add', err?.message || 'Please try again');
    },
  });

  const deleteNeed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('position_needs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position-needs'] });
      toast.success('Position need removed');
    },
    onError: (err: any) => {
      toast.error('Failed to remove', err?.message || 'Please try again');
    },
  });

  const handleFindProspects = (need: PositionNeed) => {
    // Web: navigate(`/athletes?position=...&gradYear=...&fromNeed=true&needPriority=...`)
    // RN routing:
    //   - Coach: no dedicated athlete tab; jump to root-level AthleteSearch if the
    //     stack exposes it, otherwise the coach Pipeline tab.
    //   - HS coach: SearchTab is the athletes surface.
    //   - Scout / Agency: SearchTab.
    const params = {
      position: need.position,
      gradYear: need.class_year,
      fromNeed: 'true',
      needPriority: need.priority || 'medium',
    };
    try {
      navigation.navigate('HSCoachTabs', { screen: 'SearchTab', params });
      return;
    } catch {}
    try {
      navigation.navigate('CoachTabs', { screen: 'PipelineTab', params });
      return;
    } catch {}
    try {
      navigation.navigate('ScoutTabs', { screen: 'SearchTab', params });
      return;
    } catch {}
    navigation.navigate('AthleteSearch' as never, params as never);
  };

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.mutedForeground} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <View style={s.headerTitle}>
          <Target size={20} color={colors.primary} />
          <Text style={s.headerText}>Position Needs</Text>
        </View>
        <Button
          size="sm"
          onPress={() => setShowAddDialog(true)}
          leftIcon={<Plus size={14} color={colors.primaryForeground} />}
        >
          Add Need
        </Button>
      </View>

      {needs.length === 0 ? (
        <Card>
          <CardContent style={s.emptyContent}>
            <Target size={48} color={colors.mutedForeground} style={{ marginBottom: spacing.sm }} />
            <Text style={s.emptyTitle}>No Position Needs Set</Text>
            <Text style={s.emptyBody}>
              Define the positions you need to recruit for each class year.
            </Text>
            <Button
              onPress={() => setShowAddDialog(true)}
              leftIcon={<Plus size={14} color={colors.primaryForeground} />}
            >
              Add First Position Need
            </Button>
          </CardContent>
        </Card>
      ) : (
        <View style={s.grid}>
          {needs.map((need) => {
            const pct =
              need.target_count > 0
                ? Math.round((need.filled_count / need.target_count) * 100)
                : 0;
            return (
              <View key={need.id} style={s.gridCell}>
                <Card>
                  <CardContent style={s.needCardContent}>
                    <View style={s.needHeader}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.needPosition} numberOfLines={1}>
                          {need.position}
                        </Text>
                        <Text style={s.needClass}>Class of {need.class_year}</Text>
                      </View>
                      <View style={s.needHeaderRight}>
                        <Badge variant={priorityToVariant(need.priority)}>
                          {need.priority}
                        </Badge>
                        <Pressable
                          onPress={() => deleteNeed.mutate(need.id)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Delete position need"
                          style={s.trashBtn}
                          disabled={deleteNeed.isPending}
                        >
                          <Trash2 size={14} color={colors.mutedForeground} />
                        </Pressable>
                      </View>
                    </View>

                    <View style={s.progressBlock}>
                      <View style={s.progressRow}>
                        <Text style={s.progressText}>
                          {need.filled_count} / {need.target_count} filled
                        </Text>
                        <Text style={s.progressText}>{pct}%</Text>
                      </View>
                      <Progress value={pct} style={s.progressBar} />
                    </View>

                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => handleFindProspects(need)}
                      leftIcon={<Search size={12} color={colors.foreground} />}
                    >
                      Find {need.position} Prospects
                    </Button>
                  </CardContent>
                </Card>
              </View>
            );
          })}
        </View>
      )}

      {/* Add Need Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Position Need</DialogTitle>
          </DialogHeader>

          <View style={s.formCol}>
            <View style={s.formField}>
              <Label>Position</Label>
              <Select
                value={newNeed.position}
                onValueChange={(v) => setNewNeed({ ...newNeed, position: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {getPositionsForSport(sport).map((p) => (
                    <SelectItem key={p.label} value={p.label}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>

            <View style={s.formRow}>
              <View style={[s.formField, { flex: 1 }]}>
                <Label>Class Year</Label>
                <Select
                  value={newNeed.class_year}
                  onValueChange={(v) => setNewNeed({ ...newNeed, class_year: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['2025', '2026', '2027', '2028', '2029'].map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
              <View style={[s.formField, { flex: 1 }]}>
                <Label>Target Count</Label>
                <Input
                  keyboardType="number-pad"
                  value={String(newNeed.target_count)}
                  onChangeText={(v) =>
                    setNewNeed({
                      ...newNeed,
                      target_count: Math.max(1, Math.min(20, parseInt(v || '0', 10) || 1)),
                    })
                  }
                />
              </View>
            </View>

            <View style={s.formField}>
              <Label>Priority</Label>
              <Select
                value={newNeed.priority}
                onValueChange={(v) => setNewNeed({ ...newNeed, priority: v })}
              >
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
          </View>

          <DialogFooter>
            <Button variant="outline" onPress={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onPress={() => addNeed.mutate(newNeed)}
              disabled={!newNeed.position || addNeed.isPending}
              loading={addNeed.isPending}
              leftIcon={
                addNeed.isPending ? null : (
                  <Plus size={14} color={colors.primaryForeground} />
                )
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default PositionNeedsBoard;

const s = StyleSheet.create({
  container: { gap: spacing.md },
  loading: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  headerText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },

  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridCell: {
    // Web: md:grid-cols-2 lg:grid-cols-3. Mobile-first RN → 1 column.
    // Full-width feels heavy on tablets so we allow 2-up when there's room.
    width: '100%',
    padding: spacing.xs,
  },

  needCardContent: { padding: spacing.md, gap: spacing.sm },
  needHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  needHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  needPosition: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  needClass: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  trashBtn: {
    height: 28,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },

  progressBlock: { gap: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  progressBar: { height: 6 },

  formCol: { gap: spacing.md },
  formRow: { flexDirection: 'row', gap: spacing.md },
  formField: { gap: spacing.xs },
});
