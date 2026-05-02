import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl, Pressable } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { useAthleteMatches, useDismissAthleteMatch } from '@/hooks/useAthleteMatches';
import { Navbar } from '@/components/Navbar';
import { CoachCard } from '@/components/CoachCard';
import { MessageButton } from '@/components/MessageButton';
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
          <View style={s.item}>
            <CoachCard
              coach={item.coach as any}
              matchScore={item.match_score}
              onPress={() => nav.navigate('PublicProfileStack' as any, { screen: 'PublicProfile', params: { id: (item.coach as any)?.id } })}
              rightSlot={
                <Pressable onPress={() => dismiss.mutate(item.id)} hitSlop={8} style={s.dismiss}>
                  <X size={16} color={colors.mutedForeground} />
                </Pressable>
              }
            />
            {item.match_reason && (
              <Text style={s.reason} numberOfLines={2}>{item.match_reason}</Text>
            )}
            {item.coach && (
              <View style={s.actions}>
                <MessageButton recipientId={item.coach.id} recipientName={item.coach.name} />
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
  reason: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontStyle: 'italic', paddingHorizontal: spacing.sm },
  actions: { flexDirection: 'row', paddingHorizontal: spacing.sm },
  dismiss: { padding: 4 },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  emptyTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
