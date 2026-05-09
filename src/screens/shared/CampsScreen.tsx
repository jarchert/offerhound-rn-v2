// Rewritten Build 48 (parity/2026-04-29 Priority B) — mirrors Lovable web DashboardCampsList.
// - Tabs: All Camps / My Camps
// - Search + sport/division filters
// - Card: name, school, date, location, proximity badge, sport/division badges
// - Actions: emerald "Register / Details" (deep-links registration_url), Save bookmark,
//   and a single "Add to Calendar" that writes directly to the native device calendar
//   via expo-calendar (parity/2026-04-29 calendar-native fix).
import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, Pressable, RefreshControl, Alert } from 'react-native';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon, MapPin, ExternalLink, Search, Bookmark, BookmarkCheck, CalendarPlus,
} from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from '@/hooks/use-toast';
import { addCampToDeviceCalendar, type CollegeCamp } from '@/hooks/useCollegeCamps';
import { colors, typography, spacing, radius } from '@/lib/theme';

const STATE_NEIGHBORS: Record<string, string[]> = {
  AL:['FL','GA','MS','TN'], AK:[], AZ:['CA','CO','NM','NV','UT'], AR:['LA','MO','MS','OK','TN','TX'],
  CA:['AZ','NV','OR'], CO:['AZ','KS','NE','NM','OK','UT','WY'], CT:['MA','NY','RI'],
  DE:['MD','NJ','PA'], FL:['AL','GA'], GA:['AL','FL','NC','SC','TN'],
  HI:[], ID:['MT','NV','OR','UT','WA','WY'], IL:['IA','IN','KY','MO','WI'],
  IN:['IL','KY','MI','OH'], IA:['IL','MN','MO','NE','SD','WI'], KS:['CO','MO','NE','OK'],
  KY:['IL','IN','MO','OH','TN','VA','WV'], LA:['AR','MS','TX'], ME:['NH'],
  MD:['DE','PA','VA','WV'], MA:['CT','NH','NY','RI','VT'], MI:['IN','OH','WI'],
  MN:['IA','ND','SD','WI'], MS:['AL','AR','LA','TN'], MO:['AR','IA','IL','KS','KY','NE','OK','TN'],
  MT:['ID','ND','SD','WY'], NE:['CO','IA','KS','MO','SD','WY'], NV:['AZ','CA','ID','OR','UT'],
  NH:['MA','ME','VT'], NJ:['DE','NY','PA'], NM:['AZ','CO','OK','TX','UT'],
  NY:['CT','MA','NJ','PA','VT'], NC:['GA','SC','TN','VA'], ND:['MN','MT','SD'],
  OH:['IN','KY','MI','PA','WV'], OK:['AR','CO','KS','MO','NM','TX'], OR:['CA','ID','NV','WA'],
  PA:['DE','MD','NJ','NY','OH','WV'], RI:['CT','MA'], SC:['GA','NC'],
  SD:['IA','MN','MT','ND','NE','WY'], TN:['AL','AR','GA','KY','MO','MS','NC','VA'],
  TX:['AR','LA','NM','OK'], UT:['AZ','CO','ID','NM','NV','WY'], VT:['MA','NH','NY'],
  VA:['KY','MD','NC','TN','WV'], WA:['ID','OR'], WV:['KY','MD','OH','PA','VA'],
  WI:['IA','IL','MI','MN'], WY:['CO','ID','MT','NE','SD','UT'],
};

