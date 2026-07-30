/**
 * HSTransferRequests — RN port of MAIN src/components/hs/HSTransferRequests.tsx
 *
 * Lists outgoing transfer requests sent by this HS coach.
 * Supports cancelling pending_club and pending_parent requests.
 *
 * RPC: cancel_roster_transfer_claim(p_request_id uuid)
 * Direct table query: roster_transfer_requests (filtered by requested_by_user_id)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowRightLeft, ShieldAlert } from 'lucide-react-native';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography } from '@/lib/theme';

const STATUS_LABEL: Record<string, string> = {
  pending_club: 'Awaiting club coach',
  pending_parent: 'Awaiting parent consent',
  accepted: 'Transfer complete',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const statusVariant = (s: string): any => {
  if (s === 'pending_club' || s === 'pending_parent') return 'default';
  if (s === 'accepted') return 'secondary';
  return 'outline';
};

export function HSTransferRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['hs-transfer-requests'],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from('roster_transfer_requests')
        .select(
          '*, source_team:source_team_id(name), destination_team:destination_team_id(name)',
        )
        .eq('requested_by_user_id', auth.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as any)('cancel_roster_transfer_claim', {
        p_request_id: id,
      });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast({
        title: 'Request cancelled',
        description:
          'The club coach and any pending parent consent have been withdrawn.',
      });
      setCancelId(null);
      queryClient.invalidateQueries({ queryKey: ['hs-transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['claimable-club-athletes'] });
    },
    onError: (err: any) => {
      toast({ title: 'Could not cancel request', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.mutedForeground} />
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent style={s.emptyContent}>
          <ArrowRightLeft size={40} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>No transfer requests yet</Text>
          <Text style={s.emptySubtitle}>
            Requests you send from the club athlete list will appear here so you can track
            approval.
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
        {requests.map((r: any) => {
          const cancellable =
            r.status === 'pending_club' || r.status === 'pending_parent';
          const busy = cancel.isPending && cancel.variables === r.id;

          return (
            <Card key={r.id}>
              <CardContent style={{ padding: spacing.md, gap: spacing.sm }}>
                {/* Header */}
                <View style={s.headerRow}>
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <Text style={s.athleteName}>{r.athlete_name}</Text>
                    <Text style={s.subtitle}>
                      From{' '}
                      <Text style={s.subtitleBold}>
                        {r.source_team?.name ?? 'their club team'}
                      </Text>
                      {' → '}
                      <Text style={s.subtitleBold}>
                        {r.destination_team?.name ?? 'your team'}
                      </Text>
                      {'  ·  '}
                      {new Date(r.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Badge variant={statusVariant(r.status)}>
                    <Text style={s.badgeText}>
                      {STATUS_LABEL[r.status] || r.status}
                    </Text>
                  </Badge>
                </View>

                {/* Coach note */}
                {r.note ? (
                  <Text style={s.note}>"{r.note}"</Text>
                ) : null}

                {/* Minor / pending_parent warning */}
                {r.requires_parent_consent && r.status === 'pending_parent' ? (
                  <View style={s.amberBox}>
                    <ShieldAlert
                      size={14}
                      color="#d97706"
                      style={{ marginTop: 1, flexShrink: 0 }}
                    />
                    <Text style={s.amberText}>
                      The club coach approved. This athlete is a minor, so the transfer
                      isn't final until their parent consents.
                    </Text>
                  </View>
                ) : null}

                {/* Decline reason */}
                {r.status === 'declined' && r.decline_reason ? (
                  <Text style={s.declineNote}>Reason given: {r.decline_reason}</Text>
                ) : null}

                {/* Cancel action */}
                {cancellable ? (
                  <View>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onPress={() => setCancelId(r.id)}
                      leftIcon={
                        busy ? (
                          <ActivityIndicator size="small" color={colors.foreground} />
                        ) : undefined
                      }
                    >
                      Cancel request
                    </Button>
                  </View>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </ScrollView>

      {/* Confirm cancel dialog */}
      <Modal
        visible={!!cancelId}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelId(null)}
      >
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>Cancel transfer request</Text>
            <Text style={s.dialogDesc}>
              This withdraws the request. The club coach — and the parent, if consent was
              already requested — will no longer be able to act on it. You can send a new
              request later.
            </Text>
            <View style={s.dialogFooter}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setCancelId(null)}
              >
                Keep request
              </Button>
              <Button
                variant="destructive"
                style={{ flex: 1 }}
                disabled={cancel.isPending}
                onPress={() => cancelId && cancel.mutate(cancelId)}
                leftIcon={
                  cancel.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : undefined
                }
              >
                Cancel request
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  centered: { padding: spacing.xl, alignItems: 'center' },
  emptyContent: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  athleteName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  subtitleBold: {
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  badgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
  },
  note: {
    fontFamily: typography.fontFamily.body,
    fontStyle: 'italic',
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.sm,
  },
  amberBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 6,
    padding: spacing.sm,
  },
  amberText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: '#d97706',
    flex: 1,
  },
  declineNote: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dialogTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  dialogDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  dialogFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
