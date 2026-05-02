// Ported from Lovable src/components/MatchSuggestionFeed.tsx.
// Compact variant used on athlete dashboard. Full variant is reserved for the
// Matches screen. Filters are Lovable-parity; we render a FlashList-free
// ScrollView in compact mode for simplicity.
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Sparkles, ChevronRight, RefreshCw, Target } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { useAthleteMatches, useDismissAthleteMatch } from '@/hooks/useAthleteMatches';
import { useRefreshAthleteMatches } from '@/hooks/useRefreshAthleteMatches';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface MatchSuggestionFeedProps {
  variant?: 'compact' | 'full';
  maxItems?: number;
  showFilters?: boolean;
}

export function MatchSuggestionFeed({
  variant = 'compact',
  maxItems = 5,
  showFilters: _showFilters = false,
}: MatchSuggestionFeedProps) {
  const nav = useNavigation<NavigationProp<any>>();
  const { data: matches, isLoading, refetch } = useAthleteMatches();
  const dismissMatch = useDismissAthleteMatch();
  const { refreshMatches, isRefreshing } = useRefreshAthleteMatches();

  const [priorityFilter] = useState<string>('all');
  const [sortBy] = useState<string>('score');

  const handleRefresh = useCallback(async () => {
    try {
      await refreshMatches({ force: true });
      refetch();
    } catch (e) {
      console.warn('refresh matches failed', e);
    }
  }, [refreshMatches, refetch]);

  const filteredMatches = useMemo(() => {
    return (matches || [])
      .filter((m: any) => priorityFilter === 'all' || m.priority === priorityFilter)
      .sort((a: any, b: any) => {
        switch (sortBy) {
          case 'athletic': return (b.athletic_fit_score || 0) - (a.athletic_fit_score || 0);
          case 'program': return (b.program_fit_score || 0) - (a.program_fit_score || 0);
          case 'geographic': return (b.geographic_fit_score || 0) - (a.geographic_fit_score || 0);
          default: return b.match_score - a.match_score;
        }
      });
  }, [matches, priorityFilter, sortBy]);

  const displayMatches = variant === 'compact'
    ? filteredMatches.slice(0, maxItems)
    : filteredMatches;

  if (isLoading) {
    return (
      <View style={s.card}>
        <View style={s.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>Loading matches…</Text>
        </View>
      </View>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <View style={s.card}>
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Sparkles color={colors.primary} size={18} />
            <Text style={s.headerTitle}>Coach Matches</Text>
          </View>
        </View>
        <Text style={s.cardSubtitle}>
          Personalized coach recommendations based on your profile
        </Text>
        <View style={s.emptyBlock}>
          <Target color={colors.foregroundSubtle} size={40} />
          <Text style={s.emptyTitle}>No matches available yet</Text>
          <Text style={s.emptyBody}>
            Complete your profile to get personalized coach recommendations
          </Text>
          <Pressable
            style={s.btnOutline}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <RefreshCw color={colors.primary} size={14} />
            )}
            <Text style={s.btnOutlineText}>Generate Matches</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const lastRefreshed = matches[0]?.last_refreshed_at
    ? formatDistanceToNow(new Date(matches[0].last_refreshed_at), { addSuffix: true })
    : 'recently';

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Sparkles color={colors.primary} size={18} />
          <Text style={s.headerTitle}>Coach Matches</Text>
        </View>
        {variant === 'compact' && filteredMatches.length > maxItems ? (
          <Pressable
            style={s.viewAllBtn}
            onPress={() => nav.navigate('AthleteTabs' as never, { screen: 'MatchesTab' } as never)}
            hitSlop={6}
          >
            <Text style={s.viewAllText}>View All</Text>
            <ChevronRight color={colors.primary} size={14} />
          </Pressable>
        ) : null}
      </View>
      <View style={s.headerSubRow}>
        <Text style={s.cardSubtitle}>Updated {lastRefreshed}</Text>
        <Pressable onPress={handleRefresh} disabled={isRefreshing} hitSlop={6}>
          {isRefreshing ? (
            <ActivityIndicator color={colors.foregroundSubtle} size="small" />
          ) : (
            <RefreshCw color={colors.foregroundSubtle} size={14} />
          )}
        </Pressable>
      </View>

      <ScrollView style={s.list} contentContainerStyle={{ gap: spacing.sm }}>
        {displayMatches.map((match: any) => (
          <CoachMatchCard
            key={match.id}
            variant={variant}
            coach={{
              id: match.coach?.id || match.coach_id,
              name: match.coach?.name,
              title: match.coach?.title,
              school: match.coach?.school,
              division: match.coach?.division,
              conference: match.coach?.conference,
              position_coached: match.coach?.position_coached,
              email: match.coach?.email,
              image_url: match.coach?.image_url,
            }}
            scores={{
              match_score: match.match_score,
              athletic_fit_score: match.athletic_fit_score,
              program_fit_score: match.program_fit_score,
              geographic_fit_score: match.geographic_fit_score,
              match_reason: match.match_reason,
              priority: match.priority,
            }}
            onDismiss={() => dismissMatch.mutate(match.id)}
          />
        ))}
      </ScrollView>

      {variant === 'full' && (
        <View style={s.statsRow}>
          <StatCol
            count={matches.filter((m: any) => m.priority === 'high').length}
            label="High Priority"
            color={colors.success}
          />
          <StatCol
            count={matches.filter((m: any) => m.priority === 'medium').length}
            label="Medium Priority"
            color={colors.warning}
          />
          <StatCol
            count={matches.filter((m: any) => m.priority === 'low').length}
            label="Low Priority"
            color={colors.info}
          />
        </View>
      )}
    </View>
  );
}

function StatCol({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <View style={s.statCol}>
      <Text style={[s.statNum, { color }]}>{count}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default MatchSuggestionFeed;

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    color: colors.foreground,
    fontSize: typography.heading.h5,
    letterSpacing: typography.letterSpacing.heading,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  cardSubtitle: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.size.base,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
    textAlign: 'center',
    maxWidth: 320,
  },
  btnOutline: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  btnOutlineText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.primary,
    fontSize: typography.size.sm,
  },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.primary,
    fontSize: typography.size.sm,
  },
  list: { maxHeight: 480 },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size['2xl'],
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.xs,
  },
});
