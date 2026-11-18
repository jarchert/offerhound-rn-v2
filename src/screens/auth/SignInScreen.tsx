import { PasswordInput } from '@/components/PasswordInput';
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SignInScreen() {
  const nav = useNavigation<Nav>();
  const { signInWithEmail, signInWithApple, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [recovering, setRecovering] = useState(false);
  const handleSignIn = async () => {
    if (recovering) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Alert.alert('Email required','Enter a valid email address.');
      setLoading(true);
      try { const {error}=await resetPassword(email.trim()); if(error)throw error; Alert.alert('Check your email','If an account exists, a password reset link will be sent.'); } catch { Alert.alert('Unable to request reset','Please try again later.'); } finally {setLoading(false);}
      return;
    }
    if (!email || !password) return Alert.alert('Error', 'Please enter email and password');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Alert.alert('Invalid email', 'Enter a valid email address.');
    setLoading(true);
    try {
      const { error } = await signInWithEmail(email.trim(), password);
      if (error) Alert.alert('Sign In Failed', error.message);
    } catch {
      Alert.alert('Sign In Failed', 'Unable to connect. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{recovering?'Reset Password':'Welcome Back'}</Text>
        <Text style={s.subtitle}>Sign in to your OfferHound account</Text>

        <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.mutedForeground}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        {!recovering && <PasswordInput style={s.input} placeholder="Password" placeholderTextColor={colors.mutedForeground}
          value={password} onChangeText={setPassword} />}

        <Pressable testID="sign-in-submit" accessibilityRole="button" accessibilityLabel={recovering?'Send reset link':'Sign In'} style={s.primaryBtn} onPress={handleSignIn} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={s.primaryBtnText}>{recovering?'Send reset link':'Sign In'}</Text>}
        </Pressable>

        <Pressable accessibilityRole="button" onPress={()=>{setRecovering(!recovering);setPassword('');}} disabled={loading}><Text style={s.link}>{recovering?'Back to sign in':'Forgot password?'}</Text></Pressable>
        {!recovering && <><View style={s.divider}><Text style={s.dividerText}>or continue with</Text></View>

        <Pressable style={s.socialBtn} onPress={() => signInWithApple()}>
          <Text style={s.socialBtnText}>Continue with Apple</Text>
        </Pressable>
        <Pressable style={s.socialBtn} onPress={() => signInWithGoogle()}>
          <Text style={s.socialBtnText}>Continue with Google</Text>
        </Pressable></>}

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
