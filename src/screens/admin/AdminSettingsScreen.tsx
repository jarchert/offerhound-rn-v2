// AdminSettingsScreen — thin wrapper around the ported AdminTermsManagement component.
// Lovable parity: terms management surface. Legal content tabs (AdminLegalContentTabs)
// live alongside as a follow-up addition.
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { AdminTermsManagement } from '@/components/AdminTermsManagement';
import { colors, spacing } from '@/lib/theme';

export default function AdminSettingsScreen() {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <AdminTermsManagement />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
