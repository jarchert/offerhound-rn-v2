// Ported verbatim from Lovable web: src/components/club/ClubCoachDirectoryTab.tsx
// Translations applied:
//   <div>/<p>/<h3>/<span> → <View>/<Text>
//   Tailwind classes → StyleSheet using @/lib/theme tokens
//   @/components/ui/*  (lowercase) → PascalCase imports
//   lucide-react → lucide-react-native
//   react-router useNavigate → @react-navigation/native useNavigation
//   <Input onChange(e)> → <Input onChangeText>
//   Tabs/Select/Card/Button/Input use project RN wrappers
//   Data logic (queries, filters, sort, save toggle) unchanged
import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Bookmark,
  GraduationCap,
  Telescope,
} from 'lucide-react-native';
import {
  useSavedCoaches,
  useSaveCoach,
  useRemoveSavedCoach,
} from '@/hooks/useSavedCoaches';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { compareByFullNamePresence } from '@/lib/utils/nameSorting';
import { extractSports, sportsOverlap } from '@/lib/utils/sportMatching';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { colors, spacing, typography } from '@/lib/theme';

interface Props {
  /** The Club Coach's club profile (used for sport filtering) */
  clubProfile: { sport?: string | null; state?: string | null } | null | undefined;
}

/**
 * Discover tab for Club Coaches: search & save college / HS coaches AND scouts.
 * Reuses the same CoachMatchCard styling and save UX as the athlete-side
 * DashboardCoachDirectory so club coaches get a consistent recruiter-focused
 * experience.
 */
