// MinorProfileForm — RN port of MAIN src/components/minor-invite/MinorProfileForm.tsx
//
// Minimized-field form for under-13 profile creation via redeem_minor_profile_invitation.
// Fields: first name, last initial (exactly 1 char), sport (optional), position (optional),
//         city (optional), state (2-char, optional), itemized consent checkbox.
//
// Error codes are mapped to parent-facing copy that matches MAIN verbatim.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Loader2, CheckSquare, Square } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';
import { SPORTS_LIST } from '@/lib/data/sports';
import { colors, typography, spacing } from '@/lib/theme';

interface MinorProfileFormProps {
  token: string;
  athleteName: string | null;
  teamName: string | null;
  onCreated: (profileId: string) => void;
}

/** Maps the RPC's raised error codes to plain-language parent-facing copy.
 *  Matches MAIN's ERROR_COPY map verbatim. */
const ERROR_COPY: Record<string, string> = {
  invitation_already_consumed:
    "This invitation has already been used — your child's profile exists. Sign in to your parent dashboard to view it.",
  invitation_voided:
    'This invitation was replaced by a newer one. Please open the most recent OfferHound email and use that link.',
  invitation_expired:
    "This invitation has expired for your child's safety. Ask their coach to resend the parent invite.",
  invitation_not_found:
    "We couldn't find this invitation. Check that you used the full link from your email.",
  email_mismatch:
    "The email on your account doesn't match the address this invitation was sent to. Sign out and sign back in with the invited email.",
  roster_already_linked:
    "A profile is already linked to this roster spot. Contact your child's coach if that looks wrong.",
  roster_missing_date_of_birth:
    "Your child's date of birth is missing from the team roster, so we can't apply the correct minor-safe protections. Ask their coach to add it, then reopen this link.",
  not_authenticated:
    'Your session expired. Please sign in again to finish creating the profile.',
  name_required:
    "Please enter your child's first name and last initial.",
};

function resolveErrorMessage(raw: string): string {
  const key = Object.keys(ERROR_COPY).find((k) => raw.includes(k));
  return key
    ? ERROR_COPY[key]
    : "We couldn't create the profile just now. Please try again in a moment.";
}

