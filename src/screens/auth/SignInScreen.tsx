import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/lib/theme';

import { BackButton } from '@/components/BackButton';
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SignInScreen() {
  const nav = useNavigation<Nav>();
  const { signInWithEmail, signInWithApple, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please enter email and password');
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) Alert.alert('Sign In Failed', error.message);
  };

  return (
    <SafeAreaView style={s.container}>
      <BackButton />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Welcome Back</Text>
        <Text style={s.subtitle}>Sign in to your OfferHound account</Text>

        <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.mutedForeground}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor={colors.mutedForeground}
          value={password} onChangeText={setPassword} secureTextEntry />

        <Pressable style={s.primaryBtn} onPress={handleSignIn} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={s.primaryBtnText}>Sign In</Text>}
        </Pressable>

        <View style={s.divider}><Text style={s.dividerText}>or continue with</Text></View>

        <Pressable style={s.socialBtn} onPress={() => signInWithApple()}>
          <Text style={s.socialBtnText}>Continue with Apple</Text>
        </Pressable>
        <Pressable style={s.socialBtn} onPress={() => signInWithGoogle()}>
          <Text style={s.socialBtnText}>Continue with Google</Text>
        </Pressable>

        <Pressable onPress={() => nav.navigate('SignUp' as any)} style={s.linkRow}>
          <Text style={s.link}>Don't have an account? Sign Up</Text>
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
  divider: { alignItems: 'center', marginVertical: spacing.sm },
  dividerText: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  socialBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  socialBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  linkRow: { alignItems: 'center', marginTop: spacing.md },
  link: { color: colors.primary, fontFamily: typography.fontFamily.body },
});
