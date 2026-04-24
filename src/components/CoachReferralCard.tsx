// Verbatim port of Lovable's src/components/CoachReferralCard.tsx
// React Native adaptations:
//   - lucide-react           → lucide-react-native
//   - react-router-dom navigate → @react-navigation/native useNavigation
//   - sonner toast           → @/components/ui/toast wrapper
//   - copy-to-clipboard      → expo-clipboard
//   - browser share          → React Native Share API (with expo-sharing fallback)
//   - HTML/CSS classNames    → RN View/Text/Pressable + StyleSheet using theme tokens
// useReferrals: inline local stub (real hook lives in Lovable repo only;
// session4 ports use minimal stubs until the data layer is wired in v2).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Share, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import {
  Gift,
  Copy,
  CheckCircle,
  Users,
  ExternalLink,
  ArrowRight,
  Star,
  Crown,
  UserPlus,
} from 'lucide-react-native';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/toast';
import { colors, typography, spacing, radius } from '@/lib/theme';

// --- Inline useReferrals stub (replace once src/hooks/useReferrals.ts exists) ---
function useReferrals() {
  const [isLoading, setIsLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [successfulReferrals, setSuccessfulReferrals] = useState<number>(0);

  useEffect(() => {
    // Stub: simulate loaded state with no code yet.
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
      // Fallback to expo-sharing if available, else clipboard.
      if (await Sharing.isAvailableAsync()) {
        // expo-sharing requires a file URI; fall through to clipboard for plain links.
      }
      const ok = await Clipboard.setStringAsync(link).then(() => true).catch(() => false);
      return ok ? 'copied' : 'failed';
    } catch {
      const ok = await Clipboard.setStringAsync(link).then(() => true).catch(() => false);
      return ok ? 'copied' : 'failed';
    }
  }, [referralCode]);

  // expose setters so future wiring is trivial
  void setReferralCode;
  void setSuccessfulReferrals;

  return { referralCode, isLoading, successfulReferrals, shareReferralLink, copyToClipboard };
}

// Tier configuration for coaches
const COACH_REFERRAL_TIERS = [
  { name: 'Bronze', minReferrals: 1, reward: 'Featured in coach directory', icon: Star },
  { name: 'Silver', minReferrals: 5, reward: 'Priority athlete notifications', icon: Star },
  { name: 'Gold', minReferrals: 10, reward: 'Premium recruiting tools', icon: Crown },
];

const getCurrentTier = (successfulReferrals: number) => {
  for (let i = COACH_REFERRAL_TIERS.length - 1; i >= 0; i--) {
    if (successfulReferrals >= COACH_REFERRAL_TIERS[i].minReferrals) {
      return COACH_REFERRAL_TIERS[i];
    }
  }
  return null;
};

const getNextTier = (successfulReferrals: number) => {
  for (const tier of COACH_REFERRAL_TIERS) {
    if (successfulReferrals < tier.minReferrals) {
      return tier;
    }
  }
  return null;
};

