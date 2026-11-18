// Inline message composer — sends a new message to the current conversation.
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Send } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing } from '@/lib/theme';

export function MessageComposer({ conversationId, onSent }: { conversationId: string; onSent?: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const send = async () => {
    if (!text.trim() || !user) return;
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await supabase.functions.invoke('send-direct-message', { body: { conversationId, message: text.trim() } });
      if (result.error || result.data?.error || result.data?.success!==true || !result.data?.messageId) throw result.error || new Error(result.data?.error||'Delivery could not be confirmed.');
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      onSent?.();
    } catch {
      setError('Delivery was not confirmed. Your draft is kept here. Check the conversation before retrying.');
    } finally { setSending(false); }

  };

  return (
    <View>
    {error ? <Text accessibilityRole="alert" style={{color: colors.destructive, padding: spacing.sm}}>{error}</Text> : null}
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
      <Pressable accessibilityRole="button" accessibilityLabel="Send message" style={[s.sendBtn, (!text.trim() || sending) && s.disabled]} onPress={send} disabled={!text.trim() || sending}>
        {sending ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Send size={18} color={colors.primaryForeground} />}
      </Pressable>
    </View>
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
