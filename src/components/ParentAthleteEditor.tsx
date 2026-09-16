// ParentAthleteEditor — RN port of MAIN src/pages/MinorInvite.tsx
//
// Full state-machine screen for the minor-safe under-13 profile-creation flow:
//
//   loading       → spinner
//   error         → error card
//   not_found     → "Invitation not found" card
//   expired       → "Invitation expired" card
//   voided        → "Invitation replaced" card
//   consumed      → "Profile already created" card
//   valid + !emailMatches → ParentAuthStep (sign-in/sign-up locked to parentEmail)
//   valid + emailMatches  → MinorProfileForm (minimized fields + itemized consent)
//   createdProfileId set  → success card + "Go to parent dashboard" CTA
//
// Routing: registered as a root Stack.Screen so it's reachable both via deep
// link (offerhoundv2://minor-invite/:token) and from any in-app path.
// Token is passed as route.params.token.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react-native';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useMinorProfileInvitation } from '@/hooks/useMinorProfileInvitation';
import { ParentAuthStep } from '@/components/minor-invite/ParentAuthStep';
import { MinorProfileForm } from '@/components/minor-invite/MinorProfileForm';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Route = RouteProp<RootStackParamList, 'MinorInvite'>;

// ─── Terminal status card (not_found / expired / voided / consumed) ───────────

interface StatusCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone?: 'muted' | 'destructive';
  onHome: () => void;
}

