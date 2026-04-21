// In-app message CTA — wraps navigate-to-conversation with compose intent.
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { MessageSquare } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

interface Props {
  recipientId: string;
  recipientName?: string;
  label?: string;
  compact?: boolean;
}

export function MessageButton({ recipientId, recipientName, label = 'Message', compact = false }: Props) {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const handle = () => {
    nav.navigate('Messages' as any, { recipientId, recipientName } as any);
  };
  return (
    <Pressable style={[s.btn, compact && s.compact]} onPress={handle}>
      <MessageSquare size={compact ? 14 : 16} color={colors.primaryForeground} />
      {!compact && <Text style={s.text}>{label}</Text>}
    </Pressable>
  );
}

export default MessageButton;

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  compact: { paddingHorizontal: spacing.sm, paddingVertical: 6 },
  text: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primaryForeground },
});
