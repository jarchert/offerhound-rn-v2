import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing } from '@/lib/theme';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  created_at: string;
  is_read: boolean;
  type: string;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data || []) as any as Notification[];
    },
    enabled: !!user,
  });

  const unread = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <View style={s.headerText}>
          <Text style={s.title}>Notifications</Text>
          <Text style={s.subtitle}>{unread} unread</Text>
        </View>
        {unread > 0 && (
          <Pressable style={s.markAll} onPress={markAllRead}>
            <CheckCheck size={14} color={colors.primary} />
            <Text style={s.markAllText}>Mark all</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={n => n.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        ListEmptyComponent={<Text style={s.empty}>No notifications yet</Text>}
        renderItem={({ item }) => (
          <Pressable style={[s.row, !item.is_read && s.rowUnread]} onPress={() => !item.is_read && markRead(item.id)}>
            <View style={s.rowText}>
              <View style={s.rowTop}>
                <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                {!item.is_read && <View style={s.dot} />}
              </View>
              {item.body && <Text style={s.rowBody}>{item.body}</Text>}
              <Text style={s.rowDate}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            {item.is_read && <Check size={14} color={colors.mutedForeground} />}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  headerText: { flex: 1 },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  markAllText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primary },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  rowUnread: { borderColor: colors.primary, backgroundColor: colors.muted },
  rowText: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { flex: 1, fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground },
  rowBody: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  rowDate: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  sep: { height: spacing.sm },
  empty: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center', padding: spacing.xl },
});
