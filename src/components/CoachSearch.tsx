// Ported from Lovable src/components/CoachSearch.tsx.
// College football coach directory with debounced search, conference/division
// filters, and head/assistant tabs. Paginates 30 rows/page.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  ActionSheetIOS,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Search,
  Mail,
  MapPin,
  Building2,
  Phone,
  ExternalLink,
  PenSquare,
  ChevronDown,
} from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useLetterCenter } from '@/hooks/useLetterCenter';
import { colors, typography, spacing, radius } from '@/lib/theme';

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

const PAGE_SIZE = 30;
type Tab = 'all' | 'head' | 'assistants';

export function CoachSearch() {
  const nav = useNavigation();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [conference, setConference] = useState<string>('all');
  const [division, setDivision] = useState<string>('all');
  const [tab, setTab] = useState<Tab>('all');
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [conferences, setConferences] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debounced, conference, division, tab]);

  // Load filter options once
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('coaches' as any)
        .select('conference, division')
        .eq('sport', 'Football')
        .not('conference', 'is', null);
      if (data) {
        const conf = Array.from(
          new Set((data as any[]).map((d) => d.conference).filter(Boolean))
        ).sort();
        const div = Array.from(
          new Set((data as any[]).map((d) => d.division).filter(Boolean))
        ).sort();
        setConferences(conf as string[]);
        setDivisions(div as string[]);
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      let q: any = supabase
        .from('coaches' as any)
        .select(
          'id,name,title,school,conference,division,position_coached,email,phone,twitter,linkedin_url,state,city,image_url',
          { count: 'exact' }
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
          `name.ilike.${term},school.ilike.${term},title.ilike.${term},position_coached.ilike.${term}`
        );
      }

      q = q
        .order('school', { ascending: true })
        .order('title', { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, count, error } = await q;
      if (!active) return;
      if (error) {
        console.warn('[CoachSearch]', error);
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

  const openFilter = useCallback(
    (kind: 'conference' | 'division') => {
      const list = kind === 'conference' ? conferences : divisions;
      const setter = kind === 'conference' ? setConference : setDivision;
      const options = [`All ${kind}s`, ...list];
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: [...options, 'Cancel'], cancelButtonIndex: options.length },
          (idx) => {
            if (idx === 0) setter('all');
            else if (idx < options.length) setter(list[idx - 1]);
          }
        );
      } else {
        Alert.alert(
          `Filter by ${kind}`,
          undefined,
          [
            { text: `All ${kind}s`, onPress: () => setter('all') },
            ...list.map((val) => ({ text: val, onPress: () => setter(val) })),
            { text: 'Cancel', style: 'cancel' as const },
          ]
        );
      }
    },
    [conferences, divisions]
  );

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.h1}>College Football Coach Search</Text>
        <Text style={s.sub}>
          Browse head coaches and assistants across FBS, FCS, D-II, D-III, NAIA,
          and JUCO programs.
        </Text>
      </View>

      <View style={s.filterCard}>
        <View style={s.searchRow}>
          <Search color={colors.foregroundSubtle} size={14} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, school, position, or title…"
            placeholderTextColor={colors.foregroundSubtle}
            autoCorrect={false}
          />
        </View>

        <View style={s.filterRow}>
          <Pressable
            style={s.filterBtn}
            onPress={() => openFilter('conference')}
          >
            <Text style={s.filterBtnText} numberOfLines={1}>
              {conference === 'all' ? 'Conference' : conference}
            </Text>
            <ChevronDown color={colors.foregroundSubtle} size={14} />
          </Pressable>
          <Pressable style={s.filterBtn} onPress={() => openFilter('division')}>
            <Text style={s.filterBtnText} numberOfLines={1}>
              {division === 'all' ? 'Division' : division}
            </Text>
            <ChevronDown color={colors.foregroundSubtle} size={14} />
          </Pressable>
        </View>
      </View>

      <View style={s.tabs}>
        {(['all', 'head', 'assistants'] as Tab[]).map((key) => (
          <Pressable
            key={key}
            style={[s.tabBtn, tab === key && s.tabBtnActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>
              {key === 'all'
                ? 'All'
                : key === 'head'
                  ? 'Head Coaches'
                  : 'Assistants'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.countText}>{headerCount}</Text>

      {loading ? (
        <View style={s.centerBlock}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : coaches.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>
            No coaches match your filters. Try clearing search or selecting a
            different conference.
          </Text>
        </View>
      ) : (
        <FlatList
          data={coaches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CoachCard
              coach={item}
            />
          )}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}
        />
      )}

      {!loading && total > PAGE_SIZE ? (
        <View style={s.pager}>
          <Pressable
            style={[s.pagerBtn, page === 0 && s.pagerBtnDisabled]}
            disabled={page === 0}
            onPress={() => setPage((p) => Math.max(0, p - 1))}
          >
            <Text style={s.pagerBtnText}>Previous</Text>
          </Pressable>
          <Text style={s.pagerText}>
            Page {page + 1} of {pageCount}
          </Text>
          <Pressable
            style={[
              s.pagerBtn,
              (page + 1) * PAGE_SIZE >= total && s.pagerBtnDisabled,
            ]}
            disabled={(page + 1) * PAGE_SIZE >= total}
            onPress={() => setPage((p) => p + 1)}
          >
            <Text style={s.pagerBtnText}>Next</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function CoachCard({ coach }: { coach: CoachRow }) {
  const nav = useNavigation();
  const { goToLetterForAthlete, isNavigating } = useLetterCenter();
  const isHead = (coach.title || '').toLowerCase().includes('head coach');
  const location = [coach.city, coach.state].filter(Boolean).join(', ');

  const openLetter = () => {
    goToLetterForAthlete(
      {
        id: coach.id,
        full_name: coach.name,
        email: coach.email || undefined,
        school: coach.school || undefined,
      } as any,
      {
        recipientCategory: 'college-coach',
        recipientType: 'coach',
        letterType: 'initial-interest',
        organizationName: coach.school || undefined,
        surface: 'coach-search',
      } as any
    );
  };

  return (
    <Pressable style={s.coachCard} onPress={() => (nav as any).navigate('PublicProfileStack', { screen: 'PublicProfile', params: { id: coach.id } })}>
      <View style={s.coachHeader}>
        {coach.image_url ? (
          <Image source={{ uri: coach.image_url }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarInitials}>
              {coach.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <View style={s.coachNameCol}>
          <Text style={s.coachName} numberOfLines={1}>
            {coach.name}
          </Text>
          <Text style={s.coachTitle} numberOfLines={1}>
            {coach.title || 'Coach'}
          </Text>
        </View>
        {isHead ? (
          <View style={s.headBadge}>
            <Text style={s.headBadgeText}>Head</Text>
          </View>
        ) : null}
      </View>

      <View style={s.coachBody}>
        {coach.school ? (
          <View style={s.metaRow}>
            <Building2 color={colors.foregroundSubtle} size={14} />
            <Text style={s.metaText} numberOfLines={1}>
              {coach.school}
            </Text>
          </View>
        ) : null}
        {coach.division || coach.conference ? (
          <View style={s.badgeRow}>
            {coach.division ? (
              <View style={[s.divBadge, s.secondaryBadge]}>
                <Text style={s.badgeText}>{coach.division}</Text>
              </View>
            ) : null}
            {coach.conference ? (
              <View style={[s.divBadge, s.outlineBadge]}>
                <Text style={s.badgeText}>{coach.conference}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {location ? (
          <View style={s.metaRow}>
            <MapPin color={colors.foregroundSubtle} size={14} />
            <Text style={s.metaText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}
        {coach.position_coached ? (
          <Text style={s.positionText}>Coaches: {coach.position_coached}</Text>
        ) : null}

        <View style={s.actions}>
          <Pressable
            style={[s.actionBtn, s.actionPrimary]}
            onPress={openLetter}
            disabled={isNavigating}
          >
            <PenSquare color={colors.primaryForeground} size={12} />
            <Text style={s.actionPrimaryText}>Letter</Text>
          </Pressable>
          {coach.email ? (
            <Pressable
              style={[s.actionBtn, s.actionOutline]}
              onPress={() => Linking.openURL(`mailto:${coach.email}`)}
            >
              <Mail color={colors.foreground} size={12} />
              <Text style={s.actionOutlineText}>Email</Text>
            </Pressable>
          ) : null}
          {coach.phone ? (
            <Pressable
              style={s.iconBtn}
              onPress={() => Linking.openURL(`tel:${coach.phone}`)}
            >
              <Phone color={colors.foreground} size={14} />
            </Pressable>
          ) : null}
          {coach.linkedin_url ? (
            <Pressable
              style={s.iconBtn}
              onPress={() => Linking.openURL(coach.linkedin_url!)}
            >
              <ExternalLink color={colors.foreground} size={14} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default CoachSearch;

const s = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.sm },
  header: { marginBottom: 4 },
  h1: {
    fontFamily: typography.fontFamily.heading,
    color: colors.foreground,
    fontSize: typography.heading.h2,
    letterSpacing: typography.letterSpacing.heading,
  },
  sub: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
    marginTop: 4,
  },
  filterCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: typography.size.sm,
    flex: 1,
    marginRight: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabBtnActive: { backgroundColor: colors.secondary },
  tabText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
  },
  tabTextActive: { color: colors.foreground },
  countText: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
  },
  centerBlock: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
  coachCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  coachHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.foreground,
    fontSize: 16,
  },
  coachNameCol: { flex: 1, minWidth: 0 },
  coachName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.size.base,
  },
  coachTitle: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
  },
  headBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  headBadgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.primaryForeground,
    fontSize: 10,
  },
  coachBody: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
    fontSize: typography.size.sm,
  },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  divBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  secondaryBadge: { backgroundColor: colors.secondary },
  outlineBadge: { borderWidth: 1, borderColor: colors.border },
  badgeText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: 10,
  },
  positionText: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionPrimaryText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.primaryForeground,
    fontSize: 11,
  },
  actionOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  actionOutlineText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: 11,
  },
  iconBtn: {
    padding: 8,
    borderRadius: radius.sm,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  pagerBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: typography.size.sm,
  },
  pagerText: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
  },
});
