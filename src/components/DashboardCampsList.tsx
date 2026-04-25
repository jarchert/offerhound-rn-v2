// Parity port from Lovable src/components/DashboardCampsList.tsx (verbatim logic).
// Web→RN mapping: shadcn Card/Badge/Button/Input/Select/Tabs → src/components/ui/*;
// lucide-react → lucide-react-native; Tailwind → StyleSheet @/lib/theme;
// downloadICSFile (web blob) → addCampToDeviceCalendar (expo-calendar);
// <a href target="_blank"> → Linking.openURL; sonner toast → toast wrapper.
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { CalendarDays, MapPin, ExternalLink, Search, Bookmark, BookmarkCheck } from 'lucide-react-native';
import { format } from 'date-fns';
import {
  addCampToDeviceCalendar,
  getGoogleCalendarUrl,
  type CollegeCamp,
} from '@/hooks/useCollegeCamps';
import { toast } from '@/components/ui/toast';
import { colors, typography, spacing } from '@/lib/theme';

const STATE_NEIGHBORS: Record<string, string[]> = {
  AL: ['FL','GA','MS','TN'], AK: [], AZ: ['CA','CO','NM','NV','UT'], AR: ['LA','MO','MS','OK','TN','TX'],
  CA: ['AZ','NV','OR'], CO: ['AZ','KS','NE','NM','OK','UT','WY'], CT: ['MA','NY','RI'],
  DE: ['MD','NJ','PA'], FL: ['AL','GA'], GA: ['AL','FL','NC','SC','TN'],
  HI: [], ID: ['MT','NV','OR','UT','WA','WY'], IL: ['IA','IN','KY','MO','WI'],
  IN: ['IL','KY','MI','OH'], IA: ['IL','MN','MO','NE','SD','WI'], KS: ['CO','MO','NE','OK'],
  KY: ['IL','IN','MO','OH','TN','VA','WV'], LA: ['AR','MS','TX'], ME: ['NH'],
  MD: ['DE','PA','VA','WV'], MA: ['CT','NH','NY','RI','VT'], MI: ['IN','OH','WI'],
  MN: ['IA','ND','SD','WI'], MS: ['AL','AR','LA','TN'], MO: ['AR','IA','IL','KS','KY','NE','OK','TN'],
  MT: ['ID','ND','SD','WY'], NE: ['CO','IA','KS','MO','SD','WY'], NV: ['AZ','CA','ID','OR','UT'],
  NH: ['MA','ME','VT'], NJ: ['DE','NY','PA'], NM: ['AZ','CO','OK','TX','UT'],
  NY: ['CT','MA','NJ','PA','VT'], NC: ['GA','SC','TN','VA'], ND: ['MN','MT','SD'],
  OH: ['IN','KY','MI','PA','WV'], OK: ['AR','CO','KS','MO','NM','TX'], OR: ['CA','ID','NV','WA'],
  PA: ['DE','MD','NJ','NY','OH','WV'], RI: ['CT','MA'], SC: ['GA','NC'],
  SD: ['IA','MN','MT','ND','NE','WY'], TN: ['AL','AR','GA','KY','MO','MS','NC','VA'],
  TX: ['AR','LA','NM','OK'], UT: ['AZ','CO','ID','NM','NV','WY'], VT: ['MA','NH','NY'],
  VA: ['KY','MD','NC','TN','WV'], WA: ['ID','OR'], WV: ['KY','MD','OH','PA','VA'],
  WI: ['IA','IL','MI','MN'], WY: ['CO','ID','MT','NE','SD','UT'],
};

const STATE_ABBR_TO_FULL: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',
  DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',
  MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
  TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',
  WI:'Wisconsin',WY:'Wyoming',
};

const STATE_FULL_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBR_TO_FULL).map(([k, v]) => [v.toLowerCase(), k])
);

function normalizeState(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return STATE_FULL_TO_ABBR[trimmed.toLowerCase()] || trimmed.toUpperCase().slice(0, 2);
}

function getProximityScore(campState: string | null, userState: string | null): number {
  if (!userState || !campState) return 3;
  const u = normalizeState(userState);
  const c = normalizeState(campState);
  if (!u || !c) return 3;
  if (c === u) return 0;
  if (STATE_NEIGHBORS[u]?.includes(c)) return 1;
  for (const n of STATE_NEIGHBORS[u] || []) {
    if (STATE_NEIGHBORS[n]?.includes(c)) return 2;
  }
  return 3;
}

