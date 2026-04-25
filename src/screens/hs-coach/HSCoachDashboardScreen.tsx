// HSCoachDashboardScreen — thin wrapper around the ported HSCoachReferralPanel component.
// Lovable parity (HSCoachDashboard): the referral panel is a representative HS coach
// surface. Endorsement composer + film/transcript verification tabs ship alongside this
// (see PORT-PENDING markers) and will join here as the dashboard fans out into tabs.
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { HSCoachReferralPanel } from '@/components/hs-coach/HSCoachReferralPanel';
import { colors, spacing } from '@/lib/theme';

export default function HSCoachDashboardScreen() {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <HSCoachReferralPanel />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
