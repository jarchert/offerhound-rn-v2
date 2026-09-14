/**
 * VisibilityProposalControl — RN port of MAIN src/components/club/VisibilityProposalControl.tsx
 *
 * Renders ONLY for teen athletes (age band 15-17). Returns null for under-15, 18+, or unknown.
 * Three states:
 *   1. No open proposal → "Propose Public Visibility" button
 *   2. pending          → amber badge + Withdraw button
 *   3. pending_parent_invite → amber badge + optional Invite Parent button + Withdraw button
 */
import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Eye, Clock, Mail, X } from 'lucide-react-native';
import { toast } from '@/hooks/use-toast';
import { useAthleteVisibilityProposal } from '@/hooks/useAthleteVisibilityProposal';
import { colors, spacing, typography } from '@/lib/theme';

interface Props {
  athleteProfileId: string | null | undefined;
  athleteName: string;
  onInviteParent?: () => void;
}

export function VisibilityProposalControl({ athleteProfileId, athleteName, onInviteParent }: Props) {
  const { data, isLoading, propose, withdraw } = useAthleteVisibilityProposal(athleteProfileId);

  if (!athleteProfileId || isLoading || !data) return null;
  if (data.ageBand !== 'teen') return null;

  const open = data.openProposal;

  if (open?.status === 'pending') {
    return (
      <View style={s.row}>
        <View style={s.amberBadge}>
          <Clock size={10} color="#d97706" />
          <Text style={s.amberBadgeText}>Awaiting parent approval</Text>
        </View>
        <Pressable
          style={[s.ghostBtn, withdraw.isPending && s.disabled]}
          disabled={withdraw.isPending}
          onPress={() =>
            withdraw.mutate(undefined, {
              onSuccess: () => toast({ title: 'Proposal withdrawn' }),
              onError: (e: any) => toast({ title: e.message ?? 'Failed to withdraw', variant: 'destructive' }),
            })
          }
        >
          {withdraw.isPending ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <X size={12} color={colors.foreground} />
          )}
          <Text style={s.ghostBtnText}>Withdraw</Text>
        </Pressable>
      </View>
    );
  }

  if (open?.status === 'pending_parent_invite') {
    return (
      <View style={s.row}>
        <View style={s.amberBadge}>
          <Clock size={10} color="#d97706" />
          <Text style={s.amberBadgeText}>No linked parent yet</Text>
        </View>
        {onInviteParent && (
          <Pressable style={s.outlineBtn} onPress={onInviteParent}>
            <Mail size={12} color={colors.foreground} />
            <Text style={s.outlineBtnText}>Invite Parent</Text>
          </Pressable>
        )}
        <Pressable
          style={[s.ghostBtn, withdraw.isPending && s.disabled]}
          disabled={withdraw.isPending}
          onPress={() =>
            withdraw.mutate(undefined, {
              onSuccess: () => toast({ title: 'Proposal withdrawn' }),
              onError: (e: any) => toast({ title: e.message ?? 'Failed to withdraw', variant: 'destructive' }),
            })
          }
        >
          {withdraw.isPending ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <X size={12} color={colors.foreground} />
          )}
          <Text style={s.ghostBtnText}>Withdraw</Text>
        </Pressable>
      </View>
    );
  }

  // No open proposal — show propose button
  const tooltipText = data.hasLinkedParent
    ? `Ask ${athleteName}'s linked parent to approve making the profile publicly visible to recruiters.`
    : `Create a proposal for ${athleteName}. A parent invite will be required before the profile can go public.`;

  return (
    <View>
      <Pressable
        style={[s.outlineBtn, propose.isPending && s.disabled]}
        disabled={propose.isPending}
        onPress={() =>
          propose.mutate(undefined, {
            onSuccess: () => toast({ title: 'Visibility proposal created' }),
            onError: (e: any) => toast({ title: e.message ?? 'Failed to create proposal', variant: 'destructive' }),
          })
        }
        accessibilityHint={tooltipText}
      >
        {propose.isPending ? (
          <ActivityIndicator size="small" color={colors.foreground} />
        ) : (
          <Eye size={12} color={colors.foreground} />
        )}
        <Text style={s.outlineBtnText}>Propose Public Visibility</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  amberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#fcd34d', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  amberBadgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: '#d97706',
  },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  outlineBtnText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  ghostBtnText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  disabled: { opacity: 0.5 },
});
