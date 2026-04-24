import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, radius } from '@/lib/theme';

/**
 * Semi-transparent OfferHound watermark overlay rendered on top of any
 * influencer media tile. RN port of the Lovable web component — visual
 * parity preserved (positioning, sizing, colors). Server-side baked
 * watermarks remain a future enhancement.
 *
 * Note: Tailwind's `backdrop-blur-sm` has no zero-cost RN equivalent;
 * we approximate with a slightly stronger background opacity instead of
 * pulling in @react-native-community/blur. The visual difference is
 * minimal at this size.
 */
export function OfferHoundWatermark({
  style,
  position = 'bottom-right',
  size = 'md',
}: {
  style?: ViewStyle;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.base,
        positionStyles[position],
        sizeContainerStyles[size],
        style,
      ]}
    >
      <Text style={[styles.text, sizeTextStyles[size]]}>OfferHound™</Text>
    </View>
  );
}

// hex + alpha — primary @ ~30% (border) and background @ ~60% (fill).
// '4D' ≈ 30% alpha, '99' ≈ 60% alpha.
const BORDER_PRIMARY_30 = colors.primary + '4D';
const BG_BACKGROUND_60 = colors.background + '99';
const TEXT_PRIMARY_90 = colors.primary + 'E6'; // ~90%

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    zIndex: 10,
    borderRadius: radius.md,
    backgroundColor: BG_BACKGROUND_60,
    borderWidth: 1,
    borderColor: BORDER_PRIMARY_30,
    // font-display in Lovable maps to Bebas Neue in our typography.
    // Container styles only here — text styling on the inner <Text>.
  },
  text: {
    color: TEXT_PRIMARY_90,
    fontFamily: typography.fontFamily.heading,
    letterSpacing: typography.letterSpacing.wide,
    includeFontPadding: false,
  } as TextStyle,
});

// Tailwind spacing scale: 2 = 8px. -translate-1/2 handled with transform.
const positionStyles: Record<NonNullable<Parameters<typeof OfferHoundWatermark>[0]['position']>, ViewStyle> = {
  'bottom-right': { bottom: 8, right: 8 },
  'bottom-left': { bottom: 8, left: 8 },
  'top-right': { top: 8, right: 8 },
  'top-left': { top: 8, left: 8 },
  // RN has no percent-translate trick like web; consumers should size the
  // parent so this lands centered. We use top/left 50% with a transform
  // approximation (negative translate by half of typical width/height).
  center: {
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -10 }],
  },
};

// text-[10px] / text-xs (12) / text-sm (14); paddings: px-1.5/py-0.5,
// px-2/py-1, px-3/py-1.5  →  6/2, 8/4, 12/6.
const sizeContainerStyles: Record<NonNullable<Parameters<typeof OfferHoundWatermark>[0]['size']>, ViewStyle> = {
  sm: { paddingHorizontal: 6, paddingVertical: 2 },
  md: { paddingHorizontal: 8, paddingVertical: 4 },
  lg: { paddingHorizontal: 12, paddingVertical: 6 },
};

const sizeTextStyles: Record<NonNullable<Parameters<typeof OfferHoundWatermark>[0]['size']>, TextStyle> = {
  sm: { fontSize: 10 },
  md: { fontSize: 12 },
  lg: { fontSize: 14 },
};

export default OfferHoundWatermark;
