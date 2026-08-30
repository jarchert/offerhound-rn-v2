// FloatingAICoach — persistent post-auth floating action button.
// Tap → navigates to the AICoach modal screen (registered in RootNavigator).
// Hidden while the keyboard is visible or while the user is already on AICoach.
//
// Wave 29 parity scaffold. Replaces the previous inline-chat variant with a
// thin overlay button per spec; the heavy chat UX lives inside AICoachScreen.
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { navigate, getCurrentRouteName } from '@/navigation/navigationRef';

import { colors, spacing, shadows } from '@/lib/theme';

export interface FloatingAICoachProps {
  /** Optional override for which route name represents the AI coach screen. */
  hideOnRoute?: string;
  /** Bottom inset (e.g. tab bar height). Defaults to a tab-bar-friendly value. */
  bottomOffset?: number;
}

export function FloatingAICoach({
  hideOnRoute = 'AICoach',
  bottomOffset,
}: FloatingAICoachProps = {}) {
  const [activeRoute, setActiveRoute] = React.useState<string | undefined>(getCurrentRouteName);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Subtle pulse on the FAB to draw the eye without being noisy.
  const pulse = React.useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Sync active route on a polling interval — lightweight since this component
  // only needs to know if it's on the AICoach screen to hide itself.
  //
  // NOTE: this effect MUST be declared before any conditional early return
  // below. Placing it after `if (...) return null` produced a "Rendered fewer
  // hooks than expected" React error as soon as the keyboard opened or the
  // route changed to AICoach — the hook was skipped on those renders,
  // corrupting the hook order and crashing the AI Coach screen (which in turn
  // made its TextInput/chip taps appear dead).
  React.useEffect(() => {
    const id = setInterval(() => {
      setActiveRoute(getCurrentRouteName());
    }, 300);
    return () => clearInterval(id);
  }, []);

  if (keyboardVisible) return null;
  if (activeRoute === hideOnRoute) return null;

  const handlePress = () => {
    try {
      navigate(hideOnRoute as any);
    } catch {
      // Swallow nav errors — overlay must never crash the host screen.
    }
  };

  return (
    <View
      style={[
        s.fabContainer,
        bottomOffset !== undefined ? { bottom: bottomOffset } : null,
      ]}
      pointerEvents="box-none">
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Pressable
          onPress={handlePress}
          style={s.fab}
          accessibilityRole="button"
          accessibilityLabel="Open OfferHound AI Coach">
          <Sparkles size={24} color={colors.primaryForeground} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default FloatingAICoach;

const s = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: spacing.lg,
    // Sit above the bottom tab bar (typical RN tab bar ~ 56-83pt).
    bottom: spacing.lg + 72,
    zIndex: 50,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.gold,
  },
});
