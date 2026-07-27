/**
 * TransferRequestsScreen
 *
 * HS Coach view: lists incoming roster transfer requests from club coaches.
 * Allows inline Approve / Decline (with optional decline reason).
 *
 * Pattern follows ParentInfluencerApprovals.tsx:
 *   - useIncomingTransferRequests() for data
 *   - inline Approve / Decline buttons
 *   - decline taps open a small reason dialog
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
} from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useIncomingTransferRequests,
  useApproveTransferRequest,
  useDeclineTransferRequest,
  TransferRequest,
} from '@/hooks/useRosterTransfer';
import { colors, spacing, typography } from '@/lib/theme';

// ─── Decline Dialog ───────────────────────────────────────────────────────────

interface DeclineDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

function DeclineDialog({ visible, onClose, onConfirm, isPending }: DeclineDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Transfer Request</DialogTitle>
          <DialogDescription>
            Optionally provide a reason for the club coach.
          </DialogDescription>
        </DialogHeader>
        <TextInput
          style={s.reasonInput}
          placeholder="Reason (optional)"
          placeholderTextColor={colors.mutedForeground}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />
        <View style={s.dialogActions}>
          <Button variant="outline" size="sm" onPress={onClose} style={{ flex: 1 }}>
            <Text style={s.btnText}>Cancel</Text>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onPress={handleConfirm}
            disabled={isPending}
            style={{ flex: 1 }}
          >
            {isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={[s.btnText, { color: '#fff' }]}>Decline</Text>
            }
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────

interface RequestCardProps {
  request: TransferRequest;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  approveLoading: boolean;
  declineLoading: boolean;
}

function RequestCard({ request, onApprove, onDecline, approveLoading, declineLoading }: RequestCardProps) {
  const createdAt = new Date(request.created_at).toLocaleDateString();
  const expiresAt = request.expires_at ? new Date(request.expires_at).toLocaleDateString() : null;

  const statusBadge = () => {
    switch (request.status) {
      case 'approved':
        return (
          <Badge variant="success" style={s.statusBadge}>
            <View style={s.badgeInner}>
              <CheckCircle2 size={10} color="#fff" />
              <Text style={[s.badgeText, { color: '#fff' }]}>Approved</Text>
            </View>
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="destructive" style={s.statusBadge}>
            <View style={s.badgeInner}>
              <XCircle size={10} color="#fff" />
              <Text style={[s.badgeText, { color: '#fff' }]}>Declined</Text>
            </View>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" style={s.statusBadge}>
            <View style={s.badgeInner}>
              <Clock size={10} color={colors.mutedForeground} />
              <Text style={[s.badgeText, { color: colors.mutedForeground }]}>Pending</Text>
            </View>
          </Badge>
        );
    }
  };

  return (
    <Card style={s.card}>
      <CardContent style={{ padding: spacing.md }}>
        <View style={s.cardHeader}>
          <View style={s.avatarBox}>
            <UserCheck size={20} color={colors.mutedForeground} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.athleteName} numberOfLines={1}>{request.athlete_name}</Text>
            <Text style={s.meta}>Requested {createdAt}</Text>
            {expiresAt ? (
              <Text style={s.meta}>Expires {expiresAt}</Text>
            ) : null}
          </View>
          {statusBadge()}
        </View>

        {request.decline_reason ? (
          <Text style={s.declineReason}>Decline reason: {request.decline_reason}</Text>
        ) : null}

        {request.status === 'pending' ? (
          <View style={s.actionRow}>
            <Button
              variant="default"
              size="sm"
              style={{ flex: 1 }}
              onPress={() => onApprove(request.id)}
              disabled={approveLoading || declineLoading}
            >
              {approveLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={s.btnInner}>
                  <CheckCircle2 size={14} color="#fff" />
                  <Text style={[s.btnText, { color: '#fff' }]}>Approve</Text>
                </View>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              style={{ flex: 1 }}
              onPress={() => onDecline(request.id)}
              disabled={approveLoading || declineLoading}
            >
              {declineLoading ? (
                <ActivityIndicator size="small" color={colors.foreground} />
              ) : (
                <View style={s.btnInner}>
                  <XCircle size={14} color={colors.destructive} />
                  <Text style={[s.btnText, { color: colors.destructive }]}>Decline</Text>
                </View>
              )}
            </Button>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function TransferRequestsScreen() {
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useIncomingTransferRequests(
    showAll ? 'all' : 'pending',
  );

  const approve = useApproveTransferRequest();
  const decline = useDeclineTransferRequest();

  const handleApprove = async (id: string) => {
    try {
      await approve.mutateAsync(id);
      toast({ title: 'Transfer approved', description: 'The athlete has been approved for roster transfer.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Could not approve request.', variant: 'destructive' });
    }
  };

  const handleDeclineConfirm = async (reason: string) => {
    if (!declineTarget) return;
    try {
      await decline.mutateAsync({ requestId: declineTarget, declineReason: reason });
      toast({ title: 'Transfer declined' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Could not decline request.', variant: 'destructive' });
    } finally {
      setDeclineTarget(null);
    }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <ArrowRightLeft size={20} color={colors.foreground} />
          <Text style={s.heading}>Transfer Requests</Text>
        </View>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => setShowAll((v) => !v)}
        >
          <Text style={s.toggleText}>{showAll ? 'Pending only' : 'Show all'}</Text>
        </Button>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.mutedForeground} />
        </View>
      ) : requests.length === 0 ? (
        <View style={s.center}>
          <ArrowRightLeft size={32} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>No transfer requests</Text>
          <Text style={s.emptySubtitle}>
            {showAll
              ? 'No transfer requests found for your roster athletes.'
              : 'No pending transfer requests right now.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        >
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onApprove={handleApprove}
              onDecline={(id) => setDeclineTarget(id)}
              approveLoading={approve.isPending && approve.variables === req.id}
              declineLoading={decline.isPending && decline.variables?.requestId === req.id}
            />
          ))}
        </ScrollView>
      )}

      <DeclineDialog
        visible={!!declineTarget}
        onClose={() => setDeclineTarget(null)}
        onConfirm={handleDeclineConfirm}
        isPending={decline.isPending}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heading: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  toggleText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 260,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  card: {
    marginVertical: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athleteName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  meta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  badgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
  },
  declineReason: {
    fontFamily: typography.fontFamily.body,
    fontStyle: 'italic',
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
