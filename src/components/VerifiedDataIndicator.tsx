// VerifiedDataIndicator — RN port of Lovable src/components/VerifiedDataIndicator.tsx.
// Verbatim text/structure preserved. Web Tooltip→TooltipProvider/Tooltip/TooltipTrigger/TooltipContent
// is mapped to LongPressTooltip from our RN Tooltip shim. Web shadcn Badge with icon+text
// children is rendered as a custom row View (RN <Text> cannot contain <View> icons).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, AlertCircle } from 'lucide-react-native';
import { LongPressTooltip } from '@/components/ui/Tooltip';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface VerifiedDataIndicatorProps {
  dataSource: 'verified' | 'self_reported' | string;
  compact?: boolean;
}

export function VerifiedDataIndicator({ dataSource, compact = false }: VerifiedDataIndicatorProps) {
  const isVerified = dataSource === 'verified';

  if (compact) {
    return (
      <LongPressTooltip tip={isVerified ? 'Verified — captured at event' : 'Self-reported data'}>
        {isVerified ? (
          <Shield width={16} height={16} color={colors.primary} />
        ) : (
          <AlertCircle width={16} height={16} color={colors.foregroundSubtle} />
        )}
      </LongPressTooltip>
    );
  }

  // Non-compact: shadcn Badge with icon + label. variant="default" → primary bg,
  // variant="secondary" + opacity-70 for self-reported.
  const bg = isVerified ? colors.primary : colors.secondary;
  const fg = isVerified ? colors.primaryForeground : colors.secondaryForeground;
  const opacity = isVerified ? 1 : 0.7;

  return (
    <View style={[s.badge, { backgroundColor: bg, opacity }]}>
      {isVerified ? (
        <>
          <Shield width={12} height={12} color={fg} />
          <Text style={[s.badgeText, { color: fg }]}>Verified</Text>
        </>
      ) : (
        <>
          <AlertCircle width={12} height={12} color={fg} />
          <Text style={[s.badgeText, { color: fg }]}>Self-Reported</Text>
        </>
      )}
    </View>
  );
}

interface AthleteVerifiedBadgeProps {
  badgeLabel: string;
  compositeScore?: number | null;
  campName?: string | null;
}

export function AthleteVerifiedBadge({ badgeLabel, compositeScore, campName }: AthleteVerifiedBadgeProps) {
  // Web tooltip content has multiple lines; flatten for RN long-press tip.
  const tipParts = ['Verified Performance'];
  if (campName) tipParts.push(`Camp: ${campName}`);
  if (compositeScore) tipParts.push(`Score: ${compositeScore.toFixed(1)}`);
  const tip = tipParts.join(' • ');

  // bg-primary/90 → primary at 90% alpha. primary is #e7af08 → rgba(231,175,8,0.9)
  const PRIMARY_90 = 'rgba(231,175,8,0.9)';

  return (
    <LongPressTooltip tip={tip}>
      <View style={[s.badge, { backgroundColor: PRIMARY_90 }]}>
        <Shield width={12} height={12} color={colors.primaryForeground} />
        <Text style={[s.badgeText, { color: colors.primaryForeground }]}>{badgeLabel}</Text>
      </View>
    </LongPressTooltip>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4, // gap-1
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
  },
});
