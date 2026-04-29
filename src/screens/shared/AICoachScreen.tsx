// AICoachScreen — chat-style AI recruiting coach powered by the `ai-coach`
// Supabase edge function. Streams the response token-by-token.
// Part 5 of the conversion guide details this screen.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const WELCOME: ChatTurn = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hey — I'm your AI recruiting coach. Ask me about building your profile, writing letters, navigating the transfer portal, NIL questions, or anything else recruiting-related.",
};

const QUICK_PROMPTS = [
  'How do I get D1 coaches to notice me?',
  'Review my highlight reel strategy',
  'Help me write a recruiting letter',
  'Explain NIL deals for a high school athlete',
];

export default function AICoachScreen() {
  const { user } = useAuth();
  const [turns, setTurns] = useState<ChatTurn[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const listRef = useRef<FlashListRef<ChatTurn> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      try {
        listRef.current?.scrollToEnd({ animated: true });
      } catch {}
    }, 60);
  }, []);

  useEffect(() => {
    if (turns.length > 1) scrollToBottom();
  }, [turns.length, scrollToBottom]);

  const send = useCallback(
    async (prompt?: string) => {
      const text = (prompt ?? input).trim();
      if (!text || isStreaming) return;

      const userTurn: ChatTurn = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text,
      };
      const asstTurn: ChatTurn = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: '',
        streaming: true,
      };
      setTurns((prev) => [...prev, userTurn, asstTurn]);
      setInput('');
      setIsStreaming(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        // Lovable parity: ai-coach was never deployed; the web uses support-chat
        // (src/components/GlobalAICoachIcon.tsx). Same streaming SSE contract.
        const url = `${SUPABASE_FUNCTIONS_URL}/support-chat`;
        const history = [...turns, userTurn].map((t) => ({
          role: t.role,
          content: t.content,
        }));

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: history,
            userType: 'athlete',
            isAuthenticated: !!session?.access_token,
          }),
        });

        if (!resp.ok) {
          throw new Error(`AI coach returned ${resp.status}`);
        }

        const reader = (resp.body as any)?.getReader?.();
        if (!reader) {
          const fullText = await resp.text();
          setTurns((prev) =>
            prev.map((t) =>
              t.id === asstTurn.id ? { ...t, content: fullText, streaming: false } : t,
            ),
          );
          return;
        }

        const decoder = new TextDecoder();
        let buffered = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffered += decoder.decode(value, { stream: true });
          setTurns((prev) =>
            prev.map((t) => (t.id === asstTurn.id ? { ...t, content: buffered } : t)),
          );
        }
        setTurns((prev) =>
          prev.map((t) => (t.id === asstTurn.id ? { ...t, streaming: false } : t)),
        );
      } catch (e: any) {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === asstTurn.id
              ? {
                  ...t,
                  content: `Sorry, I couldn't reach the coach. ${e?.message ?? ''}`.trim(),
                  streaming: false,
                }
              : t,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [input, isStreaming, turns, user],
  );

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <View style={s.headerText}>
          <Text style={s.eyebrow}>AI COACH</Text>
          <Text style={s.title}>Your recruiting AI</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={s.chat}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlashList
          ref={listRef as any}
          data={turns}
          keyExtractor={(t) => t.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            return (
              <View style={[s.row, isUser && s.rowMine]}>
                <View style={[s.bubble, isUser ? s.bubbleMine : s.bubbleAsst]}>
                  <Text style={[s.text, isUser ? s.textMine : s.textAsst]}>
                    {item.content}
                    {item.streaming ? '▍' : ''}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {turns.length <= 1 ? (
          <View style={s.prompts}>
            {QUICK_PROMPTS.map((p) => (
              <Pressable key={p} style={s.prompt} onPress={() => send(p)}>
                <Text style={s.promptText}>{p}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach…"
            placeholderTextColor={colors.foregroundSubtle}
            multiline
            maxLength={1200}
            editable={!isStreaming}
          />
          <Pressable
            onPress={() => send()}
            style={[s.sendBtn, (isStreaming || !input.trim()) && s.sendBtnDisabled]}
            disabled={isStreaming || !input.trim()}>
            {isStreaming ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Text style={s.sendBtnText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
  },
  chat: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  row: { alignItems: 'flex-start', marginVertical: 4 },
  rowMine: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleAsst: {
    backgroundColor: colors.muted,
    borderBottomLeftRadius: radius.sm,
  },
  text: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.normal * typography.size.base,
  },
  textMine: { color: colors.primaryForeground },
  textAsst: { color: colors.foreground },
  prompts: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  prompt: {
    backgroundColor: colors.muted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foreground,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    maxHeight: 120,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.primaryForeground,
    fontSize: typography.size.base,
  },
});
