// OrganizationSettingsScreen — RN port of Lovable web src/pages/OrganizationSettings.tsx (30 LOC).
// General + Members tabs, plus TransferPortalFeed below.
//
// Translation notes:
// - Tabs UI → simple two-button segmented control (no shadcn Tabs in RN).
// - useScoutOrganization in the RN app returns { organization, isOwner, isMember, memberRole };
//   web treats the result as the org itself. We unwrap `organization`.
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { Building2 } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { OrganizationLogoUpload } from '@/components/OrganizationLogoUpload';
import { OrganizationMemberManager } from '@/components/OrganizationMemberManager';
import { TransferPortalFeed } from '@/components/TransferPortalFeed';
import { useScoutOrganization } from '@/hooks/useScoutOrganization';
import { colors, typography, spacing } from '@/lib/theme';

type TabKey = 'general' | 'members';

export default function OrganizationSettingsScreen() {
  const { data } = useScoutOrganization();
  const org = (data as any)?.organization ?? null;
  const [tab, setTab] = useState<TabKey>('general');

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />
        <View style={s.headerRow}>
          <Building2 size={28} color={colors.primary} />
          <Text style={s.h1}>Organization Settings</Text>
        </View>

        <View style={s.tabsBar}>
          <Pressable style={[s.tabBtn, tab === 'general' && s.tabBtnActive]} onPress={() => setTab('general')}>
            <Text style={[s.tabText, tab === 'general' && s.tabTextActive]}>General</Text>
          </Pressable>
          <Pressable style={[s.tabBtn, tab === 'members' && s.tabBtnActive]} onPress={() => setTab('members')}>
            <Text style={[s.tabText, tab === 'members' && s.tabTextActive]}>Members</Text>
          </Pressable>
        </View>

        {tab === 'general' ? (
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
            </CardHeader>
            <CardContent style={s.cardBody}>
              <OrganizationLogoUpload />
              <Text style={s.muted}>{org ? org.name || 'Your Organization' : 'No organization found.'}</Text>
            </CardContent>
          </Card>
        ) : (
          <OrganizationMemberManager />
        )}

        <View style={{ marginTop: spacing.lg }}>
          <TransferPortalFeed />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.sm },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  tabsBar: { flexDirection: 'row', backgroundColor: colors.muted, borderRadius: 10, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: colors.card },
  tabText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  tabTextActive: { color: colors.foreground },
  cardBody: { gap: spacing.sm },
  muted: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm, marginTop: spacing.sm },
});
