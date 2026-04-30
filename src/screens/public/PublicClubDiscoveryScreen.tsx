// Ported from Lovable web src/pages/PublicClubDiscovery.tsx (448 LOC).
// Web → RN translation:
//   - useNavigate / <Link to="/auth?redirect=..."> → useNavigation().navigate
//   - lucide-react → lucide-react-native
//   - <Card>/<Avatar>/<Tabs>/<Select>/<Input>/<Badge>/<Button> mapped to RN
//     @/components/ui equivalents.
//   - Tailwind classes → StyleSheet using @/lib/theme tokens.
//   - SEO is a no-op shim (RN has no <head>); kept for parity.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Users, Trophy, Lock, Sparkles } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Footer } from '@/components/Footer';
import SEO from '@/components/SEO';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { SPORTS_LIST } from '@/lib/data/sports';
import { colors, typography, spacing } from '@/lib/theme';

import { BackButton } from '@/components/BackButton';
interface ClubCoach {
  id: string;
  user_id: string;
  club_name: string;
  club_description: string | null;
  bio: string | null;
  sport: string;
  city: string | null;
  state: string | null;
  country: string | null;
  age_group: string | null;
  team_level: string | null;
  league_association: string | null;
  club_logo_url: string | null;
  banner_url: string | null;
  years_coaching: number | null;
  website: string | null;
  is_active: boolean | null;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  age_group: string | null;
  level: string | null;
  league: string | null;
  gender: string | null;
  graduation_year: number | null;
  logo_url: string | null;
  season: string | null;
  year: number | null;
  club_coach_id: string;
  is_active: boolean | null;
}

