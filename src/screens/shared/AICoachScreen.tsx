import {KeyboardSafeBody} from '@/components/KeyboardSafeBody';
import {supportChatHeaders,supportChatTurns} from '@/lib/supportChatRequest';
import {useLocalDraft} from '@/hooks/useLocalDraft';
// AICoachScreen — chat-style AI recruiting coach ("OfferHound Coach™").
// Backed by the deployed `support-chat` Supabase edge function (same function
// the Lovable web GlobalAICoachIcon uses), which proxies the Lovable AI gateway
// and streams an OpenAI-style SSE response (`data: {choices:[{delta:{content}}]}`
// lines, terminated by `data: [DONE]`).
//
// Web→RN parity notes:
//   - Request body matches web verbatim: { messages, userType, isAuthenticated }.
//   - userType is derived from the authenticated role (mirrors web getUserType:
//     athlete | parent | coach | scout | organization | guest).
//   - Auth header uses the Supabase anon key (web sends the publishable key);
//     the function is not user-JWT gated.
//   - Role-aware welcome text mirrors web getInitialMessage.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { supabase,SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
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

// Mirrors web GlobalAICoachIcon getUserType(): the support-chat function keys
// its knowledge-base scope + persona off this value.
type SupportUserType =
  | 'athlete'
  | 'parent'
  | 'coach'
  | 'scout'
  | 'organization'
  | 'club_coach'
  | 'guest';

function roleToUserType(role: string | null | undefined): SupportUserType {
  switch (role) {
    case 'athlete':
      return 'athlete';
    case 'parent':
      return 'parent';
    case 'coach':
    case 'high_school_coach':
      return 'coach';
    case 'club_coach':
      return 'club_coach';
    case 'scout':
      return 'scout';
    case 'agency':
      return 'organization';
    default:
      return 'guest';
  }
}

// Mirrors web getInitialMessage() so the opening line matches the web app.
function welcomeForRole(
  userType: SupportUserType,
  isAuthenticated: boolean,
): string {
  if (!isAuthenticated) {
    return "Hey! I'm OfferHound Coach™ — your AI recruiting assistant. I can answer questions about college recruiting, the platform, and best practices. Sign in for personalized guidance!";
  }
  switch (userType) {
    case 'athlete':
      return "Hey! I'm your OfferHound Coach™. I can help you find schools, contact coaches, prepare for camps, and navigate your recruiting journey. What can I help with?";
    case 'parent':
      return "Hello! I'm OfferHound Coach™, your AI recruiting advisor. I'm here to help you support your athlete through the recruiting process. How can I assist?";
    case 'coach':
    case 'club_coach':
      return "Welcome, Coach! I'm OfferHound Coach™. I can help you discover prospects, manage your pipeline, and streamline outreach. What do you need?";
    case 'scout':
      return "Hey! I'm OfferHound Coach™, your AI scouting assistant. I can help evaluate talent, analyze prospects, and track trends. What are you looking for?";
    case 'organization':
      return "Welcome! I'm OfferHound Coach™ for scouting organizations. I can help with talent evaluation, prospect tracking, and analytics. How can I help?";
    default:
      return "Hey! I'm OfferHound Coach™. I can help with recruiting, finding coaches, or anything about the platform. What can I help with?";
  }
}

const QUICK_PROMPTS = [
  'How do I get D1 coaches to notice me?',
  'Review my highlight reel strategy',
  'Help me write a recruiting letter',
  'Explain NIL deals for a high school athlete',
];

function promptsForRole(type:SupportUserType):string[] {
  switch(type) {
    case 'organization': return ['Plan our scouting team workflow','Compare prospects consistently','Help organize our agency pipeline','Prepare outreach for our agency'];
    case 'scout': return ['Build a prospect evaluation checklist','Organize my scouting notes','Plan a recruiting event visit','Prepare professional prospect outreach'];
    case 'coach':
    case 'club_coach': return ['Organize my recruiting pipeline','Compare prospects for team needs','Plan coach outreach','Help support my athletes with recruiting'];
    case 'parent': return ['Help me support my athlete','Plan a family recruiting timeline','Prepare questions for a campus visit','Explain recruiting communication for parents'];
    default: return QUICK_PROMPTS;
  }
}