export function CoachReferralCard() {
  const navigation = useNavigation<any>();
  const {
    referralCode,
    isLoading,
    successfulReferrals,
    shareReferralLink,
    copyToClipboard,
  } = useReferrals();
  const [copied, setCopied] = useState(false);

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

  // shareReferralLink available for future Share button wiring (parity hook).
  void shareReferralLink;

  const currentTier = getCurrentTier(successfulReferrals);
  const nextTier = getNextTier(successfulReferrals);
  const referralsToNextTier = nextTier ? nextTier.minReferrals - successfulReferrals : 0;

  return (
    <Card style={s.cardOuter}>
      {/* Decorative emerald orb (top-right) */}
      <View style={s.decorOrb} pointerEvents="none" />

      <CardHeader style={s.headerRel}>
        <View style={s.headerRow}>
          <View style={s.titleRow}>
            <UserPlus size={24} color={EMERALD_500} />
            <CardTitle style={s.titleText}>Invite Athletes & Earn Rewards</CardTitle>
          </View>
          {currentTier && (
            <Badge variant="outline" style={s.tierBadge}>
              <View style={s.tierBadgeInner}>
                <currentTier.icon size={12} color={EMERALD_600} />
                <Text style={s.tierBadgeText}> {currentTier.name} Tier</Text>
              </View>
            </Badge>
          )}
        </View>
        <CardDescription style={s.descriptionText}>
          Help athletes get discovered! Share your referral link with athletes. When they subscribe, you unlock{' '}
          <Text style={s.descStrongEmerald}>exclusive rewards</Text>.
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
          </View>
        </View>

        {/* Stats Section */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <View style={s.statHeaderRow}>
              <Users size={16} color={colors.mutedForeground} />
              <Text style={s.statLabel}>Athletes Referred</Text>
            </View>
            <Text style={s.statValue}>{successfulReferrals}</Text>
          </View>
          <View style={[s.statCard, s.statCardEmerald]}>
            <View style={s.statHeaderRow}>
              <Gift size={16} color={EMERALD_600} />
              <Text style={s.statLabelEmerald}>Current Reward</Text>
            </View>
            <Text style={s.statRewardText}>
              {currentTier ? currentTier.reward : 'Refer your first athlete!'}
            </Text>
          </View>
        </View>

        {/* Tier Progress */}
        {nextTier && (
          <View style={s.tierProgressCard}>
            <View style={s.tierProgressHeader}>
              <nextTier.icon size={16} color={EMERALD_600} />
              <Text style={s.tierProgressTitle}>Unlock {nextTier.name} Tier</Text>
            </View>
            <Text style={s.tierProgressText}>
              Refer{' '}
              <Text style={s.strongFg}>
                {referralsToNextTier} more athlete{referralsToNextTier !== 1 ? 's' : ''}
              </Text>{' '}
              to unlock: <Text style={s.strongEmerald}>{nextTier.reward}</Text>
            </Text>
            <View style={s.progressTrack}>
              <LinearGradient
                colors={[EMERALD_500, TEAL_500]}
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

        {successfulReferrals >= 10 && (
          <View style={s.goldUnlockCard}>
            <View style={s.goldUnlockHeader}>
              <Crown size={20} color={YELLOW_600} />
              <Text style={s.goldUnlockTitle}>Gold Tier Unlocked!</Text>
            </View>
            <Text style={s.goldUnlockText}>
              You've unlocked all rewards - thank you for helping athletes get recruited!
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

export default CoachReferralCard;

// --- Local color constants (parity with Tailwind emerald/teal/yellow/green-500 palette) ---
const EMERALD_500 = '#10b981';
const EMERALD_600 = '#059669';
const EMERALD_700 = '#047857';
const TEAL_500 = '#14b8a6';
const YELLOW_600 = '#ca8a04';
const YELLOW_700 = '#a16207';
const GREEN_500 = '#22c55e';

const s = StyleSheet.create({
  loaderContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg } as ViewStyle,
  cardOuter: {
    borderColor: 'rgba(16,185,129,0.30)',
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
    backgroundColor: 'rgba(16,185,129,0.10)',
  },
  headerRel: { position: 'relative' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  titleText: { fontSize: typography.fontSize.lg, color: colors.foreground, flexShrink: 1 },
  tierBadge: {
    borderWidth: 1,
    borderColor: EMERALD_500,
    backgroundColor: 'rgba(16,185,129,0.10)',
  },
  tierBadgeInner: { flexDirection: 'row', alignItems: 'center' },
  tierBadgeText: { color: EMERALD_600, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bodySemiBold },
  descriptionText: { fontSize: typography.fontSize.base, color: colors.mutedForeground, marginTop: spacing.xs },
  descStrongEmerald: { color: EMERALD_600, fontFamily: typography.fontFamily.bodySemiBold },

  contentSpacing: { gap: spacing.md, position: 'relative' },
  section: { gap: spacing.xs },
  label: { fontSize: typography.fontSize.sm, color: colors.mutedForeground, fontFamily: typography.fontFamily.bodySemiBold },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  inputWrap: { flex: 1 },
  inputMono: { backgroundColor: 'rgba(32,36,43,0.5)', fontFamily: 'Courier' as any, fontSize: typography.fontSize.sm },
  iconButton: {
    width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card,
  },

  statsGrid: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: 'rgba(32,36,43,0.5)', borderWidth: 1, borderColor: 'rgba(43,48,58,0.5)',
  },
  statCardEmerald: {
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderColor: 'rgba(16,185,129,0.20)',
  },
  statHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  statLabel: { fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  statLabelEmerald: { fontSize: typography.fontSize.sm, color: EMERALD_600 },
  statValue: { fontSize: typography.fontSize.xl, color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold },
  statRewardText: { fontSize: typography.fontSize.sm, color: EMERALD_600, fontFamily: typography.fontFamily.bodySemiBold },

  tierProgressCard: {
    padding: spacing.md, borderRadius: radius.md,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.20)',
  },
  tierProgressHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  tierProgressTitle: { fontSize: typography.fontSize.sm, color: EMERALD_700, fontFamily: typography.fontFamily.bodySemiBold },
  tierProgressText: { fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  strongFg: { color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold },
  strongEmerald: { color: EMERALD_600, fontFamily: typography.fontFamily.bodySemiBold },
  progressTrack: { marginTop: spacing.xs, height: 8, backgroundColor: colors.muted, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressCount: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 4 },

  goldUnlockCard: {
    padding: spacing.md, borderRadius: radius.md,
    backgroundColor: 'rgba(234,179,8,0.20)',
    borderWidth: 1, borderColor: 'rgba(234,179,8,0.30)',
  },
  goldUnlockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  goldUnlockTitle: { fontFamily: typography.fontFamily.bodySemiBold, color: YELLOW_700 },
  goldUnlockText: { fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 4 },

  trackSection: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(43,48,58,0.5)' },
  trackButton: { width: '100%', borderColor: 'rgba(16,185,129,0.30)' },
});

// keep references so unused-const lint stays quiet
void EMERALD_700;
