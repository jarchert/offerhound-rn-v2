// Ported from Lovable web src/pages/PodcastLibrary.tsx (28 LOC).
// Web → RN translations:
//   - useNavigate → useNavigation().navigate('PodcastEpisodeDetail', { id })
//   - <Card onClick> → <Pressable> wrapper + <Card>
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet via @/lib/theme
//   - Footer/SEO removed (RN has no <head>)
import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Podcast } from 'lucide-react-native';

import { BackButton } from '@/components/BackButton';
import { Card, CardContent } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Episode {
  id: string;
  title: string;
  description?: string | null;
  audio_url?: string | null;
}

export default function PodcastLibraryScreen() {
  const nav = useNavigation<any>();
  const { data: episodes = [], isLoading } = useQuery({
    queryKey: ['podcast-library'],
    queryFn: async () => {
      const { data } = await supabase
        .from('podcast_episodes' as any)
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      return (data || []) as unknown as Episode[];
    },
  });

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton />
        <View style={s.header}>
          <Podcast size={32} color={colors.primary} />
          <Text style={s.title}>Podcast Library</Text>
        </View>

        {isLoading ? (
          <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
        ) : episodes.length === 0 ? (
          <Text style={s.empty}>No episodes yet. Check back soon!</Text>
        ) : (
          <View style={s.list}>
            {episodes.map((ep) => (
              <Pressable
                key={ep.id}
                onPress={() => nav.navigate('PodcastEpisodeDetail', { id: ep.id })}>
                <Card style={s.card}>
                  <CardContent style={s.cardBody}>
                    <Podcast size={40} color={colors.primary} />
                    <View style={s.cardText}>
                      <Text style={s.epTitle}>{ep.title}</Text>
                      {ep.description ? (
                        <Text style={s.epDesc} numberOfLines={1}>{ep.description}</Text>
                      ) : null}
                    </View>
                  </CardContent>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
  },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  empty: { color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  list: { gap: spacing.md },
  card: { borderRadius: radius.lg },
  cardBody: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardText: { flex: 1 },
  epTitle: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  epDesc: { fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
});