function normalizeState(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (t.length === 2) return t.toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function proximity(campState: string | null, userState: string | null): number {
  if (!userState || !campState) return 3;
  const u = normalizeState(userState);
  const c = normalizeState(campState);
  if (!u || !c) return 3;
  if (c === u) return 0;
  if (STATE_NEIGHBORS[u]?.includes(c)) return 1;
  for (const n of STATE_NEIGHBORS[u] || []) if (STATE_NEIGHBORS[n]?.includes(c)) return 2;
  return 3;
}

const PROX_LABEL: Record<number, string> = { 0: 'Your State', 1: 'Neighboring', 2: 'Nearby', 3: 'Other' };
const PROX_COLOR: Record<number, { bg: string; fg: string }> = {
  0: { bg: 'rgba(34,197,94,0.18)', fg: '#22c55e' },
  1: { bg: 'rgba(59,130,246,0.18)', fg: '#60a5fa' },
  2: { bg: 'rgba(245,158,11,0.18)', fg: '#f59e0b' },
  3: { bg: colors.muted, fg: colors.mutedForeground },
};

export default function CampsScreen() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile() as any;
  // Build 55 item 9: coach-side camps must be pre-filtered by the coach's
  // registered sport. If the viewer has an athlete profile we use that sport;
  // otherwise fall back to the coach / HS coach profile's sport. This keeps
  // the athlete-centric default behavior while fixing the coach dead-filter.
  const { data: coachProfile } = useCoachProfile();
  const { data: hsCoachProfile } = useHSCoachProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [campTab, setCampTab] = useState('all');
  const [sportFilter, setSportFilter] = useState<string>('all');

  const userState =
    profile?.state ||
    profile?.home_state ||
    (coachProfile as any)?.state ||
    (hsCoachProfile as any)?.state ||
    null;
  const userSport =
    profile?.sport ||
    (coachProfile as any)?.sport ||
    (hsCoachProfile as any)?.sport ||
    null;

  const { data: allCamps = [], isLoading, refetch } = useQuery({
    queryKey: ['dashboard-camps', userSport],
    queryFn: async () => {
      let q = supabase
        .from('college_camps')
        .select('*')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true })
        .limit(500);
      if (userSport) q = q.ilike('sport', userSport);
      const { data } = await q;
      return (data || []) as any as CollegeCamp[];
    },
  });

  const { data: savedCampIds = [] } = useQuery({
    queryKey: ['saved-camp-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('saved_camps' as any).select('camp_id').eq('user_id', user.id);
      return (data || []).map((r: any) => r.camp_id) as string[];
    },
    enabled: !!user,
  });

  const savedSet = useMemo(() => new Set(savedCampIds), [savedCampIds]);

  const sports = useMemo(() => Array.from(new Set((allCamps as any[]).map(c => c.sport).filter(Boolean))).sort(), [allCamps]);

  const filtered = useMemo(() => {
    let list = allCamps as CollegeCamp[];
    if (campTab === 'saved') list = list.filter(c => savedSet.has(c.id));
    if (sportFilter !== 'all') list = list.filter(c => c.sport === sportFilter);
    if (search) {
      const qq = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(qq) ||
        c.school?.toLowerCase().includes(qq) ||
        (c.city || '').toLowerCase().includes(qq) ||
        (c.state || '').toLowerCase().includes(qq),
      );
    }
    return [...list].sort((a, b) => {
      const sa = proximity(a.state, userState);
      const sb = proximity(b.state, userState);
      if (sa !== sb) return sa - sb;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });
  }, [allCamps, campTab, sportFilter, search, userState, savedSet]);

  const toggleSave = useMutation({
    mutationFn: async (campId: string) => {
      if (!user) throw new Error('Sign in to save camps');
      if (savedSet.has(campId)) {
        await supabase.from('saved_camps' as any).delete().eq('user_id', user.id).eq('camp_id', campId);
      } else {
        await supabase.from('saved_camps' as any).insert({ user_id: user.id, camp_id: campId } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-camp-ids', user?.id] });
      qc.invalidateQueries({ queryKey: ['saved-camps', user?.id] });
    },
    onError: (e: any) => Alert.alert('Save failed', e?.message || 'Please try again.'),
  });

  const handleAddToCalendar = async (camp: CollegeCamp) => {
    const result = await addCampToDeviceCalendar(camp);
    if (result.ok) {
      if (user && !savedSet.has(camp.id)) {
        try { await supabase.from('saved_camps' as any).insert({ user_id: user.id, camp_id: camp.id } as any); } catch {}
        qc.invalidateQueries({ queryKey: ['saved-camp-ids', user?.id] });
      }
      toast({ title: 'Added to calendar', description: camp.name });
      return;
    }
    if (result.reason === 'permission-denied') {
      toast({ title: 'Enable calendar adds on your device', variant: 'destructive' });
    } else if (result.reason === 'missing-date') {
      toast({ title: 'Missing camp date', variant: 'destructive' });
    } else {
      toast({ title: "Couldn't add to calendar", variant: 'destructive' });
    }
  };

  const renderCamp = ({ item: camp }: { item: CollegeCamp }) => {
    const p = proximity(camp.state, userState);
    const isSaved = savedSet.has(camp.id);
    const proxTone = PROX_COLOR[p];
    return (
      <Card style={s.card}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.campName} numberOfLines={1}>{camp.name}</Text>
            <Text style={s.campSchool}>{camp.school}</Text>
          </View>
          <View style={s.cardHeaderRight}>
            {userState ? (
              <View style={[s.proxPill, { backgroundColor: proxTone.bg }]}>
                <Text style={[s.proxPillText, { color: proxTone.fg }]}>{PROX_LABEL[p]}</Text>
              </View>
            ) : null}
            <Pressable onPress={() => toggleSave.mutate(camp.id)} hitSlop={8} style={s.iconBtn}>
              {isSaved
                ? <BookmarkCheck size={18} color={colors.primary} />
                : <Bookmark size={18} color={colors.mutedForeground} />}
            </Pressable>
          </View>
        </View>

        <View style={s.metaRow}>
          <CalendarIcon size={12} color={colors.mutedForeground} />
          <Text style={s.metaText}>
            {new Date(camp.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {camp.end_date ? ` – ${new Date(camp.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
          </Text>
          {(camp.city || camp.state) ? (
            <>
              <MapPin size={12} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
              <Text style={s.metaText}>{[camp.city, camp.state].filter(Boolean).join(', ')}</Text>
            </>
          ) : null}
        </View>

        <View style={s.badgeRow}>
          <Badge variant="outline">{camp.sport}</Badge>
          {(camp as any).division ? <Badge variant="secondary">{(camp as any).division}</Badge> : null}
        </View>

        <View style={s.actions}>
          {camp.registration_url ? (
            <Pressable
              onPress={() => Linking.openURL(camp.registration_url!)}
              style={s.registerBtn}
              accessibilityLabel="Register or view camp details"
            >
              <ExternalLink size={12} color="#fff" />
              <Text style={s.registerBtnText}>Register / Details</Text>
            </Pressable>
          ) : (
            <Text style={[s.metaText, { fontStyle: 'italic', flex: 1 }]}>No registration link available</Text>
          )}
          <Pressable
            onPress={() => handleAddToCalendar(camp)}
            style={s.ghostBtn}
            hitSlop={6}
            accessibilityLabel="Add camp to device calendar"
          >
            <CalendarPlus size={14} color={colors.foreground} />
            <Text style={s.ghostBtnText}>Add to Calendar</Text>
          </Pressable>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <Text style={s.title}>Camps & Combines</Text>
        <Text style={s.subtitle}>Upcoming college recruiting events</Text>
      </View>

      <View style={s.controls}>
        <Tabs value={campTab} onValueChange={setCampTab}>
          <TabsList>
            <TabsTrigger value="all">All Camps</TabsTrigger>
            <TabsTrigger value="saved">My Camps ({savedSet.size})</TabsTrigger>
          </TabsList>
        </Tabs>

        <View style={s.searchWrap}>
          <View style={s.searchIcon}><Search size={14} color={colors.mutedForeground} /></View>
          <Input
            placeholder="Search camps, schools, locations…"
            value={search}
            onChangeText={setSearch}
            style={{ paddingLeft: 34 }}
          />
        </View>

        {userState ? (
          <View style={[s.metaRow, { paddingHorizontal: spacing.md }]}>
            <MapPin size={11} color={colors.mutedForeground} />
            <Text style={s.metaText}>Sorted by proximity to {userState}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <Text style={s.empty}>
            {campTab === 'saved' ? 'No saved camps yet. Browse All Camps to save some!' : 'No upcoming camps found.'}
          </Text>
        }
        renderItem={renderCamp}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, paddingBottom: spacing.xs },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  controls: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: 10, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  list: { padding: spacing.md, gap: spacing.sm, paddingTop: 0 },
  card: { padding: spacing.md, gap: spacing.xs, borderRadius: radius.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  campName: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground },
  campSchool: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 1 },
  iconBtn: { padding: 6, borderRadius: 6 },
  proxPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  proxPillText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, flexWrap: 'wrap' },
  registerBtn: {
    flex: 1, minWidth: 150,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  registerBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: '#fff' },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: radius.sm },
  ghostBtnText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.foreground },
  empty: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center', padding: spacing.xl },
});
