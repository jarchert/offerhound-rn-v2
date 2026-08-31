/**
 * VisibilityDecisionScreen — parent approve/deny Tier 2 visibility proposal.
 *
 * Deep-link: offerhound://visibility-decision?proposalId=<uuid>
 * Route:     AuthStack → VisibilityDecision  { proposalId: string }
 *
 * RPC (confirmed live against DB):
 *   record_parent_visibility_decision(
 *     p_proposal_id uuid,
 *     p_decision    text,   -- "approve" | "deny"
 *     p_notes       text    -- nullable
 *   )
 *
 * States handled:
 *   loading          — fetching proposal row
 *   error            — Supabase read failure
 *   not-found        — no row for proposalId
 *   expired          — status = "expired" or expires_at in the past
 *   already-decided  — status ∈ {approved, denied, withdrawn}
 *   live             — status ∈ {pending, pending_parent_invite} → show approve/deny UI
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, SafeAreaView,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BackButton } from '@/components/BackButton';
import { useToast } from '@/hooks/use-toast';
import { AuthStackParamList } from '@/navigation/stacks/AuthStack';

type RouteProps = RouteProp<AuthStackParamList, 'VisibilityDecision'>;

interface ProposalRow {
  id: string;
  athlete_profile_id: string;
  proposed_state: string;
  status: string;
  proposed_by_role: string | null;
  proposed_at: string;
  awaiting_parent_user_id: string | null;
  decided_at: string | null;
  decision_notes: string | null;
  expires_at: string | null;
}

const FINAL_STATUSES = ['approved', 'denied', 'withdrawn', 'expired'];
const LIVE_STATUSES  = ['pending', 'pending_parent_invite'];

const STATUS_LABEL: Record<string, string> = {
  approved:              'Already approved',
  denied:                'Already denied',
  withdrawn:             'Proposal withdrawn',
  expired:               'Link expired',
  pending:               'Awaiting your decision',
  pending_parent_invite: 'Awaiting your decision',
};

export default function VisibilityDecisionScreen() {
  const route   = useRoute<RouteProps>();
  const { toast } = useToast();
  const proposalId = route.params?.proposalId;

  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [proposal,   setProposal]   = useState<ProposalRow | null>(null);
  const [athleteName, setAthleteName] = useState<string | null>(null);

  const [notes,      setNotes]      = useState('');
  const [showDeny,   setShowDeny]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Load proposal ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!proposalId) { setError('Missing proposal ID'); setLoading(false); return; }
    (async () => {
      setLoading(true); setError(null);
      const { data, error: readErr } = await supabase
        .from('athlete_visibility_proposals')
        .select('id, athlete_profile_id, proposed_state, status, proposed_by_role, proposed_at, awaiting_parent_user_id, decided_at, decision_notes, expires_at')
        .eq('id', proposalId)
        .maybeSingle();
      if (readErr) { setError(readErr.message); setLoading(false); return; }
      if (!data)   { setError('Proposal not found. The link may be invalid or expired.'); setLoading(false); return; }
      setProposal(data as ProposalRow);

      // Try to resolve athlete display name from player_profiles
      if ((data as ProposalRow).athlete_profile_id) {
        const { data: ap } = await supabase
          .from('player_profiles')
          .select('full_name')
          .eq('id', (data as ProposalRow).athlete_profile_id)
          .maybeSingle();
        if (ap) setAthleteName((ap as any).full_name ?? null);
      }
      setLoading(false);
    })();
  }, [proposalId]);

  // ── Submit decision ────────────────────────────────────────────────────────
  const submitDecision = async (decision: 'approve' | 'deny') => {
    if (!proposal) return;
    setSubmitting(true);
    try {
      const { error: rpcErr } = await (supabase.rpc as any)(
        'record_parent_visibility_decision',
        {
          p_proposal_id: proposal.id,
          p_decision:    decision,
          p_notes:       notes.trim() || null,
        },
      );
      if (rpcErr) throw rpcErr;
      toast({
        title:       decision === 'approve' ? 'Visibility approved' : 'Visibility denied',
        description: decision === 'approve'
          ? 'The athlete profile will become publicly visible.'
          : 'The visibility request has been denied.',
        variant: 'default',
      });
      // Reload to show finalised state
      setProposal(p => p ? { ...p, status: decision === 'approve' ? 'approved' : 'denied' } : p);
      setShowDeny(false);
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e?.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading visibility request…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: hard error / not found ─────────────────────────────────────────
  if (error || !proposal) {
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
              <Text style={s.body}>{error ?? 'Something went wrong. Please try again.'}</Text>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: expired ────────────────────────────────────────────────────────
  const isExpired =
    proposal.status === 'expired' ||
    (proposal.expires_at != null && new Date(proposal.expires_at) < new Date());

  if (isExpired) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.content}>
          <BackButton label="Back" />
          <View style={s.headerRow}>
            <Clock size={28} color={colors.mutedForeground} />
            <Text style={s.h1}>Link Expired</Text>
          </View>
          <Card>
            <CardContent style={s.cardBody}>
              <Text style={s.body}>
                This visibility consent link has expired.
                {proposal.expires_at
                  ? ` It expired on ${new Date(proposal.expires_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.`
                  : ''}
              </Text>
              <Text style={[s.body, { marginTop: spacing.xs }]}>
                Ask the coach to re-submit the visibility proposal if you still want to proceed.
              </Text>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: already finalised ─────────────────────────────────────────────
  if (FINAL_STATUSES.includes(proposal.status)) {
    const icon = proposal.status === 'approved'
      ? <CheckCircle size={28} color={colors.success ?? '#22c55e'} />
      : <XCircle    size={28} color={colors.destructive} />;
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.content}>
          <BackButton label="Back" />
          <View style={s.headerRow}>
            {icon}
            <Text style={s.h1}>{STATUS_LABEL[proposal.status] ?? proposal.status}</Text>
          </View>
          <Card>
            <CardContent style={s.cardBody}>
              {athleteName ? (
                <Text style={s.body}>
                  The visibility request for <Text style={s.bold}>{athleteName}</Text> has
                  already been <Text style={s.bold}>{proposal.status}</Text>.
                </Text>
              ) : (
                <Text style={s.body}>This visibility request has already been {proposal.status}.</Text>
              )}
              {proposal.decided_at ? (
                <Text style={[s.body, { marginTop: spacing.xs }]}>
                  Decision recorded:{' '}
                  {new Date(proposal.decided_at).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </Text>
              ) : null}
              {proposal.decision_notes ? (
                <Text style={[s.body, { marginTop: spacing.xs }]}>
                  Notes: {proposal.decision_notes}
                </Text>
              ) : null}
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: live — awaiting decision ──────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <BackButton label="Back" />

        <View style={s.headerRow}>
          <Shield size={28} color={colors.primary} />
          <Text style={s.h1}>Visibility Consent Request</Text>
        </View>

        <Text style={s.legalNotice}>
          OfferHound™ requires parental consent before any athlete under 18 becomes publicly
          visible. You can revoke consent at any time from your parent dashboard.
        </Text>

        {/* Proposal details */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent style={s.cardBody}>
            {athleteName ? (
              <DetailRow label="Athlete" value={athleteName} />
            ) : null}
            <DetailRow label="Requested visibility" value={proposal.proposed_state ?? '—'} />
            {proposal.proposed_by_role ? (
              <DetailRow label="Requested by" value={proposal.proposed_by_role} />
            ) : null}
            <DetailRow
              label="Submitted"
              value={new Date(proposal.proposed_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            />
            {proposal.expires_at ? (
              <DetailRow
                label="Expires"
                value={new Date(proposal.expires_at).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              />
            ) : null}
          </CardContent>
        </Card>

        {/* Optional notes field (shared by both approve and deny paths) */}
        {showDeny ? (
          <Card>
            <CardHeader>
              <CardTitle>Reason for Denying</CardTitle>
            </CardHeader>
            <CardContent style={s.cardBody}>
              <Text style={s.body}>
                Optional: provide a brief reason. This will be visible to the requesting coach.
              </Text>
              <View style={s.inputGroup}>
                <Text style={s.label}>Notes (optional)</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Not ready for public visibility at this time."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Reason for denying"
                />
              </View>
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.denyBtn, submitting && s.btnDisabled]}
                  onPress={() => submitDecision('deny')}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm deny"
                  accessibilityState={{ disabled: submitting }}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.denyBtnText}>Confirm Deny</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => { setShowDeny(false); setNotes(''); }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        ) : (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.approveBtn, submitting && s.btnDisabled]}
              onPress={() => submitDecision('approve')}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Approve visibility"
              accessibilityState={{ disabled: submitting }}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : (
                  <>
                    <CheckCircle size={18} color="#fff" />
                    <Text style={s.approveBtnText}>Approve Visibility</Text>
                  </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.denyOutlineBtn, submitting && s.btnDisabled]}
              onPress={() => setShowDeny(true)}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Deny visibility"
              accessibilityState={{ disabled: submitting }}
            >
              <XCircle size={18} color={colors.destructive} />
              <Text style={s.denyOutlineBtnText}>Deny Visibility</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={s.footerNote}>
          Questions? Contact us at support@offerhound.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

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
    flex: 1, flexWrap: 'wrap',
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
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: spacing.sm, paddingVertical: 10,
    fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm,
    color: colors.foreground, backgroundColor: colors.background,
  },
  textArea:    { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },
  actionRow:   { flexDirection: 'column', gap: spacing.sm },
  approveBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary, borderRadius: 8,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  approveBtnText: { fontFamily: typography.fontFamily.heading, color: '#fff', fontSize: typography.fontSize.sm },
  denyOutlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderColor: colors.destructive, borderRadius: 8,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  denyOutlineBtnText: { fontFamily: typography.fontFamily.heading, color: colors.destructive, fontSize: typography.fontSize.sm },
  denyBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.destructive, borderRadius: 8,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  denyBtnText:  { fontFamily: typography.fontFamily.heading, color: '#fff', fontSize: typography.fontSize.sm },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  cancelBtnText: { fontFamily: typography.fontFamily.heading, color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  btnDisabled:   { opacity: 0.45 },
  footerNote: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
