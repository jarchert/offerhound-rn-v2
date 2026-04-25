// InstallScreen — RN port of Lovable src/pages/Install.tsx
// "Add to Home Screen" instructions for both platforms. On native this is
// largely informational, but we keep parity so deep links still resolve.
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Smartphone, ArrowLeft } from 'lucide-react-native';
import { Card, CardContent, Button } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/lib/theme';

function Step({ num, text }: { num: number; text: string }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepNum}>{num}.</Text>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

export default function InstallScreen() {
  const nav = useNavigation<any>();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Button
        variant="ghost"
        onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('PublicTabs' as never))}
        style={styles.back}>
        <ArrowLeft size={16} color={colors.foreground} />
        <Text style={styles.backText}>  Back</Text>
      </Button>

      <View style={styles.header}>
        <Smartphone size={64} color={colors.primary} />
        <Text style={styles.title}>Install OfferHound</Text>
        <Text style={styles.subtitle}>
          Add to your home screen for the best experience.
        </Text>
      </View>

      <Card style={styles.card}>
        <CardContent>
          <Text style={styles.cardTitle}>iOS (Safari)</Text>
          <Step num={1} text="Tap the Share button" />
          <Step num={2} text='Scroll down, tap "Add to Home Screen"' />
          <Step num={3} text='Tap "Add"' />
        </CardContent>
      </Card>

      <Card style={styles.card}>
        <CardContent>
          <Text style={styles.cardTitle}>Android (Chrome)</Text>
          <Step num={1} text="Tap the menu (three dots)" />
          <Step num={2} text='Tap "Add to Home screen"' />
          <Step num={3} text='Tap "Add"' />
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  back: { alignSelf: 'flex-start', marginBottom: spacing.md, flexDirection: 'row' },
  backText: { color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium },
  header: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.md },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    marginTop: spacing.md,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  step: { flexDirection: 'row', marginVertical: 3 },
  stepNum: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    width: 22,
  },
  stepText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
});
