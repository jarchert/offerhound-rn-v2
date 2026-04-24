// Verbatim port of Lovable's src/components/ReferralCard.tsx
// React Native adaptations:
//   - lucide-react              → lucide-react-native
//   - react-router-dom navigate → @react-navigation/native useNavigation
//   - sonner toast              → @/components/ui/toast wrapper
//   - navigator.clipboard       → expo-clipboard
//   - navigator.share           → React Native Share API
//   - HTML/CSS classNames       → RN View/Text/Pressable + StyleSheet (theme tokens)
// useReferrals: inline local stub (real hook lives in Lovable repo only;
// session4 ports use minimal stubs until the data layer is wired in v2).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Share, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  Gift,
  Copy,
  Share2,
  CheckCircle,
  Users,
  Percent,
  ExternalLink,
  ArrowRight,
  Star,
  Crown,
} from 'lucide-react-native';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/toast';
import { useSubscription } from '@/hooks/useSubscription';
import { colors, typography, spacing, radius } from '@/lib/theme';

// --- Inline useReferrals stub (replace once src/hooks/useReferrals.ts exists) ---
function useReferrals() {
  const [isLoading, setIsLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [successfulReferrals, setSuccessfulReferrals] = useState<number>(0);
  const [rewardsEarned, setRewardsEarned] = useState<number>(0);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 0);
    return () => clearTimeout(t);
  }, []);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const shareReferralLink = useCallback(async (): Promise<'shared' | 'copied' | 'failed'> => {
    const productionUrl = 'https://offer-hound.com';
    const link = referralCode ? `${productionUrl}/pricing?ref=${referralCode}` : '';
    if (!link) return 'failed';
    try {
      const result = await Share.share({
        message: `Join me on OfferHound: ${link}`,
        url: link,
      });
      if (result.action === Share.sharedAction) return 'shared';
      const ok = await Clipboard.setStringAsync(link).then(() => true).catch(() => false);
      return ok ? 'copied' : 'failed';
    } catch {
      const ok = await Clipboard.setStringAsync(link).then(() => true).catch(() => false);
      return ok ? 'copied' : 'failed';
    }
  }, [referralCode]);

  void setReferralCode;
  void setSuccessfulReferrals;
  void setRewardsEarned;

  return { referralCode, isLoading, successfulReferrals, rewardsEarned, shareReferralLink, copyToClipboard };
}

// Tier configuration
const REFERRAL_TIERS = [
  { name: 'Standard', minReferrals: 1, discount: 50, icon: Star },
  { name: 'Gold', minReferrals: 5, discount: 75, icon: Crown },
];

const getCurrentTier = (successfulReferrals: number) => {
  for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
    if (successfulReferrals >= REFERRAL_TIERS[i].minReferrals) {
      return REFERRAL_TIERS[i];
    }
  }
  return REFERRAL_TIERS[0];
};

const getNextTier = (successfulReferrals: number) => {
  for (const tier of REFERRAL_TIERS) {
    if (successfulReferrals < tier.minReferrals) {
      return tier;
    }
  }
  return null;
};

