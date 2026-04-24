// ScrollToTop — RN port of Lovable src/components/ScrollToTop.tsx.
// Lovable is a single-page DOM scroll; RN uses per-screen ScrollView refs.
// This component renders a floating "back to top" FAB and invokes the passed
// `onPress` (screens supply a ref.scrollTo handler). It shows/hides based on
// a controlled `visible` prop (parent decides via onScroll threshold).
import React from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import { colors, spacing, shadows } from '@/lib/theme';

interface ScrollToTopProps {
  visible: boolean;
  onPress: () => void;
  /** Defaults to bottom-left on mobile to avoid conflict with floating AI Coach. */
  position?: 'left' | 'right';
}

export function ScrollToTop({ visible, onPress, position = 'left' }: ScrollToTopProps) {
  const opacity = React.useRef(new Animated.Value(visible ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      style={[
        s.container,
        position === 'left' ? { left: spacing.lg } : { right: spacing.lg },
        { opacity },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable
        onPress={onPress}
        style={s.btn}
        accessibilityRole="button"
        accessibilityLabel="Scroll to top">
        <ArrowUp size={20} color={colors.primaryForeground} />
      </Pressable>
    </Animated.View>
  );
}

export default ScrollToTop;

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg + 16,
    zIndex: 40,
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.primaryForeground}20`,
    ...shadows.gold,
  },
});
