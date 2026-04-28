// CoachReferencesManager — RN port of offerhound-repo/src/components/CoachReferencesManager.tsx
//
// Lets athletes request references from coaches. Each request:
//   1. Inserts a row in `coach_references` (athlete_profile_id, coach_name,
//      coach_email, coach_school, invitation_status='pending', invitation_token).
//   2. Builds an onboarding link the coach can use to sign up + finish their
//      coach onboarding flow with the request pre-attached.
//   3. Copies the link to the clipboard for sharing.
//
// Web → RN translations:
//   - shadcn Card/Input/Label/Select/Badge → src/components/ui/* equivalents
//   - lucide-react → lucide-react-native
//   - sonner toast → use-toast (react-native-toast-message shim)
//   - navigator.clipboard.writeText → expo-clipboard via expo-clipboard
//   - window.location.origin → APP_PUBLIC_URL constant (parity-equivalent web URL)
//   - crypto.randomUUID() → polyfilled via expo-crypto if available, else fallback
//   - useQuery (react-query) preserved
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import {
  UserPlus,
  Mail,
  CheckCircle2,
  Clock,
  Copy,
  Link2,
} from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

type CoachType = 'highschool' | 'club' | 'college';

const APP_PUBLIC_URL = 'https://offerhound.com';

const buildOnboardingUrl = (token: string, type: CoachType) => {
  const onboardingPath = `/coach/onboarding?ref_token=${token}&coach_type=${type}`;
  return `${APP_PUBLIC_URL}/auth?redirect=${encodeURIComponent(onboardingPath)}`;
};

// RN-safe UUID helper. expo-crypto may not always be installed; fall back to a
// time + random scheme that's "good enough" for invitation tokens.
const randomToken = (): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ec = require('expo-crypto');
    if (ec?.randomUUID) return ec.randomUUID();
  } catch {
    /* fallthrough */
  }
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  );
};

interface Props {
  profileId?: string;
}

export function CoachReferencesManager({ profileId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [coachType, setCoachType] = useState<CoachType>('highschool');
  const [latestLink, setLatestLink] = useState('');
  const { toast } = useToast();

  const { data: references = [], refetch } = useQuery({
    queryKey: ['coach-references', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data } = await supabase
        .from('coach_references' as any)
        .select(
          'id, coach_name, coach_email, coach_school, invitation_status, invitation_token, submitted_at'
        )
        .eq('athlete_profile_id', profileId)
        .order('created_at', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!profileId,
  });

  const handleRequest = async () => {
    if (!profileId || !name || !email) return;
    const token = randomToken();
    const { data, error } = await supabase
      .from('coach_references' as any)
      .insert({
        athlete_profile_id: profileId,
        coach_name: name,
        coach_email: email,
        coach_school: school || null,
        invitation_status: 'pending',
        invitation_token: token,
        invitation_sent_at: new Date().toISOString(),
      })
      .select('invitation_token')
      .single();
    if (error || !data) {
      toast({ title: 'Failed to send reference request', variant: 'destructive' });
      return;
    }
    const link = buildOnboardingUrl((data as any).invitation_token, coachType);
    setLatestLink(link);
    try {
      await Clipboard.setStringAsync(link);
    } catch {
      /* ignore */
    }
    toast({
      title: `Invitation ready for ${name}`,
      description: 'Link copied to clipboard.',
    });
    setName('');
    setEmail('');
    setSchool('');
    refetch();
  };

  const copyLinkFor = async (token: string) => {
    const link = buildOnboardingUrl(token, coachType);
    setLatestLink(link);
    await Clipboard.setStringAsync(link);
    toast({ title: 'Coach invitation link copied' });
  };

  return (
    <Card>
      <CardHeader>
        <View style={s.headerRow}>
          <View style={s.titleRow}>
            <Mail size={18} color={colors.foreground} />
            <CardTitle>Coach References</CardTitle>
          </View>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<UserPlus size={14} color={colors.foreground} />}
            onPress={() => setShowForm((v) => !v)}
          >
            Request
          </Button>
        </View>
      </CardHeader>
      <CardContent>
        <View style={{ gap: spacing.md }}>
          {showForm && (
            <View style={s.formCard}>
              <View style={{ gap: 4 }}>
                <Label>Coach Type</Label>
                <Select value={coachType} onValueChange={(v) => setCoachType(v as CoachType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highschool">High School Coach</SelectItem>
                    <SelectItem value="club">Club Coach</SelectItem>
                    <SelectItem value="college">College Coach</SelectItem>
                  </SelectContent>
                </Select>
              </View>
              <Input label="Coach Name" value={name} onChangeText={setName} placeholder="Coach name" />
              <Input
                label="Coach Email"
                value={email}
                onChangeText={setEmail}
                placeholder="coach@school.edu"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="School / Organization (optional)"
                value={school}
                onChangeText={setSchool}
                placeholder="Lincoln High School"
              />
              <Button onPress={handleRequest} disabled={!name || !email} size="sm">
                Send Reference + Onboarding Invite
              </Button>
              <Text style={s.helper}>
                We'll generate an invitation link that lets the coach sign up to OfferHound and
                complete the {coachType === 'highschool' ? 'High School' : coachType === 'club' ? 'Club' : 'College'} Coach onboarding flow.
              </Text>
            </View>
          )}

          {!!latestLink && (
            <View style={s.linkCard}>
              <Link2 size={14} color={colors.primary} />
              <Text style={s.linkText} numberOfLines={2}>
                {latestLink}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => Clipboard.setStringAsync(latestLink).then(() => toast({ title: 'Copied!' }))}
              >
                <Copy size={14} color={colors.foreground} />
              </Button>
            </View>
          )}

          {references.length === 0 && !showForm && (
            <Text style={s.empty}>
              No references yet. Request one from a coach who knows your abilities.
            </Text>
          )}

          {references.map((ref: any) => (
            <View key={ref.id} style={s.refRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.refName} numberOfLines={1}>
                  {ref.coach_name}
                </Text>
                <Text style={s.refMeta} numberOfLines={1}>
                  {ref.coach_email}
                  {ref.coach_school ? ` · ${ref.coach_school}` : ''}
                </Text>
              </View>
              <View style={s.refActions}>
                {!ref.submitted_at && ref.invitation_token && (
                  <Button variant="ghost" size="sm" onPress={() => copyLinkFor(ref.invitation_token)}>
                    <Copy size={14} color={colors.foreground} />
                  </Button>
                )}
                <View style={[s.statusPill, ref.submitted_at ? s.statusPillDone : s.statusPillPending]}>
                  {ref.submitted_at ? (
                    <CheckCircle2 size={12} color={colors.primaryForeground} />
                  ) : (
                    <Clock size={12} color={colors.foreground} />
                  )}
                  <Text style={[s.statusText, ref.submitted_at && { color: colors.primaryForeground }]}>
                    {ref.submitted_at ? 'Submitted' : ref.invitation_status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </CardContent>
    </Card>
  );
}

export default CoachReferencesManager;

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  formCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    gap: spacing.sm,
  },
  helper: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.muted,
  },
  linkText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  empty: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  refMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  refActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillDone: { backgroundColor: colors.primary },
  statusPillPending: { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
  statusText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: 11, color: colors.foreground },
});
