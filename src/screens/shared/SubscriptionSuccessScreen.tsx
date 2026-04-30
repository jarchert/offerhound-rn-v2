// SubscriptionSuccessScreen — RN port of Lovable src/pages/SubscriptionSuccess.tsx
// Post-IAP landing. Refreshes useSubscription, then offers route to Dashboard.
// NOTE: original mentioned Stripe webhook delay; on IAP the receipt validator
// is faster but we still retry a few times to be safe.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CheckCircle } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { Navbar } from '@/components/Navbar';
import { useSubscription } from '@/hooks/useSubscription';
import { colors, spacing, typography } from '@/lib/theme';

export default function SubscriptionSuccessScreen() {
  const nav = useNavigation<any>();
  const { refresh, isSubscribed, tierName, isLoading } = useSubscription() as any;
  const [refreshing, setRefreshing] = useState(true);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  useEffect(() => {
    doRefresh();
    const t1 = setTimeout(doRefresh, 3000);
    const t2 = setTimeout(doRefresh, 8000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [doRefresh]);

  const goDashboard = () => {
    // Reset to the role-aware root (RootNavigator picks the right tab navigator).
    nav.reset?.({ index: 0, routes: [{ name: 'AthleteTabs' }] });
  };

  return (
    <SafeAreaView style={styles.root}>
      <Navbar />
      <View style={styles.inner}>
        <CheckCircle size={80} color={colors.success} />
        <Text style={styles.title}>You're All Set!</Text>
        <Text style={styles.body}>
          Your subscription is now active. Enjoy full access to all OfferHound features.
        </Text>

        {refreshing || isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.mutedForeground} />
            <Text style={styles.loadingText}>  Confirming your plan…</Text>
          </View>
        ) : isSubscribed ? (
          <Text style={styles.plan}>Plan: {tierName ?? 'Premium'}</Text>
        ) : (
          <Text style={styles.pending}>Your plan will appear shortly.</Text>
        )}

        <Button onPress={goDashboard} size="lg" style={styles.cta}>
          <Text style={styles.ctaText}>Go to Dashboard</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  inner: { alignItems: 'center', maxWidth: 420, alignSelf: 'center' },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    letterSpacing: typography.letterSpacing.heading,
  },
  body: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  loadingText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  plan: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    marginVertical: spacing.lg,
  },
  pending: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    marginVertical: spacing.lg,
  },
  cta: { marginTop: spacing.md, alignSelf: 'stretch' },
  ctaText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
  },
});
