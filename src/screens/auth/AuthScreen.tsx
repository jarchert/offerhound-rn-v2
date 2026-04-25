// AuthScreen — RN port of Lovable web src/pages/Auth.tsx (413 LOC).
// Combined sign-in / sign-up tabs + forgot-password subview + post-link reset-mode subview.
// In native we don't have URL `?mode=reset` query params — that flow lands on
// PasswordResetScreen via deep-link. AuthScreen still exposes the in-place reset
// branch so it can be reused if invoked with `route.params.mode === 'reset'` (e.g.
// magic-link handler dispatches both navigation patterns during transition).
//
// Translation notes (web → native):
// - shadcn Tabs → simple two-button segmented control.
// - shadcn Card → Card / CardHeader / CardTitle / CardContent / CardFooter from ui/Card.
// - shadcn PasswordInput → TextInput with secureTextEntry (no eye toggle yet).
// - lucide-react → lucide-react-native.
// - useToast → Alert.alert.
// - useNavigate("/parent/dashboard") → nav.navigate('Parent', { screen: 'Dashboard' }) etc.
//   For now we surface a successful link via Alert and leave routing to AuthGate.
// - Role-based redirect after login is handled centrally by AuthGate; we no longer
//   inline that switch here (simpler RN surface).
// - useBiometricAuth: the RN app does not yet expose this hook; biometric branch is
//   PORT-PENDING and gated behind `false` for now.
// - SocialLoginButtons component already exists as a stub in src/components.
// - DOB picker uses TextInput type="date" on web; on RN we use a plain text input
//   with YYYY-MM-DD hint until a native date picker is wired.
//
// PORT-PENDING:
//   * Biometric sign-in branch (web src/hooks/useBiometricAuth not ported yet).
//   * Parent-token invitation handling: web reads `?parent_token=`. We accept it via
//     route params and run the same supabase.from('parent_athlete_relationships') flow.
//   * Share-card invite signup conversion analytics (best-effort) — not yet wired.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp, NavigationProp } from '@react-navigation/native';
import { Mail, Lock, ArrowLeft } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

type AuthMode = 'signin' | 'signup' | 'reset';

type AuthRouteParams = {
  mode?: AuthMode;
  parent_token?: string;
  redirect?: string;
};

const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Please enter a valid email address';
const validatePassword = (pw: string) =>
  pw.length >= 6 ? null : 'Password must be at least 6 characters';

function validateAge(dob: string): string | null {
  if (!dob) return 'Date of birth is required';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 'Enter a valid date';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 13) {
    return 'You must be at least 13 to create an account. Ask a parent to register and add you as their athlete.';
  }
  if (age > 120) return 'Enter a valid date of birth';
  return null;
}