export function MinorProfileForm({
  token,
  athleteName,
  teamName,
  onCreated,
}: MinorProfileFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastInitial, setLastInitial] = useState('');
  const [sport, setSport] = useState<string>('');
  const [position, setPosition] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastInitial.trim().length === 1 &&
    consented &&
    !submitting;

  const handleSubmit = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const { data, error } = await (supabase.rpc as any)(
        'redeem_minor_profile_invitation',
        {
          p_token: token,
          p_first_name: firstName.trim(),
          p_last_initial: lastInitial.trim().charAt(0).toUpperCase(),
          p_sport: sport || null,
          p_position: position.trim() || null,
          p_city: city.trim() || null,
          p_state: stateCode.trim().toUpperCase() || null,
        },
      );

      if (error) {
        setErrorMsg(resolveErrorMessage(error.message));
        return;
      }

      onCreated(data as unknown as string);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.form}>
      {/* ── Name row ── */}
      <View style={s.nameRow}>
        <View style={s.firstNameCol}>
          <Label>Child's first name *</Label>
          <Input
            value={firstName}
            onChangeText={setFirstName}
            maxLength={40}
            autoCapitalize="words"
            placeholder="Jordan"
          />
        </View>
        <View style={s.initialCol}>
          <Label>Last initial *</Label>
          <Input
            value={lastInitial}
            onChangeText={(t) => setLastInitial(t.slice(0, 1))}
            maxLength={1}
            autoCapitalize="characters"
            placeholder="M"
          />
        </View>
      </View>
      <Text style={s.hint}>
        We only store a first name and last initial for athletes under 13 — for
        example "Jordan M."
      </Text>

      {/* ── Sport + Position ── */}
      <View style={s.row2}>
        <View style={s.half}>
          <Label>Sport</Label>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger>
              <SelectValue
                placeholder={teamName ? `Use ${teamName}'s sport` : 'Use team sport'}
              />
            </SelectTrigger>
            <SelectContent>
              {SPORTS_LIST.map((sp) => (
                <SelectItem key={sp.id} value={sp.id}>
                  {(sp as any).displayName || sp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
        <View style={s.half}>
          <Label>Position (optional)</Label>
          <Input
            value={position}
            onChangeText={setPosition}
            maxLength={40}
            placeholder="QB"
          />
        </View>
      </View>

      {/* ── City + State ── */}
      <View style={s.row2}>
        <View style={s.cityCol}>
          <Label>City (optional)</Label>
          <Input
            value={city}
            onChangeText={setCity}
            maxLength={60}
            placeholder="Austin"
          />
        </View>
        <View style={s.stateCol}>
          <Label>State (optional)</Label>
          <Input
            value={stateCode}
            onChangeText={(t) => setStateCode(t.slice(0, 2))}
            maxLength={2}
            autoCapitalize="characters"
            placeholder="TX"
          />
        </View>
      </View>

      {/* ── Itemized consent ── */}
      <View style={s.consentBox}>
        <Text style={s.consentTitle}>Exactly what we collect, and why</Text>
        <View style={s.consentList}>
          <Text style={s.consentItem}>
            <Text style={s.consentBold}>First name + last initial</Text>
            {' — so coaches on '}
            {teamName ? (
              <Text style={s.consentBold}>{teamName}</Text>
            ) : (
              "your child's team"
            )}
            {' can identify '}
            {athleteName ?? 'your child'}
            {' on the roster. We never display a full last name for an athlete under 13.'}
          </Text>
          <Text style={s.consentItem}>
            <Text style={s.consentBold}>Sport and position</Text>
            {' — so the roster and team tools group your child correctly.'}
          </Text>
          <Text style={s.consentItem}>
            <Text style={s.consentBold}>City and state</Text>
            {' — optional, used only for team logistics such as travel and event grouping. Never a street address.'}
          </Text>
          <Text style={s.consentItem}>
            <Text style={s.consentBold}>Date of birth</Text>
            {' — already provided by the coach. Used solely to apply age protections and never shown on the profile.'}
          </Text>
        </View>
        <Text style={s.consentNot}>
          We do <Text style={s.consentBold}>not</Text> collect your child's
          phone number, email address, school, height, weight, highlight video,
          social accounts, or GPA at this age.
        </Text>
        <Text style={s.consentNot}>
          Because your child is under 15, their profile can never be made
          publicly visible or searchable on the internet. It stays private and
          visible only to their own team's coaches. Recruiters cannot find or
          contact them, and you can delete the profile at any time from your
          parent dashboard.
        </Text>

        {/* Consent checkbox + label in a single tappable row */}
        <Pressable
          style={s.checkRow}
          onPress={() => setConsented((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consented }}
          accessibilityLabel="Parental consent"
        >
          {consented
            ? <CheckSquare size={18} color={colors.primary} />
            : <Square size={18} color={colors.mutedForeground} />}
          <Text style={s.checkLabel}>
            I am this child's parent or legal guardian, and I consent to
            OfferHound collecting and storing exactly the information listed
            above for this minor-safe profile.
          </Text>
        </Pressable>
      </View>

      {errorMsg ? (
        <Text style={s.error} accessibilityRole="alert">{errorMsg}</Text>
      ) : null}

      <Text style={s.hint}>
        You can add a profile photo later from your parent dashboard.
      </Text>

      <Button
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={submitting}
        leftIcon={submitting ? <Loader2 size={16} color={colors.primaryForeground} /> : undefined}
      >
        Create my child's profile
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  form: { gap: spacing.sm },
  nameRow: { flexDirection: 'row', gap: spacing.sm },
  firstNameCol: { flex: 2 },
  initialCol: { flex: 1 },
  row2: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  cityCol: { flex: 2 },
  stateCol: { flex: 1 },
  hint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginTop: -spacing.xs,
  },
  consentBox: {
    backgroundColor: `${colors.muted}60`,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  consentTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    marginBottom: 2,
  },
  consentList: { gap: 6 },
  consentItem: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    lineHeight: 17,
  },
  consentBold: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
  },
  consentNot: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    lineHeight: 17,
    marginTop: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  checkLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    lineHeight: 17,
  },
  error: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.destructive,
  },
});
