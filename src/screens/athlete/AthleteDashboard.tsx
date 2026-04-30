import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, SafeAreaView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Users, Trophy, Mail, Calendar, Edit3 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useAthleteMatches } from '@/hooks/useAthleteMatches';
import { useActivityStats } from '@/hooks/useActivityStats';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { SectionHeader } from '@/components/SectionHeader';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function AthleteDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { profile } = usePlayerProfile();
  const { data: matches = [], isLoading: matchesLoading, refetch: refetchMatches } = useAthleteMatches();
  const { data: stats, refetch: refetchStats } = useActivityStats();

  const refreshing = matchesLoading;
  const onRefresh = () => { refetchMatches(); refetchStats(); };

  const topMatches = matches.slice(0, 3);
  const greetingName = profile?.full_name?.split(' ')[0] || 'Athlete';

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          <Text style={s.greeting}>Welcome back,</Text>
          <Text style={s.name}>{greetingName}</Text>
        </View>

        <PushNotificationPrompt />

        <Button
          variant="outline"
          onPress={() => nav.navigate('AthleteProfileEdit' as any)}
          leftIcon={<Edit3 size={14} color={colors.foreground} />}
        >
          Edit Full Profile
        </Button>

        <View style={s.statsRow}>
          <StatTile label="Matches" value={matches.length} icon={Trophy} />
          <StatTile label="Contacted" value={stats?.totalCoachesContacted ?? 0} icon={Users} />
        </View>
        <View style={s.statsRow}>
          <StatTile label="Letters Sent" value={stats?.lettersSent ?? 0} icon={Mail} />
          <StatTile label="Saved" value={stats?.savedCoaches ?? 0} icon={Calendar} />
        </View>

        <View style={s.section}>
          <SectionHeader
            title="Top Coach Matches"
            subtitle={matches.length > 0 ? `${matches.length} coaches matched` : 'Complete your profile to see matches'}
            actionLabel={matches.length > 0 ? 'See all' : undefined}
            onAction={() => nav.navigate('AthleteTabs', { screen: 'MatchesTab' } as any)}
          />
          {topMatches.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {profile?.is_published
                  ? 'No matches yet. Check back soon!'
                  : 'Publish your profile to start matching with coaches.'}
              </Text>
            </View>
          ) : (
            <View style={s.list}>
              {topMatches.map(m => (
                <CoachMatchCard
                  key={m.id}
                  coach={{
                    id: (m.coach as any)?.id ?? m.id,
                    name: (m.coach as any)?.name,
                    title: (m.coach as any)?.title,
                    school: (m.coach as any)?.school,
                    division: (m.coach as any)?.division,
                    conference: (m.coach as any)?.conference,
                    position_coached: (m.coach as any)?.position_coached,
                    email: (m.coach as any)?.email,
                    image_url: (m.coach as any)?.image_url,
                  }}
                  scores={{
                    match_score: m.match_score,
                    athletic_fit_score: (m as any).athletic_fit_score,
                    program_fit_score: (m as any).program_fit_score,
                    geographic_fit_score: (m as any).geographic_fit_score,
                    match_reason: (m as any).match_reason,
                    priority: (m as any).priority,
                  }}
                  variant="compact"
                  viewerRole="athlete"
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
  greeting: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  name: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
  empty: { padding: spacing.lg, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
