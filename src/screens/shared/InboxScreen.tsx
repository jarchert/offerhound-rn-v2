// InboxScreen — RN port of Lovable web src/pages/Inbox.tsx (parity port).
// Unified notifications + messages inbox with role-scoped counts.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { format, isToday, isYesterday } from 'date-fns';
import { Bell, MessageCircle, CheckCheck, Inbox as InboxIcon, Check } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Skeleton } from '@/components/ui/Skeleton';
import { BackButton } from '@/components/BackButton';
import { Navbar } from '@/components/Navbar';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActiveRoleScope, ROLE_LABEL } from '@/hooks/useActiveRoleScope';
import { colors, spacing, typography } from '@/lib/theme';

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

type ConversationRow = {
  id: string;
  coach_user_id: string;
  athlete_user_id: string;
  last_message_at: string | null;
  other_name?: string;
  last_message?: string | null;
  unread_count?: number;
};

function formatWhen(d: string | null | undefined) {
  if (!d) return '';
  const date = new Date(d);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

function groupByDate<T extends { created_at: string }>(items: T[]) {
  const groups: Record<string, T[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const item of items) {
    const d = new Date(item.created_at);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : 'Earlier';
    groups[key].push(item);
  }
  return groups;
}

export default function InboxScreen() {
  const { user, loading: authLoading } = useAuth() as any;
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'all' | 'messages' | 'alerts'>('all');
  const activeScope = useActiveRoleScope();
  const [showAllRoles, setShowAllRoles] = useState(false);
  const effectiveRole = showAllRoles ? 'all' : activeScope.role;
  const effectiveNotifTypes = showAllRoles ? null : activeScope.notifTypes;
  const effectiveConvScope = showAllRoles ? 'all' : activeScope.convScope;

  useEffect(() => {
    if (!authLoading && !user) {
      navigation.dispatch(CommonActions.navigate({ name: 'AuthStack' }));
    }
  }, [authLoading, user, navigation]);

  const { data: notifications = [], isLoading: notifLoading } = useQuery({
    queryKey: ['inbox-notifications', user?.id, effectiveRole],
    queryFn: async () => {
      if (!user) return [] as NotificationRow[];
      let q = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (effectiveNotifTypes && effectiveNotifTypes.length > 0) {
        q = q.in('type', effectiveNotifTypes);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any as NotificationRow[];
    },
    enabled: !!user,
  });

  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ['inbox-conversations', user?.id, effectiveRole],
    queryFn: async () => {
      if (!user) return [] as ConversationRow[];
      let filter: string;
      if (effectiveConvScope === 'coach_side') filter = `coach_user_id.eq.${user.id}`;
      else if (effectiveConvScope === 'athlete_side') filter = `athlete_user_id.eq.${user.id}`;
      else filter = `coach_user_id.eq.${user.id},athlete_user_id.eq.${user.id}`;
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(filter)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (conv: any) => {
          const isCoach = conv.coach_user_id === user.id;
          const otherId = isCoach ? conv.athlete_user_id : conv.coach_user_id;
          let otherName = 'Conversation';
          if (isCoach) {
            const { data: p } = await supabase
              .from('player_profiles')
              .select('full_name')
              .eq('user_id', otherId)
              .maybeSingle();
            if ((p as any)?.full_name) otherName = (p as any).full_name;
          } else {
            const { data: p } = await supabase
              .from('coach_profiles')
              .select('name')
              .eq('user_id', otherId)
              .maybeSingle();
            if ((p as any)?.name) otherName = (p as any).name;
          }
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_user_id', user.id);
          return {
            ...conv,
            other_name: otherName,
            last_message: (lastMsg as any)?.content || null,
            unread_count: count || 0,
          } as ConversationRow;
        })
      );
      return enriched;
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-unread-count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      let q = supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (effectiveNotifTypes && effectiveNotifTypes.length > 0) {
        q = q.in('type', effectiveNotifTypes);
      }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-unread-count'] });
      toast.success(
        showAllRoles
          ? 'All alerts marked as read'
          : `${ROLE_LABEL[activeScope.role]} alerts marked as read`
      );
    },
  });

  const markConvRead = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true } as any)
        .eq('conversation_id', conversationId)
        .neq('sender_user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-conversations'] });
      qc.invalidateQueries({ queryKey: ['notif-unread-count'] });
    },
  });

  const unreadAlerts = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );
  const unreadMessages = useMemo(
    () => conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0),
    [conversations]
  );
  const totalUnread = unreadAlerts + unreadMessages;

  const grouped = useMemo(() => groupByDate(notifications), [notifications]);

  const handleNotifClick = (n: NotificationRow) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) {
      // Best-effort: route names that match the web link's first segment.
      // Falls back silently if no matching route exists.
      const seg = n.link.replace(/^\/+/, '').split('/')[0];
      const routeMap: Record<string, string> = {
        messages: 'Messages',
        notifications: 'Notifications',
        inbox: 'Inbox',
        profile: 'Profile',
      };
      const target = routeMap[seg];
      if (target) {
        try { navigation.navigate(target as never); } catch { /* noop */ }
      }
    }
  };

  const handleConvClick = (c: ConversationRow) => {
    if ((c.unread_count || 0) > 0) markConvRead.mutate(c.id);
    try { navigation.navigate('Messages' as never); } catch { /* noop */ }
  };

  const showRoleScopeBanner =
    activeScope.role !== 'all' && activeScope.role !== 'admin';

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scrollContent}>
        <BackButton />

        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.titleRow}>
              <InboxIcon size={28} color={colors.primary} />
              <Text style={s.title}>Inbox</Text>
            </View>
            <Text style={s.subtitle}>
              Messages and alerts in one place
              {totalUnread > 0 ? `  ·  ${totalUnread} unread` : ''}
            </Text>
          </View>
          {unreadAlerts > 0 && (
            <Button
              variant="outline"
              size="sm"
              onPress={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              leftIcon={<CheckCheck size={16} color={colors.foreground} />}
            >
              Mark all read
            </Button>
          )}
        </View>

        {showRoleScopeBanner && (
          <View style={s.scopeBanner}>
            <Text style={s.scopeText}>
              Showing{' '}
              <Text style={s.scopeStrong}>
                {showAllRoles ? 'all roles' : `${ROLE_LABEL[activeScope.role]} dashboard`}
              </Text>{' '}
              activity
            </Text>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setShowAllRoles((v) => !v)}
            >
              {showAllRoles ? `Scope to ${ROLE_LABEL[activeScope.role]}` : 'Show all roles'}
            </Button>
          </View>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">
              {totalUnread > 0 ? `All (${totalUnread})` : 'All'}
            </TabsTrigger>
            <TabsTrigger value="messages">
              {unreadMessages > 0 ? `Messages (${unreadMessages})` : 'Messages'}
            </TabsTrigger>
            <TabsTrigger value="alerts">
              {unreadAlerts > 0 ? `Alerts (${unreadAlerts})` : 'Alerts'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <View style={s.section}>
              <MessagesList
                conversations={conversations}
                loading={convLoading}
                onPress={handleConvClick}
                limit={3}
              />
              <AlertsList
                grouped={grouped}
                loading={notifLoading}
                onPress={handleNotifClick}
              />
            </View>
          </TabsContent>

          <TabsContent value="messages">
            <MessagesList
              conversations={conversations}
              loading={convLoading}
              onPress={handleConvClick}
            />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsList
              grouped={grouped}
              loading={notifLoading}
              onPress={handleNotifClick}
            />
          </TabsContent>
        </Tabs>
      </ScrollView>
    </SafeAreaView>
  );
}

function MessagesList({
  conversations,
  loading,
  onPress,
  limit,
}: {
  conversations: ConversationRow[];
  loading: boolean;
  onPress: (c: ConversationRow) => void;
  limit?: number;
}) {
  if (loading) {
    return (
      <View style={s.list}>
        <Skeleton style={{ height: 64, width: '100%' }} />
        <Skeleton style={{ height: 64, width: '100%' }} />
      </View>
    );
  }
  if (!conversations.length) {
    return (
      <Card style={s.emptyCard}>
        <MessageCircle size={32} color={colors.mutedForeground} />
        <Text style={s.emptyText}>No messages yet</Text>
      </Card>
    );
  }
  const items = limit ? conversations.slice(0, limit) : conversations;
  return (
    <View style={s.list}>
      {limit && conversations.length > 0 && (
        <Text style={s.sectionLabel}>RECENT MESSAGES</Text>
      )}
      {items.map((c) => {
        const unread = (c.unread_count || 0) > 0;
        return (
          <Pressable key={c.id} onPress={() => onPress(c)}>
            <Card style={[s.itemCard, unread && s.itemCardUnread] as any}>
              <View style={s.row}>
                <View style={s.rowLeft}>
                  <View style={s.avatar}>
                    <MessageCircle size={20} color={colors.primary} />
                  </View>
                  <View style={s.rowText}>
                    <View style={s.titleLine}>
                      <Text style={s.itemTitle} numberOfLines={1}>
                        {c.other_name}
                      </Text>
                      {unread && (
                        <Badge variant="default">{String(c.unread_count)}</Badge>
                      )}
                    </View>
                    <Text style={s.itemSubtitle} numberOfLines={1}>
                      {c.last_message || 'Start the conversation'}
                    </Text>
                  </View>
                </View>
                <Text style={s.timeText}>{formatWhen(c.last_message_at)}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

function AlertsList({
  grouped,
  loading,
  onPress,
}: {
  grouped: Record<string, NotificationRow[]>;
  loading: boolean;
  onPress: (n: NotificationRow) => void;
}) {
  if (loading) {
    return (
      <View style={s.list}>
        <Skeleton style={{ height: 56, width: '100%' }} />
        <Skeleton style={{ height: 56, width: '100%' }} />
        <Skeleton style={{ height: 56, width: '100%' }} />
      </View>
    );
  }
  const total = Object.values(grouped).reduce((acc, arr) => acc + arr.length, 0);
  if (!total) {
    return (
      <Card style={s.emptyCard}>
        <Bell size={32} color={colors.mutedForeground} />
        <Text style={s.emptyText}>No alerts yet</Text>
      </Card>
    );
  }
  return (
    <ScrollArea style={{ maxHeight: 600 }}>
      <View style={s.alertsRoot}>
        {(['Today', 'Yesterday', 'Earlier'] as const).map((label) =>
          grouped[label]?.length ? (
            <View key={label} style={s.alertSection}>
              <Text style={s.sectionLabel}>{label.toUpperCase()}</Text>
              <View style={s.list}>
                {grouped[label].map((n) => {
                  const unread = !n.is_read;
                  return (
                    <Pressable key={n.id} onPress={() => onPress(n)}>
                      <Card style={[s.itemCard, unread && s.itemCardUnread] as any}>
                        <View style={s.alertRow}>
                          <View style={s.avatarSm}>
                            <Bell size={16} color={colors.primary} />
                          </View>
                          <View style={s.rowText}>
                            <View style={s.titleLine}>
                              <Text
                                style={[s.alertTitle, unread && s.alertTitleUnread]}
                                numberOfLines={1}
                              >
                                {n.title}
                              </Text>
                              <Text style={s.timeText}>
                                {formatWhen(n.created_at)}
                              </Text>
                            </View>
                            {n.message && (
                              <Text style={s.itemSubtitle} numberOfLines={2}>
                                {n.message}
                              </Text>
                            )}
                            {unread && (
                              <View style={s.tapToRead}>
                                <Check size={12} color={colors.primary} />
                                <Text style={s.tapToReadText}>
                                  Tap to mark as read
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null
        )}
      </View>
    </ScrollArea>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: 768,
    alignSelf: 'stretch',
    width: '100%',
  },
  header: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    fontSize: 14,
  },
  scopeBanner: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  scopeText: { color: colors.mutedForeground, fontSize: 13, flex: 1 },
  scopeStrong: { color: colors.foreground, fontWeight: '600' },

  section: { gap: spacing.sm, marginTop: spacing.md },
  list: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.mutedForeground,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },

  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: { color: colors.mutedForeground, fontSize: 14 },

  itemCard: { padding: spacing.md },
  itemCardUnread: {
    borderColor: colors.primary,
    borderWidth: 1,
    backgroundColor: colors.cardHigh,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(231,175,8,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(231,175,8,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  itemTitle: {
    color: colors.foreground,
    fontWeight: '600',
    fontSize: 15,
    flex: 1,
  },
  itemSubtitle: {
    color: colors.mutedForeground,
    fontSize: 13,
    marginTop: 2,
  },
  timeText: { color: colors.mutedForeground, fontSize: 12 },

  alertsRoot: { gap: spacing.md },
  alertSection: {},
  alertRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  alertTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  alertTitleUnread: { fontWeight: '700' },
  tapToRead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  tapToReadText: { fontSize: 12, color: colors.primary },
});
