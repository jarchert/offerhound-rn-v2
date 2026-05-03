// Unified empty-state for any public profile screen when the row is missing
// or unpublished. Replaces role-specific "Coach Not Found"/"Scout not found"
// copy across athlete/college coach/HS coach/club coach/scout/agency/influencer.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, typography, spacing, radius } from '@/lib/theme';
import { NOT_REGISTERED_USER_MESSAGE } from '@/lib/openUserProfile';

interface Props {
  /** Optional override for the body copy. Defaults to canonical message. */
  message?: string;
}

export function NotRegisteredUser({ message }: Props) {
  const nav = useNavigation<any>();
  return (
    <View style={s.wrap}>
      <AlertCircle size={56} color={colors.primary} />
      <Text style={s.body}>{message || NOT_REGISTERED_USER_MESSAGE}</Text>
      <Pressable
        style={s.btn}
        onPress={() => {
          if (nav?.canGoBack?.()) nav.goBack();
        }}>
        <Text style={s.btnText}>Back</Text>
      </Pressable>
    </View>
  );
}

export default NotRegisteredUser;

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  body: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 360,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius?.md ?? 8,
  },
  btnText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
  },
});
