// CoachScreenshotsSection — RN port of Lovable src/components/landing/CoachScreenshotsSection.tsx.
// Verbatim text/icons. Web grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) rendered as a
// flex-wrapped row of Card tiles. Hover shadow omitted (no hover on touch).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Target, Users, Megaphone, BarChart3, LucideIcon } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';

type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

const FEATURES: Feature[] = [
  { icon: Target, title: 'Recruiting Pipeline', desc: 'Organize prospects through customizable recruiting stages.' },
  { icon: Users, title: 'Athlete Search', desc: 'Filter by sport, position, GPA, location, and more.' },
  { icon: Megaphone, title: 'Campaigns', desc: 'Run targeted recruiting campaigns to fill roster gaps.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Track engagement, response rates, and recruiting ROI.' },
];

export function CoachScreenshotsSection() {
  return (
    <View style={s.section}>
      <View style={s.container}>
        <Text style={s.h2}>Built for Coaches</Text>
        <View style={s.grid}>
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} style={s.card}>
                <CardContent style={s.cardContent}>
                  <Icon width={40} height={40} color={colors.primary} />
                  <Text style={s.title}>{f.title}</Text>
                  <Text style={s.desc}>{f.desc}</Text>
                </CardContent>
              </Card>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default CoachScreenshotsSection;

const s = StyleSheet.create({
  section: {
    paddingVertical: 64, // py-16
    backgroundColor: colors.muted, // bg-muted/30 approximation
  },
  container: {
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  h2: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 24, // text-2xl md:text-3xl
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 40, // mb-10
    letterSpacing: typography.letterSpacing.heading,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 280,
    flexGrow: 1,
  },
  cardContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
    color: colors.foreground,
    textAlign: 'center',
  },
  desc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
