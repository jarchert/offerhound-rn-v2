// FloatingAICoach — RN port of Lovable src/components/FloatingAssistant.tsx.
// Persistent floating bottom-right avatar post-auth. Tapping opens an AI chat.
// Zero liberties: same copy, same colors, same structure.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const COACH_AVATAR = require('../../assets/lovable/coach-avatar.png');

export type CoachUserType = 'athlete' | 'coach' | 'scout';

interface FloatingAICoachProps {
  userType?: CoachUserType;
  profile?: any;
  /** Hide if the user doesn't have a paid subscription — matches Lovable logic. */
  isSubscribed?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS: Record<CoachUserType, string[]> = {
  athlete: [
    'What schools should I target?',
    'How do I contact coaches?',
    'Prepare for campus visit?',
  ],
  coach: [
    'Find top recruits in my area?',
    'Evaluate athlete highlights?',
    'Build recruiting pipeline?',
  ],
  scout: [
    'Identify undervalued talent?',
    'Compare athlete metrics?',
    'Report on athlete progress?',
  ],
};

const DESCRIPTION = 'Patent-pending AI recruiting assistant';

export function FloatingAICoach({
  userType = 'athlete',
  profile,
  isSubscribed = true,
}: FloatingAICoachProps) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Subtle pulse animation on the closed FAB (matches Lovable animate-pulse-subtle).
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    // Auto-scroll on new messages
    const t = setTimeout(() => {
      try {
        scrollRef.current?.scrollToEnd({ animated: true });
      } catch {}
    }, 80);
    return () => clearTimeout(t);
  }, [messages]);

  // Build athlete profile payload matching Lovable's shape
  const athleteProfileData = profile
    ? {
        name: profile.full_name || 'Athlete',
        position: profile.position || 'Athlete',
        height: profile.height || '',
        weight: profile.weight || '',
        armLength: profile.arm_length || '',
        classYear: profile.graduation_year || '',
        gpa: profile.gpa || '',
        highSchool: profile.school || '',
        city: profile.city || '',
        state: profile.state || '',
        fortyYard: profile.forty_yard || '',
        vertical: profile.vertical || '',
        benchPress: profile.bench_press || '',
        squat: profile.squat || '',
        hudlUrl: profile.hudl_url || '',
        twitterUrl: profile.twitter_url || '',
        instagramUrl: profile.instagram_url || '',
        maxPrepsUrl: profile.maxpreps_url || '',
        email: profile.email || '',
        phone: profile.phone || '',
        highlights: profile.highlights || [],
        stats: profile.stats || [],
      }
    : null;

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isLoading) return;

      const userMessage: ChatMessage = { role: 'user', content: messageText };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      let assistantContent = '';

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = (supabase as any).supabaseUrl as string;
        const url = `${supabaseUrl}/functions/v1/recruiter-assistant`;

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            athleteProfile: athleteProfileData,
            userType,
            userId: user?.id,
          }),
        });

        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }

        const reader = (resp.body as any)?.getReader?.();
        // Add placeholder streaming bubble
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        if (!reader) {
          const fullText = await resp.text();
          assistantContent = fullText;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: assistantContent };
            return next;
          });
        } else {
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            assistantContent += decoder.decode(value, { stream: true });
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: assistantContent };
              return next;
            });
          }
        }
      } catch (e) {
        // Remove empty assistant placeholder on error
        setMessages((prev) =>
          prev.filter((m) => !(m.role === 'assistant' && m.content === '')),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, athleteProfileData, userType, user?.id],
  );

  // Unsubscribed → show dimmed FAB that links to Pricing (matches Lovable)
  if (!isSubscribed) {
    return (
      <View style={s.fabContainer} pointerEvents="box-none">
        <Pressable
          onPress={() => {
            try {
              navigation.navigate('SettingsStack', { screen: 'Pricing' });
            } catch {}
          }}
          style={[s.fab, { backgroundColor: `${colors.primary}80` }]}
          accessibilityRole="button"
          accessibilityLabel="Subscribe to unlock AI Coach">
          <MessageCircle size={24} color={colors.primaryForeground} />
        </Pressable>
      </View>
    );
  }

  const suggested = SUGGESTED_QUESTIONS[userType];

  return (
    <>
      {/* Floating closed button */}
      {!isOpen ? (
        <View style={s.fabContainer} pointerEvents="box-none">
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              onPress={() => setIsOpen(true)}
              style={s.fab}
              accessibilityRole="button"
              accessibilityLabel="Open OfferHound Coach">
              <MessageCircle size={24} color={colors.primaryForeground} />
            </Pressable>
          </Animated.View>
        </View>
      ) : null}

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          style={s.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={s.modalDismissArea} onPress={() => setIsOpen(false)} />

          <View style={s.chatCard}>
            {/* Header */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Image source={COACH_AVATAR} style={s.avatar} />
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.title}>OfferHound Coach</Text>
                    <View style={s.patentBadge}>
                      <Text style={s.patentBadgeText}>PAT. PEND.</Text>
                    </View>
                  </View>
                  <Text style={s.subtitle}>{DESCRIPTION}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setIsOpen(false)}
                hitSlop={10}
                accessibilityLabel="Close coach"
                style={s.closeBtn}>
                <X size={18} color={colors.foreground} />
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={s.messages}
              contentContainerStyle={s.messagesContent}>
              {messages.length === 0 ? (
                <View style={{ gap: spacing.md }}>
                  <Text style={s.welcome}>
                    {`Hey! I'm your OfferHound Coach with patent-pending AI. How can I help you today?`}
                  </Text>
                  <Text style={s.popularLabel}>Popular questions:</Text>
                  {suggested.map((q) => (
                    <Pressable
                      key={q}
                      style={s.suggestion}
                      onPress={() => sendMessage(q)}>
                      <Text style={s.suggestionText}>{q}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                messages.map((m, i) => (
                  <View
                    key={i}
                    style={[s.msgRow, m.role === 'user' ? s.msgRowMine : null]}>
                    <View
                      style={[
                        s.bubble,
                        m.role === 'user' ? s.bubbleMine : s.bubbleAsst,
                      ]}>
                      {m.content === '' && m.role === 'assistant' && isLoading ? (
                        <ActivityIndicator color={colors.foreground} />
                      ) : (
                        <Text
                          style={[
                            s.bubbleText,
                            m.role === 'user' ? s.bubbleTextMine : s.bubbleTextAsst,
                          ]}>
                          {m.content}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {messages.length > 3 ? (
              <Pressable
                style={s.scrollDown}
                onPress={() => {
                  try {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  } catch {}
                }}>
                <ChevronDown size={16} color={colors.foreground} />
              </Pressable>
            ) : null}

            {/* Input */}
            <View style={s.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask me anything..."
                placeholderTextColor={colors.mutedForeground}
                style={s.input}
                editable={!isLoading}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(input)}
              />
              <Pressable
                onPress={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                style={[
                  s.sendBtn,
                  (isLoading || !input.trim()) && s.sendBtnDisabled,
                ]}
                accessibilityLabel="Send message">
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Send size={16} color={colors.primaryForeground} />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

export default FloatingAICoach;

const s = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 16,
    zIndex: 50,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.gold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalDismissArea: { flex: 1 },
  chatCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    height: '86%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: `${colors.primary}12`,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  patentBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  patentBadgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 8,
    color: colors.primaryForeground,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: { flex: 1 },
  messagesContent: { padding: spacing.md, gap: spacing.md },
  welcome: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  popularLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  suggestion: {
    backgroundColor: `${colors.secondary}80`,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  suggestionText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foreground,
  },
  msgRow: { alignItems: 'flex-start' },
  msgRowMine: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleAsst: {
    backgroundColor: colors.secondary,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  bubbleTextMine: { color: colors.primaryForeground },
  bubbleTextAsst: { color: colors.secondaryForeground },
  scrollDown: {
    position: 'absolute',
    right: spacing.md,
    bottom: 80,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
