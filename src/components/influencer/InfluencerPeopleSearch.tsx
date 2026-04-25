// Verbatim port from Lovable web — RN-adapted.
// Source: offerhound-repo/src/components/influencer/InfluencerPeopleSearch.tsx
//
// Adaptations:
//   - Tailwind / shadcn primitives → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - <Search> icon overlay on Input → Input leftIcon (wrapping View)
//   - react-query (@tanstack/react-query) identical on RN
//   - LetterButton isn't ported yet → letterSlot prop is omitted; the
//     AthleteMatchCard fallback CTA is used. Re-enable once
//     letters/LetterButton lands.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { SPORTS_LIST } from '@/lib/data/sports';
import { AthleteMatchCard } from '@/components/athlete/AthleteMatchCard';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { colors, typography, spacing } from '@/lib/theme';

type Audience = 'coaches' | 'athletes' | 'scouts';

/**
 * Plain (non-AI) directory search for influencers.
 * Lets a creator browse coaches, athletes, and scouts filtered by sport
 * and a free-text search — no scoring, no matching, no recruiting CRM.
 */
export function InfluencerPeopleSearch() {
  const [audience, setAudience] = useState<Audience>('coaches');
  const [sport, setSport] = useState<string>('all');
  const [search, setSearch] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <View style={s.titleRow}>
            <Users size={20} color={colors.primary} />
            <Text style={s.titleText}>Browse Coaches, Athletes & Scouts</Text>
          </View>
        </CardTitle>
        <CardDescription>
          Sport-filtered directory search — no AI matching, no recruiting tools. Useful for
          research, story sourcing, and audience discovery.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View style={{ gap: spacing.md }}>
          <Tabs value={audience} onValueChange={(v) => setAudience(v as Audience)}>
            <TabsList>
              <TabsTrigger value="coaches">Coaches</TabsTrigger>
              <TabsTrigger value="athletes">Athletes</TabsTrigger>
              <TabsTrigger value="scouts">Scouts</TabsTrigger>
            </TabsList>

            <View style={s.filterRow}>
              <View style={{ flex: 1 }}>
                <Input
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by name, school, or organization…"
                  {...({ leftIcon: <Search size={16} color={colors.mutedForeground} /> } as any)}
                />
              </View>
              <View style={s.sportBox}>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" {...({ label: 'All sports' } as any)}>All sports</SelectItem>
                    {SPORTS_LIST.map((sp: any) => (
                      <SelectItem key={sp.id} value={sp.id} {...({ label: sp.name } as any)}>
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
            </View>

            <TabsContent value="coaches">
              <CoachResults sport={sport} search={search} />
            </TabsContent>
            <TabsContent value="athletes">
              <AthleteResults sport={sport} search={search} />
            </TabsContent>
            <TabsContent value="scouts">
              <ScoutResults sport={sport} search={search} />
            </TabsContent>
          </Tabs>
        </View>
      </CardContent>
    </Card>
  );
}

export default InfluencerPeopleSearch;

function EmptyOrLoading({ loading, count }: { loading: boolean; count: number }) {
  if (loading) return <Text style={s.empty}>Searching…</Text>;
  if (count === 0) return <Text style={s.empty}>No results match your filters.</Text>;
  return null;
}

function CoachResults({ sport, search }: { sport: string; search: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['inf-search-coaches', sport, search],
    queryFn: async () => {
      let q = supabase
        .from('public_coaches')
        .select('id, name, school, sport, profile_image_url, title')
        .order('name')
        .limit(40);
      if (sport !== 'all') q = q.eq('sport', sport);
      if (search.trim()) q = q.or(`name.ilike.%${search}%,school.ilike.%${search}%`);
      const { data } = await q;
      return data ?? [];
    },
  });
  return (
    <View style={{ gap: spacing.sm }}>
      <EmptyOrLoading loading={isLoading} count={data.length} />
      {data.map((c: any) => (
        <CoachMatchCard
          key={c.id}
          variant="compact"
          coach={{
            id: c.id,
            name: c.name || 'Coach',
            title: c.title || 'Coach',
            school: c.school || '',
            image_url: c.profile_image_url,
          }}
          proximityLabel={c.sport ? String(c.sport).toUpperCase() : null}
        />
      ))}
    </View>
  );
}

function AthleteResults({ sport, search }: { sport: string; search: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['inf-search-athletes', sport, search],
    queryFn: async () => {
      let q = supabase
        .from('public_player_profiles')
        .select('id, full_name, primary_position, school, sport, profile_image_url, custom_url, graduation_year, city, state')
        .order('full_name')
        .limit(40);
      if (sport !== 'all') q = q.eq('sport', sport);
      if (search.trim()) q = q.or(`full_name.ilike.%${search}%,school.ilike.%${search}%`);
      const { data } = await q;
      return data ?? [];
    },
  });
  return (
    <View style={{ gap: spacing.sm }}>
      <EmptyOrLoading loading={isLoading} count={data.length} />
      {data.map((a: any) => (
        <AthleteMatchCard
          key={a.id}
          variant="compact"
          athlete={{
            id: a.id,
            full_name: a.full_name,
            position: a.primary_position,
            school: a.school,
            graduation_year: a.graduation_year,
            city: a.city,
            state: a.state,
            profile_image_url: a.profile_image_url,
            custom_url: a.custom_url,
          }}
          proximityLabel={a.sport ? String(a.sport).toUpperCase() : null}
          // letterSlot intentionally omitted until LetterButton ports to RN.
        />
      ))}
    </View>
  );
}

function ScoutResults({ sport, search }: { sport: string; search: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['inf-search-scouts', sport, search],
    queryFn: async () => {
      let q = supabase
        .from('scout_profiles')
        .select('id, full_name, organization, sports, profile_image_url, title')
        .order('full_name')
        .limit(40);
      if (sport !== 'all') q = q.contains('sports', [sport]);
      if (search.trim()) q = q.or(`full_name.ilike.%${search}%,organization.ilike.%${search}%`);
      const { data } = await q;
      return data ?? [];
    },
  });
  return (
    <View style={{ gap: spacing.sm }}>
      <EmptyOrLoading loading={isLoading} count={data.length} />
      {data.map((sc: any) => (
        <CoachMatchCard
          key={sc.id}
          variant="compact"
          coach={{
            id: sc.id,
            name: sc.full_name || 'Scout',
            title: sc.title || 'Scout',
            school: sc.organization || 'Independent Scout',
            image_url: sc.profile_image_url,
          }}
          proximityLabel="Scout"
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  filterRow: { gap: spacing.sm, marginTop: spacing.sm },
  sportBox: { minWidth: 180 },
  empty: {
    fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm,
    color: colors.mutedForeground, textAlign: 'center', paddingVertical: spacing.lg,
  },
});
