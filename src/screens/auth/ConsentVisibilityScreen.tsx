/**
 * ConsentVisibilityScreen — parent-facing roster transfer consent UI.
 *
 * Deep-link: offerhound://roster-transfer-consent?token=<jwt>
 * Route:     AuthStack → RosterTransferConsent  { token: string }
 *
 * States handled:
 *   loading        — spinner while fetching token info
 *   error          — RPC hard failure
 *   invalid/expired — token not valid or expired
 *   already-decided — request already accepted / declined / cancelled
 *   live            — show athlete details + approve / decline actions
 *
 * Calling conventions (from useRosterTransferConsentToken):
 *   get_roster_transfer_consent_token(p_token)          → RosterConsentTokenInfo
 *   parent_respond_to_roster_transfer(p_token,
 *     p_approve, p_confirm_email, p_decline_reason)
 *   p_confirm_email is REQUIRED — identity confirmation, never drop it.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, User } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BackButton } from '@/components/BackButton';
import { useRosterTransferConsentToken } from '@/hooks/useRosterTransferConsentToken';
import { AuthStackParamList } from '@/navigation/stacks/AuthStack';
import { useToast } from '@/hooks/use-toast';

type RouteProps = RouteProp<AuthStackParamList, 'RosterTransferConsent'>;

// ─── Finalized-status display ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  accepted:  { label: 'Transfer approved',  color: colors.success  ?? '#22c55e', icon: <CheckCircle size={20} color={colors.success  ?? '#22c55e'} /> },
  declined: { label: 'Transfer declined',  color: colors.destructive, icon: <XCircle    size={20} color={colors.destructive}           /> },
  cancelled: { label: 'Request cancelled',  color: colors.muted    ?? '#6b7280', icon: <Clock      size={20} color={colors.muted    ?? '#6b7280'} /> },
  expired:   { label: 'Link expired',       color: colors.muted    ?? '#6b7280', icon: <Clock      size={20} color={colors.muted    ?? '#6b7280'} /> },
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ConsentVisibilityScreen() {
  const route = useRoute<RouteProps>();
  const token = route.params?.token;
  const { toast } = useToast();

  const { loading, error, info, reload, submitDecision } =
    useRosterTransferConsentToken(token);

  const [confirmEmail, setConfirmEmail] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading consent request…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Hard RPC error ─────────────────────────────────────────────────────────
  if (error || !info) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.content}>
          <BackButton label="Back" />
          <View style={s.headerRow}>
            <AlertTriangle size={28} color={colors.destructive} />
            <Text style={s.h1}>Unable to Load Request</Text>
          </View>
          <Card>
            <CardContent style={s.cardBody}>
              <Text style={s.body}>
                {error ?? 'Something went wrong loading this consent request. Please try again or contact support.'}
              </Text>
              <TouchableOpacity style={s.primaryBtn} onPress={reload}>
                <Text style={s.primaryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (!info.valid) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.content}>
          <BackButton label="Back" />
          <View style={s.headerRow}>
            <XCircle size={28} color={colors.destructive} />
            <Text style={s.h1}>Invalid Link</Text>
          </View>
          <Card>
            <CardContent style={s.cardBody}>
              <Text style={s.body}>
                {info.reason ?? 'This consent link is not valid. It may have already been used or the request may have been cancelled.'}
              </Text>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Already finalised ─────────────────────────────────────────────────────
  const finalStatuses = ['accepted', 'declined', 'cancelled', 'expired'];
  if (info.status && finalStatuses.includes(info.status)) {
    const cfg = STATUS_CONFIG[info.status] ?? STATUS_CONFIG['expired'];
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.content}>
          <BackButton label="Back" />
          <View style={s.headerRow}>
            {cfg.icon}
            <Text style={[s.h1, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Card>
            <CardContent style={s.cardBody}>
              {info.athlete_name ? (
                <Text style={s.body}>
                  The transfer request for <Text style={s.bold}>{info.athlete_name}</Text> is{' '}
                  <Text style={s.bold}>{info.status}</Text>.
                </Text>
              ) : (
                <Text style={s.body}>This transfer request has already been {info.status}.</Text>
              )}
              {info.destination_team_name ? (
                <Text style={[s.body, { marginTop: spacing.xs }]}>
                  Destination team: {info.destination_team_name}
                  {info.destination_school ? ` — ${info.destination_school}` : ''}
                </Text>
              ) : null}
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Live — awaiting parent decision ───────────────────────────────────────
  const canApprove = confirmEmail.trim().length > 0;
  const canDecline = confirmEmail.trim().length > 0 && declineReason.trim().length > 0;

  const handleApprove = async () => {
    if (!canApprove) return;
    setSubmitting(true);
    try {
      await submitDecision(true, confirmEmail);
      toast({ title: 'Transfer approved', description: 'The transfer has been approved and will proceed.', variant: 'default' });
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e?.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!canDecline) return;
    setSubmitting(true);
    try {
      await submitDecision(false, confirmEmail, declineReason);
      toast({ title: 'Transfer declined', description: 'You have declined this transfer request.', variant: 'default' });
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e?.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
      setShowDeclineForm(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <BackButton label="Back" />

        {/* Header */}
        <View style={s.headerRow}>
          <Shield size={28} color={colors.primary} />
          <Text style={s.h1}>Parental Consent Required</Text>
        </View>

        {/* Legal notice */}
        <Text style={s.legalNotice}>
          OfferHound™ requires parental consent before any athlete under 18 becomes publicly
          visible. You can revoke consent at any time from your parent dashboard.
        </Text>

        {/* Athlete details card */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Request Details</CardTitle>
          </CardHeader>
          <CardContent style={s.cardBody}>
            <DetailRow label="Athlete" value={info.athlete_name ?? '—'} />
            <DetailRow label="Current team" value={info.source_team_name ?? '—'} />
            <DetailRow label="Destination team" value={info.destination_team_name ?? '—'} />
            {info.destination_school ? (
              <DetailRow label="School" value={info.destination_school} />
            ) : null}
            {info.requesting_coach ? (
              <DetailRow label="Requesting coach" value={info.requesting_coach} />
            ) : null}
            {info.note ? (
              <DetailRow label="Note" value={info.note} />
            ) : null}
            {info.expires_at ? (
              <DetailRow
                label="Expires"
                value={new Date(info.expires_at).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              />
            ) : null}
          </CardContent>
        </Card>

        {/* Identity confirmation */}
        <Card>
          <CardHeader>
            <CardTitle>Confirm Your Identity</CardTitle>
          </CardHeader>
          <CardContent style={s.cardBody}>
            <Text style={s.body}>
              Enter your email address to confirm your identity before submitting your decision.
              {info.parent_email_hint ? (
                `\n\nYour email should end in: ${info.parent_email_hint}`
              ) : ''}
            </Text>
            <View style={s.inputGroup}>
              <Text style={s.label}>Your email address</Text>
              <TextInput
                style={s.input}
                value={confirmEmail}
                onChangeText={setConfirmEmail}
                placeholder="parent@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Confirm your email address"
              />
            </View>
          </CardContent>
        </Card>

        {/* Decision buttons */}
        {!showDeclineForm ? (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.approveBtn, (!canApprove || submitting) && s.btnDisabled]}
              onPress={handleApprove}
              disabled={!canApprove || submitting}
              accessibilityRole="button"
              accessibilityLabel="Approve transfer"
              accessibilityState={{ disabled: !canApprove || submitting }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CheckCircle size={18} color="#fff" />
                  <Text style={s.approveBtnText}>Approve Transfer</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.declineOutlineBtn, !confirmEmail.trim() && s.btnDisabled]}
              onPress={() => setShowDeclineForm(true)}
              disabled={!confirmEmail.trim() || submitting}
              accessibilityRole="button"
              accessibilityLabel="Decline transfer"
              accessibilityState={{ disabled: !confirmEmail.trim() || submitting }}
            >
              <XCircle size={18} color={colors.destructive} />
              <Text style={s.declineOutlineBtnText}>Decline Transfer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Decline form */
          <Card>
            <CardHeader>
              <CardTitle>Reason for Declining</CardTitle>
            </CardHeader>
            <CardContent style={s.cardBody}>
              <Text style={s.body}>
                Please provide a brief reason. This will be shared with the requesting coach.
              </Text>
              <View style={s.inputGroup}>
                <Text style={s.label}>Reason (required)</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={declineReason}
                  onChangeText={setDeclineReason}
                  placeholder="e.g. We are not interested in a transfer at this time."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Reason for declining"
                />
              </View>

              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.declineBtn, (!canDecline || submitting) && s.btnDisabled]}
                  onPress={handleDecline}
                  disabled={!canDecline || submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm decline"
                  accessibilityState={{ disabled: !canDecline || submitting }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.declineBtnText}>Confirm Decline</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => { setShowDeclineForm(false); setDeclineReason(''); }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Footer note */}
        <Text style={s.footerNote}>
          Questions? Contact us at support@offerhound.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Detail row helper ────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },
  content:    { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },

  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.sm },
  h1: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    flex: 1,
    flexWrap: 'wrap',
  },

  legalNotice: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  cardBody:    { gap: spacing.sm },
  body:        { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm, lineHeight: 22 },
  bold:        { fontFamily: typography.fontFamily.heading, color: colors.foreground },
  loadingText: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm, marginTop: spacing.sm },

  detailRow:   { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  detailLabel: { fontFamily: typography.fontFamily.heading, color: colors.foreground, fontSize: typography.fontSize.sm, minWidth: 120 },
  detailValue: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm, flex: 1 },

  inputGroup:  { gap: 6 },
  label:       { fontFamily: typography.fontFamily.heading, color: colors.foreground, fontSize: typography.fontSize.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },

  actionRow:   { flexDirection: 'column', gap: spacing.sm },

  approveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary, borderRadius: 8,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  approveBtnText: { fontFamily: typography.fontFamily.heading, color: '#fff', fontSize: typography.fontSize.sm },

  declineOutlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderColor: colors.destructive, borderRadius: 8,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  declineOutlineBtnText: { fontFamily: typography.fontFamily.heading, color: colors.destructive, fontSize: typography.fontSize.sm },

  declineBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.destructive, borderRadius: 8,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  declineBtnText: { fontFamily: typography.fontFamily.heading, color: '#fff', fontSize: typography.fontSize.sm },

  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  cancelBtnText: { fontFamily: typography.fontFamily.heading, color: colors.mutedForeground, fontSize: typography.fontSize.sm },

  btnDisabled: { opacity: 0.45 },
  primaryBtn: {
    marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 8,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  primaryBtnText: { fontFamily: typography.fontFamily.heading, color: '#fff', fontSize: typography.fontSize.sm },

  footerNote: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
