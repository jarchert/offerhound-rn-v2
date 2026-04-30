// Ported from Lovable web src/pages/PodcastEpisodeDetail.tsx (32 LOC).
// Web → RN translations:
//   - useParams → useRoute().params.id
//   - <audio controls> → PORT-PENDING (no expo-av in deps yet); render audio_url as Linking
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet via @/lib/theme
//   - Footer/SEO removed
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Linking, Pressable,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Podcast, ExternalLink } from 'lucide-react-native';

import { BackButton } from '@/components/BackButton';
import { Card, CardContent } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
type ParamList = { PodcastEpisodeDetail: { id?: string } };

interface Episode {
  id: string;
  title: string;
  description?: string | null;
  audio_url?: string | null;
}

export default function PodcastEpisodeDetailScreen() {
  const route = useRoute<RouteProp<ParamList, 'PodcastEpisodeDetail'>>();
  const id = route.params?.id;

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
            {/* PORT-PENDING: native audio player (expo-av) — link out for now */}
            {episode.audio_url ? (
              <Pressable
                onPress={() => Linking.openURL(episode.audio_url!)}
                style={s.audioBtn}>
                <ExternalLink size={16} color={colors.primaryForeground} />
                <Text style={s.audioBtnText}>Listen to episode</Text>
              </Pressable>
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
  desc: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, lineHeight: 22 },
});
