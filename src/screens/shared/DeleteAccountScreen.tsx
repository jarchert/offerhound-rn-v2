import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';
import { colors, typography, spacing } from '@/lib/theme';

export default function DeleteAccountScreen() {
  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Text style={s.title}>Delete account</Text>
        <Text style={s.body}>
          Deleting your account is permanent and immediate. Your profile, messages, saved coaches/athletes, letters,
          and all associated data will be removed from our servers within 30 days.
        </Text>
        <Text style={s.body}>
          If you have an active subscription, it will be cancelled. Note: cancelling your subscription alone does
          not delete your account — use the button below to fully remove your data.
        </Text>
        <DeleteAccountSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading, marginTop: spacing.sm },
  body: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, lineHeight: 22 },
});