export default function AuthScreen() {
  const nav = useNavigation<NavigationProp<any>>();
  const route = useRoute<RouteProp<Record<string, AuthRouteParams>, string>>();
  const { signInWithEmail, signUpWithEmail, user } = useAuth();

  const initialMode: AuthMode = route.params?.mode === 'signup' ? 'signup' : 'signin';
  const initialReset = route.params?.mode === 'reset';

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(
    initialMode === 'signup' ? 'signup' : 'signin',
  );
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(initialReset);
  const [parentToken, setParentToken] = useState<string | null>(route.params?.parent_token ?? null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [dobError, setDobError] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // If parent_token arrives, default to signup tab.
  useEffect(() => {
    if (parentToken) setActiveTab('signup');
  }, [parentToken]);

  // Parent-athlete linking: once user is signed in with a token in scope.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || !parentToken) return;
      try {
        const { data: invitation, error: findError } = await supabase
          .from('parent_athlete_relationships')
          .select('*')
          .eq('invitation_token', parentToken)
          .single();
        if (cancelled) return;
        if (findError || !invitation) {
          Alert.alert('Invalid Invitation', 'This invitation link is invalid or has expired.');
          setParentToken(null);
          return;
        }
        const { error: updateError } = await supabase
          .from('parent_athlete_relationships')
          .update({ parent_user_id: user.id, invitation_accepted: true, invitation_token: null })
          .eq('id', (invitation as any).id);
        if (updateError) throw updateError;
        Alert.alert('Linked to athlete!', 'You now have full parent access to this profile.');
        setParentToken(null);
      } catch (err) {
        console.error('[AuthScreen] parent link failed', err);
        Alert.alert('Error', 'Failed to link your account. Please try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, parentToken]);

  const validateForm = (isSignUp: boolean): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setDobError('');
    const ee = validateEmail(email);
    if (ee) {
      setEmailError(ee);
      isValid = false;
    }
    const pe = validatePassword(password);
    if (pe) {
      setPasswordError(pe);
      isValid = false;
    }
    if (isSignUp && password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }
    if (isSignUp) {
      const ae = validateAge(dateOfBirth);
      if (ae) {
        setDobError(ae);
        isValid = false;
      }
    }
    return isValid;
  };

  const handleSignIn = async () => {
    if (!validateForm(false)) return;
    setIsLoading(true);
    const { error } = await signInWithEmail(email, password);
    setIsLoading(false);
    if (error) Alert.alert('Sign In Failed', error.message);
  };

  const handleSignUp = async () => {
    if (!validateForm(true)) return;
    setIsLoading(true);
    const { error } = await signUpWithEmail(email, password);
    if (!error && dateOfBirth) {
      try {
        await supabase.auth.updateUser({ data: { date_of_birth: dateOfBirth } });
      } catch (err) {
        console.warn('[AuthScreen] DOB persist failed', err);
      }
    }
    setIsLoading(false);
    if (error) Alert.alert('Sign Up Failed', error.message);
  };

  const handleForgotPassword = async () => {
    setEmailError('');
    const ee = validateEmail(email);
    if (ee) {
      setEmailError(ee);
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert('Password reset email sent!', 'Check your inbox.');
      setShowForgotPassword(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPassword = async () => {
    setPasswordError('');
    setConfirmPasswordError('');
    const pe = validatePassword(password);
    if (pe) {
      setPasswordError(pe);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password Updated');
      setIsResetMode(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  // ───── Reset mode (post-link) ─────
  if (isResetMode) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.centered}>
          <Card style={s.card}>
            <CardHeader>
              <CardTitle>Set New Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent style={s.cardBody}>
              <Text style={s.label}>New Password</Text>
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />
              {passwordError ? <Text style={s.error}>{passwordError}</Text> : null}
              <Text style={s.label}>Confirm Password</Text>
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!isLoading}
              />
              {confirmPasswordError ? <Text style={s.error}>{confirmPasswordError}</Text> : null}
              <Pressable style={s.primaryBtn} onPress={handleNewPassword} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={s.primaryBtnText}>Update Password</Text>
                )}
              </Pressable>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ───── Forgot password subview ─────
  if (showForgotPassword) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.centered}>
          <Card style={s.card}>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
            </CardHeader>
            <CardContent style={s.cardBody}>
              <Text style={s.label}>Email</Text>
              <View style={s.inputWithIcon}>
                <Mail size={16} color={colors.mutedForeground} style={s.inputIcon} />
                <TextInput
                  style={[s.input, s.inputPaddedLeft]}
                  placeholder="athlete@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
              {emailError ? <Text style={s.error}>{emailError}</Text> : null}
              <Pressable style={s.primaryBtn} onPress={handleForgotPassword} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={s.primaryBtnText}>Send Reset Link</Text>
                )}
              </Pressable>
              <Pressable style={s.ghostBtn} onPress={() => setShowForgotPassword(false)}>
                <ArrowLeft size={16} color={colors.foreground} />
                <Text style={s.ghostBtnText}>Back to Sign In</Text>
              </Pressable>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ───── Main signin / signup tabs ─────
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />
        <Card style={s.card}>
          <CardHeader>
            <View style={s.logoWrap}>
              <Text style={s.brand}>OfferHound™</Text>
            </View>
            <CardTitle>Welcome to OfferHound™</CardTitle>
            <CardDescription>Sign in to manage your recruiting profile and connect with coaches</CardDescription>
          </CardHeader>
          <CardContent style={s.cardBody}>
            <View style={s.tabsBar}>
              <Pressable
                style={[s.tabBtn, activeTab === 'signin' && s.tabBtnActive]}
                onPress={() => setActiveTab('signin')}>
                <Text style={[s.tabText, activeTab === 'signin' && s.tabTextActive]}>Sign In</Text>
              </Pressable>
              <Pressable
                style={[s.tabBtn, activeTab === 'signup' && s.tabBtnActive]}
                onPress={() => setActiveTab('signup')}>
                <Text style={[s.tabText, activeTab === 'signup' && s.tabTextActive]}>Sign Up</Text>
              </Pressable>
            </View>

            {/* Email */}
            <Text style={s.label}>Email</Text>
            <View style={s.inputWithIcon}>
              <Mail size={16} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                style={[s.input, s.inputPaddedLeft]}
                placeholder="athlete@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
            {emailError ? <Text style={s.error}>{emailError}</Text> : null}

            {/* Password */}
            <View style={s.rowBetween}>
              <Text style={s.label}>Password</Text>
              {activeTab === 'signin' ? (
                <Pressable onPress={() => setShowForgotPassword(true)}>
                  <Text style={s.linkText}>Forgot password?</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={s.inputWithIcon}>
              <Lock size={16} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                style={[s.input, s.inputPaddedLeft]}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </View>
            {passwordError ? <Text style={s.error}>{passwordError}</Text> : null}

            {activeTab === 'signup' ? (
              <>
                <Text style={s.label}>Confirm Password</Text>
                <View style={s.inputWithIcon}>
                  <Lock size={16} color={colors.mutedForeground} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, s.inputPaddedLeft]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!isLoading}
                  />
                </View>
                {confirmPasswordError ? <Text style={s.error}>{confirmPasswordError}</Text> : null}

                <Text style={s.label}>Date of birth</Text>
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <Text style={s.helpText}>
                  You must be at least 13 to create an account. Athletes under 13 must be added by a parent.
                </Text>
                {dobError ? <Text style={s.error}>{dobError}</Text> : null}
              </>
            ) : null}

            <Pressable
              style={s.primaryBtn}
              onPress={activeTab === 'signin' ? handleSignIn : handleSignUp}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={s.primaryBtnText}>{activeTab === 'signin' ? 'Sign In' : 'Create Account'}</Text>
              )}
            </Pressable>

            <SocialLoginButtons />
          </CardContent>
          <CardFooter>
            <Text style={s.footerText}>
              By continuing, you agree to our{' '}
              <Text style={s.linkText} onPress={() => Linking.openURL('https://offerhound.com/terms')}>
                Terms of Use
              </Text>{' '}
              and{' '}
              <Text style={s.linkText} onPress={() => Linking.openURL('https://offerhound.com/privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </CardFooter>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  centered: { padding: spacing.md, justifyContent: 'center', flexGrow: 1 },
  card: { marginTop: spacing.md, padding: spacing.md, gap: spacing.sm },
  cardBody: { gap: spacing.sm },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xs },
  brand: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.primary, letterSpacing: typography.letterSpacing.heading },
  tabsBar: { flexDirection: 'row', backgroundColor: colors.muted, borderRadius: 10, padding: 4, marginBottom: spacing.sm },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: colors.card },
  tabText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  tabTextActive: { color: colors.foreground },
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  helpText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md, color: colors.foreground, backgroundColor: colors.card, fontFamily: typography.fontFamily.body },
  inputWithIcon: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 12, zIndex: 2 },
  inputPaddedLeft: { paddingLeft: 36 },
  error: { color: colors.destructive, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.body },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  primaryBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.primaryForeground },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm },
  ghostBtnText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.sm },
  footerText: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.xs, textAlign: 'center' },
});
