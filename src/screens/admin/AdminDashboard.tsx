import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Users, Trophy, FileText, Settings as SettingsIcon } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { SectionHeader } from '@/components/SectionHeader';
import { AdminBadge } from '@/components/AdminBadge';
import { colors, typography, spacing } from '@/lib/theme';

export default function AdminDashboard() {
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
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <View style={s.titleRow}>
            <Text style={s.title}>Admin</Text>
            <AdminBadge />
          </View>
          <Text style={s.subtitle}>Platform overview</Text>
        </View>

        <View style={s.statsRow}>
          <StatTile label="Total Users" value={stats?.totalUsers ?? 0} icon={Users} />
          <StatTile label="Athletes" value={stats?.athletes ?? 0} icon={Trophy} />
        </View>
        <View style={s.statsRow}>
          <StatTile label="Coaches" value={stats?.coaches ?? 0} icon={Users} />
          <StatTile label="Letters" value={stats?.letters ?? 0} icon={FileText} />
        </View>

        <SectionHeader title="Admin tools" />
        <View style={s.tools}>
          <Text style={s.toolsHint}>Detailed admin pages (User management, Audit log, Testimonial review, Beta feedback) will be available in a future update.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xs, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  tools: { padding: spacing.md, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  toolsHint: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, lineHeight: 20 },
});
