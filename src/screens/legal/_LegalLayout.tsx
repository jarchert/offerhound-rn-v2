// Shared layout for static legal/policy screens. Mirrors Lovable's
// `<main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">` structure
// with the centered icon-circle header and a single Card body.
//
// Sources (all in offerhound-repo/src/pages/):
//   PrivacyPolicy.tsx, TermsOfUse.tsx, CCPARights.tsx,
//   CookiesPolicy.tsx, CommunityGuidelines.tsx, Accessibility.tsx
//
// Web-only concerns intentionally dropped: <SEO> (handled by app metadata),
// <ScrollToTop> (RN ScrollView mounts at top), <Footer> (app shell).
import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent } from '@/components/ui/Card';
import { colors, typography, spacing, radius } from '@/lib/theme';

export interface LegalSection {
  heading: string;
  body: string;
}

interface LegalLayoutProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  sections: LegalSection[];
}

export function LegalLayout({ icon: Icon, title, subtitle, sections }: LegalLayoutProps) {
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton label="Back" style={s.back} />

        <View style={s.header}>
          <View style={s.iconCircle}>
            <Icon size={32} color={colors.primary} />
          </View>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>

        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            {sections.map((section, idx) => (
              <View key={idx} style={s.section}>
                <Text style={s.sectionHeading}>{section.heading}</Text>
                <Text style={s.sectionBody}>{section.body}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export default LegalLayout;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  back: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(231, 175, 8, 0.10)', // bg-primary/10
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h1,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  card: { borderRadius: radius.lg },
  cardContent: { padding: spacing.md, gap: spacing.lg },
  section: { gap: spacing.xs },
  sectionHeading: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.lg,
    color: colors.foreground,
  },
  sectionBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
});
