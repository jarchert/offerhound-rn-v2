// PasswordResetScreen — RN-only screen (no Lovable counterpart).
// Supabase password-reset deep-link target; wraps supabase.auth.updateUser({ password }).
//
// On web, the reset flow redirects back into /auth?mode=reset which re-renders the same
// Auth page in "isResetMode" branch. On native we expose this dedicated route so deep
// links can land us straight here without the tabs scaffolding.
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Lock } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

const validatePassword = (pw: string) => (pw.length >= 6 ? null : 'Password must be at least 6 characters');

export default function PasswordResetScreen() {
  const nav = useNavigation<NavigationProp<any>>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
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
      Alert.alert('Password Updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => (nav.canGoBack() ? nav.goBack() : nav.navigate('PublicTabs' as any)) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />
        <Card style={{ marginTop: spacing.md }}>
          <CardHeader>
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>Enter your new password below.</CardDescription>
          </CardHeader>
          <CardContent style={s.cardBody}>
            <Text style={s.label}>New Password</Text>
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

            <Pressable style={s.primaryBtn} onPress={handleSubmit} disabled={isLoading}>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  cardBody: { gap: spacing.sm },
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md, color: colors.foreground, backgroundColor: colors.card, fontFamily: typography.fontFamily.body },
  inputWithIcon: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 12, zIndex: 2 },
  inputPaddedLeft: { paddingLeft: 36 },
  error: { color: colors.destructive, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.body },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  primaryBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.primaryForeground },
});
