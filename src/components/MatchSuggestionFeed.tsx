// RN port of Lovable src/components/MatchSuggestionFeed.tsx.
//
// Web→RN mapping:
//   - <div>/<span>/<h*>/<p>            → <View>/<Text>
//   - Tailwind className                → StyleSheet
//   - lucide-react                      → lucide-react-native
//   - react-router-dom useNavigate      → @react-navigation/native useNavigation
//   - shadcn Card/Badge/Button/…        → @/components/ui/*
//   - sonner `toast`                    → @/components/ui/toast (react-native-toast-message)
//   - CoachMatchCard (web)              → CoachMatchCard (already ported)
//
// Behavior preserved verbatim:
//   * useAthleteMatches for the query
//   * useRefreshAthleteMatches for the "generate matches" refresh
//   * search + priority + division + athletic fit filters, plus sort
//   * compact vs full variant, showFilters gate
//   * "View All" navigates to the Matches screen when showing compact list
//     and there are more matches than maxItems.
//
// Notes:
//   - `variant="full"` renders a scrollable content column, useful when the
//     component is embedded inside a screen that is *not* already scrolling.
//     The athlete dashboard embeds it inside a page-level ScrollView so we
//     don't wrap in another ScrollView by default. The filter row is a
//     horizontal FlatList to keep the RN layout usable at phone widths.
//   - `View All` navigates to the athlete "Matches" tab. Web uses
//     `navigate('/matches')` which is the athlete matches screen; the RN
//     tab is `AthleteTabs` → `MatchesTab`.

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Sparkles,
  Search,
  ChevronRight,
  RefreshCw,
  Target,
} from 'lucide-react-native';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import {
  useAthleteMatches,
  useDismissAthleteMatch,
  type AthleteCoachMatch,
} from '@/hooks/useAthleteMatches';
import { useRefreshAthleteMatches } from '@/hooks/useRefreshAthleteMatches';
import { colors, typography, spacing, radius } from '@/lib/theme';

