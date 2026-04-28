// DeleteAccountScreen — RN port of Lovable src/pages/DeleteAccount.tsx (~178 LOC).
// Public-facing account deletion landing required by Google Play / Apple App Store.
//
// Subagent task spec (overrides the Lovable "type DELETE" UX):
//   - Warning copy
//   - Password re-entry (secureTextEntry)
//   - Confirmation checkbox (custom Pressable)
//   - Delete button enabled only when both filled
//   - Match Lovable deletion call: supabase.functions.invoke('delete-account')
//   - On success: signOut + nav.reset({ routes: [{ name: 'PublicTabs' }] })
//
// Single file write per subagent contract.
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
} from 'react-native';
import {
  useNavigation,
  NavigationProp,
  CommonActions,
} from '@react-navigation/native';
import { ShieldAlert, Trash2, Check } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { colors, typography, spacing } from '@/lib/theme';

type Nav = NavigationProp<RootStackParamList>;

const toast = {
  success: (text1: string, text2?: string) =>
    Toast.show({ type: 'success', text1, text2 }),
  error: (text1: string, text2?: string) =>
    Toast.show({ type: 'error', text1, text2 }),
};

export default function DeleteAccountScreen() {
  const nav = useNavigation<Nav>();
  const { user, signOut } = useAuth() as any;

  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = password.trim().length > 0 && confirmed && !submitting;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Re-verify password before invoking deletion (defense in depth).
      if (user?.email) {
        const { error: reauthErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password,
        });
        if (reauthErr) {
          toast.error('Incorrect password', 'Please re-enter your current password.');
          setSubmitting(false);
          return;
        }
      }

      // Match Lovable: supabase.functions.invoke('delete-account')
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;

      await signOut();
      toast.success(
        'Account deleted',
        'Your account and data have been permanently removed.'
      );
      nav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'PublicTabs' as any }],
        })
      );
    } catch (err: any) {
      Alert.alert('Deletion failed', err?.message ?? 'Please contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />

        <View style={{ gap: spacing.xs }}>
          <Text style={s.h1}>Delete your account</Text>
          <Text style={s.muted}>
            Permanently remove your OfferHound account and all data we hold about
            you.
          </Text>
        </View>

        {/* Warning banner */}
        <View style={s.warnCard}>
          <ShieldAlert size={16} color={colors.destructive} />
          <Text style={s.warnText}>
            <Text style={s.warnStrong}>This is permanent. </Text>
            Once deleted, your profile, messages, media, transcripts, saved coaches,
            and all related data are gone and cannot be recovered.
          </Text>
        </View>

        {/* What gets deleted */}
        <Card>
          <CardHeader>
            <CardTitle>What gets deleted</CardTitle>
            <CardDescription>
              Hard-purged across all platform databases:
            </CardDescription>
          </CardHeader>
          <CardContent>
            {[
              'Your login credentials and authentication record',
              'Profile data (athlete, coach, scout, club, parent, or influencer)',
              'All uploaded photos, videos, and academic transcripts',
              'Messages, conversations, and notification history',
              'Saved coaches, saved athletes, recruiting pipeline entries',
              'Letters, testimonials you authored, and outreach records',
              'Subscriptions and payment records (existing charges are not refunded)',
            ].map((line) => (
              <Text key={line} style={s.bullet}>
                {'\u2022 '}
                {line}
              </Text>
            ))}
            <Text style={s.fineprint}>
              We retain a minimal anonymous deletion log entry for fraud-prevention
              and compliance audits as permitted by law.
            </Text>
          </CardContent>
        </Card>

        {/* Re-auth + confirmation */}
        <Card style={s.dangerCard}>
          <CardHeader>
            <View style={s.row}>
              <Trash2 size={18} color={colors.destructive} />
              <CardTitle>Confirm deletion</CardTitle>
            </View>
            <CardDescription>
              Re-enter your password and check the box to permanently delete your
              account.
            </CardDescription>
          </CardHeader>
          <CardContent style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Label>Current password</Label>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />
            </View>

            <Pressable
              style={s.checkboxRow}
              onPress={() => setConfirmed((v) => !v)}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmed }}
            >
              <View style={[s.checkbox, confirmed && s.checkboxChecked]}>
                {confirmed && <Check size={14} color={colors.destructiveForeground} />}
              </View>
              <Text style={s.checkboxLabel}>
                I understand this action is permanent and cannot be undone.
              </Text>
            </Pressable>

            <Button
              variant="destructive"
              onPress={handleDelete}
              disabled={!canSubmit}
              loading={submitting}
              leftIcon={
                !submitting ? (
                  <Trash2 size={14} color={colors.destructiveForeground} />
                ) : null
              }
            >
              Permanently delete my account
            </Button>
          </CardContent>
        </Card>

        <Text style={s.footer}>
          Questions? Contact support@offer-hound.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  h1: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  muted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  warnCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(220,40,40,0.4)',
    backgroundColor: 'rgba(220,40,40,0.06)',
  },
  warnText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  warnStrong: { fontFamily: typography.fontFamily.bodyBold },
  dangerCard: { borderColor: 'rgba(220,40,40,0.4)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bullet: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  fineprint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.destructive,
    borderColor: colors.destructive,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  footer: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
