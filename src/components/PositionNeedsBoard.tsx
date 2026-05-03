// Ported from Lovable web src/components/PositionNeedsBoard.tsx (Build 48 parity restore)
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getPositionsForSport } from '@/lib/data/sportPositions';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Target, Plus, Trash2, Search } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

interface PositionNeed {
  id: string;
  position: string;
  class_year: string;
  target_count: number;
  filled_count: number;
  priority: 'high' | 'medium' | 'low';
}

export function PositionNeedsBoard({ sport = 'football' }: { sport?: string }) {
  const { user } = useAuth();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newNeed, setNewNeed] = useState({ position: '', class_year: '2026', target_count: 1, priority: 'medium' as 'high' | 'medium' | 'low' });

  const { data: needs = [], isLoading } = useQuery({
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
    mutationFn: async (n: typeof newNeed) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('position_needs').insert({
        coach_user_id: user.id,
        position: n.position,
        class_year: n.class_year,
        target_count: n.target_count,
        priority: n.priority,
        filled_count: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['position-needs'] });
      setShowAdd(false);
      setNewNeed({ position: '', class_year: '2026', target_count: 1, priority: 'medium' });
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Could not add position need'),
  });

  const deleteNeed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('position_needs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['position-needs'] }),
  });

  const handleFindProspects = (need: PositionNeed) => {
    nav.navigate('AthleteSearch' as any, {
      position: need.position,
      gradYear: need.class_year,
      fromNeed: true,
      needPriority: need.priority,
    } as any);
  };

  const priorityVariant = (p: string): 'destructive' | 'outline' | 'secondary' => (p === 'high' ? 'destructive' : p === 'low' ? 'outline' : 'secondary');

  if (isLoading) {
    return (
      <View style={s.loading}><ActivityIndicator color={colors.primary} /></View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Target size={18} color={colors.primary} />
          <Text style={s.h2}>Team & Position Needs</Text>
        </View>
        <Button size="sm" onPress={() => setShowAdd(true)} leftIcon={<Plus size={14} color={colors.primaryForeground} />}>
          Add Need
        </Button>
      </View>

      {needs.length === 0 ? (
        <Card>
          <CardContent style={s.empty}>
            <Target size={40} color={colors.mutedForeground} style={{ marginBottom: spacing.sm }} />
            <Text style={s.emptyTitle}>No Position Needs Set</Text>
            <Text style={s.emptyBody}>Define the positions you need to recruit for each class year.</Text>
            <Button onPress={() => setShowAdd(true)} leftIcon={<Plus size={14} color={colors.primaryForeground} />}>
              Add First Position Need
            </Button>
          </CardContent>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {needs.map((need) => {
            const pct = need.target_count > 0 ? Math.round((need.filled_count / need.target_count) * 100) : 0;
            return (
              <Card key={need.id}>
                <CardContent style={{ padding: spacing.md, gap: spacing.sm }}>
                  <View style={s.needRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.needTitle}>{need.position}</Text>
                      <Text style={s.muted}>Class of {need.class_year}</Text>
                    </View>
                    <View style={s.rowGap}>
                      <Badge variant={priorityVariant(need.priority)}>{need.priority}</Badge>
                      <Pressable onPress={() => deleteNeed.mutate(need.id)} hitSlop={8} style={s.iconBtn}>
                        <Trash2 size={14} color={colors.destructive} />
                      </Pressable>
                    </View>
                  </View>
                  <View>
                    <View style={s.progressHead}>
                      <Text style={s.progressText}>{need.filled_count} / {need.target_count} filled</Text>
                      <Text style={s.progressText}>{pct}%</Text>
                    </View>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${Math.min(100, pct)}%` }]} />
                    </View>
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
            );
          })}
        </View>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Position Need</DialogTitle>
          </DialogHeader>
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: 6 }}>
              <Text style={s.label}>Position</Text>
              <Select value={newNeed.position} onValueChange={(v) => setNewNeed({ ...newNeed, position: v })}>
                <SelectTrigger><SelectValue placeholder="Select a position" /></SelectTrigger>
                <SelectContent>
                  {getPositionsForSport(sport).map((p: any) => (
                    <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.label}>Class Year</Text>
                <Select value={newNeed.class_year} onValueChange={(v) => setNewNeed({ ...newNeed, class_year: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['2025', '2026', '2027', '2028', '2029'].map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.label}>Target Count</Text>
                <Input
                  keyboardType="number-pad"
                  value={String(newNeed.target_count)}
                  onChangeText={(v) => setNewNeed({ ...newNeed, target_count: Math.max(1, parseInt(v, 10) || 1) })}
                />
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={s.label}>Priority</Text>
              <Select value={newNeed.priority} onValueChange={(v) => setNewNeed({ ...newNeed, priority: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setShowAdd(false)}>Cancel</Button>
            <Button onPress={() => addNeed.mutate(newNeed)} disabled={!newNeed.position || addNeed.isPending}>
              {addNeed.isPending ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}

export default PositionNeedsBoard;

const s = StyleSheet.create({
  loading: { paddingVertical: 32, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h2: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  empty: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.xs },
  emptyTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  emptyBody: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center', marginBottom: spacing.sm },
  needRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  needTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  muted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 6, borderRadius: 6 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  progressTrack: { height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
});
