// Ported verbatim from Lovable web: src/components/DashboardCoachDirectory.tsx
// Translations applied:
//   <div>/<p>/<span> → <View>/<Text>
//   Tailwind classes → StyleSheet using @/lib/theme tokens
//   @/components/ui/*  (lowercase) → PascalCase imports
//   lucide-react → lucide-react-native
//   react-router useNavigate → @react-navigation/native useNavigation
//   <Input onChange(e)> → <Input onChangeText>
//   UI primitives (Card/Select/Input/Button) use project RN wrappers
//   Data logic (STATE_NEIGHBORS, proximity, filters, sort, AI matches) unchanged
import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Search,
  MapPin,
  Sparkles,
  Filter,
  ChevronDown,
  ChevronUp,
  Bookmark,
  GraduationCap,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import {
  useSavedCoaches,
  useSaveCoach,
  useRemoveSavedCoach,
} from '@/hooks/useSavedCoaches';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { compareByFullNamePresence } from '@/lib/utils/nameSorting';
import { extractSports, sportsOverlap } from '@/lib/utils/sportMatching';
import { colors, spacing, radius, typography } from '@/lib/theme';

const STATE_NEIGHBORS: Record<string, string[]> = {
  AL:["FL","GA","MS","TN"],AK:[],AZ:["CA","CO","NM","NV","UT"],AR:["LA","MO","MS","OK","TN","TX"],
  CA:["AZ","NV","OR"],CO:["AZ","KS","NE","NM","OK","UT","WY"],CT:["MA","NY","RI"],
  DE:["MD","NJ","PA"],FL:["AL","GA"],GA:["AL","FL","NC","SC","TN"],
  HI:[],ID:["MT","NV","OR","UT","WA","WY"],IL:["IA","IN","KY","MO","WI"],
  IN:["IL","KY","MI","OH"],IA:["IL","MN","MO","NE","SD","WI"],KS:["CO","MO","NE","OK"],
  KY:["IL","IN","MO","OH","TN","VA","WV"],LA:["AR","MS","TX"],ME:["NH"],
  MD:["DE","PA","VA","WV"],MA:["CT","NH","NY","RI","VT"],MI:["IN","OH","WI"],
  MN:["IA","ND","SD","WI"],MS:["AL","AR","LA","TN"],MO:["AR","IA","IL","KS","KY","NE","OK","TN"],
  MT:["ID","ND","SD","WY"],NE:["CO","IA","KS","MO","SD","WY"],NV:["AZ","CA","ID","OR","UT"],
  NH:["MA","ME","VT"],NJ:["DE","NY","PA"],NM:["AZ","CO","OK","TX","UT"],
  NY:["CT","MA","NJ","PA","VT"],NC:["GA","SC","TN","VA"],ND:["MN","MT","SD"],
  OH:["IN","KY","MI","PA","WV"],OK:["AR","CO","KS","MO","NM","TX"],OR:["CA","ID","NV","WA"],
  PA:["DE","MD","NJ","NY","OH","WV"],RI:["CT","MA"],SC:["GA","NC"],
  SD:["IA","MN","MT","ND","NE","WY"],TN:["AL","AR","GA","KY","MO","MS","NC","VA"],
  TX:["AR","LA","NM","OK"],UT:["AZ","CO","ID","NM","NV","WY"],VT:["MA","NH","NY"],
  VA:["KY","MD","NC","TN","WV"],WA:["ID","OR"],WV:["KY","MD","OH","PA","VA"],
  WI:["IA","IL","MI","MN"],WY:["CO","ID","MT","NE","SD","UT"],
};

function normalizeState(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return trimmed.toUpperCase().slice(0, 2);
}

function getProximityScore(coachState: string | null, userState: string | null): number {
  if (!userState || !coachState) return 3;
  const u = normalizeState(userState);
  const c = normalizeState(coachState);
  if (!u || !c) return 3;
  if (c === u) return 0;
  if (STATE_NEIGHBORS[u]?.includes(c)) return 1;
  for (const n of STATE_NEIGHBORS[u] || []) {
    if (STATE_NEIGHBORS[n]?.includes(c)) return 2;
  }
  return 3;
}

const PROXIMITY_LABELS: Record<number, string> = { 0: 'Your State', 1: 'Neighboring', 2: 'Nearby', 3: 'Other' };

const SIDE_OPTIONS = [
  { value: 'all', label: 'All Sides' },
  { value: 'offense', label: 'Offense' },
  { value: 'defense', label: 'Defense' },
];

