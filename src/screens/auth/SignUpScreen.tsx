import {pendingGuardianInvitation} from '@/lib/guardianInvitation';
import {pendingClubInvitation} from '@/lib/clubInvitation';
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
    if(loading)return;
    if (!email.trim() || !password) return Alert.alert('Error', 'Please fill in all fields');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))return Alert.alert('Invalid email','Enter a valid email address.');
    if(password.length<8)return Alert.alert('Password too short','Use at least 8 characters.');
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    setLoading(true);
    try{
      const { error } = await signUpWithEmail(email.trim(), password);
      if(error)throw error;
      const {data,error:sessionError}=await supabase.auth.getSession();
      if(sessionError)throw sessionError;
      if(data.session){
        // The root resumes a private invitation after its authenticated navigator mounts.
        if(!pendingClubInvitation()&&!pendingGuardianInvitation())nav.getParent()?.navigate('OnboardingStack' as any);
      }else{
        Alert.alert('Check your email','Confirm your account using the invited email address if you are joining through an invitation.');
        nav.navigate('SignIn' as any);
      }
    }catch(error:any){Alert.alert('Sign Up Failed',error.message||'Could not create your account. Please try again.');}
    finally{setLoading(false);}
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Join OfferHound and build your profile</Text>
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
