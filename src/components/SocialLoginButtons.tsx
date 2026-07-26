// RN port of Lovable src/components/SocialLoginButtons.tsx.
//
// Web→RN mapping:
//   - <div>/<span> → <View>/<Text>
//   - shadcn Button → @/components/ui/Button
//   - lucide-react → lucide-react-native
//   - `lovable.auth.signInWithOAuth` → `signInWithGoogle` / `signInWithApple`
//     from @/contexts/AuthContext (which already routes through native
//     expo-apple-authentication when available and falls back to Supabase
//     OAuth via the app scheme).
//   - Inline SVG icons → simple text glyphs / brand-neutral labels (the RN
//     runtime doesn't render raw <svg>, and lucide-react-native doesn't
//     expose Google/Apple wordmarks — we keep the label instead of drawing
//     the multi-color SVG to avoid an asset dependency).
//
// Behavior preserved:
//   - Two buttons, one per provider, disabled while either is loading.
//   - Loading spinner on the active button.
//   - Toast on error.

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography, spacing, radius } from '@/lib/theme';

export const SocialLoginButtons = () => {
  const { signInWithGoogle, signInWithApple } = useAuth() as any;
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error('Google Sign-In Failed');
      }
    } catch {
      toast.error('Failed to sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error) {
        toast.error('Apple Sign-In Failed');
      }
    } catch {
      toast.error('Failed to sign in with Apple.');
    } finally {
      setAppleLoading(false);
    }
  };

  const disabled = googleLoading || appleLoading;

  return (
    <View style={s.wrap}>
      <View style={s.dividerRow}>
        <View style={s.dividerLine} />
        <Text style={s.dividerLabel}>OR CONTINUE WITH</Text>
        <View style={s.dividerLine} />
      </View>

      <Pressable
        onPress={handleGoogleSignIn}
        disabled={disabled}
        style={({ pressed }) => [s.btn, pressed && s.btnPressed, disabled && s.btnDisabled]}
        accessibilityRole="button"
      >
        {googleLoading ? (
          <ActivityIndicator size="small" color={colors.foreground} />
        ) : (
          <Text style={s.brandGlyph}>G</Text>
        )}
        <Text style={s.btnLabel}>Continue with Google</Text>
      </Pressable>

      <Pressable
        onPress={handleAppleSignIn}
        disabled={disabled}
        style={({ pressed }) => [s.btn, pressed && s.btnPressed, disabled && s.btnDisabled]}
        accessibilityRole="button"
      >
        {appleLoading ? (
          <ActivityIndicator size="small" color={colors.foreground} />
        ) : (
          <Text style={s.brandGlyph}></Text>
        )}
        <Text style={s.btnLabel}>Continue with Apple</Text>
      </Pressable>
    </View>
  );
};

export default SocialLoginButtons;

const s = StyleSheet.create({
  wrap: { gap: spacing.sm },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    letterSpacing: typography.letterSpacing.wide,
  },

  btn: {
    width: '100%',
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  btnPressed: { opacity: 0.8 },
  btnDisabled: { opacity: 0.5 },
  brandGlyph: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    width: 16,
    textAlign: 'center',
  },
  btnLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
});
