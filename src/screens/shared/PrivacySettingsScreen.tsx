// PrivacySettingsScreen — ATT prompt + analytics opt-in preferences.
// Part 9 of the conversion guide describes compliance requirements.
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
import * as TrackingTransparency from 'expo-tracking-transparency';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { colors, typography, spacing, radius } from '@/lib/theme';

export default function PrivacySettingsScreen() {
  const [attStatus, setAttStatus] = useState<string>('undetermined');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [crashReportsEnabled, setCrashReportsEnabled] = useState(true);

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
});
