// PrivacySettingsScreen — ATT prompt + analytics opt-in + contact-sharing consent.
// Part 9 of the conversion guide describes compliance requirements.
//
// Tier 2 addition: "Contact sharing" section (share_email_publicly /
// share_phone_publicly on player_profiles). Only rendered for athletes
// (i.e. when usePlayerProfile returns a profile). Under-13 athletes have
// the toggles locked to off per COPPA / Minor-Safe Profiles spec.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import * as TrackingTransparency from '@/lib/tracking-transparency';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { colors, typography, spacing, radius } from '@/lib/theme';

// Returns age in whole years, or null if dob is absent/invalid.
function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function PrivacySettingsScreen() {
  const [attStatus, setAttStatus] = useState<string>('undetermined');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [crashReportsEnabled, setCrashReportsEnabled] = useState(true);

  // Contact sharing (Tier 2) — only relevant for athletes.
  const { profile, updateProfile } = usePlayerProfile() as any;

  // Local optimistic state for the two toggles. Initialised from the DB
  // value once profile loads; we flip locally on press and roll back on error.
  const [shareEmail, setShareEmail] = useState<boolean>(false);
  const [sharePhone, setSharePhone] = useState<boolean>(false);
  const [contactSaving, setContactSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setShareEmail(profile.share_email_publicly === true);
      setSharePhone(profile.share_phone_publicly === true);
    }
  }, [profile?.share_email_publicly, profile?.share_phone_publicly]);

  // Under-13 athletes: COPPA requires parental consent before any contact
  // info can be shared. Lock both toggles off and explain why.
  const age = calculateAge(profile?.date_of_birth);
  const isUnder13 = age !== null && age < 13;

  const handleContactToggle = useCallback(
    async (field: 'share_email_publicly' | 'share_phone_publicly', next: boolean) => {
      if (isUnder13 || !profile || contactSaving) return;
      // Optimistic update
      if (field === 'share_email_publicly') setShareEmail(next);
      else setSharePhone(next);
      setContactSaving(true);
      try {
        await updateProfile({ [field]: next });
      } catch {
        // Roll back on error
        if (field === 'share_email_publicly') setShareEmail(!next);
        else setSharePhone(!next);
        Alert.alert('Error', 'Could not save your preference. Please try again.');
      } finally {
        setContactSaving(false);
      }
    },
    [isUnder13, profile, contactSaving, updateProfile],
  );

  useEffect(() => {
    if (Platform.OS === 'ios') {
      TrackingTransparency.getTrackingPermissionsAsync().then((result) => {
        setAttStatus(result.status);
      });
    }
  }, []);

  const requestATT = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS only', 'App Tracking Transparency is an iOS feature.');
      return;
    }
    const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
    setAttStatus(status);
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <View style={s.headerText}>
          <Text style={s.title}>Privacy settings</Text>
          <Text style={s.subtitle}>Control how your data is used</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Contact sharing (Tier 2) — only visible when an athlete profile exists */}
        {!!profile && (
          <Card style={s.card}>
            <Text style={s.sectionTitle}>Contact sharing</Text>
            <Text style={s.desc}>
              Choose whether recruiters and coaches can see your contact details on your public
              profile card.
            </Text>

            {isUnder13 && (
              <View style={s.lockedNote}>
                <Text style={s.lockedText}>
                  Contact sharing is disabled for athletes under 13. A parent or guardian must
                  complete COPPA consent before these options can be enabled.
                </Text>
              </View>
            )}

            <View style={s.row}>
              <View style={s.rowLabel}>
                <Text style={s.label}>Share email publicly</Text>
                <Text style={s.rowDesc}>
                  {profile.email
                    ? `Show ${profile.email} on your profile card`
                    : 'No email address set on your profile'}
                </Text>
              </View>
              <Switch
                value={isUnder13 ? false : shareEmail}
                onValueChange={(v) => handleContactToggle('share_email_publicly', v)}
                disabled={isUnder13 || !profile.email || contactSaving}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                accessibilityLabel="Share email publicly"
              />
            </View>

            <View style={s.row}>
              <View style={s.rowLabel}>
                <Text style={s.label}>Share phone publicly</Text>
                <Text style={s.rowDesc}>
                  {profile.phone
                    ? `Show ${profile.phone} on your profile card`
                    : 'No phone number set on your profile'}
                </Text>
              </View>
              <Switch
                value={isUnder13 ? false : sharePhone}
                onValueChange={(v) => handleContactToggle('share_phone_publicly', v)}
                disabled={isUnder13 || !profile.phone || contactSaving}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                accessibilityLabel="Share phone publicly"
              />
            </View>
          </Card>
        )}

        {Platform.OS === 'ios' && (
          <Card style={s.card}>
            <Text style={s.sectionTitle}>App Tracking Transparency</Text>
            <Text style={s.desc}>
              OfferHound never tracks you across other apps. This permission is unused, but iOS
              requires us to declare it.
            </Text>
            <View style={s.row}>
              <Text style={s.label}>Status</Text>
              <Text style={s.value}>{attStatus}</Text>
            </View>
            {attStatus === 'undetermined' && (
              <Text style={s.link} onPress={requestATT}>
                Review tracking permission →
              </Text>
            )}
          </Card>
        )}

        <Card style={s.card}>
          <Text style={s.sectionTitle}>Analytics</Text>
          <Text style={s.desc}>
            Help us improve OfferHound by sharing anonymous usage data.
          </Text>
          <View style={s.row}>
            <Text style={s.label}>Usage analytics</Text>
            <Switch
              value={analyticsEnabled}
              onValueChange={setAnalyticsEnabled}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>
          <View style={s.row}>
            <Text style={s.label}>Crash reports</Text>
            <Switch
              value={crashReportsEnabled}
              onValueChange={setCrashReportsEnabled}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>
        </Card>

        <Card style={s.card}>
          <Text style={s.sectionTitle}>Data</Text>
          <Text style={s.desc}>
            You can request a copy of your data or delete your account at any time.
          </Text>
          <Text style={s.link}>Request data export →</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  headerText: { flex: 1 },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
  },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { padding: spacing.md, gap: spacing.sm },
  sectionTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    color: colors.foreground,
  },
  desc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
    lineHeight: typography.lineHeight.normal * typography.size.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  value: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.foregroundSubtle,
  },
  link: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  rowLabel: { flex: 1, marginRight: spacing.sm },
  rowDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.foregroundSubtle,
    marginTop: 2,
  },
  lockedNote: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  lockedText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
    lineHeight: typography.lineHeight.normal * typography.size.sm,
  },
});
