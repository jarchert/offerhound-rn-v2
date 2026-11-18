// Notification center — bell with unread indicator, shows recent notifications in a Sheet.
import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, Alert } from 'react-native';
import { Bell, Check } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/lib/theme';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const qc=useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], error:loadError, isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if(error)throw error;
      return (data || []) as any as Notification[];
    },
    enabled: !!user,
  });

  const unread = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    try{const {error}=await supabase.from('notifications').update({is_read:true}).eq('user_id',user.id).eq('is_read',false);if(error)throw error;await refetch();await qc.invalidateQueries({queryKey:['notif-unread-count']});}catch{Alert.alert("Couldn't mark notifications read",'Please try again.');}
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
            ListEmptyComponent={<Pressable accessibilityRole="button" onPress={()=>void refetch()}><Text style={s.empty}>{isLoading?'Loading notifications…':loadError?"Couldn't load notifications. Tap to retry.":'No notifications yet'}</Text></Pressable>}
            renderItem={({ item }) => (
              <View style={[s.item, !item.is_read && s.itemUnread]}>
                <View style={s.itemHeader}>
                  <Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text>
                  {!item.is_read && <View style={s.unreadDot} />}
                </View>
                {item.message && <Text style={s.itemBody}>{item.message}</Text>}
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
