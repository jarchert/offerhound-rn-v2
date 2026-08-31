// ParentAuthStep — RN port of MAIN src/components/minor-invite/ParentAuthStep.tsx
//
// Shown inside ParentAthleteEditor when invitation.state === 'valid' but the
// current session email does NOT yet match the invited parentEmail.
//
// Security properties:
//   1. Client-side password validation: ≥ 8 chars before any auth call.
//   2. If signup fails with /already registered/i, auto-switch to sign-in
//      with a specific message (not a generic error).
//   3. After successful auth, defense-in-depth re-check: fetch the actual
//      signed-in user email via supabase.auth.getUser() and confirm it
//      matches parentEmail before calling onAuthenticated.
//   4. Specific "invalid login" copy for credential mismatch.
//   5. Locked email field with Lock icon + helper text explaining why.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { ShieldCheck, Lock } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { colors, typography, spacing } from '@/lib/theme';

interface ParentAuthStepProps {
  /** The exact email this invitation was sent to — pre-filled and read-only. */
  parentEmail: string;
  /** The currently signed-in session email (null if not signed in). */
  sessionEmail: string | null;
  /** Called after a successful sign-in or sign-up AND after the defense-in-depth
   *  re-check confirms the signed-in email matches parentEmail. */
  onAuthenticated?: () => void;
}

type SubTab = 'signin' | 'signup';

// Patterns that map to specific user-facing copy instead of a raw error message.
const INVALID_LOGIN_RE = /invalid login credentials/i;
const ALREADY_REGISTERED_RE = /already registered/i;

export function ParentAuthStep({
  parentEmail,
  sessionEmail,
  onAuthenticated,
}: ParentAuthStepProps) {
  const { signInWithEmail, signUpWithEmail, signOut } = useAuth();

  const [tab, setTab] = useState<SubTab>('signin');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // If a *different* account is already signed in, show a sign-out prompt first.
  const wrongAccount = !!sessionEmail && sessionEmail !== parentEmail;

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  // --- Requirement 1: client-side password validation before any auth call ---
  const validate = (): string | null => {
    if (!password || password.length < 8)
      return 'Password must be at least 8 characters.';
    if (tab === 'signup' && password !== confirm)
      return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setFieldError(null);
    setLoading(true);

    try {
      if (tab === 'signup') {
        const { error } = await signUpWithEmail(parentEmail, password);

        if (error) {
          // --- Requirement 2: already-registered auto-switch ---
          if (ALREADY_REGISTERED_RE.test(error.message)) {
            setTab('signin');
            setPassword('');
            setConfirm('');
            setFieldError(
              'An account already exists for this email. Enter your password to sign in.',
            );
          } else {
            setFieldError(error.message);
          }
          return;
        }
      } else {
        const { error } = await signInWithEmail(parentEmail, password);

        if (error) {
          // --- Requirement 4: specific invalid-login copy ---
          if (INVALID_LOGIN_RE.test(error.message)) {
            setFieldError(
              "That password doesn't match this email. Try again or reset your password.",
            );
          } else {
            setFieldError(error.message);
          }
          return;
        }
      }

      // --- Requirement 3: defense-in-depth re-check after successful auth ---
      // Even though signIn/signUp succeeded, fetch the actual signed-in user
      // from the Supabase server to confirm the email still matches.
      // This is a second check on top of the RPC's own server-side check.
      const { data: meData } = await supabase.auth.getUser();
      const actualEmail = meData?.user?.email ?? null;

      if (!actualEmail || actualEmail.toLowerCase() !== parentEmail.toLowerCase()) {
        // This should never happen in normal flow, but abort and sign out
        // to prevent a mismatched session from reaching the form.
        await signOut();
        setFieldError(
          'A session mismatch was detected. Please try again.',
        );
        return;
      }

      onAuthenticated?.();
    } finally {
      setLoading(false);
    }
  };

  // Wrong-account prompt — sign out before proceeding.
  if (wrongAccount) {
    return (
      <View style={s.container}>
        <View style={[s.banner, s.bannerWarn]}>
          <ShieldCheck size={16} color={colors.destructive} />
          <Text style={[s.bannerText, { color: colors.destructive }]}>
            You're signed in as{' '}
            <Text style={s.bold}>{sessionEmail}</Text>, but this invitation
            was sent to <Text style={s.bold}>{parentEmail}</Text>. Sign out
            and use the invited email to continue.
          </Text>
        </View>
        <Button
          variant="destructive"
          onPress={handleSignOut}
          loading={loading}
        >
          Sign out
        </Button>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.banner}>
        <ShieldCheck size={15} color={colors.primary} />
        <Text style={s.bannerText}>
          Sign in or create an account with{' '}
          <Text style={s.bold}>{parentEmail}</Text> to continue. This address
          is locked to this invitation.
        </Text>
      </View>

      {/* Sub-tab switcher */}
      <View style={s.tabRow}>
        <Button
          variant={tab === 'signin' ? 'default' : 'ghost'}
          size="sm"
          style={s.tabBtn}
          onPress={() => { setTab('signin'); setFieldError(null); }}
        >
          Sign in
        </Button>
        <Button
          variant={tab === 'signup' ? 'default' : 'ghost'}
          size="sm"
          style={s.tabBtn}
          onPress={() => { setTab('signup'); setFieldError(null); }}
        >
          Create account
        </Button>
      </View>

      {/* Email — locked with icon + helper text (Requirement 5) */}
      <View>
        <Label>Email</Label>
        {/* Wrapper gives us a positioning context for the lock icon overlay */}
        <View style={s.lockedWrapper}>
          <Input
            value={parentEmail}
            editable={false}
            autoCapitalize="none"
            keyboardType="email-address"
            style={s.lockedInput}
            containerStyle={s.lockedInputContainer}
          />
          {/* --- Requirement 5: Lock icon positioned inside the input on the right --- */}
          <View style={s.lockIconWrapper} pointerEvents="none">
            <Lock size={14} color={colors.mutedForeground} />
          </View>
        </View>
        {/* --- Requirement 5: helper text explaining why it's locked --- */}
        <Text style={s.lockedHint}>
          This email address is set by the invitation and cannot be changed.
        </Text>
      </View>

      {/* Password */}
      <View>
        <Label>Password</Label>
        <Input
          value={password}
          onChangeText={(t) => { setPassword(t); setFieldError(null); }}
          secureTextEntry
          autoCapitalize="none"
          placeholder={tab === 'signup' ? 'Min. 8 characters' : ''}
        />
      </View>

      {tab === 'signup' && (
        <View>
          <Label>Confirm password</Label>
          <Input
            value={confirm}
            onChangeText={(t) => { setConfirm(t); setFieldError(null); }}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
      )}

      {fieldError ? (
        <Text style={s.error} accessibilityRole="alert">
          {fieldError}
        </Text>
      ) : null}

      <Button
        onPress={handleSubmit}
        loading={loading}
        disabled={!password || loading}
      >
        {tab === 'signin' ? 'Sign in' : 'Create account'}
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    borderRadius: 8,
    padding: spacing.sm,
  },
  bannerWarn: {
    backgroundColor: `${colors.destructive}12`,
    borderColor: `${colors.destructive}40`,
  },
  bannerText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  bold: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tabBtn: {
    flex: 1,
  },
  lockedWrapper: {
    position: 'relative',
  },
  lockedInputContainer: {},
  lockedInput: {
    opacity: 0.6,
    paddingRight: spacing.md + 20, // make room for the lock icon on the right
  },
  lockIconWrapper: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  lockedHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  error: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.destructive,
  },
});
