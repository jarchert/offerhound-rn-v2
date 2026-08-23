// AdminUsersScreen — user management with search + role filter.
// Part 32 of the conversion guide describes the admin suite.
//
// Query strategy: `profiles` table does not exist in this schema.
// Email lives in auth.users (Edge Function only; no admin-list-users function deployed).
// Instead we query user_roles for every user + their role, then fan out to
// player_profiles, coach_profiles, scout_profiles, and influencer_profiles for
// display name and avatar. Results are merged by user_id in JS.
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { colors, typography, spacing, radius } from '@/lib/theme';
import { UserCog } from 'lucide-react-native';

export interface AdminUserRow {
  userId: string;
  /** Best available display name across all profile tables; falls back to userId. */
  displayName: string;
  role: string;
  created_at: string;
  profile_image_url: string | null;
}

async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  // 1. All user→role mappings.
  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('user_id, role, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (!roleRows || roleRows.length === 0) return [];

  const userIds = [...new Set((roleRows as any[]).map((r) => r.user_id as string))];

  // 2. Parallel profile lookups.
  const [playerRes, coachRes, scoutRes, influencerRes] = await Promise.all([
    supabase
      .from('player_profiles')
      .select('user_id, full_name, profile_image_url')
      .in('user_id', userIds),
    supabase
      .from('coach_profiles')
      .select('user_id, full_name, profile_image_url')
      .in('user_id', userIds),
    supabase
      .from('scout_profiles')
      .select('user_id, full_name, profile_image_url')
      .in('user_id', userIds),
    supabase
      .from('influencer_profiles')
      .select('user_id, display_name, profile_image_url')
      .in('user_id', userIds),
  ]);

  // 3. Build a lookup map: user_id → { name, avatar }.
  type ProfileMeta = { displayName: string; profile_image_url: string | null };
  const profileMap = new Map<string, ProfileMeta>();

  for (const row of (playerRes.data ?? []) as any[]) {
    profileMap.set(row.user_id, { displayName: row.full_name ?? '', profile_image_url: row.profile_image_url ?? null });
  }
  for (const row of (coachRes.data ?? []) as any[]) {
    if (!profileMap.has(row.user_id))
      profileMap.set(row.user_id, { displayName: row.full_name ?? '', profile_image_url: row.profile_image_url ?? null });
  }
  for (const row of (scoutRes.data ?? []) as any[]) {
    if (!profileMap.has(row.user_id))
      profileMap.set(row.user_id, { displayName: row.full_name ?? '', profile_image_url: row.profile_image_url ?? null });
  }
  for (const row of (influencerRes.data ?? []) as any[]) {
    if (!profileMap.has(row.user_id))
      profileMap.set(row.user_id, { displayName: row.display_name ?? '', profile_image_url: row.profile_image_url ?? null });
  }

  // 4. Merge role rows with profile metadata.
  // Deduplicate by user_id — keep the most-privileged role (admin > moderator > others).
  const ROLE_PRIORITY: Record<string, number> = { admin: 10, moderator: 9 };
  const merged = new Map<string, AdminUserRow>();
  for (const r of roleRows as any[]) {
    const uid: string = r.user_id;
    const existing = merged.get(uid);
    const newPriority = ROLE_PRIORITY[r.role as string] ?? 0;
    const existingPriority = existing ? (ROLE_PRIORITY[existing.role] ?? 0) : -1;
    if (!existing || newPriority > existingPriority) {
      const meta = profileMap.get(uid) ?? { displayName: '', profile_image_url: null };
      merged.set(uid, {
        userId: uid,
        displayName: meta.displayName || uid.slice(0, 8),
        role: r.role as string,
        created_at: r.created_at as string,
        profile_image_url: meta.profile_image_url,
      });
    }
  }

  return [...merged.values()];
}

export default function AdminUsersScreen() {
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.displayName} ${u.role} ${u.userId}`.toLowerCase().includes(q),
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
          placeholder="Search by name, role, or user ID…"
          placeholderTextColor={colors.foregroundSubtle}
        />
      </View>
      <FlashList
        data={filtered}
        keyExtractor={(u) => u.userId}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <Card style={s.card}>
            <View style={s.row}>
              <Avatar
                source={item.profile_image_url ? { uri: item.profile_image_url } : null}
                fallback={item.displayName}
                size={40}
              />
              <View style={s.info}>
                <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
                <Text style={s.userId} numberOfLines={1}>{item.userId}</Text>
              </View>
              <Badge variant="outline">{item.role}</Badge>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Not available on mobile',
                    'User impersonation requires the web admin panel. Open the OfferHound web admin to impersonate this user.',
                    [{ text: 'OK' }],
                  )
                }
                style={s.impBtn}
                accessibilityLabel={`Impersonate ${item.displayName}`}
              >
                <UserCog size={14} color={colors.primaryForeground} />
                <Text style={s.impBtnText}>Impersonate</Text>
              </Pressable>
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
  userId: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
  },
  impBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  impBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.xs,
    color: colors.primaryForeground,
  },
});