const PROXIMITY_LABELS: Record<number, string> = {
  0: 'Your State',
  1: 'Neighboring',
  2: 'Nearby',
  3: 'Other',
};

// RN: map proximity score to Badge variant (closest equivalents to Tailwind colors).
const PROXIMITY_VARIANTS: Record<number, 'success' | 'default' | 'warning' | 'secondary'> = {
  0: 'success',
  1: 'default',
  2: 'warning',
  3: 'secondary',
};

export function DashboardCampsList() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile();
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [campTab, setCampTab] = useState('all');

  const userState = (profile as any)?.state || (profile as any)?.home_state || null;
  const userSport = (profile as any)?.sport || null;

  const { data: allCamps = [], isLoading } = useQuery({
    queryKey: ['dashboard-camps', userSport],
    queryFn: async () => {
      let query = supabase
        .from('college_camps')
        .select('*')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true })
        .limit(500);
      if (userSport) {
        query = query.ilike('sport', userSport);
      }
      const { data } = await query;
      return (data || []) as CollegeCamp[];
    },
  });

  const { data: savedCampIds = [] } = useQuery({
    queryKey: ['saved-camp-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('saved_camps' as any)
        .select('camp_id')
        .eq('user_id', user.id);
      return (data || []).map((r: any) => r.camp_id);
    },
    enabled: !!user,
  });

  const savedSet = useMemo(() => new Set(savedCampIds), [savedCampIds]);

  const sports = useMemo(() => {
    const s = new Set(allCamps.map((c) => c.sport).filter(Boolean));
    return Array.from(s).sort();
  }, [allCamps]);

  const divisions = useMemo(() => {
    const d = new Set(allCamps.map((c: any) => c.division).filter(Boolean));
    return Array.from(d).sort();
  }, [allCamps]);

  const filtered = useMemo(() => {
    let camps = allCamps;
    if (campTab === 'saved') {
      camps = camps.filter((c) => savedSet.has(c.id));
    }
    if (sportFilter !== 'all') camps = camps.filter((c) => c.sport === sportFilter);
    if (divisionFilter !== 'all') camps = camps.filter((c: any) => c.division === divisionFilter);
    if (search) {
      const q = search.toLowerCase();
      camps = camps.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.school.toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q) ||
          (c.state || '').toLowerCase().includes(q)
      );
    }
    return [...camps].sort((a, b) => {
      const sa = getProximityScore(a.state, userState);
      const sb = getProximityScore(b.state, userState);
      if (sa !== sb) return sa - sb;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });
  }, [allCamps, campTab, sportFilter, divisionFilter, search, userState, savedSet]);

  const saveCampIfNeeded = async (campId: string) => {
    if (!user || savedSet.has(campId)) return;
    try {
      await supabase.from('saved_camps' as any).insert({ user_id: user.id, camp_id: campId } as any);
    } catch {}
  };

  const handleSaveCamp = async (campId: string) => {
    if (!user) {
      toast.error('Sign in to save camps');
      return;
    }
    try {
      if (savedSet.has(campId)) {
        await supabase.from('saved_camps' as any).delete().eq('user_id', user.id).eq('camp_id', campId);
        toast.success('Camp removed from saved list');
      } else {
        await supabase.from('saved_camps' as any).insert({ user_id: user.id, camp_id: campId } as any);
        toast.success('Camp saved!');
      }
    } catch {
      toast.error('Failed to update saved camps');
    }
  };

  const handleAddToDeviceCalendar = async (camp: CollegeCamp) => {
    const id = await addCampToDeviceCalendar(camp);
    if (id) {
      saveCampIfNeeded(camp.id);
      toast.success('Camp added to My Camps & device calendar');
    } else {
      toast.error('Could not add to calendar (permission denied)');
    }
  };

  const handleGoogleCalendar = (camp: CollegeCamp) => {
    saveCampIfNeeded(camp.id);
    Linking.openURL(getGoogleCalendarUrl(camp));
    toast.success('Camp added to My Camps');
  };

  return (
    <View style={styles.root}>
      <Tabs value={campTab} onValueChange={setCampTab}>
        <TabsList style={styles.tabsList}>
          <TabsTrigger value="all">All Camps</TabsTrigger>
          <TabsTrigger value="saved">My Camps</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card style={styles.filterCard}>
        <View style={styles.filterRow}>
          <View style={styles.searchWrap}>
            <View style={styles.searchIcon}>
              <Search size={16} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder="Search camps, schools, locations..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              containerStyle={{ flex: 1 }}
            />
          </View>
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {sports.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
      </Card>

      {userState && (
        <View style={styles.proximityRow}>
          <MapPin size={12} color={colors.mutedForeground} />
          <Text style={styles.proximityText}> Sorted by proximity to {userState}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <Card style={styles.emptyCard}>
          <CardContent style={styles.emptyContent}>
            <CalendarDays size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              {campTab === 'saved'
                ? 'No saved camps yet. Browse All Camps to save some!'
                : 'No upcoming camps found matching your filters.'}
            </Text>
          </CardContent>
        </Card>
      ) : (
        <View style={styles.cardsGrid}>
          {filtered.map((camp) => {
            const proximity = getProximityScore(camp.state, userState);
            const isSaved = savedSet.has(camp.id);
            return (
              <Card key={camp.id} style={styles.campCard}>
                <CardContent style={styles.campContent}>
                  <View style={styles.headerRow}>
                    <View style={styles.headerText}>
                      <Text style={styles.campName} numberOfLines={1}>{camp.name}</Text>
                      <Text style={styles.campSchool}>{camp.school}</Text>
                    </View>
                    <View style={styles.headerActions}>
                      {userState && (
                        <Badge variant={PROXIMITY_VARIANTS[proximity]} style={styles.proximityBadge}>
                          {PROXIMITY_LABELS[proximity]}
                        </Badge>
                      )}
                      <Pressable
                        onPress={() => handleSaveCamp(camp.id)}
                        style={styles.bookmarkBtn}
                        hitSlop={8}
                      >
                        {isSaved ? (
                          <BookmarkCheck size={16} color={colors.primary} />
                        ) : (
                          <Bookmark size={16} color={colors.mutedForeground} />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <CalendarDays size={12} color={colors.mutedForeground} />
                      <Text style={styles.metaText}>
                        {format(new Date(camp.start_date), 'MMM d, yyyy')}
                        {camp.end_date && ` – ${format(new Date(camp.end_date), 'MMM d')}`}
                      </Text>
                    </View>
                    {(camp.city || camp.state) && (
                      <View style={styles.metaItem}>
                        <MapPin size={12} color={colors.mutedForeground} />
                        <Text style={styles.metaText}>
                          {[camp.city, camp.state].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.tagsRow}>
                    <Badge variant="outline">{camp.sport}</Badge>
                    {(camp as any).division && (
                      <Badge variant="secondary">{(camp as any).division}</Badge>
                    )}
                  </View>

                  <View style={styles.actionsRow}>
                    {camp.registration_url ? (
                      <Button
                        variant="default"
                        size="sm"
                        style={styles.registerBtn}
                        leftIcon={<ExternalLink size={12} color={colors.primaryForeground} />}
                        onPress={() => Linking.openURL(camp.registration_url!)}
                      >
                        Register / Details
                      </Button>
                    ) : (
                      <Text style={styles.noLinkText}>No registration link available</Text>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => handleAddToDeviceCalendar(camp)}
                    >
                      📅 Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => handleGoogleCalendar(camp)}
                    >
                      📆 Google
                    </Button>
                  </View>
                </CardContent>
              </Card>
            );
          })}
        </View>
      )}

      <Text style={styles.footerText}>
        Showing {filtered.length} upcoming camp{filtered.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  tabsList: { maxWidth: 300 },
  filterCard: { padding: spacing.md, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
  filterRow: { gap: spacing.sm },
  searchWrap: { position: 'relative', flex: 1 },
  searchIcon: { position: 'absolute', left: spacing.md, top: '50%', marginTop: -8, zIndex: 1 },
  searchInput: { paddingLeft: spacing.xl + spacing.md },
  proximityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  proximityText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  loadingWrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyCard: { borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border },
  emptyContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
  cardsGrid: { gap: spacing.sm },
  campCard: { borderColor: colors.border, borderWidth: 1 },
  campContent: { padding: spacing.md, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  headerText: { flex: 1, minWidth: 0 },
  campName: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  campSchool: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  proximityBadge: {},
  bookmarkBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  registerBtn: { flex: 1, backgroundColor: '#059669' },
  noLinkText: { flex: 1, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontStyle: 'italic' },
  footerText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center' },
});
