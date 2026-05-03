// AccountSettingsScreen — RN port of Lovable web src/pages/AccountSettings.tsx (171 LOC).
// Profile + subscription + phone + notifications-toggles + security + DeleteAccountSection.
//
// Translations vs web:
// - SEO/Footer/BackButton chrome → SafeAreaView + BackButton + ScrollView.
// - shadcn Card/Switch/Button/Input → src/components/ui/Card + RN Switch/Pressable/TextInput.
// - lucide-react icons → lucide-react-native.
// - useToast → Alert.alert.
// - "Manage Subscription" customer-portal: opens returned URL via Linking.openURL.
//   On iOS, opens Apple's subscription management page instead (Guideline 3.1.1).
// - "Change Password" navigates into AuthStack → PasswordReset deep-link surface.
// - Notification toggles here are local-only mirrors of the web (web also has no
//   persistence). Kept stateful for parity. Real prefs live on NotificationSettingsScreen.
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, TextInput, Pressable, Switch, Alert, Linking, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Mail, Lock, User as UserIcon, Shield, Bell, Phone, Crown, Zap, ExternalLink } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';
import { OrgBlockEditor } from '@/components/settings/OrgBlockEditor';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
const NOTIFICATION_LABELS = ['Welcome Emails', 'Coach Contact Notifications', 'Letter Sent Confirmations', 'Weekly Digest'] as const;

