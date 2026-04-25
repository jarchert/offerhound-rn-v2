// Ported verbatim from Lovable src/components/CampRefundReviewQueue.tsx
// Web → RN mapping:
//   - Tailwind → StyleSheet using @/lib/theme tokens
//   - shadcn/ui → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - useToast → toast.* from @/components/ui/toast
//   - Textarea onChange(e.target.value) → onChangeText(text)
//   - Hover/responsive utility classes are no-ops
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/toast';
import { Receipt } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface RefundRow {
  id: string;
  enrollment_id: string;
  athlete_user_id: string;
  reason: string;
  amount_cents: number | null;
  status: string;
  decision_notes: string | null;
  created_at: string;
  stripe_refund_id: string | null;
}

interface CampRefundReviewQueueProps {
  campId: string;
}

export function CampRefundReviewQueue({ campId }: CampRefundReviewQueueProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['camp-refund-queue', campId],
    enabled: !!campId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_refund_requests' as any)
        .select('*')
        .eq('camp_id', campId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as RefundRow[]) || [];
    },
  });

  const decide = async (row: RefundRow, decision: 'approved' | 'denied') => {
    if (!user) return;
    setBusyId(row.id);

    if (decision === 'denied') {
      const { error } = await supabase
        .from('camp_refund_requests' as any)
        .update({
          status: 'denied',
          decided_by: user.id,
          decided_at: new Date().toISOString(),
          decision_notes: notes[row.id] ?? null,
        })
        .eq('id', row.id);
      setBusyId(null);
      if (error) {
        toast.error('Could not save decision', error.message);
        return;
      }
      toast.success('Refund denied', 'Athlete has been notified.');
      qc.invalidateQueries({ queryKey: ['camp-refund-queue', campId] });
      return;
    }

    const { data, error } = await supabase.functions.invoke('process-camp-refund', {
      body: { refund_request_id: row.id, notes: notes[row.id] ?? null },
    });
    setBusyId(null);
    if (error) {
      toast.error('Refund processing failed', (data as any)?.error || error.message);
      return;
    }
    toast.success('Refund approved', 'Stripe refund initiated.');
    qc.invalidateQueries({ queryKey: ['camp-refund-queue', campId] });
  };

  const statusVariant = (status: string): 'secondary' | 'destructive' | 'default' =>
    status === 'pending' ? 'secondary' : status === 'denied' || status === 'failed' ? 'destructive' : 'default';

  return (
    <Card>
      <CardHeader>
        <View style={s.titleRow}>
          <Receipt size={20} color={colors.foreground} />
          <CardTitle>Refund requests</CardTitle>
        </View>
        <CardDescription>
          Approve or deny refund requests from athletes for this camp. Approved refunds are processed through Stripe automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
        ) : rows.length === 0 ? (
          <Text style={s.empty}>No refund requests yet.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {rows.map((row) => (
              <View key={row.id} style={s.row}>
                <View style={s.rowHeader}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={s.amount}>
                      {row.amount_cents != null ? `$${(row.amount_cents / 100).toFixed(2)}` : 'Refund request'}
                    </Text>
                    <Text style={s.metaXs}>Submitted {new Date(row.created_at).toLocaleString()}</Text>
                  </View>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </View>
                <Text style={s.body}>
                  <Text style={s.bodyStrong}>Reason: </Text>
                  {row.reason}
                </Text>
                {row.decision_notes && (
                  <Text style={s.metaXs}>
                    <Text style={s.bodyStrong}>Your note: </Text>
                    {row.decision_notes}
                  </Text>
                )}
                {row.status === 'pending' && (
                  <>
                    <Textarea
                      placeholder="Optional note for the athlete..."
                      value={notes[row.id] ?? ''}
                      onChangeText={(t) => setNotes({ ...notes, [row.id]: t })}
                      rows={2}
                      style={{ fontSize: typography.fontSize.xs }}
                    />
                    <View style={s.actions}>
                      <Button variant="outline" size="sm" onPress={() => decide(row, 'denied')} disabled={busyId === row.id}>
                        Deny
                      </Button>
                      <Button size="sm" onPress={() => decide(row, 'approved')} disabled={busyId === row.id} loading={busyId === row.id}>
                        Approve & refund
                      </Button>
                    </View>
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  empty: { textAlign: 'center', color: colors.mutedForeground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.body, paddingVertical: spacing.lg },
  row: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, padding: spacing.sm, gap: spacing.xs },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  amount: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  metaXs: { color: colors.mutedForeground, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.body },
  body: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },
  bodyStrong: { fontFamily: typography.fontFamily.bodySemiBold },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
