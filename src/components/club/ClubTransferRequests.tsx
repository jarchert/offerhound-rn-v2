/**
 * ClubTransferRequests — RN port of MAIN src/components/club/ClubTransferRequests.tsx
 *
 * Shows incoming roster transfer requests for a club team.
 * Club coach can approve or decline each request.
 *
 * Exact RPC: club_respond_to_roster_transfer(p_request_id, p_approve, p_decline_reason)
 * Returns the new status string: "pending_parent" | "accepted" | "declined"
 *
 * Decline requires a non-empty reason (enforced client-side).
 * requires_parent_consent flag drives the amber "minor" warning.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TextInput, Pressable, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowRightLeft, ShieldAlert, Check, X } from 'lucide-react-native';
import { toast } from '@/hooks/use-toast';
import { colors, spacing, typography } from '@/lib/theme';

const STATUS_LABEL: Record<string, string> = {
  pending_club: 'Awaiting your response',
  pending_parent: 'Awaiting parent consent',
  accepted: 'Transfer complete',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const statusVariant = (s: string): any => {
  if (s === 'pending_club') return 'default';
  if (s === 'pending_parent') return 'secondary';
  if (s === 'accepted') return 'success';
  return 'outline';
};

interface Props {
  teamId: string;
}

export function ClubTransferRequests({ teamId }: Props) {
  const queryClient = useQueryClient();
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['club-transfer-requests', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roster_transfer_requests')
        .select('*, destination_team:destination_team_id(name)')
        .eq('source_team_id', teamId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
  });

  const respond = useMutation({
    mutationFn: async (vars: { id: string; approve: boolean; reason?: string }) => {
      const { data, error } = await (supabase.rpc as any)('club_respond_to_roster_transfer', {
        p_request_id: vars.id,
        p_approve: vars.approve,
        p_decline_reason: vars.reason ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (newStatus) => {
      if (newStatus === 'pending_parent') {
        toast({ title: 'Approved — awaiting parent consent' });
      } else if (newStatus === 'accepted') {
        toast({ title: 'Transfer accepted' });
      } else {
        toast({ title: 'Request declined' });
      }
      setDeclineId(null);
      setDeclineReason('');
      queryClient.invalidateQueries({ queryKey: ['club-transfer-requests', teamId] });
    },
    onError: (e: any) => {
      toast({ title: e.message ?? 'Failed to respond', variant: 'destructive' });
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
      <Card style={s.emptyCard}>
        <CardContent style={s.emptyContent}>
          <ArrowRightLeft size={32} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>No transfer requests</Text>
          <Text style={s.emptySubtitle}>
            Requests from HS coaches to claim athletes on this team will appear here.
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
      {requests.map((r: any) => {
        const isPendingClub = r.status === 'pending_club';
        const isDeclining = declineId === r.id;
        const busy = respond.isPending && (respond.variables as any)?.id === r.id;

        return (
          <Card key={r.id} style={s.card}>
            <CardContent style={{ padding: spacing.md, gap: spacing.sm }}>
              {/* Header */}
              <View style={s.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.athleteName}>{r.athlete_name}</Text>
                  <Text style={s.subtitle}>
                    {'→ '}
                    {(r.destination_team as any)?.name || 'their HS team'}
                    {'  ·  '}
                    {new Date(r.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Badge variant={statusVariant(r.status)}>
                  <Text style={s.badgeText}>{STATUS_LABEL[r.status] || r.status}</Text>
                </Badge>
              </View>

              {/* Note from HS coach */}
              {r.note ? (
                <Text style={s.note}>"{r.note}"</Text>
              ) : null}

              {/* Minor warning on pending_parent */}
              {r.requires_parent_consent && r.status === 'pending_parent' ? (
                <View style={s.amberBox}>
                  <ShieldAlert size={14} color="#d97706" style={{ marginTop: 1, flexShrink: 0 }} />
                  <Text style={s.amberText}>
                    This athlete is a minor. Your approval only sends the request on to their parent
                    — the transfer isn't final until the parent consents.
                  </Text>
                </View>
              ) : null}

              {/* Decline reason display */}
              {r.status === 'declined' && r.decline_reason ? (
                <Text style={s.declineNote}>Reason given: {r.decline_reason}</Text>
              ) : null}

              {/* Actions — only for pending_club */}
              {isPendingClub ? (
                isDeclining ? (
                  <View style={{ gap: spacing.xs }}>
                    <TextInput
                      style={s.input}
                      placeholder="Reason for declining (required)"
                      placeholderTextColor={colors.mutedForeground}
                      value={declineReason}
                      onChangeText={setDeclineReason}
                      multiline
                    />
                    <View style={s.actionRow}>
                      <Button
                        variant="outline"
                        size="sm"
                        style={{ flex: 1 }}
                        onPress={() => { setDeclineId(null); setDeclineReason(''); }}
                      >
                        <Text style={s.btnText}>Cancel</Text>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        style={{ flex: 1 }}
                        disabled={!declineReason.trim() || busy}
                        onPress={() =>
                          respond.mutate({ id: r.id, approve: false, reason: declineReason })
                        }
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <X size={12} color="#fff" />
                        )}
                        <Text style={[s.btnText, { color: '#fff' }]}>Decline</Text>
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View style={s.actionRow}>
                    <Button
                      variant="default"
                      size="sm"
                      style={{ flex: 1 }}
                      disabled={busy}
                      onPress={() => respond.mutate({ id: r.id, approve: true })}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Check size={12} color="#fff" />
                      )}
                      <Text style={[s.btnText, { color: '#fff' }]}>Approve</Text>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => setDeclineId(r.id)}
                    >
                      <X size={12} color={colors.foreground} />
                      <Text style={s.btnText}>Decline</Text>
                    </Button>
                  </View>
                )
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  centered: { padding: spacing.xl, alignItems: 'center' },
  emptyCard: { marginVertical: spacing.sm },
  emptyContent: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
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
  card: { marginVertical: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.sm,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  btnText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
});
