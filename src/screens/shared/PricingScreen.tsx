// PricingScreen — IAP-friendly RN port of Lovable src/pages/Pricing.tsx
//
// CRITICAL: Apple's App Review (3.1.1) forbids linking out to web checkout for
// digital goods on iOS. This screen therefore:
//   - Reads tier metadata from `@/lib/pricing` PRICING_TIERS (mirrored from web)
//   - Maps each tier to the matching IAP product id via `@/lib/iap`
//     `TIER_TO_PRODUCT_ID`
//   - Opens `<PaywallSheet />` (modal) for purchase, NEVER a Stripe URL
//   - Free tiers route directly to the relevant role dashboard
//   - Stripe / web fallback ONLY shown when Platform.OS !== 'ios'
//     (Android is allowed Stripe via external links per current Play policy,
//     but we still prefer Google Play Billing through the same IAP modal)
//
// Sourced from /home/ubuntu/.openclaw/workspace/offerhound-repo/src/pages/Pricing.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Check,
  Zap,
  Crown,
  ArrowRight,
  Tag,
  Shield,
  Trophy,
  Sparkles,
} from 'lucide-react-native';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import PaywallSheet from '@/components/Paywall';
import { TIER_TO_PRODUCT_ID, type SubscriptionTierId } from '@/lib/iap';
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing';
import { shouldHidePricingUI } from '@/lib/platform';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { Navbar } from '@/components/Navbar';

const isIos = Platform.OS === 'ios';

/** Look up the platform SKU for a Lovable PricingTier id. */
function skusForTier(tierId: string): string[] {
  const entry = (TIER_TO_PRODUCT_ID as any)[tierId];
  if (!entry) return [];
  return [Platform.OS === 'ios' ? entry.ios : entry.android];
}

function isIapTier(tierId: string): tierId is SubscriptionTierId {
  return tierId in TIER_TO_PRODUCT_ID;
}

interface TierCardProps {
  tier: PricingTier;
  highlight?: boolean;
  loading: boolean;
  onSubscribe: (t: PricingTier) => void;
}

