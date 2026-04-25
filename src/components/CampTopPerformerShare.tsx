// Ported from Lovable web (src/components/CampTopPerformerShare.tsx) — RN-adapted.
// Translations:
//   - shadcn Card/Button/Badge → src/components/ui (RN)
//   - lucide-react → lucide-react-native
//   - native <select> for topN → @/components/ui/Select with same options
//   - @tanstack/react-query — same API and queries
//   - Tailwind classes → StyleSheet via theme tokens
//   - Loader2 spinner → ActivityIndicator
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Star, Trash2 } from 'lucide-react-native';
import { colors, spacing, typography, radius } from '@/lib/theme';

interface Props {
  campId: string;
  campName: string;
}

export function CampTopPerformerShare({ campId, campName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [topN, setTopN] = useState(5);

  const { data: topPerformers = [], isLoading } = useQuery({
    queryKey: ['camp-top-performers', campId, topN],
    queryFn: async () => {
      const { data: scores } = await supabase
        .from('camp_ai_scores')
        .select('id, athlete_profile_id, composite_score, ai_rank, ai_summary')
        .eq('camp_id', campId)
        .not('athlete_profile_id', 'is', null)
        .order('composite_score', { ascending: false })
        .limit(topN);

      const ids = (scores || []).map((s: any) => s.athlete_profile_id).filter(Boolean) as string[];
      const { data: profiles } = ids.length
        ? await supabase
            .from('player_profiles')
            .select('id, full_name, position, custom_url')
            .in('id', ids)
        : { data: [] as any[] };
      const byId = new Map((profiles || []).map((p: any) => [p.id, p]));

      return (scores || []).map((s: any) => ({ ...s, profile: byId.get(s.athlete_profile_id!) }));
    },
  });

  const { data: shared = [] } = useQuery({
    queryKey: ['camp-top-performer-shares', campId],
    queryFn: async () => {
      const { data } = await supabase
        .from('camp_top_performer_shares')
        .select('*')
        .eq('camp_id', campId);
      return data || [];
    },
  });

  const sharedIds = new Set(shared.map((s: any) => s.athlete_profile_id));

  const shareOne = useMutation({
    mutationFn: async (perf: any) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('camp_top_performer_shares').insert({
        camp_id: campId,
        athlete_profile_id: perf.athlete_profile_id,
        rank: perf.ai_rank,
        composite_score: perf.composite_score,
        share_channel: 'platform_feed',
        share_note: perf.ai_summary?.slice(0, 240) || null,
        shared_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Shared to recruiting feed' });
      qc.invalidateQueries({ queryKey: ['camp-top-performer-shares', campId] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const shareAll = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const newOnes = topPerformers.filter((p: any) => !sharedIds.has(p.athlete_profile_id));
      if (!newOnes.length) return;
      const rows = newOnes.map((p: any) => ({
        camp_id: campId,
        athlete_profile_id: p.athlete_profile_id,
        rank: p.ai_rank,
        composite_score: p.composite_score,
        share_channel: 'platform_feed',
        share_note: p.ai_summary?.slice(0, 240) || null,
        shared_by: user.id,
      }));
      const { error } = await supabase.from('camp_top_performer_shares').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Top performers shared' });
      qc.invalidateQueries({ queryKey: ['camp-top-performer-shares', campId] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const unshare = useMutation({
    mutationFn: async (athleteProfileId: string) => {
      const { error } = await supabase
        .from('camp_top_performer_shares')
        .delete()
        .eq('camp_id', campId)
        .eq('athlete_profile_id', athleteProfileId)
        .eq('share_channel', 'platform_feed');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['camp-top-performer-shares', campId] }),
  });

  return (
    <Card>
      <CardHeader>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <CardTitle style={styles.titleRow}>
              <Megaphone size={20} color={colors.primary} />
              <Text style={styles.titleText}> Auto-share top performers</Text>
            </CardTitle>
            <CardDescription>
              Spotlight {campName}'s top {topN} on the recruiting feed
            </CardDescription>
          </View>
          <View style={styles.headerControls}>
            <View style={{ width: 110 }}>
              <Select value={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Top 3</SelectItem>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                </SelectContent>
              </Select>
            </View>
            <Button
              onPress={() => shareAll.mutate()}
              disabled={shareAll.isPending || !topPerformers.length}
            >
              {shareAll.isPending && (
                <ActivityIndicator size="small" color={colors.primaryForeground} style={{ marginRight: 4 }} />
              )}
              <Text style={styles.btnText}>Share all</Text>
            </Button>
          </View>
        </View>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : topPerformers.length === 0 ? (
          <Text style={styles.emptyText}>
            Run AI scoring on this camp first to see top performers.
          </Text>
        ) : (
          <View style={{ gap: spacing.xs }}>
            {topPerformers.map((p: any, i: number) => {
              const isShared = sharedIds.has(p.athlete_profile_id);
              return (
                <View key={p.id} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <View style={styles.rankBubble}>
                      <Text style={styles.rankText}>{p.ai_rank ?? i + 1}</Text>
                    </View>
                    <View style={{ minWidth: 0, flexShrink: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {p.profile?.full_name || 'Unknown'}
                      </Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {p.profile?.position || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <Badge variant="secondary">
                      <Text style={styles.badgeText}>{Number(p.composite_score).toFixed(1)}</Text>
                    </Badge>
                    {isShared ? (
                      <Button variant="outline" onPress={() => unshare.mutate(p.athlete_profile_id)}>
                        <Trash2 size={16} color={colors.foreground} />
                      </Button>
                    ) : (
                      <Button
                        onPress={() => shareOne.mutate(p)}
                        disabled={shareOne.isPending}
                      >
                        <Star size={16} color={colors.primaryForeground} style={{ marginRight: 4 }} />
                        <Text style={styles.btnText}>Share</Text>
                      </Button>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  headerLeft: { flexShrink: 1, minWidth: 200 },
  headerControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: { color: colors.foreground, fontSize: typography.size.lg, fontWeight: '700' },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm + 4,
    gap: spacing.xs,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rankBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(231,175,8,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: colors.primary, fontWeight: '600', fontSize: typography.size.sm },
  itemName: { fontWeight: '500', fontSize: typography.size.sm, color: colors.foreground },
  itemMeta: { fontSize: typography.size.xs, color: colors.mutedForeground },
  badgeText: { color: colors.secondaryForeground, fontSize: typography.size.xs },
  btnText: { color: colors.primaryForeground, fontWeight: '600' },
});
