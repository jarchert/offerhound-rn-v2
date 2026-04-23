// CampDiscoveryScreen — searchable, filterable list of college camps.
// Part 11 + Part 38 of the conversion guide describe the discovery flow.
// Replaces the Session 2 PlaceholderScreen at route 'CampDiscovery'.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { addCampToDeviceCalendar, type CollegeCamp } from '@/hooks/useCollegeCamps';
import { useSport } from '@/contexts/SportContext';
import { colors, typography, spacing, radius } from '@/lib/theme';

const SPORTS_FILTER = ['all', 'football', 'basketball', 'baseball', 'softball', 'soccer', 'volleyball', 'lacrosse'] as const;
type SportFilter = typeof SPORTS_FILTER[number];

export default function CampDiscoveryScreen() {
  const navigation = useNavigation<any>();
  const { selectedSport: currentSport } = useSport();
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<SportFilter>(
    (currentSport as SportFilter) ?? 'all',
  );

  const { data: camps = [], isLoading, refetch } = useQuery({
    queryKey: ['camps', sportFilter],
    queryFn: async () => {
      let query = supabase
        .from('college_camps' as any)
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(200);
      if (sportFilter !== 'all') {
        query = query.eq('sport', sportFilter);
      }
      const { data } = await query;
      return (data || []) as any as CollegeCamp[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return camps;
    return camps.filter((c) => {
      const hay = `${c.name} ${c.school} ${c.city ?? ''} ${c.state ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [camps, search]);

  const openRegistration = async (camp: CollegeCamp) => {
    if (!camp.registration_url) {
      Alert.alert('No link', 'This camp has no registration link yet.');
      return;
    }
    const can = await Linking.canOpenURL(camp.registration_url);
    if (can) Linking.openURL(camp.registration_url);
    else Alert.alert('Invalid link', camp.registration_url);
  };

  const addToCalendar = async (camp: CollegeCamp) => {
    try {
      const eventId = await addCampToDeviceCalendar(camp);
      if (eventId) {
        Alert.alert('Added to calendar', `${camp.name} saved to your device calendar.`);
      } else {
        Alert.alert('Calendar permission required', 'Enable calendar access in Settings.');
      }
    } catch (e: any) {
      Alert.alert('Could not add', e?.message ?? 'Unknown error');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <View style={s.headerText}>
          <Text style={s.eyebrow}>DISCOVER</Text>
          <Text style={s.title}>College camps</Text>
          <Text style={s.subtitle}>{filtered.length} upcoming camps</Text>
        </View>
      </View>

      <View style={s.filtersRow}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search camps, schools, cities…"
          placeholderTextColor={colors.foregroundSubtle}
        />
      </View>

      <View style={s.chipRow}>
        {SPORTS_FILTER.map((sp) => (
          <Pressable key={sp} onPress={() => setSportFilter(sp)}>
            <Badge variant={sportFilter === sp ? 'secondary' : 'outline'}>{sp}</Badge>
          </Pressable>
        ))}
      </View>

      <FlashList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>
              {isLoading ? 'Loading camps…' : 'No camps match your filters.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('CampStack' as any, { screen: 'CampDetail', params: { campId: item.id } })}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Card style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.campName} numberOfLines={2}>{item.name}</Text>
                {item.sport ? <Badge variant="outline">{item.sport}</Badge> : null}
              </View>
              <Text style={s.school}>{item.school}</Text>
              <Text style={s.meta}>
                {new Date(item.start_date).toLocaleDateString()}
                {item.city ? ` • ${item.city}` : ''}
                {item.state ? `, ${item.state}` : ''}
              </Text>
              <View style={s.actionRow}>
                <Pressable onPress={() => addToCalendar(item)} style={s.secondaryBtn}>
                  <Text style={s.secondaryBtnText}>Add to calendar</Text>
                </Pressable>
                <Pressable onPress={() => openRegistration(item)} style={s.primaryBtn}>
                  <Text style={s.primaryBtnText}>Register</Text>
                </Pressable>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
    marginTop: spacing.xs,
  },
  filtersRow: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  searchInput: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  empty: { padding: spacing.xxl, alignItems: 'center' },
  emptyText: { fontFamily: typography.fontFamily.body, color: colors.foregroundSubtle, textAlign: 'center' },
  card: { padding: spacing.md, marginBottom: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  campName: {
    flex: 1,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  school: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  meta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
    marginBottom: spacing.sm,
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flex: 1,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.primaryForeground,
    fontSize: typography.size.sm,
  },
  secondaryBtn: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: typography.size.sm,
  },
});
