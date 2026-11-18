// Native recruiter search: owner-scoped actions and server filtering over the safe listing.
import {useCoachProfile} from '@/hooks/useCoachProfile';
import {useHSCoachProfile} from '@/hooks/useHSCoachProfile';
import {recruiterSportTerms,recruiterSportFilter,literalSearchText} from '@/lib/recruiterSportFilter';
import {useLetterCenter} from '@/hooks/useLetterCenter';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { Search, Target, X } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useScoutSavedAthletes, useScoutSaveAthlete } from '@/hooks/useScoutSavedAthletes';
import { compareByFullNamePresence } from '@/lib/utils/nameSorting';
import { stateProximityScore, proximityLabel as proxLabelFn } from '@/lib/utils/stateProximity';
import { AthleteMatchCard } from '@/components/athlete/AthleteMatchCard';
import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

// PORT-PENDING: react-native-toast-message wrapper. Falls back to console.
function showToast(level: 'success' | 'info' | 'error', msg: string) {
  // eslint-disable-next-line no-console
  console.log(`[toast:${level}]`, msg);
}

// ── Position aliasing (verbatim from Lovable AthleteSearch.tsx) ──────────────
const POSITION_ALIASES: Record<string, string[]> = {
  QB: ['quarterback', 'qb'],
  RB: ['running back', 'rb', 'halfback', 'hb', 'tailback'],
  WR: ['wide receiver', 'wr', 'wideout'],
  TE: ['tight end', 'te'],
  OL: ['offensive line', 'ol', 'offensive lineman', 'center', 'guard', 'tackle', 'ot', 'og', 'oc'],
  DL: ['defensive line', 'dl', 'defensive lineman', 'defensive end', 'de', 'defensive tackle', 'dt', 'nose tackle', 'nt'],
  LB: ['linebacker', 'lb', 'inside linebacker', 'ilb', 'outside linebacker', 'olb', 'middle linebacker', 'mlb'],
  CB: ['cornerback', 'cb', 'corner'],
  S: ['safety', 's', 'free safety', 'fs', 'strong safety', 'ss'],
  K: ['kicker', 'k', 'placekicker'],
  P: ['punter', 'p'],
  ATH: ['athlete', 'ath', 'utility'],
};

function normalizePosition(pos: string): string {
  const lower = pos.toLowerCase().trim();
  for (const [abbr, aliases] of Object.entries(POSITION_ALIASES)) {
    if (lower === abbr.toLowerCase() || aliases.some(a => lower.includes(a) || a.includes(lower))) {
      return abbr;
    }
  }
  return pos.toUpperCase().trim();
}

function doesPositionMatch(athletePosition: string | null, needPosition: string): boolean {
  if (!athletePosition) return false;
  return normalizePosition(athletePosition) === normalizePosition(needPosition);
}

type AthleteSearchRouteParams = {
  fromNeed?: boolean;
  position?: string;
  gradYear?: string;
  needPriority?: string;
};

type PublicAthleteSearchRow = {
  id: string; full_name: string | null; position: string | null; school: string | null;
  graduation_year: number | null; city: string | null; state: string | null;
  profile_image_url: string | null; custom_url: string | null; sport: string | null;
};

