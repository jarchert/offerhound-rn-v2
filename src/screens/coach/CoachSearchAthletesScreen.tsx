import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { useCoachAthleteMatches, useDismissCoachMatch } from '@/hooks/useAthleteMatches';
import { Navbar } from '@/components/Navbar';
import { AthleteCard } from '@/components/AthleteCard';
import { MessageButton } from '@/components/MessageButton';
import { colors, typography, spacing } from '@/lib/theme';

export default function CoachSearchAthletesScreen() {
  const nav = useNavigation();
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
          <View style={s.item}>
            <AthleteCard
              athlete={item.athlete as any}
              matchScore={item.match_score}
              onPress={() => nav.navigate('PublicProfileStack' as any, { screen: 'PublicProfile', params: { id: (item.athlete as any)?.id } })}
              rightSlot={
                <Pressable onPress={() => dismiss.mutate(item.id)} hitSlop={8} style={s.dismiss}>
                  <X size={16} color={colors.mutedForeground} />
                </Pressable>
              }
            />
            {item.athlete && (
              <View style={s.actions}>
                <MessageButton recipientId={item.athlete.id} recipientName={item.athlete.full_name} />
              </View>
            )}
          </View>
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
  item: { gap: spacing.xs },
  actions: { flexDirection: 'row', paddingHorizontal: spacing.sm },
  dismiss: { padding: 4 },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  emptyTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
