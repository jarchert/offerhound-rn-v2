// FloatingAICoach — persistent post-auth floating action button.
// Tap → navigates to the AICoach modal screen (registered in RootNavigator).
// Hidden while the keyboard is visible or while the user is already on AICoach.
//
// Wave 29 parity scaffold. Replaces the previous inline-chat variant with a
// thin overlay button per spec; the heavy chat UX lives inside AICoachScreen.
import React, { useEffect, useState, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Image,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import {
  useNavigation,
} from '@react-navigation/native';

import { colors, spacing, shadows } from '@/lib/theme';
import { COACH_AVATAR } from '@/lib/assets';

export interface FloatingAICoachProps {
  /** Optional override for which route name represents the AI coach screen. */
  hideOnRoute?: string;
  /** Bottom inset (e.g. tab bar height). Defaults to a tab-bar-friendly value. */
  bottomOffset?: number;
}

/** Walk the navigation state tree and return the deepest active route name. */
function getActiveRouteName(state: any): string | undefined {
  if (!state) return undefined;
  const route = state.routes?.[state.index ?? 0];
  if (!route) return undefined;
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
}

/**
 * Safe alternative to useNavigationState for components rendered outside a
 * navigator (e.g. siblings of Stack.Navigator inside NavigationContainer).
 * useNavigationState requires NavigationStateListenerContext which only exists
 * inside a navigator; this hook uses the navigation ref's state listener instead.
 */
function useSafeActiveRoute(nav: any, getRouteName: (state: any) => string | undefined): string | undefined {
  const [route, setRoute] = useState<string | undefined>(() => {
    try { return getRouteName(nav.getState?.()); } catch { return undefined; }
  });
  useEffect(() => {
    const unsub = nav.addListener?.('state', () => {
      try { setRoute(getRouteName(nav.getState?.())); } catch { /* noop */ }
    });
    return typeof unsub === 'function' ? unsub : () => {};
  }, [nav, getRouteName]);
  return route;
}

export function FloatingAICoach({
  hideOnRoute = 'AICoach',
  bottomOffset,
}: FloatingAICoachProps = {}) {
  const navigation = useNavigation<any>();
  const activeRoute = useSafeActiveRoute(navigation, getActiveRouteName);

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

  if (keyboardVisible) return null;
  if (activeRoute === hideOnRoute) return null;

  const handlePress = () => {
    try {
      navigation.navigate(hideOnRoute as never);
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
          <Image source={COACH_AVATAR} style={s.fabImage} />
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
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.primary,
    ...shadows.gold,
  },
  fabImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
});
