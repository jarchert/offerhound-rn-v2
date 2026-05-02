import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSavedAthletes } from '@/hooks/useSavedAthletes';
import { Navbar } from '@/components/Navbar';
import { AthleteCard } from '@/components/AthleteCard';
import { colors, typography, spacing } from '@/lib/theme';

export default function CoachRosterScreen() {
  const nav = useNavigation();
  const { data: saved = [], isLoading, refetch } = useSavedAthletes();

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <Text style={s.title}>Roster</Text>
        <Text style={s.subtitle}>{saved.length} saved athletes</Text>
      </View>
      <FlatList
        data={saved as any[]}
        keyExtractor={sa => sa.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No saved athletes yet</Text>
            <Text style={s.emptyText}>Save athletes from the matches screen to build your roster.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <AthleteCard athlete={item.athlete ?? item} onPress={() => nav.navigate('PublicProfileStack' as any, { screen: 'PublicProfile', params: { id: (item.athlete ?? item)?.id } })} />
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  list: { padding: spacing.md, gap: spacing.sm, paddingTop: 0 },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  emptyTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
