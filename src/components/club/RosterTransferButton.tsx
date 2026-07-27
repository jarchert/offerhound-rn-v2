/**
 * RosterTransferButton
 *
 * Rendered inside TeamRosterAthleteCard (canManage=true) when the athlete
 * has a linked OfferHound profile (athlete_profile_id is set).
 *
 * States:
 *   idle        → "Request Transfer" button
 *   loading     → spinner
 *   pending     → "Transfer Pending" badge (request already in flight)
 *   approved    → "Transfer Approved" badge
 *   error       → toast + button returns to idle
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ArrowRightLeft, CheckCircle2, Clock } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateTransferRequest,
  useAthleteTransferStatus,
} from '@/hooks/useRosterTransfer';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  athleteProfileId: string;
  athleteName: string;
  sourceTeamId: string;
}

export function RosterTransferButton({
  athleteProfileId,
  athleteName,
  sourceTeamId,
}: Props) {
  const { toast } = useToast();
  const [optimisticPending, setOptimisticPending] = useState(false);

  const { data: existing, isLoading: statusLoading } = useAthleteTransferStatus(
    athleteProfileId,
    sourceTeamId,
  );

  const createRequest = useCreateTransferRequest();

  const handleRequest = async () => {
    setOptimisticPending(true);
    try {
      await createRequest.mutateAsync({ athleteProfileId, athleteName, sourceTeamId });
      toast({ title: 'Transfer request sent', description: `Request submitted for ${athleteName}.` });
    } catch (err: any) {
      setOptimisticPending(false);
      toast({
        title: 'Could not send request',
        description: err?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (statusLoading) {
    return <ActivityIndicator size="small" color={colors.mutedForeground} />;
  }

  const status = existing?.status;
  const isPending = optimisticPending || status === 'pending';
  const isApproved = status === 'approved';

  if (isApproved) {
    return (
      <Badge variant="success" style={s.badge}>
        <View style={s.badgeInner}>
          <CheckCircle2 size={10} color="#fff" />
          <Text style={s.badgeText}>Transfer Approved</Text>
        </View>
      </Badge>
    );
  }

  if (isPending) {
    return (
      <Badge variant="outline" style={s.badge}>
        <View style={s.badgeInner}>
          <Clock size={10} color={colors.mutedForeground} />
          <Text style={[s.badgeText, { color: colors.mutedForeground }]}>Transfer Pending</Text>
        </View>
      </Badge>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onPress={handleRequest}
      disabled={createRequest.isPending}
    >
      <View style={s.btnInner}>
        {createRequest.isPending ? (
          <ActivityIndicator size="small" color={colors.foreground} />
        ) : (
          <ArrowRightLeft size={12} color={colors.foreground} />
        )}
        <Text style={s.btnText}>Transfer</Text>
      </View>
    </Button>
  );
}

const s = StyleSheet.create({
  badge: {
    alignSelf: 'center',
  },
  badgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: '#fff',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
});
