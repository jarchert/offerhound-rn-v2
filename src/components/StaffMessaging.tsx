// Verbatim port of Lovable StaffMessaging.tsx — RN-adapted.
// Source: offerhound-repo/src/components/StaffMessaging.tsx (301 LOC)
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Search,
  Check,
  CheckCheck,
  Forward,
} from 'lucide-react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface StaffMessagingProps {
  initialRecipient?: { id: string; name: string; staff_user_id?: string };
}

export function StaffMessaging({ initialRecipient }: StaffMessagingProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStaff, setSelectedStaff] = useState<any>(initialRecipient || null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<FlatList<any> | null>(null);

  // Fetch all staff members (both owned by me and where I'm staff)
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-messaging-contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: owned, error: e1 } = await supabase
        .from('coaching_staff')
        .select('*')
        .eq('owner_user_id', user.id)
        .neq('status', 'removed');
      if (e1) throw e1;
      const { data: memberOf, error: e2 } = await supabase
        .from('coaching_staff')
        .select('*')
        .eq('staff_user_id', user.id)
        .neq('status', 'removed');
      if (e2) throw e2;
      const contacts: any[] = [];
      (owned || []).forEach((s: any) => {
        contacts.push({ id: s.id, user_id: s.staff_user_id || s.id, name: s.name, role: s.role, email: s.email });
      });
      (memberOf || []).forEach((s: any) => {
        contacts.push({ id: s.id, user_id: s.owner_user_id, name: 'Team Owner', role: 'owner', email: null });
      });
      return contacts;
    },
    enabled: !!user,
  });

  // Conversation threads grouped by recipient
  const { data: threads = [] } = useQuery({
    queryKey: ['staff-message-threads', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('staff_messages')
        .select('*')
        .or(`sender_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const threadMap = new Map<string, any>();
      (data || []).forEach((msg: any) => {
        const otherId = msg.sender_user_id === user.id ? msg.recipient_user_id : msg.sender_user_id;
        if (!threadMap.has(otherId)) {
          threadMap.set(otherId, {
            user_id: otherId,
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0,
            message_type: msg.message_type,
          });
        }
        if (msg.recipient_user_id === user.id && !msg.is_read) {
          const t = threadMap.get(otherId);
          t.unread_count++;
        }
      });
      return Array.from(threadMap.values());
    },
    enabled: !!user,
  });

  const recipientUserId = selectedStaff?.staff_user_id || selectedStaff?.user_id;

  const { data: messages = [], isLoading: msgLoading } = useQuery({
    queryKey: ['staff-messages', user?.id, recipientUserId],
    queryFn: async () => {
      if (!user || !recipientUserId) return [];
      const { data, error } = await supabase
        .from('staff_messages')
        .select('*')
        .or(
          `and(sender_user_id.eq.${user.id},recipient_user_id.eq.${recipientUserId}),and(sender_user_id.eq.${recipientUserId},recipient_user_id.eq.${user.id})`,
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      const unread = (data || []).filter((m: any) => m.recipient_user_id === user.id && !m.is_read);
      if (unread.length > 0) {
        await supabase
          .from('staff_messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('recipient_user_id', user.id)
          .eq('sender_user_id', recipientUserId)
          .eq('is_read', false);
      }
      return data || [];
    },
    enabled: !!user && !!recipientUserId,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !recipientUserId) throw new Error('Missing recipient');
      const { error } = await supabase.from('staff_messages').insert({
        sender_user_id: user.id,
        recipient_user_id: recipientUserId,
        content,
        message_type: 'text',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-messages'] });
      queryClient.invalidateQueries({ queryKey: ['staff-message-threads'] });
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      // Defer to next tick so the list has rendered the new item.
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd?.({ animated: true });
      }, 50);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await sendMessage.mutateAsync(newMessage);
    setNewMessage('');
  };

  const getInitials = (name: string = '') =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const formatDate = (d: string) => {
    const date = new Date(d);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday ' + format(date, 'h:mm a');
    return format(date, 'MMM d, h:mm a');
  };

  // Merge staff list with thread data
  const contactsWithThreads = useMemo(
    () =>
      staffList.map((s: any) => {
        const thread = threads.find((t: any) => t.user_id === (s.staff_user_id || s.user_id));
        return { ...s, ...thread };
      }),
    [staffList, threads],
  );

  const filteredContacts = contactsWithThreads.filter((c: any) => {
    if (!searchQuery) return true;
    return (
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getForwardLabel = (msg: any) => {
    if (msg.message_type === 'athlete_forward') return '🏈 Athlete Forwarded';
    if (msg.message_type === 'camp_forward') return '🏕️ Camp Forwarded';
    if (msg.message_type === 'letter_forward') return '✉️ Letter Forwarded';
    return null;
  };

  // ---- Sidebar (contact list) ----
  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.sidebarTitleRow}>
          <MessageCircle size={16} color={colors.foreground} />
          <Text style={styles.sidebarTitle}>Staff Messages</Text>
        </View>
        <View style={styles.searchWrap}>
          <View style={styles.searchIcon}>
            <Search size={14} color={colors.mutedForeground} />
          </View>
          <TextInput
            placeholder="Search staff..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
      </View>
      {filteredContacts.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageCircle size={32} color={colors.mutedForeground} style={{ marginBottom: spacing.xs }} />
          <Text style={styles.emptyText}>No staff contacts</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {filteredContacts.map((contact: any) => {
            const isActive = recipientUserId === (contact.staff_user_id || contact.user_id);
            return (
              <Pressable
                key={contact.id}
                onPress={() => setSelectedStaff(contact)}
                style={[styles.contactRow, isActive && styles.contactRowActive]}
              >
                <Avatar fallback={getInitials(contact.name)} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.contactTopRow}>
                    <Text style={styles.contactName} numberOfLines={1}>
                      {contact.name}
                    </Text>
                    {contact.last_message_at && (
                      <Text style={styles.contactTime}>
                        {isToday(new Date(contact.last_message_at))
                          ? format(new Date(contact.last_message_at), 'h:mm a')
                          : format(new Date(contact.last_message_at), 'MMM d')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.contactPreview} numberOfLines={1}>
                    {contact.last_message || contact.role}
                  </Text>
                </View>
                {(contact.unread_count || 0) > 0 && (
                  <Badge variant="default">{String(contact.unread_count)}</Badge>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // ---- Messages panel ----
  const renderMessageItem = ({ item: msg }: { item: any }) => {
    const isOwn = msg.sender_user_id === user?.id;
    const forwardLabel = getForwardLabel(msg);
    return (
      <View style={[styles.bubbleRow, { justifyContent: isOwn ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {forwardLabel && (
            <View style={styles.forwardRow}>
              <Forward size={12} color={isOwn ? 'rgba(255,255,255,0.7)' : colors.mutedForeground} />
              <Text
                style={[
                  styles.forwardText,
                  { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.mutedForeground },
                ]}
              >
                {forwardLabel}
              </Text>
            </View>
          )}
          <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
            {msg.content}
          </Text>
          <View style={[styles.metaRow, isOwn && { justifyContent: 'flex-end' }]}>
            <Text
              style={[
                styles.metaText,
                { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.mutedForeground },
              ]}
            >
              {formatDate(msg.created_at)}
            </Text>
            {isOwn &&
              (msg.is_read ? (
                <CheckCheck size={12} color="rgba(255,255,255,0.7)" />
              ) : (
                <Check size={12} color="rgba(255,255,255,0.7)" />
              ))}
          </View>
        </View>
      </View>
    );
  };

  const renderMessagesPanel = () => (
    <View style={styles.messagesPanel}>
      {selectedStaff ? (
        <>
          <View style={styles.threadHeader}>
            <Pressable
              onPress={() => setSelectedStaff(null)}
              style={styles.backBtn}
              hitSlop={8}
            >
              <ArrowLeft size={16} color={colors.foreground} />
            </Pressable>
            <Avatar fallback={getInitials(selectedStaff.name)} size={32} />
            <View>
              <Text style={styles.threadName}>{selectedStaff.name}</Text>
              <Text style={styles.threadRole}>
                {(selectedStaff.role || '').replace('_', ' ')}
              </Text>
            </View>
          </View>
          {msgLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.foreground} />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          ) : (
            <FlatList
              ref={messagesEndRef}
              data={messages}
              keyExtractor={(m: any) => m.id}
              renderItem={renderMessageItem}
              contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: spacing.xs }}
              onContentSizeChange={() => messagesEndRef.current?.scrollToEnd?.({ animated: true })}
            />
          )}
          <View style={styles.composer}>
            <TextInput
              placeholder="Type a message..."
              placeholderTextColor={colors.mutedForeground}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              style={styles.composerInput}
            />
            <Pressable
              onPress={handleSend}
              disabled={!newMessage.trim() || sendMessage.isPending}
              style={({ pressed }) => [
                styles.sendBtn,
                (!newMessage.trim() || sendMessage.isPending) && { opacity: 0.5 },
                pressed && { opacity: 0.8 },
              ]}
            >
              {sendMessage.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Send size={16} color={colors.primaryForeground} />
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.placeholderPanel}>
          <MessageCircle size={48} color={colors.mutedForeground} style={{ marginBottom: spacing.sm }} />
          <Text style={styles.emptyText}>Select a staff member to message</Text>
        </View>
      )}
    </View>
  );

  return (
    <Card style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Mobile-first: show sidebar OR messages panel based on selection. */}
        {selectedStaff ? renderMessagesPanel() : renderSidebar()}
      </KeyboardAvoidingView>
    </Card>
  );
}

export default StaffMessaging;

const styles = StyleSheet.create({
  root: { height: 500, padding: 0, overflow: 'hidden' },

  // Sidebar
  sidebar: { flex: 1, borderRightWidth: 1, borderRightColor: colors.border },
  sidebarHeader: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  sidebarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  sidebarTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  searchWrap: { position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: spacing.sm, zIndex: 1 },
  searchInput: {
    height: 32,
    paddingLeft: spacing.lg + 4,
    paddingRight: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
  },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactRowActive: { backgroundColor: colors.accent },
  contactTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  contactName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    flex: 1,
  },
  contactTime: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  contactPreview: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },

  // Messages panel
  messagesPanel: { flex: 1, flexDirection: 'column' },
  threadHeader: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  threadName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
  },
  threadRole: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    textTransform: 'capitalize',
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },

  // Bubbles
  bubbleRow: { flexDirection: 'row' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: colors.muted,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
  },
  bubbleTextOwn: { color: colors.primaryForeground },
  bubbleTextOther: { color: colors.foreground },
  forwardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  forwardText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
  },

  // Composer
  composer: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  composerInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});
