// Ported from Lovable src/components/ThemeToggle.tsx
// Web used `next-themes` with light/dark/system. RN equivalent:
//   - read system scheme via `Appearance` from 'react-native'
//   - persist user override ('light' | 'dark' | 'system') in AsyncStorage
//   - cycle light → dark → system on press
// Preserves exported component name + props signature (className → style).
import React, { useEffect, useState } from 'react';
import {
  Appearance,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorSchemeName,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sun, Moon, Monitor } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  variant?: 'icon' | 'full';
  style?: ViewStyle;
}

const STORAGE_KEY = 'offerhound-theme-mode';

export function ThemeToggle({ variant = 'icon', style }: ThemeToggleProps) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setMode(stored);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme ?? 'dark'));
    return () => sub.remove();
  }, []);

  const cycle = () => {
    const next: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const effective: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  const Icon = mode === 'system' ? Monitor : effective === 'dark' ? Sun : Moon;
  const label =
    mode === 'system'
      ? 'System theme'
      : effective === 'dark'
      ? 'Switch to light mode'
      : 'Switch to dark mode';

  const isFull = variant === 'full';

  return (
    <Pressable
      onPress={cycle}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.base,
        isFull ? s.full : s.iconOnly,
        pressed && s.pressed,
        style,
      ]}
    >
      <Icon size={16} color={colors.foreground} />
      {isFull && (
        <Text style={s.text}>
          {mode === 'system' ? 'System' : effective === 'dark' ? 'Light mode' : 'Dark mode'}
        </Text>
      )}
    </Pressable>
  );
}

export default ThemeToggle;

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconOnly: {
    width: 36,
    height: 36,
  },
  full: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  pressed: {
    backgroundColor: colors.muted,
  },
  text: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
});
