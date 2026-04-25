// AthleteSearchScreen — RN port of Lovable web AthleteSearch page.
// Source: offerhound-repo/src/pages/AthleteSearch.tsx (248 LOC)
//
// Adaptations (web → RN):
//   - <div>/<h1>/<p>/<span>          → <View>/<Text>
//   - className utility classes      → StyleSheet
//   - lucide-react                   → lucide-react-native
//   - Input/Select/Button            → @/components/ui/* RN primitives
//   - useNavigate + useSearchParams  → useNavigation + useRoute (params object)
//   - sonner toasts                  → showToast helper from @/lib/toast (best-effort)
//   - AthleteMatchCard               → existing RN port (compact variant)
//
// PORT-PENDING gaps (kept as no-op stubs so this screen compiles + ships):
//   - LetterButton (recruiter inline letter CTA)        → omitted (letterSlot undefined)
//   - useLetterCenter()                                  → omitted (handleSendLetter no-ops)
//   - useScoutProfile / useCoachProfile / useHSCoachProfile sport sorting →
//     viewerSports filter is bypassed when those hooks are not wired in RN
//     (we only consume useScoutProfile + useScoutSavedAthletes today;
//     other recruiter detection falls back to "athlete viewer" mode).
//   - Messages route navigation       → uses RootStackParamList "Messages" with no params
//
// Verbatim filter logic preserved: position aliases, doesPositionMatch,
// proximity sort via stateProximityScore, name-presence sort, fromNeed
// "Showing prospects for your position need" banner.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
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

export default function AthleteSearchScreen() {
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
  const { data: savedAthletes = [] } = useScoutSavedAthletes();
  const saveAthleteMutation = useScoutSaveAthlete();

  // PORT-PENDING: useCoachProfile / useHSCoachProfile not consumed yet in RN
  // recruiter detection. Treat the viewer as a scout-only recruiter for now.
  const isScout = !!scoutProfile;
  const isRecruiter = isScout;

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

  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ['athlete-search', search, position, gradYear],
    queryFn: async () => {
      let q = supabase
        .from('player_profiles')
        .select(
          'id, full_name, position, school, graduation_year, city, state, profile_image_url, custom_url, sport',
        )
        .order('full_name')
        .limit(100);
      if (search) q = q.ilike('full_name', `%${search}%`);
      if (position !== 'all') q = q.eq('position', position);
      if (gradYear !== 'all') q = q.eq('graduation_year', gradYear);
      const { data } = await q;
      return data || [];
    },
  });

  // Resolve viewer's home state for proximity sorting (scout state in RN today;
  // HS-coach + college-coach inputs land in a future port wave).
  const viewerState = useMemo<string | null>(
    () => ((scoutProfile as any)?.state ?? null),
    [scoutProfile],
  );

  const sortedAthletes = useMemo(() => {
    const filtered = athletes; // PORT-PENDING: viewerSports overlap filter
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
        onSuccess: () => showToast('success', 'Athlete saved to favorites!'),
        onError: () => showToast('error', 'Failed to save athlete'),
      },
    );
  };

  // PORT-PENDING: useLetterCenter() — handleSendLetter is a no-op stub.
  // Once useLetterCenter ships in RN, route to the LetterComposer with
  // { surface: 'athlete-search', athlete } seed.

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Text style={s.title}>Athlete Search</Text>
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
                  onToggleSave={isScout ? handleSaveAthlete : undefined}
                  // PORT-PENDING: letterSlot for shared <LetterButton /> once ported.
                  onMessage={
                    isRecruiter
                      ? () => nav.navigate('Messages' as any)
                      : undefined
                  }
                />
              );
            })}
          </View>
        )}

        <Text style={s.footerCount}>{sortedAthletes.length} athletes found</Text>
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