export function DashboardCoachDirectory() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [distanceFilter, setDistanceFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sideFilter, setSideFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: savedCoaches = [] } = useSavedCoaches();
  const saveMutation = useSaveCoach();
  const removeMutation = useRemoveSavedCoach();
  const savedCoachIds = useMemo(
    () => new Set(savedCoaches.map((s: any) => s.coach_id)),
    [savedCoaches],
  );

  const userState = profile?.state || profile?.home_state || null;

  const { data: aiMatches = [] } = useQuery({
    queryKey: ['athlete-coach-matches-dashboard', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from('athlete_coach_matches')
        .select('coach_id, match_score, match_reason')
        .eq('athlete_profile_id', profile.id)
        .eq('is_dismissed', false)
        .order('match_score', { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const aiMatchMap = useMemo(() => {
    const map = new Map<string, { score: number; reason: string | null }>();
    aiMatches.forEach((m: any) => map.set(m.coach_id, { score: m.match_score, reason: m.match_reason }));
    return map;
  }, [aiMatches]);

  const { data: allCoaches = [], isLoading } = useQuery({
    queryKey: ['dashboard-coach-directory'],
    queryFn: async () => {
      const { data } = await supabase
        .from('coaches')
        .select('id, name, title, school, sport, division, conference, image_url, state, position_coached, email')
        .limit(1000);
      return data || [];
    },
  });

  const divisions = useMemo(() => {
    const d = new Set(allCoaches.map((c: any) => c.division).filter(Boolean));
    return Array.from(d).sort();
  }, [allCoaches]);

  const positions = useMemo(() => {
    const p = new Set(allCoaches.map((c: any) => c.position_coached).filter(Boolean));
    return Array.from(p).sort();
  }, [allCoaches]);

  const OFFENSIVE_POSITIONS = ['qb','quarterback','rb','running back','wr','wide receiver','te','tight end','ol','offensive line','athlete','ath','offensive coordinator'];
  const DEFENSIVE_POSITIONS = ['cb','cornerback','safety','db','defensive back','lb','linebacker','dl','defensive line','de','dt','edge','defensive coordinator'];

  const isOffensiveCoach = (pos: string | null, title: string | null) => {
    const combined = `${pos || ''} ${title || ''}`.toLowerCase();
    return OFFENSIVE_POSITIONS.some((p) => combined.includes(p));
  };
  const isDefensiveCoach = (pos: string | null, title: string | null) => {
    const combined = `${pos || ''} ${title || ''}`.toLowerCase();
    return DEFENSIVE_POSITIONS.some((p) => combined.includes(p));
  };

  // Athletes should only see coaches in the sport(s) they registered for.
  const viewerSports = useMemo(() => extractSports(profile), [profile]);

  const sorted = useMemo(() => {
    let coaches = [...allCoaches] as any[];
    coaches = coaches.filter((c) => sportsOverlap(viewerSports, c));
    if (divisionFilter !== 'all') coaches = coaches.filter((c) => c.division === divisionFilter);
    if (positionFilter !== 'all') coaches = coaches.filter((c) => c.position_coached === positionFilter);
    if (sideFilter === 'offense') coaches = coaches.filter((c) => isOffensiveCoach(c.position_coached, c.title));
    if (sideFilter === 'defense') coaches = coaches.filter((c) => isDefensiveCoach(c.position_coached, c.title));
    if (distanceFilter !== 'all') {
      const maxScore = distanceFilter === 'local' ? 0 : distanceFilter === 'regional' ? 1 : 2;
      coaches = coaches.filter((c) => getProximityScore(c.state, userState) <= maxScore);
    }
    if (search) {
      const q = search.toLowerCase();
      coaches = coaches.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.school?.toLowerCase().includes(q) ||
          c.position_coached?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q),
      );
    }
    coaches.sort((a, b) => {
      // Push coaches without a populated first+last name to the bottom
      const namePresence = compareByFullNamePresence(a, b, (x: any) => x.name);
      if (namePresence !== 0) return namePresence;
      const aMatch = aiMatchMap.get(a.id);
      const bMatch = aiMatchMap.get(b.id);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      if (aMatch && bMatch) return bMatch.score - aMatch.score;
      const proxA = getProximityScore(a.state, userState);
      const proxB = getProximityScore(b.state, userState);
      if (proxA !== proxB) return proxA - proxB;
      return (a.school || '').localeCompare(b.school || '');
    });
    return coaches;
  }, [allCoaches, divisionFilter, positionFilter, sideFilter, distanceFilter, search, userState, aiMatchMap, viewerSports]);

  const toggleSave = (coachId: string) => {
    if (savedCoachIds.has(coachId)) {
      removeMutation.mutate(coachId);
    } else {
      saveMutation.mutate({ coachId });
    }
  };

  return (
    <View style={styles.container}>
      {aiMatches.length > 0 && (
        <View style={styles.aiBanner}>
          <Sparkles size={16} color={colors.primary} />
          <Text style={styles.aiBannerText}>
            {aiMatches.length} AI-recommended coaches shown first
          </Text>
        </View>
      )}

      <View style={styles.topRow}>
        <View />
        {user && (
          <Button
            variant="outline"
            size="sm"
            onPress={() => navigation.navigate('SavedCoaches')}
          >
            <View style={styles.rowInline}>
              <Bookmark size={16} color={colors.foreground} />
              <Text style={styles.btnText}>Saved ({savedCoaches.length})</Text>
            </View>
          </Button>
        )}
      </View>

      <Card style={styles.filterCard}>
        <View style={styles.filterCardInner}>
          <View style={styles.searchRow}>
            <View style={styles.searchWrapper}>
              <View style={styles.searchIcon}>
                <Search size={16} color={colors.mutedForeground} />
              </View>
              <Input
                placeholder="Search coaches, schools, positions..."
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowFilters(!showFilters)}
            >
              <View style={styles.rowInline}>
                <Filter size={16} color={colors.foreground} />
                <Text style={styles.btnText}>Filters</Text>
                {showFilters ? (
                  <ChevronUp size={12} color={colors.foreground} />
                ) : (
                  <ChevronDown size={12} color={colors.foreground} />
                )}
              </View>
            </Button>
          </View>

          {showFilters && (
            <View style={styles.filterGrid}>
              <View style={styles.filterCell}>
                <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d as string} value={d as string}>
                        {d as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
              <View style={styles.filterCell}>
                <Select value={distanceFilter} onValueChange={setDistanceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Distance</SelectItem>
                    <SelectItem value="local">My State</SelectItem>
                    <SelectItem value="regional">Neighboring</SelectItem>
                    <SelectItem value="nearby">Nearby (2-hop)</SelectItem>
                  </SelectContent>
                </Select>
              </View>
              <View style={styles.filterCell}>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p as string} value={p as string}>
                        {p as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
              <View style={styles.filterCell}>
                <Select value={sideFilter} onValueChange={setSideFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Side" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIDE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
            </View>
          )}
        </View>
      </Card>

      {userState && (
        <View style={styles.proximityNote}>
          <MapPin size={12} color={colors.mutedForeground} />
          <Text style={styles.proximityNoteText}>
            {' '}Sorted by AI recommendations, then proximity to {userState}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : sorted.length === 0 ? (
        <Card style={styles.emptyCard}>
          <CardContent>
            <View style={styles.emptyInner}>
              <GraduationCap size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>
                No coaches match your current filters.
              </Text>
            </View>
          </CardContent>
        </Card>
      ) : (
        <View style={styles.list}>
          {sorted.slice(0, 50).map((coach: any) => {
            const proximity = getProximityScore(coach.state, userState);
            const aiMatch = aiMatchMap.get(coach.id);
            const isSaved = savedCoachIds.has(coach.id);
            return (
              <CoachMatchCard
                key={coach.id}
                variant="compact"
                coach={{
                  id: coach.id,
                  name: coach.name,
                  title: coach.title,
                  school: coach.school,
                  division: coach.division,
                  conference: coach.conference,
                  position_coached: coach.position_coached,
                  email: coach.email,
                  image_url: coach.image_url,
                }}
                scores={
                  aiMatch
                    ? {
                        match_score: aiMatch.score,
                        match_reason: aiMatch.reason,
                      }
                    : null
                }
                proximityLabel={userState ? PROXIMITY_LABELS[proximity] : null}
                isSaved={isSaved}
                onToggleSave={toggleSave}
              />
            );
          })}
        </View>
      )}

      <Text style={styles.footerText}>
        Showing {Math.min(sorted.length, 50)} of {sorted.length} coach
        {sorted.length !== 1 ? 'es' : ''}
      </Text>
    </View>
  );
}

export default DashboardCoachDirectory;

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiBannerText: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnText: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
  },
  filterCard: {
    padding: spacing.md,
    borderColor: colors.border,
  },
  filterCardInner: { gap: spacing.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchWrapper: { flex: 1, position: 'relative', justifyContent: 'center' },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  searchInput: { paddingLeft: 34 },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterCell: { flexBasis: '48%', flexGrow: 1, minWidth: 140 },
  proximityNote: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proximityNoteText: {
    color: colors.mutedForeground,
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.body,
  },
  loadingWrap: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyCard: {
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  emptyInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
  list: { gap: spacing.sm },
  footerText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    textAlign: 'center',
  },
});
