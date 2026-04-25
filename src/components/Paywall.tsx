import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Button, Card, CardContent } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { fetchSubscriptions } from '@/lib/iap';
import { useSubscription } from '@/hooks/useSubscription';
import type { ProductSubscription } from 'expo-iap';

const MANAGE_SUBS_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

export interface PaywallSheetProps {
  /** Display label for the tier the user is being upsold to. */
  tier: string;
  /** Store SKUs to surface as buy buttons. Filtered against the live catalog. */
  productIds: string[];
  /** Called once a successful purchase has been validated server-side. */
  onPurchaseComplete: () => void;
  visible: boolean;
  onClose: () => void;
}

function localizedPriceOf(p: ProductSubscription): string {
  // OpenIAP product surfaces `displayPrice` (preferred) and a legacy
  // `localizedPrice`. Prefer either, fall back to a constructed string.
  const anyP = p as unknown as Record<string, unknown>;
  return (
    (anyP.displayPrice as string | undefined) ??
    (anyP.localizedPrice as string | undefined) ??
    (anyP.price ? String(anyP.price) : '—')
  );
}

function titleOf(p: ProductSubscription): string {
  const anyP = p as unknown as Record<string, unknown>;
  return (
    (anyP.title as string | undefined) ??
    (anyP.displayName as string | undefined) ??
    p.id
  );
}

function descriptionOf(p: ProductSubscription): string {
  const anyP = p as unknown as Record<string, unknown>;
  return (anyP.description as string | undefined) ?? '';
}

export function PaywallSheet({
  tier,
  productIds,
  onPurchaseComplete,
  visible,
  onClose,
}: PaywallSheetProps) {
  const { purchase, restore, isActive } = useSubscription();
  const [products, setProducts] = useState<ProductSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSubscriptions()
      .then(all => {
        if (cancelled) return;
        const filtered = all.filter(p => productIds.includes(p.id));
        setProducts(filtered);
      })
      .catch(err => {
        if (!cancelled) setError(err?.message ?? 'Failed to load products');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, productIds]);

  // If the user becomes entitled while the paywall is open, dismiss it.
  useEffect(() => {
    if (visible && isActive) onPurchaseComplete();
  }, [visible, isActive, onPurchaseComplete]);

  const handleBuy = async (sku: string) => {
    setBusySku(sku);
    setError(null);
    try {
      await purchase(sku);
      // The purchase listener in useSubscription will refresh the cache.
    } catch (err) {
      setError((err as Error)?.message ?? 'Purchase failed');
    } finally {
      setBusySku(null);
    }
  };

  const handleRestore = async () => {
    setBusySku('__restore__');
    setError(null);
    try {
      await restore();
    } catch (err) {
      setError((err as Error)?.message ?? 'Restore failed');
    } finally {
      setBusySku(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Upgrade to {tier}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close paywall"
              hitSlop={12}
            >
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody}>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : products.length === 0 ? (
              <Text style={styles.muted}>
                No subscriptions available right now. Please try again later.
              </Text>
            ) : (
              products.map(p => (
                <Card key={p.id} style={styles.card}>
                  <CardContent>
                    <Text style={styles.productTitle}>{titleOf(p)}</Text>
                    {!!descriptionOf(p) && (
                      <Text style={styles.productDesc}>{descriptionOf(p)}</Text>
                    )}
                    <Text style={styles.price}>{localizedPriceOf(p)}</Text>
                    <Button
                      onPress={() => handleBuy(p.id)}
                      loading={busySku === p.id}
                      disabled={busySku !== null}
                      style={styles.buyButton}
                    >
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              variant="ghost"
              onPress={handleRestore}
              loading={busySku === '__restore__'}
              disabled={busySku !== null}
              style={styles.restore}
            >
              Restore Purchases
            </Button>

            <Text style={styles.disclaimer}>
              Subscription auto-renews. Manage in{' '}
              <Text
                style={styles.link}
                onPress={() => Linking.openURL(MANAGE_SUBS_URL)}
                accessibilityRole="link"
              >
                Settings
              </Text>
              .
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default PaywallSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size['2xl'],
    color: colors.foreground,
  },
  close: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size['2xl'],
    color: colors.foregroundSubtle,
    paddingHorizontal: spacing.sm,
  },
  scrollBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  productTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.xl,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  productDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.foregroundSubtle,
    marginBottom: spacing.sm,
  },
  price: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size['2xl'],
    color: colors.primary,
    marginBottom: spacing.md,
  },
  buyButton: {
    marginTop: spacing.sm,
  },
  restore: {
    marginTop: spacing.md,
  },
  muted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  error: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.destructive,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  disclaimer: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
