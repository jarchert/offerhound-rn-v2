// Recruiting pipeline — Kanban-style board across stages from `recruiting_pipeline_stages`.
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/lib/theme';

interface PipelineEntry {
  id: string;
  user_id: string;
  coach_id: string;
  stage_id: string;
  notes?: string | null;
  coach?: { name?: string | null; school?: string | null; image_url?: string | null };
  stage?: { name: string; sort_order: number };
}

const DEFAULT_STAGES = [
  { id: 'interested', name: 'Interested' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'visit', name: 'Visit Scheduled' },
  { id: 'offer', name: 'Offer' },
  { id: 'committed', name: 'Committed' },
];

export function RecruitingPipeline() {
  const { user } = useAuth();

  const { data: entries = [] } = useQuery({
    queryKey: ['recruiting-pipeline', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('recruiting_pipeline' as any)
        .select('*, coach:coaches(name, school, image_url), stage:recruiting_pipeline_stages(name, sort_order)')
        .eq('user_id', user.id);
      return (data || []) as any as PipelineEntry[];
    },
    enabled: !!user,
  });

  const grouped = DEFAULT_STAGES.map(stage => ({
    ...stage,
    entries: entries.filter(e => e.stage?.name?.toLowerCase().includes(stage.id) || e.stage_id === stage.id),
  }));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.board}>
      {grouped.map(col => (
        <View key={col.id} style={s.column}>
          <View style={s.colHeader}>
            <Text style={s.colTitle}>{col.name}</Text>
            <Badge variant="secondary">{col.entries.length}</Badge>
          </View>
          <ScrollView style={s.colList}>
            {col.entries.length === 0 ? (
              <Text style={s.empty}>No coaches</Text>
            ) : (
              col.entries.map(entry => (
                <Card key={entry.id} style={s.entryCard}>
                  <Text style={s.coachName} numberOfLines={1}>{entry.coach?.name ?? 'Unknown'}</Text>
                  {entry.coach?.school && <Text style={s.school} numberOfLines={1}>{entry.coach.school}</Text>}
                  {entry.notes && <Text style={s.notes} numberOfLines={2}>{entry.notes}</Text>}
                </Card>
              ))
            )}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

export default RecruitingPipeline;

const s = StyleSheet.create({
  board: { gap: spacing.md, padding: spacing.md },
  column: { width: 240, backgroundColor: colors.muted, borderRadius: 12, padding: spacing.sm, gap: spacing.sm, maxHeight: 600 },
  colHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  colTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.sm, color: colors.foreground, textTransform: 'uppercase', letterSpacing: 0.5 },
  colList: { flex: 1 },
  entryCard: { marginBottom: spacing.xs, padding: spacing.sm, gap: 2 },
  coachName: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  school: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  notes: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 4, fontStyle: 'italic' },
  empty: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center', padding: spacing.md },
});
