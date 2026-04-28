// DeleteAccountScreen — RN port of Lovable src/pages/DeleteAccount.tsx (~178 LOC).
// Public-facing account deletion landing required by Google Play / Apple App Store.
// Works for both signed-in (in-app delete via supabase.functions.invoke('delete-account'))
// and signed-out (email-based deletion request) visitors.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Linking, Alert } from 'react-native';
import { useNavigation, NavigationProp, CommonActions } from '@react-navigation/native';
import { ShieldAlert, Trash2, Mail, ExternalLink } from 'lucide-react-native';

import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { colors, typography, spacing } from '@/lib/theme';

type Nav = NavigationProp<RootStackParamList>;

export default function DeleteAccountScreen() {
  const nav = useNavigation<Nav>();
  const { user, signOut } = useAuth() as any;
  const signedIn = !!user;
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Pre-fill email if signed in for the support handoff flow.
    if (user?.email && !email) setEmail(user.email);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInAppDelete = async () => {
    if (confirm !== 'DELETE') {
      toast({ title: 'Please type DELETE to confirm', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await signOut();
      toast({
        title: 'Account deleted',
        description: 'Your account and data have been permanently removed.',
      });
      nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'PublicTabs' as any }] }));
    } catch (err: any) {
      Alert.alert('Deletion failed', err?.message || 'Please contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  const openMailto = () => {
    if (!email) return;
    const url = `mailto:support@offer-hound.com?subject=Account%20Deletion%20Request&body=Please%20permanently%20delete%20the%20OfferHound%20account%20associated%20with%3A%20${encodeURIComponent(email)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />

        <View style={{ gap: spacing.xs }}>
          <Text style={s.h1}>Delete Your Account</Text>
          <Text style={s.muted}>
            Permanently remove your OfferHound account and all data we hold about you.
          </Text>
        </View>

        <View style={s.warnCard}>
          <ShieldAlert size={16} color={colors.destructive} />
          <Text style={s.warnText}>
            <Text style={s.warnStrong}>This is permanent. </Text>
            Once deleted, your profile, messages, media, transcripts, saved coaches, and all
            related data are gone and cannot be recovered.
          </Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>What gets deleted</CardTitle>
            <CardDescription>Hard-purged across all platform databases:</CardDescription>
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
                {'\u2022 '}{line}
              </Text>
            ))}
            <Text style={s.fineprint}>
              We retain a minimal anonymous deletion log entry for fraud-prevention and
              compliance audits as permitted by law.
            </Text>
          </CardContent>
        </Card>

        {signedIn ? (
          <Card style={s.dangerCard}>
            <CardHeader>
              <View style={s.row}>
                <Trash2 size={18} color={colors.destructive} />
                <CardTitle>Delete my account now</CardTitle>
              </View>
              <CardDescription>
                You are signed in. Confirm below to permanently delete this account.
              </CardDescription>
            </CardHeader>
            <CardContent style={{ gap: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <Label>Type DELETE to confirm</Label>
                <Input
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="DELETE"
                  autoCapitalize="characters"
                />
              </View>
              <Button
                variant="destructive"
                onPress={handleInAppDelete}
                disabled={submitting || confirm !== 'DELETE'}>
                {submitting ? 'Deleting\u2026' : 'Permanently Delete My Account'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <View style={s.row}>
                <Mail size={18} color={colors.foreground} />
                <CardTitle>Request deletion by email</CardTitle>
              </View>
              <CardDescription>
                Not signed in? Email us from the address tied to your account and we'll
                process deletion within 30 days.
              </CardDescription>
            </CardHeader>
            <CardContent style={{ gap: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <Label>Your account email</Label>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <Button
                onPress={openMailto}
                disabled={!email}
                rightIcon={<ExternalLink size={14} color={colors.primaryForeground} />}>
                Email Deletion Request
              </Button>
            </CardContent>
          </Card>
        )}

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
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  muted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground },
  warnCard: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    padding: spacing.md, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(220,40,40,0.4)', backgroundColor: 'rgba(220,40,40,0.06)',
  },
  warnText: { flex: 1, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground, lineHeight: 20 },
  warnStrong: { fontFamily: typography.fontFamily.bodyBold },
  dangerCard: { borderColor: 'rgba(220,40,40,0.4)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bullet: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, lineHeight: 22 },
  fineprint: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: spacing.sm },
  footer: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.lg },
});