export default function PublicClubDiscoveryScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [tab, setTab] = useState<'clubs' | 'teams'>('clubs');
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  const { data: clubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['public-club-coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_coach_profiles')
        .select(
          'id, user_id, club_name, club_description, bio, sport, city, state, country, age_group, team_level, league_association, club_logo_url, banner_url, years_coaching, website, is_active',
        )
        .neq('is_active', false)
        .order('club_name', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ClubCoach[];
    },
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['public-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select(
          'id, name, description, sport, age_group, level, league, gender, graduation_year, logo_url, season, year, club_coach_id, is_active',
        )
        .neq('is_active', false)
        .order('name', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Team[];
    },
  });

  const clubsById = useMemo(() => {
    const m = new Map<string, ClubCoach>();
    clubs.forEach((c) => m.set(c.id, c));
    return m;
  }, [clubs]);

  const states = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach((c) => c.state && set.add(c.state));
    return Array.from(set).sort();
  }, [clubs]);

  const filteredClubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clubs.filter((c) => {
      if (sportFilter !== 'all' && c.sport !== sportFilter) return false;
      if (stateFilter !== 'all' && c.state !== stateFilter) return false;
      if (!q) return true;
      return (
        c.club_name?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q) ||
        c.club_description?.toLowerCase().includes(q) ||
        c.bio?.toLowerCase().includes(q) ||
        c.league_association?.toLowerCase().includes(q)
      );
    });
  }, [clubs, search, sportFilter, stateFilter]);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) => {
      const club = clubsById.get(t.club_coach_id);
      if (sportFilter !== 'all' && t.sport !== sportFilter) return false;
      if (stateFilter !== 'all' && club?.state !== stateFilter) return false;
      if (!q) return true;
      return (
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.league?.toLowerCase().includes(q) ||
        club?.club_name?.toLowerCase().includes(q) ||
        club?.city?.toLowerCase().includes(q)
      );
    });
  }, [teams, clubsById, search, sportFilter, stateFilter]);

  const goAuth = () =>
    nav.dispatch(
      CommonActions.navigate({ name: 'Auth' as any, params: { redirect: '/onboarding' } }),
    );

  return (
    <View style={s.container}>
      <SEO
        title="Find Club Coaches & Teams Near You | OfferHound™"
        description="Discover club coaches, travel teams, and youth sports programs. Search by sport, location, and age group. Free to browse — sign up to connect."
      />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          <Badge variant="secondary" style={s.heroBadge}>
            <Sparkles size={12} color={colors.primary} /> Open to athletes & families
          </Badge>
          <Text style={s.heroTitle}>Find Your Next Club & Team</Text>
          <Text style={s.heroDesc}>
            Browse club coaches and travel teams across every sport. See bios,
            locations, and program details — no account required.
          </Text>
        </View>

        {/* Search */}
        <Card style={s.searchCard}>
          <CardContent>
            <View style={s.searchWrap}>
              <Search size={16} color={colors.mutedForeground} style={s.searchIcon} />
              <Input
                placeholder="Search clubs, teams, cities, leagues…"
                value={search}
                onChangeText={setSearch}
                style={s.searchInput}
              />
            </View>
            <View style={s.selectsRow}>
              <View style={s.selectCol}>
                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sports" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sports</SelectItem>
                    {SPORTS_LIST.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
              <View style={s.selectCol}>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All states</SelectItem>
                    {states.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Results */}
        <View style={s.resultsSection}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'clubs' | 'teams')}>
            <TabsList>
              <TabsTrigger value="clubs">
                Club Coaches ({filteredClubs.length})
              </TabsTrigger>
              <TabsTrigger value="teams">Teams ({filteredTeams.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="clubs">
              {clubsLoading ? (
                <View style={s.loaderWrap}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : filteredClubs.length === 0 ? (
                <Card style={s.emptyCard}>
                  <CardContent>
                    <Text style={s.emptyText}>
                      No clubs match your search yet. Try removing filters.
                    </Text>
                  </CardContent>
                </Card>
              ) : (
                <View style={s.list}>
                  {filteredClubs.map((c) => (
                    <ClubCard key={c.id} club={c} onConnect={goAuth} />
                  ))}
                </View>
              )}
            </TabsContent>

            <TabsContent value="teams">
              {teamsLoading ? (
                <View style={s.loaderWrap}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : filteredTeams.length === 0 ? (
                <Card style={s.emptyCard}>
                  <CardContent>
                    <Text style={s.emptyText}>
                      No teams match your search yet. Try removing filters.
                    </Text>
                  </CardContent>
                </Card>
              ) : (
                <View style={s.list}>
                  {filteredTeams.map((t) => (
                    <TeamCard
                      key={t.id}
                      team={t}
                      club={clubsById.get(t.club_coach_id)}
                      onConnect={goAuth}
                    />
                  ))}
                </View>
              )}
            </TabsContent>
          </Tabs>

          {/* CTA */}
          {!isAuthenticated && (
            <Card style={s.ctaCard}>
              <CardContent style={s.ctaInner}>
                <Text style={s.ctaTitle}>Want to connect with these clubs?</Text>
                <Text style={s.ctaDesc}>
                  Sign up free as an athlete to message coaches, save favorite
                  programs, and build a recruiting profile that gets noticed.
                </Text>
                <View style={s.ctaButtons}>
                  <Button size="lg" onPress={goAuth}>
                    Get Started Free
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onPress={() =>
                      nav.dispatch(CommonActions.navigate({ name: 'Landing' as any }))
                    }>
                    Learn More
                  </Button>
                </View>
              </CardContent>
            </Card>
          )}
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
}

// ----------------- Sub-components -----------------

function ClubCard({ club, onConnect }: { club: ClubCoach; onConnect: () => void }) {
  const initials = (club.club_name || 'C')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const location = [club.city, club.state, club.country !== 'USA' ? club.country : null]
    .filter(Boolean)
    .join(', ');

  return (
    <Card style={s.cardItem}>
      <CardContent>
        <View style={s.cardRow}>
          <Avatar
            source={club.club_logo_url ? { uri: club.club_logo_url } : null}
            fallback={initials}
            size={56}
          />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={s.cardHeaderRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {club.club_name}
                </Text>
                {!!location && (
                  <View style={s.locRow}>
                    <MapPin size={12} color={colors.mutedForeground} />
                    <Text style={s.locText}>{location}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={s.badgeRow}>
              <Badge variant="secondary">{club.sport}</Badge>
              {club.team_level && <Badge variant="outline">{club.team_level}</Badge>}
              {club.age_group && <Badge variant="outline">{club.age_group}</Badge>}
            </View>
            {(club.club_description || club.bio) && (
              <Text style={s.desc} numberOfLines={3}>
                {club.club_description || club.bio}
              </Text>
            )}
            <View style={s.footerRow}>
              <View style={s.metaRow}>
                {club.league_association && (
                  <View style={s.meta}>
                    <Trophy size={12} color={colors.mutedForeground} />
                    <Text style={s.metaText}>{club.league_association}</Text>
                  </View>
                )}
                <View style={s.meta}>
                  <Lock size={12} color={colors.mutedForeground} />
                  <Text style={s.metaText}>Roster private</Text>
                </View>
              </View>
              <Button variant="outline" size="sm" onPress={onConnect}>
                Connect
              </Button>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

function TeamCard({
  team,
  club,
  onConnect,
}: {
  team: Team;
  club?: ClubCoach;
  onConnect: () => void;
}) {
  const initials = (team.name || 'T')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const location = club ? [club.city, club.state].filter(Boolean).join(', ') : null;

  return (
    <Card style={s.cardItem}>
      <CardContent>
        <View style={s.cardRow}>
      <BackButton />
          <Avatar
            source={team.logo_url ? { uri: team.logo_url } : null}
            fallback={initials}
            size={56}
          />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={s.cardHeaderRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {team.name}
                </Text>
                <Text style={s.locText}>
                  {club?.club_name || 'Independent team'}
                  {location ? ` • ${location}` : ''}
                </Text>
              </View>
            </View>
            <View style={s.badgeRow}>
              <Badge variant="secondary">{team.sport}</Badge>
              {team.level && <Badge variant="outline">{team.level}</Badge>}
              {team.age_group && <Badge variant="outline">{team.age_group}</Badge>}
              {team.gender && <Badge variant="outline">{team.gender}</Badge>}
            </View>
            {team.description && (
              <Text style={s.desc} numberOfLines={3}>
                {team.description}
              </Text>
            )}
            <View style={s.footerRow}>
              <View style={s.metaRow}>
                {team.league && (
                  <View style={s.meta}>
                    <Trophy size={12} color={colors.mutedForeground} />
                    <Text style={s.metaText}>{team.league}</Text>
                  </View>
                )}
                {team.season && team.year && (
                  <Text style={s.metaText}>
                    {team.season} {team.year}
                  </Text>
                )}
                <View style={s.meta}>
                  <Users size={12} color={colors.mutedForeground} />
                  <Text style={s.metaText}>Roster private</Text>
                </View>
              </View>
              <Button variant="outline" size="sm" onPress={onConnect}>
                Connect
              </Button>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl },
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxxl, paddingBottom: spacing.lg, alignItems: 'center', gap: spacing.sm },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 32,
    color: colors.foreground,
    textAlign: 'center',
  },
  heroDesc: {
    color: colors.mutedForeground,
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
  },
  searchCard: { marginHorizontal: spacing.lg, marginVertical: spacing.md },
  searchWrap: { position: 'relative', marginBottom: spacing.sm },
  searchIcon: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
  searchInput: { paddingLeft: 36 },
  selectsRow: { gap: spacing.sm },
  selectCol: {},
  resultsSection: { paddingHorizontal: spacing.lg },
  loaderWrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyCard: {},
  emptyText: { color: colors.mutedForeground, textAlign: 'center', padding: spacing.lg },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  cardItem: {},
  cardRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' },
  cardTitle: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locText: { color: colors.mutedForeground, fontSize: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  desc: { color: colors.mutedForeground, fontSize: 13, lineHeight: 18 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.mutedForeground, fontSize: 11 },
  ctaCard: { marginTop: spacing.lg },
  ctaInner: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  ctaTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 22,
    color: colors.foreground,
    textAlign: 'center',
  },
  ctaDesc: {
    color: colors.mutedForeground,
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
  },
  ctaButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
});
