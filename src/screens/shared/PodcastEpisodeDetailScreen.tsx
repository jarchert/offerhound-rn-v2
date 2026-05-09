// Portele web src/pages/PodcastEpisodeDetail.tsx.
// Web → RN translations:
//   - useParams → useRoute().params.id
//   - <audio controls> → expo-audio useAudioPlayer/useAudioPlayerStatus (Build 54 fix)
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet via @/lib/theme
//   - Footer/SEO removed
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Linking, Pressable,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Podcast, Play, Pause, ExternalLink } from 'lucide-react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { BackButton } from '@/components/BackButton';
import { Card, CardContent } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
type ParamList = { PodcastEpisodeDetail: { id?: string; episodeId?: string } };

interface Episode {
  id: string;
  title: string;
  description?: string | null;
  audio_url?: string | null;
  thumbnail_url?: string | null;
}

export default function PodcastEpisodeDetailScreen() {
  const route = useRoute<RouteProp<ParamList, 'PodcastEpisodeDetail'>>();
  // Accept both `id` and legacy `episodeId` param names for parity with web.
  const id = route.params?.id ?? route.params?.episodeId;

  const { data: episode, isLoading } = useQuery({
    queryKey: ['podcast-episode', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('podcast_episodes' as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data as unknown as Episode | null;
    },
    enabled: !!id,
  });

  // Always-constructed player — swap source via replace() when episode loads.
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (episode?.audio_url) {
      try {
        player.replace({ uri: episode.audio_url });
      } catch {}
    }
    return () => {
      try { player.pause(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.audio_url]);

  const handlePlayPause = () => {
    if (!episode?.audio_url) return;
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch {}
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }
  if (!episode) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><Text style={s.muted}>Episode not found.</Text></View>
      </SafeAreaView>
    );
  }

  const isPlaying = !!status?.playing;

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton />
        <Card style={s.card}>
          <CardContent style={s.body}>
            <View style={s.header}>
              <Podcast size={40} color={colors.primary} />
              <Text style={s.title}>{episode.title}</Text>
            </View>
            {episode.audio_url ? (
              <View style={{ gap: spacing.sm }}>
                <Pressable
                  onPress={handlePlayPause}
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Pause episode' : 'Play episode'}
                  style={s.audioBtn}>
                  {isPlaying ? (
                    <Pause size={18} color={colors.primaryForeground} />
                  ) : (
                    <Play size={18} color={colors.primaryForeground} />
                  )}
                  <Text style={s.audioBtnText}>{isPlaying ? 'Pause' : 'Play'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL(episode.audio_url!)}
                  style={s.externalBtn}
                  accessibilityRole="link"
                  accessibilityLabel="Open audio in external app">
                  <ExternalLink size={14} color={colors.primary} />
                  <Text style={s.externalBtnText}>Open in external app</Text>
                </Pressable>
              </View>
            ) : null}
            {episode.description ? (
              <Text style={s.desc}>{episode.description}</Text>
            ) : null}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  muted: { color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  card: { marginTop: spacing.md, borderRadius: radius.lg },
  body: { padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  audioBtnText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
  },
  externalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  externalBtnText: {
    color: colors.primary,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
  },
  desc: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, lineHeight: 22 },
});
