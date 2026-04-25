// ClubCoachDashboardScreen — thin wrapper around the ported ClubCoachCRM component.
// Lovable parity (ClubCoachDashboard): the CRM is the central club coach surface today.
// Messaging hub, event calendar, social links, etc. are tracked as PORT-PENDING.
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { ClubCoachCRM } from '@/components/ClubCoachCRM';
import { colors, spacing } from '@/lib/theme';

export default function ClubCoachDashboardScreen() {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <ClubCoachCRM />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
