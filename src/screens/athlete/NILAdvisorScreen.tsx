import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Send } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { NILDisclaimer } from '@/components/NILDisclaimer';
import { colors, typography, spacing } from '@/lib/theme';

interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; }

export default function NILAdvisorScreen() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    // Create or load most recent chat session
    if (!user) return;
    (async () => {
      const { data: existing } = await supabase
        .from('nil_chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      let id = existing?.id;
      if (!id) {
        const { data: created } = await supabase.from('nil_chat_sessions').insert({ user_id: user.id }).select('id').single();
        id = created?.id;
      }
      if (id) {
        setSessionId(id);
        const { data: msgs } = await supabase
          .from('nil_chat_messages')
          .select('*')
          .eq('session_id', id)
          .order('created_at', { ascending: true });
        setMessages((msgs || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
      }
    })();
  }, [user]);

  const send = async () => {
    if (!input.trim() || !sessionId || sending) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const { data } = await supabase.functions.invoke('nil-advisor', { body: { session_id: sessionId, message: userMsg.content } });
      if (data?.reply) {
        setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: data.reply }]);
      }
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>NIL Advisor</Text>
      </View>
      <NILDisclaimer />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>Ask about NIL</Text>
              <Text style={s.emptyText}>Questions about deals, disclosures, taxes, or state rules? Ask away.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[s.msgRow, item.role === 'user' && s.msgRowUser]}>
              <View style={[s.bubble, item.role === 'user' ? s.bubbleUser : s.bubbleAssistant]}>
                <Text style={[s.msgText, item.role === 'user' && s.msgTextUser]}>{item.content}</Text>
              </View>
            </View>
          )}
        />
        <View style={s.composer}>
          <TextInput
            style={s.input}
            placeholder="Ask about NIL..."
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <Pressable style={[s.sendBtn, (!input.trim() || sending) && s.disabled]} onPress={send} disabled={!input.trim() || sending}>
            {sending ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Send size={18} color={colors.primaryForeground} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  list: { padding: spacing.md, gap: spacing.xs, flexGrow: 1 },
  msgRow: { alignItems: 'flex-start' },
  msgRowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', padding: spacing.sm, borderRadius: 16 },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: colors.muted, borderBottomLeftRadius: 4 },
  msgText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.foreground },
  msgTextUser: { color: colors.primaryForeground },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, maxHeight: 100, color: colors.foreground, backgroundColor: colors.card, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, minHeight: 40 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
