// Scrollable chat thread — FlashList-backed, with real-time subscription and
// read-receipt updates. Session 3 upgrade of the FlatList-based implementation.
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
}

export function MessageThread({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listRef = useRef<FlashList<Message>>(null);

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
    refetchOnWindowFocus: false,
  });

  // Real-time subscription → invalidate cache on any message change.
  useEffect(() => {
    if (!conversationId) return;
    const sub = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['messages', conversationId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [conversationId, qc]);

  // Mark incoming messages as read when the thread is focused.
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const unreadIds = messages
      .filter((m) => m.sender_id !== user.id && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      void supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
    }
  }, [messages, user]);

  // Auto-scroll to the newest message on length change.
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        try {
          listRef.current?.scrollToEnd({ animated: true });
        } catch {}
      }, 80);
    }
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlashList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        estimatedItemSize={72}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const isMine = item.sender_id === user?.id;
          return (
            <View style={[s.row, isMine && s.rowMine]}>
              <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
                <Text style={[s.text, isMine ? s.textMine : s.textTheirs]}>{item.content}</Text>
                {isMine && item.read_at ? <Text style={s.readBadge}>Read</Text> : null}
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
  list: { padding: spacing.md },
  row: { alignItems: 'flex-start', marginVertical: 3 },
  rowMine: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleTheirs: {
    backgroundColor: colors.muted,
    borderBottomLeftRadius: radius.sm,
  },
  text: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.normal * typography.size.base,
  },
  textMine: { color: colors.primaryForeground },
  textTheirs: { color: colors.foreground },
  readBadge: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.primaryForeground,
    opacity: 0.75,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
});
