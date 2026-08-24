// AdminDashboard — Overview tab, now with Stats / Sessions sub-tabs.
// Wave 1 wiring:
//   - "Stats" sub-tab: existing 4 count tiles + AdminAnalyticsDashboard (previously orphaned)
//   - "Sessions" sub-tab: AdminSessionAnalytics (previously orphaned)
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { Users, Trophy, FileText } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { AdminBadge } from '@/components/AdminBadge';
import { AdminAnalyticsDashboard } from '@/components/AdminAnalyticsDashboard';
import { AdminSessionAnalytics } from '@/components/AdminSessionAnalytics';
import { colors, typography, spacing, radius } from '@/lib/theme';

type OverviewTab = 'stats' | 'sessions';

export default function AdminDashboard() {
  const [tab, setTab] = useState<OverviewTab>('stats');

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [users, athletes, coaches, letters] = await Promise.all([
        supabase.from('user_roles').select('user_id', { count: 'exact', head: true }),
        supabase.from('player_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('coaches').select('id', { count: 'exact', head: true }),
        supabase.from('coach_letter_history').select('id', { count: 'exact', head: true }),
      ]);
      return {
        totalUsers: users.count ?? 0,
        athletes: athletes.count ?? 0,
        coaches: coaches.count ?? 0,
        letters: letters.count ?? 0,
      };
    },
  });

  return (
    <SafeAreaView style={s.container}>
      <Navbar />

      {/* Sub-tab segmented control: Stats | Sessions */}
      <View style={s.tabRow}>
        <Pressable
          onPress={() => setTab('stats')}
          style={[s.tabBtn, tab === 'stats' && s.tabBtnActive]}
          testID="overview-tab-stats"
        >
          <Text style={[s.tabText, tab === 'stats' && s.tabTextActive]}>Stats</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('sessions')}
          style={[s.tabBtn, tab === 'sessions' && s.tabBtnActive]}
          testID="overview-tab-sessions"
        >
          <Text style={[s.tabText, tab === 'sessions' && s.tabTextActive]}>Sessions</Text>
        </Pressable>
      </View>

      {tab === 'stats' ? (
        <ScrollView contentContainerStyle={s.content}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.titleRow}>
              <Text style={s.title}>Admin</Text>
              <AdminBadge />
            </View>
            <Text style={s.subtitle}>Platform overview</Text>
          </View>

          {/* Count tiles */}
          <View style={s.statsRow}>
            <StatTile label="Total Users" value={stats?.totalUsers ?? 0} icon={Users} />
            <StatTile label="Athletes" value={stats?.athletes ?? 0} icon={Trophy} />
          </View>
          <View style={s.statsRow}>
            <StatTile label="Coaches" value={stats?.coaches ?? 0} icon={Users} />
            <StatTile label="Letters" value={stats?.letters ?? 0} icon={FileText} />
          </View>

          {/* Analytics dashboard (previously orphaned) */}
          <AdminAnalyticsDashboard />
        </ScrollView>
      ) : (
        /* Sessions analytics — AdminSessionAnalytics is itself a ScrollView */
        <AdminSessionAnalytics />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  tabTextActive: { color: colors.primaryForeground },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xs, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
});
