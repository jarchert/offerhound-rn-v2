// AICoachScreen — chat-style AI recruiting coach powered by the `support-chat`
// Supabase edge function. Streams the response token-by-token.
// Lovable parity: userType is derived from the user's profile (matches
// GlobalAICoachIcon.tsx). Assistant bubbles render the coach-avatar; user
// bubbles render a simple user glyph.
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  Image,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { User as UserIcon } from 'lucide-react-native';
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useParentProfileAccess } from '@/hooks/useParentProfileAccess';
import { COACH_AVATAR } from '@/lib/assets';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing, radius } from '@/lib/theme';

type UserType = 'athlete' | 'coach' | 'scout' | 'parent' | 'organization' | 'guest';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

// Lovable parity: per-role welcome message (GlobalAICoachIcon.getInitialMessage).
function getInitialMessage(userType: UserType, isAuthenticated: boolean): string {
  if (!isAuthenticated) {
    return "Hey! I'm OfferHound Coach™ — your AI recruiting assistant. I can answer questions about college recruiting, the platform, and best practices. Sign in for personalized guidance!";
  }
  switch (userType) {
    case 'athlete':
      return "Hey! I'm your OfferHound Coach™. I can help you find schools, contact coaches, prepare for camps, and navigate your recruiting journey. What can I help with?";
    case 'parent':
      return "Hello! I'm OfferHound Coach™, your AI recruiting advisor. I'm here to help you support your athlete through the recruiting process. How can I assist?";
    case 'coach':
      return "Welcome, Coach! I'm OfferHound Coach™. I can help you discover prospects, manage your pipeline, and streamline outreach. What do you need?";
    case 'scout':
      return "Hey! I'm OfferHound Coach™, your AI scouting assistant. I can help evaluate talent, analyze prospects, and track trends. What are you looking for?";
    case 'organization':
      return "Welcome! I'm OfferHound Coach™ for scouting organizations. I can help with talent evaluation, prospect tracking, and analytics. How can I help?";
    default:
      return "Hey! I'm OfferHound Coach™. I can help with recruiting, finding coaches, or anything about the platform. What can I help with?";
  }
}

// Lovable parity: per-role suggested questions.
function getSuggestedQuestions(userType: UserType, isAuthenticated: boolean): string[] {
  if (!isAuthenticated) return ['What is OfferHound?', 'How does recruiting work?', 'What NCAA divisions exist?'];
  switch (userType) {
    case 'athlete': return ['What schools should I target?', 'How do I contact coaches?', 'Prepare for a campus visit?'];
    case 'parent': return ['How can I support my athlete?', 'What questions should I ask coaches?', 'Understanding scholarship offers?'];
    case 'coach': return ['Find prospects in my area', 'Best outreach strategies?', 'Managing a recruiting pipeline?'];
    case 'scout': return ['Evaluating talent metrics', 'Top prospects in the 2026 class?', 'Writing scouting reports?'];
    case 'organization': return ['Team evaluation workflows', 'Tracking multiple prospects?', 'Analytics for recruiting?'];
    default: return ['What is OfferHound?', 'How do I get started?', 'What features are available?'];
  }
}

export default function AICoachScreen() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { profile: athleteProfile } = usePlayerProfile();
  const { data: coachProfile } = useCoachProfile();
  const { data: scoutProfile } = useScoutProfile();
  const { linkedAthletes } = useParentProfileAccess();

  // Lovable parity: profile-driven userType routing for system context.
  const userType: UserType = useMemo(() => {
    if (!isAuthenticated || authLoading) return 'guest';
    if (athleteProfile) return 'athlete';
    if ((linkedAthletes?.length ?? 0) > 0 && !athleteProfile) return 'parent';
    if (coachProfile) return 'coach';
    if (scoutProfile) return 'scout';
    return 'guest';
  }, [isAuthenticated, authLoading, athleteProfile, coachProfile, scoutProfile, linkedAthletes]);

  const welcomeTurn: ChatTurn = useMemo(() => ({
    id: 'welcome',
    role: 'assistant',
    content: getInitialMessage(userType, !!isAuthenticated),
  }), [userType, isAuthenticated]);

  const [turns, setTurns] = useState<ChatTurn[]>([welcomeTurn]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const listRef = useRef<FlashListRef<ChatTurn> | null>(null);

  // Keep welcome turn in sync when userType changes (e.g. auth resolves).
  useEffect(() => {
    setTurns((prev) => {
      if (prev.length <= 1) return [welcomeTurn];
      const [, ...rest] = prev;
      return [welcomeTurn, ...rest];
    });
  }, [welcomeTurn]);

  const quickPrompts = useMemo(
    () => getSuggestedQuestions(userType, !!isAuthenticated),
    [userType, isAuthenticated],
  );

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
        // Lovable parity: filter the welcome turn out of the history sent to the model.
        const welcomeContent = welcomeTurn.content;
        const history = [...turns, userTurn]
          .filter((t) => t.content !== welcomeContent)
          .map((t) => ({ role: t.role, content: t.content }));

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: history,
            userType,
            isAuthenticated: !!session?.access_token,
          }),
        });

        if (!resp.ok) {
          // Lovable parity: paywall / rate-limit surfaces from support-chat.
          if (resp.status === 429) {
            throw new Error('Too many requests. Please wait and try again.');
          }
          if (resp.status === 402) {
            throw new Error('AI coach is temporarily unavailable (billing). Please try again later.');
          }
          const errPayload = await resp.json().catch(() => ({}));
          throw new Error(errPayload?.error || `AI coach returned ${resp.status}`);
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
    [input, isStreaming, turns, user, userType, welcomeTurn.content],
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
                {!isUser && (
                  <Image source={COACH_AVATAR} style={s.avatar} />
                )}
                <View style={[s.bubble, isUser ? s.bubbleMine : s.bubbleAsst]}>
                  <Text style={[s.text, isUser ? s.textMine : s.textAsst]}>
                    {item.content}
                    {item.streaming ? '▍' : ''}
                  </Text>
                </View>
                {isUser && (
                  <View style={s.userAvatar}>
                    <UserIcon size={16} color={colors.primaryForeground} />
                  </View>
                )}
              </View>
            );
          }}
        />

        {turns.length <= 1 ? (
          <View style={s.prompts}>
            {quickPrompts.map((p) => (
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
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginVertical: 4 },
  rowMine: { flexDirection: 'row-reverse' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 2,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
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
