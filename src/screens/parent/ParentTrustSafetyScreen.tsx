// ParentTrustSafetyScreen — RN port of Lovable web ParentTrustSafety page.
// Source: offerhound-repo/src/pages/ParentTrustSafety.tsx (21 LOC)
//
// Adaptations (web → RN):
//   - <div>/<h1>/<h3>/<p>            → <View>/<Text>
//   - className utility classes      → StyleSheet
//   - lucide-react                   → lucide-react-native
//   - Card / CardContent             → @/components/ui/Card primitives
//   - SEO removed (RN has no document head)
//   - Footer rendered below scroll content (matches other ported screens)
//   - BackButton wired to default goBack (Lovable used fallbackTo="/parent-dashboard")
//
// Wired into ParentTabs.tsx, replacing makePlaceholder('Trust & Safety', ...).
import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Shield, Eye, Bell, Lock } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';

const ITEMS = [
  { icon: Eye, title: 'Profile Visibility', desc: "Control what coaches and scouts can see on your athlete's profile." },
  { icon: Bell, title: 'Activity Alerts', desc: "Get notified when coaches view your athlete's profile or send messages." },
  { icon: Lock, title: 'Data Protection', desc: 'All data is encrypted. We never sell personal information.' },
];

export default function ParentTrustSafetyScreen() {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <View style={s.header}>
          <Shield size={28} color={colors.primary} />
          <Text style={s.title}>Trust & Safety</Text>
        </View>
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <Card key={i} style={s.card}>
              <CardContent style={s.cardContent}>
                <Icon size={22} color={colors.primary} style={s.icon} />
                <View style={s.textCol}>
                  <Text style={s.itemTitle}>{item.title}</Text>
                  <Text style={s.itemDesc}>{item.desc}</Text>
                </View>
              </CardContent>
            </Card>
          );
        })}
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  card: { marginBottom: spacing.xs },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md },
  icon: { marginTop: 2 },
  textCol: { flex: 1, gap: 4 },
  itemTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  itemDesc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
});
