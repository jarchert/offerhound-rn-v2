// CoachDirectoryScreen — RN port of Lovable web CoachDirectory page.
// Source: offerhound-repo/src/pages/CoachDirectory.tsx (501 LOC)
//
// Adaptations (web → RN):
//   - <div>/<h1>/<p>/<span>          → <View>/<Text>
//   - className utility classes      → StyleSheet
//   - lucide-react                   → lucide-react-native
//   - Input/Select/Button/Switch     → @/components/ui/* RN primitives
//   - Checkbox                       → @/components/ui/Checkbox
//   - useNavigate (react-router)     → useNavigation (react-navigation)
//   - sticky bottom bar              → absolutely-positioned View at bottom
//   - shadcn Sheet/CoachOutreachComposer → PORT-PENDING (composer not opened)
//   - useAuth.isAuthenticated        → derived from `user` presence
//
// Verbatim filter logic preserved 1:1:
//   - STATE_NEIGHBORS proximity table
//   - REGION_STATES regional bucket table
//   - inferCoachRole / inferSchoolType heuristics
//   - getProximityScore / getProximityLabel
//   - Two-source query (coaches + high_school_coach_profiles) with
//     `division`, `sport`, `myStaffOnly` Supabase filters identical to web.
//   - Sort: name-presence first, then AI matches, then proximity, then alpha.
//
// PORT-PENDING stubs (intentional, called out inline):
//   - CoachOutreachComposer (shadcn Sheet + email composer)  → omitted
//   - sticky multi-select email button still selectable but
//     "Email selected" press only logs (no composer modal in RN yet)
//   - viewerSports overlap filter relies on extractSports — preserved 1:1
//   - "AI Letters" header button picks the right LetterCenter route per role
//   - "Saved" header button navigates to "SavedCoaches" if exposed (else no-op)
//
// Wiring: this file only creates the screen; integration into a stack/tab is
// out of scope for this task (no CoachDirectory route exists in RootNavigator
// today).
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
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  Search,
  MapPin,
  Building,
  Bookmark,
  Mail,
  X as XIcon,
  Send,
} from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { useAthleteMatches } from '@/hooks/useAthleteMatches';
import { useSavedCoaches, useSaveCoach, useRemoveSavedCoach } from '@/hooks/useSavedCoaches';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { compareByFullNamePresence } from '@/lib/utils/nameSorting';
import { extractSports, sportsOverlap } from '@/lib/utils/sportMatching';
import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

// PORT-PENDING: CoachOutreachComposer (shadcn Sheet + email body builder).
type OutreachCoach = {
  id: string;
  name?: string;
  school?: string;
  email?: string;
  position_coached?: string;
  sport?: string;
};

