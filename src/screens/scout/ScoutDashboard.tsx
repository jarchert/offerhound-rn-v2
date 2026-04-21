import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Users, Trophy, FileText } from 'lucide-react-native';
import { useScoutPipelineAthletes } from '@/hooks/useScoutPipeline';
import { useScoutActivity } from '@/hooks/useScoutActivity';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function ScoutDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: pipeline = [], isLoading, refetch } = useScoutPipelineAthletes();
  const { data: activity } = useScoutActivity();

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          <Text style={s.title}>Scout Dashboard</Text>
          <Text style={s.subtitle}>Talent evaluation overview</Text>
        </View>

        <View style={s.statsRow}>
          <StatTile label="Pipeline" value={pipeline.length} icon={Trophy} />
          <StatTile label="Saved" value={(activity as any)?.savedCount ?? 0} icon={Users} />
        </View>
        <View style={s.statsRow}>
          <StatTile label="Letters Sent" value={(activity as any)?.lettersSent ?? 0} icon={FileText} />
          <StatTile label="Searches" value={(activity as any)?.searchesCount ?? 0} icon={Users} />
        </View>

        <View style={s.section}>
          <SectionHeader
            title="Active Pipeline"
            subtitle={`${pipeline.length} athletes being tracked`}
          />
          {pipeline.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No athletes in your pipeline yet.</Text>
            </View>
          ) : (
            <View style={s.list}>
              {(pipeline as any[]).slice(0, 5).map((p: any) => (
                <View key={p.id} style={s.item}>
                  <Text style={s.itemTitle}>{p.athlete?.full_name ?? 'Unknown'}</Text>
                  <Text style={s.itemMeta}>{p.stage_name ?? ''}</Text>
                </View>
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
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  list: { gap: spacing.xs },
  item: { padding: spacing.sm, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  itemTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  itemMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  empty: { padding: spacing.lg, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
