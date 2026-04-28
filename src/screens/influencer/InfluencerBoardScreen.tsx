// InfluencerBoard — directory of verified influencers (Lovable parity).
// Source: offerhound-repo's InfluencerBoard page. The earlier RN port queried
// `influencer_board_snapshots` (a feed concept); the real UI is a filterable
// directory of `influencer_profiles` where `verification_status = 'verified'`,
// with sport / affiliation filters and a display-name search.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Users } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { InfluencerMatchCard } from '@/components/influencer/InfluencerMatchCard';
import { SPORTS } from '@/lib/constants';
import { colors, typography, spacing, radius } from '@/lib/theme';

// InfluencerAffiliationType enum from types.ts
const AFFILIATION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'athlete', label: 'Athlete' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'coach', label: 'Coach' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'media', label: 'Media' },
  { value: 'nil_advisor', label: 'NIL Advisor' },
  { value: 'other', label: 'Other' },
];

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function InfluencerBoardScreen() {
  const [search, setSearch] = useState('');
  const [sport, setSport] = useState<string>('all');
  const [affiliation, setAffiliation] = useState<string>('all');

  const hasFilters = search.trim().length > 0 || sport !== 'all' || affiliation !== 'all';

  const { data: influencers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['influencer-directory', search, sport, affiliation],
    queryFn: async () => {
      let q = supabase
        .from('influencer_profiles' as any)
        .select(
          'id, handle, display_name, profile_image_url, primary_sport, sport, affiliation_type, bio, verification_status',
        )
        .eq('verification_status', 'verified')
        .order('display_name', { ascending: true })
        .limit(100);

      if (search.trim().length > 0) {
        q = q.ilike('display_name', `%${search.trim()}%`);
      }
      if (sport !== 'all') {
        // Prefer primary_sport; fall back to sport via `or` so rows with either
        // column populated are included.
        q = q.or(`primary_sport.eq.${sport},sport.eq.${sport}`);
      }
      if (affiliation !== 'all') {
        q = q.eq('affiliation_type', affiliation);
      }

      const { data, error } = await q;
      if (error) return [] as any[];
      return (data || []) as any[];
    },
  });

  const clearFilters = () => {
    setSearch('');
    setSport('all');
    setAffiliation('all');
  };

  const count = influencers.length;

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <View style={s.headerRow}>
          <BackButton />
          <Text style={s.title}>Influencer Board</Text>
        </View>
        <Text style={s.subtitle}>
          A directory of verified voices in youth and amateur sports.
        </Text>

        {/* Filters */}
        <View style={s.filters}>
          <View style={s.searchBox}>
            <Search size={16} color={colors.mutedForeground} />
            <Input
              placeholder="Search by name..."
              value={search}
              onChangeText={setSearch}
              containerStyle={{ flex: 1 }}
              style={s.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.selectRow}>
            <View style={s.selectCell}>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger>
                  <SelectValue placeholder="Sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sports</SelectItem>
                  {SPORTS.map((sp) => (
                    <SelectItem key={sp} value={sp}>
                      {titleCase(sp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={s.selectCell}>
              <Select value={affiliation} onValueChange={setAffiliation}>
                <SelectTrigger>
                  <SelectValue placeholder="Affiliation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Affiliations</SelectItem>
                  {AFFILIATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
          </View>

          <View style={s.countRow}>
            <View style={s.countPill}>
              <Users size={14} color={colors.primary} />
              <Text style={s.countText}>
                {count} verified influencer{count === 1 ? '' : 's'}
              </Text>
            </View>
            {hasFilters ? (
              <Pressable onPress={clearFilters} style={s.clearBtn} hitSlop={8}>
                <X size={14} color={colors.foreground} />
                <Text style={s.clearText}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Results */}
        {isLoading ? (
          <Text style={s.empty}>Loading verified influencers…</Text>
        ) : count === 0 ? (
          <Text style={s.empty}>
            {hasFilters
              ? 'No influencers match your filters. Try clearing them.'
              : 'No verified influencers yet.'}
          </Text>
        ) : (
          <View style={s.results}>
            {influencers.map((inf: any) => (
              <InfluencerMatchCard key={inf.id} influencer={inf} variant="full" />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  filters: { gap: spacing.sm, marginBottom: spacing.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  searchInput: { borderWidth: 0, paddingVertical: spacing.sm, backgroundColor: 'transparent' },
  selectRow: { flexDirection: 'row', gap: spacing.sm },
  selectCell: { flex: 1 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    backgroundColor: 'rgba(231,175,8,0.08)',
  },
  countText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  results: { gap: spacing.sm },
  empty: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
