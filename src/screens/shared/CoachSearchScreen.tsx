import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { CoachCard } from '@/components/CoachCard';
import { colors, typography, spacing } from '@/lib/theme';

export default function CoachSearchScreen() {
  const [query, setQuery] = useState('');

  const { data: coaches = [], isLoading, refetch } = useQuery({
    queryKey: ['coach-search', query],
    queryFn: async () => {
      let q = supabase.from('coaches').select('*').limit(50);
      if (query.trim()) {
        q = q.or(`name.ilike.%${query}%,school.ilike.%${query}%,position_coached.ilike.%${query}%`);
      }
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <Text style={s.title}>Find Coaches</Text>
        <View style={s.searchBox}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, school, or position..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
      <FlatList
        data={coaches}
        keyExtractor={c => c.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>{query ? 'No coaches found' : 'Start typing to search'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CoachCard coach={item} onPress={() => {/* navigate to detail */}} />
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, gap: spacing.sm },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  searchInput: { flex: 1, paddingVertical: spacing.sm, color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base },
  list: { padding: spacing.md, gap: spacing.sm, paddingTop: 0 },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
});
