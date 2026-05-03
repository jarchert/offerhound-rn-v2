// AdminUsersScreen — user management with search + role filter.
// Part 32 of the conversion guide describes the admin suite.
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  profile_image_url: string | null;
}

export default function AdminUsersScreen() {
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles' as any)
        .select('id, email, full_name, role, created_at, profile_image_url')
        .order('created_at', { ascending: false })
        .limit(500);
      return (data || []) as any as UserRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.full_name ?? ''} ${u.email} ${u.role ?? ''}`.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <Text style={s.title}>User management</Text>
        <Text style={s.subtitle}>{filtered.length} users</Text>
      </View>
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, or role…"
          placeholderTextColor={colors.foregroundSubtle}
        />
      </View>
      <FlashList
        data={filtered}
        keyExtractor={(u) => u.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>
              {isLoading ? 'Loading users…' : 'No users found'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={s.card}>
            <View style={s.row}>
              <Avatar
                source={item.profile_image_url ? { uri: item.profile_image_url } : null}
                fallback={item.full_name || item.email}
                size={40}
              />
              <View style={s.info}>
                <Text style={s.name} numberOfLines={1}>{item.full_name || 'Unnamed'}</Text>
                <Text style={s.email} numberOfLines={1}>{item.email}</Text>
              </View>
              {item.role ? <Badge variant="outline">{item.role}</Badge> : null}
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
  },
  searchRow: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  searchInput: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
  },
  list: { padding: spacing.md },
  card: { padding: spacing.sm, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  info: { flex: 1 },
  name: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  email: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.foregroundSubtle,
    textAlign: 'center',
  },
});
