import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SignUpScreen() {
  const nav = useNavigation<Nav>();
  const { signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields');
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    setLoading(true);
    const { error } = await signUpWithEmail(email, password);
    setLoading(false);
    if (error) { Alert.alert('Sign Up Failed', error.message); return; }
    // If email confirmation is OFF, Supabase returns an active session immediately.
    // RootNavigator will swap to authed stacks; OnboardingStack is the right landing.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      nav.getParent()?.navigate('OnboardingStack' as any);
    } else {
      Alert.alert('Account Created', 'Please check your email to confirm your account.');
      nav.navigate('SignIn' as any);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Join OfferHound and get recruited</Text>
        <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.mutedForeground} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor={colors.mutedForeground} value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={s.input} placeholder="Confirm Password" placeholderTextColor={colors.mutedForeground} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <Pressable style={s.primaryBtn} onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={s.primaryBtnText}>Create Account</Text>}
        </Pressable>
        <Pressable onPress={() => nav.navigate('SignIn' as any)} style={s.linkRow}>
          <Text style={s.link}>Already have an account? Sign In</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, color: colors.foreground, backgroundColor: colors.card, fontFamily: typography.fontFamily.body },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  primaryBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.primaryForeground },
  linkRow: { alignItems: 'center', marginTop: spacing.md },
  link: { color: colors.primary, fontFamily: typography.fontFamily.body },
});
