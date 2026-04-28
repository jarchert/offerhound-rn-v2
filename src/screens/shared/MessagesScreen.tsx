import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Avatar } from '@/components/ui/Avatar';
import { MessageThread } from '@/components/MessageThread';
import { MessageComposer } from '@/components/MessageComposer';
import { BackButton } from '@/components/BackButton';
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

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [] as Conversation[];
      // The conversations table uses participant_1 / participant_2 as the FK columns.
      const { data: rows } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });
      const list = (rows as any[]) || [];
      // Collect the other-user ids and fetch profile metadata in one round trip.
      const otherIds = Array.from(new Set(
        list.map((c: any) => (c.participant_1 === user.id ? c.participant_2 : c.participant_1)).filter(Boolean),
      ));
      const profileById: Record<string, { full_name?: string; profile_image_url?: string }> = {};
      if (otherIds.length) {
        const { data: profs } = await supabase
          .from('profiles' as any)
          .select('id,full_name,profile_image_url')
          .in('id', otherIds);
        for (const p of (profs as any[]) || []) profileById[p.id] = p;
      }
      return list.map((c: any): Conversation => {
        const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
        const prof = (otherId && profileById[otherId]) || ({} as any);
        return {
          id: c.id,
          other_user_id: otherId,
          other_user_name: prof.full_name ?? 'User',
          other_user_image: prof.profile_image_url ?? null,
          last_message: c.last_message ?? null,
          last_message_at: c.last_message_at ?? null,
          unread_count: c.unread_count ?? 0,
        };
      });
    },
    enabled: !!user,
  });

  if (activeId) {
    const conv = conversations.find(c => c.id === activeId);
    if (!conv) {
      // Race: activeId set but conversation list no longer contains it.
      // Reset to inbox view rather than rendering an empty thread.
      setActiveId(null);
      return null;
    }
    return (
      <SafeAreaView style={s.container}>
        <Navbar />
        <View style={s.threadHeader}>
          <BackButton onPress={() => setActiveId(null)} />
          <Text style={s.threadTitle} numberOfLines={1}>{conv.other_user_name ?? 'Conversation'}</Text>
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
