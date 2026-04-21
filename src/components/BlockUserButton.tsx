// Required by Apple App Store guideline 1.2 (UGC must allow blocking + reporting).
import React, { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ban } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Toast from 'react-native-toast-message';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  blockedUserId: string;
  blockedUserName?: string;
  onBlocked?: () => void;
}

export function BlockUserButton({ blockedUserId, blockedUserName = 'this user', onBlocked }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleBlock = () => {
    Alert.alert(
      'Block user',
      `Block ${blockedUserName}? You will no longer see their messages or content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setLoading(true);
            const { error } = await supabase
              .from('blocked_users' as any)
              .insert({ blocker_user_id: user.id, blocked_user_id: blockedUserId });
            setLoading(false);
            if (error) {
              Toast.show({ type: 'error', text1: 'Failed to block user', text2: error.message });
              return;
            }
            Toast.show({ type: 'success', text1: 'User blocked' });
            onBlocked?.();
          },
        },
      ]
    );
  };

  return (
    <Pressable style={s.btn} onPress={handleBlock} disabled={loading}>
      <Ban size={14} color={colors.destructive} />
      <Text style={s.text}>Block</Text>
    </Pressable>
  );
}

export default BlockUserButton;

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: colors.destructive, borderRadius: 8, backgroundColor: 'transparent' },
  text: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.destructive },
});
