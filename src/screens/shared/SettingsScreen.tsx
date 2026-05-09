import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Pressable, Switch } from 'react-native';
import { useNavigation, NavigationProp, DrawerActions } from '@react-navigation/native';
import { Bell, Moon, Shield, FileText, Trash2, LogOut, ChevronRight, Users, Cookie, Eye, User, UserCog, Building2, Heart, Menu } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { BackButton } from '@/components/BackButton';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function SettingsScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { signOut, user, userRole } = useAuth() as any;

  // Drawer-based roles route hamburger to their drawer root; other roles
  // fall back to their role home screen (or simply pop back).
  const goToRoleHome = () => {
    switch (userRole) {
      case 'coach': nav.navigate('CoachDrawer' as any); break;
      case 'scout': nav.navigate('ScoutDrawer' as any); break;
      case 'parent': nav.navigate('ParentDrawer' as any); break;
      case 'influencer': nav.navigate('InfluencerDrawer' as any); break;
      case 'high_school_coach': nav.navigate('HSCoachDrawer' as any); break;
      case 'club_coach': nav.navigate('ClubCoachDrawer' as any); break;
      case 'agency': nav.navigate('AgencyDrawer' as any); break;
      case 'admin':
      case 'moderator': nav.navigate('AdminTabs' as any); break;
      default: nav.navigate('AthleteTabs' as any);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ImpersonationBanner />
      <View style={s.header}>
        <Pressable onPress={goToRoleHome} hitSlop={12} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Open menu">
          <Menu size={22} color={colors.foreground} />
        </Pressable>
        <Text style={s.headerTitle}>Settings</Text>
        <Pressable onPress={() => nav.navigate('Notifications' as any)} hitSlop={12} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Notifications">
          <Bell size={20} color={colors.foreground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />
        <Text style={s.email}>{user?.email}</Text>

        <SettingsGroup title="Account">
          <SettingsRow
            icon={UserCog}
            label="Account settings"
            onPress={() => nav.navigate('AccountSettings' as any)}
          />
          <SettingsRow
            icon={Building2}
            label="Organization"
            onPress={() => nav.navigate('OrganizationSettings' as any)}
          />
        </SettingsGroup>

        <SettingsGroup title="Preferences">
          <SettingsRow
            icon={Moon}
            label="Dark mode"
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#808897', fontSize: 11, fontFamily: 'Inter_500Medium' }}>Always on</Text>
                <Switch value={true} disabled />
              </View>
            }
          />
          <SettingsRow
            icon={Bell}
            label="Notifications"
            onPress={() => nav.navigate('NotificationSettings' as any)}
          />
          <SettingsRow
            icon={Heart}
            label="Following"
            onPress={() => nav.navigate('FollowingSettings' as any)}
          />
          <SettingsRow
            icon={Shield}
            label="Privacy settings"
            onPress={() => nav.navigate('CookieSettings' as any)}
          />
        </SettingsGroup>

        <SettingsGroup title="Legal">
          <SettingsRow icon={Shield} label="Privacy Policy" onPress={() => nav.navigate('LegalStack' as any, { screen: 'PrivacyPolicy' })} />
          <SettingsRow icon={FileText} label="Terms of Use" onPress={() => nav.navigate('LegalStack' as any, { screen: 'TermsOfUse' })} />
          <SettingsRow icon={Users} label="Community Guidelines" onPress={() => nav.navigate('LegalStack' as any, { screen: 'CommunityGuidelines' })} />
          <SettingsRow icon={Shield} label="California Privacy Rights" onPress={() => nav.navigate('LegalStack' as any, { screen: 'CCPARights' })} />
          <SettingsRow icon={Cookie} label="Cookies Policy" onPress={() => nav.navigate('LegalStack' as any, { screen: 'CookiesPolicy' })} />
          <SettingsRow icon={Eye} label="Accessibility" onPress={() => nav.navigate('LegalStack' as any, { screen: 'Accessibility' })} />
        </SettingsGroup>

        <SettingsGroup title="Danger zone">
          <SettingsRow icon={Trash2} label="Delete account" onPress={() => nav.navigate('DeleteAccount' as any)} destructive />
          <SettingsRow icon={LogOut} label="Sign out" onPress={signOut} destructive />
        </SettingsGroup>

        <Pressable style={s.smokeTest} onPress={() => nav.navigate('SmokeTest' as any)}>
          <Text style={s.smokeTestText}>Run Smoke Test →</Text>
        </Pressable>

        <Text style={s.version}>OfferHound v1.0.0 (Build 1)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsGroup({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View style={s.group}>
      <Text style={s.groupTitle}>{title}</Text>
      <View style={s.groupCard}>{children}</View>
    </View>
  );
}

function SettingsRow({ icon: Icon, label, onPress, right, destructive }: { icon: any; label: string; onPress?: () => void; right?: React.ReactNode; destructive?: boolean }) {
  return (
    <Pressable style={s.row} onPress={onPress} disabled={!onPress}>
      <Icon size={18} color={destructive ? colors.destructive : colors.foreground} />
      <Text style={[s.rowLabel, destructive && s.rowDestructive]}>{label}</Text>
      {right ?? (onPress ? <ChevronRight size={16} color={colors.mutedForeground} /> : null)}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, minHeight: 52 },
  iconBtn: { padding: 6 },
  headerTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading, flex: 1, textAlign: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  email: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  group: { gap: spacing.xs },
  groupTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: spacing.xs, marginTop: spacing.sm },
  groupCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 52 },
  rowLabel: { flex: 1, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.foreground },
  rowDestructive: { color: colors.destructive },
  version: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.md },
  smokeTest: { alignItems: 'center', padding: spacing.sm, marginTop: spacing.sm },
  smokeTestText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
});
