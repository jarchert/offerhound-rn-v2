import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, Pressable, Linking, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/lib/theme';

interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  source_name: string | null;
  published_at: string;
  sport: string | null;
  image_url: string | null;
}

export default function NewsScreen() {
  const { data: articles = [], isLoading, refetch } = useQuery({
    queryKey: ['sports-news'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sports_news_articles')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(50);
      return (data || []) as any as NewsArticle[];
    },
  });

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <Text style={s.title}>News & Learn</Text>
        <Text style={s.subtitle}>Recruiting & sport coverage</Text>
      </View>
      <FlatList
        data={articles}
        keyExtractor={a => a.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={s.empty}>No articles available</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => item.source_url && Linking.openURL(item.source_url)}>
            <Card style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.articleTitle}>{item.title}</Text>
                {item.sport && <Badge variant="outline">{item.sport}</Badge>}
              </View>
              {item.summary && <Text style={s.summary} numberOfLines={3}>{item.summary}</Text>}
              <View style={s.footer}>
                <Text style={s.source}>{item.source_name ?? 'Unknown source'}</Text>
                <View style={s.footerRight}>
                  <Text style={s.date}>{new Date(item.published_at).toLocaleDateString()}</Text>
                  {item.source_url && <ExternalLink size={12} color={colors.mutedForeground} />}
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  list: { padding: spacing.md, gap: spacing.sm, paddingTop: 0 },
  card: { padding: spacing.md, gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  articleTitle: { flex: 1, fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground },
  summary: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  source: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.primary },
  date: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  empty: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center', padding: spacing.xl },
});
