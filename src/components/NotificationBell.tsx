// NotificationBell — compact header bell with unread badge.
// Reuses the existing NotificationCenter query but renders as a pressable icon
// suitable for tab navigator headerRight. Tapping navigates to NotificationsScreen.
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography } from '@/lib/theme';

interface NotificationBellProps {
  color?: string;
}

export function NotificationBell({ color = colors.foreground }: NotificationBellProps) {
  const { user } = useAuth();
  const nav = useNavigation<any>();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notif-unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  return (
    <Pressable
      onPress={() => nav.navigate('Notifications')}
      style={styles.btn}
      hitSlop={8}
      accessibilityLabel={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
    >
      <Bell size={22} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginRight: 12,
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 9,
    color: colors.primaryForeground,
    lineHeight: 12,
  },
});
