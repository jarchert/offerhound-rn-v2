// Inline message composer — sends a new message to the current conversation.
import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Send } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing } from '@/lib/theme';

export function MessageComposer({ conversationId, onSent }: { conversationId: string; onSent?: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text.trim(),
    });
    setSending(false);
    if (!error) {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      onSent?.();
    }
  };

  return (
    <View style={s.composer}>
      <TextInput
        style={s.input}
        placeholder="Type a message..."
        placeholderTextColor={colors.mutedForeground}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
      />
      <Pressable style={[s.sendBtn, (!text.trim() || sending) && s.disabled]} onPress={send} disabled={!text.trim() || sending}>
        {sending ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Send size={18} color={colors.primaryForeground} />}
      </Pressable>
    </View>
  );
}

export default MessageComposer;

const s = StyleSheet.create({
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, maxHeight: 100, color: colors.foreground, backgroundColor: colors.card, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, minHeight: 40 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
});
