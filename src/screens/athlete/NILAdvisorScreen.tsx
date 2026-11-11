import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { nilRequest, type PendingNilRequest } from '@/lib/nilRequest';
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
  const { profile, isLoading: profileLoading } = usePlayerProfile();
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<PendingNilRequest | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    setSessionId(null);
    setMessages([]);
    pending.current = null;
    if (!user || !profile?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const existing = await supabase.from('nil_chat_sessions').select('id')
          .eq('user_id', user.id).eq('athlete_profile_id', profile.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (existing.error) throw existing.error;
        let id = existing.data?.id;
        if (!id) {
          const created = await supabase.from('nil_chat_sessions')
            .insert({ user_id: user.id, athlete_profile_id: profile.id }).select('id').single();
          if (created.error || !created.data?.id) throw created.error || new Error('No session');
          id = created.data.id;
        }
        const msgs = await supabase.from('nil_chat_messages').select('*').eq('session_id', id).order('created_at', { ascending: true });
        if (msgs.error) throw msgs.error;
        if (!cancelled) {
          setSessionId(id);
          setMessages((msgs.data || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
        }
      } catch { if (!cancelled) setError('NIL chat could not be opened. Leave this page and return to retry.'); }
    })();
    return () => { cancelled = true; };
  }, [user?.id, profile?.id]);

  const send = async () => {
    if (!input.trim() || !sessionId || sending) return;
    const request = nilRequest(pending.current, sessionId, input.trim());
    pending.current = request;
    const userMsg: ChatMessage = { id: request.requestKey, role: 'user', content: request.message };
    setError(null);
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('nil-advisor', { body: { session_id: sessionId, message: userMsg.content, request_key: request.requestKey } });
      if (invokeError || data?.error || typeof data?.reply !== 'string' || !data.reply) throw invokeError || new Error('No reply');
      if (data?.reply) {
        setMessages(prev => [...prev, { id: `a-${request.requestKey}`, role: 'assistant', content: data.reply }]);
        pending.current = null;
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== request.requestKey));
      setInput(current => current || request.message);
      setError('No reply was saved. Your question is restored; try again.');
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
      {error ? <Text accessibilityRole="alert" style={{color: colors.destructive, padding: spacing.md}}>{error}</Text> : null}
      {!profileLoading && !profile ? <Text style={{color: colors.foreground, padding: spacing.md}}>Create your athlete profile before starting NIL chat.</Text> : null}
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
          <Pressable style={[s.sendBtn, (!input.trim() || sending) && s.disabled]} onPress={send} accessibilityRole="button" accessibilityLabel="Send NIL question" disabled={!input.trim() || sending || !sessionId}>
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
