// AdminInfluencersScreen — influencer_profiles list for admin.
//
// Real columns (confirmed): id, user_id, display_name, handle, bio,
//   profile_image_url, follower_count, verification_status,
//   affiliation_type, primary_sport, board_visibility,
//   created_at, updated_at
//
// Display pattern (matches MAIN's fixed display):
//   - Primary name:    display_name
//   - Secondary line:  @handle
//   - Subtitle:        affiliation_type · primary_sport
//   - Badges:          verification_status + board_visibility
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { colors, typography, spacing, radius } from '@/lib/theme';

export interface InfluencerRow {
  id: string;
  user_id: string;
  display_name: string | null;
  handle: string | null;
  bio: string | null;
  profile_image_url: string | null;
  follower_count: number | null;
  verification_status: string | null;
  affiliation_type: string | null;
  primary_sport: string | null;
  board_visibility: string | null;
  created_at: string;
}

async function fetchInfluencers(): Promise<InfluencerRow[]> {
  const { data, error } = await supabase
    .from('influencer_profiles')
    .select(
      'id, user_id, display_name, handle, bio, profile_image_url, ' +
      'follower_count, verification_status, affiliation_type, ' +
      'primary_sport, board_visibility, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as InfluencerRow[];
}

function verificationVariant(status: string | null): 'default' | 'outline' | 'secondary' {
  if (status === 'verified') return 'default';
  if (status === 'pending') return 'outline';
  return 'secondary';
}

export default function AdminInfluencersScreen() {
  const [search, setSearch] = useState('');

  const { data: influencers = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-influencers'],
    queryFn: fetchInfluencers,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return influencers;
    return influencers.filter((inf) =>
      [inf.display_name, inf.handle, inf.affiliation_type, inf.primary_sport, inf.verification_status]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [influencers, search]);

  return (
    <View style={s.container} testID="admin-influencers-screen">
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, handle, sport…"
          placeholderTextColor={colors.foregroundSubtle}
          testID="influencer-search-input"
        />
      </View>

      {!isLoading && filtered.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyText} testID="influencers-empty">
            No influencers found.
          </Text>
        </View>
      )}

      <FlashList
        data={filtered}
        keyExtractor={(inf) => inf.id}
        estimatedItemSize={88}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => <InfluencerCard inf={item} />}
      />
    </View>
  );
}

function InfluencerCard({ inf }: { inf: InfluencerRow }) {
  const subtitle = [inf.affiliation_type, inf.primary_sport].filter(Boolean).join(' · ') || '—';
  const followers = inf.follower_count != null
    ? inf.follower_count >= 1000
      ? `${(inf.follower_count / 1000).toFixed(1)}k followers`
      : `${inf.follower_count} followers`
    : null;

  return (
    <Card style={s.card} testID={`influencer-card-${inf.id}`}>
      <View style={s.row}>
        <Avatar
          source={inf.profile_image_url ? { uri: inf.profile_image_url } : null}
          fallback={inf.display_name ?? '?'}
          size={44}
        />
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1} testID={`influencer-name-${inf.id}`}>
            {inf.display_name || '(no name)'}
          </Text>
          {inf.handle ? (
            <Text style={s.handle} numberOfLines={1}>@{inf.handle}</Text>
          ) : null}
          <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>
          {followers ? <Text style={s.followers}>{followers}</Text> : null}
        </View>
        <View style={s.badges}>
          <Badge
            variant={verificationVariant(inf.verification_status)}
            testID={`influencer-verification-${inf.id}`}
          >
            {inf.verification_status ?? 'pending'}
          </Badge>
          {inf.board_visibility ? (
            <Badge variant="outline" testID={`influencer-visibility-${inf.id}`}>
              {inf.board_visibility}
            </Badge>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.foregroundSubtle,
  },
  list: { padding: spacing.md },
  card: { padding: spacing.sm, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  info: { flex: 1 },
  name: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  handle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
  },
  followers: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.foregroundSubtle,
  },
  badges: { gap: 4, alignItems: 'flex-end' },
});
