// RecruiterAssistant — RN port of Lovable src/components/RecruiterAssistant.tsx.
// Verbatim behavior/copy; web primitives swapped for RN equivalents. No liberties
// with strings, suggested questions, streaming protocol, or server contract.
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Send, User, Crown, Lock, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { PatentPendingBadge } from '@/components/ui/PatentPendingBadge';
import { toast } from '@/components/ui/toast';
import { colors, typography, spacing, radius } from '@/lib/theme';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useContactEvents } from '@/hooks/useContactEvents';
import { useSubscription } from '@/hooks/useSubscription';

const COACH_AVATAR = require('../../assets/lovable/coach-avatar.png');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  'What schools should I target based on my profile?',
  'How do I make a good first impression with coaches?',
  'What should I include in my highlight film?',
  'When is the best time to contact coaches?',
  'How do I prepare for a campus visit?',
];

export function RecruiterAssistant() {
  const navigation = useNavigation<any>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const { data: contactEvents } = useContactEvents();
  const { profile } = usePlayerProfile();
  const { isSubscribed } = useSubscription();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const athleteProfileData = profile
        ? {
            name: (profile as any).full_name,
            position: (profile as any).position,
            positions: (profile as any).positions,
            graduationYear: (profile as any).graduation_year,
            school: (profile as any).school,
            city: (profile as any).city,
            state: (profile as any).state,
            height: (profile as any).height,
            weight: (profile as any).weight,
            gpa: (profile as any).gpa,
            fortyYard: (profile as any).forty_yard,
            vertical: (profile as any).vertical,
            benchPress: (profile as any).bench_press,
            squat: (profile as any).squat,
            highlights: (profile as any).highlights,
            traits: (profile as any).traits,
            intangibles: (profile as any).intangibles,
          }
        : null;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl as string;

      const response = await fetch(`${supabaseUrl}/functions/v1/recruiter-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          athleteProfile: athleteProfileData,
          contactHistory: contactEvents || [],
          isSubscribed,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any));
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
        } else if (response.status === 402) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else {
          toast.error(errorData.error || 'Failed to get response');
        }
        setIsLoading(false);
        return;
      }

      const reader = (response.body as any)?.getReader?.();

      if (!reader) {
        // Fallback for RN runtimes without streaming body
        const fullText = await response.text();
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
        // Parse SSE-style chunks from full text, same protocol as streaming branch
        let buffer = fullText;
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          const jsonStr = line.slice(6);
          try {
            const chunk = JSON.parse(jsonStr);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch {
            // Skip invalid JSON
          }
        }
      } else {
        const decoder = new TextDecoder();

        // Add empty assistant message
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;

            const jsonStr = line.slice(6);
            try {
              const chunk = JSON.parse(jsonStr);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get response from assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    sendMessage(input);
  };

  const goToPricing = () => {
    try {
      navigation.navigate('SettingsStack', { screen: 'Pricing' });
    } catch {
      try {
        navigation.navigate('Pricing' as never);
      } catch {}
    }
  };

  return (
    <Card style={s.card}>
      <CardHeader style={s.header}>
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Image source={COACH_AVATAR} style={s.avatar} />
            <View>
              <View style={s.titleRow}>
                <CardTitle style={s.title}>OFFERHOUND COACH</CardTitle>
                <PatentPendingBadge size="xs" />
              </View>
              <CardDescription style={s.description}>
                Your patent-pending AI recruiting assistant
              </CardDescription>
            </View>
          </View>
          {!isSubscribed && (
            <Pressable onPress={goToPricing}>
              <Button variant="outline" size="sm" onPress={goToPricing}>
                <View style={s.upgradeInner}>
                  <Crown size={12} color={colors.primary} />
                  <Text style={s.upgradeText}>Upgrade</Text>
                </View>
              </Button>
            </Pressable>
          )}
        </View>
      </CardHeader>
      <CardContent style={s.content}>
        <ScrollArea style={s.scrollArea}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={s.emptyState}>
                <View style={s.emptyHeaderRow}>
                  <Sparkles size={16} color={colors.primary} />
                  <Text style={s.emptyTitle}>How can I help you today?</Text>
                  <PatentPendingBadge size="xs" />
                </View>
                <Text style={s.emptyBody}>
                  I can help you with recruiting strategies, letter writing, and understanding
                  the college football landscape using our patent-pending AI technology.
                </Text>
                <View style={s.suggestions}>
                  {SUGGESTED_QUESTIONS.map((question, index) => (
                    <Pressable
                      key={index}
                      onPress={() => sendMessage(question)}
                      style={({ pressed }) => [
                        s.suggestion,
                        pressed && s.suggestionPressed,
                      ]}
                    >
                      <Text style={s.suggestionText}>{question}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              messages.map((message, index) => (
                <View
                  key={index}
                  style={[
                    s.messageRow,
                    message.role === 'user' ? s.messageRowUser : s.messageRowAssistant,
                  ]}
                >
                  {message.role === 'assistant' && (
                    <Image source={COACH_AVATAR} style={s.msgAvatar} />
                  )}
                  <View
                    style={[
                      s.bubble,
                      message.role === 'user' ? s.bubbleUser : s.bubbleAssistant,
                    ]}
                  >
                    <Text
                      style={[
                        s.bubbleText,
                        message.role === 'user' ? s.bubbleTextUser : s.bubbleTextAssistant,
                      ]}
                    >
                      {message.content}
                    </Text>
                  </View>
                  {message.role === 'user' && (
                    <View style={s.userAvatar}>
                      <User size={16} color={colors.primary} />
                    </View>
                  )}
                </View>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <View style={s.messageRow}>
                <Image source={COACH_AVATAR} style={s.msgAvatar} />
                <View style={[s.bubble, s.bubbleAssistant]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              </View>
            )}
          </ScrollView>
        </ScrollArea>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.formWrap}
        >
          <View style={s.form}>
            <View style={s.inputWrap}>
              <Input
                value={input}
                onChangeText={setInput}
                placeholder="Ask about recruiting..."
                editable={!isLoading}
                onSubmitEditing={handleSubmit}
                returnKeyType="send"
              />
            </View>
            <Button
              onPress={handleSubmit}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Send size={16} color={colors.primaryForeground} />
              )}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'column',
  },
  header: { paddingBottom: spacing.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: typography.fontSize.lg },
  description: { fontSize: typography.fontSize.xs },
  upgradeInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  upgradeText: { fontSize: typography.fontSize.sm, color: colors.foreground },
  content: { flex: 1, padding: 0 },
  scrollArea: { flex: 1, paddingHorizontal: spacing.md },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.md },
  emptyState: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: `${colors.secondary}4D`, // secondary/30
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  emptyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontWeight: '500',
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  emptyBody: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  suggestions: { gap: spacing.sm },
  suggestion: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: `${colors.background}80`,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  suggestionPressed: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  suggestionText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    textAlign: 'left',
  },
  messageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAssistant: { justifyContent: 'flex-start' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, flexShrink: 0 },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}33`, // primary/20
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  bubbleUser: { backgroundColor: colors.primary },
  bubbleAssistant: { backgroundColor: `${colors.secondary}80` }, // secondary/50
  bubbleText: { fontSize: typography.fontSize.sm },
  bubbleTextUser: { color: colors.primaryForeground },
  bubbleTextAssistant: { color: colors.foreground },
  formWrap: { borderTopWidth: 1, borderTopColor: colors.border },
  form: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  inputWrap: { flex: 1 },
});
