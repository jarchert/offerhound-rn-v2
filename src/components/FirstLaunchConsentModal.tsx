// FirstLaunchConsentModal — RN port of Lovable CookieConsentBanner.tsx
// First-launch privacy / cookie acknowledgement required for App Store compliance.
// Shows once on fresh install; dismissed via Accept All, Essential Only, or Customize.
// Uses AsyncStorage (not localStorage as in web) for persistence.
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { Cookie, Check } from 'lucide-react-native';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';

const CONSENT_KEY = 'offerhound_cookie_consent_v1';

interface FirstLaunchConsentModalProps {
  visible: boolean;
  onAcceptAll: () => void;
  onAcceptEssential: () => void;
  onCustomize: () => void;
}

export function FirstLaunchConsentModal({
  visible,
  onAcceptAll,
  onAcceptEssential,
  onCustomize,
}: FirstLaunchConsentModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Cookie size={22} color={colors.primary} />
            </View>
            <Text style={styles.title}>We use cookies</Text>
          </View>

          <Text style={styles.body}>
            We use cookies and similar technologies to enhance your experience,
            analyze usage, and personalize content. Read our{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://offer-hound.com/privacy')}>
              Privacy Policy
            </Text>
            .
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.ghostBtn} onPress={onCustomize}>
              <Text style={styles.ghostBtnText}>Customize</Text>
            </Pressable>
            <Pressable style={styles.outlineBtn} onPress={onAcceptEssential}>
              <Text style={styles.outlineBtnText}>Essential Only</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={onAcceptAll}>
              <Text style={styles.primaryBtnText}>Accept All</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Hook: manages consent state, shows modal on first launch only
export function useCookieConsent() {
  const [consented, setConsented] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // AsyncStorage is async — check on mount
    import('@react-native-async-storage/async-storage').then(async ({ default: AsyncStorage }) => {
      try {
        const stored = await AsyncStorage.getItem(CONSENT_KEY);
        if (!stored) {
          // First launch — show after 1.5s delay (matches Lovable)
          setTimeout(() => setVisible(true), 1500);
        }
      } catch {
        // If storage fails, show anyway
        setVisible(true);
      }
    });
  }, []);

  const handleAcceptAll = async () => {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({
      essential: true, analytics: true, marketing: true,
      version: '1.0', timestamp: new Date().toISOString(),
    }));
    setConsented(true);
    setVisible(false);
  };

  const handleAcceptEssential = async () => {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({
      essential: true, analytics: false, marketing: false,
      version: '1.0', timestamp: new Date().toISOString(),
    }));
    setConsented(true);
    setVisible(false);
  };

  const handleCustomize = () => {
    // Opens CookieSettings in SettingsStack — navigate from parent
    setVisible(false);
  };

  return { consented, visible, handleAcceptAll, handleAcceptEssential, handleCustomize };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    padding: spacing.lg,
    width: '100%',
    ...Platform.select({
      ios: { marginBottom: 34 }, // home indicator
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  body: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ghostBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  ghostBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  outlineBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  primaryBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primaryForeground,
  },
});