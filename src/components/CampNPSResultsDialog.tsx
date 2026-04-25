// Parity port from Lovable src/components/CampNPSResultsDialog.tsx (verbatim logic).
// Web→RN mapping: shadcn Dialog/Card/Button/Badge → src/components/ui/*; lucide-react → lucide-react-native;
// Tailwind → StyleSheet using @/lib/theme tokens.
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Star, MessageSquare } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  campId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampNPSResultsDialog({ campId, open, onOpenChange }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['camp-nps-results', campId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_nps_responses')
        .select('*')
        .eq('camp_id', campId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const responses = data || [];
  const promoters = responses.filter((r: any) => r.nps_score >= 9).length;
  const detractors = responses.filter((r: any) => r.nps_score <= 6).length;
  const nps = responses.length ? Math.round(((promoters - detractors) / responses.length) * 100) : 0;
  const avg = responses.length
    ? (responses.reduce((s: number, r: any) => s + r.nps_score, 0) / responses.length).toFixed(1)
    : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={styles.dialog}>
        <DialogHeader>
          <View style={styles.titleRow}>
            <Star size={20} color={colors.primary} />
            <DialogTitle>Camp feedback</DialogTitle>
          </View>
          <DialogDescription>NPS responses and testimonials from athletes</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : responses.length === 0 ? (
          <Text style={styles.empty}>No feedback collected yet.</Text>
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <CardContent style={styles.statContent}>
                  <Text style={styles.statValue}>{nps}</Text>
                  <Text style={styles.statLabel}>NPS Score</Text>
                </CardContent>
              </Card>
              <Card style={styles.statCard}>
                <CardContent style={styles.statContent}>
                  <Text style={styles.statValue}>{avg}</Text>
                  <Text style={styles.statLabel}>Avg rating</Text>
                </CardContent>
              </Card>
              <Card style={styles.statCard}>
                <CardContent style={styles.statContent}>
                  <Text style={styles.statValue}>{responses.length}</Text>
                  <Text style={styles.statLabel}>Responses</Text>
                </CardContent>
              </Card>
            </View>

            <View style={{ gap: spacing.sm }}>
              {responses.map((r: any) => (
                <Card key={r.id}>
                  <CardContent style={styles.responseContent}>
                    <View style={styles.responseHeader}>
                      <View style={styles.badgeRow}>
                        <Badge variant={r.nps_score >= 9 ? 'default' : r.nps_score >= 7 ? 'secondary' : 'destructive'}>
                          {`${r.nps_score}/10`}
                        </Badge>
                        {r.allow_as_testimonial && <Badge variant="outline">Public OK</Badge>}
                      </View>
                      <Text style={styles.dateText}>{format(new Date(r.created_at), 'MMM d, yyyy')}</Text>
                    </View>
                    {r.written_feedback && (
                      <View style={styles.feedbackRow}>
                        <MessageSquare size={16} color={colors.foregroundSubtle} style={{ marginTop: 2 }} />
                        <Text style={styles.feedbackText}>{r.written_feedback}</Text>
                      </View>
                    )}
                  </CardContent>
                </Card>
              ))}
            </View>
          </View>
        )}
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  dialog: { maxWidth: 720, width: '92%', maxHeight: '85%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
    color: colors.foregroundSubtle,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1 },
  statContent: { padding: spacing.md, alignItems: 'center' },
  statValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
    marginTop: 2,
  },
  responseContent: { padding: spacing.sm, gap: spacing.sm },
  responseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  feedbackRow: { flexDirection: 'row', gap: spacing.sm },
  feedbackText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
});
