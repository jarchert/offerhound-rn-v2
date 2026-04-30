import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useCoachAthleteMatches, useDismissCoachMatch } from '@/hooks/useAthleteMatches';
import { Navbar } from '@/components/Navbar';
import { AthleteMatchCard } from '@/components/athlete/AthleteMatchCard';
import { colors, typography, spacing } from '@/lib/theme';

export default function CoachSearchAthletesScreen() {
  const { data: matches = [], isLoading, refetch } = useCoachAthleteMatches();
  const dismiss = useDismissCoachMatch();

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <Text style={s.title}>Athletes</Text>
        <Text style={s.subtitle}>{matches.length} athletes matched to your program</Text>
      </View>
      <FlatList
        data={matches}
        keyExtractor={m => m.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No matches yet</Text>
            <Text style={s.emptyText}>Update your recruiting preferences to see athletes.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <AthleteMatchCard
            athlete={{
              id: (item.athlete as any)?.id ?? item.id,
              full_name: (item.athlete as any)?.full_name,
              position: (item.athlete as any)?.position,
              school: (item.athlete as any)?.school,
              graduation_year: (item.athlete as any)?.graduation_year,
              city: (item.athlete as any)?.city,
              state: (item.athlete as any)?.state,
              profile_image_url: (item.athlete as any)?.profile_image_url,
              email: (item.athlete as any)?.email,
            }}
            scores={{
              match_score: item.match_score,
              athletic_fit_score: (item as any).athletic_fit_score,
              academic_fit_score: (item as any).academic_fit_score,
              geographic_fit_score: (item as any).geographic_fit_score,
              position_fit_score: (item as any).position_fit_score,
              match_reason: (item as any).match_reason,
              priority: (item as any).priority,
            }}
            variant="full"
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
