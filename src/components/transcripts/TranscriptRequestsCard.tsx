// Ported from Lovable src/components/transcripts/TranscriptRequestsCard.tsx
// Web → RN mapping:
//   - lucide-react → lucide-react-native
//   - shadcn/ui Card/Button/Badge → @/components/ui/*
//   - useToast → @/hooks/use-toast (compat shim over react-native-toast-message)
//   - Tailwind utility classes → StyleSheet using @/lib/theme tokens
//   - Returning null when isLoading or no requests preserved (early returns)
//   - line-clamp-2 → Text numberOfLines={2}
//   - @tanstack/react-query mutation `respond` retained via hook (unchanged)
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FileText, Check, X, Clock } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTranscriptRequests } from '@/hooks/useTranscriptRequests';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

export function TranscriptRequestsCard() {
  const { data: requests = [], isLoading, respond } = useTranscriptRequests();
  const { toast } = useToast();

  const pending = requests.filter((r) => r.status === 'pending');

  if (isLoading) return null;
  if (requests.length === 0) return null;

  const handleRespond = async (requestId: string, decision: 'approved' | 'denied') => {
    try {
      await respond.mutateAsync({ requestId, decision });
      toast({
        title: decision === 'approved' ? 'Transcript shared' : 'Request denied',
        description:
          decision === 'approved'
            ? 'A secure link was sent to the requester.'
            : 'The requester was notified.',
      });
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message || 'Try again', variant: 'destructive' });
    }
  };

  return (
    <Card style={s.card}>
      <CardHeader style={s.header}>
        <CardTitle style={s.titleRow as any}>
          <View style={s.titleInner}>
            <FileText size={16} color={colors.primary} />
            <Text style={s.titleText}>Transcript Requests</Text>
            {pending.length > 0 && (
              <Badge variant="default" style={s.badgeMargin}>{`${pending.length} pending`}</Badge>
            )}
          </View>
        </CardTitle>
        <CardDescription style={s.descText}>
          Coaches and scouts requesting access to your academic transcript.
        </CardDescription>
      </CardHeader>
      <CardContent style={s.content}>
        {requests.slice(0, 5).map((r) => (
          <View key={r.id} style={s.row}>
            <View style={s.rowMain}>
              <View style={s.rowMeta}>
                <Badge
                  variant={r.status === 'pending' ? 'default' : r.status === 'approved' ? 'secondary' : 'outline'}
                  style={s.statusBadge}
                >
                  <Text style={s.statusBadgeText}>{r.status}</Text>
                </Badge>
                <View style={s.timeRow}>
                  <Clock size={12} color={colors.mutedForeground} />
                  <Text style={s.timeText}>
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </Text>
                </View>
              </View>
              {r.reason ? (
                <Text style={s.reason} numberOfLines={2}>{r.reason}</Text>
              ) : null}
            </View>
            {r.status === 'pending' && (
              <View style={s.actions}>
                <Button
                  size="sm"
                  variant="default"
                  onPress={() => handleRespond(r.id, 'approved')}
                  disabled={respond.isPending}
                  leftIcon={
                    respond.isPending ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Check size={12} color={colors.primaryForeground} />
                    )
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => handleRespond(r.id, 'denied')}
                  disabled={respond.isPending}
                  leftIcon={<X size={12} color={colors.foreground} />}
                />
              </View>
            )}
          </View>
        ))}
      </CardContent>
    </Card>
  );
}

export default TranscriptRequestsCard;

const s = StyleSheet.create({
  card: { borderColor: colors.primary + '4D', backgroundColor: colors.primary + '14' },
  header: { paddingBottom: spacing.sm },
  titleRow: {},
  titleInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.base, color: colors.foreground },
  badgeMargin: { marginLeft: 4 },
  descText: { fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  content: { gap: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderRadius: 8,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusBadge: { paddingHorizontal: 6 },
  statusBadgeText: { fontSize: 10, color: colors.primaryForeground, textTransform: 'capitalize' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 10, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  reason: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 4, fontFamily: typography.fontFamily.body },
  actions: { flexDirection: 'row', gap: 4, flexShrink: 0 },
});
