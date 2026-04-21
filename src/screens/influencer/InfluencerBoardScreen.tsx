import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';

export default function InfluencerBoardScreen() {
  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['influencer-board'],
    queryFn: async () => {
      const { data } = await supabase
        .from('influencer_board_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
  });

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Influencer Board</Text>
      </View>
      <FlatList
        data={posts}
        keyExtractor={p => p.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={s.empty}>No posts yet</Text>}
        renderItem={({ item }) => (
          <Card style={s.card}>
            <Text style={s.cardTitle}>{item.title || 'Untitled'}</Text>
            {item.summary && <Text style={s.summary}>{item.summary}</Text>}
            <Text style={s.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  list: { padding: spacing.md, gap: spacing.sm, paddingTop: 0 },
  card: { padding: spacing.md, gap: 4 },
  cardTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground },
  summary: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, lineHeight: 20 },
  date: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 4 },
  empty: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center', padding: spacing.xl },
});
