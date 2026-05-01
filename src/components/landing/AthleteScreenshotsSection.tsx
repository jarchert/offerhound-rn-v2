// RN port of Lovable AthleteScreenshotsSection — verbatim copy, RN-adapted.
// Source: offerhound-repo/src/components/landing/AthleteScreenshotsSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserCircle, BarChart3, Mail, Search, LucideIcon,
} from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  { icon: UserCircle, title: 'Dynamic Profile', desc: 'Showcase your stats, film, academics, and character scores in one place.' },
  { icon: Search, title: 'Coach Discovery', desc: 'Find and connect with college coaches across all divisions and conferences.' },
  { icon: Mail, title: 'Smart Letters', desc: 'AI-powered letter templates tailored to each coach and program.' },
  { icon: BarChart3, title: 'Match Analytics', desc: 'See which programs are the best fit based on your profile and preferences.' },
];

export function AthleteScreenshotsSection() {
  return (
    <View style={s.section}>
      <View style={s.container}>
        <Text style={s.heading}>Built for Athletes</Text>
        <View style={s.grid}>
          {FEATURES.map((f) => (
            <Card key={f.title} style={s.card}>
              <CardContent style={s.cardContent}>
                <f.icon size={40} color={colors.primary} />
                <Text style={s.cardTitle}>{f.title}</Text>
                <Text style={s.cardDesc}>{f.desc}</Text>
              </CardContent>
            </Card>
          ))}
        </View>
      </View>
    </View>
  );
}

export default AthleteScreenshotsSection;

const s = StyleSheet.create({
  section: { paddingVertical: spacing.xl + spacing.md, backgroundColor: 'rgba(32, 36, 43, 0.3)' },
  container: { paddingHorizontal: spacing.md },
  heading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.lg + spacing.xs,
    letterSpacing: typography.letterSpacing.heading,
  },
  grid: { gap: spacing.md },
  card: {},
  cardContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    textAlign: 'center',
  },
  cardDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