function StatusCard({ icon, title, body, tone = 'muted', onHome }: StatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <View style={s.statusHeaderRow}>
          <View style={s.statusIcon}>{icon}</View>
          <CardTitle>{title}</CardTitle>
        </View>
      </CardHeader>
      <CardContent>
        <Text style={s.statusBody}>{body}</Text>
        <Button variant="outline" onPress={onHome} style={s.homeBtn}>
          Return to OfferHound
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ParentAthleteEditor() {
  const nav = useNavigation<any>();
  const route = useRoute<Route>();
  const token = route.params?.token;

  const { loading, error, invitation, sessionEmail, parentEmail } =
    useMinorProfileInvitation(token);

  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);

  const emailMatches =
    !!sessionEmail && !!parentEmail && sessionEmail === parentEmail;

  const goHome = () => {
    try {
      nav.navigate('ParentTabs');
    } catch {
      nav.reset({ index: 0, routes: [{ name: 'PublicTabs' }] });
    }
  };

  const goParentDashboard = () => {
    nav.navigate('ParentTabs');
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.brand}>OFFERHOUND™</Text>
          <Text style={s.subtitle}>Parent Profile Invitation</Text>
        </View>

        {/* ── Loading ── */}
        {loading && (
          <Card>
            <CardContent style={s.loadingContent}>
              <ActivityIndicator color={colors.primary} />
              <Text style={s.loadingText}>Checking your invitation…</Text>
            </CardContent>
          </Card>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <StatusCard
            tone="destructive"
            icon={<AlertTriangle size={22} color={colors.destructive} />}
            title="Something went wrong"
            body={error}
            onHome={goHome}
          />
        )}

        {/* ── not_found ── */}
        {!loading && !error && invitation?.state === 'not_found' && (
          <StatusCard
            tone="destructive"
            icon={<XCircle size={22} color={colors.destructive} />}
            title="Invitation not found"
            body="This invitation link isn't valid. Please check that you copied the full link from your email, or ask your child's coach to send a new invite."
            onHome={goHome}
          />
        )}

        {/* ── expired ── */}
        {!loading && !error && invitation?.state === 'expired' && (
          <StatusCard
            tone="destructive"
            icon={<Clock size={22} color={colors.destructive} />}
            title="Invitation expired"
            body="This invitation has expired for your child's safety. Ask your child's coach to resend the parent invite and you'll get a fresh link."
            onHome={goHome}
          />
        )}

        {/* ── voided ── */}
        {!loading && !error && invitation?.state === 'voided' && (
          <StatusCard
            tone="destructive"
            icon={<XCircle size={22} color={colors.destructive} />}
            title="Invitation replaced"
            body="A newer invitation was sent to you, which cancelled this one. Please open the most recent email from OfferHound and use that link instead."
            onHome={goHome}
          />
        )}

        {/* ── consumed ── */}
        {!loading && !error && invitation?.state === 'consumed' && (
          <StatusCard
            icon={<CheckCircle2 size={22} color={colors.primary} />}
            title="Profile already created"
            body="This invitation has already been used to create your child's profile. Sign in to your parent account to view or manage it."
            onHome={goHome}
          />
        )}

        {/* ── valid ── */}
        {!loading && !error && invitation?.state === 'valid' && (
          <Card>
            <CardHeader>
              <Badge variant="secondary" style={s.badgeRow}>
                <ShieldCheck size={13} color={colors.mutedForeground} />
                <Text style={s.badgeText}> Minor-Safe Profile</Text>
              </Badge>
              <CardTitle style={s.cardTitle}>
                {createdProfileId
                  ? 'Profile created'
                  : `Create ${invitation.athlete_name ?? 'your child'}'s profile`}
              </CardTitle>
            </CardHeader>

            <CardContent style={s.cardContent}>
              {/* ── Success state ── */}
              {createdProfileId ? (
                <View style={s.successWrap}>
                  <View style={s.successBanner}>
                    <CheckCircle2 size={18} color={colors.primary} />
                    <Text style={s.successText}>
                      {invitation.athlete_name ?? 'Your child'}'s minor-safe
                      profile is created and linked to your parent account. It is
                      private and visible only to their team's coaches. You can
                      add a profile photo later from your parent dashboard.
                    </Text>
                  </View>
                  <Button onPress={goParentDashboard}>
                    Go to my parent dashboard
                  </Button>
                </View>
              ) : (
                <>
                  {/* Invitation summary */}
                  <View style={s.summaryBox}>
                    {[
                      ['Athlete', invitation.athlete_name],
                      ['Team', invitation.team_name],
                      ['Club', invitation.club_name],
                      ['Sent to', invitation.parent_email_masked],
                      ['Link expires', invitation.expires_at
                        ? new Date(invitation.expires_at).toLocaleString()
                        : null],
                    ].map(([label, value]) => (
                      <View key={label as string} style={s.summaryRow}>
                        <Text style={s.summaryLabel}>{label}</Text>
                        <Text style={s.summaryValue}>{value ?? '—'}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={s.minorNote}>
                    Because your child is under 13, OfferHound collects only the
                    minimum information needed and keeps their profile private and
                    coach-visible only. You'll review every item before anything
                    is saved.
                  </Text>

                  {/* ── Auth gate or form ── */}
                  {!emailMatches ? (
                    parentEmail ? (
                      <ParentAuthStep
                        parentEmail={parentEmail}
                        sessionEmail={sessionEmail}
                      />
                    ) : (
                      <Text style={s.emailLoadErr}>
                        We couldn't load the invited email address for this link.
                        Please reopen the link from your invitation email.
                      </Text>
                    )
                  ) : (
                    <MinorProfileForm
                      token={token as string}
                      athleteName={invitation.athlete_name}
                      teamName={invitation.team_name}
                      onCreated={setCreatedProfileId}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default ParentAthleteEditor;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  header: { alignItems: 'center', gap: 4 },
  brand: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 28,
    letterSpacing: 2,
    color: colors.primary,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },

  // Loading
  loadingContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  loadingText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },

  // Status card
  statusHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusIcon: {},
  statusBody: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, lineHeight: 20, marginBottom: spacing.sm },
  homeBtn: { marginTop: spacing.xs },

  // Valid card
  badgeRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: spacing.xs },
  badgeText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  cardTitle: { marginTop: spacing.xs },
  cardContent: { gap: spacing.sm },

  // Summary table
  summaryBox: {
    backgroundColor: `${colors.muted}50`,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  summaryLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, flexShrink: 0 },
  summaryValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground, textAlign: 'right', flex: 1 },

  minorNote: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  emailLoadErr: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.destructive,
  },

  // Success
  successWrap: { gap: spacing.sm },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    borderRadius: 8,
    padding: spacing.sm,
  },
  successText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
});
