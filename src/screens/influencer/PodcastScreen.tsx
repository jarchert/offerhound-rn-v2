import React from 'react';
import { View, Text, FlatList, Pressable, Image, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { usePodcastPlayer, type InfluencerPodcastEpisode } from '@/contexts/PodcastPlayerContext';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';

export default function PodcastScreen() {
  const player = usePodcastPlayer();

  const { data: episodes = [], isLoading, refetch } = useQuery({
    queryKey: ['podcast-episodes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('podcast_episodes')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(50);
      return (data || []) as any as InfluencerPodcastEpisode[];
    },
  });

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Podcasts</Text>
      </View>
      <FlatList
        data={episodes}
        keyExtractor={e => e.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={s.empty}>No episodes available</Text>}
        renderItem={({ item }) => {
          const isCurrent = player.currentEpisode?.id === item.id;
          const playing = isCurrent && player.isPlaying;
          return (
            <Card style={s.card}>
              {item.cover_image_url ? (
                <Image source={{ uri: item.cover_image_url }} style={s.cover} />
              ) : (
                <View style={[s.cover, s.coverPlaceholder]} />
              )}
              <View style={s.info}>
                <Text style={s.episodeTitle} numberOfLines={2}>{item.title}</Text>
                {item.short_description && <Text style={s.desc} numberOfLines={2}>{item.short_description}</Text>}
              </View>
              <Pressable
                style={s.playBtn}
                onPress={() => playing ? player.pause() : isCurrent ? player.resume() : player.playEpisode(item)}
              >
                {playing ? <Pause size={20} color={colors.primaryForeground} /> : <Play size={20} color={colors.primaryForeground} />}
              </Pressable>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  list: { padding: spacing.md, gap: spacing.sm, paddingTop: 0 },
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.sm, alignItems: 'center' },
  cover: { width: 56, height: 56, borderRadius: 8 },
  coverPlaceholder: { backgroundColor: colors.muted },
  info: { flex: 1, gap: 2 },
  episodeTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  desc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center', padding: spacing.xl },
});
