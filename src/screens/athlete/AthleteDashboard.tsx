import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, SafeAreaView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Users, Trophy, Mail, Calendar, DollarSign, ChevronRight } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useAthleteMatches } from '@/hooks/useAthleteMatches';
import { useActivityStats } from '@/hooks/useActivityStats';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { SectionHeader } from '@/components/SectionHeader';
import { CoachCard } from '@/components/CoachCard';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
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

        <View style={s.statsRow}>
          <StatTile label="Matches" value={matches.length} icon={Trophy} />
          <StatTile label="Contacted" value={stats?.totalCoachesContacted ?? 0} icon={Users} />
        </View>
        <View style={s.statsRow}>
          <StatTile label="Letters Sent" value={stats?.lettersSent ?? 0} icon={Mail} />
          <StatTile label="Saved" value={stats?.savedCoaches ?? 0} icon={Calendar} />
        </View>

        <Pressable
          onPress={() => nav.navigate('NILIntelligence' as never)}
          style={s.nilCard}
          accessibilityRole="button"
          accessibilityLabel="Open NIL Intelligence"
        >
          <View style={s.nilIcon}>
            <DollarSign size={22} color="#34d399" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.nilTitle}>NIL Intelligence</Text>
            <Text style={s.nilSubtitle}>Valuation, school comparison, tax analysis + advisor</Text>
          </View>
          <ChevronRight size={18} color="rgba(52,211,153,0.7)" />
        </Pressable>

        <View style={s.section}>
          <SectionHeader
            title="Top Coach Matches"
            subtitle={matches.length > 0 ? `${matches.length} coaches matched` : 'Complete your profile to see matches'}
            actionLabel={matches.length > 0 ? 'See all' : undefined}
            onAction={() => nav.navigate('AthleteTabs' as any, { screen: 'MatchesTab' })}
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
              {topMatches.map(m => {
                const c = m.coach as any;
                return (
                  <CoachCard
                    key={m.id}
                    coach={c}
                    matchScore={m.match_score}
                    showActions
                    onPress={() =>
                      nav.navigate('PublicProfileStack' as any, {
                        screen: 'PublicCoachProfile',
                        params: { coachId: c?.id || c?.user_id },
                      })
                    }
                    onContact={() => nav.navigate('Messages', { recipientId: c?.user_id || c?.id, recipientName: c?.name } as any)}
                    onLetter={() => nav.navigate('LetterComposer', { seed: { recipientName: c?.name, recipientRole: c?.title, schoolName: c?.school } })}
                  />
                );
              })}
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
  nilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.30)',
    backgroundColor: 'rgba(52,211,153,0.08)',
  },
  nilIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.30)',
  },
  nilTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: '#34d399', letterSpacing: typography.letterSpacing.heading },
  nilSubtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: 'rgba(52,211,153,0.75)' },
});
