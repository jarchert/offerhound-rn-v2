// Ported from Lovable src/components/SocialLoginButtons.tsx.
// Uses RN-native sign in flows via AuthContext (expo-apple-authentication on
// iOS, supabase OAuth web flow for Google). Keeps the Lovable visual design.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { isAppleSignInAvailable } from '@/lib/appleSignIn';
import { colors, typography, spacing, radius } from '@/lib/theme';

export function SocialLoginButtons() {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) Alert.alert('Google Sign-In Failed', error.message);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleApple = async () => {
    setAppleLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error) Alert.alert('Apple Sign-In Failed', error.message);
    } catch (err: any) {
      // User cancellation surfaces as ERR_CANCELED; swallow silently.
      if (err?.code !== 'ERR_CANCELED' && err?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', err?.message || 'Failed to sign in with Apple.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View style={s.wrap}>
      <View style={s.divider}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>OR CONTINUE WITH</Text>
        <View style={s.dividerLine} />
      </View>

      <Pressable
        style={[s.btn, (googleLoading || appleLoading) && s.btnDisabled]}
        onPress={handleGoogle}
        disabled={googleLoading || appleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator color={colors.foreground} size="small" />
        ) : (
          <GoogleLogo />
        )}
        <Text style={s.btnText}>Continue with Google</Text>
      </Pressable>

      {Platform.OS === 'ios' && appleAvailable ? (
        <Pressable
          style={[s.btn, (googleLoading || appleLoading) && s.btnDisabled]}
          onPress={handleApple}
          disabled={googleLoading || appleLoading}
        >
          {appleLoading ? (
            <ActivityIndicator color={colors.foreground} size="small" />
          ) : (
            <AppleLogo />
          )}
          <Text style={s.btnText}>Continue with Apple</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function GoogleLogo() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function AppleLogo() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill={colors.foreground}
      />
    </Svg>
  );
}

export default SocialLoginButtons;

const s = StyleSheet.create({
  wrap: { gap: spacing.sm },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foregroundSubtle,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: typography.size.sm,
  },
});
