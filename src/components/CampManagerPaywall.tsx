// Ported from Lovable web (src/components/CampManagerPaywall.tsx) — RN-adapted.
// Translations:
//   - shadcn Card/Button/Badge → src/components/ui (RN)
//   - lucide-react → lucide-react-native
//   - window.open(url, "_blank") → Linking.openURL(url)
//   - Tailwind classes → StyleSheet via tokens (colors/spacing/typography)
//   - Loader2 spinner → ActivityIndicator (Button's loading prop)
//   - md:grid-cols-2 / grid-cols-4 → fixed flex rows with flex: 1 children
import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { Shield, Calendar, BarChart3, Users, Check } from 'lucide-react-native';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PRICING_TIERS } from '@/lib/pricing';
import { colors, spacing, typography } from '@/lib/theme';
import { PaywallSheet } from '@/components/Paywall';
import { TIER_TO_PRODUCT_ID } from '@/lib/iap';

const PER_EVENT_TIER = PRICING_TIERS.find((t) => t.id === 'camp-manager-event')!;
const ANNUAL_TIER = PRICING_TIERS.find((t) => t.id === 'camp-manager-annual')!;

// iOS App Store compliance: native IAP product ids for the Camp Manager tiers.
const CAMP_MANAGER_IAP_SKUS = (Platform.OS === 'ios'
  ? [TIER_TO_PRODUCT_ID['camp-manager-event'].ios, TIER_TO_PRODUCT_ID['camp-manager-annual'].ios]
  : [TIER_TO_PRODUCT_ID['camp-manager-event'].android, TIER_TO_PRODUCT_ID['camp-manager-annual'].android]);