// Cheap relative-time formatter — avoids pulling in date-fns just for this.
function formatRelative(iso?: string | null): string {
  if (!iso) return 'recently';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'recently';
  const diff = Date.now() - then;
  if (diff < 60_000) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export interface MatchSuggestionFeedProps {
  variant?: 'compact' | 'full';
  maxItems?: number;
  showFilters?: boolean;
}

export function MatchSuggestionFeed({
  variant = 'compact',
  maxItems = 5,
  showFilters = false,
}: MatchSuggestionFeedProps) {
  const navigation = useNavigation<any>();
  const { data: matches, isLoading, refetch } = useAthleteMatches();
  const dismissMatch = useDismissAthleteMatch();
  const { refreshMatches, isRefreshing } = useRefreshAthleteMatches();

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [athleticFitFilter, setAthleticFitFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');

  const handleRefreshMatches = async () => {
    const result = await refreshMatches({ force: true });
    if (result.success && result.matchesCreated > 0) {
      toast.success(
        `Updated ${result.matchesCreated} coach matches`,
        `${result.priorities?.high || 0} high priority matches found`,
      );
      refetch();
    } else if (result.success) {
      toast.info('Matches are up to date');
      refetch();
    } else if (result.error) {
      toast.error('Failed to refresh matches', result.error);
    }
  };

  const filteredMatches = useMemo(() => {
    const list = (matches || []).filter((match: AthleteCoachMatch) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        match.coach?.name?.toLowerCase().includes(q) ||
        match.coach?.school?.toLowerCase().includes(q) ||
        match.coach?.conference?.toLowerCase().includes(q);
      const matchesPriority =
        priorityFilter === 'all' || match.priority === priorityFilter;
      const matchesDivision =
        divisionFilter === 'all' || match.coach?.division === divisionFilter;
      const athleticScore = match.athletic_fit_score || 0;
      const matchesAthleticFit =
        athleticFitFilter === 'all' ||
        (athleticFitFilter === 'high' && athleticScore >= 70) ||
        (athleticFitFilter === 'medium' &&
          athleticScore >= 50 &&
          athleticScore < 70) ||
        (athleticFitFilter === 'low' && athleticScore < 50);
      return (
        matchesSearch && matchesPriority && matchesDivision && matchesAthleticFit
      );
    });
    list.sort((a, b) => {
      switch (sortBy) {
        case 'athletic':
          return (b.athletic_fit_score || 0) - (a.athletic_fit_score || 0);
        case 'program':
          return (b.program_fit_score || 0) - (a.program_fit_score || 0);
        case 'geographic':
          return (b.geographic_fit_score || 0) - (a.geographic_fit_score || 0);
        default:
          return b.match_score - a.match_score;
      }
    });
    return list;
  }, [matches, searchQuery, priorityFilter, divisionFilter, athleticFitFilter, sortBy]);

  const displayMatches =
    variant === 'compact' ? filteredMatches.slice(0, maxItems) : filteredMatches;

  const uniqueDivisions = useMemo(
    () =>
      Array.from(
        new Set((matches || []).map((m) => m.coach?.division).filter(Boolean)),
      ) as string[],
    [matches],
  );

  // ─── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardContent style={s.centeredPad}>
          <View style={s.loadingRow}>
            <ActivityIndicator color={colors.mutedForeground} />
            <Text style={s.loadingText}>Loading matches...</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  // ─── Empty ──────────────────────────────────────────────────
  if (!matches || matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <View style={s.titleRow}>
            <Sparkles size={20} color={colors.primary} />
            <CardTitle>Coach Matches</CardTitle>
          </View>
          <CardDescription>
            Personalized coach recommendations based on your profile
          </CardDescription>
        </CardHeader>
        <CardContent style={s.emptyContent}>
          <Target size={48} color={colors.mutedForeground} style={s.emptyIcon} />
          <Text style={s.emptyTitle}>No matches available yet</Text>
          <Text style={s.emptyBody}>
            Complete your profile to get personalized coach recommendations
          </Text>
          <Button
            variant="outline"
            size="sm"
            onPress={handleRefreshMatches}
            disabled={isRefreshing}
            loading={isRefreshing}
            leftIcon={
              isRefreshing ? null : (
                <RefreshCw size={14} color={colors.foreground} />
              )
            }
          >
            Generate Matches
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Populated ──────────────────────────────────────────────
  const lastRefreshed = formatRelative(matches[0]?.last_refreshed_at);

  const goToAllMatches = () => {
    // Athlete "Matches" tab lives under AthleteTabs.
    // Fall back to global navigate if not present in the current tab stack.
    try {
      navigation.navigate('AthleteTabs', { screen: 'MatchesTab' });
    } catch {
      navigation.navigate('MatchesTab' as never);
    }
  };

  return (
    <Card style={variant === 'full' ? s.fullCard : undefined}>
      <CardHeader style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={s.titleRow}>
              <Sparkles size={20} color={colors.primary} />
              <CardTitle>Coach Matches</CardTitle>
            </View>
            <View style={s.refreshRow}>
              <Text style={s.updatedText}>Updated {lastRefreshed}</Text>
              <Pressable
                onPress={handleRefreshMatches}
                disabled={isRefreshing}
                accessibilityRole="button"
                accessibilityLabel="Refresh coach matches"
                style={s.refreshBtn}
                hitSlop={6}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                ) : (
                  <RefreshCw size={14} color={colors.mutedForeground} />
                )}
              </Pressable>
            </View>
          </View>
          {variant === 'compact' && filteredMatches.length > maxItems && (
            <Pressable
              onPress={goToAllMatches}
              style={s.viewAllBtn}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text style={s.viewAllText}>View All</Text>
              <ChevronRight size={16} color={colors.foreground} />
            </Pressable>
          )}
        </View>
      </CardHeader>

      <CardContent style={s.body}>
        {showFilters && (
          <View style={s.filterCol}>
            <View style={s.searchWrap}>
              <Search
                size={14}
                color={colors.mutedForeground}
                style={s.searchIcon}
              />
              <Input
                placeholder="Search coaches or schools..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                containerStyle={s.searchInputContainer}
                style={s.searchInput}
              />
            </View>
            <View style={s.filterRow}>
              <View style={s.filterCell}>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </View>
              <View style={s.filterCell}>
                <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {uniqueDivisions.map((div) => (
                      <SelectItem key={div} value={div}>
                        {div}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
              <View style={s.filterCell}>
                <Select
                  value={athleticFitFilter}
                  onValueChange={setAthleticFitFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Athletic Fit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Athletic Fit</SelectItem>
                    <SelectItem value="high">High (70%+)</SelectItem>
                    <SelectItem value="medium">Medium (50-70%)</SelectItem>
                    <SelectItem value="low">Low (&lt;50%)</SelectItem>
                  </SelectContent>
                </Select>
              </View>
              <View style={s.filterCell}>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Sort: Match</SelectItem>
                    <SelectItem value="athletic">Sort: Athletic</SelectItem>
                    <SelectItem value="program">Sort: Program</SelectItem>
                    <SelectItem value="geographic">Sort: Geographic</SelectItem>
                  </SelectContent>
                </Select>
              </View>
            </View>
          </View>
        )}

        <View style={s.cardList}>
          {displayMatches.map((match) => (
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
        </View>

        {variant === 'full' && (
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <Text style={[s.statBig, { color: colors.success }]}>
                {matches.filter((m) => m.priority === 'high').length}
              </Text>
              <Text style={s.statLabel}>High Priority</Text>
            </View>
            <View style={s.statCell}>
              <Text style={[s.statBig, { color: colors.warning }]}>
                {matches.filter((m) => m.priority === 'medium').length}
              </Text>
              <Text style={s.statLabel}>Medium Priority</Text>
            </View>
            <View style={s.statCell}>
              <Text style={[s.statBig, { color: colors.info }]}>
                {matches.filter((m) => m.priority === 'low').length}
              </Text>
              <Text style={s.statLabel}>Low Priority</Text>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

export default MatchSuggestionFeed;

const s = StyleSheet.create({
  fullCard: { flex: 1 },
  centeredPad: { paddingVertical: spacing.xl, alignItems: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
  },

  header: { paddingBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  updatedText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },
  refreshBtn: {
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  viewAllText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },

  body: { gap: spacing.md },
  filterCol: { gap: spacing.sm },
  searchWrap: { position: 'relative' },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm,
    top: 15, // vertically centers within Input's minHeight
    zIndex: 1,
  },
  searchInputContainer: { flex: 1 },
  searchInput: { paddingLeft: spacing.xl },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterCell: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  cardList: { gap: spacing.sm },

  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: { opacity: 0.5, marginBottom: spacing.sm },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.base,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statBig: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },
});
