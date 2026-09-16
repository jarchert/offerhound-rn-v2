// MessagesScreen — inbox list + active thread view.
//
// Schema notes (build22 fix):
//   `conversations` uses `coach_user_id` / `athlete_user_id` (not the stale
//   `participant_1` / `participant_2` columns still present in
//   src/integrations/supabase/types.ts). Profiles are looked up via
//   `player_profiles` (athlete side) and `coach_profiles` (coach side) —
//   mirroring InboxScreen.tsx. All queries are guarded with try/catch so a
//   transient schema drift cannot crash the screen.
import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Check, CheckCheck, Send } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Avatar } from '@/components/ui/Avatar';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_image: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  last_message_read: boolean;
  unread_count: number;
}

interface ThreadMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  pending?: boolean;
  failed?: boolean;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['messages-conversations', user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];

      try {
        // Conversations where the current user is either the coach or athlete.
        // OfferHound schema: coach_user_id / athlete_user_id (not participant_1/2).
        const { data: rows, error } = await supabase
          .from('conversations')
          .select('*')
          .or(`coach_user_id.eq.${user.id},athlete_user_id.eq.${user.id}`)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(100);
        if (error) throw error;

        const list = (rows as any[]) || [];
        if (list.length === 0) return [];

        // For each conversation, fetch the OTHER party's profile + last message.
        const enriched = await Promise.all(
          list.map(async (c: any): Promise<Conversation> => {
            const isCoach = c.coach_user_id === user.id;
            const otherId = isCoach ? c.athlete_user_id : c.coach_user_id;

            let otherName = 'Conversation';
            let otherImage: string | null = null;
            try {
              if (isCoach) {
                // Current user is the coach → other party is the athlete.
                const { data: p } = await supabase
                  .from('player_profiles')
                  .select('full_name,profile_image_url')
                  .eq('user_id', otherId)
                  .maybeSingle();
                if ((p as any)?.full_name) otherName = (p as any).full_name;
                otherImage = (p as any)?.profile_image_url ?? null;
              } else {
                // Current user is the athlete → other party is the coach.
                const { data: p } = await supabase
                  .from('coach_profiles')
                  .select('name,profile_image_url')
                  .eq('user_id', otherId)
                  .maybeSingle();
                if ((p as any)?.name) otherName = (p as any).name;
                otherImage = (p as any)?.profile_image_url ?? null;
              }
            } catch {
              // Profile lookup is best-effort — keep the conversation visible.
            }

            let lastMessage: string | null = null;
            let lastMessageSenderId: string | null = null;
            let lastMessageRead = false;
            try {
              const { data: lastMsg } = await supabase
                .from('messages')
                .select('content,sender_id,read_at')
                .eq('conversation_id', c.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              lastMessage = (lastMsg as any)?.content ?? null;
              lastMessageSenderId = (lastMsg as any)?.sender_id ?? null;
              lastMessageRead = !!(lastMsg as any)?.read_at;
            } catch {
              /* ignore */
            }

            let unreadCount = 0;
            try {
              const { count } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', c.id)
                .is('read_at', null)
                .neq('sender_id', user.id);
              unreadCount = count || 0;
            } catch {
              /* ignore */
            }

            return {
              id: c.id,
              other_user_id: otherId,
              other_user_name: otherName,
              other_user_image: otherImage,
              last_message: lastMessage,
              last_message_at: c.last_message_at ?? null,
              last_message_sender_id: lastMessageSenderId,
              last_message_read: lastMessageRead,
              unread_count: unreadCount,
            };
          }),
        );
        return enriched;
      } catch (err: any) {
        // Schema mismatch or RLS error — surface but don't crash the screen.
        Toast.show({
          type: 'error',
          text1: 'Could not load conversations',
          text2: err?.message ? String(err.message).slice(0, 120) : undefined,
        });
        return [];
      }
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      c.other_user_name.toLowerCase().includes(q) ||
      (c.last_message || '').toLowerCase().includes(q),
    );
  }, [conversations, search]);

  if (activeId) {
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) {
      // Race: conversation no longer in list. Reset rather than render empty.
      setActiveId(null);
      return null;
    }
    return (
      <ActiveThread
        conversation={conv}
        onBack={() => {
          setActiveId(null);
          void refetch();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
      </View>
      <View style={s.searchWrap}>
        <Search size={16} color={colors.mutedForeground} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search conversations"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>
              {search.trim() ? 'No matches' : 'No conversations yet'}
            </Text>
            <Text style={s.emptyText}>
              {search.trim()
                ? 'Try a different name or keyword.'
                : 'Start a conversation by messaging a coach or athlete.'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={s.sep} />}
        renderItem={({ item }) => {
          const isMyLast = item.last_message_sender_id === user?.id;
          return (
            <Pressable style={s.row} onPress={() => setActiveId(item.id)}>
              <Avatar
                source={item.other_user_image ? { uri: item.other_user_image } : null}
                fallback={item.other_user_name}
                size={44}
              />
              <View style={s.rowText}>
                <View style={s.rowTop}>
                  <Text style={s.rowName} numberOfLines={1}>
                    {item.other_user_name}
                  </Text>
                  {item.last_message_at && (
                    <Text style={s.rowDate}>
                      {new Date(item.last_message_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <View style={s.rowBottom}>
                  {isMyLast && item.last_message ? (
                    item.last_message_read ? (
                      <CheckCheck size={14} color={colors.primary} style={s.receiptIcon} />
                    ) : (
                      <Check size={14} color={colors.mutedForeground} style={s.receiptIcon} />
                    )
                  ) : null}
                  <Text
                    style={[s.rowPreview, item.unread_count > 0 && s.rowUnread]}
                    numberOfLines={1}>
                    {item.last_message ?? 'No messages yet'}
                  </Text>
                </View>
              </View>
              {item.unread_count > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{item.unread_count}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

/* ─────────────────────────── Active thread view ─────────────────────────── */

function ActiveThread({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listRef = useRef<FlatList<ThreadMessage>>(null);
  const [draft, setDraft] = useState('');

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['messages', conversation.id],
    queryFn: async (): Promise<ThreadMessage[]> => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id,conversation_id,sender_id,content,created_at,read_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return ((data as any[]) || []) as ThreadMessage[];
      } catch (err: any) {
        Toast.show({
          type: 'error',
          text1: 'Could not load messages',
          text2: err?.message ? String(err.message).slice(0, 120) : undefined,
        });
        return [];
      }
    },
    enabled: !!conversation.id,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content,
        } as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as any as ThreadMessage;
    },
    onMutate: async (content: string) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: ['messages', conversation.id] });
      const prev = qc.getQueryData<ThreadMessage[]>(['messages', conversation.id]) || [];
      const optimistic: ThreadMessage = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversation.id,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString(),
        read_at: null,
        pending: true,
      };
      qc.setQueryData<ThreadMessage[]>(
        ['messages', conversation.id],
        [...prev, optimistic],
      );
      return { prev, optimisticId: optimistic.id };
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['messages', conversation.id], ctx.prev);
      }
      Toast.show({
        type: 'error',
        text1: 'Message failed to send',
        text2: err?.message ? String(err.message).slice(0, 120) : undefined,
      });
    },
    onSuccess: () => {
      void refetch();
      qc.invalidateQueries({ queryKey: ['messages-conversations'] });
    },
  });

  const handleSend = () => {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    sendMessage.mutate(content);
  };

  // Mark unread incoming messages as read when thread mounts / new msg arrives.
  React.useEffect(() => {
    if (!user || messages.length === 0) return;
    const unreadIds = messages
      .filter((m) => m.sender_id !== user.id && !m.read_at && !m.pending)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    void supabase
      .from('messages')
      .update({ read_at: new Date().toISOString(), is_read: true } as any)
      .in('id', unreadIds);
  }, [messages, user]);

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.threadHeader}>
        <BackButton onPress={onBack} />
        <Avatar
          source={conversation.other_user_image ? { uri: conversation.other_user_image } : null}
          fallback={conversation.other_user_name}
          size={32}
        />
        <Text style={s.threadTitle} numberOfLines={1}>
          {conversation.other_user_name || 'Conversation'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={s.threadBody}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.threadList}
          onContentSizeChange={() => {
            // Auto-scroll to newest message whenever content grows.
            try {
              listRef.current?.scrollToEnd({ animated: true });
            } catch {
              /* noop */
            }
          }}
          renderItem={({ item }) => {
            const isMine = item.sender_id === user?.id;
            return (
              <View style={[s.msgRow, isMine && s.msgRowMine]}>
                <View
                  style={[
                    s.bubble,
                    isMine ? s.bubbleMine : s.bubbleTheirs,
                    item.pending && s.bubblePending,
                  ]}>
                  <Text style={[s.msgText, isMine ? s.msgTextMine : s.msgTextTheirs]}>
                    {item.content}
                  </Text>
                  {isMine && (
                    <View style={s.msgStatusRow}>
                      {item.pending ? (
                        <ActivityIndicator size={10} color={colors.primaryForeground} />
                      ) : item.read_at ? (
                        <CheckCheck size={12} color={colors.primaryForeground} />
                      ) : (
                        <Check size={12} color={colors.primaryForeground} />
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>Say hi 👋</Text>
            </View>
          }
        />

        <View style={s.composer}>
          <TextInput
            style={s.composerInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[
              s.sendBtn,
              (!draft.trim() || sendMessage.isPending) && s.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!draft.trim() || sendMessage.isPending}>
            {sendMessage.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Send size={18} color={colors.primaryForeground} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  threadTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    flex: 1,
  },
  threadBody: { flex: 1 },
  threadList: { padding: spacing.md, gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowName: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    flex: 1,
  },
  rowDate: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  rowPreview: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  rowUnread: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  receiptIcon: { marginRight: 2 },
  badge: {
    backgroundColor: colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.primaryForeground,
    fontSize: 11,
    fontFamily: typography.fontFamily.bodyBold,
  },
  sep: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 44 + spacing.sm,
  },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  emptyTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  msgRow: { alignItems: 'flex-start', marginVertical: 3 },
  msgRowMine: { alignItems: 'flex-end' },
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
  bubblePending: { opacity: 0.6 },
  msgText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
  },
  msgTextMine: { color: colors.primaryForeground },
  msgTextTheirs: { color: colors.foreground },
  msgStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
    opacity: 0.85,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxHeight: 100,
    color: colors.foreground,
    backgroundColor: colors.card,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