export function CampManagerPaywall() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [iapPaywallOpen, setIapPaywallOpen] = useState(false);
  const { toast } = useToast();

  const handleCheckout = async (
    priceId: string,
    mode: 'subscription' | 'payment',
    tierId: string,
  ) => {
    // App Store Guideline 3.1.1: digital subscriptions on iOS MUST use IAP,
    // not external/web checkout. Surface the native paywall sheet instead.
    if (Platform.OS === 'ios') {
      setIapPaywallOpen(true);
      return;
    }
    setLoadingTier(tierId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, mode },
      });
      if (error) throw error;
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to create checkout',
        variant: 'destructive',
      });
    } finally {
      setLoadingTier(null);
    }
  };

  const featureItems = [
    { icon: Calendar, label: 'Create & Manage Camps' },
    { icon: Users, label: 'Athlete Enrollment' },
    { icon: BarChart3, label: 'Performance Analytics' },
    { icon: Shield, label: 'Verified Data Layer' },
  ];

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.heroBlock}>
        <View style={s.pill}>
          <Shield size={20} color={colors.primary} />
          <Text style={s.pillText}>Camp Manager Pro</Text>
        </View>
        <Text style={s.h2}>Unlock Camp Manager</Text>
        <Text style={s.lead}>
          Create, manage, and monetize your camps. Capture real-time athlete performance data and
          generate AI-driven rankings.
        </Text>
      </View>

      {/* Tier cards */}
      <View style={s.cardsRow}>
        {/* Per Event */}
        <Card style={s.tierCard}>
          <CardHeader>
            <View style={s.titleRow}>
              <CardTitle>{PER_EVENT_TIER.name}</CardTitle>
            </View>
            <CardDescription>{PER_EVENT_TIER.description}</CardDescription>
            <View style={s.priceRow}>
              <Text style={s.price}>${PER_EVENT_TIER.amount}</Text>
              <Text style={s.priceUnit}>/event</Text>
            </View>
          </CardHeader>
          <CardContent style={s.cardContent}>
            <View style={s.list}>
              {PER_EVENT_TIER.features.map((f) => (
                <View key={f} style={s.listItem}>
                  <Check size={16} color={colors.primary} style={s.checkIcon} />
                  <Text style={s.listText}>{f}</Text>
                </View>
              ))}
            </View>
            <Button
              variant="outline"
              style={s.fullWidth}
              loading={loadingTier === PER_EVENT_TIER.id}
              disabled={loadingTier === PER_EVENT_TIER.id}
              onPress={() =>
                handleCheckout(PER_EVENT_TIER.priceId, PER_EVENT_TIER.mode, PER_EVENT_TIER.id)
              }
            >
              Get Per Event
            </Button>
          </CardContent>
        </Card>

        {/* Annual */}
        <Card style={s.tierCardFeatured}>
          {ANNUAL_TIER.badge ? (
            <Badge style={s.featuredBadge}>{ANNUAL_TIER.badge}</Badge>
          ) : null}
          <CardHeader>
            <View style={s.titleRow}>
              <CardTitle>{ANNUAL_TIER.name}</CardTitle>
            </View>
            <CardDescription>{ANNUAL_TIER.description}</CardDescription>
            <View style={s.priceRow}>
              <Text style={s.price}>${ANNUAL_TIER.amount}</Text>
              <Text style={s.priceUnit}>/year</Text>
            </View>
          </CardHeader>
          <CardContent style={s.cardContent}>
            <View style={s.list}>
              {ANNUAL_TIER.features.map((f) => (
                <View key={f} style={s.listItem}>
                  <Check size={16} color={colors.primary} style={s.checkIcon} />
                  <Text style={s.listText}>{f}</Text>
                </View>
              ))}
            </View>
            <Button
              style={s.fullWidth}
              loading={loadingTier === ANNUAL_TIER.id}
              disabled={loadingTier === ANNUAL_TIER.id}
              onPress={() =>
                handleCheckout(ANNUAL_TIER.priceId, ANNUAL_TIER.mode, ANNUAL_TIER.id)
              }
            >
              Get Annual Unlimited
            </Button>
          </CardContent>
        </Card>
      </View>

      {/* Feature tiles */}
      <View style={s.tilesRow}>
        {featureItems.map(({ icon: Icon, label }) => (
          <View key={label} style={s.tile}>
            <Icon size={24} color={colors.primary} />
            <Text style={s.tileLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* iOS native paywall (App Store IAP) — only mounted on iOS. */}
      {Platform.OS === 'ios' && (
        <PaywallSheet
          tier="Camp Manager"
          productIds={CAMP_MANAGER_IAP_SKUS}
          visible={iapPaywallOpen}
          onClose={() => setIapPaywallOpen(false)}
          onPurchaseComplete={() => setIapPaywallOpen(false)}
        />
      )}
    </View>
  );
}

export default CampManagerPaywall;

const s = StyleSheet.create({
  root: { gap: spacing.xl },

  // Hero
  heroBlock: { alignItems: 'center', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.primary + '1A', // ~10% alpha
    alignSelf: 'center',
  },
  pillText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  h2: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: '700',
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.heading,
  },
  lead: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 512,
  },

  // Tier cards row (md:grid-cols-2 → flex row; stacks via flexWrap on narrow screens)
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignSelf: 'stretch',
    maxWidth: 768,
    width: '100%',
    marginHorizontal: 'auto',
  },
  tierCard: {
    flexGrow: 1,
    flexBasis: 280,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  tierCardFeatured: {
    flexGrow: 1,
    flexBasis: 280,
    borderWidth: 2,
    borderColor: colors.primary,
    position: 'relative',
  },
  featuredBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.md,
    zIndex: 1,
  },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', paddingTop: spacing.xs },
  price: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: '700',
    fontSize: typography.fontSize['4xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  priceUnit: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    marginLeft: 4,
  },

  cardContent: { gap: spacing.md },
  list: { gap: spacing.xs },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  checkIcon: { marginTop: 2, flexShrink: 0 },
  listText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  fullWidth: { width: '100%' },

  // Feature tiles (grid-cols-2 md:grid-cols-4 → wrap row, each 48%/23%)
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignSelf: 'stretch',
    maxWidth: 768,
    width: '100%',
    marginHorizontal: 'auto',
    justifyContent: 'center',
  },
  tile: {
    flexGrow: 1,
    flexBasis: 140,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.secondary + '4D', // ~30% alpha (bg-secondary/30)
    borderRadius: 12,
  },
  tileLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
    textAlign: 'center',
  },
});
