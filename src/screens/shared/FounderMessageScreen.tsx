// FounderMessageScreen — RN port of Lovable src/pages/FounderMessage.tsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { Navbar } from '@/components/Navbar';
import { colors, spacing, typography } from '@/lib/theme';

const PARAGRAPHS = [
  'Welcome to OfferHound — the platform built by someone who has been in your shoes.',
  "As a former athlete and coach, I know how challenging the recruiting process can be. The lack of transparency, the difficulty connecting with the right coaches, and the overwhelming amount of information can make it feel impossible.",
  "That's why I built OfferHound — to level the playing field for every athlete, regardless of their zip code, resources, or connections. Our platform uses AI-powered matching, verified coach databases, and transparent communication tools to ensure every athlete gets the exposure they deserve.",
  "Whether you're an athlete looking for your next opportunity, a coach searching for the right fit, or a parent supporting your child's journey — OfferHound is here to help.",
];

export default function FounderMessageScreen() {
  const nav = useNavigation<any>();

  return (
    <SafeAreaView style={styles.root}>
      <Navbar />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Button
        variant="ghost"
        onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('PublicTabs' as never))}
        style={styles.back}>
        <ArrowLeft size={16} color={colors.foreground} />
        <Text style={styles.backText}>  Back</Text>
      </Button>

      <Text style={styles.title}>A Message From Our Founder</Text>

      <View style={styles.body}>
        {PARAGRAPHS.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}
        <Text style={styles.signoff}>— The OfferHound Team</Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl, maxWidth: 720, alignSelf: 'stretch' },
  back: { alignSelf: 'flex-start', marginBottom: spacing.md, flexDirection: 'row' },
  backText: { color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    letterSpacing: typography.letterSpacing.heading,
  },
  body: { gap: spacing.md },
  paragraph: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    lineHeight: 24,
  },
  signoff: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    marginTop: spacing.lg,
  },
});