function TierCard({ tier, highlight, loading, onSubscribe }: TierCardProps) {
  return (
    <Card style={{ ...styles.tierCard, ...(highlight ? styles.tierCardHighlight : {}) }}>
      {tier.badge ? (
        <View style={styles.badgeWrap}>
          <Badge style={styles.badge}>
            <Text style={styles.badgeText}>{tier.badge}</Text>
          </Badge>
        </View>
      ) : null}
      <CardHeader>
        <CardTitle>
          <Text style={styles.tierTitle}>{tier.name.toUpperCase()}</Text>
        </CardTitle>
        <CardDescription>
          <Text style={styles.tierDesc}>{tier.description}</Text>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View style={styles.priceRow}>
          {tier.amount === 0 ? (
            <Text style={styles.priceFree}>FREE</Text>
          ) : (
            <View style={styles.priceInner}>
              <Text style={styles.priceAmount}>${tier.amount.toFixed(2)}</Text>
              {tier.interval ? (
                <Text style={styles.priceInterval}>
                  /{tier.interval === 'month' ? 'mo' : 'yr'}
                </Text>
              ) : (
                <Text style={styles.priceOneTime}>one-time</Text>
              )}
            </View>
          )}
        </View>
        <View style={styles.featureList}>
          {tier.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Check size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </CardContent>
      <CardFooter>
        <Button
          onPress={() => onSubscribe(tier)}
          disabled={loading}
          variant={highlight ? 'default' : 'outline'}
          size="lg"
          style={styles.cta}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <View style={styles.ctaInner}>
              <Text
                style={[
                  styles.ctaText,
                  !highlight && { color: colors.foreground },
                ]}>
                {tier.amount === 0 ? 'Get Started Free' : 'Subscribe'}
              </Text>
              {tier.amount !== 0 && (
                <ArrowRight
                  size={16}
                  color={highlight ? colors.primaryForeground : colors.foreground}
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function PricingScreen() {
  const nav = useNavigation<any>();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth() as any;
  const { refresh } = useSubscription() as any;

  const [couponCode, setCouponCode] = useState('');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'athlete' | 'coach'>('athlete');

  // Paywall sheet state
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallTier, setPaywallTier] = useState<PricingTier | null>(null);

  // Web-fallback hint (Android allowlist or future web-checkout flag).
  // PORT-PENDING: role-aware "free for influencer / coach" branches require
  // useUserRoles hook — surfaced as a banner instead of a separate screen.
  const hideUI = shouldHidePricingUI();

  const athleteTiers = useMemo(
    () => PRICING_TIERS.filter(t => t.category === 'athlete'),
    [],
  );
  const coachTiers = useMemo(
    () => PRICING_TIERS.filter(t => t.category === 'coach'),
    [],
  );

  function openPaywall(tier: PricingTier) {
    setPaywallTier(tier);
    setPaywallVisible(true);
  }

  async function handleSubscribe(tier: PricingTier) {
    if (!isAuthenticated) {
      nav.navigate('AuthStack' as never, { screen: 'SignIn' } as never);
      return;
    }

    if (tier.amount === 0) {
      toast({
        title: 'Free Access',
        description:
          tier.id === 'college-coach'
            ? 'College coaches enjoy complimentary access.'
            : 'Free tier — no purchase required.',
      });
      // Navigate to relevant dashboard based on tier category
      if (tier.category === 'coach') nav.navigate('CoachTabs' as never);
      else nav.navigate('AthleteTabs' as never);
      return;
    }

    if (isIapTier(tier.id)) {
      // Open IAP paywall sheet — NEVER a Stripe URL on iOS.
      openPaywall(tier);
      return;
    }

    // Non-IAP tier on Android (rare). Stripe path is intentionally not wired
    // here on iOS. PORT-PENDING for Android web-checkout fallback.
    if (!isIos) {
      toast({
        title: 'Web checkout',
        description: 'Please complete this purchase on offer-hound.com.',
      });
      return;
    }

    toast({
      title: 'Subscription unavailable',
      description: 'This tier is not yet available in the mobile app.',
      variant: 'destructive',
    });
  }

  function handlePurchaseComplete() {
    setPaywallVisible(false);
    setPaywallTier(null);
    refresh?.();
    nav.navigate('SubscriptionSuccess' as never);
  }

  // Hidden-UI branch (parity with shouldHidePricingUI() web path).
  if (hideUI) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Badge style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>Account</Text>
        </Badge>
        <Text style={styles.heroTitle}>MANAGE YOUR PLAN</Text>
        <Text style={styles.heroSubtitle}>
          To view plans, start a subscription, or manage billing, please visit{' '}
          <Text style={styles.heroBold}>offer-hound.com</Text> from a web browser.
        </Text>
        <Text style={styles.heroSmall}>
          All your existing premium features remain active in the app.
        </Text>
      </ScrollView>
    );
  }

  return (
    <>
      <Navbar />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.heroWrap}>
          <Badge style={styles.heroBadge}>
            <View style={styles.badgeRow}>
              <Zap size={12} color={colors.foreground} />
              <Text style={styles.heroBadgeText}>  Plans & Pricing</Text>
            </View>
          </Badge>
          <Text style={styles.heroTitle}>CHOOSE YOUR PLAN</Text>
          <Text style={styles.heroSubtitle}>
            Flexible pricing for athletes, families, and coaches at every level.
          </Text>
        </View>

        {/* Coupon (informational only — IAP doesn't accept Stripe coupons). */}
        {!isIos && (
          <View style={styles.couponWrap}>
            <Tag
              size={16}
              color={colors.mutedForeground}
              style={styles.couponIcon}
            />
            <Input
              placeholder="Coupon code (optional)"
              value={couponCode}
              onChangeText={setCouponCode}
              style={styles.couponInput}
            />
          </View>
        )}

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
          <TabsList style={styles.tabsList}>
            <TabsTrigger value="athlete">
              <View style={styles.tabRow}>
                <Trophy size={14} color={colors.foreground} />
                <Text style={styles.tabText}>  Athletes & Parents</Text>
              </View>
            </TabsTrigger>
            <TabsTrigger value="coach">
              <View style={styles.tabRow}>
                <Shield size={14} color={colors.foreground} />
                <Text style={styles.tabText}>  Coaches</Text>
              </View>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="athlete">
            <View style={styles.grid}>
              {athleteTiers.map(t => (
                <TierCard
                  key={t.id}
                  tier={t}
                  highlight={t.id === 'recruit-pro'}
                  loading={loadingTier === t.id}
                  onSubscribe={handleSubscribe}
                />
              ))}
            </View>
          </TabsContent>

          <TabsContent value="coach">
            <View style={styles.grid}>
              {coachTiers.map(t => (
                <TierCard
                  key={t.id}
                  tier={t}
                  highlight={t.id === 'club-coach'}
                  loading={loadingTier === t.id}
                  onSubscribe={handleSubscribe}
                />
              ))}
            </View>
          </TabsContent>
        </Tabs>

        <Text style={styles.footnote}>Cancel anytime. No hidden fees.</Text>

        {/* Manage subscriptions deep link (App Store / Play Store) */}
        <Pressable
          onPress={() => {
            // Re-uses Paywall's manage URL convention via Linking is fine here.
            const url = isIos
              ? 'https://apps.apple.com/account/subscriptions'
              : 'https://play.google.com/store/account/subscriptions';
            require('react-native').Linking.openURL(url).catch(() => {});
          }}>
          <Text style={styles.manageLink}>
            Already subscribed? Manage your subscription →
          </Text>
        </Pressable>
      </ScrollView>

      {paywallTier ? (
        <PaywallSheet
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          tier={paywallTier.name}
          productIds={skusForTier(paywallTier.id)}
          onPurchaseComplete={handlePurchaseComplete}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  heroWrap: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  heroBadge: {
    backgroundColor: colors.secondary,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  heroBadgeText: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
  },
  heroTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['4xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  heroSmall: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  heroBold: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  couponWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    maxWidth: 360,
    alignSelf: 'center',
    width: '100%',
  },
  couponIcon: { marginRight: spacing.sm },
  couponInput: { flex: 1, color: colors.foreground },
  tabsList: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: spacing.lg,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: 4,
  },
  tabRow: { flexDirection: 'row', alignItems: 'center' },
  tabText: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
  },
  grid: {
    flexDirection: 'column',
    gap: spacing.md,
    paddingHorizontal: 0,
  },
  tierCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  tierCardHighlight: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  badgeWrap: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
  },
  tierTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    textAlign: 'center',
  },
  tierDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  priceRow: { alignItems: 'center', marginVertical: spacing.md },
  priceInner: { flexDirection: 'row', alignItems: 'flex-end' },
  priceFree: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['4xl'],
    color: colors.foreground,
  },
  priceAmount: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['4xl'],
    color: colors.foreground,
  },
  priceInterval: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    marginBottom: 6,
  },
  priceOneTime: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    marginLeft: 6,
    marginBottom: 6,
  },
  featureList: { gap: spacing.xs },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  featureText: {
    flex: 1,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  cta: { width: '100%', marginTop: spacing.sm },
  ctaInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ctaText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
  },
  footnote: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.lg,
  },
  manageLink: {
    textAlign: 'center',
    color: colors.primary,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.md,
  },
});