export function ClubCoachDirectoryTab({ clubProfile }: Props) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { data: coachProfile } = useCoachProfile();
  const [activeTab, setActiveTab] = useState<'coaches' | 'scouts'>('coaches');
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: savedCoaches = [] } = useSavedCoaches();
  const saveMutation = useSaveCoach();
  const removeMutation = useRemoveSavedCoach();
  const savedCoachIds = useMemo(
    () => new Set(savedCoaches.map((s: any) => s.coach_id)),
    [savedCoaches],
  );

  // Restrict results to the club coach's sport(s).
  const viewerSports = useMemo(
    () => extractSports(clubProfile ?? coachProfile ?? null),
    [clubProfile, coachProfile],
  );

  // ---------- Coaches query (college + HS) ----------
  const { data: allCoaches = [], isLoading: coachesLoading } = useQuery({
    queryKey: ['club-coach-discover-coaches'],
    queryFn: async () => {
      const results: any[] = [];
      const { data: college } = await supabase
        .from('coaches')
        .select(
          'id, name, title, school, sport, division, conference, image_url, state, position_coached, email',
        )
        .limit(500);
      if (college) results.push(...college);

      const { data: hs } = await supabase
        .from('high_school_coach_profiles')
        .select('*')
        .eq('is_published', true)
        .limit(200);
      if (hs) {
        results.push(
          ...hs.map((h: any) => ({
            ...h,
            school: h.school_name,
            division: 'High School',
            conference: h.conference_name || h.school_district || 'High School',
            state: h.school_state,
            _isHSCoach: true,
          })),
        );
      }
      return results;
    },
  });

  const divisions = useMemo(() => {
    const d = new Set(
      allCoaches.map((c: any) => c.division).filter(Boolean) as string[],
    );
    return Array.from(d).sort();
  }, [allCoaches]);

  const sortedCoaches = useMemo(() => {
    let coaches = allCoaches.filter((c: any) => sportsOverlap(viewerSports, c));
    if (divisionFilter !== 'all')
      coaches = coaches.filter((c: any) => c.division === divisionFilter);
    if (search) {
      const q = search.toLowerCase();
      coaches = coaches.filter(
        (c: any) =>
          c.name?.toLowerCase().includes(q) ||
          c.school?.toLowerCase().includes(q) ||
          c.position_coached?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q),
      );
    }
    coaches.sort((a: any, b: any) => {
      const namePresence = compareByFullNamePresence(a, b, (x: any) => x.name);
      if (namePresence !== 0) return namePresence;
      return (a.school || '').localeCompare(b.school || '');
    });
    return coaches;
  }, [allCoaches, divisionFilter, search, viewerSports]);

  // ---------- Scouts query ----------
  const { data: allScouts = [], isLoading: scoutsLoading } = useQuery({
    queryKey: ['club-coach-discover-scouts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('scout_profiles' as any)
        .select('*')
        .eq('is_verified', true)
        .order('name')
        .limit(200);
      return data || [];
    },
  });

  const sortedScouts = useMemo(() => {
    let scouts = (allScouts as any[]).filter((s: any) =>
      sportsOverlap(viewerSports, s),
    );
    if (search) {
      const q = search.toLowerCase();
      scouts = scouts.filter(
        (s: any) =>
          s.name?.toLowerCase().includes(q) ||
          s.company?.toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q) ||
          s.specialization?.toLowerCase().includes(q),
      );
    }
    scouts.sort((a: any, b: any) => {
      const namePresence = compareByFullNamePresence(a, b, (x: any) => x.name);
      if (namePresence !== 0) return namePresence;
      return (a.name || '').localeCompare(b.name || '');
    });
    return scouts;
  }, [allScouts, search, viewerSports]);

  const toggleSave = (coachId: string) => {
    if (savedCoachIds.has(coachId)) removeMutation.mutate(coachId);
    else saveMutation.mutate({ coachId });
  };

  return (
    <View style={styles.container}>
      {/* Header row with Saved button */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Discover Coaches & Scouts</Text>
          <Text style={styles.headerSubtitle}>
            Find recruiters and college coaches for your athletes
            {clubProfile?.sport ? ` in ${clubProfile.sport}` : ''}.
          </Text>
        </View>
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

      {/* Search + filters */}
      <Card style={styles.filterCard}>
        <View style={styles.filterCardInner}>
          <View style={styles.searchRow}>
            <View style={styles.searchWrapper}>
              <View style={styles.searchIcon}>
                <Search size={16} color={colors.mutedForeground} />
              </View>
              <Input
                placeholder={
                  activeTab === 'coaches'
                    ? 'Search coaches, schools, positions...'
                    : 'Search scouts, organizations, specialties...'
                }
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
            </View>
            {activeTab === 'coaches' && (
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
            )}
          </View>

          {activeTab === 'coaches' && showFilters && (
            <View style={styles.filterGrid}>
              <View style={styles.filterCell}>
                <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
            </View>
          )}
        </View>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'coaches' | 'scouts')}
      >
        <TabsList>
          <TabsTrigger value="coaches">
            <View style={styles.tabTriggerInline}>
              <GraduationCap size={16} color={colors.foreground} />
              <Text style={styles.tabTriggerText}> Coaches</Text>
            </View>
          </TabsTrigger>
          <TabsTrigger value="scouts">
            <View style={styles.tabTriggerInline}>
              <Telescope size={16} color={colors.foreground} />
              <Text style={styles.tabTriggerText}> Scouts</Text>
            </View>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coaches">
          {coachesLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : sortedCoaches.length === 0 ? (
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
            <>
              <View style={styles.list}>
                {sortedCoaches.slice(0, 50).map((coach: any) => {
                  const isSaved = savedCoachIds.has(coach.id);
                  const isHS =
                    !!coach._isHSCoach || coach.division === 'High School';
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
                      scores={null}
                      isSaved={isSaved}
                      onToggleSave={isHS ? undefined : toggleSave}
                      viewerRole="club-coach"
                      coachAudience={isHS ? 'hs-coach' : 'college-coach'}
                    />
                  );
                })}
              </View>
              <Text style={styles.footerText}>
                Showing {Math.min(sortedCoaches.length, 50)} of{' '}
                {sortedCoaches.length} coach
                {sortedCoaches.length !== 1 ? 'es' : ''}
              </Text>
            </>
          )}
        </TabsContent>

        <TabsContent value="scouts">
          {scoutsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : sortedScouts.length === 0 ? (
            <Card style={styles.emptyCard}>
              <CardContent>
                <View style={styles.emptyInner}>
                  <Telescope size={40} color={colors.mutedForeground} />
                  <Text style={styles.emptyText}>
                    No verified scouts match your filters.
                  </Text>
                </View>
              </CardContent>
            </Card>
          ) : (
            <>
              <View style={styles.list}>
                {sortedScouts.slice(0, 50).map((scout: any) => (
                  <Pressable
                    key={scout.id}
                    onPress={() =>
                      navigation.navigate('ScoutDetail', { scoutId: scout.id })
                    }
                    style={styles.scoutPressable}
                  >
                    <CoachMatchCard
                      variant="compact"
                      coach={{
                        id: scout.id,
                        name: scout.name,
                        title: scout.title || 'Scout',
                        school:
                          scout.company || scout.specialization || 'Multi-sport',
                        email: scout.email,
                        image_url: scout.profile_image_url,
                      }}
                      proximityLabel={scout.is_verified ? 'Verified' : null}
                      viewerRole="club-coach"
                    />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.footerText}>
                Showing {Math.min(sortedScouts.length, 50)} of{' '}
                {sortedScouts.length} scout
                {sortedScouts.length !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TabsContent>
      </Tabs>
    </View>
  );
}

export default ClubCoachDirectoryTab;

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  headerTextWrap: { flexShrink: 1 },
  headerTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnText: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
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
  tabTriggerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabTriggerText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
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
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  list: { gap: spacing.sm },
  scoutPressable: { borderRadius: 8 },
  footerText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
