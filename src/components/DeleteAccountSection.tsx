// Required by Apple App Store guideline 5.1.1(v) — accounts can be deleted in-app.
import React, { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Toast from 'react-native-toast-message';
import { colors, typography, spacing } from '@/lib/theme';

export function DeleteAccountSection() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, messages, and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setLoading(true);
            const { error } = await supabase.functions.invoke('delete-account');
            if (error) {
              setLoading(false);
              Toast.show({ type: 'error', text1: 'Failed to delete account', text2: error.message });
              return;
            }
            await signOut();
            setLoading(false);
            Toast.show({ type: 'success', text1: 'Account deleted' });
          },
        },
      ]
    );
  };

  return (
    <View style={s.section}>
      <Text style={s.title}>Delete account</Text>
      <Text style={s.body}>
        Permanently delete your OfferHound account and all associated data. This cannot be undone.
      </Text>
      <Pressable style={s.btn} onPress={handleDelete} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.destructiveForeground} size="small" />
        ) : (
          <>
            <Trash2 size={16} color={colors.destructiveForeground} />
            <Text style={s.btnText}>Delete my account</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

export default DeleteAccountSection;

const s = StyleSheet.create({
  section: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.destructive, borderRadius: 12, backgroundColor: colors.card },
  title: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.lg, color: colors.destructive },
  body: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, lineHeight: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.destructive, padding: spacing.sm, borderRadius: 8, marginTop: spacing.xs },
  btnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.destructiveForeground },
});
