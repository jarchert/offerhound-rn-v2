// Ported from Lovable web src/pages/NewsAndLearn.tsx (24 LOC).
// Web → RN translations:
//   - <div>/<h1>/<p>/Footer/SEO → RN View/Text + SafeAreaView
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet via @/lib/theme
//   - Card/CardContent (shadcn lowercase) → @/components/ui/Card (PascalCase)
import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { BookOpen, Newspaper, Video } from 'lucide-react-native';

import { BackButton } from '@/components/BackButton';
import { Card, CardContent } from '@/components/ui';
import { colors, typography, spacing, radius } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
const ITEMS = [
  { Icon: Newspaper, title: 'Recruiting News', desc: 'Latest updates from college recruiting.' },
  { Icon: BookOpen, title: 'Guides & Tips', desc: 'Expert advice for athletes, coaches, and parents.' },
  { Icon: Video, title: 'Video Content', desc: 'Watch tutorials and recruiting breakdowns.' },
];

export default function NewsAndLearnScreen() {
  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton />
        <Text style={s.title}>News & Learn</Text>
        <Text style={s.lead}>
          Stay informed with the latest recruiting news, tips, and educational content.
        </Text>
        <View style={s.grid}>
          {ITEMS.map(({ Icon, title, desc }) => (
            <Card key={title} style={s.card}>
              <CardContent style={s.cardBody}>
                <Icon size={40} color={colors.primary} />
                <Text style={s.cardTitle}>{title}</Text>
                <Text style={s.cardDesc}>{desc}</Text>
              </CardContent>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  lead: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, marginBottom: spacing.lg },
  grid: { gap: spacing.md },
  card: { borderRadius: radius.lg },
  cardBody: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  cardTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  cardDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