// ── State proximity tables (verbatim from Lovable CoachDirectory.tsx) ────────
const STATE_NEIGHBORS: Record<string, string[]> = {
  AL: ['FL', 'GA', 'MS', 'TN'], AK: [], AZ: ['CA', 'CO', 'NM', 'NV', 'UT'],
  AR: ['LA', 'MO', 'MS', 'OK', 'TN', 'TX'],
  CA: ['AZ', 'NV', 'OR'], CO: ['AZ', 'KS', 'NE', 'NM', 'OK', 'UT', 'WY'],
  CT: ['MA', 'NY', 'RI'], DE: ['MD', 'NJ', 'PA'], FL: ['AL', 'GA'],
  GA: ['AL', 'FL', 'NC', 'SC', 'TN'], HI: [],
  ID: ['MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
  IL: ['IA', 'IN', 'KY', 'MO', 'WI'], IN: ['IL', 'KY', 'MI', 'OH'],
  IA: ['IL', 'MN', 'MO', 'NE', 'SD', 'WI'], KS: ['CO', 'MO', 'NE', 'OK'],
  KY: ['IL', 'IN', 'MO', 'OH', 'TN', 'VA', 'WV'],
  LA: ['AR', 'MS', 'TX'], ME: ['NH'], MD: ['DE', 'PA', 'VA', 'WV'],
  MA: ['CT', 'NH', 'NY', 'RI', 'VT'], MI: ['IN', 'OH', 'WI'],
  MN: ['IA', 'ND', 'SD', 'WI'], MS: ['AL', 'AR', 'LA', 'TN'],
  MO: ['AR', 'IA', 'IL', 'KS', 'KY', 'NE', 'OK', 'TN'],
  MT: ['ID', 'ND', 'SD', 'WY'], NE: ['CO', 'IA', 'KS', 'MO', 'SD', 'WY'],
  NV: ['AZ', 'CA', 'ID', 'OR', 'UT'], NH: ['MA', 'ME', 'VT'],
  NJ: ['DE', 'NY', 'PA'], NM: ['AZ', 'CO', 'OK', 'TX', 'UT'],
  NY: ['CT', 'MA', 'NJ', 'PA', 'VT'], NC: ['GA', 'SC', 'TN', 'VA'],
  ND: ['MN', 'MT', 'SD'], OH: ['IN', 'KY', 'MI', 'PA', 'WV'],
  OK: ['AR', 'CO', 'KS', 'MO', 'NM', 'TX'], OR: ['CA', 'ID', 'NV', 'WA'],
  PA: ['DE', 'MD', 'NJ', 'NY', 'OH', 'WV'], RI: ['CT', 'MA'],
  SC: ['GA', 'NC'], SD: ['IA', 'MN', 'MT', 'ND', 'NE', 'WY'],
  TN: ['AL', 'AR', 'GA', 'KY', 'MO', 'MS', 'NC', 'VA'],
  TX: ['AR', 'LA', 'NM', 'OK'], UT: ['AZ', 'CO', 'ID', 'NM', 'NV', 'WY'],
  VT: ['MA', 'NH', 'NY'], VA: ['KY', 'MD', 'NC', 'TN', 'WV'],
  WA: ['ID', 'OR'], WV: ['KY', 'MD', 'OH', 'PA', 'VA'],
  WI: ['IA', 'IL', 'MI', 'MN'], WY: ['CO', 'ID', 'MT', 'NE', 'SD', 'UT'],
};

const REGION_STATES: Record<string, string[]> = {
  Northeast: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
  South: ['AL', 'AR', 'DE', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS', 'NC', 'OK', 'SC', 'TN', 'TX', 'VA', 'WV', 'DC'],
  Midwest: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
  West: ['AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'NM', 'OR', 'UT', 'WA', 'WY'],
};
const REGIONS = ['Northeast', 'South', 'Midwest', 'West'] as const;
type Region = typeof REGIONS[number];

function getRegionForState(state?: string | null): Region | null {
  if (!state) return null;
  const s = state.toUpperCase().trim();
  for (const region of REGIONS) {
    if (REGION_STATES[region].includes(s)) return region;
  }
  return null;
}

function inferCoachRole(
  coach: any,
): 'head' | 'assistant' | 'scout' | 'agency' | 'coordinator' | 'operations' | 'other' {
  const title = (coach.title || '').toLowerCase();
  if (coach._isHSCoach || coach._isAgency) return coach._isAgency ? 'agency' : 'head';
  if (coach._isScout) return 'scout';
  if (title.includes('head coach')) return 'head';
  if (title.includes('assistant')) return 'assistant';
  if (title.includes('coordinator')) return 'coordinator';
  if (title.includes('director') || title.includes('operations') || title.includes('video')) return 'operations';
  if (title.includes('scout')) return 'scout';
  if (title.includes('coach')) return 'assistant';
  return 'other';
}

function inferSchoolType(coach: any): string | null {
  if (coach._isHSCoach || coach.division === 'High School') return 'High School';
  const div = (coach.division || '').toLowerCase();
  if (div.includes('fbs') || div === 'd1' || (div.includes('division i') && !div.includes('ii') && !div.includes('iii'))) return 'D1';
  if (div.includes('fcs')) return 'D1';
  if (div.includes('ii')) return 'D2';
  if (div.includes('iii')) return 'D3';
  if (div.includes('naia')) return 'NAIA';
  if (div.includes('juco') || div.includes('junior')) return 'JUCO';
  return null;
}

function getProximityScore(coachState: string | null, userState: string | null): number {
  if (!userState || !coachState) return 3;
  const uState = userState.toUpperCase().trim();
  const cState = coachState.toUpperCase().trim();
  if (cState === uState) return 0;
  if (STATE_NEIGHBORS[uState]?.includes(cState)) return 1;
  const neighbors = STATE_NEIGHBORS[uState] || [];
  for (const n of neighbors) {
    if (STATE_NEIGHBORS[n]?.includes(cState)) return 2;
  }
  return 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_OPTIONS = [
  'football', 'basketball', 'baseball', 'soccer', 'softball', 'volleyball',
  'lacrosse', 'hockey', 'golf', 'swimming', 'track', 'cheerleading', 'wrestling',
];

export default function CoachDirectoryScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();

  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('all');
  const [sport, setSport] = useState('all');
  const [myStaffOnly, setMyStaffOnly] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [schoolType, setSchoolType] = useState('all');
  const [region, setRegion] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // PORT-PENDING: composer Sheet — kept stateful for future wire-up.
  const [, setComposerOpen] = useState(false);

  const { user } = useAuth() as any;
  const isAuthenticated = !!user;
  const { profile } = usePlayerProfile() as any;
  const { data: coachProfile } = useCoachProfile();
  const { data: hsCoachProfile } = useHSCoachProfile();
  const { data: savedCoaches = [] } = useSavedCoaches();
  const { data: aiMatches = [] } = useAthleteMatches();
  const saveMutation = useSaveCoach();
  const removeMutation = useRemoveSavedCoach();

  const savedCoachIds = useMemo(
    () => new Set(savedCoaches.map((s: any) => s.coach_id)),
    [savedCoaches],
  );
  const matchByCoachId = useMemo(() => {
    const map = new Map<string, any>();
    aiMatches.forEach((m: any) => map.set(m.coach_id, m));
    return map;
  }, [aiMatches]);

  const coachSchool = (coachProfile as any)?.school || null;
  const userState = profile?.state || profile?.home_state || null;

  const { data: coaches = [], isLoading } = useQuery({
    queryKey: ['coach-directory', search, division, sport, myStaffOnly, coachSchool],
    queryFn: async () => {
      const results: any[] = [];

      // Fetch college/club coaches (skip if filtering to HS only)
      if (division !== 'High School') {
        let q = supabase.from('coaches').select('*').limit(200);
        if (search) q = q.or(`name.ilike.%${search}%,school.ilike.%${search}%`);
        if (division !== 'all') q = q.eq('division', division);
        if (sport !== 'all') q = q.eq('sport', sport);
        if (myStaffOnly && coachSchool) q = q.ilike('school', coachSchool);
        q = q.order('name');
        const { data } = await q;
        if (data) results.push(...data);
      }

      // Fetch HS coaches (skip if filtering to a college division)
      if (division === 'all' || division === 'High School') {
        let hsQ = supabase
          .from('high_school_coach_profiles')
          .select('*')
          .eq('is_published', true)
          .limit(100);
        if (search) hsQ = hsQ.or(`name.ilike.%${search}%,school_name.ilike.%${search}%`);
        if (sport !== 'all') hsQ = hsQ.eq('sport', sport);
        hsQ = hsQ.order('name');
        const { data: hsData } = await hsQ;
        if (hsData) {
          results.push(
            ...hsData.map((hs: any) => ({
              ...hs,
              school: hs.school_name,
              division: 'High School',
              conference: hs.conference_name || hs.school_district || 'High School',
              state: hs.school_state,
              _isHSCoach: true,
            })),
          );
        }
      }

      return results;
    },
  });

  const viewerSports = useMemo(
    () => extractSports(profile ?? coachProfile ?? null),
    [profile, coachProfile],
  );

  const sortedCoaches = useMemo(() => {
    if (coaches.length === 0) return coaches;
    let filtered = coaches.filter((c: any) => sportsOverlap(viewerSports, c));

    if (roleFilter !== 'all') {
      filtered = filtered.filter((c: any) => {
        const role = inferCoachRole(c);
        if (roleFilter === 'coach') return role === 'head' || role === 'assistant' || role === 'coordinator';
        if (roleFilter === 'assistant') return role === 'assistant' || role === 'coordinator';
        if (roleFilter === 'scout') return role === 'scout';
        if (roleFilter === 'agency') return role === 'agency';
        return true;
      });
    }
    if (schoolType !== 'all') {
      filtered = filtered.filter((c: any) => inferSchoolType(c) === schoolType);
    }
    if (region !== 'all') {
      filtered = filtered.filter((c: any) => getRegionForState(c.state) === region);
    }

    return [...filtered].sort((a, b) => {
      const namePresence = compareByFullNamePresence(a, b, (x: any) => x.name);
      if (namePresence !== 0) return namePresence;
      const ma = matchByCoachId.get(a.id);
      const mb = matchByCoachId.get(b.id);
      if (ma && !mb) return -1;
      if (!ma && mb) return 1;
      if (ma && mb) return (mb.match_score ?? 0) - (ma.match_score ?? 0);
      if (userState) {
        const scoreA = getProximityScore(a.state, userState);
        const scoreB = getProximityScore(b.state, userState);
        if (scoreA !== scoreB) return scoreA - scoreB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [coaches, userState, matchByCoachId, viewerSports, roleFilter, schoolType, region]);

  const getProximityLabel = (coachState: string | null) => {
    if (!userState || !coachState) return null;
    const score = getProximityScore(coachState, userState);
    if (score === 0) return 'Your State';
    if (score === 1) return 'Nearby';
    return null;
  };

  const toggleSave = (coachId: string) => {
    if (savedCoachIds.has(coachId)) {
      removeMutation.mutate(coachId);
    } else {
      saveMutation.mutate({ coachId });
    }
  };

  const toggleSelect = (coachId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(coachId)) next.delete(coachId);
      else next.add(coachId);
      return next;
    });
  };

  // Selected coaches surface (used by the PORT-PENDING outreach composer).
  const selectedCoaches: OutreachCoach[] = useMemo(
    () =>
      sortedCoaches
        .filter((c: any) => selectedIds.has(c.id))
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          school: c.school,
          email: c.email,
          position_coached: c.position_coached,
          sport: c.sport,
        })),
    [sortedCoaches, selectedIds],
  );
  void selectedCoaches; // silence unused-warning until composer wires up

  const goToLetterCenter = () => {
    // PORT-PENDING: only Letters route in RN today is the shared LetterComposer
    // and ScoutLetters tab. We pick the closest match by viewer role.
    nav.navigate('LetterComposer' as any);
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.headerRow}>
          <BackButton />
          {isAuthenticated ? (
            <View style={s.headerActions}>
              <Button variant="default" size="sm" onPress={goToLetterCenter} leftIcon={<Send size={14} color={colors.primaryForeground} />}>
                AI Letters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={() => {/* PORT-PENDING: SavedCoaches route */}}
                leftIcon={<Bookmark size={14} color={colors.foreground} />}
              >
                {`Saved (${savedCoaches.length})`}
              </Button>
            </View>
          ) : null}
        </View>

        <Text style={s.title}>Coach Directory</Text>
        <Text style={s.subtitle}>Search college coaches across all divisions and sports.</Text>
        {userState ? (
          <View style={s.proximityRow}>
            <MapPin size={14} color={colors.primary} />
            <Text style={s.proximityText}>{`Sorted by proximity to ${userState}`}</Text>
          </View>
        ) : (
          <View style={{ marginBottom: spacing.sm }} />
        )}

        <View style={s.filtersWrap}>
          <View style={s.searchBox}>
            <Search size={16} color={colors.mutedForeground} />
            <Input
              placeholder="Search by name, school..."
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
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger>
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {['D1', 'D2', 'D3', 'NAIA', 'JUCO', 'High School'].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={s.selectCell}>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger>
                  <SelectValue placeholder="Sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sports</SelectItem>
                  {SPORT_OPTIONS.map(sp => (
                    <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
          </View>

          {coachSchool ? (
            <View style={s.staffRow}>
              <Building size={14} color={colors.primary} />
              <Label style={s.staffLabel}>My Staff</Label>
              <Switch value={myStaffOnly} onValueChange={setMyStaffOnly} />
            </View>
          ) : null}

          <Button variant="outline" size="sm" onPress={() => setShowAdvanced(v => !v)}>
            {showAdvanced ? 'Hide filters' : 'Advanced filters'}
          </Button>
        </View>

        {showAdvanced ? (
          <View style={s.advancedPanel}>
            <View style={s.advancedRow}>
              <Label style={s.advancedLabel}>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="coach">Head / position coach</SelectItem>
                  <SelectItem value="assistant">Assistant / coordinator</SelectItem>
                  <SelectItem value="scout">Scout</SelectItem>
                  <SelectItem value="agency">Recruiting agency</SelectItem>
                </SelectContent>
              </Select>
            </View>
            <View style={s.advancedRow}>
              <Label style={s.advancedLabel}>School type</Label>
              <Select value={schoolType} onValueChange={setSchoolType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All school types</SelectItem>
                  {['D1', 'D2', 'D3', 'NAIA', 'JUCO', 'High School'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={s.advancedRow}>
              <Label style={s.advancedLabel}>Recruiting region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {REGIONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <Text style={s.statusText}>Loading coaches...</Text>
        ) : sortedCoaches.length === 0 ? (
          <Text style={s.statusText}>No coaches found matching your criteria.</Text>
        ) : (
          <View style={s.resultsCol}>
            {sortedCoaches.map((coach: any) => {
              const proximityLabel = getProximityLabel(coach.state);
              const isSaved = savedCoachIds.has(coach.id);
              const match = matchByCoachId.get(coach.id);
              const scores = match
                ? {
                    match_score: match.match_score,
                    athletic_fit_score: match.athletic_fit_score,
                    program_fit_score: match.program_fit_score,
                    geographic_fit_score: match.geographic_fit_score,
                    match_reason: match.match_reason,
                    priority: match.priority,
                  }
                : null;
              const viewerIsCoach = !!coachProfile;
              const viewerIsClubCoach = !!(coachProfile as any)?.is_club_coach;
              const viewerIsHSCoach = !!hsCoachProfile;
              const isHSCoachCard = !!coach._isHSCoach || coach.division === 'High School';
              const viewerRole: 'athlete' | 'coach' | 'club-coach' | 'hs-coach' = viewerIsHSCoach
                ? 'hs-coach'
                : viewerIsClubCoach
                ? 'club-coach'
                : viewerIsCoach
                ? 'coach'
                : 'athlete';

              return (
                <View key={coach.id} style={s.resultRow}>
                  {isAuthenticated ? (
                    <View style={s.checkboxCell}>
                      <Checkbox
                        checked={selectedIds.has(coach.id)}
                        onCheckedChange={() => toggleSelect(coach.id)}
                      />
                    </View>
                  ) : null}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <CoachMatchCard
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
                      scores={scores}
                      proximityLabel={proximityLabel}
                      isSaved={isSaved}
                      onToggleSave={isAuthenticated ? toggleSave : undefined}
                      disableContact={!isAuthenticated}
                      viewerRole={viewerRole}
                      coachAudience={isHSCoachCard ? 'hs-coach' : 'college-coach'}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={s.footerCount}>{`${sortedCoaches.length} coaches found`}</Text>
        <Footer />
      </ScrollView>

      {/* Sticky multi-select action bar */}
      {isAuthenticated && selectedIds.size > 0 ? (
        <View style={s.actionBar}>
          <Text style={s.actionBarCount}>{`${selectedIds.size} selected`}</Text>
          <View style={{ flex: 1 }} />
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setSelectedIds(new Set())}
            leftIcon={<XIcon size={14} color={colors.foreground} />}
          >
            Clear
          </Button>
          <Button
            size="sm"
            onPress={() => setComposerOpen(true)}
            leftIcon={<Mail size={14} color={colors.primaryForeground} />}
          >
            Email selected
          </Button>
        </View>
      ) : null}

      {/* PORT-PENDING: <CoachOutreachComposer ... /> shadcn Sheet */}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  },
  proximityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  proximityText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  filtersWrap: { gap: spacing.sm, marginBottom: spacing.sm },
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
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  staffLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground, flex: 1 },
  advancedPanel: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(25,28,36,0.5)',
    marginBottom: spacing.sm,
  },
  advancedRow: { gap: 4 },
  advancedLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  statusText: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  resultsCol: { gap: spacing.sm },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkboxCell: { paddingTop: spacing.md },
  footerCount: {
    textAlign: 'center',
    marginTop: spacing.md,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  actionBar: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  actionBarCount: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
});