export default function AthleteSearchScreen() {
  const { user, userRole } = useAuth();
  const {goToLetterForAthlete}=useLetterCenter();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const params = (route.params || {}) as AthleteSearchRouteParams;
  const fromNeed = !!params.fromNeed;
  const needPosition = params.position || '';
  const needGradYear = params.gradYear || '';
  const needPriority = params.needPriority || '';

  const [search, setSearch] = useState('');
  const [position, setPosition] = useState(
    fromNeed && needPosition ? normalizePosition(needPosition) : 'all',
  );
  const [gradYear, setGradYear] = useState(fromNeed && needGradYear ? needGradYear : 'all');

  const { data: scoutProfile } = useScoutProfile();
  const { data: coachProfile } = useCoachProfile();
  const { data: hsCoachProfile } = useHSCoachProfile();
  const viewerSports = recruiterSportTerms(coachProfile,hsCoachProfile,scoutProfile);
  const { data: savedAthletes = [] } = useScoutSavedAthletes();
  const saveAthleteMutation = useScoutSaveAthlete();

  const isRecruiter = ['coach','scout','high_school_coach','club_coach','agency','admin'].includes(userRole||'');

  const savedAthleteIds = useMemo(
    () => new Set(savedAthletes.map((s: any) => s.athlete_profile_id)),
    [savedAthletes],
  );

  const clearNeedFilter = () => {
    // RN equivalent of setSearchParams({}) — drop nav params and reset state.
    nav.setParams?.({} as any);
    setPosition('all');
    setGradYear('all');
  };

  const athletePages = useInfiniteQuery({
    queryKey: ['athlete-search', user?.id, search, position, gradYear, viewerSports],
    enabled: !!user && isRecruiter,
    initialPageParam: 0,
    queryFn: async ({pageParam}) => {
      let q = supabase
        .from('player_profiles_recruiter_safe' as any)
        .select(
          'id, full_name, position, school, graduation_year, city, state, profile_image_url, custom_url, sport',
        )
        .order('is_example_profile',{ascending:false}).order('full_name').order('id')
        .range(pageParam*100,pageParam*100+99);
      if (search) q = q.ilike('full_name', `%${literalSearchText(search)}%`);
      if (viewerSports.length) q = q.or(recruiterSportFilter(viewerSports));
      if (position !== 'all') q = q.eq('position', position);
      if (gradYear !== 'all') q = q.eq('graduation_year', gradYear);
      const { data, error } = await q.returns<PublicAthleteSearchRow[]>();
      if (error) throw error;
      return data || [];
    },
    getNextPageParam: (lastPage, pages) => lastPage.length===100 ? pages.length : undefined,
  });
  const athletes=athletePages.data?.pages.flat()||[];
  const {isLoading,isError:searchFailed,refetch:retrySearch}=athletePages;

  // Use the viewer's own role profile for proximity sorting.
  const viewerState = useMemo<string | null>(
    () => ((hsCoachProfile as any)?.state ?? (coachProfile as any)?.state ?? (scoutProfile as any)?.state ?? null),
    [hsCoachProfile,coachProfile,scoutProfile],
  );

  const sortedAthletes = useMemo(() => {
    const filtered = athletes; // All filters are applied before server pagination.
    return [...filtered].sort((a, b) => {
      if (fromNeed && needPosition) {
        const aMatch = doesPositionMatch(a.position, needPosition);
        const bMatch = doesPositionMatch(b.position, needPosition);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      if (viewerState) {
        const dA = stateProximityScore(viewerState, a.state);
        const dB = stateProximityScore(viewerState, b.state);
        if (dA !== dB) return dA - dB;
      }
      const namePresence = compareByFullNamePresence(a, b, (x: any) => x.full_name);
      if (namePresence !== 0) return namePresence;
      return 0;
    });
  }, [athletes, fromNeed, needPosition, viewerState]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const handleSaveAthlete = (athleteId: string) => {
    if (savedAthleteIds.has(athleteId)) {
      showToast('info', 'Already saved!');
      return;
    }
    saveAthleteMutation.mutate(
      { athleteProfileId: athleteId },
      {
        onSuccess: (result:any) => showToast(result?.alreadySaved?'info':'success',result?.alreadySaved?'Already saved!':'Athlete saved to favorites!'),
        onError: () => showToast('error', 'Failed to save athlete'),
      },
    );
  };

  // Route to the shared LetterComposer root screen with the athlete
  // pre-filled. LetterComposer accepts a `seed` with `prefillAthleteId` +
  // `prefillAthleteName` so the recipient is primed on mount.
  const handleSendLetter = (athlete: any) => goToLetterForAthlete(athlete);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Text style={s.title}>Athlete Search</Text>
        {!isRecruiter&&<Text accessibilityRole="alert" style={s.subtitle}>Athlete discovery is available to recruiting accounts.</Text>}
        <Text style={s.subtitle}>
          Find athletes by name, position, or graduation year.
          {viewerState ? ` Sorted nearest to ${viewerState} first.` : ''}
        </Text>

        {fromNeed && needPosition ? (
          <View style={s.needBanner}>
            <Target size={16} color={colors.primary} />
            <Text style={s.needBannerText}>
              Showing prospects for your position need: <Text style={s.needBannerStrong}>{needPosition}</Text>
              {needGradYear ? ` · Class of ${needGradYear}` : ''}
              {needPriority ? ` · ${needPriority} priority` : ''}
            </Text>
            <Pressable onPress={clearNeedFilter} hitSlop={8} style={s.needClose}>
              <X size={14} color={colors.foreground} />
            </Pressable>
          </View>
        ) : null}

        <View style={s.filtersRow}>
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
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P', 'ATH'].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={s.selectCell}>
              <Select value={gradYear} onValueChange={setGradYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Grad Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{String(y)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
          </View>
        </View>

        {isLoading ? (
          <Text style={s.statusText}>Searching athletes...</Text>
        ) : searchFailed ? (
          <View>
            <Text accessibilityRole="alert" style={s.statusText}>Athlete search could not be loaded. Check your connection and retry.</Text>
            <Button onPress={() => void retrySearch()}>Retry athlete search</Button>
          </View>
        ) : sortedAthletes.length === 0 ? (
          <Text style={s.statusText}>No athletes found matching your criteria.</Text>
        ) : (
          <View style={s.resultsCol}>
            {sortedAthletes.map((athlete: any) => {
              const isNeedMatch =
                fromNeed && needPosition && doesPositionMatch(athlete.position, needPosition);
              const isSaved = savedAthleteIds.has(athlete.id);
              const proxLabel = isNeedMatch
                ? `Matches ${needPosition} need`
                : proxLabelFn(viewerState, athlete.state);
              return (
                <AthleteMatchCard
                  key={athlete.id}
                  athlete={athlete}
                  variant="compact"
                  isSaved={isSaved}
                  proximityLabel={proxLabel}
                  onToggleSave={isRecruiter ? handleSaveAthlete : undefined}
                  // PORT-PENDING: letterSlot for shared <LetterButton /> once ported.
                  onMessage={
                    isRecruiter
                      ? () => nav.navigate('DirectMessageDraft', {athleteProfileId:athlete.id})
                      : undefined
                  }
                  onContact={isRecruiter ? () => handleSendLetter(athlete) : undefined}
                />
              );
            })}
          </View>
        )}

        <Text style={s.footerCount}>{sortedAthletes.length} athletes loaded</Text>
        {athletePages.hasNextPage?<Button disabled={athletePages.isFetchingNextPage} onPress={()=>void athletePages.fetchNextPage()}>{athletePages.isFetchingNextPage?'Loading more athletes…':'Load more athletes'}</Button>:null}
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  needBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(231,175,8,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(231,175,8,0.2)',
    marginBottom: spacing.sm,
  },
  needBannerText: {
    flex: 1,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  needBannerStrong: { fontFamily: typography.fontFamily.bodyBold, color: colors.primary },
  needClose: { padding: 4, borderRadius: 4 },
  filtersRow: { gap: spacing.sm, marginBottom: spacing.sm },
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
  statusText: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  resultsCol: { gap: spacing.sm },
  footerCount: {
    textAlign: 'center',
    marginTop: spacing.md,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
});