export function ReferralCard() {
  const navigation = useNavigation<any>();
  const { isSubscribed, isCoachOrScout } = useSubscription();
  const {
    referralCode,
    isLoading,
    successfulReferrals,
    rewardsEarned,
    shareReferralLink,
    copyToClipboard,
  } = useReferrals();
  const [copied, setCopied] = useState(false);

  // Coaches and scouts can participate in the referral program
  const canRefer = isSubscribed || isCoachOrScout;

  if (!canRefer) {
    return (
      <Card style={s.lockedCard}>
        <CardHeader>
          <View style={s.titleRow}>
            <Gift size={20} color={colors.primary} />
            <CardTitle style={s.lockedTitle}>Referral Program</CardTitle>
          </View>
          <CardDescription>
            Subscribe to unlock our referral program and earn 50% off for 3 months!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <View style={s.lockedBadgeWrap}>
            <Badge variant="secondary" style={s.subscribersBadge}>
              <Text style={s.subscribersBadgeText}>Subscribers Only</Text>
            </Badge>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent style={s.loaderContent}>
          <ActivityIndicator size="small" color={colors.primary} />
        </CardContent>
      </Card>
    );
  }

  const productionUrl = 'https://offer-hound.com';
  const referralLink = referralCode ? `${productionUrl}/pricing?ref=${referralCode}` : '';

  const handleCopy = async () => {
    if (referralLink) {
      const success = await copyToClipboard(referralLink);
      if (success) {
        setCopied(true);
        toast.success('Referral link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleShare = async () => {
    const result = await shareReferralLink();
    if (result === 'copied') {
      toast.success('Referral link copied to clipboard!');
    } else if (result === 'shared') {
      toast.success('Referral link shared!');
    } else {
      toast.error('Could not share referral link. Please try copying it instead.');
    }
  };

  const currentTier = getCurrentTier(successfulReferrals);
  const nextTier = getNextTier(successfulReferrals);
  const referralsToNextTier = nextTier ? nextTier.minReferrals - successfulReferrals : 0;
  const TierIcon = currentTier.icon;
  const isGold = currentTier.name === 'Gold';

  return (
    <Card style={s.cardOuter}>
      {/* Decorative primary orb (top-right) */}
      <View style={s.decorOrb} pointerEvents="none" />

      <CardHeader style={s.headerRel}>
        <View style={s.headerRow}>
          <View style={s.titleRow}>
            <Gift size={24} color={colors.primary} />
            <CardTitle style={s.titleText}>Invite Friends & Earn Rewards</CardTitle>
          </View>
          <View style={s.badgeRow}>
            {successfulReferrals > 0 && (
              <Badge
                variant="outline"
                style={isGold ? s.goldTierBadge : s.primaryTierBadge}
              >
                <View style={s.tierBadgeInner}>
                  <TierIcon size={12} color={isGold ? YELLOW_600 : colors.primary} />
                  <Text style={isGold ? s.goldTierBadgeText : s.primaryTierBadgeText}>
                    {' '}{currentTier.name}
                  </Text>
                </View>
              </Badge>
            )}
            <Badge variant="outline" style={s.primaryTierBadge}>
              <View style={s.tierBadgeInner}>
                <Percent size={12} color={colors.primary} />
                <Text style={s.primaryTierBadgeText}>
                  {' '}{successfulReferrals >= 5 ? '75%' : '50%'} Off
                </Text>
              </View>
            </Badge>
          </View>
        </View>
        <CardDescription style={s.descriptionText}>
          Share your referral link. When a friend subscribes, you get{' '}
          <Text style={s.descStrongPrimary}>
            {successfulReferrals >= 5 ? '75%' : '50%'} off for 3 months!
          </Text>
        </CardDescription>
      </CardHeader>

      <CardContent style={s.contentSpacing}>
        {/* Referral Link Section */}
        <View style={s.section}>
          <Text style={s.label}>Your Referral Link</Text>
          <View style={s.row}>
            <View style={s.inputWrap}>
              <Input value={referralLink} editable={false} style={s.inputMono} />
            </View>
            <Pressable onPress={handleCopy} style={s.iconButton}>
              {copied ? (
                <CheckCircle size={16} color={GREEN_500} />
              ) : (
                <Copy size={16} color={colors.foreground} />
              )}
            </Pressable>
            <Pressable onPress={handleShare} style={s.iconButtonPrimary}>
              <Share2 size={16} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </View>

        {/* Stats Section */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <View style={s.statHeaderRow}>
              <Users size={16} color={colors.mutedForeground} />
              <Text style={s.statLabel}>Friends Referred</Text>
            </View>
            <Text style={s.statValue}>{successfulReferrals}</Text>
          </View>
          <View style={[s.statCard, s.statCardPrimary]}>
            <View style={s.statHeaderRow}>
              <Gift size={16} color={colors.primary} />
              <Text style={s.statLabelPrimary}>Rewards Earned</Text>
            </View>
            <Text style={s.statValuePrimary}>{rewardsEarned}</Text>
          </View>
        </View>

        {/* Tier Progress */}
        {nextTier && (
          <View style={s.tierProgressCard}>
            <View style={s.tierProgressHeader}>
              <Crown size={16} color={YELLOW_600} />
              <Text style={s.tierProgressTitle}>Unlock Gold Tier</Text>
            </View>
            <Text style={s.tierProgressText}>
              Refer{' '}
              <Text style={s.strongFg}>
                {referralsToNextTier} more friend{referralsToNextTier !== 1 ? 's' : ''}
              </Text>{' '}
              to unlock <Text style={s.strongYellow}>75% off</Text> rewards!
            </Text>
            <View style={s.progressTrack}>
              <LinearGradient
                colors={[YELLOW_500, AMBER_500]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  s.progressFill,
                  { width: `${Math.min(100, (successfulReferrals / nextTier.minReferrals) * 100)}%` },
                ]}
              />
            </View>
            <Text style={s.progressCount}>
              {successfulReferrals}/{nextTier.minReferrals} referrals
            </Text>
          </View>
        )}

        {successfulReferrals >= 5 && (
          <View style={s.goldUnlockCard}>
            <View style={s.goldUnlockHeader}>
              <Crown size={20} color={YELLOW_600} />
              <Text style={s.goldUnlockTitle}>Gold Tier Unlocked!</Text>
            </View>
            <Text style={s.goldUnlockText}>
              You're earning maximum rewards - 75% off for 3 months per referral!
            </Text>
          </View>
        )}

        {/* Track Referrals Link */}
        <View style={s.trackSection}>
          <Button
            variant="outline"
            style={s.trackButton}
            leftIcon={<ExternalLink size={16} color={colors.foreground} />}
            rightIcon={<ArrowRight size={16} color={colors.foreground} />}
            onPress={() => {
              try {
                navigation.navigate('Referrals' as never);
              } catch {
                /* navigator may not be present in all hosts */
              }
            }}
          >
            View Detailed Referral Tracking
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

export default ReferralCard;

// --- Local color constants (parity with Tailwind yellow/amber/green palette) ---
const YELLOW_500 = '#eab308';
const YELLOW_600 = '#ca8a04';
const YELLOW_700 = '#a16207';
const AMBER_500 = '#f59e0b';
const GREEN_500 = '#22c55e';

const s = StyleSheet.create({
  // Locked (non-subscriber) state
  lockedCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(231,175,8,0.20)',
    backgroundColor: colors.card,
  } as ViewStyle,
  lockedTitle: { fontSize: typography.fontSize.lg, color: colors.foreground, flexShrink: 1 },
  lockedBadgeWrap: { alignItems: 'center', paddingVertical: spacing.md },
  subscribersBadge: {
    backgroundColor: 'rgba(231,175,8,0.10)',
    borderWidth: 0,
  },
  subscribersBadgeText: { color: colors.primary, fontSize: typography.fontSize.xs },

  // Loader
  loaderContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg } as ViewStyle,

  // Card outer
  cardOuter: {
    borderColor: 'rgba(231,175,8,0.20)',
    backgroundColor: colors.card,
    overflow: 'hidden',
    position: 'relative',
  },
  decorOrb: {
    position: 'absolute',
    top: -64,
    right: -64,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(231,175,8,0.10)',
  },

  // Header
  headerRel: { position: 'relative' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  titleText: { fontSize: typography.fontSize.xl, color: colors.foreground, flexShrink: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tierBadgeInner: { flexDirection: 'row', alignItems: 'center' },
  primaryTierBadge: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  primaryTierBadgeText: { color: colors.primary, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bodySemiBold },
  goldTierBadge: {
    borderWidth: 1,
    borderColor: YELLOW_500,
    backgroundColor: 'rgba(234,179,8,0.10)',
  },
  goldTierBadgeText: { color: YELLOW_600, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bodySemiBold },

  descriptionText: { fontSize: typography.fontSize.base, color: colors.mutedForeground },
  descStrongPrimary: { color: colors.primary, fontFamily: typography.fontFamily.bodyBold },

  // Content
  contentSpacing: { gap: spacing.lg, position: 'relative' },

  // Sections
  section: { gap: spacing.xs },
  label: { fontSize: typography.fontSize.sm, color: colors.mutedForeground, fontFamily: typography.fontFamily.bodySemiBold },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  inputWrap: { flex: 1 },
  inputMono: {
    backgroundColor: 'rgba(32,36,43,0.50)',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: typography.fontSize.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  iconButtonPrimary: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  // Stats
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(32,36,43,0.50)',
    borderWidth: 1,
    borderColor: 'rgba(43,48,58,0.50)',
  },
  statCardPrimary: {
    backgroundColor: 'rgba(231,175,8,0.10)',
    borderColor: 'rgba(231,175,8,0.20)',
  },
  statHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  statLabel: { fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  statLabelPrimary: { fontSize: typography.fontSize.sm, color: colors.primary },
  statValue: { fontSize: typography.fontSize['2xl'], fontFamily: typography.fontFamily.bodyBold, color: colors.foreground },
  statValuePrimary: { fontSize: typography.fontSize['2xl'], fontFamily: typography.fontFamily.bodyBold, color: colors.primary },

  // Tier progress (gold unlock nudge)
  tierProgressCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(234,179,8,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.20)',
  },
  tierProgressHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  tierProgressTitle: { fontSize: typography.fontSize.sm, color: YELLOW_700, fontFamily: typography.fontFamily.bodySemiBold },
  tierProgressText: { fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  strongFg: { color: colors.foreground, fontFamily: typography.fontFamily.bodyBold },
  strongYellow: { color: YELLOW_600, fontFamily: typography.fontFamily.bodyBold },
  progressTrack: {
    marginTop: spacing.xs,
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },
  progressCount: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 4 },

  // Gold unlocked (post-threshold)
  goldUnlockCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(234,179,8,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.30)',
  },
  goldUnlockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  goldUnlockTitle: { color: YELLOW_700, fontFamily: typography.fontFamily.bodySemiBold },
  goldUnlockText: { fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 4 },

  // Track section
  trackSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(43,48,58,0.50)',
  },
  trackButton: { width: '100%' },
});
