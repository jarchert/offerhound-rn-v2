import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Pressable, RefreshControl } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Mic, Users, Eye, Calendar } from 'lucide-react-native';
import { useMyInfluencerProfile } from '@/hooks/useInfluencer';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function InfluencerDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { data: profile, isLoading, refetch } = useMyInfluencerProfile() as any;

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          <Text style={s.title}>{profile?.display_name || 'Influencer'}</Text>
          <Text style={s.subtitle}>@{profile?.handle || 'handle'}</Text>
        </View>

        <View style={s.statsRow}>
          <StatTile label="Followers" value={profile?.follower_count ?? 0} icon={Users} />
          <StatTile label="Views (30d)" value={profile?.views_30d ?? 0} icon={Eye} />
        </View>

        <SectionHeader title="Quick actions" />
        <View style={s.actions}>
          <Pressable style={s.action} onPress={() => nav.navigate('InfluencerBoard' as any)}>
            <Calendar size={18} color={colors.primary} />
            <Text style={s.actionText}>Influencer Board</Text>
          </Pressable>
          <Pressable style={s.action} onPress={() => nav.navigate('Podcast' as any)}>
            <Mic size={18} color={colors.primary} />
            <Text style={s.actionText}>Podcast Library</Text>
          </Pressable>
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
  actions: { gap: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  actionText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
});
