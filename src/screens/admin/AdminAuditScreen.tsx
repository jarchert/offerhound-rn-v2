// AdminAuditScreen — thin wrapper around the ported AdminAuditLog component.
// Lovable parity (AdminOptOutAuditViewer): full audit trail viewer for admin oversight.
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { AdminAuditLog } from '@/components/AdminAuditLog';
import { colors, spacing } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
export default function AdminAuditScreen() {
  return (
    <SafeAreaView style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <AdminAuditLog />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
