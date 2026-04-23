import React from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { colors, typography, spacing } from '@/lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LandingScreen() {
  const nav = useNavigation<Nav>();
  return (
    <SafeAreaView style={s.container}>
      <View style={s.hero}>
        <Text style={s.title}>OFFERHOUND</Text>
        <Text style={s.subtitle}>College Recruiting Platform</Text>
        <Text style={s.tagline}>Find your path. Get recruited.</Text>
      </View>
      <View style={s.actions}>
        <Pressable style={s.primaryBtn} onPress={() => nav.navigate('SignUp' as any)}>
          <Text style={s.primaryBtnText}>Get Started</Text>
        </Pressable>
        <Pressable style={s.secondaryBtn} onPress={() => nav.navigate('SignIn' as any)}>
          <Text style={s.secondaryBtnText}>Sign In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['5xl'], color: colors.primary, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.lg, color: colors.foreground, marginTop: spacing.sm },
  tagline: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, marginTop: spacing.xs },
  actions: { padding: spacing.xl, gap: spacing.md },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  primaryBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.primaryForeground },
  secondaryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  secondaryBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground },
});
