// PatentPendingBadge — RN port of Lovable src/components/ui/patent-pending-badge.tsx.
// Verbatim copy/text. Web `text-primary/80 bg-primary/10 border-primary/20` is
// reproduced as `colors.primary` with rgba alpha overrides.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield } from 'lucide-react-native';
import { colors, typography, radius } from '@/lib/theme';

interface PatentPendingBadgeProps {
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  style?: any;
}

const SIZE_CFG = {
  xs: { font: 9,  padX: 6,  padY: 2, gap: 2,   icon: 10 },
  sm: { font: 10, padX: 8,  padY: 2, gap: 4,   icon: 12 },
  md: { font: 12, padX: 10, padY: 4, gap: 6,   icon: 14 },
} as const;

// rgba derivations of colors.primary (#e7af08 → 231,175,8) for alpha tints
const PRIMARY_TEXT  = 'rgba(231,175,8,0.8)';   // primary/80
const PRIMARY_BG    = 'rgba(231,175,8,0.1)';   // primary/10
const PRIMARY_BORDER= 'rgba(231,175,8,0.2)';   // primary/20

export function PatentPendingBadge({
  size = 'sm',
  showIcon = true,
  style,
}: PatentPendingBadgeProps) {
  const cfg = SIZE_CFG[size];
  return (
    <View
      style={[
        s.badge,
        {
          paddingHorizontal: cfg.padX,
          paddingVertical: cfg.padY,
          gap: cfg.gap,
        },
        style,
      ]}
    >
      {showIcon ? <Shield width={cfg.icon} height={cfg.icon} color={PRIMARY_TEXT} /> : null}
      <Text style={[s.text, { fontSize: cfg.font }]}>Patent Pending</Text>
    </View>
  );
}

export default PatentPendingBadge;

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: PRIMARY_BG,
    borderColor: PRIMARY_BORDER,
    borderWidth: 1,
    borderRadius: radius.full,
  },
  text: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: PRIMARY_TEXT,
  },
});
