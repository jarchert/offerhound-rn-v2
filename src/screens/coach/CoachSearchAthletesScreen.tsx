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
        renderItem={({ item }) => {
          const ath = item.athlete as any;
          return (
            <View style={s.item}>
              <AthleteCard
                athlete={ath}
                matchScore={item.match_score}
                matchScores={{
                  athletic_fit_score: (item as any).athletic_fit_score,
                  academic_fit_score: (item as any).academic_fit_score,
                  geographic_fit_score: (item as any).geographic_fit_score,
                  match_reason: (item as any).match_reason,
                }}
                showActions
                onPress={() => nav.navigate('PublicProfileStack' as any, { screen: 'PublicProfile', params: { customUrl: ath?.custom_url || ath?.id } })}
                onMessage={() => nav.navigate('Messages', { recipientId: ath?.user_id || ath?.id, recipientName: ath?.full_name } as any)}
                messageSlot={
                  <MessageButton
                    recipientId={ath?.user_id || ath?.id}
                    recipientName={ath?.full_name || 'Athlete'}
                    recipientEmail={ath?.email ?? undefined}
                    recipientPhone={ath?.phone ?? undefined}
                    recipientType="athlete"
                    recipientRole="athlete"
                    variant="default"
                    size="sm"
                  />
                }
                onLetter={() => nav.navigate('LetterComposer', { seed: { recipientName: ath?.full_name, recipientRole: ath?.position, schoolName: ath?.school } })}
                rightSlot={
                  <Pressable onPress={() => dismiss.mutate(item.id)} hitSlop={8} style={s.dismiss}>
                    <X size={16} color={colors.mutedForeground} />
                  </Pressable>
                }
              />
            </View>
          );
        }}
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
