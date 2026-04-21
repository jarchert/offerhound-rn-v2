// Notification center — bell with unread indicator, shows recent notifications in a Sheet.
import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Bell, Check } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/lib/theme';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  read: boolean;
  type: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []) as any as Notification[];
    },
    enabled: !!user,
  });

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    refetch();
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={s.bellBtn}>
        <Bell size={20} color={colors.foreground} />
        {unread > 0 && (
          <View style={s.dot}>
            <Text style={s.dotText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>
      <Sheet open={open} onOpenChange={setOpen} side="right">
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>{unread} unread</SheetDescription>
          </SheetHeader>
          {unread > 0 && (
            <Pressable style={s.markAllBtn} onPress={markAllRead}>
              <Check size={14} color={colors.primary} />
              <Text style={s.markAllText}>Mark all as read</Text>
            </Pressable>
          )}
          <FlatList
            data={notifications}
            keyExtractor={n => n.id}
            ItemSeparatorComponent={() => <View style={s.sep} />}
            ListEmptyComponent={<Text style={s.empty}>No notifications yet</Text>}
            renderItem={({ item }) => (
              <View style={[s.item, !item.read && s.itemUnread]}>
                <View style={s.itemHeader}>
                  <Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text>
                  {!item.read && <View style={s.unreadDot} />}
                </View>
                {item.body && <Text style={s.itemBody}>{item.body}</Text>}
                <Text style={s.itemDate}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            )}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default NotificationCenter;

const s = StyleSheet.create({
  bellBtn: { padding: 6, position: 'relative' },
  dot: { position: 'absolute', top: 2, right: 2, backgroundColor: colors.destructive, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: colors.destructiveForeground, fontSize: 10, fontFamily: typography.fontFamily.bodyBold },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  markAllText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primary },
  item: { paddingVertical: spacing.sm, gap: 4 },
  itemUnread: { backgroundColor: colors.muted, paddingHorizontal: spacing.sm, borderRadius: 8 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: { flex: 1, fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  itemBody: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  itemDate: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  sep: { height: 1, backgroundColor: colors.border },
  empty: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center', padding: spacing.xl },
});
