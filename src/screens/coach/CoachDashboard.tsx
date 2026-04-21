import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Users, Trophy, Mail } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachAthleteMatches } from '@/hooks/useAthleteMatches';
import { useCoachActivity } from '@/hooks/useCoachActivity';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { SectionHeader } from '@/components/SectionHeader';
import { AthleteCard } from '@/components/AthleteCard';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function CoachDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: matches = [], isLoading, refetch } = useCoachAthleteMatches();
  const { data: activity } = useCoachActivity();

  const topMatches = matches.slice(0, 5);

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          <Text style={s.greeting}>Coach Dashboard</Text>
          <Text style={s.subtitle}>Recruiting overview</Text>
        </View>

        <PushNotificationPrompt />

        <View style={s.statsRow}>
          <StatTile label="Athlete Matches" value={matches.length} icon={Trophy} />
          <StatTile label="Saved" value={(activity as any)?.savedCount ?? 0} icon={Users} />
        </View>
        <View style={s.statsRow}>
          <StatTile label="Letters Sent" value={(activity as any)?.lettersSent ?? 0} icon={Mail} />
          <StatTile label="Active" value="—" icon={Users} />
        </View>

        <View style={s.section}>
          <SectionHeader
            title="Top Athlete Matches"
            subtitle={matches.length > 0 ? `${matches.length} athletes matched` : 'Set your recruiting criteria'}
            actionLabel={matches.length > 0 ? 'See all' : undefined}
            onAction={() => nav.navigate('MainTabs')}
          />
          {topMatches.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No athlete matches yet. Update your recruiting profile.</Text>
            </View>
          ) : (
            <View style={s.list}>
              {topMatches.map(m => (
                <AthleteCard
                  key={m.id}
                  athlete={m.athlete as any}
                  matchScore={m.match_score}
                  onPress={() => {/* navigate to athlete detail */}}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xs },
  greeting: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
  empty: { padding: spacing.lg, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