export default function AccountSettingsScreen() {
  const nav = useNavigation<NavigationProp<any>>();
  const { user, isLoading: authLoading } = useAuth();
  const { profile, updateProfile } = usePlayerProfile();
  const { isSubscribed, tierName, subscriptionEnd, isCoachOrScout, isLoading: subLoading } = useSubscription();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    NOTIFICATION_LABELS.reduce((acc, l) => ({ ...acc, [l]: true }), {} as Record<string, boolean>),
  );

  const isPremium = isSubscribed || isCoachOrScout;

  useEffect(() => {
    if (profile?.phone) setPhoneNumber(profile.phone);
  }, [profile?.phone]);

  const handleUpdatePhone = async () => {
    if (!profile) return;
    setIsUpdatingPhone(true);
    const updated = await updateProfile({ phone: phoneNumber.trim() || null });
    setIsUpdatingPhone(false);
    if (updated) Alert.alert('Phone Updated');
  };

  const handleManageSubscription = async () => {
    // App Store Guideline 3.1.1: route iOS users to Apple's subscription
    // management page instead of the Stripe customer portal (which is a
    // payment surface for digital subscriptions consumed in-app).
    if (Platform.OS === 'ios') {
      try {
        await Linking.openURL('https://apps.apple.com/account/subscriptions');
      } catch {
        // best-effort
      }
      return;
    }
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) await Linking.openURL(data.url);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to open subscription management.');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />
        <View style={s.headingBlock}>
          <Text style={s.h1}>Account Settings</Text>
          <Text style={s.subtitle}>Manage your profile, account, and preferences</Text>
        </View>

        {/* Organization (non-athlete roles) — renders nothing for athletes */}
        <OrgBlockEditor />

        {/* Subscription */}
        <Card>
          <CardHeader>
            <View style={s.row}>
              {isPremium ? <Crown size={20} color="#f0c419" /> : <Zap size={20} color={colors.mutedForeground} />}
              <CardTitle>Subscription</CardTitle>
            </View>
            <CardDescription>Your current plan and billing</CardDescription>
          </CardHeader>
          <CardContent style={s.cardBody}>
            {subLoading ? (
              <View style={s.row}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={s.muted}>Loading...</Text>
              </View>
            ) : (
              <>
                <View style={s.spaceBetween}>
                  <View style={{ gap: 4 }}>
                    <View style={[s.badge, isPremium ? s.badgePrimary : s.badgeSecondary]}>
                      <Text style={[s.badgeText, isPremium ? s.badgeTextPrimary : s.badgeTextSecondary]}>
                        {isCoachOrScout ? 'Coach / Scout Access' : tierName || (isPremium ? 'Premium' : 'Free')}
                      </Text>
                    </View>
                    {subscriptionEnd ? (
                      <Text style={s.smallMuted}>
                        Renews{' '}
                        {new Date(subscriptionEnd).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    ) : null}
                  </View>
                  {!isPremium && (
                    <Pressable style={s.primaryBtnSm} onPress={() => nav.navigate('Pricing' as any)}>
                      <Text style={s.primaryBtnSmText}>Upgrade</Text>
                    </Pressable>
                  )}
                </View>
                {isPremium && !isCoachOrScout && (
                  <Pressable style={s.outlineBtn} onPress={handleManageSubscription} disabled={isOpeningPortal}>
                    {isOpeningPortal ? (
                      <ActivityIndicator size="small" color={colors.foreground} />
                    ) : (
                      <>
                        <ExternalLink size={16} color={colors.foreground} />
                        <Text style={s.outlineBtnText}>Manage Subscription</Text>
                      </>
                    )}
                  </Pressable>
                )}
                {isPremium ? <Text style={s.smallMuted}>You have full access to all premium features.</Text> : null}
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <View style={s.row}>
              <UserIcon size={20} color={colors.primary} />
              <CardTitle>Account Information</CardTitle>
            </View>
          </CardHeader>
          <CardContent style={s.cardBody}>
            <View style={s.infoRow}>
              <Mail size={16} color={colors.mutedForeground} />
              <Text style={s.infoText}>{user?.email}</Text>
            </View>
            {profile ? (
              <View style={s.infoRow}>
                <Phone size={16} color={colors.mutedForeground} />
                <Text style={s.infoText}>{profile.phone || 'No phone set'}</Text>
              </View>
            ) : null}
          </CardContent>
        </Card>

        {/* Phone */}
        {profile ? (
          <Card>
            <CardHeader>
              <View style={s.row}>
                <Phone size={20} color={colors.primary} />
                <CardTitle>Phone Number</CardTitle>
              </View>
            </CardHeader>
            <CardContent style={s.cardBody}>
              <Text style={s.label}>Phone Number</Text>
              <TextInput
                style={s.input}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.mutedForeground}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                editable={!isUpdatingPhone}
              />
              <Pressable style={s.primaryBtn} onPress={handleUpdatePhone} disabled={isUpdatingPhone}>
                {isUpdatingPhone ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={s.primaryBtnText}>Update Phone</Text>
                )}
              </Pressable>
            </CardContent>
          </Card>
        ) : null}

        {/* Notifications */}
        <Card>
          <CardHeader>
            <View style={s.row}>
              <Bell size={20} color={colors.primary} />
              <CardTitle>Notifications</CardTitle>
            </View>
            <CardDescription>Manage notification preferences</CardDescription>
          </CardHeader>
          <CardContent style={s.cardBody}>
            {NOTIFICATION_LABELS.map((label) => (
              <View key={label} style={s.toggleRow}>
                <Text style={s.toggleLabel}>{label}</Text>
                <Switch
                  value={notifs[label]}
                  onValueChange={(v) => setNotifs((p) => ({ ...p, [label]: v }))}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>
            ))}
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <View style={s.row}>
              <Shield size={20} color={colors.primary} />
              <CardTitle>Security</CardTitle>
            </View>
          </CardHeader>
          <CardContent style={s.cardBody}>
            <View style={s.infoRow}>
              <Text style={s.smallMuted}>
                Current email: <Text style={s.bold}>{user?.email}</Text>
              </Text>
            </View>
            <Pressable
              style={s.outlineBtn}
              onPress={() => nav.navigate('PasswordReset' as any)}>
              <Lock size={16} color={colors.foreground} />
              <Text style={s.outlineBtnText}>Change Password</Text>
            </Pressable>
          </CardContent>
        </Card>

        <DeleteAccountSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  headingBlock: { gap: 4, marginTop: spacing.sm },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground },
  cardBody: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm },
  smallMuted: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs },
  bold: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.sm, backgroundColor: colors.muted, borderRadius: 8 },
  infoText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md, color: colors.foreground, backgroundColor: colors.card, fontFamily: typography.fontFamily.body },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  primaryBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.primaryForeground },
  primaryBtnSm: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  primaryBtnSmText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primaryForeground },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.sm, alignSelf: 'flex-start', paddingHorizontal: spacing.md },
  outlineBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgePrimary: { backgroundColor: colors.primary },
  badgeSecondary: { backgroundColor: colors.muted },
  badgeText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs },
  badgeTextPrimary: { color: colors.primaryForeground },
  badgeTextSecondary: { color: colors.mutedForeground },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  toggleLabel: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
});
