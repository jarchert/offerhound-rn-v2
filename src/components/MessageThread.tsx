// Scrollable chat thread — renders messages between two users with bubble styling.
import React, { useRef, useEffect } from 'react';
import { FlatList, View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/lib/theme';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export function MessageThread({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const listRef = useRef<FlatList>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      return (data || []) as any as Message[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    // Realtime subscription for new messages
    if (!conversationId) return;
    const sub = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => {
        // Let react-query refetch
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const isMine = item.sender_id === user?.id;
          return (
            <View style={[s.row, isMine && s.rowMine]}>
              <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
                <Text style={[s.text, isMine ? s.textMine : s.textTheirs]}>{item.content}</Text>
              </View>
            </View>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

export default MessageThread;

const s = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.xs },
  row: { alignItems: 'flex-start', marginVertical: 2 },
  rowMine: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', padding: spacing.sm, borderRadius: 16 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.muted, borderBottomLeftRadius: 4 },
  text: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base },
  textMine: { color: colors.primaryForeground },
  textTheirs: { color: colors.foreground },
});
