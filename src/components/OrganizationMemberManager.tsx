// RN port of Lovable src/components/OrganizationMemberManager.tsx.
//
// The web version is intentionally minimal: shows a card titled "Team Members"
// with an empty-state message and no member fetch yet. This RN port matches
// that scope verbatim; when the web side wires member fetching, mirror here.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';

export interface OrganizationMemberManagerProps {
  organizationId?: string;
}

export const OrganizationMemberManager = ({
  organizationId,
}: OrganizationMemberManagerProps) => {
  if (!organizationId) {
    return <Text style={s.emptyOuter}>No organization selected.</Text>;
  }

  return (
    <Card>
      <CardHeader>
        <View style={s.titleRow}>
          <Users size={20} color={colors.foreground} />
          <CardTitle>Team Members</CardTitle>
        </View>
      </CardHeader>
      <CardContent>
        <Text style={s.emptyBody}>
          No team members yet. Invite scouts to join your organization.
        </Text>
      </CardContent>
    </Card>
  );
};

export default OrganizationMemberManager;

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emptyOuter: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    padding: spacing.md,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
