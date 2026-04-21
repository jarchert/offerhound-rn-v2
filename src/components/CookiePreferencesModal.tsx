// Cookie preferences modal — n/a on mobile (no third-party cookies in RN).
// Kept as a no-op for API compatibility with the web port.
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useCookiePreferencesModal } from '@/contexts/CookiePreferencesContext';
import { colors, typography, spacing } from '@/lib/theme';

export function CookiePreferencesModal() {
  const { isOpen, closeCookiePreferences } = useCookiePreferencesModal();
  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={closeCookiePreferences}>
      <View style={s.overlay}>
        <View style={s.dialog}>
          <Text style={s.title}>Privacy preferences</Text>
          <Text style={s.body}>
            The OfferHound mobile app does not use third-party cookies. Your data is stored
            securely with Supabase. See the in-app Privacy Policy for details.
          </Text>
          <Pressable style={s.btn} onPress={closeCookiePreferences}>
            <Text style={s.btnText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default CookiePreferencesModal;

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  dialog: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, gap: spacing.md, maxWidth: 420 },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  body: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, lineHeight: 20 },
  btn: { backgroundColor: colors.primary, padding: spacing.sm, borderRadius: 8, alignItems: 'center' },
  btnText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.primaryForeground, fontSize: typography.fontSize.base },
});
