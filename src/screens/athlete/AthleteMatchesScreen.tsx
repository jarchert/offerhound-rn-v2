import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAthleteMatches, useDismissAthleteMatch } from '@/hooks/useAthleteMatches';
import { Navbar } from '@/components/Navbar';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function AthleteMatchesScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { data: matches = [], isLoading, refetch } = useAthleteMatches();
  const dismiss = useDismissAthleteMatch();

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <Text style={s.title}>Coach Matches</Text>
        <Text style={s.subtitle}>{matches.length} coaches matched to your profile</Text>
      </View>
      <FlatList
        data={matches}
        keyExtractor={m => m.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No matches yet</Text>
            <Text style={s.emptyText}>Make sure your profile is complete and published.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CoachMatchCard
            coach={{
              id: (item.coach as any)?.id ?? item.id,
              name: (item.coach as any)?.name,
              title: (item.coach as any)?.title,
              school: (item.coach as any)?.school,
              division: (item.coach as any)?.division,
              conference: (item.coach as any)?.conference,
              position_coached: (item.coach as any)?.position_coached,
              email: (item.coach as any)?.email,
              image_url: (item.coach as any)?.image_url,
            }}
            scores={{
              match_score: item.match_score,
              athletic_fit_score: (item as any).athletic_fit_score,
              program_fit_score: (item as any).program_fit_score,
              geographic_fit_score: (item as any).geographic_fit_score,
              match_reason: (item as any).match_reason,
              priority: (item as any).priority,
            }}
            variant="full"
            viewerRole="athlete"
            onDismiss={() => dismiss.mutate(item.id)}
          />
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
  list: { padding: spacing.md, gap: spacing.md, paddingTop: 0 },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  emptyTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
