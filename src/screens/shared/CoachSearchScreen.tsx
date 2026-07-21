// RN parity port of Lovable src/components/CoachSearch.tsx (route /coach-search).
//
// Web→RN mapping:
//   - shadcn Input/Select/Tabs/Card    → @/components/ui/*
//   - lucide-react Search              → lucide-react-native Search
//   - CoachCard (web, inline)          → CoachMatchCard (already ported; carries
//                                        letter/email/phone actions)
//   - CSS grid + Prev/Next buttons     → FlatList + footer pager
//
// Query semantics preserved verbatim from Lovable:
//   - sport = 'Football'
//   - optional conference / division equality filters
//   - tab: all | head (title ilike '%head coach%') | assistants (NOT ilike)
//   - debounced (300ms) OR search across name/school/title/position_coached
//   - order by school asc, title asc
//   - PAGE_SIZE = 30, range-based pagination with exact count
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { colors, typography, spacing } from '@/lib/theme';

const PAGE_SIZE = 30;

interface CoachRow {
  id: string;
  name: string;
  title: string | null;
  school: string | null;
  conference: string | null;
  division: string | null;
  position_coached: string | null;
  email: string | null;
  phone: string | null;
  twitter: string | null;
  linkedin_url: string | null;
  state: string | null;
  city: string | null;
  image_url: string | null;
}

type TabKey = 'all' | 'head' | 'assistants';

export default function CoachSearchScreen() {
  const nav = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [conference, setConference] = useState('all');
  const [division, setDivision] = useState('all');
  const [tab, setTab] = useState<TabKey>('all');

  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [conferences, setConferences] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);

  // Debounce the search input (300ms) — mirrors web.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Any filter change resets to page 0 — mirrors web.
  useEffect(() => {
    setPage(0);
  }, [debounced, conference, division, tab]);

  // Load filter options once.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('coaches')
        .select('conference, division')
        .eq('sport', 'Football')
        .not('conference', 'is', null);
      if (data) {
        const conf = Array.from(
          new Set(data.map((d: any) => d.conference).filter(Boolean)),
        ).sort();
        const div = Array.from(
          new Set(data.map((d: any) => d.division).filter(Boolean)),
        ).sort();
        setConferences(conf as string[]);
        setDivisions(div as string[]);
      }
    })();
  }, []);

  // Main result query.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('coaches')
        .select(
          'id,name,title,school,conference,division,position_coached,email,phone,twitter,linkedin_url,state,city,image_url',
          { count: 'exact' },
        )
        .eq('sport', 'Football');

      if (conference !== 'all') q = q.eq('conference', conference);
      if (division !== 'all') q = q.eq('division', division);

      if (tab === 'head') {
        q = q.ilike('title', '%head coach%');
      } else if (tab === 'assistants') {
        q = q.not('title', 'ilike', '%head coach%');
      }

      if (debounced) {
        const term = `%${debounced}%`;
        q = q.or(
          `name.ilike.${term},school.ilike.${term},title.ilike.${term},position_coached.ilike.${term}`,
        );
      }

      q = q
        .order('school', { ascending: true })
        .order('title', { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, count, error } = await q;
      if (!active) return;
      if (error) {
        console.error('[CoachSearch]', error);
        setCoaches([]);
        setTotal(0);
      } else {
        setCoaches((data as CoachRow[]) || []);
        setTotal(count || 0);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [debounced, conference, division, tab, page]);

  const headerCount = useMemo(() => {
    if (loading) return '';
    return `${total.toLocaleString()} ${total === 1 ? 'coach' : 'coaches'}`;
  }, [total, loading]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <FlatList
        data={coaches}
        keyExtractor={c => c.id}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={s.headerWrap}>
            <Text style={s.title}>College Football Coach Search</Text>
            <Text style={s.subtitle}>
              Browse head coaches and assistant coaches across FBS, FCS, D-II,
              D-III, NAIA, and JUCO programs.
            </Text>

            <View style={s.searchBox}>
              <Search size={16} color={colors.mutedForeground} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by coach name, school, position, or title…"
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={s.filterRow}>
              <View style={s.filterCol}>
                <Select value={conference} onValueChange={setConference}>
                  <SelectTrigger>
                    <SelectValue placeholder="Conference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All conferences</SelectItem>
                    {conferences.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
              <View style={s.filterCol}>
                <Select value={division} onValueChange={setDivision}>
                  <SelectTrigger>
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All divisions</SelectItem>
                    {divisions.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
            </View>

            <Tabs value={tab} onValueChange={v => setTab(v as TabKey)} style={s.tabs}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="head">Head Coaches</TabsTrigger>
                <TabsTrigger value="assistants">Assistants &amp; Coordinators</TabsTrigger>
              </TabsList>
            </Tabs>

            {!!headerCount && <Text style={s.count}>{headerCount}</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <CoachMatchCard
            coach={{
              id: item.id,
              name: item.name,
              title: item.title,
              school: item.school,
              division: item.division,
              conference: item.conference,
              position_coached: item.position_coached,
              email: item.email,
              image_url: item.image_url,
            }}
            variant="compact"
            viewerRole="athlete"
            onOpenProfile={() => nav.navigate('CoachProfile' as never, { id: item.id } as never)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={s.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                No coaches match your filters. Try clearing search or selecting a
                different conference.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          !loading && total > PAGE_SIZE ? (
            <View style={s.pager}>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onPress={() => setPage(p => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Text style={s.pageLabel}>
                Page {page + 1} of {totalPages}
              </Text>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= total}
                onPress={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  headerWrap: { gap: spacing.sm, marginBottom: spacing.sm },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    marginTop: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterCol: { flex: 1 },
  tabs: { marginTop: spacing.xs },
  count: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  pageLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});
