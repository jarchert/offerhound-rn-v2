import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Pressable, Switch } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Bell, Moon, Shield, FileText, Trash2, LogOut, ChevronRight, Users, Cookie, Eye, CreditCard, Lock, User } from 'lucide-react-native';
import { Alert, TextInput, Modal } from 'react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Navbar } from '@/components/Navbar';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function SettingsScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [changingPw, setChangingPw] = React.useState(false);
  const [newPw, setNewPw] = React.useState('');
  const [pwLoading, setPwLoading] = React.useState(false);

  const handleChangePassword = async () => {
    if (newPw.length < 8) {
      Alert.alert('Password too short', 'Enter at least 8 characters.');
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password updated', 'Your password has been changed.');
      setChangingPw(false);
      setNewPw('');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Settings</Text>
        <Text style={s.email}>{user?.email}</Text>

        <SettingsGroup title="Subscription">
          <SettingsRow icon={CreditCard} label="Manage Subscription" onPress={() => nav.navigate('SettingsStack' as any, { screen: 'AccountSettings' })} />
        </SettingsGroup>

        <SettingsGroup title="Account Information">
          <SettingsRow icon={User} label={user?.email ?? 'Email'} onPress={() => {}} />
        </SettingsGroup>

        <SettingsGroup title="Security">
          <SettingsRow icon={Lock} label="Change Password" onPress={() => setChangingPw(true)} />
        </SettingsGroup>

        <SettingsGroup title="Preferences">
          <SettingsRow
            icon={Moon}
            label="Dark mode"
            right={<Switch value={theme === 'dark'} onValueChange={toggleTheme} />}
          />
          <SettingsRow
            icon={Bell}
            label="Notifications"
            onPress={() => nav.navigate('Notifications' as any)}
          />
        </SettingsGroup>

        <SettingsGroup title="Legal">
          <SettingsRow icon={Shield} label="Privacy Policy" onPress={() => nav.navigate('SettingsStack' as any, { screen: 'LegalStack', params: { screen: 'PrivacyPolicy' } })} />
          <SettingsRow icon={FileText} label="Terms of Use" onPress={() => nav.navigate('SettingsStack' as any, { screen: 'LegalStack', params: { screen: 'TermsOfUse' } })} />
          <SettingsRow icon={Users} label="Community Guidelines" onPress={() => nav.navigate('SettingsStack' as any, { screen: 'LegalStack', params: { screen: 'CommunityGuidelines' } })} />
          <SettingsRow icon={Shield} label="California Privacy Rights" onPress={() => nav.navigate('SettingsStack' as any, { screen: 'LegalStack', params: { screen: 'CCPARights' } })} />
          <SettingsRow icon={Cookie} label="Cookies Policy" onPress={() => nav.navigate('SettingsStack' as any, { screen: 'LegalStack', params: { screen: 'CookiesPolicy' } })} />
          <SettingsRow icon={Eye} label="Accessibility" onPress={() => nav.navigate('SettingsStack' as any, { screen: 'LegalStack', params: { screen: 'Accessibility' } })} />
        </SettingsGroup>

        <SettingsGroup title="Account">
          <SettingsRow icon={Trash2} label="Delete account" onPress={() => nav.navigate('SettingsStack' as any, { screen: 'DeleteAccount' })} destructive />
          <SettingsRow icon={LogOut} label="Sign out" onPress={async () => { try { await signOut(); } catch {} }} destructive />
        </SettingsGroup>

        <Pressable style={s.smokeTest} onPress={() => nav.navigate('SmokeTest' as any)}>
          <Text style={s.smokeTestText}>Run Smoke Test →</Text>
        </Pressable>

        <Text style={s.version}>OfferHound v1.0.0 (Build 35)</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={changingPw} transparent animationType="slide" onRequestClose={() => setChangingPw(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setChangingPw(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Change Password</Text>
            <TextInput
              style={s.input}
              placeholder="New password (min 8 chars)"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
            />
            <Pressable
              style={[s.pwBtn, pwLoading && s.pwBtnDisabled]}
              onPress={handleChangePassword}
              disabled={pwLoading}
            >
              <Text style={s.pwBtnText}>{pwLoading ? 'Saving...' : 'Update Password'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.md },
  modalTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.foreground, backgroundColor: colors.background },
  pwBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  pwBtnDisabled: { opacity: 0.6 },
  pwBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: '#fff' },
});
