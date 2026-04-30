// NotificationSettingsScreen — RN port of Lovable web src/pages/NotificationSettings.tsx (49 LOC).
// Five toggle categories, local-only state for parity with the web (web has no persistence).
//
// PORT-PENDING: web also renders <CampNotificationOptOuts /> and <CampOptOutAuditLog />.
// Neither RN component exists yet — schedule alongside camp-notification work.
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Switch } from 'react-native';
import { Bell, Mail, MessageSquare, Trophy, Calendar } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
type IconCmp = React.ComponentType<{ size?: number; color?: string }>;
interface Category {
  icon: IconCmp;
  label: string;
  description: string;
  defaultOn: boolean;
}

const CATEGORIES: Category[] = [
  { icon: Mail, label: 'Email Notifications', description: 'Receive updates via email', defaultOn: true },
  { icon: MessageSquare, label: 'Message Alerts', description: 'Get notified of new messages', defaultOn: true },
  { icon: Trophy, label: 'Recruiting Updates', description: 'Coach interest and match alerts', defaultOn: true },
  { icon: Calendar, label: 'Camp & Event Alerts', description: 'Upcoming camps and events', defaultOn: true },
  { icon: Bell, label: 'Weekly Digest', description: 'Weekly summary of activity', defaultOn: false },
];

export default function NotificationSettingsScreen() {
  const [values, setValues] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, c) => ({ ...acc, [c.label]: c.defaultOn }), {} as Record<string, boolean>),
  );

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />
        <View style={s.headingBlock}>
          <Text style={s.h1}>Notification Settings</Text>
          <Text style={s.subtitle}>Control how and when you receive notifications.</Text>
        </View>

        <Card>
          <CardHeader>
            <View style={s.row}>
              <Bell size={20} color={colors.primary} />
              <CardTitle>Preferences</CardTitle>
            </View>
          </CardHeader>
          <CardContent style={s.cardBody}>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <View key={cat.label} style={s.toggleRow}>
                  <View style={s.toggleLeft}>
                    <Icon size={20} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.toggleLabel}>{cat.label}</Text>
                      <Text style={s.toggleDesc}>{cat.description}</Text>
                    </View>
                  </View>
                  <Switch
                    value={values[cat.label]}
                    onValueChange={(v) => setValues((p) => ({ ...p, [cat.label]: v }))}
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                </View>
              );
            })}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  headingBlock: { gap: 4, marginTop: spacing.sm },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground },
  cardBody: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 10, gap: spacing.sm },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleLabel: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  toggleDesc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
});
