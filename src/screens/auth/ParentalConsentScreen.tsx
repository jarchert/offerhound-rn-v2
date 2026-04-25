// ParentalConsentScreen — RN port of Lovable web src/pages/ParentalConsent.tsx (21 LOC).
// Static informational screen explaining COPPA-style parental consent.
import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Shield } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';

const BULLETS = [
  'Contact information is hidden until consent is given',
  'Parents can manage visibility settings at any time',
  'All communication is logged and monitored',
  'Parents receive notifications about coach interactions',
];

export default function ParentalConsentScreen() {
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />
        <View style={s.headerRow}>
          <Shield size={28} color={colors.primary} />
          <Text style={s.h1}>Parental Consent</Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>Why We Need Consent</CardTitle>
          </CardHeader>
          <CardContent style={s.cardBody}>
            <Text style={s.body}>
              OfferHound takes the safety of minor athletes seriously. For athletes under 18, we require parental
              consent before sharing contact information.
            </Text>
            {BULLETS.map((b) => (
              <View key={b} style={s.bulletRow}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.body}>{b}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.sm },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  cardBody: { gap: spacing.sm },
  body: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm, lineHeight: 22, flex: 1 },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, lineHeight: 22 },
});
