import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Avatar } from '@/components/ui/Avatar';
import { MessageThread } from '@/components/MessageThread';
import { MessageComposer } from '@/components/MessageComposer';
import { colors, typography, spacing } from '@/lib/theme';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_image: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const navigation = useNavigation();
  const route = useRoute<any>();
  const canGoBack = navigation.canGoBack();
  const queryClient = useQueryClient();

  // Handle incoming recipientId param to initiate/open a conversation
  const recipientId = route.params?.recipientId as string | undefined;
  const recipientName = route.params?.recipientName as string | undefined;

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });
      // Enrich each conversation with the other participant's name and last message
      const enriched = await Promise.all(
        (data || []).map(async (c: any): Promise<Conversation> => {
          const mine = c.participant_1 === user.id;
          const otherId = mine ? c.participant_2 : c.participant_1;
          // Resolve other user's name — try player_profiles first, then coach_profiles
          let otherName = 'User';
          let otherImage: string | null = null;
          const { data: player } = await supabase
            .from('player_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', otherId)
            .maybeSingle();
          if ((player as any)?.full_name) {
            otherName = (player as any).full_name;
            otherImage = (player as any).avatar_url || null;
          } else {
            const { data: coach } = await supabase
              .from('coach_profiles')
              .select('name, avatar_url')
              .eq('user_id', otherId)
              .maybeSingle();
            if ((coach as any)?.name) {
              otherName = (coach as any).name;
              otherImage = (coach as any).avatar_url || null;
            }
          }
          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          // Count unread messages from the other user
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', c.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);
          return {
            id: c.id,
            other_user_id: otherId,
            other_user_name: otherName,
            other_user_image: otherImage,
            last_message: (lastMsg as any)?.content || null,
            last_message_at: c.last_message_at,
            unread_count: count || 0,
          };
        })
      );
      return enriched;
    },
    enabled: !!user,
  });

  // Find or create conversation when navigated with recipientId
  const findOrCreateConversation = useMutation({
    mutationFn: async ({ targetId, targetName }: { targetId: string; targetName?: string }) => {
      if (!user) throw new Error('Not authenticated');
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${targetId}),and(participant_1.eq.${targetId},participant_2.eq.${user.id})`
        )
        .maybeSingle();
      if (existing) return existing.id;
      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: user.id,
          participant_2: targetId,
        })
        .select('id')
        .single();
      if (error) throw error;
      return newConv.id;
    },
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveId(conversationId);
    },
  });

  // Auto-open conversation when recipientId is provided
  useEffect(() => {
    if (recipientId && user && !activeId) {
      findOrCreateConversation.mutate({ targetId: recipientId, targetName: recipientName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientId, user]);

  if (activeId) {
    const conv = conversations.find(c => c.id === activeId);
    return (
      <SafeAreaView style={s.container}>
        <Navbar />
        <View style={s.threadHeader}>
          <BackButton onPress={() => setActiveId(null)} />
          <Text style={s.threadTitle} numberOfLines={1}>{conv?.other_user_name ?? 'Conversation'}</Text>
        </View>
        <MessageThread conversationId={activeId} />
        <MessageComposer conversationId={activeId} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        {canGoBack && <BackButton label="Back" />}
        <Text style={s.title}>Messages</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={c => c.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No conversations yet</Text>
            <Text style={s.emptyText}>Start a conversation by messaging a coach or athlete.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={s.sep} />}
        renderItem={({ item }) => (
          <Pressable style={s.row} onPress={() => setActiveId(item.id)}>
            <Avatar source={item.other_user_image ? { uri: item.other_user_image } : null} fallback={item.other_user_name} size={44} />
            <View style={s.rowText}>
              <View style={s.rowTop}>
                <Text style={s.rowName} numberOfLines={1}>{item.other_user_name}</Text>
                {item.last_message_at && <Text style={s.rowDate}>{new Date(item.last_message_at).toLocaleDateString()}</Text>}
              </View>
              <Text style={[s.rowPreview, item.unread_count > 0 && s.rowUnread]} numberOfLines={1}>
                {item.last_message ?? 'No messages yet'}
              </Text>
            </View>
            {item.unread_count > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{item.unread_count}</Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  threadHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  threadTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, flex: 1 },
  rowDate: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  rowPreview: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  rowUnread: { color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold },
  badge: { backgroundColor: colors.primary, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.primaryForeground, fontSize: 11, fontFamily: typography.fontFamily.bodyBold },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: spacing.md + 44 + spacing.sm },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  emptyTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
