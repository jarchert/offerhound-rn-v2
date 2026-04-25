/**
 * ParentInfluencerApprovals — RN port of Lovable web component.
 * Source: offerhound-repo/src/components/influencer/ParentInfluencerApprovals.tsx
 *
 * Translations applied:
 *  - <Card>/<CardHeader>/<CardTitle>/<CardDescription>/<CardContent> → RN ui primitives
 *  - shadcn <Button> → RN ui Button (variant="default"|"outline", size="sm")
 *  - <Badge variant="default"|"destructive"|"secondary"> → RN ui Badge
 *  - lucide-react → lucide-react-native
 *  - sonner toast → '@/components/ui/toast' wrapper
 *  - <p>/<div> → <View>/<Text>
 *  - Tailwind classes → StyleSheet using theme tokens
 *  - capitalize → manual capitalize on status string
 *  - hooks (useParentInfluencerApprovals/useRespondToApproval) preserved verbatim
 *  - supabase + useEffect lookup for influencers/athletes preserved verbatim
 *  - date-fns format preserved (works in RN)
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { Shield, Check, X } from 'lucide-react-native';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import {
  useParentInfluencerApprovals,
  useRespondToApproval,
} from '@/hooks/useInfluencerHootsuite';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function ParentInfluencerApprovals() {
  const { data: requests = [] } = useParentInfluencerApprovals();
  const respond = useRespondToApproval();
  const [influencers, setInfluencers] = useState<Record<string, any>>({});
  const [athletes, setAthletes] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const infIds = [...new Set((requests as any[]).map((r: any) => r.influencer_user_id))];
      const athleteIds = [...new Set((requests as any[]).map((r: any) => r.athlete_profile_id))];
      if (infIds.length) {
        const { data } = await supabase
          .from('influencer_profiles' as any)
          .select('user_id, display_name, handle, profile_image_url')
          .in('user_id', infIds);
        setInfluencers(Object.fromEntries((data || []).map((d: any) => [d.user_id, d])));
      }
      if (athleteIds.length) {
        const { data } = await supabase
          .from('player_profiles')
          .select('id, full_name')
          .in('id', athleteIds);
        setAthletes(Object.fromEntries((data || []).map((d: any) => [d.id, d])));
      }
    })();
  }, [requests]);

  const pending = (requests as any[]).filter((r: any) => r.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <View style={s.titleRow}>
            <Shield size={20} color={colors.primary} />
            <Text style={s.titleText}>Creator Message Requests</Text>
          </View>
        </CardTitle>
        <CardDescription>
          Review and approve creators who want to message your athlete. No messages will be
          delivered until you approve.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View style={s.list}>
          {(requests as any[]).length === 0 ? (
            <Text style={s.empty}>No requests yet.</Text>
          ) : (
            (requests as any[]).map((r: any) => {
              const inf = influencers[r.influencer_user_id];
              const ath = athletes[r.athlete_profile_id];
              const badgeVariant: BadgeVariant =
                r.status === 'approved'
                  ? 'default'
                  : r.status === 'denied'
                    ? 'destructive'
                    : 'secondary';
              return (
                <View key={r.id} style={s.card}>
                  <View style={s.headerRow}>
                    <View style={s.headerMain}>
                      <Text style={s.creatorLine}>
                        <Text style={s.creatorName}>{inf?.display_name || 'A creator'}</Text>
                        {inf?.handle ? (
                          <Text style={s.handle}> @{inf.handle}</Text>
                        ) : null}
                      </Text>
                      <Text style={s.subLine}>
                        wants to message{' '}
                        <Text style={s.athleteName}>{ath?.full_name || 'your athlete'}</Text>
                        {' · '}
                        {format(new Date(r.created_at), 'MMM d, h:mm a')}
                      </Text>
                    </View>
                    <Badge variant={badgeVariant}>
                      <Text style={s.badgeText}>{capitalize(r.status)}</Text>
                    </Badge>
                  </View>
                  {r.initial_message && (
                    <View style={s.quote}>
                      <Text style={s.quoteText}>&quot;{r.initial_message}&quot;</Text>
                    </View>
                  )}
                  {r.status === 'pending' && (
                    <View style={s.actions}>
                      <Button
                        size="sm"
                        onPress={async () => {
                          await respond.mutateAsync({ id: r.id, status: 'approved' });
                          toast.success('Approved');
                        }}
                      >
                        <View style={s.btnInner}>
                          <Check size={16} color={colors.primaryForeground} />
                          <Text style={[s.btnText, { color: colors.primaryForeground }]}>
                            Approve
                          </Text>
                        </View>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={async () => {
                          await respond.mutateAsync({ id: r.id, status: 'denied' });
                          toast.success('Denied');
                        }}
                      >
                        <View style={s.btnInner}>
                          <X size={16} color={colors.foreground} />
                          <Text style={s.btnText}>Deny</Text>
                        </View>
                      </Button>
                    </View>
                  )}
                </View>
              );
            })
          )}
          {pending.length === 0 && (requests as any[]).length > 0 && (
            <Text style={s.footerNote}>No pending requests right now.</Text>
          )}
        </View>
      </CardContent>
    </Card>
  );
}

export default ParentInfluencerApprovals;

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.lg,
  },
  list: { gap: spacing.sm },
  empty: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm + 4,
    flexWrap: 'wrap',
  },
  headerMain: { flex: 1, minWidth: 0 },
  creatorLine: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  creatorName: { color: colors.foreground },
  handle: { color: colors.mutedForeground },
  subLine: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  athleteName: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
  },
  badgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  quote: {
    backgroundColor: colors.muted,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  quoteText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
    fontStyle: 'italic',
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  footerNote: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
});