export default function AICoachScreen() {
  const { user, userRole, isAuthenticated } = useAuth();
  const userType = roleToUserType(userRole);
  const [turns, setTurns, historyStorageError] = useLocalDraft<ChatTurn[]>(user?.id, `ai-history:${userType}`, [
    { ...WELCOME, content: welcomeForRole(userType, isAuthenticated) },
  ]);
  const [input, setInput] = useLocalDraft(user?.id, `ai-input:${userType}`, '');
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
        // The server derives personalization from the session token.
        const headers=await supportChatHeaders(supabase,SUPABASE_ANON_KEY,isAuthenticated);
        const url = `${SUPABASE_URL}/functions/v1/support-chat`;
        const history=supportChatTurns([...turns,userTurn]);

        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: history,
            userType,
            isAuthenticated,
          }),
        });

        if (!resp.ok) {
          if (resp.status === 429) {
            throw new Error('Too many requests. Please wait and try again.');
          }
          if (resp.status === 402) {
            throw new Error('Service temporarily unavailable.');
          }
          const errBody = await resp.json().catch(() => ({} as any));
          throw new Error(errBody?.error || `Coach returned ${resp.status}`);
        }

        // Parse OpenAI-style SSE: `data: {choices:[{delta:{content}}]}` lines,
        // terminated by `data: [DONE]`. RN fetch may or may not expose a
        // streaming reader depending on engine; handle both.
        const applyDelta = (full: string) =>
          setTurns((prev) =>
            prev.map((t) =>
              t.id === asstTurn.id ? { ...t, content: full } : t,
            ),
          );

        const parseSSEChunk = (chunk: string, acc: { text: string; buf: string }) => {
          acc.buf += chunk;
          let nl: number;
          while ((nl = acc.buf.indexOf('\n')) !== -1) {
            let line = acc.buf.slice(0, nl);
            acc.buf = acc.buf.slice(nl + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') return true;
              try {
                const parsed = JSON.parse(jsonStr);
                const content: string | undefined =
                  parsed?.choices?.[0]?.delta?.content;
                if (content) {
                  acc.text += content;
                  applyDelta(acc.text);
                }
              } catch {
                // Partial JSON across chunk boundary — re-buffer and wait.
                acc.buf = line + '\n' + acc.buf;
                break;
              }
            }
          }
          return false;
        };

        const reader = (resp.body as any)?.getReader?.();
        const acc = { text: '', buf: '' };

        if (reader) {
          const decoder = new TextDecoder();
          let done = false;
          while (!done) {
            const { done: rDone, value } = await reader.read();
            if (rDone) break;
            const stop = parseSSEChunk(decoder.decode(value, { stream: true }), acc);
            if (stop) break;
          }
        } else {
          // No streaming reader in this engine: read the whole body, then parse.
          const full = await resp.text();
          parseSSEChunk(full, acc);
        }

        if (!acc.text) {
          applyDelta("I didn't catch that — try asking again.");
        }
        setTurns((prev) =>
          prev.map((t) => (t.id === asstTurn.id ? { ...t, streaming: false } : t)),
        );
      } catch (e: any) {
        setInput(current=>current||text);
        setTurns((prev) =>
          prev.map((t) =>
            t.id === asstTurn.id
              ? {
                  ...t,
                  content: e?.name==='SessionRequiredError' ? 'Please sign in again. Your question is kept.' : 'The coach could not respond. Your question is kept; check your connection and try again.',
                  streaming: false,
                }
              : t,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [input, isStreaming, turns, userType, isAuthenticated],
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

      {historyStorageError && <Text accessibilityRole="alert" style={{color:colors.destructive}}>Conversation could not be saved on this device.</Text>}
      <KeyboardSafeBody>
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
                    {item.streaming && isStreaming ? '▍' : ''}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {turns.length <= 1 ? (
          <View style={s.prompts}>
            {promptsForRole(userType).map((p) => (
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
      </KeyboardSafeBody>
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
