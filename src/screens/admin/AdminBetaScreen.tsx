// AdminBetaScreen — thin screen wrapper for the AdminBetaFeedbackDashboard component.
// Wave 1 wiring: new "Beta" tab in AdminTabs.
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { AdminBetaFeedbackDashboard } from '@/components/AdminBetaFeedbackDashboard';
import { colors } from '@/lib/theme';

export default function AdminBetaScreen() {
  return (
    <SafeAreaView style={s.root}>
      <AdminBetaFeedbackDashboard />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
