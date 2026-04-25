// CoachCommunicationRulesScreen — RN port of Lovable src/pages/CoachCommunicationRules.tsx (74 LOC).
// Static legal/policy content rendered with Card + section headings. SEO + ScrollToTop are
// web-only and intentionally dropped in the RN port.
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Linking, Pressable } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing, radius } from '@/lib/theme';

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

export default function CoachCommunicationRulesScreen() {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <BackButton label="Back" />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroIconWrap}>
          <View style={s.heroIcon}>
            <MessageSquare size={32} color={colors.primary} />
          </View>
        </View>
        <Text style={s.h1}>Coach & Scout Communication Rules</Text>
        <Text style={s.subtitle}>Last updated: January 1, 2026</Text>

        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            <View style={s.section}>
              <Text style={s.h2}>1. General Communication Standards</Text>
              <Bullet>Maintain professional and respectful communication at all times</Bullet>
              <Bullet>Use clear, honest, and accurate information in all messages</Bullet>
              <Bullet>Respect an athlete's decision to decline or cease communication</Bullet>
              <Bullet>Include your official title, organization, and contact information</Bullet>
            </View>

            <View style={[s.section, s.sectionMuted]}>
              <Text style={[s.h2, { color: colors.primary }]}>Rules for College Coaches</Text>
              <Bullet>
                <Text style={s.bold}>Recruiting Materials: </Text>May be sent beginning June 15 after sophomore year
              </Bullet>
              <Bullet>
                <Text style={s.bold}>Phone Calls: </Text>Permitted beginning September 1 of junior year
              </Bullet>
              <Bullet>
                <Text style={s.bold}>Dead Periods: </Text>No in-person contact during designated dead periods
              </Bullet>
              <Bullet>
                <Text style={s.bold}>Official Visits: </Text>Cannot occur until August 1 of senior year
              </Bullet>
            </View>

            <View style={[s.section, s.sectionGold]}>
              <Text style={[s.h2, { color: colors.primary }]}>Rules for Independent Scouts</Text>
              <Bullet>Clearly identify yourself as an independent scout</Bullet>
              <Bullet>Never promise roster spots, scholarships, or placement</Bullet>
              <Bullet>Maintain confidentiality of athlete information</Bullet>
            </View>

            <View style={s.section}>
              <Text style={s.h2}>2. Communication with Minors</Text>
              <Bullet>Include parents/guardians in communications when possible</Bullet>
              <Bullet>Never request private or off-platform communication with minors</Bullet>
              <Bullet>Document all significant recruiting communications</Bullet>
            </View>

            <View style={s.section}>
              <Text style={s.h2}>3. Reporting Concerns</Text>
              <Text style={s.body}>
                Report potential violations to{' '}
                <Pressable onPress={() => Linking.openURL('mailto:compliance@offer-hound.com')}>
                  <Text style={s.link}>compliance@offer-hound.com</Text>
                </Pressable>
                .
              </Text>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  heroIconWrap: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  heroIcon: {
    width: 64, height: 64, borderRadius: radius.full,
    backgroundColor: 'rgba(231,175,8,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  h1: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.heading,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: { marginTop: spacing.md },
  cardContent: { paddingTop: spacing.md, gap: spacing.md },
  section: { marginBottom: spacing.md },
  sectionMuted: {
    backgroundColor: 'rgba(32,36,43,0.5)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sectionGold: {
    backgroundColor: 'rgba(231,175,8,0.05)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  h2: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  bullet: {},
  bulletRow: { flexDirection: 'row', paddingLeft: spacing.md, marginBottom: 4 },
  bulletDot: { color: colors.mutedForeground, marginRight: spacing.sm, fontSize: typography.fontSize.sm },
  bulletText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    flex: 1,
    lineHeight: 20,
  },
  bold: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
  link: { color: colors.primary, textDecorationLine: 'underline' },
});
