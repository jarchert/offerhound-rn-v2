// AgencyDashboardScreen — thin wrapper around the ported AgencyTeamView component.
// Lovable parity (AgencyDashboard): the team view is the central agency surface today.
// AgencyStaffManager + ScoutPipeline + analytics tabs are tracked as PORT-PENDING.
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { AgencyTeamView } from '@/components/agency/AgencyTeamView';
import { colors, spacing } from '@/lib/theme';

export default function AgencyDashboardScreen() {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <AgencyTeamView />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
